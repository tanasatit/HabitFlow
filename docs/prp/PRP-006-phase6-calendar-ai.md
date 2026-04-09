# PRP Phase 6 -- Calendar & AI Coach

> **Phase goal:** Premium users chat with an AI Coach that reads their habits/stats, generates a weekly habit plan, and auto-fills a 7-day calendar -- all streamed in real-time via SSE.

---

## 0. Key Observations & Conflicts

| # | Observation | Resolution |
|---|---|---|
| 1 | ARCHITECTURE.md lists `internal/ai/client.go` (flat package), but the codebase uses `internal/domain/<name>/` (domain packages). | Follow the **existing domain pattern**: create `internal/domain/calendar/` and `internal/domain/aicoach/`. Keep `internal/ai/` for the pure Gemini HTTP client only (no business logic). |
| 2 | PHASES.md says `model/calendar_event.go` and `model/ai_conversation.go` (flat model dir). Codebase has no `model/` dir; models live inside each domain package. | Put models in their domain packages: `calendar/model.go`, `aicoach/model.go`. |
| 3 | Config already has `GeminiAPIKey` field but no `OpenRouterAPIKey` or `OpenRouterModel` or `GeminiModel`. | Add `GeminiModel`, `OpenRouterAPIKey`, `OpenRouterModel` to `Config`. Keep them optional (not validated as required). |
| 4 | ARCHITECTURE.md mentions MCP tools. Phase 6 scope is **internal** tool-call simulation (Go functions the AI can invoke), not a real MCP protocol server. Real MCP is Phase 8 (Google Calendar). | Implement tool definitions as Go structs that map to Gemini function-calling schema. No MCP SDK needed. |
| 5 | `go.mod` has no HTTP client library for Gemini. | Use `net/http` + `encoding/json` directly (Gemini REST API is simple). No SDK needed. |
| 6 | Frontend middleware protects `/coach` prefix but AI Coach page is at `/ai-coach`. | Add `/ai-coach` and `/calendar` to `PROTECTED_PREFIXES` in `middleware.ts`. |

---

## 1. Database Changes

### 1a. New table: `calendar_events`

```go
// internal/domain/calendar/model.go
type CalendarEvent struct {
    ID              uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
    UserID          uuid.UUID  `gorm:"type:uuid;not null;index"                       json:"user_id"`
    HabitID         *uuid.UUID `gorm:"type:uuid;index"                                json:"habit_id"`
    Title           string     `gorm:"not null"                                       json:"title"`
    Description     string     `                                                      json:"description"`
    ScheduledDate   string     `gorm:"not null"                                       json:"scheduled_date"`   // "2006-01-02"
    StartTime       string     `gorm:"not null"                                       json:"start_time"`       // "15:04"
    DurationMinutes int        `gorm:"default:30"                                     json:"duration_minutes"`
    Source          string     `gorm:"default:'manual'"                               json:"source"`           // "ai", "manual"
    IsCompleted     bool       `gorm:"default:false"                                  json:"is_completed"`
    CreatedAt       time.Time  `                                                      json:"created_at"`
    UpdatedAt       time.Time  `                                                      json:"updated_at"`
}
```

Design notes:
- `ScheduledDate` is a date string (`"2006-01-02"`) rather than `time.Time` to avoid timezone confusion on 7-day grid display.
- `StartTime` is `"HH:MM"` for the same reason.
- `HabitID` is nullable -- AI can create events that don't map to an existing habit.
- `Source` tracks whether the event came from AI generation or manual creation.
- No `DeletedAt` -- calendar events can be hard-deleted (they are ephemeral planning artifacts, not historical records).

### 1b. New table: `ai_conversations`

```go
// internal/domain/aicoach/model.go
type AIConversation struct {
    ID        uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
    UserID    uuid.UUID      `gorm:"type:uuid;not null;index"                       json:"user_id"`
    Messages  datatypes.JSON `gorm:"type:jsonb"                                     json:"messages"`
    CreatedAt time.Time      `                                                      json:"created_at"`
    UpdatedAt time.Time      `                                                      json:"updated_at"`
}
```

The `Messages` field stores the full conversation as a JSON array:
```json
[
  {"role": "user", "content": "I want to build a morning routine..."},
  {"role": "assistant", "content": "Great! Let me look at your habits..."},
  {"role": "tool_call", "name": "get_user_habits", "result": "..."},
  {"role": "assistant", "content": "Based on your 3 habits..."}
]
```

### 1c. AutoMigrate update

In `main.go`, add the new models to the `AutoMigrate` call:

```go
database.AutoMigrate(db, ..., &calendar.CalendarEvent{}, &aicoach.AIConversation{})
```

### 1d. New dependency

Add `gorm.io/datatypes` for the JSONB column support on `AIConversation.Messages`.

---

## 2. Backend Files -- Exact Paths & Signatures

### 2a. `backend/pkg/config/config.go` -- MODIFY

Add fields to `Config`:
```go
GeminiModel       string // default "gemini-2.0-flash"
OpenRouterAPIKey  string // optional
OpenRouterModel   string // default "google/gemini-flash-1.5"
```

Add to `Load()`:
```go
GeminiModel:      getEnv("GEMINI_MODEL", "gemini-2.0-flash"),
OpenRouterAPIKey:  os.Getenv("OPENROUTER_API_KEY"),
OpenRouterModel:   getEnv("OPENROUTER_MODEL", "google/gemini-flash-1.5"),
```

No new validation -- these are optional fallbacks.

### 2b. `backend/internal/ai/client.go` -- CREATE

Pure HTTP client for Gemini API. No business logic.

```go
package ai

type Client struct {
    geminiKey     string
    geminiModel   string
    openRouterKey string
    openRouterModel string
    httpClient    *http.Client
}

func NewClient(geminiKey, geminiModel, openRouterKey, openRouterModel string) *Client

// StreamChat sends a request to Gemini (or OpenRouter fallback) and streams
// response chunks back via the provided channel. Supports function calling.
// Returns the full response when done.
func (c *Client) StreamChat(ctx context.Context, req ChatRequest, ch chan<- StreamChunk) (*ChatResponse, error)

// --- Request/Response types ---

type ChatRequest struct {
    Messages []Message       `json:"messages"`
    Tools    []ToolDef       `json:"tools,omitempty"`
}

type Message struct {
    Role    string `json:"role"`    // "user", "model", "function"
    Content string `json:"content"`
    // For function call results
    FunctionCall   *FunctionCall   `json:"functionCall,omitempty"`
    FunctionResult *FunctionResult `json:"functionResponse,omitempty"`
}

type FunctionCall struct {
    Name string                 `json:"name"`
    Args map[string]interface{} `json:"args"`
}

type FunctionResult struct {
    Name     string `json:"name"`
    Response string `json:"response"`
}

type ToolDef struct {
    FunctionDeclarations []FunctionDecl `json:"functionDeclarations"`
}

type FunctionDecl struct {
    Name        string      `json:"name"`
    Description string      `json:"description"`
    Parameters  *ParamSpec  `json:"parameters,omitempty"`
}

type ParamSpec struct {
    Type       string               `json:"type"`
    Properties map[string]ParamProp `json:"properties,omitempty"`
    Required   []string             `json:"required,omitempty"`
}

type ParamProp struct {
    Type        string `json:"type"`
    Description string `json:"description"`
}

type StreamChunk struct {
    Text  string        // partial text token
    Tool  *FunctionCall // AI wants to call a tool
    Done  bool          // stream ended
    Error error
}

type ChatResponse struct {
    FullText      string
    FunctionCalls []FunctionCall
}
```

Implementation notes:
- Primary: Gemini `generateContent` REST endpoint with `streamGenerateContent?alt=sse`.
- URL: `https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?alt=sse&key={key}`
- Fallback to OpenRouter if Gemini returns 429 or 500. OpenRouter uses OpenAI-compatible API with streaming.
- The client reads SSE lines from the Gemini response, parses each JSON chunk, and sends `StreamChunk` values to the channel.

### 2c. `backend/internal/ai/tools.go` -- CREATE

Defines the tool schemas that get sent to Gemini for function calling.

```go
package ai

// GetToolDefinitions returns the tool declarations for Gemini function calling.
func GetToolDefinitions() []ToolDef

// Tool names (constants)
const (
    ToolGetUserHabits  = "get_user_habits"
    ToolGetUserStats   = "get_user_stats"
    ToolGetCalendar    = "get_calendar_events"
    ToolWriteCalendar  = "write_calendar_events"
)
```

Tool schemas:
1. `get_user_habits` -- no parameters, returns the user's active habits
2. `get_user_stats` -- no parameters, returns dashboard stats (streak, completion rate)
3. `get_calendar_events` -- params: `{start_date: string, end_date: string}`, returns existing events
4. `write_calendar_events` -- params: `{events: [{title, habit_id?, scheduled_date, start_time, duration_minutes}]}`, creates calendar events and returns them

### 2d. `backend/internal/domain/calendar/model.go` -- CREATE

The `CalendarEvent` struct and request/response types:

```go
package calendar

type CalendarEvent struct { /* see section 1a */ }

type CreateEventInput struct {
    HabitID         *string `json:"habit_id"`
    Title           string  `json:"title"           binding:"required,min=1,max=200"`
    Description     string  `json:"description"     binding:"max=500"`
    ScheduledDate   string  `json:"scheduled_date"  binding:"required"` // "2006-01-02"
    StartTime       string  `json:"start_time"      binding:"required"` // "15:04"
    DurationMinutes int     `json:"duration_minutes" binding:"omitempty,min=5,max=480"`
}

type CreateBatchInput struct {
    Events []CreateEventInput `json:"events" binding:"required,min=1,max=50,dive"`
}

type EventFilter struct {
    StartDate string // "2006-01-02"
    EndDate   string // "2006-01-02"
}
```

### 2e. `backend/internal/domain/calendar/repository.go` -- CREATE

```go
package calendar

type Repository struct {
    db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository

func (r *Repository) Create(event *CalendarEvent) error
func (r *Repository) CreateBatch(events []CalendarEvent) error
func (r *Repository) FindByUserID(userID uuid.UUID, filter EventFilter) ([]CalendarEvent, error)
func (r *Repository) FindByID(id uuid.UUID) (*CalendarEvent, error)
func (r *Repository) Update(event *CalendarEvent) error
func (r *Repository) Delete(id, userID uuid.UUID) error
func (r *Repository) DeleteByUserIDAndDateRange(userID uuid.UUID, startDate, endDate string) error
```

### 2f. `backend/internal/domain/calendar/service.go` -- CREATE

```go
package calendar

type Service struct {
    repo *Repository
}

func NewService(repo *Repository) *Service

func (s *Service) GetEvents(userID uuid.UUID, startDate, endDate string) ([]CalendarEvent, error)
func (s *Service) CreateEvent(userID uuid.UUID, input CreateEventInput) (*CalendarEvent, error)
func (s *Service) CreateBatch(userID uuid.UUID, input CreateBatchInput, source string) ([]CalendarEvent, error)
func (s *Service) UpdateEvent(userID uuid.UUID, eventID uuid.UUID, input CreateEventInput) (*CalendarEvent, error)
func (s *Service) DeleteEvent(userID uuid.UUID, eventID uuid.UUID) error
func (s *Service) ClearWeek(userID uuid.UUID, startDate, endDate string) error
```

### 2g. `backend/internal/domain/calendar/handler.go` -- CREATE

```go
package calendar

type Handler struct {
    svc *Service
}

func NewHandler(svc *Service) *Handler

func (h *Handler) GetEvents(c *gin.Context)     // GET  /api/v1/calendar?start=2006-01-02&end=2006-01-02
func (h *Handler) CreateEvent(c *gin.Context)    // POST /api/v1/calendar
func (h *Handler) DeleteEvent(c *gin.Context)    // DELETE /api/v1/calendar/:id
```

### 2h. `backend/internal/domain/aicoach/model.go` -- CREATE

```go
package aicoach

type AIConversation struct { /* see section 1b */ }

// ChatRequest is the handler-level input from the frontend.
type ChatRequest struct {
    Message        string  `json:"message"         binding:"required,min=1,max=2000"`
    ConversationID *string `json:"conversation_id"` // nil = start new conversation
}

// SSE event types sent to the frontend
type SSEEvent struct {
    Type string `json:"type"` // "token", "tool_call", "calendar_update", "done", "error"
    Data string `json:"data"`
}
```

### 2i. `backend/internal/domain/aicoach/service.go` -- CREATE

This is the orchestrator. It ties together the AI client, tool execution, and calendar writes.

```go
package aicoach

type Service struct {
    aiClient    *ai.Client
    habitSvc    *habit.Service
    habitRepo   *habit.Repository
    calendarSvc *calendar.Service
    dashSvc     *dashboard.Service
    repo        *Repository
}

func NewService(
    aiClient *ai.Client,
    habitSvc *habit.Service,
    habitRepo *habit.Repository,
    calendarSvc *calendar.Service,
    dashSvc *dashboard.Service,
    repo *Repository,
) *Service

// Chat handles a single user message: loads/creates conversation, calls Gemini
// with tools, executes any tool calls, streams tokens back via the channel,
// and persists the updated conversation.
func (s *Service) Chat(ctx context.Context, userID uuid.UUID, req ChatRequest, stream chan<- SSEEvent) error

// executeTool dispatches a Gemini function call to the appropriate service.
func (s *Service) executeTool(ctx context.Context, userID uuid.UUID, call ai.FunctionCall) (string, error)

// buildSystemPrompt returns the AI Coach persona prompt.
func buildSystemPrompt() string
```

System prompt (to be embedded as a constant):
```
You are HabitFlow AI Coach. You help users build realistic weekly habit plans.

You have access to tools that let you read the user's habits, stats, and calendar,
and write new calendar events. Always check the user's existing habits and schedule
before making suggestions.

When the user describes their week or asks for a plan:
1. Call get_user_habits to see what habits they have
2. Call get_user_stats to understand their current streaks and completion rates
3. Call get_calendar_events to check their existing schedule
4. Suggest a realistic plan with specific times
5. If the user approves, call write_calendar_events to save the plan

Be encouraging, specific about times, and realistic about workload.
Keep responses concise -- 2-3 paragraphs max unless the user asks for detail.
```

### 2j. `backend/internal/domain/aicoach/repository.go` -- CREATE

```go
package aicoach

type Repository struct {
    db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository

func (r *Repository) Create(conv *AIConversation) error
func (r *Repository) FindByID(id uuid.UUID) (*AIConversation, error)
func (r *Repository) FindByUserID(userID uuid.UUID) ([]AIConversation, error)
func (r *Repository) Update(conv *AIConversation) error
```

### 2k. `backend/internal/domain/aicoach/handler.go` -- CREATE

```go
package aicoach

type Handler struct {
    svc *Service
}

func NewHandler(svc *Service) *Handler

// Chat handles POST /api/v1/ai/chat.
// Sets SSE headers, creates a stream channel, calls service.Chat in a goroutine,
// and flushes SSE events to the client as they arrive.
func (h *Handler) Chat(c *gin.Context)
```

SSE response format (each line is `data: {json}\n\n`):
```
data: {"type":"token","data":"Great"}
data: {"type":"token","data":", let me"}
data: {"type":"tool_call","data":"{\"name\":\"get_user_habits\",\"args\":{}}"}
data: {"type":"token","data":"Based on your habits..."}
data: {"type":"calendar_update","data":"[{\"id\":\"...\",\"title\":\"Morning Run\",...}]"}
data: {"type":"done","data":""}
```

### 2l. `backend/cmd/server/main.go` -- MODIFY

Add to wire-up section:
```go
// Calendar domain
calendarRepo := calendar.NewRepository(db)
calendarSvc := calendar.NewService(calendarRepo)
calendarHandler := calendar.NewHandler(calendarSvc)

// AI Coach domain
aiClient := ai.NewClient(cfg.GeminiAPIKey, cfg.GeminiModel, cfg.OpenRouterAPIKey, cfg.OpenRouterModel)
aiCoachRepo := aicoach.NewRepository(db)
aiCoachSvc := aicoach.NewService(aiClient, habitSvc, habitRepo, calendarSvc, dashboardSvc, aiCoachRepo)
aiCoachHandler := aicoach.NewHandler(aiCoachSvc)
```

Add route groups (after existing admin routes):
```go
// Premium routes -- require auth + premium subscription
premium := v1.Group("")
premium.Use(middleware.Auth(cfg), middleware.RequirePremium())
{
    premium.POST("/ai/chat", aiCoachHandler.Chat)
    premium.GET("/calendar", calendarHandler.GetEvents)
    premium.POST("/calendar", calendarHandler.CreateEvent)
    premium.DELETE("/calendar/:id", calendarHandler.DeleteEvent)
}
```

Add to `AutoMigrate`:
```go
&calendar.CalendarEvent{}, &aicoach.AIConversation{}
```

---

## 3. API Contracts

### 3a. `POST /api/v1/ai/chat` (SSE)

**Auth:** JWT + RequirePremium

**Request body:**
```json
{
  "message": "I want to build a morning routine this week",
  "conversation_id": null
}
```

**Response:** SSE stream (`Content-Type: text/event-stream`)
```
data: {"type":"token","data":"Let me check"}
data: {"type":"token","data":" your current habits..."}
data: {"type":"tool_call","data":"{\"name\":\"get_user_habits\"}"}
data: {"type":"token","data":"You have 3 active habits. "}
data: {"type":"token","data":"Here's my suggested plan:\n\n"}
data: {"type":"token","data":"- 6:30 AM: Morning meditation..."}
data: {"type":"calendar_update","data":"[{\"id\":\"uuid\",\"title\":\"Morning Meditation\",\"scheduled_date\":\"2026-03-28\",\"start_time\":\"06:30\",\"duration_minutes\":15}]"}
data: {"type":"done","data":"{\"conversation_id\":\"uuid\"}"}
```

**Error event:**
```
data: {"type":"error","data":"AI service temporarily unavailable"}
```

### 3b. `GET /api/v1/calendar?start=2006-01-02&end=2006-01-02`

**Auth:** JWT + RequirePremium

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "habit_id": "uuid-or-null",
      "title": "Morning Run",
      "description": "",
      "scheduled_date": "2026-03-28",
      "start_time": "07:00",
      "duration_minutes": 30,
      "source": "ai",
      "is_completed": false,
      "created_at": "2026-03-27T10:00:00Z",
      "updated_at": "2026-03-27T10:00:00Z"
    }
  ],
  "message": "success"
}
```

### 3c. `POST /api/v1/calendar`

**Auth:** JWT + RequirePremium

**Request body:**
```json
{
  "title": "Evening Reading",
  "habit_id": "uuid-or-omit",
  "scheduled_date": "2026-03-28",
  "start_time": "20:00",
  "duration_minutes": 30,
  "description": "Read for 30 minutes"
}
```

**Response:** `201 Created`
```json
{
  "data": { /* CalendarEvent */ },
  "message": "success"
}
```

### 3d. `DELETE /api/v1/calendar/:id`

**Auth:** JWT + RequirePremium

**Response:** `200 OK`
```json
{
  "data": { "message": "event deleted" },
  "message": "success"
}
```

---

## 4. Frontend Files -- Exact Paths & Signatures

### 4a. `frontend/src/types/calendar.ts` -- CREATE

```typescript
export interface ICalendarEvent {
  id: string
  user_id: string
  habit_id: string | null
  title: string
  description: string
  scheduled_date: string   // "2006-01-02"
  start_time: string       // "HH:MM"
  duration_minutes: number
  source: 'ai' | 'manual'
  is_completed: boolean
  created_at: string
  updated_at: string
}

export interface ICreateEventInput {
  title: string
  habit_id?: string
  description?: string
  scheduled_date: string
  start_time: string
  duration_minutes?: number
}

export interface ISSEEvent {
  type: 'token' | 'tool_call' | 'calendar_update' | 'done' | 'error'
  data: string
}

export interface IChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  calendarEvents?: ICalendarEvent[] // attached when AI writes events
}
```

### 4b. `frontend/src/lib/hooks/useSSE.ts` -- CREATE

```typescript
interface UseSSEOptions {
  onToken: (text: string) => void
  onToolCall?: (data: string) => void
  onCalendarUpdate?: (events: ICalendarEvent[]) => void
  onDone: (data: string) => void
  onError: (error: string) => void
}

export function useSSE() {
  const [isStreaming, setIsStreaming] = useState(false)

  // sendMessage opens a POST fetch with streaming response reader,
  // parses SSE lines, and dispatches to callbacks.
  const sendMessage: (
    message: string,
    conversationId: string | null,
    options: UseSSEOptions
  ) => Promise<void>

  const abort: () => void // AbortController to cancel in-flight stream

  return { isStreaming, sendMessage, abort }
}
```

Implementation notes:
- Uses `fetch()` with `POST` method (not `EventSource`, which only supports GET).
- Reads the response body as a `ReadableStream`, splits on `\n\n`, parses each `data: {...}` line.
- This is the standard pattern for POST-based SSE.

### 4c. `frontend/src/lib/hooks/useCalendar.ts` -- CREATE

```typescript
export function useCalendar() {
  const [events, setEvents] = useState<ICalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEvents: (startDate: string, endDate: string) => Promise<void>
  const createEvent: (input: ICreateEventInput) => Promise<{ error?: string }>
  const deleteEvent: (id: string) => Promise<{ error?: string }>
  const addEventsLocally: (newEvents: ICalendarEvent[]) => void // for SSE updates

  return { events, loading, error, fetchEvents, createEvent, deleteEvent, addEventsLocally, refetch }
}
```

### 4d. `frontend/src/lib/hooks/useAICoach.ts` -- CREATE

```typescript
export function useAICoach() {
  const [messages, setMessages] = useState<IChatMessage[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const { isStreaming, sendMessage, abort } = useSSE()

  const send: (message: string) => Promise<void>
  // Appends user message, calls sendMessage, accumulates tokens into
  // an assistant message, handles calendar_update events.

  const reset: () => void // clear conversation

  return { messages, isStreaming, send, abort, reset, conversationId }
}
```

### 4e. `frontend/src/app/(app)/ai-coach/page.tsx` -- CREATE

```typescript
// 'use client'
// Main AI Coach page
// Uses useAICoach hook
// Layout: full-height chat interface with message list + input bar at bottom
// Shows lock/upgrade prompt if user.role === 'free'
// Components used: ChatMessageList, ChatInput, UpgradePrompt
export default function AICoachPage()
```

### 4f. `frontend/src/components/features/ai-coach/ChatMessageList.tsx` -- CREATE

```typescript
interface Props {
  messages: IChatMessage[]
  isStreaming: boolean
}

// Renders chat bubbles. User messages on right (teal), assistant on left (gray).
// Uses Framer Motion for message entrance animations.
// Scrolls to bottom on new messages.
// Shows typing indicator when isStreaming && last message is being built.
export function ChatMessageList({ messages, isStreaming }: Props)
```

### 4g. `frontend/src/components/features/ai-coach/ChatInput.tsx` -- CREATE

```typescript
interface Props {
  onSend: (message: string) => void
  disabled: boolean
}

// Text input with send button. Supports Enter to send, Shift+Enter for newline.
// Disabled while streaming.
export function ChatInput({ onSend, disabled }: Props)
```

### 4h. `frontend/src/components/features/ai-coach/ChatBubble.tsx` -- CREATE

```typescript
interface Props {
  message: IChatMessage
  isStreaming?: boolean // true if this is the currently-streaming assistant message
}

// Single chat bubble. Renders markdown-ish content (bold, lists).
// If calendarEvents are attached, shows a mini calendar preview card.
// Framer Motion fade-in animation.
export function ChatBubble({ message, isStreaming }: Props)
```

### 4i. `frontend/src/components/features/ai-coach/CalendarPreviewCard.tsx` -- CREATE

```typescript
interface Props {
  events: ICalendarEvent[]
}

// Compact card showing events the AI just created.
// "View in Calendar" link to /calendar.
// Framer Motion stagger animation for each event row.
export function CalendarPreviewCard({ events }: Props)
```

### 4j. `frontend/src/app/(app)/calendar/page.tsx` -- CREATE

```typescript
// 'use client'
// 7-day calendar grid view
// Uses useCalendar hook
// Shows current week (Mon-Sun) with events as time-block cards
// Events from AI have a sparkle/AI badge
// Lock/upgrade prompt for free users
// Components used: CalendarGrid, CalendarEventCard, UpgradePrompt
export default function CalendarPage()
```

### 4k. `frontend/src/components/features/calendar/CalendarGrid.tsx` -- CREATE

```typescript
interface Props {
  events: ICalendarEvent[]
  weekStartDate: string // "2006-01-02" (Monday)
  onDeleteEvent?: (id: string) => void
}

// 7-column grid layout. Each column is a day.
// Column header: day name + date.
// Events positioned by start_time as vertical blocks.
// Framer Motion stagger animation when events load or when AI adds new ones.
export function CalendarGrid({ events, weekStartDate, onDeleteEvent }: Props)
```

### 4l. `frontend/src/components/features/calendar/CalendarEventCard.tsx` -- CREATE

```typescript
interface Props {
  event: ICalendarEvent
  onDelete?: () => void
}

// Single event block inside a calendar column.
// Shows title, time, duration.
// AI-sourced events get a small "AI" badge.
// Hover: shows delete button.
// Framer Motion scale-in animation.
export function CalendarEventCard({ event, onDelete }: Props)
```

### 4m. `frontend/src/components/ui/UpgradePrompt.tsx` -- CREATE

```typescript
interface Props {
  feature: string // "AI Coach" | "Calendar" | etc.
}

// Reusable lock overlay / upgrade prompt.
// Shows lock icon + "Upgrade to Premium to access {feature}"
// CTA button (non-functional in MVP -- just visual).
export function UpgradePrompt({ feature }: Props)
```

### 4n. `frontend/src/middleware.ts` -- MODIFY

Add `/ai-coach` and `/calendar` to `PROTECTED_PREFIXES`:
```typescript
const PROTECTED_PREFIXES = ["/dashboard", "/habits", "/coach", "/admin", "/ai-coach", "/calendar"];
```

### 4o. `frontend/src/components/features/AppNav.tsx` -- MODIFY

Add AI Coach and Calendar nav links (between Habits and Admin):
```typescript
{
  href: '/ai-coach',
  label: 'AI Coach',
  icon: /* chat bubble SVG */,
  premium: true,
},
{
  href: '/calendar',
  label: 'Calendar',
  icon: /* calendar SVG */,
  premium: true,
},
```

Show a lock icon or muted style for free users on premium links. Links still navigate but the page shows the UpgradePrompt.

---

## 5. SSE Streaming Architecture

```
Frontend (useSSE)                   Backend (ai_handler)                AI Client
     |                                    |                                |
     |-- POST /ai/chat (JSON body) ------>|                                |
     |                                    |-- Set SSE headers              |
     |                                    |-- Create stream channel        |
     |                                    |-- goroutine: svc.Chat() ------>|
     |                                    |                                |-- POST Gemini API
     |                                    |                                |   (streamGenerateContent)
     |                                    |                                |
     |                                    |<-- StreamChunk{Text} ----------|
     |<-- data: {"type":"token"} ---------|                                |
     |                                    |<-- StreamChunk{Tool} ----------|
     |<-- data: {"type":"tool_call"} -----|                                |
     |                                    |-- Execute tool (DB query)      |
     |                                    |-- Send result back to Gemini ->|
     |                                    |                                |-- Continue generating
     |                                    |<-- StreamChunk{Text} ----------|
     |<-- data: {"type":"token"} ---------|                                |
     |                                    |                                |-- StreamChunk{Done}
     |                                    |-- Save conversation to DB      |
     |<-- data: {"type":"done"} ----------|                                |
     |                                    |                                |
```

Handler implementation pattern:
```go
func (h *Handler) Chat(c *gin.Context) {
    // 1. Bind JSON input
    // 2. Get userID from middleware
    // 3. Set SSE headers:
    //    Content-Type: text/event-stream
    //    Cache-Control: no-cache
    //    Connection: keep-alive
    // 4. Create channel for SSE events
    // 5. Launch goroutine calling svc.Chat(ctx, userID, req, ch)
    // 6. Loop: read from channel, write "data: {json}\n\n", flush
    // 7. On channel close or client disconnect, return
}
```

Key detail: Gin's `c.SSEvent()` method or manual `c.Writer.Write()` + `c.Writer.Flush()`. The handler must check `c.Writer.CloseNotify()` (or `c.Request.Context().Done()`) to detect client disconnects and cancel the AI call.

---

## 6. Gemini API Integration Details

### Model
- Primary: `gemini-2.0-flash` (free tier, supports function calling + streaming)
- Fallback: OpenRouter `google/gemini-flash-1.5` (if Gemini returns 429/500)

### Endpoint (Gemini)
```
POST https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?alt=sse&key={apiKey}
```

### Request body shape (Gemini native format)
```json
{
  "system_instruction": {
    "parts": [{"text": "You are HabitFlow AI Coach..."}]
  },
  "contents": [
    {"role": "user", "parts": [{"text": "Build me a morning routine"}]},
    {"role": "model", "parts": [{"text": "Let me check your habits..."}]}
  ],
  "tools": [{
    "functionDeclarations": [
      {
        "name": "get_user_habits",
        "description": "Get the user's active habits list",
        "parameters": {"type": "OBJECT", "properties": {}}
      },
      {
        "name": "write_calendar_events",
        "description": "Write habit events to the user's calendar",
        "parameters": {
          "type": "OBJECT",
          "properties": {
            "events": {
              "type": "ARRAY",
              "items": {
                "type": "OBJECT",
                "properties": {
                  "title": {"type": "STRING"},
                  "scheduled_date": {"type": "STRING", "description": "YYYY-MM-DD"},
                  "start_time": {"type": "STRING", "description": "HH:MM"},
                  "duration_minutes": {"type": "INTEGER"},
                  "habit_id": {"type": "STRING", "description": "optional UUID of existing habit"}
                },
                "required": ["title", "scheduled_date", "start_time", "duration_minutes"]
              }
            }
          },
          "required": ["events"]
        }
      }
    ]
  }]
}
```

### Tool-call loop
When Gemini responds with a `functionCall`, the backend:
1. Sends `{"type":"tool_call","data":"..."}` SSE event to frontend (optional UX indicator)
2. Executes the tool against the database
3. Sends the result back to Gemini as a `functionResponse` in a follow-up request
4. Gemini continues generating text, which streams back to the client
5. Maximum 5 tool-call rounds per message to prevent infinite loops

### OpenRouter fallback
Same streaming SSE approach but using OpenAI-compatible format:
```
POST https://openrouter.ai/api/v1/chat/completions
Authorization: Bearer {key}
```
With `stream: true` and `tools` array in OpenAI format.

---

## 7. Free vs Premium Gating

### Backend
- All `/ai/chat`, `/calendar` routes are behind `middleware.RequirePremium()`.
- Returns `403 {"error": "premium subscription required"}` for free users.
- The middleware already exists and works correctly (checks `role == "premium" || role == "admin"`).

### Frontend
- `middleware.ts` allows navigation to `/ai-coach` and `/calendar` for all authenticated users (so they can see the upgrade prompt).
- Inside each page component, check `user.role`:
  - If `role === "free"`: render `<UpgradePrompt feature="AI Coach" />` overlay instead of the real content.
  - If `role === "premium"` or `role === "admin"`: render the real content.
- API calls from hooks will also get 403 if somehow the frontend check is bypassed (defense in depth).
- Nav links for AI Coach and Calendar show a small lock icon for free users but are still clickable.

---

## 8. Implementation Order (Dependencies)

```
Step 1: Config changes (add Gemini/OpenRouter model fields)
   |
Step 2: Calendar domain (model, repository, service, handler)
   |      -- can be tested independently with manual events
   |
Step 3: AI client (internal/ai/client.go, tools.go)
   |      -- can be tested with a simple main() or test file
   |
Step 4: AI Coach domain (model, repository, service, handler)
   |      -- depends on Steps 2 + 3 + existing habit/dashboard domains
   |
Step 5: Wire everything in main.go (routes, middleware, AutoMigrate)
   |      -- depends on Steps 2 + 4
   |
Step 6: Frontend types + useSSE hook
   |
Step 7: useCalendar hook + Calendar page + CalendarGrid components
   |      -- can be tested with manual POST /calendar events
   |
Step 8: useAICoach hook + AI Coach page + chat components
   |      -- depends on Steps 6 + 7 (calendar update rendering)
   |
Step 9: UpgradePrompt + free user gating on both pages
   |
Step 10: AppNav update + middleware.ts update
   |
Step 11: End-to-end testing
```

Backend steps (1-5) and frontend steps (6-10) can be done in parallel after Step 5 is complete (frontend needs working API).

---

## 9. Environment Variable Updates

Add to `backend/.env.example`:
```
GEMINI_MODEL=gemini-2.0-flash
OPENROUTER_API_KEY=your-openrouter-key-optional
OPENROUTER_MODEL=google/gemini-flash-1.5
```

Add to `frontend/.env.local.example` (no changes needed -- frontend only talks to backend).

---

## 10. Testing Checklist

### Backend
- [ ] `GET /api/v1/calendar` returns empty array for new user
- [ ] `POST /api/v1/calendar` creates event, returns 201
- [ ] `GET /api/v1/calendar?start=...&end=...` filters correctly
- [ ] `DELETE /api/v1/calendar/:id` removes event
- [ ] Calendar endpoints return 403 for free users
- [ ] `POST /api/v1/ai/chat` returns SSE stream with token events
- [ ] AI chat returns 403 for free users
- [ ] AI can call `get_user_habits` tool and receive results
- [ ] AI can call `write_calendar_events` tool and events appear in DB
- [ ] Conversation is persisted in `ai_conversations` table
- [ ] Subsequent messages in same conversation include history
- [ ] OpenRouter fallback works when Gemini key is empty/invalid
- [ ] Tool-call loop terminates after max 5 rounds

### Frontend
- [ ] AI Coach page renders chat interface for premium users
- [ ] AI Coach page shows UpgradePrompt for free users
- [ ] Typing a message and pressing Enter sends to API
- [ ] SSE tokens render in real-time as assistant message builds
- [ ] Chat input is disabled while streaming
- [ ] Calendar update events show a preview card in chat
- [ ] Calendar page renders 7-day grid
- [ ] Calendar page shows UpgradePrompt for free users
- [ ] Events from AI appear on calendar (navigate from AI Coach)
- [ ] Manual event deletion works
- [ ] Nav sidebar shows AI Coach and Calendar links
- [ ] Lock icon appears on nav links for free users
- [ ] Framer Motion animations work on chat bubbles and calendar events

### Integration
- [ ] Full flow: user sends message -> AI reads habits -> suggests plan -> user approves -> AI writes calendar -> events visible on calendar page
- [ ] Conversation persists across page refreshes (via conversation_id)
- [ ] Client disconnect cancels the Gemini API call (no wasted tokens)

---

## 11. Risks & Open Questions

| # | Risk | Mitigation |
|---|---|---|
| 1 | Gemini free tier rate limits (15 RPM / 1M TPD) may be hit during demo | OpenRouter fallback is built in. Also consider caching system prompt tokens. |
| 2 | Gemini function calling may not always produce valid JSON for `write_calendar_events` | Validate tool-call args in `executeTool`. If invalid, send an error message back to Gemini asking it to retry. |
| 3 | SSE connection may timeout behind proxies/load balancers | Send a `{"type":"heartbeat"}` SSE event every 15 seconds during long tool-call execution. |
| 4 | `datatypes.JSON` requires `gorm.io/datatypes` which is not yet in `go.mod` | Add dependency: `go get gorm.io/datatypes`. |
| 5 | Conversation history could grow large over many messages | Limit to last 20 messages in the context window. Trim older messages when building the Gemini request. |
| 6 | The `ai` domain empty directory already exists at `backend/internal/domain/ai/` | Use it for the AI client (rename concept to `internal/domain/ai/` for client + tools). Place the coach orchestration in `internal/domain/aicoach/`. |
