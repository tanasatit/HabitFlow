package aicoach

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	internalai "github.com/habitflow/api/internal/ai"
	"github.com/habitflow/api/internal/domain/calendar"
	"github.com/habitflow/api/internal/domain/dashboard"
	"github.com/habitflow/api/internal/domain/habit"
)

func buildSystemPrompt() string {
	now := time.Now()
	today := now.Format("2006-01-02")
	weekday := now.Weekday().String()
	return `You are HabitFlow AI Coach — a concise, action-oriented habit planning assistant.

TODAY: ` + today + ` (` + weekday + `)

STRICT RULES — follow exactly:
1. NEVER say you added, saved, or created anything unless write_calendar_events was actually called and returned success. Do not simulate or pretend to call tools.
2. When user asks to add an event with a clear title + date/time → you MUST call write_calendar_events. Then confirm in one sentence after the tool returns.
3. "tonight" = ` + today + `. "today" = ` + today + `. Always use YYYY-MM-DD dates. Always use HH:MM for times.
4. Keep all text replies to 1-2 sentences max. No lists unless asked.
5. For habit planning → call get_user_habits + get_calendar_events first, suggest a plan, then call write_calendar_events only after user confirms.`
}

const maxToolCallRounds = 5
const maxHistoryMessages = 20

type storedMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type Service struct {
	aiClient    *internalai.Client
	habitSvc    *habit.Service
	habitRepo   *habit.Repository
	calendarSvc *calendar.Service
	dashSvc     *dashboard.Service
	repo        *Repository
}

func NewService(
	aiClient *internalai.Client,
	habitSvc *habit.Service,
	habitRepo *habit.Repository,
	calendarSvc *calendar.Service,
	dashSvc *dashboard.Service,
	repo *Repository,
) *Service {
	return &Service{
		aiClient:    aiClient,
		habitSvc:    habitSvc,
		habitRepo:   habitRepo,
		calendarSvc: calendarSvc,
		dashSvc:     dashSvc,
		repo:        repo,
	}
}

func (s *Service) Chat(ctx context.Context, userID uuid.UUID, req ChatRequest, stream chan<- SSEEvent) error {
	// Load or create conversation
	var conv *AIConversation
	var history []storedMessage

	if req.ConversationID != nil && *req.ConversationID != "" {
		convID, err := uuid.Parse(*req.ConversationID)
		if err == nil {
			if c, err := s.repo.FindByID(convID); err == nil && c.UserID == userID {
				conv = c
				_ = json.Unmarshal(conv.Messages, &history)
			}
		}
	}

	if conv == nil {
		conv = &AIConversation{ID: uuid.New(), UserID: userID}
		if err := s.repo.Create(conv); err != nil {
			return fmt.Errorf("create conversation: %w", err)
		}
	}

	// Trim history
	if len(history) > maxHistoryMessages {
		history = history[len(history)-maxHistoryMessages:]
	}

	// Build messages for AI
	messages := []internalai.Message{
		{Role: "system", Content: buildSystemPrompt()},
	}
	for _, h := range history {
		messages = append(messages, internalai.Message{Role: h.Role, Content: h.Content})
	}
	messages = append(messages, internalai.Message{Role: "user", Content: req.Message})

	// Append user message to stored history now
	history = append(history, storedMessage{Role: "user", Content: req.Message})

	tools := internalai.GetToolDefinitions()
	fullResponse := ""

	for round := 0; round < maxToolCallRounds; round++ {
		fmt.Printf("[aicoach] round=%d messages=%d\n", round, len(messages))
		ch := make(chan internalai.StreamChunk, 50)
		aiReq := internalai.ChatRequest{Messages: messages, Tools: tools}

		var aiResp *internalai.ChatResponse
		var aiErr error
		done := make(chan struct{})

		go func() {
			defer close(done)
			defer close(ch) // must close ch so "for range ch" exits
			aiResp, aiErr = s.aiClient.StreamChat(ctx, aiReq, ch)
		}()

		for chunk := range ch {
			if chunk.Error != nil {
				stream <- SSEEvent{Type: "error", Data: chunk.Error.Error()}
				return chunk.Error
			}
			if chunk.Text != "" {
				fullResponse += chunk.Text
				stream <- SSEEvent{Type: "token", Data: chunk.Text}
			}
			if chunk.Tool != nil {
				toolJSON, err := json.Marshal(chunk.Tool)
				if err == nil {
					stream <- SSEEvent{Type: "tool_call", Data: string(toolJSON)}
				}
			}
		}

		<-done
		if aiErr != nil {
			fmt.Printf("[aicoach] round=%d error: %v\n", round, aiErr)
			stream <- SSEEvent{Type: "error", Data: aiErr.Error()}
			return aiErr
		}
		if aiResp == nil {
			fmt.Printf("[aicoach] round=%d nil response, stopping\n", round)
			break
		}
		fmt.Printf("[aicoach] round=%d done, text_len=%d, tool_calls=%d\n", round, len(fullResponse), len(aiResp.FunctionCalls))

		if len(aiResp.FunctionCalls) == 0 {
			break
		}

		// Execute tool calls and continue the conversation
		for _, call := range aiResp.FunctionCalls {
			messages = append(messages, internalai.Message{
				Role:         "model",
				FunctionCall: &call,
			})

			result, err := s.executeTool(userID, call, stream)
			if err != nil {
				result = fmt.Sprintf("error executing tool: %v", err)
			}

			messages = append(messages, internalai.Message{
				Role: "function",
				FunctionResult: &internalai.FunctionResult{
					Name:     call.Name,
					Response: result,
				},
			})
		}
	}

	// Persist updated conversation
	history = append(history, storedMessage{Role: "assistant", Content: fullResponse})
	histBytes, err := json.Marshal(history)
	if err != nil {
		histBytes = []byte("[]")
	}
	conv.Messages = histBytes
	if err := s.repo.Update(conv); err != nil {
		// Log but don't fail the request — user already received their response
		fmt.Printf("aicoach: failed to persist conversation %s: %v\n", conv.ID, err)
	}

	doneData, err := json.Marshal(map[string]string{"conversation_id": conv.ID.String()})
	if err != nil {
		doneData = []byte(`{"conversation_id":""}`)
	}
	stream <- SSEEvent{Type: "done", Data: string(doneData)}

	return nil
}

func (s *Service) executeTool(userID uuid.UUID, call internalai.FunctionCall, stream chan<- SSEEvent) (string, error) {
	switch call.Name {
	case internalai.ToolGetUserHabits:
		habits, err := s.habitRepo.FindByUserID(userID)
		if err != nil {
			return "", err
		}
		b, _ := json.Marshal(habits)
		return string(b), nil

	case internalai.ToolGetUserStats:
		stats, err := s.dashSvc.GetDashboard(userID)
		if err != nil {
			return "", err
		}
		b, _ := json.Marshal(stats)
		return string(b), nil

	case internalai.ToolGetCalendar:
		startDate, _ := call.Args["start_date"].(string)
		endDate, _ := call.Args["end_date"].(string)
		events, err := s.calendarSvc.GetEvents(userID, startDate, endDate)
		if err != nil {
			return "", err
		}
		b, _ := json.Marshal(events)
		return string(b), nil

	case internalai.ToolWriteCalendar:
		eventsRaw, _ := call.Args["events"].([]interface{})
		fmt.Printf("[aicoach] write_calendar_events called, raw events count=%d, args=%+v\n", len(eventsRaw), call.Args)
		var inputs []calendar.CreateEventInput
		for _, e := range eventsRaw {
			eMap, ok := e.(map[string]interface{})
			if !ok {
				fmt.Printf("[aicoach] skipping event, not a map: %T %+v\n", e, e)
				continue
			}
			input := calendar.CreateEventInput{
				Title:         strVal(eMap["title"]),
				ScheduledDate: strVal(eMap["scheduled_date"]),
				StartTime:     strVal(eMap["start_time"]),
			}
			if dm, ok := eMap["duration_minutes"].(float64); ok {
				input.DurationMinutes = int(dm)
			}
			if hid := strVal(eMap["habit_id"]); hid != "" {
				input.HabitID = &hid
			}
			fmt.Printf("[aicoach] parsed event: title=%q date=%q time=%q duration=%d\n",
				input.Title, input.ScheduledDate, input.StartTime, input.DurationMinutes)
			inputs = append(inputs, input)
		}
		if len(inputs) == 0 {
			fmt.Printf("[aicoach] write_calendar_events: no valid inputs parsed\n")
			return "no valid events provided", nil
		}
		created, err := s.calendarSvc.CreateBatch(userID, inputs, "ai")
		if err != nil {
			fmt.Printf("[aicoach] CreateBatch error: %v\n", err)
			return "", err
		}
		fmt.Printf("[aicoach] created %d events\n", len(created))
		b, _ := json.Marshal(created)
		stream <- SSEEvent{Type: "calendar_update", Data: string(b)}
		return string(b), nil

	default:
		return "", fmt.Errorf("unknown tool: %s", call.Name)
	}
}

func strVal(v interface{}) string {
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}
