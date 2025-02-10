# Build stage
FROM balenalib/aarch64-alpine-golang:1.20-build AS builder

# Set working directory
WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN go build -o server cmd/main.go

# Run stage
FROM balenalib/aarch64-alpine-golang:1.20-run

# Set working directory
WORKDIR /app

# Copy the binary from builder
COPY --from=builder /app/server .

# Copy static files and templates
COPY --from=builder /app/static ./static
COPY --from=builder /app/templates ./templates
COPY --from=builder /app/scripts ./scripts

# Expose port
EXPOSE 8080

# Run the application
CMD ["./server"]