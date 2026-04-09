package aicoach

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(conv *AIConversation) error {
	return r.db.Create(conv).Error
}

func (r *Repository) FindByID(id uuid.UUID) (*AIConversation, error) {
	var conv AIConversation
	if err := r.db.First(&conv, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &conv, nil
}

func (r *Repository) FindByUserID(userID uuid.UUID) ([]AIConversation, error) {
	var convs []AIConversation
	if err := r.db.Where("user_id = ?", userID).Order("updated_at DESC").Find(&convs).Error; err != nil {
		return nil, err
	}
	return convs, nil
}

func (r *Repository) Update(conv *AIConversation) error {
	return r.db.Save(conv).Error
}
