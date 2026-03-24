package config

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port           string
	SupabaseDBURL  string
	JWTSecret      string
	JWTExpiryHours int
	GeminiAPIKey   string
	RedisURL       string
	FrontendURL    string
}

func Load() (*Config, error) {
	// Load .env file if present (ignored in production)
	_ = godotenv.Load()

	cfg := &Config{
		Port:           getEnv("PORT", "8080"),
		SupabaseDBURL:  os.Getenv("SUPABASE_DB_URL"),
		JWTSecret:      os.Getenv("JWT_SECRET"),
		JWTExpiryHours: getEnvInt("JWT_EXPIRY_HOURS", 24),
		GeminiAPIKey:   os.Getenv("GEMINI_API_KEY"),
		RedisURL:       getEnv("REDIS_URL", "redis://localhost:6379"),
		FrontendURL:    getEnv("FRONTEND_URL", "http://localhost:3000"),
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
