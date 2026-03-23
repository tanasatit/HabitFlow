package config

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port         string
	SupabaseDBURL string
	JWTSecret    string
	GeminiAPIKey string
	RedisURL     string
}

func Load() (*Config, error) {
	// Load .env file if present (ignored in production)
	_ = godotenv.Load()

	cfg := &Config{
		Port:          getEnv("PORT", "8080"),
		SupabaseDBURL: os.Getenv("SUPABASE_DB_URL"),
		JWTSecret:     os.Getenv("JWT_SECRET"),
		GeminiAPIKey:  os.Getenv("GEMINI_API_KEY"),
		RedisURL:      getEnv("REDIS_URL", "redis://localhost:6379"),
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
