package user

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/habitflow/api/pkg/config"
	"github.com/habitflow/api/pkg/response"
)

type Handler struct {
	svc *Service
	cfg *config.Config
}

func NewHandler(svc *Service, cfg *config.Config) *Handler {
	return &Handler{svc: svc, cfg: cfg}
}

func (h *Handler) Register(c *gin.Context) {
	var input RegisterInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	u, token, err := h.svc.Register(input)
	if err != nil {
		if errors.Is(err, ErrEmailTaken) {
			response.Error(c, http.StatusConflict, err.Error())
			return
		}
		response.InternalError(c)
		return
	}

	h.setTokenCookie(c, token)
	response.Created(c, u)
}

func (h *Handler) Login(c *gin.Context) {
	var input LoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	u, token, err := h.svc.Login(input)
	if err != nil {
		if errors.Is(err, ErrInvalidCreds) {
			response.Error(c, http.StatusUnauthorized, err.Error())
			return
		}
		response.InternalError(c)
		return
	}

	h.setTokenCookie(c, token)
	response.Success(c, u)
}

func (h *Handler) Logout(c *gin.Context) {
	c.SetCookie("token", "", -1, "/", "", false, true)
	response.Success(c, gin.H{"message": "logged out"})
}

func (h *Handler) Me(c *gin.Context) {
	val, exists := c.Get("userID")
	if !exists {
		response.Unauthorized(c)
		return
	}
	userID, ok := val.(uuid.UUID)
	if !ok {
		response.Unauthorized(c)
		return
	}

	u, err := h.svc.GetByID(userID)
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

func (h *Handler) setTokenCookie(c *gin.Context, token string) {
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("token", token, h.cfg.JWTExpiryHours*3600, "/", "", false, true)
}
