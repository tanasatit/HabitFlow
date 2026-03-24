package middleware

import (
	"github.com/gin-gonic/gin"

	"github.com/habitflow/api/pkg/response"
)

// RequirePremium allows access only to users with role "premium" or "admin".
// Must be used after the Auth middleware so the role is already set in context.
func RequirePremium() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, ok := GetUserRole(c)
		if !ok {
			response.Unauthorized(c)
			c.Abort()
			return
		}
		if role == "premium" || role == "admin" {
			c.Next()
			return
		}
		response.Error(c, 403, "premium subscription required")
		c.Abort()
	}
}

// RequireRole allows access only to users whose role exactly matches the given role string.
// Must be used after the Auth middleware so the role is already set in context.
func RequireRole(role string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, ok := GetUserRole(c)
		if !ok {
			response.Unauthorized(c)
			c.Abort()
			return
		}
		if userRole == role {
			c.Next()
			return
		}
		response.Forbidden(c)
		c.Abort()
	}
}
