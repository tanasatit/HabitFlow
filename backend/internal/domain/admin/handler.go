package admin

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/habitflow/api/internal/middleware"
	"github.com/habitflow/api/pkg/response"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// ListUsers handles GET /api/v1/admin/users
// Query params: ?page=1&limit=20&search=email_or_name
func (h *Handler) ListUsers(c *gin.Context) {
	page := 1
	limit := 20

	if p := c.Query("page"); p != "" {
		if v, err := strconv.Atoi(p); err == nil && v > 0 {
			page = v
		}
	}

	if l := c.Query("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 {
			if v > 100 {
				v = 100
			}
			limit = v
		}
	}

	search := c.Query("search")

	users, total, err := h.svc.ListUsers(page, limit, search)
	if err != nil {
		response.InternalError(c)
		return
	}

	response.Paginated(c, users, total, page, limit)
}

// GetUser handles GET /api/v1/admin/users/:id
func (h *Handler) GetUser(c *gin.Context) {
	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "invalid user id")
		return
	}

	u, err := h.svc.GetUser(userID)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			response.NotFound(c, "user not found")
			return
		}
		response.InternalError(c)
		return
	}

	response.Success(c, u)
}

// UpdateUser handles PUT /api/v1/admin/users/:id
func (h *Handler) UpdateUser(c *gin.Context) {
	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "invalid user id")
		return
	}

	var input UpdateUserInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	adminID, ok := middleware.GetUserID(c)
	if !ok {
		response.Unauthorized(c)
		return
	}

	updated, err := h.svc.UpdateUser(adminID, userID, input)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			response.NotFound(c, "user not found")
			return
		}
		response.InternalError(c)
		return
	}

	response.Success(c, updated)
}

// DeleteUser handles DELETE /api/v1/admin/users/:id
func (h *Handler) DeleteUser(c *gin.Context) {
	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "invalid user id")
		return
	}

	adminID, ok := middleware.GetUserID(c)
	if !ok {
		response.Unauthorized(c)
		return
	}

	if err := h.svc.DeleteUser(adminID, userID); err != nil {
		if errors.Is(err, ErrCannotDeleteSelf) {
			response.Error(c, http.StatusBadRequest, err.Error())
			return
		}
		if errors.Is(err, ErrUserNotFound) {
			response.NotFound(c, "user not found")
			return
		}
		response.InternalError(c)
		return
	}

	response.Success(c, gin.H{"message": "user deleted"})
}

// Analytics handles GET /api/v1/admin/analytics
func (h *Handler) Analytics(c *gin.Context) {
	analytics, err := h.svc.GetAnalytics()
	if err != nil {
		response.InternalError(c)
		return
	}

	response.Success(c, analytics)
}
