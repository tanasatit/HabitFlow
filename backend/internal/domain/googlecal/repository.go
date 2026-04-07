package googlecal

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Repository struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) *Repository { return &Repository{db: db} }

// FindByUserID fetches the active (non-deleted) token for a user.
func (r *Repository) FindByUserID(userID uuid.UUID) (*GoogleToken, error) {
	var t GoogleToken
	if err := r.db.Where("user_id = ?", userID).First(&t).Error; err != nil {
		return nil, err
	}
	return &t, nil
}

// Upsert creates or updates the token for a user (matches on user_id).
// It conditionally excludes RefreshToken when empty to avoid overwriting
// an existing non-empty refresh token.
func (r *Repository) Upsert(t *GoogleToken) error {
	assign := GoogleToken{
		AccessToken: t.AccessToken,
		TokenType:   t.TokenType,
		Expiry:      t.Expiry,
		Email:       t.Email,
	}
	if t.RefreshToken != "" {
		assign.RefreshToken = t.RefreshToken
	}
	return r.db.Where(GoogleToken{UserID: t.UserID}).
		Assign(assign).
		FirstOrCreate(t).Error
}

// RestoreAndUpsert atomically restores a soft-deleted token (if any) and
// upserts the new token values in a single transaction.
func (r *Repository) RestoreAndUpsert(t *GoogleToken) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Restore soft-deleted record if present
		if err := tx.Unscoped().Model(&GoogleToken{}).
			Where("user_id = ?", t.UserID).
			Update("deleted_at", nil).Error; err != nil {
			return err
		}
		// Upsert
		assign := GoogleToken{
			AccessToken: t.AccessToken,
			TokenType:   t.TokenType,
			Expiry:      t.Expiry,
			Email:       t.Email,
		}
		if t.RefreshToken != "" {
			assign.RefreshToken = t.RefreshToken
		}
		return tx.Where(GoogleToken{UserID: t.UserID}).
			Assign(assign).
			FirstOrCreate(t).Error
	})
}

// Delete soft-deletes the token for a user.
func (r *Repository) Delete(userID uuid.UUID) error {
	return r.db.Where("user_id = ?", userID).Delete(&GoogleToken{}).Error
}

// Restore undeletes a previously soft-deleted token (used in re-connect flow).
func (r *Repository) Restore(userID uuid.UUID) error {
	return r.db.Unscoped().Model(&GoogleToken{}).
		Where("user_id = ?", userID).
		Update("deleted_at", nil).Error
}
