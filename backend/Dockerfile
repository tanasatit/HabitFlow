# ========================
# Stage 1: Build
# ========================
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Install dependencies
RUN apk add --no-cache git

# Copy go module files first for layer caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source
COPY . .

# Build binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o bin/server ./cmd/server

# ========================
# Stage 2: Runtime
# ========================
FROM alpine:3.19

WORKDIR /app

# Install CA certs for HTTPS (Supabase, Gemini)
RUN apk add --no-cache ca-certificates tzdata

# Copy only the binary
COPY --from=builder /app/bin/server .

EXPOSE 8080

CMD ["./server"]
