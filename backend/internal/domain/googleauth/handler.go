package googleauth

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/habitflow/api/pkg/config"
)

type Handler struct {
	svc *Service
	cfg *config.Config
}

func NewHandler(svc *Service, cfg *config.Config) *Handler {
	return &Handler{svc: svc, cfg: cfg}
}

// InitiateAuth handles GET /auth/google.
// Generates a CSRF state token and redirects the user to Google's consent screen.
func (h *Handler) InitiateAuth(c *gin.Context) {
	state := h.svc.GenerateState()
	c.Redirect(http.StatusFound, h.svc.GetAuthURL(state))
}

// Callback handles GET /auth/google/callback.
// Validates the state token, exchanges the code for a token, fetches user info,
// upserts the user, issues a JWT cookie, and redirects to the frontend dashboard.
func (h *Handler) Callback(c *gin.Context) {
	frontendURL := h.svc.GetFrontendURL()

	// 1. Validate CSRF state
	state := c.Query("state")
	if !h.svc.ValidateState(state) {
		c.Redirect(http.StatusFound, frontendURL+"/login?error=invalid_state")
		return
	}

	// 2. Exchange authorization code for token
	code := c.Query("code")
	token, err := h.svc.ExchangeCode(c.Request.Context(), code)
	if err != nil {
		c.Redirect(http.StatusFound, frontendURL+"/login?error=google_auth_failed")
		return
	}

	// 3. Fetch Google user profile
	info, err := h.svc.FetchUserInfo(c.Request.Context(), token)
	if err != nil {
		c.Redirect(http.StatusFound, frontendURL+"/login?error=google_auth_failed")
		return
	}

	// 4. Upsert user (find existing, link, or create)
	u, err := h.svc.UpsertUser(c.Request.Context(), info)
	if err != nil {
		c.Redirect(http.StatusFound, frontendURL+"/login?error=server_error")
		return
	}

	// 5. Generate JWT
	jwtToken, err := h.svc.GenerateTokenForUser(u)
	if err != nil {
		c.Redirect(http.StatusFound, frontendURL+"/login?error=server_error")
		return
	}

	// 6. Set JWT cookie (same format as local login)
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("token", jwtToken, h.cfg.JWTExpiryHours*3600, "/", "", false, true)

	// 7. Redirect to dashboard
	c.Redirect(http.StatusFound, frontendURL+"/dashboard")
}
