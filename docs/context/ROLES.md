# ROLES.md — Roles & Permissions

---

## Roles Overview

| Role | Value in DB | Who |
|---|---|---|
| Free User | `"free"` | Default on register |
| Premium User | `"premium"` | Upgraded by admin |
| Admin | `"admin"` | Set manually in DB |

> Note: `role` and `subscription_tier` are separate fields on the User model. Admin is a role. Free/Premium is a subscription tier. An admin always has premium access.

---

## Permissions Matrix

| Feature | Free | Premium | Admin |
|---|---|---|---|
| Register / Login | ✅ | ✅ | ✅ |
| Create habits (max 3) | ✅ | ✅ | ✅ |
| Create habits (unlimited) | ❌ | ✅ | ✅ |
| Log habit completion | ✅ | ✅ | ✅ |
| View own streak | ✅ | ✅ | ✅ |
| Basic dashboard | ✅ | ✅ | ✅ |
| Full analytics dashboard | ❌ | ✅ | ✅ |
| AI Coach chat | ❌ | ✅ | ✅ |
| AI-generated habit plan | ❌ | ✅ | ✅ |
| In-app calendar | ❌ | ✅ | ✅ |
| Google Calendar sync (MCP) | ❌ | ✅ | ✅ |
| Leaderboard access | ❌ | ✅ | ✅ |
| Daily AI tip | ❌ | ✅ | ✅ |
| View all users | ❌ | ❌ | ✅ |
| Change user subscription | ❌ | ❌ | ✅ |
| Delete user accounts | ❌ | ❌ | ✅ |
| Manage habit categories | ❌ | ❌ | ✅ |
| View platform analytics | ❌ | ❌ | ✅ |

---

## How RBAC Works in Go

### Step 1 — JWT Middleware (runs on every protected route)
```go
// Validates token, extracts userID, role, subscriptionTier
// Stores in Gin context for downstream use
func AuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        token := extractToken(c)
        claims, err := validateJWT(token)
        if err != nil {
            c.AbortWithStatusJSON(401, gin.H{"error": "unauthorized"})
            return
        }
        c.Set("userID", claims.UserID)
        c.Set("role", claims.Role)
        c.Set("subscriptionTier", claims.SubscriptionTier)
        c.Next()
    }
}
```

### Step 2 — RBAC Middleware (applied per route group)
```go
func RequireRole(role string) gin.HandlerFunc {
    return func(c *gin.Context) {
        if c.GetString("role") != role {
            c.AbortWithStatusJSON(403, gin.H{"error": "forbidden"})
            return
        }
        c.Next()
    }
}

func RequirePremium() gin.HandlerFunc {
    return func(c *gin.Context) {
        tier := c.GetString("subscriptionTier")
        role := c.GetString("role")
        if tier != "premium" && role != "admin" {
            c.AbortWithStatusJSON(403, gin.H{"error": "premium subscription required"})
            return
        }
        c.Next()
    }
}
```

### Step 3 — Route Registration
```go
// Public routes
r.POST("/api/v1/auth/register", authHandler.Register)
r.POST("/api/v1/auth/login", authHandler.Login)

// All logged-in users
auth := r.Group("/api/v1").Use(AuthMiddleware())
auth.GET("/habits", habitHandler.List)
auth.POST("/habits", habitHandler.Create)        // service checks free tier limit
auth.PUT("/habits/:id", habitHandler.Update)
auth.DELETE("/habits/:id", habitHandler.Delete)

// Premium only
premium := r.Group("/api/v1").Use(AuthMiddleware(), RequirePremium())
premium.POST("/ai/chat", aiHandler.Chat)
premium.GET("/calendar", calendarHandler.Get)
premium.GET("/leaderboard", leaderboardHandler.Get)

// Admin only
admin := r.Group("/api/v1/admin").Use(AuthMiddleware(), RequireRole("admin"))
admin.GET("/users", adminHandler.ListUsers)
admin.PUT("/users/:id", adminHandler.UpdateUser)
admin.DELETE("/users/:id", adminHandler.DeleteUser)
admin.GET("/analytics", adminHandler.Analytics)
```

---

## How Route Guards Work in Angular

```typescript
// app.routes.ts
export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login.component') },
  {
    path: 'habits',
    loadComponent: () => import('./features/habits/habits.component'),
    canActivate: [authGuard]          // must be logged in
  },
  {
    path: 'ai-coach',
    loadComponent: () => import('./features/ai-coach/ai-coach.component'),
    canActivate: [authGuard, premiumGuard]   // must be premium
  },
  {
    path: 'admin',
    loadComponent: () => import('./features/admin/admin.component'),
    canActivate: [authGuard, adminGuard]     // must be admin
  },
];
```

---

## JWT Token Payload

```json
{
  "sub": "uuid-of-user",
  "email": "user@example.com",
  "role": "premium",
  "subscriptionTier": "premium",
  "exp": 1234567890,
  "iat": 1234567890
}
```

> Token expiry: 24 hours. Always re-check role server-side — never trust token alone for sensitive operations.