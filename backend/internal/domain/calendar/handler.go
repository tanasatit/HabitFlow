package calendar

import (
	"net/http"

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

// GetEvents handles GET /api/v1/calendar?start=YYYY-MM-DD&end=YYYY-MM-DD
func (h *Handler) GetEvents(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		response.Unauthorized(c)
		return
	}

	events, err := h.svc.GetEvents(userID, c.Query("start"), c.Query("end"))
	if err != nil {
		response.InternalError(c)
		return
	}
	response.Success(c, events)
}

// CreateEvent handles POST /api/v1/calendar
func (h *Handler) CreateEvent(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		response.Unauthorized(c)
		return
	}

	var input CreateEventInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	event, err := h.svc.CreateEvent(userID, input)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	response.Created(c, event)
}

// DeleteEvent handles DELETE /api/v1/calendar/:id
func (h *Handler) DeleteEvent(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		response.Unauthorized(c)
		return
	}

	eventID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "invalid event id")
		return
	}

	if err := h.svc.DeleteEvent(userID, eventID); err != nil {
		if err.Error() == "event not found" {
			response.NotFound(c, "event not found")
			return
		}
		response.InternalError(c)
		return
	}
	response.Success(c, gin.H{"message": "event deleted"})
}
