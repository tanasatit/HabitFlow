package habit

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(h *Habit) error {
	return r.db.Create(h).Error
}

func (r *Repository) FindByID(id uuid.UUID) (*Habit, error) {
	var h Habit
	if err := r.db.First(&h, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &h, nil
}

func (r *Repository) FindByUserID(userID uuid.UUID) ([]Habit, error) {
	var habits []Habit
	if err := r.db.Where("user_id = ? AND is_active = ?", userID, true).
		Order("created_at DESC").
		Find(&habits).Error; err != nil {
		return nil, err
	}
	return habits, nil
}


func (r *Repository) Update(h *Habit) error {
	return r.db.Save(h).Error
}

func (r *Repository) Delete(id uuid.UUID) error {
	return r.db.Delete(&Habit{}, "id = ?", id).Error
}

func (r *Repository) CreateLog(log *HabitLog) error {
	return r.db.Create(log).Error
}

func (r *Repository) FindLogsByHabitID(habitID uuid.UUID, since time.Time) ([]HabitLog, error) {
	var logs []HabitLog
	if err := r.db.Where("habit_id = ? AND completed_at >= ?", habitID, since).
		Order("completed_at DESC").
		Find(&logs).Error; err != nil {
		return nil, err
	}
	return logs, nil
}

func (r *Repository) FindLogByHabitAndDate(habitID uuid.UUID, date time.Time) (*HabitLog, error) {
	startOfDay := date.Truncate(24 * time.Hour)
	startOfNextDay := startOfDay.Add(24 * time.Hour)
	var log HabitLog
	if err := r.db.Where(
		"habit_id = ? AND completed_at >= ? AND completed_at < ?",
		habitID, startOfDay, startOfNextDay,
	).First(&log).Error; err != nil {
		return nil, err
	}
	return &log, nil
}

func (r *Repository) FindTodayLogsByUserID(userID uuid.UUID) ([]HabitLog, error) {
	today := time.Now().Truncate(24 * time.Hour)
	tomorrow := today.Add(24 * time.Hour)
	var logs []HabitLog
	if err := r.db.Where(
		"user_id = ? AND completed_at >= ? AND completed_at < ?",
		userID, today, tomorrow,
	).Find(&logs).Error; err != nil {
		return nil, err
	}
	return logs, nil
}

func (r *Repository) FindLogsByHabitIDAll(habitID uuid.UUID) ([]HabitLog, error) {
	var logs []HabitLog
	if err := r.db.Where("habit_id = ?", habitID).
		Order("completed_at DESC").
		Find(&logs).Error; err != nil {
		return nil, err
	}
	return logs, nil
}

// FindLogsByUserIDSince returns all logs for a user since a given time.
// Used by dashboard to compute weekly completion counts.
func (r *Repository) FindLogsByUserIDSince(userID uuid.UUID, since time.Time) ([]HabitLog, error) {
	var logs []HabitLog
	if err := r.db.Where("user_id = ? AND completed_at >= ?", userID, since).
		Order("completed_at DESC").
		Find(&logs).Error; err != nil {
		return nil, err
	}
	return logs, nil
}

// FindLogsByHabitIDSince returns logs for a specific habit since a given time.
// Used by per-habit stats endpoint.
func (r *Repository) FindLogsByHabitIDSince(habitID uuid.UUID, since time.Time) ([]HabitLog, error) {
	var logs []HabitLog
	if err := r.db.Where("habit_id = ? AND completed_at >= ?", habitID, since).
		Order("completed_at DESC").
		Find(&logs).Error; err != nil {
		return nil, err
	}
	return logs, nil
}

// DeleteTodayLog removes the completion log for a habit logged today.
func (r *Repository) DeleteTodayLog(habitID uuid.UUID) error {
	today := time.Now().Truncate(24 * time.Hour)
	tomorrow := today.Add(24 * time.Hour)
	return r.db.Where(
		"habit_id = ? AND completed_at >= ? AND completed_at < ?",
		habitID, today, tomorrow,
	).Delete(&HabitLog{}).Error
}
