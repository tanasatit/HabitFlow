---
name: Phase 7 - Google Calendar OAuth2 + AI Tools
description: Phase 7 adds Google Calendar OAuth2 connection for premium users and two AI coach tools
type: project
---

Phase 7 implemented Google Calendar OAuth2 sync for premium users.

Key additions:
- `internal/domain/googlecal/` package with model, repository, service, handler
- `GoogleToken` GORM model with soft-delete support, stored in `google_tokens` table
- `GoogleEventID` field added to `CalendarEvent` model
- Two new AI tool constants: `ToolReadGoogleCalendar`, `ToolWriteGoogleCalendar`
- `GetGoogleCalendarToolDefinitions()` in `internal/ai/tools.go`
- `aicoach.Service` updated with `googleCalSvc *googlecal.Service` field (last param in `NewService`)
- `buildSystemPrompt` became a method on Service to access `googleCalSvc.IsConnected(userID)`
- New dependencies: `golang.org/x/oauth2`, `google.golang.org/api/calendar/v3`

**Why:** Premium users need to sync habits with their real Google Calendar; AI Coach needs context of their schedule.

**How to apply:** When touching aicoach or calendar code, remember `googleCalSvc` is nil-safe checked before every call.
