package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	internalai "github.com/habitflow/api/internal/ai"
	"github.com/habitflow/api/internal/domain/admin"
	"github.com/habitflow/api/internal/domain/aicoach"
	"github.com/habitflow/api/internal/domain/calendar"
	"github.com/habitflow/api/internal/domain/dashboard"
	"github.com/habitflow/api/internal/domain/googlecal"
	"github.com/habitflow/api/internal/domain/habit"
	"github.com/habitflow/api/internal/domain/user"
	"github.com/habitflow/api/internal/middleware"
	"github.com/habitflow/api/pkg/config"
	"github.com/habitflow/api/pkg/database"
	"github.com/habitflow/api/pkg/response"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config error: %v", err)
	}

	db, err := database.Connect(cfg.SupabaseDBURL)
	if err != nil {
		log.Fatalf("database error: %v", err)
	}

	if err := database.AutoMigrate(db, &user.User{}, &user.Subscription{}, &habit.Habit{}, &habit.HabitLog{}, &calendar.CalendarEvent{}, &aicoach.AIConversation{}, &googlecal.GoogleToken{}); err != nil {
		log.Fatalf("migrate error: %v", err)
	}

	if err := seedAdminUser(db); err != nil {
		log.Fatalf("seed admin error: %v", err)
	}

	r := gin.Default()

	// CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{cfg.FrontendURL},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Wire dependencies
	userRepo := user.NewRepository(db)
	userSvc := user.NewService(userRepo, cfg)
	userHandler := user.NewHandler(userSvc, cfg)

	habitRepo := habit.NewRepository(db)
	habitSvc := habit.NewService(habitRepo)
	habitHandler := habit.NewHandler(habitSvc)

	dashboardSvc := dashboard.NewService(habitSvc, habitRepo)
	dashboardHandler := dashboard.NewHandler(dashboardSvc)

	adminSvc := admin.NewService(userRepo, habitRepo, db)
	adminHandler := admin.NewHandler(adminSvc)

	if cfg.GeminiAPIKey == "" && cfg.OpenRouterAPIKey == "" {
		log.Println("WARNING: GEMINI_API_KEY and OPENROUTER_API_KEY are both unset — AI chat will return errors at runtime")
	}

	calendarRepo := calendar.NewRepository(db)
	calendarSvc := calendar.NewService(calendarRepo)
	calendarHandler := calendar.NewHandler(calendarSvc)

	googleCalRepo := googlecal.NewRepository(db)
	googleCalSvc := googlecal.NewService(googleCalRepo, cfg)
	googleCalHandler := googlecal.NewHandler(googleCalSvc)
	calendarSvc.SetGoogleCalService(googleCalSvc)

	aiClient := internalai.NewClient(cfg.GeminiAPIKey, cfg.GeminiModel, cfg.OpenRouterAPIKey, cfg.OpenRouterModel)
	aiCoachRepo := aicoach.NewRepository(db)
	aiCoachSvc := aicoach.NewService(aiClient, habitSvc, habitRepo, calendarSvc, dashboardSvc, aiCoachRepo, googleCalSvc)
	aiCoachHandler := aicoach.NewHandler(aiCoachSvc)

	v1 := r.Group("/api/v1")
	{
		v1.GET("/health", func(c *gin.Context) {
			response.Success(c, gin.H{"status": "ok"})
		})

		auth := v1.Group("/auth")
		{
			auth.POST("/register", userHandler.Register)
			auth.POST("/login", userHandler.Login)
			auth.POST("/logout", userHandler.Logout)
			auth.GET("/me", middleware.Auth(cfg), userHandler.Me)
		}

		// Dashboard route — requires auth
		v1.GET("/dashboard", middleware.Auth(cfg), dashboardHandler.GetDashboard)

		// Habit routes — all require auth
		habits := v1.Group("/habits")
		habits.Use(middleware.Auth(cfg))
		{
			habits.GET("", habitHandler.List)
			habits.POST("", habitHandler.Create)
			habits.GET("/:id", habitHandler.GetByID)
			habits.PUT("/:id", habitHandler.Update)
			habits.DELETE("/:id", habitHandler.Delete)
			habits.POST("/:id/log", habitHandler.LogCompletion)
			habits.GET("/:id/stats", habitHandler.GetStats)
		}

		// Admin routes — requires auth + admin role
		adminRoutes := v1.Group("/admin")
		adminRoutes.Use(middleware.Auth(cfg), middleware.RequireRole("admin"))
		{
			adminRoutes.GET("/users", adminHandler.ListUsers)
			adminRoutes.GET("/users/:id", adminHandler.GetUser)
			adminRoutes.PUT("/users/:id", adminHandler.UpdateUser)
			adminRoutes.DELETE("/users/:id", adminHandler.DeleteUser)
			adminRoutes.GET("/analytics", adminHandler.Analytics)
		}

		// Public OAuth callbacks — no auth middleware required.
		// Google redirects here without any JWT, so this must be outside the premium group.
		oauthCallbacks := v1.Group("")
		{
			oauthCallbacks.GET("/google/callback", googleCalHandler.Callback)
		}

		// Premium routes — requires auth + premium subscription
		premium := v1.Group("")
		premium.Use(middleware.Auth(cfg), middleware.RequirePremium())
		{
			premium.POST("/ai/chat", aiCoachHandler.Chat)
			premium.GET("/calendar", calendarHandler.GetEvents)
			premium.POST("/calendar", calendarHandler.CreateEvent)
			premium.PATCH("/calendar/:id", calendarHandler.UpdateEvent)
			premium.DELETE("/calendar/:id", calendarHandler.DeleteEvent)
			premium.GET("/google/auth", googleCalHandler.InitiateAuth)
			premium.GET("/google/status", googleCalHandler.Status)
			premium.DELETE("/google/disconnect", googleCalHandler.Disconnect)
			premium.GET("/google/events", googleCalHandler.ReadEvents)
			premium.POST("/google/events", googleCalHandler.WriteEvents)
		}
	}

	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: r,
	}

	go func() {
		log.Printf("Server starting on port %s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("forced shutdown: %v", err)
	}
	log.Println("Server stopped")
}

func seedAdminUser(db *gorm.DB) error {
	email := os.Getenv("ADMIN_EMAIL")
	password := os.Getenv("ADMIN_PASSWORD")
	if email == "" || password == "" {
		log.Println("ADMIN_EMAIL or ADMIN_PASSWORD not set — skipping admin seed")
		return nil
	}

	var existing user.User
	if err := db.Where("email = ?", email).First(&existing).Error; err == nil {
		return nil // already exists
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	admin := &user.User{
		ID:           uuid.New(),
		Email:        email,
		PasswordHash: string(hash),
		Name:         "Admin",
		Role:         user.RoleAdmin,
	}
	return db.Create(admin).Error
}
