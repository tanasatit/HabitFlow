# PRP-007 -- Phase 7: Google Calendar Sync (MCP)

> **Phase goal:** Premium users can connect their Google Calendar via OAuth2, and the AI Coach can read existing Google Calendar events and write habit plans back to Google Calendar.

---

## Background & Context

Phase 6 established an internal calendar system with AI-powered event creation. The AI Coach uses Gemini function-calling to read/write `calendar_events` in Postgres. Phase 7 extends this by connecting to the user's real Google Calendar:

- The AI Coach gains two new tools: `read_google_calendar` and `write_google_calendar`
- Users authenticate via Google OAuth2; tokens are stored per-user in the DB
- The `CalendarEvent` model already has a `Source` field (values: `"manual"`, `"ai"`) -- we add `"google"` as a new source
- The `CalendarEvent` model does NOT currently have a `GoogleEventID` field (despite what DATABASE.md says) -- we need to add one via migration
- Only premium users (and admins) can access this feature, enforced by the existing `RequirePremium()` middleware

### Key decisions

1. **Separate `google_tokens` table** rather than adding columns to `users` -- cleaner separation, easier to revoke/delete, and avoids widening the frequently-queried users table.
2. **Server-side OAuth flow** -- the Go backend handles the OAuth2 exchange. The frontend redirects to a backend endpoint that initiates the Google consent screen, and the callback stores tokens.
3. **Direct Google Calendar API calls** rather than a separate MCP server process -- keeps the architecture simple (no sidecar process). The Go backend calls Google Calendar REST API directly using the stored OAuth tokens.
4. **Token refresh handled transparently** -- when an access token expires, the backend uses the refresh token to get a new one before making the API call.

---

## Scope

### Backend

| # | Task | Status |
|---|---|---|
| B1 | Create `google_tokens` table + GORM model | |
| B2 | Add `google_event_id` column to `calendar_events` table | |
| B3 | Add Google OAuth2 config to `pkg/config/config.go` | |
| B4 | Create `internal/domain/googlecal/` package (model, repository, service, handler) | |
| B5 | Implement OAuth2 flow: initiate + callback endpoints | |
| B6 | Implement Google Calendar read (list events for date range) | |
| B7 | Implement Google Calendar write (create events) | |
| B8 | Add `read_google_calendar` and `write_google_calendar` AI tools | |
| B9 | Wire new tool execution in `aicoach/service.go` | |
| B10 | Add disconnect endpoint (revoke + delete tokens) | |
| B11 | Add status endpoint (check if Google Calendar is connected) | |
| B12 | Register routes in `main.go` | |

### Frontend

| # | Task | Status |
|---|---|---|
| F1 | Create settings page at `app/(app)/settings/page.tsx` | |
| F2 | Add "Settings" nav link to `AppNav.tsx` | |
| F3 | Create `GoogleCalendarConnect` component with connect/disconnect buttons | |
| F4 | Create `useGoogleCalendar` hook for status + disconnect | |
| F5 | Show Google Calendar sync status badge on calendar page | |
| F6 | Add Google Calendar events (source: "google") visual distinction in calendar | |

---

## Technical Design

### Data Model Changes

#### New table: `google_tokens`

```go
// internal/domain/googlecal/model.go
type GoogleToken struct {
    ID           uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
    UserID       uuid.UUID      `gorm:"type:uuid;uniqueIndex;not null"                 json:"user_id"`
    AccessToken  string         `gorm:"not null"                                       json:"-"`
    RefreshToken string         `gorm:"not null"                                       json:"-"`
    TokenType    string         `gorm:"default:'Bearer'"                               json:"-"`
    Expiry       time.Time      `gorm:"not null"                                       json:"-"`
    Scope        string         `                                                      json:"-"`
    CreatedAt    time.Time      `                                                      json:"created_at"`
    UpdatedAt    time.Time      `                                                      json:"updated_at"`
    DeletedAt    gorm.DeletedAt `gorm:"index"                                          json:"-"`
}
```

Design notes:
- `uniqueIndex` on `UserID` ensures one Google connection per user
- All token fields have `json:"-"` to prevent accidental exposure in API responses
- Soft delete via `DeletedAt` -- disconnect sets this rather than hard-deleting, so we can audit

#### Migration: add `google_event_id` to `calendar_events`

```go
// Add to CalendarEvent model:
GoogleEventID string `gorm:"index" json:"google_event_id"`
```

GORM `AutoMigrate` will add this column automatically when the model is updated. No manual migration needed.

---

### API Endpoints

All Google Calendar endpoints require `Auth + RequirePremium` middleware.

#### OAuth Flow

| Method | Path | Description | Request | Response |
|---|---|---|---|---|
| `GET` | `/api/v1/google/auth` | Initiate OAuth2 flow -- redirects browser to Google consent screen | Query: `redirect_uri` (optional, for frontend to know where to return) | HTTP 302 redirect to Google |
| `GET` | `/api/v1/google/callback` | OAuth2 callback -- exchanges code for tokens, stores in DB, redirects to frontend | Query: `code`, `state` (CSRF token) | HTTP 302 redirect to `{FRONTEND_URL}/settings?google=connected` |

#### Google Calendar Management

| Method | Path | Description | Request | Response |
|---|---|---|---|---|
| `GET` | `/api/v1/google/status` | Check if user has connected Google Calendar | -- | `{ "data": { "connected": true, "email": "user@gmail.com" } }` |
| `DELETE` | `/api/v1/google/disconnect` | Revoke Google tokens and remove from DB | -- | `{ "data": null, "message": "Google Calendar disconnected" }` |
| `GET` | `/api/v1/google/events` | Read events from Google Calendar for a date range | Query: `start_date`, `end_date` (YYYY-MM-DD) | `{ "data": [...google calendar events...] }` |
| `POST` | `/api/v1/google/events` | Write events to Google Calendar | Body: `{ "events": [...] }` | `{ "data": [...created events...] }` |

#### Request/Response Shapes

**GET /api/v1/google/status response:**
```json
{
  "data": {
    "connected": true,
    "email": "user@gmail.com",
    "connected_at": "2026-04-10T12:00:00Z"
  }
}
```

**GET /api/v1/google/events response:**
```json
{
  "data": [
    {
      "google_event_id": "abc123",
      "title": "Team standup",
      "scheduled_date": "2026-04-10",
      "start_time": "09:00",
      "end_time": "09:30",
      "duration_minutes": 30,
      "description": "",
      "source": "google"
    }
  ]
}
```

**POST /api/v1/google/events request:**
```json
{
  "events": [
    {
      "title": "Morning run",
      "scheduled_date": "2026-04-10",
      "start_time": "07:00",
      "duration_minutes": 30,
      "description": "Habit: Running"
    }
  ]
}
```

---

### OAuth Flow

```
1. User clicks "Connect Google Calendar" on settings page
2. Frontend redirects to: GET /api/v1/google/auth
3. Backend generates a CSRF state token, stores it (in-memory or Redis with 10min TTL)
4. Backend redirects (302) to Google OAuth2 consent URL:
   https://accounts.google.com/o/oauth2/v2/auth
     ?client_id=GOOGLE_CLIENT_ID
     &redirect_uri={BACKEND_URL}/api/v1/google/callback
     &response_type=code
     &scope=https://www.googleapis.com/auth/calendar
     &access_type=offline
     &prompt=consent
     &state={csrf_token}
5. User grants permission on Google consent screen
6. Google redirects to: GET /api/v1/google/callback?code=XXX&state=YYY
7. Backend validates state token (CSRF check)
8. Backend exchanges code for access_token + refresh_token via:
   POST https://oauth2.googleapis.com/token
9. Backend stores tokens in google_tokens table
10. Backend redirects (302) to: {FRONTEND_URL}/settings?google=connected
11. Frontend settings page shows "Connected" status
```

**Important:** The `access_type=offline` and `prompt=consent` params ensure we always get a refresh_token. Without `prompt=consent`, Google only returns a refresh_token on the first authorization.

---

### MCP Integration (AI Tool Definitions)

Add two new tools to `internal/ai/tools.go`:

```go
const (
    // ... existing tools ...
    ToolReadGoogleCalendar  = "read_google_calendar"
    ToolWriteGoogleCalendar = "write_google_calendar"
)
```

#### Tool: `read_google_calendar`

```go
FunctionDecl{
    Name:        "read_google_calendar",
    Description: "Read events from the user's connected Google Calendar for a date range. Only available if user has connected Google Calendar.",
    Parameters: &ParamSpec{
        Type: "OBJECT",
        Properties: map[string]ParamProp{
            "start_date": {Type: "STRING", Description: "Start date in YYYY-MM-DD format"},
            "end_date":   {Type: "STRING", Description: "End date in YYYY-MM-DD format"},
        },
        Required: []string{"start_date", "end_date"},
    },
}
```

#### Tool: `write_google_calendar`

```go
FunctionDecl{
    Name:        "write_google_calendar",
    Description: "Write habit plan events to the user's connected Google Calendar. Only available if user has connected Google Calendar.",
    Parameters: &ParamSpec{
        Type: "OBJECT",
        Properties: map[string]ParamProp{
            "events": {
                Type:        "ARRAY",
                Description: "Array of events to create in Google Calendar",
                Items: &ParamSpec{
                    Type: "OBJECT",
                    Properties: map[string]ParamProp{
                        "title":            {Type: "STRING", Description: "Event title"},
                        "scheduled_date":   {Type: "STRING", Description: "Date in YYYY-MM-DD format"},
                        "start_time":       {Type: "STRING", Description: "Time in HH:MM format"},
                        "duration_minutes": {Type: "INTEGER", Description: "Duration in minutes"},
                        "description":      {Type: "STRING", Description: "Event description"},
                    },
                    Required: []string{"title", "scheduled_date", "start_time", "duration_minutes"},
                },
            },
        },
        Required: []string{"events"},
    },
}
```

#### Conditional Tool Availability

The Google Calendar tools should only be included in the AI request if the user has a connected Google account. Modify `aicoach/service.go` to check for Google token existence before including these tools:

```go
tools := internalai.GetToolDefinitions()
if s.googleCalSvc.IsConnected(userID) {
    tools = append(tools, internalai.GetGoogleCalendarToolDefinitions()...)
}
```

#### System Prompt Update

When Google Calendar is connected, append to system prompt:
```
The user has connected their Google Calendar. You can use read_google_calendar to see their real schedule and write_google_calendar to add habit events to their Google Calendar. Always prefer writing to Google Calendar when the user has it connected.
```

---

## File-by-File Plan

### Backend -- New Files

#### `backend/internal/domain/googlecal/model.go`
```go
package googlecal

type GoogleToken struct { ... }  // see Data Model section above

// GoogleCalendarEvent is a DTO for events read from Google Calendar API
type GoogleCalendarEvent struct {
    GoogleEventID   string `json:"google_event_id"`
    Title           string `json:"title"`
    Description     string `json:"description"`
    ScheduledDate   string `json:"scheduled_date"`
    StartTime       string `json:"start_time"`
    EndTime         string `json:"end_time"`
    DurationMinutes int    `json:"duration_minutes"`
    Source          string `json:"source"` // always "google"
}

// CreateGoogleEventInput is a DTO for creating events in Google Calendar
type CreateGoogleEventInput struct {
    Title           string `json:"title" binding:"required"`
    ScheduledDate   string `json:"scheduled_date" binding:"required"`
    StartTime       string `json:"start_time" binding:"required"`
    DurationMinutes int    `json:"duration_minutes" binding:"required,min=5,max=480"`
    Description     string `json:"description"`
}
```

#### `backend/internal/domain/googlecal/repository.go`
```go
package googlecal

func NewRepository(db *gorm.DB) *Repository
func (r *Repository) FindByUserID(userID uuid.UUID) (*GoogleToken, error)
func (r *Repository) Upsert(token *GoogleToken) error           // insert or update
func (r *Repository) Delete(userID uuid.UUID) error              // soft delete
```

#### `backend/internal/domain/googlecal/service.go`
```go
package googlecal

func NewService(repo *Repository, cfg *config.Config) *Service

// OAuth flow
func (s *Service) GetAuthURL(state string) string
func (s *Service) ExchangeCode(ctx context.Context, code string) (*oauth2.Token, error)
func (s *Service) SaveToken(userID uuid.UUID, token *oauth2.Token) error

// Token management
func (s *Service) IsConnected(userID uuid.UUID) bool
func (s *Service) GetStatus(userID uuid.UUID) (*ConnectionStatus, error)
func (s *Service) Disconnect(ctx context.Context, userID uuid.UUID) error
func (s *Service) getValidToken(userID uuid.UUID) (*oauth2.Token, error)  // refreshes if expired

// Google Calendar API
func (s *Service) ReadEvents(ctx context.Context, userID uuid.UUID, startDate, endDate string) ([]GoogleCalendarEvent, error)
func (s *Service) WriteEvents(ctx context.Context, userID uuid.UUID, events []CreateGoogleEventInput) ([]GoogleCalendarEvent, error)
```

Internal helpers:
```go
func (s *Service) getCalendarService(ctx context.Context, userID uuid.UUID) (*gcal.Service, error)
func (s *Service) refreshAndSave(userID uuid.UUID, token *GoogleToken) (*oauth2.Token, error)
```

#### `backend/internal/domain/googlecal/handler.go`
```go
package googlecal

func NewHandler(svc *Service) *Handler

func (h *Handler) InitiateAuth(c *gin.Context)    // GET /google/auth
func (h *Handler) Callback(c *gin.Context)         // GET /google/callback
func (h *Handler) Status(c *gin.Context)           // GET /google/status
func (h *Handler) Disconnect(c *gin.Context)       // DELETE /google/disconnect
func (h *Handler) ReadEvents(c *gin.Context)       // GET /google/events
func (h *Handler) WriteEvents(c *gin.Context)      // POST /google/events
```

### Backend -- Modified Files

#### `backend/pkg/config/config.go`

Add fields:
```go
type Config struct {
    // ... existing fields ...
    GoogleClientID     string
    GoogleClientSecret string
    GoogleRedirectURL  string  // e.g., "http://localhost:8080/api/v1/google/callback"
    BackendURL         string  // e.g., "http://localhost:8080"
}
```

Add to `Load()`:
```go
GoogleClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
GoogleClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
GoogleRedirectURL:  getEnv("GOOGLE_REDIRECT_URL", "http://localhost:8080/api/v1/google/callback"),
BackendURL:         getEnv("BACKEND_URL", "http://localhost:8080"),
```

These are NOT added to `validate()` required list -- they are optional (app works without Google Calendar).

#### `backend/internal/domain/calendar/model.go`

Add `GoogleEventID` field to `CalendarEvent`:
```go
type CalendarEvent struct {
    // ... existing fields ...
    GoogleEventID string `gorm:"index" json:"google_event_id"`
}
```

#### `backend/internal/ai/tools.go`

Add new constants:
```go
const (
    ToolReadGoogleCalendar  = "read_google_calendar"
    ToolWriteGoogleCalendar = "write_google_calendar"
)
```

Add new function:
```go
func GetGoogleCalendarToolDefinitions() []ToolDef
```

This returns the two Google Calendar tool definitions (see MCP Integration section above).

#### `backend/internal/domain/aicoach/service.go`

Changes:
1. Add `googleCalSvc *googlecal.Service` to `Service` struct
2. Update `NewService()` to accept `googleCalSvc`
3. In `Chat()`, conditionally include Google Calendar tools based on connection status
4. In `buildSystemPrompt()`, add Google Calendar context if connected
5. In `executeTool()`, add two new cases for `read_google_calendar` and `write_google_calendar`

```go
// New constructor signature:
func NewService(
    aiClient *internalai.Client,
    habitSvc *habit.Service,
    habitRepo *habit.Repository,
    calendarSvc *calendar.Service,
    dashSvc *dashboard.Service,
    repo *Repository,
    googleCalSvc *googlecal.Service,  // NEW
) *Service

// New tool execution cases in executeTool():
case internalai.ToolReadGoogleCalendar:
    startDate, _ := call.Args["start_date"].(string)
    endDate, _ := call.Args["end_date"].(string)
    events, err := s.googleCalSvc.ReadEvents(ctx, userID, startDate, endDate)
    // ... marshal and return

case internalai.ToolWriteGoogleCalendar:
    // Parse events from call.Args, call s.googleCalSvc.WriteEvents()
    // Also save to local calendar_events with source="google"
    // Emit calendar_update SSE event
```

#### `backend/cmd/server/main.go`

Changes:
1. Add `AutoMigrate` for `googlecal.GoogleToken`
2. Wire `googlecal` dependencies (repo, service, handler)
3. Pass `googleCalSvc` to `aicoach.NewService()`
4. Register Google Calendar routes under premium group

```go
// New dependency wiring:
googleCalRepo := googlecal.NewRepository(db)
googleCalSvc := googlecal.NewService(googleCalRepo, cfg)
googleCalHandler := googlecal.NewHandler(googleCalSvc)

// Updated aicoach wiring:
aiCoachSvc := aicoach.NewService(aiClient, habitSvc, habitRepo, calendarSvc, dashboardSvc, aiCoachRepo, googleCalSvc)

// New routes (under premium group):
premium.GET("/google/auth", googleCalHandler.InitiateAuth)
premium.GET("/google/callback", googleCalHandler.Callback)
premium.GET("/google/status", googleCalHandler.Status)
premium.DELETE("/google/disconnect", googleCalHandler.Disconnect)
premium.GET("/google/events", googleCalHandler.ReadEvents)
premium.POST("/google/events", googleCalHandler.WriteEvents)
```

**Note:** The `/google/auth` and `/google/callback` endpoints need `RequirePremium` but the callback also needs to handle the case where the user's session cookie is present during the redirect. Since the frontend redirects to the backend auth URL (which then redirects to Google), the browser will carry cookies through the redirect chain.

#### `backend/.env.example`

Add:
```env
# Google Calendar OAuth2
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URL=http://localhost:8080/api/v1/google/callback
BACKEND_URL=http://localhost:8080
```

### Backend -- New Dependency

Add `google.golang.org/api` for Google Calendar API:
```bash
go get google.golang.org/api/calendar/v3
go get golang.org/x/oauth2/google
```

### Frontend -- New Files

#### `frontend/src/app/(app)/settings/page.tsx`

Settings page with Google Calendar connection section. Premium-gated.

```typescript
// Server component that renders the settings page
// Sections:
// 1. Account info (read-only: name, email, role)
// 2. Google Calendar Integration (connect/disconnect)
export default function SettingsPage() { ... }
```

#### `frontend/src/components/features/settings/GoogleCalendarConnect.tsx`

```typescript
'use client'

interface GoogleCalendarConnectProps {}

export function GoogleCalendarConnect() {
    // Uses useGoogleCalendar hook
    // Shows:
    //   - "Connect Google Calendar" button (if not connected)
    //   - Connected status with email + "Disconnect" button (if connected)
    //   - Loading state during status check
}
```

#### `frontend/src/lib/hooks/useGoogleCalendar.ts`

```typescript
export function useGoogleCalendar() {
    // Returns:
    //   connected: boolean
    //   email: string | null
    //   connectedAt: string | null
    //   loading: boolean
    //   error: string | null
    //   disconnect: () => Promise<void>
    //   connectUrl: string  // "/google/auth" endpoint
}
```

#### `frontend/src/types/google.ts`

```typescript
export interface IGoogleCalendarStatus {
    connected: boolean
    email: string | null
    connected_at: string | null
}
```

### Frontend -- Modified Files

#### `frontend/src/components/features/AppNav.tsx`

Add "Settings" link to `NAV_LINKS` array (gear icon, href: `/settings`), placed after "Calendar".

#### `frontend/src/app/(app)/calendar/page.tsx`

- Add a small badge/indicator showing Google Calendar sync status (e.g., a green dot with "Google Calendar connected" tooltip)
- Events with `source: "google"` get a distinct color/icon (e.g., Google blue + Google Calendar icon)

#### `frontend/src/middleware.ts`

Add `/settings` to protected route prefixes if not already covered by the `(app)` group catch-all.

---

## Out of Scope

- **Two-way sync** -- we only read from Google Calendar and write to Google Calendar. We do not auto-sync deletions or updates between HabitFlow and Google Calendar.
- **Webhook-based real-time sync** -- no Google Calendar push notifications. Events are read on-demand when the AI tool is called or when the user visits the calendar page.
- **Multiple Google accounts** -- one Google account per HabitFlow user.
- **Google Calendar event editing/deletion** -- we only create events. Users edit/delete directly in Google Calendar.
- **Importing Google Calendar events into local calendar_events table** -- Google events are read on-demand and displayed alongside local events, but not persisted locally (except when AI writes them).

---

## Dependencies (Ordering)

The tasks must be completed in this order:

```
B3 (config) ──┐
              ├── B1 (google_tokens model) ── B4 (repository) ── B5 (OAuth flow)
B2 (calendar  │                                                       │
   migration) ┘                                                       │
                                                                      ├── B6 (read events)
                                                                      ├── B7 (write events)
                                                                      │
                                                                      ├── B8 (AI tool defs)
                                                                      │        │
                                                                      │        ├── B9 (wire tools in aicoach)
                                                                      │        │
                                                                      ├── B10 (disconnect)
                                                                      ├── B11 (status)
                                                                      │
                                                                      └── B12 (routes in main.go)

F4 (hook) ── F1 (settings page) ── F3 (connect component)
F2 (nav link) -- independent, can be done anytime
F5 + F6 (calendar page changes) -- after B11 is available
```

**Critical path:** B3 -> B1 -> B4 -> B5 -> B6/B7 -> B8 -> B9 -> B12

The backend agent should implement B1-B12 in order. The frontend agent can start F2 and F4 immediately, then F1/F3 once the backend `/google/status` endpoint is available.

---

## Environment Setup Required

Before implementation begins, the developer needs:

1. **Google Cloud Console project** with Calendar API enabled
2. **OAuth2 credentials** (Web application type) with:
   - Authorized redirect URI: `http://localhost:8080/api/v1/google/callback`
   - Scopes: `https://www.googleapis.com/auth/calendar`
3. **Environment variables** set in `.env`:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URL`
   - `BACKEND_URL`

---

## Verification

### Backend Testing Checklist

- [ ] `google_tokens` table created by AutoMigrate
- [ ] `calendar_events.google_event_id` column added by AutoMigrate
- [ ] `GET /api/v1/google/auth` redirects to Google consent screen (premium user)
- [ ] `GET /api/v1/google/auth` returns 403 for free users
- [ ] OAuth callback stores tokens in `google_tokens` table
- [ ] OAuth callback redirects to frontend settings page with success param
- [ ] `GET /api/v1/google/status` returns `connected: false` before OAuth
- [ ] `GET /api/v1/google/status` returns `connected: true` after OAuth
- [ ] `GET /api/v1/google/events?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD` returns Google Calendar events
- [ ] `POST /api/v1/google/events` creates events in Google Calendar
- [ ] `DELETE /api/v1/google/disconnect` removes tokens and returns `connected: false`
- [ ] Token refresh works when access token expires (test by manually setting expiry to past)
- [ ] AI Coach includes Google Calendar tools only when user has connected Google
- [ ] AI Coach `read_google_calendar` tool returns real Google Calendar events
- [ ] AI Coach `write_google_calendar` tool creates events in Google Calendar
- [ ] AI Coach `write_google_calendar` also saves events to local `calendar_events` with `source: "google"`
- [ ] All Google endpoints return 403 for non-premium users

### Frontend Testing Checklist

- [ ] Settings page accessible from nav sidebar
- [ ] "Connect Google Calendar" button visible for premium users
- [ ] Clicking connect redirects to Google consent screen
- [ ] After OAuth, settings page shows "Connected" status with Google email
- [ ] "Disconnect" button removes connection and shows "Connect" button again
- [ ] Calendar page shows Google Calendar connected badge when applicable
- [ ] Events from Google Calendar (source: "google") display with distinct styling
- [ ] Settings page shows appropriate error states (e.g., OAuth failed)
- [ ] Free users see premium gate on settings page for Google Calendar section

### Integration Testing

- [ ] Full flow: connect Google Calendar -> ask AI to read schedule -> AI reads real events -> AI suggests habit plan -> AI writes to Google Calendar -> events appear in Google Calendar app
- [ ] Disconnect flow: disconnect -> AI no longer offers Google Calendar tools -> reconnect works
