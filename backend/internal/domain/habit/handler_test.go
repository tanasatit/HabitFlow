package habit_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"

	"github.com/habitflow/api/internal/domain/habit"
	"github.com/habitflow/api/internal/domain/user"
	"github.com/habitflow/api/internal/middleware"
	"github.com/habitflow/api/internal/testutil"
	"github.com/habitflow/api/pkg/config"
)

const habitTestSecret = "test-secret"

// buildHabitRouter returns a fully wired Gin engine for habit routes.
func buildHabitRouter(t *testing.T, db *gorm.DB) *gin.Engine {
	t.Helper()
	gin.SetMode(gin.TestMode)

	cfg := &config.Config{
		JWTSecret:      habitTestSecret,
		JWTExpiryHours: 24,
	}

	repo := habit.NewRepository(db)
	svc := habit.NewService(repo)
	h := habit.NewHandler(svc)

	r := gin.New()
	v1 := r.Group("/api/v1")
	habits := v1.Group("/habits")
	habits.Use(middleware.Auth(cfg))
	{
		habits.GET("", h.List)
		habits.POST("", h.Create)
		habits.GET("/:id", h.GetByID)
		habits.PUT("/:id", h.Update)
		habits.DELETE("/:id", h.Delete)
		habits.POST("/:id/log", h.LogCompletion)
	}

	return r
}

// makeToken generates a signed JWT for the given userID using the test secret.
func makeToken(t *testing.T, userID uuid.UUID, role user.Role) string {
	t.Helper()
	type claims struct {
		UserID uuid.UUID `json:"user_id"`
		Role   string    `json:"role"`
		jwt.RegisteredClaims
	}
	cl := claims{
		UserID: userID,
		Role:   string(role),
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, cl)
	signed, err := tok.SignedString([]byte(habitTestSecret))
	require.NoError(t, err)
	return signed
}

func habitJSON(v interface{}) *bytes.Buffer {
	b, _ := json.Marshal(v)
	return bytes.NewBuffer(b)
}

// ---------------------------------------------------------------------------
// POST /api/v1/habits  (auth required)
// ---------------------------------------------------------------------------

func TestCreateHabit_Unauthorized(t *testing.T) {
	db := testutil.NewTestDB(t)
	r := buildHabitRouter(t, db)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/habits", habitJSON(map[string]string{"name": "Run"}))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestCreateHabit_HappyPath(t *testing.T) {
	db := testutil.NewTestDB(t)
	r := buildHabitRouter(t, db)

	userID := uuid.New()
	token := makeToken(t, userID, user.RoleFree)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/habits", habitJSON(map[string]string{"name": "Morning Run"}))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusCreated, w.Code)

	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	data := resp["data"].(map[string]interface{})
	require.Equal(t, "Morning Run", data["name"])

	// Returned habit must belong to the authenticated user.
	returnedUserID, ok := data["user_id"].(string)
	require.True(t, ok)
	require.Equal(t, userID.String(), returnedUserID)
}

// ---------------------------------------------------------------------------
// GET /api/v1/habits  (ownership isolation)
// ---------------------------------------------------------------------------

func TestListHabits_OwnershipIsolation(t *testing.T) {
	db := testutil.NewTestDB(t)
	r := buildHabitRouter(t, db)

	user1 := uuid.New()
	user2 := uuid.New()
	token1 := makeToken(t, user1, user.RoleFree)
	token2 := makeToken(t, user2, user.RoleFree)

	// Create a habit for user1.
	req1 := httptest.NewRequest(http.MethodPost, "/api/v1/habits", habitJSON(map[string]string{"name": "Habit A"}))
	req1.Header.Set("Content-Type", "application/json")
	req1.Header.Set("Authorization", "Bearer "+token1)
	w1 := httptest.NewRecorder()
	r.ServeHTTP(w1, req1)
	require.Equal(t, http.StatusCreated, w1.Code)

	// Create a habit for user2.
	req2 := httptest.NewRequest(http.MethodPost, "/api/v1/habits", habitJSON(map[string]string{"name": "Habit B"}))
	req2.Header.Set("Content-Type", "application/json")
	req2.Header.Set("Authorization", "Bearer "+token2)
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, req2)
	require.Equal(t, http.StatusCreated, w2.Code)

	// List for user1 should only return user1's habits.
	listReq := httptest.NewRequest(http.MethodGet, "/api/v1/habits", nil)
	listReq.Header.Set("Authorization", "Bearer "+token1)
	listW := httptest.NewRecorder()
	r.ServeHTTP(listW, listReq)
	require.Equal(t, http.StatusOK, listW.Code)

	var listResp map[string]interface{}
	require.NoError(t, json.Unmarshal(listW.Body.Bytes(), &listResp))
	habits := listResp["data"].([]interface{})
	require.Len(t, habits, 1)
	require.Equal(t, "Habit A", habits[0].(map[string]interface{})["name"])
}

// ---------------------------------------------------------------------------
// GET /api/v1/habits/:id
// ---------------------------------------------------------------------------

func TestGetHabit_RandomUUID_NotFound(t *testing.T) {
	db := testutil.NewTestDB(t)
	r := buildHabitRouter(t, db)

	userID := uuid.New()
	token := makeToken(t, userID, user.RoleFree)

	randomID := uuid.New()
	req := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/v1/habits/%s", randomID), nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusNotFound, w.Code)
}

func TestGetHabit_OtherUsersHabit_Forbidden(t *testing.T) {
	db := testutil.NewTestDB(t)
	r := buildHabitRouter(t, db)

	ownerID := uuid.New()
	otherID := uuid.New()
	tokenOther := makeToken(t, otherID, user.RoleFree)

	// Create a habit as owner.
	ownerToken := makeToken(t, ownerID, user.RoleFree)
	createReq := httptest.NewRequest(http.MethodPost, "/api/v1/habits", habitJSON(map[string]string{"name": "Private Habit"}))
	createReq.Header.Set("Content-Type", "application/json")
	createReq.Header.Set("Authorization", "Bearer "+ownerToken)
	createW := httptest.NewRecorder()
	r.ServeHTTP(createW, createReq)
	require.Equal(t, http.StatusCreated, createW.Code)

	var createResp map[string]interface{}
	require.NoError(t, json.Unmarshal(createW.Body.Bytes(), &createResp))
	habitID := createResp["data"].(map[string]interface{})["id"].(string)

	// Try to get it as a different user.
	req := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/v1/habits/%s", habitID), nil)
	req.Header.Set("Authorization", "Bearer "+tokenOther)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	// Service returns ErrNotOwner which handler maps to 403 (Forbidden).
	require.Equal(t, http.StatusForbidden, w.Code)
}

func TestGetHabit_InvalidUUID(t *testing.T) {
	db := testutil.NewTestDB(t)
	r := buildHabitRouter(t, db)

	userID := uuid.New()
	token := makeToken(t, userID, user.RoleFree)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/habits/not-a-uuid", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusBadRequest, w.Code)
}

// ---------------------------------------------------------------------------
// PUT /api/v1/habits/:id
// ---------------------------------------------------------------------------

func TestUpdateHabit(t *testing.T) {
	db := testutil.NewTestDB(t)
	r := buildHabitRouter(t, db)

	userID := uuid.New()
	token := makeToken(t, userID, user.RoleFree)

	// Create.
	createReq := httptest.NewRequest(http.MethodPost, "/api/v1/habits", habitJSON(map[string]string{"name": "Walk"}))
	createReq.Header.Set("Content-Type", "application/json")
	createReq.Header.Set("Authorization", "Bearer "+token)
	createW := httptest.NewRecorder()
	r.ServeHTTP(createW, createReq)
	require.Equal(t, http.StatusCreated, createW.Code)

	var createResp map[string]interface{}
	require.NoError(t, json.Unmarshal(createW.Body.Bytes(), &createResp))
	habitID := createResp["data"].(map[string]interface{})["id"].(string)

	// Update name.
	updateReq := httptest.NewRequest(http.MethodPut, "/api/v1/habits/"+habitID,
		habitJSON(map[string]string{"name": "Sprint"}))
	updateReq.Header.Set("Content-Type", "application/json")
	updateReq.Header.Set("Authorization", "Bearer "+token)
	updateW := httptest.NewRecorder()
	r.ServeHTTP(updateW, updateReq)

	require.Equal(t, http.StatusOK, updateW.Code)

	var updateResp map[string]interface{}
	require.NoError(t, json.Unmarshal(updateW.Body.Bytes(), &updateResp))
	require.Equal(t, "Sprint", updateResp["data"].(map[string]interface{})["name"])
}

// ---------------------------------------------------------------------------
// DELETE /api/v1/habits/:id
// ---------------------------------------------------------------------------

func TestDeleteHabit(t *testing.T) {
	db := testutil.NewTestDB(t)
	r := buildHabitRouter(t, db)

	userID := uuid.New()
	token := makeToken(t, userID, user.RoleFree)

	// Create.
	createReq := httptest.NewRequest(http.MethodPost, "/api/v1/habits", habitJSON(map[string]string{"name": "Swim"}))
	createReq.Header.Set("Content-Type", "application/json")
	createReq.Header.Set("Authorization", "Bearer "+token)
	createW := httptest.NewRecorder()
	r.ServeHTTP(createW, createReq)
	require.Equal(t, http.StatusCreated, createW.Code)

	var createResp map[string]interface{}
	require.NoError(t, json.Unmarshal(createW.Body.Bytes(), &createResp))
	habitID := createResp["data"].(map[string]interface{})["id"].(string)

	// Delete.
	delReq := httptest.NewRequest(http.MethodDelete, "/api/v1/habits/"+habitID, nil)
	delReq.Header.Set("Authorization", "Bearer "+token)
	delW := httptest.NewRecorder()
	r.ServeHTTP(delW, delReq)
	require.Equal(t, http.StatusOK, delW.Code)

	// Now fetching it should return 404.
	getReq := httptest.NewRequest(http.MethodGet, "/api/v1/habits/"+habitID, nil)
	getReq.Header.Set("Authorization", "Bearer "+token)
	getW := httptest.NewRecorder()
	r.ServeHTTP(getW, getReq)
	require.Equal(t, http.StatusNotFound, getW.Code)
}

// ---------------------------------------------------------------------------
// POST /api/v1/habits/:id/log
// ---------------------------------------------------------------------------

func TestLogCompletion_HappyPath(t *testing.T) {
	db := testutil.NewTestDB(t)
	r := buildHabitRouter(t, db)

	userID := uuid.New()
	token := makeToken(t, userID, user.RoleFree)

	// Create habit.
	createReq := httptest.NewRequest(http.MethodPost, "/api/v1/habits", habitJSON(map[string]string{"name": "Yoga"}))
	createReq.Header.Set("Content-Type", "application/json")
	createReq.Header.Set("Authorization", "Bearer "+token)
	createW := httptest.NewRecorder()
	r.ServeHTTP(createW, createReq)
	require.Equal(t, http.StatusCreated, createW.Code)

	var createResp map[string]interface{}
	require.NoError(t, json.Unmarshal(createW.Body.Bytes(), &createResp))
	habitID := createResp["data"].(map[string]interface{})["id"].(string)

	// First log.
	logReq := httptest.NewRequest(http.MethodPost, "/api/v1/habits/"+habitID+"/log", nil)
	logReq.Header.Set("Authorization", "Bearer "+token)
	logW := httptest.NewRecorder()
	r.ServeHTTP(logW, logReq)
	require.Equal(t, http.StatusCreated, logW.Code)
}

func TestLogCompletion_DuplicateSameDay_Conflict(t *testing.T) {
	db := testutil.NewTestDB(t)
	r := buildHabitRouter(t, db)

	userID := uuid.New()
	token := makeToken(t, userID, user.RoleFree)

	// Create habit.
	createReq := httptest.NewRequest(http.MethodPost, "/api/v1/habits", habitJSON(map[string]string{"name": "Read"}))
	createReq.Header.Set("Content-Type", "application/json")
	createReq.Header.Set("Authorization", "Bearer "+token)
	createW := httptest.NewRecorder()
	r.ServeHTTP(createW, createReq)
	require.Equal(t, http.StatusCreated, createW.Code)

	var createResp map[string]interface{}
	require.NoError(t, json.Unmarshal(createW.Body.Bytes(), &createResp))
	habitID := createResp["data"].(map[string]interface{})["id"].(string)

	// First log — should succeed.
	logReq1 := httptest.NewRequest(http.MethodPost, "/api/v1/habits/"+habitID+"/log", nil)
	logReq1.Header.Set("Authorization", "Bearer "+token)
	logW1 := httptest.NewRecorder()
	r.ServeHTTP(logW1, logReq1)
	require.Equal(t, http.StatusCreated, logW1.Code)

	// Second log same day — should return 409.
	logReq2 := httptest.NewRequest(http.MethodPost, "/api/v1/habits/"+habitID+"/log", nil)
	logReq2.Header.Set("Authorization", "Bearer "+token)
	logW2 := httptest.NewRecorder()
	r.ServeHTTP(logW2, logReq2)
	require.Equal(t, http.StatusConflict, logW2.Code)
}
