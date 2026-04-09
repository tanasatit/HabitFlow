package admin

import (
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/habitflow/api/internal/domain/habit"
	"github.com/habitflow/api/internal/domain/user"
)

var (
	ErrUserNotFound     = errors.New("user not found")
	ErrCannotDeleteSelf = errors.New("admin cannot delete own account")
	ErrInvalidRole      = errors.New("invalid role")
)

type Service struct {
	userRepo  *user.Repository
	habitRepo *habit.Repository
	db        *gorm.DB // needed for DAU raw query
}

func NewService(userRepo *user.Repository, habitRepo *habit.Repository, db *gorm.DB) *Service {
	return &Service{
		userRepo:  userRepo,
		habitRepo: habitRepo,
		db:        db,
	}
}

// ListUsers returns a paginated list of users with their subscriptions.
func (s *Service) ListUsers(page, limit int, search string) ([]UserDetail, int64, error) {
	users, total, err := s.userRepo.FindAllPaginated(page, limit, search)
	if err != nil {
		return nil, 0, fmt.Errorf("admin.ListUsers: %w", err)
	}

	details := make([]UserDetail, 0, len(users))
	for _, u := range users {
		detail := mapUserToDetail(u)
		sub, err := s.userRepo.FindSubscriptionByUserID(u.ID)
		if err == nil {
			subDetail := mapSubToDetail(*sub)
			detail.Subscription = &subDetail
		}
		// If no subscription found, Subscription remains nil — valid per spec.
		details = append(details, detail)
	}

	return details, total, nil
}

// GetUser returns a single user with subscription detail.
func (s *Service) GetUser(userID uuid.UUID) (*UserDetail, error) {
	u, err := s.userRepo.FindByID(userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("admin.GetUser: %w", err)
	}

	detail := mapUserToDetail(*u)
	sub, err := s.userRepo.FindSubscriptionByUserID(u.ID)
	if err == nil {
		subDetail := mapSubToDetail(*sub)
		detail.Subscription = &subDetail
	}

	return &detail, nil
}

// UpdateUser updates a user's name and/or role+subscription tier.
// When role changes, Subscription.Plan is also updated to stay in sync.
func (s *Service) UpdateUser(adminID, userID uuid.UUID, input UpdateUserInput) (*UserDetail, error) {
	u, err := s.userRepo.FindByID(userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	if input.Name != nil {
		u.Name = *input.Name
	}

	if input.Role != nil {
		u.Role = user.Role(*input.Role)

		// Determine plan: admin and premium map to "premium", free maps to "free"
		plan := "free"
		if *input.Role == "admin" || *input.Role == "premium" {
			plan = "premium"
		}

		// Find or create subscription and update its plan
		sub, err := s.userRepo.FindSubscriptionByUserID(u.ID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				// Create subscription
				newSub := &user.Subscription{
					ID:     uuid.New(),
					UserID: u.ID,
					Plan:   plan,
				}
				if createErr := s.userRepo.CreateSubscription(newSub); createErr != nil {
					return nil, createErr
				}
			} else {
				return nil, err
			}
		} else {
			sub.Plan = plan
			if updateErr := s.userRepo.UpdateSubscription(sub); updateErr != nil {
				return nil, updateErr
			}
		}
	}

	if err := s.userRepo.Update(u); err != nil {
		return nil, fmt.Errorf("admin.UpdateUser: %w", err)
	}

	return s.GetUser(userID)
}

// DeleteUser soft-deletes a user. Admin cannot delete themselves.
func (s *Service) DeleteUser(adminID, userID uuid.UUID) error {
	if adminID == userID {
		return ErrCannotDeleteSelf
	}

	_, err := s.userRepo.FindByID(userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrUserNotFound
		}
		return err
	}

	if err := s.userRepo.SoftDelete(userID); err != nil {
		return fmt.Errorf("admin.DeleteUser: %w", err)
	}
	return nil
}

// GetAnalytics returns platform-wide stats.
func (s *Service) GetAnalytics() (*AnalyticsResponse, error) {
	totalUsers, err := s.userRepo.CountAll()
	if err != nil {
		return nil, fmt.Errorf("admin.GetAnalytics: %w", err)
	}

	freeUsers, err := s.userRepo.CountByRole(user.RoleFree)
	if err != nil {
		return nil, fmt.Errorf("admin.GetAnalytics: %w", err)
	}

	premiumUsers, err := s.userRepo.CountByRole(user.RolePremium)
	if err != nil {
		return nil, fmt.Errorf("admin.GetAnalytics: %w", err)
	}

	adminUsers, err := s.userRepo.CountByRole(user.RoleAdmin)
	if err != nil {
		return nil, fmt.Errorf("admin.GetAnalytics: %w", err)
	}

	// DAU: distinct users who logged at least one habit completion today
	today := time.Now().Truncate(24 * time.Hour)
	tomorrow := today.Add(24 * time.Hour)

	var dau int64
	if err := s.db.Raw(
		"SELECT COUNT(DISTINCT user_id) FROM habit_logs WHERE completed_at >= ? AND completed_at < ?",
		today, tomorrow,
	).Scan(&dau).Error; err != nil {
		return nil, fmt.Errorf("admin.GetAnalytics dau: %w", err)
	}

	return &AnalyticsResponse{
		TotalUsers:   totalUsers,
		FreeUsers:    freeUsers,
		PremiumUsers: premiumUsers,
		AdminUsers:   adminUsers,
		DAU:          dau,
	}, nil
}

// --- Mapping helpers ---

func mapUserToDetail(u user.User) UserDetail {
	return UserDetail{
		ID:        u.ID,
		Email:     u.Email,
		Name:      u.Name,
		Role:      string(u.Role),
		CreatedAt: u.CreatedAt,
		UpdatedAt: u.UpdatedAt,
	}
}

func mapSubToDetail(s user.Subscription) SubDetail {
	return SubDetail{
		ID:        s.ID,
		Plan:      s.Plan,
		ExpiresAt: s.ExpiresAt,
		CreatedAt: s.CreatedAt,
		UpdatedAt: s.UpdatedAt,
	}
}
