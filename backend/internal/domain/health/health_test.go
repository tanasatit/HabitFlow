package health_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"

	"github.com/habitflow/api/pkg/response"
)

// buildHealthRouter returns a minimal Gin engine with only the health endpoint registered,
// mirroring how main.go registers it.
func buildHealthRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	v1 := r.Group("/api/v1")
	v1.GET("/health", func(c *gin.Context) {
		response.Success(c, gin.H{"status": "ok"})
	})
	return r
}

func TestHealth_ReturnsOK(t *testing.T) {
	r := buildHealthRouter()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/health", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)

	var body map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))

	// Response envelope is { "data": { "status": "ok" }, "message": "success" }
	data, ok := body["data"].(map[string]interface{})
	require.True(t, ok, "response must have a 'data' object")
	require.Equal(t, "ok", data["status"])
	require.Equal(t, "success", body["message"])
}

func TestHealth_MethodNotAllowed(t *testing.T) {
	r := buildHealthRouter()

	req := httptest.NewRequest(http.MethodPost, "/api/v1/health", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	// Gin returns 404 for unregistered routes by default (or 405 if using MethodNotAllowedHandler).
	// Both are acceptable as long as it is not 200.
	require.NotEqual(t, http.StatusOK, w.Code)
}
