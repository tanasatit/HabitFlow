---
name: Phase 7 Google Calendar Sync - Frontend
description: Phase 7 frontend implementation details for Google Calendar OAuth2 integration
type: project
---

Phase 7 frontend implements Google Calendar OAuth2 connect/disconnect in a new Settings page.

**Why:** Backend exposes `/api/v1/google/*` endpoints (premium-only) for Google Calendar OAuth flow. Frontend needs settings UI and calendar status indicators.

**How to apply:** All 7 tasks are complete. The Settings page lives at `/settings` in the `(app)` route group, using `Suspense` to wrap `useSearchParams`. The `useGoogleCalendar` hook fetches `/google/status` — it handles the 403 gracefully via the `api` wrapper's error field. The `GoogleCalendarConnect` component redirects to the full backend URL (`NEXT_PUBLIC_API_URL/google/auth`) as a full browser redirect (not client-side navigation). Calendar events with `source: 'google'` use Google blue `#4285F4` in `CalendarEventCard`.
