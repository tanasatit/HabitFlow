package calendar

import (
	"errors"

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
