package calendar

import (
	"context"
	"fmt"
	"log"

	"github.com/google/uuid"
)

// googleCalendarUpdater is a minimal interface to avoid a hard import cycle.
type googleCalendarUpdater interface {
	IsConnected(userID uuid.UUID) bool
	UpdateEvent(ctx context.Context, userID uuid.UUID, googleEventID, title, description, scheduledDate, startTime string, durationMinutes int) error
}

type Service struct {
	repo         *Repository
	googleCalSvc googleCalendarUpdater
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// SetGoogleCalService wires the Google Calendar service after construction to avoid import cycles.
func (s *Service) SetGoogleCalService(g googleCalendarUpdater) {
	s.googleCalSvc = g
}

func (s *Service) GetEvents(userID uuid.UUID, startDate, endDate string) ([]CalendarEvent, error) {
	return s.repo.FindByUserID(userID, EventFilter{StartDate: startDate, EndDate: endDate})
}

func (s *Service) CreateEvent(userID uuid.UUID, input CreateEventInput) (*CalendarEvent, error) {
	event := &CalendarEvent{
		ID:              uuid.New(),
		UserID:          userID,
		Title:           input.Title,
		Description:     input.Description,
		ScheduledDate:   input.ScheduledDate,
		StartTime:       input.StartTime,
		DurationMinutes: input.DurationMinutes,
		Source:          "manual",
	}
	if event.DurationMinutes == 0 {
		event.DurationMinutes = 30
	}
	if input.HabitID != nil && *input.HabitID != "" {
		id, err := uuid.Parse(*input.HabitID)
		if err != nil {
			return nil, fmt.Errorf("invalid habit_id: %w", err)
		}
		event.HabitID = &id
	}
	if err := s.repo.Create(event); err != nil {
		return nil, err
	}
	return event, nil
}

func (s *Service) CreateBatch(userID uuid.UUID, inputs []CreateEventInput, source string) ([]CalendarEvent, error) {
	events := make([]CalendarEvent, 0, len(inputs))
	for _, input := range inputs {
		e := CalendarEvent{
			ID:              uuid.New(),
			UserID:          userID,
			Title:           input.Title,
			Description:     input.Description,
			ScheduledDate:   input.ScheduledDate,
			StartTime:       input.StartTime,
			DurationMinutes: input.DurationMinutes,
			Source:          source,
			GoogleEventID:   input.GoogleEventID,
		}
		if e.DurationMinutes == 0 {
			e.DurationMinutes = 30
		}
		if input.HabitID != nil && *input.HabitID != "" {
			id, err := uuid.Parse(*input.HabitID)
			if err == nil {
				e.HabitID = &id
			}
		}
		events = append(events, e)
	}
	if err := s.repo.CreateBatch(events); err != nil {
		return nil, err
	}
	return events, nil
}

func (s *Service) DeleteEvent(userID uuid.UUID, eventID uuid.UUID) error {
	return s.repo.Delete(eventID, userID)
}

func (s *Service) UpdateEvent(ctx context.Context, userID, eventID uuid.UUID, input UpdateEventInput) (*CalendarEvent, error) {
	event, err := s.repo.Update(eventID, userID, input)
	if err != nil {
		return nil, err
	}
	// Mirror changes to Google Calendar if the event originated there and user is connected.
	if s.googleCalSvc != nil && event.GoogleEventID != "" && s.googleCalSvc.IsConnected(userID) {
		if gErr := s.googleCalSvc.UpdateEvent(ctx, userID, event.GoogleEventID,
			input.Title, input.Description, input.ScheduledDate, input.StartTime, input.DurationMinutes,
		); gErr != nil {
			log.Printf("calendar: google sync failed for event %s: %v", event.GoogleEventID, gErr)
			// Non-fatal — local update already succeeded
		}
	}
	return event, nil
}

func (s *Service) ClearWeek(userID uuid.UUID, startDate, endDate string) error {
	return s.repo.DeleteByUserIDAndDateRange(userID, startDate, endDate)
}
