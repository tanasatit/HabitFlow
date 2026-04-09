package googlecal

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/habitflow/api/internal/middleware"
	"github.com/habitflow/api/pkg/response"
)

type Handler struct{ svc *Service }

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

func (h *Handler) InitiateAuth(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		response.Unauthorized(c)
		return
	}
	state := h.svc.GenerateState(userID)
	authURL := h.svc.GetAuthURL(state)
	c.Redirect(http.StatusFound, authURL)
}

func (h *Handler) Callback(c *gin.Context) {
	// Google may return ?error=access_denied etc.
	if errParam := c.Query("error"); errParam != "" {
		response.Error(c, http.StatusBadRequest, "Google OAuth denied: "+errParam)
		return
	}
	code := c.Query("code")
	state := c.Query("state")
	if code == "" || state == "" {
		response.BadRequest(c, "missing code or state")
		return
	}
	// Validate state and extract userID — no JWT needed on callback.
	userID, valid := h.svc.ValidateStateAndGetUser(state)
	if !valid {
		response.Error(c, http.StatusBadRequest, "invalid or expired state")
		return
	}
	token, err := h.svc.ExchangeCode(c.Request.Context(), code)
	if err != nil {
		response.Error(c, http.StatusBadGateway, "OAuth exchange failed")
		return
	}
	if err := h.svc.SaveToken(c.Request.Context(), userID, token); err != nil {
		response.InternalError(c)
		return
	}
	c.Redirect(http.StatusFound, h.svc.GetFrontendURL()+"/settings?google=connected")
}

func (h *Handler) Status(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		response.Unauthorized(c)
		return
	}
	status, err := h.svc.GetStatus(userID)
	if err != nil {
		response.InternalError(c)
		return
	}
	response.Success(c, status)
}

func (h *Handler) Disconnect(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		response.Unauthorized(c)
		return
	}
	if err := h.svc.Disconnect(c.Request.Context(), userID); err != nil {
		response.InternalError(c)
		return
	}
	response.Success(c, gin.H{"message": "Google Calendar disconnected"})
}

func (h *Handler) ReadEvents(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		response.Unauthorized(c)
		return
	}
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	if startDate == "" || endDate == "" {
		response.BadRequest(c, "start_date and end_date are required")
		return
	}
	events, err := h.svc.ReadEvents(c.Request.Context(), userID, startDate, endDate)
	if err != nil {
		response.Error(c, http.StatusBadGateway, err.Error())
		return
	}
	response.Success(c, events)
}

func (h *Handler) WriteEvents(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		response.Unauthorized(c)
		return
	}
	var req WriteEventsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	events, err := h.svc.WriteEvents(c.Request.Context(), userID, req.Events)
	if err != nil {
		response.Error(c, http.StatusBadGateway, err.Error())
		return
	}
	response.Created(c, events)
}
