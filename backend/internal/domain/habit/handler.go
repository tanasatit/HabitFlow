package habit

import (
	"errors"
	"io"
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

func (h *Handler) Create(c *gin.Context) {
	var input CreateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	userID, ok := middleware.GetUserID(c)
	if !ok {
		response.Unauthorized(c)
		return
	}

	habit, err := h.svc.Create(userID, input)
	if err != nil {
		if errors.Is(err, ErrFreeTierLimit) {
			response.Error(c, http.StatusForbidden, err.Error())
			return
		}
		response.InternalError(c)
		return
	}

	response.Created(c, habit)
}

func (h *Handler) List(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		response.Unauthorized(c)
		return
	}

	habits, err := h.svc.List(userID)
	if err != nil {
		response.InternalError(c)
		return
	}

	response.Success(c, habits)
}

func (h *Handler) GetByID(c *gin.Context) {
	habitID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "invalid habit id")
		return
	}

	userID, ok := middleware.GetUserID(c)
	if !ok {
		response.Unauthorized(c)
		return
	}

	habit, err := h.svc.GetByID(userID, habitID)
	if err != nil {
		if errors.Is(err, ErrHabitNotFound) {
			response.NotFound(c, err.Error())
			return
		}
		if errors.Is(err, ErrNotOwner) {
			response.Error(c, http.StatusForbidden, err.Error())
			return
		}
		response.InternalError(c)
		return
	}

	response.Success(c, habit)
}

func (h *Handler) Update(c *gin.Context) {
	habitID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "invalid habit id")
		return
	}

	var input UpdateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	userID, ok := middleware.GetUserID(c)
	if !ok {
		response.Unauthorized(c)
		return
	}

	habit, err := h.svc.Update(userID, habitID, input)
	if err != nil {
		if errors.Is(err, ErrHabitNotFound) {
			response.NotFound(c, err.Error())
			return
		}
		if errors.Is(err, ErrNotOwner) {
			response.Error(c, http.StatusForbidden, err.Error())
			return
		}
		response.InternalError(c)
		return
	}

	response.Success(c, habit)
}

func (h *Handler) Delete(c *gin.Context) {
	habitID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "invalid habit id")
		return
	}

	userID, ok := middleware.GetUserID(c)
	if !ok {
		response.Unauthorized(c)
		return
	}

	if err := h.svc.Delete(userID, habitID); err != nil {
		if errors.Is(err, ErrHabitNotFound) {
			response.NotFound(c, err.Error())
			return
		}
		if errors.Is(err, ErrNotOwner) {
			response.Error(c, http.StatusForbidden, err.Error())
			return
		}
		response.InternalError(c)
		return
	}

	response.Success(c, gin.H{"message": "habit deleted"})
}

func (h *Handler) LogCompletion(c *gin.Context) {
	habitID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "invalid habit id")
		return
	}

	// LogInput body is optional (notes field). Accept missing body (io.EOF),
	// but reject malformed JSON with a 400 so silent failures are avoided.
	var input LogInput
	if err := c.ShouldBindJSON(&input); err != nil && !errors.Is(err, io.EOF) {
		response.BadRequest(c, err.Error())
		return
	}

	userID, ok := middleware.GetUserID(c)
	if !ok {
		response.Unauthorized(c)
		return
	}

	log, err := h.svc.LogCompletion(userID, habitID, input)
	if err != nil {
		if errors.Is(err, ErrAlreadyLogged) {
			response.Error(c, http.StatusConflict, err.Error())
			return
		}
		if errors.Is(err, ErrHabitNotFound) {
			response.NotFound(c, err.Error())
			return
		}
		if errors.Is(err, ErrNotOwner) {
			response.Error(c, http.StatusForbidden, err.Error())
			return
		}
		response.InternalError(c)
		return
	}

	response.Created(c, log)
}
