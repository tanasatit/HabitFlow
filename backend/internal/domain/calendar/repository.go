package calendar

import (
	"errors"
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(event *CalendarEvent) error {
	return r.db.Create(event).Error
}

func (r *Repository) CreateBatch(events []CalendarEvent) error {
	return r.db.Create(&events).Error
}

func (r *Repository) FindByUserID(userID uuid.UUID, filter EventFilter) ([]CalendarEvent, error) {
	var events []CalendarEvent
	q := r.db.Where("user_id = ?", userID)
	if filter.StartDate != "" {
		q = q.Where("scheduled_date >= ?", filter.StartDate)
	}
	if filter.EndDate != "" {
		q = q.Where("scheduled_date <= ?", filter.EndDate)
	}
	if err := q.Order("scheduled_date ASC, start_time ASC").Find(&events).Error; err != nil {
		return nil, err
	}
	return events, nil
}

func (r *Repository) FindByID(id uuid.UUID) (*CalendarEvent, error) {
	var event CalendarEvent
	if err := r.db.First(&event, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &event, nil
}

// FindByIDAndUserID fetches a single event scoped to the owning user.
func (r *Repository) FindByIDAndUserID(id, userID uuid.UUID) (*CalendarEvent, error) {
	var event CalendarEvent
	if err := r.db.First(&event, "id = ? AND user_id = ?", id, userID).Error; err != nil {
		return nil, err
	}
	return &event, nil
}

// Update performs a partial update on fields provided in input, scoped to the owning user.
func (r *Repository) Update(eventID, userID uuid.UUID, input UpdateEventInput) (*CalendarEvent, error) {
	updates := map[string]interface{}{}
	if input.ScheduledDate != "" {
		updates["scheduled_date"] = input.ScheduledDate
	}
	if input.StartTime != "" {
		updates["start_time"] = input.StartTime
	}
	if input.Color != "" {
		updates["color"] = input.Color
	}

	if len(updates) == 0 {
		return r.FindByIDAndUserID(eventID, userID)
	}

	result := r.db.Model(&CalendarEvent{}).
		Where("id = ? AND user_id = ?", eventID, userID).
		Updates(updates)
	if result.Error != nil {
		return nil, fmt.Errorf("calendar_repository.Update: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return nil, errors.New("event not found")
	}

	return r.FindByIDAndUserID(eventID, userID)
}

// Delete removes an event owned by the given user. Returns an error if not found.
func (r *Repository) Delete(id, userID uuid.UUID) error {
	result := r.db.Where("id = ? AND user_id = ?", id, userID).Delete(&CalendarEvent{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("event not found")
	}
	return nil
}

func (r *Repository) DeleteByUserIDAndDateRange(userID uuid.UUID, startDate, endDate string) error {
	return r.db.Where("user_id = ? AND scheduled_date >= ? AND scheduled_date <= ?", userID, startDate, endDate).
		Delete(&CalendarEvent{}).Error
}
