package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"

	"github.com/habitflow/api/pkg/config"
	"github.com/habitflow/api/pkg/response"
)

const (
	ContextUserID   = "userID"
	ContextUserRole = "userRole"
)

// claims is a local struct so middleware does not import the user domain package.
type claims struct {
	UserID uuid.UUID `json:"user_id"`
	Role   string    `json:"role"`
	jwt.RegisteredClaims
}

func Auth(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenStr := ""

		// 1. httpOnly cookie first
		if cookie, err := c.Cookie("token"); err == nil {
			tokenStr = cookie
		}

		// 2. Fall back to Authorization: Bearer header
		if tokenStr == "" {
			header := c.GetHeader("Authorization")
			if strings.HasPrefix(header, "Bearer ") {
				tokenStr = strings.TrimPrefix(header, "Bearer ")
			}
		}

		if tokenStr == "" {
			response.Unauthorized(c)
			c.Abort()
			return
		}

		cl := &claims{}
		token, err := jwt.ParseWithClaims(tokenStr, cl, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(cfg.JWTSecret), nil
		})

		if err != nil || !token.Valid {
			response.Unauthorized(c)
			c.Abort()
			return
		}

		c.Set(ContextUserID, cl.UserID)
		c.Set(ContextUserRole, cl.Role)
		c.Next()
	}
}

// GetUserID extracts the authenticated user's ID from gin context.
func GetUserID(c *gin.Context) (uuid.UUID, bool) {
	val, exists := c.Get(ContextUserID)
	if !exists {
		return uuid.UUID{}, false
	}
	id, ok := val.(uuid.UUID)
	return id, ok
}

// GetUserRole extracts the authenticated user's role from gin context.
func GetUserRole(c *gin.Context) (string, bool) {
	val, exists := c.Get(ContextUserRole)
	if !exists {
		return "", false
	}
	role, ok := val.(string)
	return role, ok
}
