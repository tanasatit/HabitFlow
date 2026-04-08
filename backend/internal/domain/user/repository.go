package user

import (
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

func (r *Repository) Create(u *User) error {
	return r.db.Create(u).Error
}

func (r *Repository) FindByEmail(email string) (*User, error) {
	var u User
	if err := r.db.Where("email = ?", email).First(&u).Error; err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *Repository) FindByID(id uuid.UUID) (*User, error) {
	var u User
	if err := r.db.First(&u, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &u, nil
}

// FindByGoogleID looks up a user by their Google account ID.
func (r *Repository) FindByGoogleID(googleID string) (*User, error) {
	var u User
	if err := r.db.Where("google_id = ?", googleID).First(&u).Error; err != nil {
		return nil, fmt.Errorf("user.Repository.FindByGoogleID: %w", err)
	}
	return &u, nil
}

// UpdateGoogleID links a Google account to an existing user and sets avatar_url.
func (r *Repository) UpdateGoogleID(userID uuid.UUID, googleID string, avatarURL string) error {
	if err := r.db.Model(&User{}).Where("id = ?", userID).Updates(map[string]interface{}{
		"google_id":  googleID,
		"avatar_url": avatarURL,
	}).Error; err != nil {
		return fmt.Errorf("user.Repository.UpdateGoogleID: %w", err)
	}
	return nil
}

// UpdateNameAndAvatar updates the name and avatar_url for an existing user.
func (r *Repository) UpdateNameAndAvatar(userID uuid.UUID, name string, avatarURL string) error {
	if err := r.db.Model(&User{}).Where("id = ?", userID).Updates(map[string]interface{}{
		"name":       name,
		"avatar_url": avatarURL,
	}).Error; err != nil {
		return fmt.Errorf("user.Repository.UpdateNameAndAvatar: %w", err)
	}
	return nil
}

// FindAllPaginated returns users with optional search filtering, ordered by created_at DESC.
func (r *Repository) FindAllPaginated(page, limit int, search string) ([]User, int64, error) {
	var users []User
	var total int64

	query := r.db.Model(&User{})
	if search != "" {
		like := "%" + search + "%"
		query = query.Where("email ILIKE ? OR name ILIKE ?", like, like)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("user.Repository.FindAllPaginated count: %w", err)
	}

	offset := (page - 1) * limit
	if err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&users).Error; err != nil {
		return nil, 0, fmt.Errorf("user.Repository.FindAllPaginated find: %w", err)
	}

	return users, total, nil
}

// CountAll returns total number of non-deleted users.
func (r *Repository) CountAll() (int64, error) {
	var count int64
	if err := r.db.Model(&User{}).Count(&count).Error; err != nil {
		return 0, fmt.Errorf("user.Repository.CountAll: %w", err)
	}
	return count, nil
}

// CountByRole returns the number of users with the given role.
func (r *Repository) CountByRole(role Role) (int64, error) {
	var count int64
	if err := r.db.Model(&User{}).Where("role = ?", role).Count(&count).Error; err != nil {
		return 0, fmt.Errorf("user.Repository.CountByRole: %w", err)
	}
	return count, nil
}

// Update saves changes to an existing user record.
func (r *Repository) Update(u *User) error {
	if err := r.db.Save(u).Error; err != nil {
		return fmt.Errorf("user.Repository.Update: %w", err)
	}
	return nil
}

// SoftDelete soft-deletes a user by ID.
func (r *Repository) SoftDelete(id uuid.UUID) error {
	if err := r.db.Delete(&User{}, "id = ?", id).Error; err != nil {
		return fmt.Errorf("user.Repository.SoftDelete: %w", err)
	}
	return nil
}

// FindSubscriptionByUserID returns the subscription for a given user.
func (r *Repository) FindSubscriptionByUserID(userID uuid.UUID) (*Subscription, error) {
	var sub Subscription
	if err := r.db.Where("user_id = ?", userID).First(&sub).Error; err != nil {
		return nil, fmt.Errorf("user.Repository.FindSubscriptionByUserID: %w", err)
	}
	return &sub, nil
}

// CreateSubscription creates a new subscription record.
func (r *Repository) CreateSubscription(s *Subscription) error {
	if err := r.db.Create(s).Error; err != nil {
		return fmt.Errorf("user.Repository.CreateSubscription: %w", err)
	}
	return nil
}

// UpdateSubscription saves changes to an existing subscription.
func (r *Repository) UpdateSubscription(s *Subscription) error {
	if err := r.db.Save(s).Error; err != nil {
		return fmt.Errorf("user.Repository.UpdateSubscription: %w", err)
	}
	return nil
}
