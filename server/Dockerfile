# Start from golang base image
FROM golang:1.21-alpine AS builder

# Set working directory
WORKDIR /app

# Install necessary build tools
RUN apk add --no-cache gcc musl-dev

# Copy go mod and sum files
COPY go.mod go.sum ./

# Download all dependencies
RUN go mod download

# Copy the source code
COPY . .

# Build the application
RUN CGO_ENABLED=1 GOOS=linux go build -o main ./cmd/main.go

# Start a new stage from scratch
FROM alpine:latest

WORKDIR /app

# Copy the binary from builder
COPY --from=builder /app/main .

# Copy static files and templates
COPY static/ ./static/
COPY templates/ ./templates/
COPY ssl/ ./ssl/

# Install necessary runtime dependencies
RUN apk add --no-cache ca-certificates

# Expose port
EXPOSE 8080
EXPOSE 8443

# Set environment variable for development mode
ENV DEV_MODE=true

# Run the binary
CMD ["./main"]