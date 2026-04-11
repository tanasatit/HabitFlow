package aicoach

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	internalai "github.com/habitflow/api/internal/ai"
	"github.com/habitflow/api/internal/domain/calendar"
	"github.com/habitflow/api/internal/domain/dashboard"
	"github.com/habitflow/api/internal/domain/googlecal"
	"github.com/habitflow/api/internal/domain/habit"
)

func (s *Service) buildSystemPrompt(userID uuid.UUID) string {
	now := time.Now()
	today := now.Format("2006-01-02")
	weekday := now.Weekday().String()
	prompt := `You are HabitFlow AI Coach — a concise, action-oriented habit planning assistant.

TODAY: ` + today + ` (` + weekday + `)

STRICT RULES — follow exactly:
1. NEVER say you added, saved, or created anything unless write_calendar_events was actually called and returned success. Do not simulate or pretend to call tools.
2. When user asks to add an event with a clear title + date/time → you MUST call write_calendar_events. Then confirm in one sentence after the tool returns.
3. "tonight" = ` + today + `. "today" = ` + today + `. Always use YYYY-MM-DD dates. Always use HH:MM for times.
4. Keep all text replies to 1-2 sentences max. No lists unless asked.
5. For habit planning → call get_user_habits + get_calendar_events first, suggest a plan, then call write_calendar_events only after user confirms.`

	if s.googleCalSvc != nil && s.googleCalSvc.IsConnected(userID) {
		prompt += "\n\nThe user has connected their Google Calendar. Use read_google_calendar to see their real schedule and write_google_calendar to add habit events. Always prefer writing to Google Calendar when connected."
	}
	return prompt
}

const maxToolCallRounds = 5
const maxHistoryMessages = 20

type storedMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type Service struct {
	aiClient     *internalai.Client
	habitSvc     *habit.Service
	habitRepo    *habit.Repository
	calendarSvc  *calendar.Service
	dashSvc      *dashboard.Service
	repo         *Repository
	googleCalSvc *googlecal.Service
}

func NewService(
	aiClient *internalai.Client,
	habitSvc *habit.Service,
	habitRepo *habit.Repository,
	calendarSvc *calendar.Service,
	dashSvc *dashboard.Service,
	repo *Repository,
	googleCalSvc *googlecal.Service,
) *Service {
	return &Service{
		aiClient:     aiClient,
		habitSvc:     habitSvc,
		habitRepo:    habitRepo,
		calendarSvc:  calendarSvc,
		dashSvc:      dashSvc,
		repo:         repo,
		googleCalSvc: googleCalSvc,
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

	// Build messages for AI — skip empty assistant turns (corrupted history)
	messages := []internalai.Message{
		{Role: "system", Content: s.buildSystemPrompt(userID)},
	}
	for _, h := range history {
		if h.Content == "" {
			continue
		}
		messages = append(messages, internalai.Message{Role: h.Role, Content: h.Content})
	}
	messages = append(messages, internalai.Message{Role: "user", Content: req.Message})

	// Append user message to stored history now
	history = append(history, storedMessage{Role: "user", Content: req.Message})

	tools := internalai.GetToolDefinitions()
	if s.googleCalSvc != nil && s.googleCalSvc.IsConnected(userID) {
		tools = append(tools, internalai.GetGoogleCalendarToolDefinitions()...)
	}
	fullResponse := ""

	for round := 0; round < maxToolCallRounds; round++ {
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
			stream <- SSEEvent{Type: "error", Data: aiErr.Error()}
			return aiErr
		}
		if aiResp == nil {
			break
		}

		if len(aiResp.FunctionCalls) == 0 {
			break
		}

		// Execute tool calls and continue the conversation
		for _, call := range aiResp.FunctionCalls {
			messages = append(messages, internalai.Message{
				Role:         "model",
				FunctionCall: &call,
			})

			result, err := s.executeTool(ctx, userID, call, stream)
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

	// Persist updated conversation — only store non-empty responses
	if fullResponse != "" {
		history = append(history, storedMessage{Role: "assistant", Content: fullResponse})
	}
	histBytes, err := json.Marshal(history)
	if err != nil {
		histBytes = []byte("[]")
	}
	conv.Messages = histBytes
	if err := s.repo.Update(conv); err != nil {
		// Log but don't fail the request — user already received their response
		log.Printf("aicoach: failed to persist conversation %s: %v", conv.ID, err)
	}

	doneData, err := json.Marshal(map[string]string{"conversation_id": conv.ID.String()})
	if err != nil {
		doneData = []byte(`{"conversation_id":""}`)
	}
	stream <- SSEEvent{Type: "done", Data: string(doneData)}

	return nil
}

func (s *Service) executeTool(ctx context.Context, userID uuid.UUID, call internalai.FunctionCall, stream chan<- SSEEvent) (string, error) {
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
		var inputs []calendar.CreateEventInput
		for _, e := range eventsRaw {
			eMap, ok := e.(map[string]interface{})
			if !ok {
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
			inputs = append(inputs, input)
		}
		if len(inputs) == 0 {
			return "no valid events provided", nil
		}
		created, err := s.calendarSvc.CreateBatch(userID, inputs, "ai")
		if err != nil {
			return "", err
		}
		b, _ := json.Marshal(created)
		stream <- SSEEvent{Type: "calendar_update", Data: string(b)}
		return string(b), nil

	case internalai.ToolReadGoogleCalendar:
		if s.googleCalSvc == nil {
			return "google calendar not configured", nil
		}
		startDate, _ := call.Args["start_date"].(string)
		endDate, _ := call.Args["end_date"].(string)
		events, err := s.googleCalSvc.ReadEvents(ctx, userID, startDate, endDate)
		if err != nil {
			return "", err
		}
		b, _ := json.Marshal(events)
		return string(b), nil

	case internalai.ToolWriteGoogleCalendar:
		if s.googleCalSvc == nil {
			return "google calendar not configured", nil
		}
		eventsRaw, _ := call.Args["events"].([]interface{})

		// Marshal/unmarshal to convert []interface{} -> []CreateGoogleEventInput
		rawBytes, err := json.Marshal(eventsRaw)
		if err != nil {
			return "", fmt.Errorf("marshal google events: %w", err)
		}
		var inputs []googlecal.CreateGoogleEventInput
		if err := json.Unmarshal(rawBytes, &inputs); err != nil {
			return "", fmt.Errorf("unmarshal google events: %w", err)
		}
		if len(inputs) == 0 {
			return "no valid events provided", nil
		}

		// Write to Google Calendar
		created, err := s.googleCalSvc.WriteEvents(ctx, userID, inputs)
		if err != nil {
			return "", err
		}

		// Also save each event to local calendar_events with source="google",
		// including the GoogleEventID returned by the Google Calendar API.
		calInputs := make([]calendar.CreateEventInput, 0, len(created))
		for _, ev := range created {
			calInputs = append(calInputs, calendar.CreateEventInput{
				Title:           ev.Title,
				Description:     ev.Description,
				ScheduledDate:   ev.ScheduledDate,
				StartTime:       ev.StartTime,
				DurationMinutes: ev.DurationMinutes,
				GoogleEventID:   ev.GoogleEventID,
			})
		}
		if len(calInputs) > 0 {
			localCreated, err := s.calendarSvc.CreateBatch(userID, calInputs, "google")
			if err != nil {
				log.Printf("aicoach: write_google_calendar: local save failed: %v", err)
			} else {
				// Emit calendar_update SSE event for local events
				b, _ := json.Marshal(localCreated)
				stream <- SSEEvent{Type: "calendar_update", Data: string(b)}
			}
		}

		b, _ := json.Marshal(created)
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
