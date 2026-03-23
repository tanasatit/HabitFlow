package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type APIResponse[T any] struct {
	Data    T      `json:"data,omitempty"`
	Error   string `json:"error,omitempty"`
	Message string `json:"message,omitempty"`
}

type PaginatedResponse[T any] struct {
	Data    []T   `json:"data"`
	Total   int64 `json:"total"`
	Page    int   `json:"page"`
	Limit   int   `json:"limit"`
	Message string `json:"message,omitempty"`
}

func Success[T any](c *gin.Context, data T) {
	c.JSON(http.StatusOK, APIResponse[T]{
		Data:    data,
		Message: "success",
	})
}

func Created[T any](c *gin.Context, data T) {
	c.JSON(http.StatusCreated, APIResponse[T]{
		Data:    data,
		Message: "success",
	})
}

func Error(c *gin.Context, statusCode int, message string) {
	c.JSON(statusCode, APIResponse[any]{
		Error: message,
	})
}

func BadRequest(c *gin.Context, message string) {
	Error(c, http.StatusBadRequest, message)
}

func Unauthorized(c *gin.Context) {
	Error(c, http.StatusUnauthorized, "unauthorized")
}

func Forbidden(c *gin.Context) {
	Error(c, http.StatusForbidden, "forbidden")
}

func NotFound(c *gin.Context, message string) {
	Error(c, http.StatusNotFound, message)
}

func InternalError(c *gin.Context) {
	Error(c, http.StatusInternalServerError, "internal server error")
}

func Paginated[T any](c *gin.Context, data []T, total int64, page, limit int) {
	c.JSON(http.StatusOK, PaginatedResponse[T]{
		Data:    data,
		Total:   total,
		Page:    page,
		Limit:   limit,
		Message: "success",
	})
}
