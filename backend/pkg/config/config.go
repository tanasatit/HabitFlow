package config

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port              string
	SupabaseDBURL     string
	JWTSecret         string
	JWTExpiryHours    int
	GeminiAPIKey      string
	GeminiModel       string
	OpenRouterAPIKey  string
	OpenRouterModel   string
	RedisURL          string
	FrontendURL       string
	GoogleClientID    string
	GoogleClientSecret string
	GoogleRedirectURL string
	BackendURL        string
}

func Load() (*Config, error) {
	// Load .env file if present (ignored in production)
	_ = godotenv.Load()

	cfg := &Config{
		Port:             getEnv("PORT", "8080"),
		SupabaseDBURL:    os.Getenv("SUPABASE_DB_URL"),
		JWTSecret:        os.Getenv("JWT_SECRET"),
		JWTExpiryHours:   getEnvInt("JWT_EXPIRY_HOURS", 24),
		GeminiAPIKey:     os.Getenv("GEMINI_API_KEY"),
		GeminiModel:      getEnv("GEMINI_MODEL", "gemini-1.5-pro"),
		OpenRouterAPIKey: os.Getenv("OPENROUTER_API_KEY"),
		OpenRouterModel:  getEnv("OPENROUTER_MODEL", "google/gemini-flash-1.5"),
		RedisURL:           getEnv("REDIS_URL", "redis://localhost:6379"),
		FrontendURL:        getEnv("FRONTEND_URL", "http://localhost:3000"),
		GoogleClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		GoogleClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		GoogleRedirectURL:  getEnv("GOOGLE_REDIRECT_URL", "http://localhost:8080/api/v1/google/callback"),
		BackendURL:         getEnv("BACKEND_URL", "http://localhost:8080"),
	}

	if err := cfg.validate(); err != nil {
		return nil, err
	}

	return cfg, nil
}

func (c *Config) validate() error {
	required := map[string]string{
		"SUPABASE_DB_URL": c.SupabaseDBURL,
		"JWT_SECRET":      c.JWTSecret,
	}
	for key, val := range required {
		if val == "" {
			return fmt.Errorf("missing required environment variable: %s", key)
		}
	}
	return nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		var n int
		if _, err := fmt.Sscanf(v, "%d", &n); err == nil {
			return n
		}
	}
	return fallback
}
