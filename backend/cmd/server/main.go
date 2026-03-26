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

	"github.com/habitflow/api/internal/domain/admin"
	"github.com/habitflow/api/internal/domain/dashboard"
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

	if err := database.AutoMigrate(db, &user.User{}, &user.Subscription{}, &habit.Habit{}, &habit.HabitLog{}); err != nil {
		log.Fatalf("migrate error: %v", err)
	}

	r := gin.Default()

	// CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{cfg.FrontendURL},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Wire dependencies
	userRepo := user.NewRepository(db)
	userSvc := user.NewService(userRepo, cfg)
	userHandler := user.NewHandler(userSvc, cfg)

	habitRepo := habit.NewRepository(db)
	habitSvc := habit.NewService(habitRepo, userRepo)
	habitHandler := habit.NewHandler(habitSvc)

	dashboardSvc := dashboard.NewService(habitSvc, habitRepo)
	dashboardHandler := dashboard.NewHandler(dashboardSvc)

	adminSvc := admin.NewService(userRepo, habitRepo, db)
	adminHandler := admin.NewHandler(adminSvc)

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
