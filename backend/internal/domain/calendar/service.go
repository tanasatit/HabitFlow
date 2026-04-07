package calendar

import (
	"fmt"

	"github.com/google/uuid"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
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

func (s *Service) UpdateEvent(userID, eventID uuid.UUID, input UpdateEventInput) (*CalendarEvent, error) {
	return s.repo.Update(eventID, userID, input)
}

func (s *Service) ClearWeek(userID uuid.UUID, startDate, endDate string) error {
	return s.repo.DeleteByUserIDAndDateRange(userID, startDate, endDate)
}
