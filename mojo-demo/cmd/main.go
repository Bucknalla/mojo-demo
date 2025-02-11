package main

import (
	"log"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

type DataPoint struct {
	Timestamp        int64   `json:"timestamp"`
	MilliampHours    float64 `json:"milliamp_hours"`
	Voltage          float64 `json:"voltage"`
	Temperature      float64 `json:"temperature"`
	BatteryChemistry string  `json:"battery_chemistry"`
	USBAlert         bool    `json:"usb_alert"`
}

var (
	upgrader = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true // Allow all origins for demo
		},
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
	}
	clients   = make(map[*websocket.Conn]bool)
	clientsMu sync.Mutex
)

func main() {
	r := gin.Default()

	// Serve static files and templates
	r.Static("/static", "./static")
	r.LoadHTMLGlob("templates/*")

	// Routes
	r.GET("/", func(c *gin.Context) {
		c.HTML(http.StatusOK, "index.html", nil)
	})

	r.GET("/ws", handleWebSocket)
	r.POST("/webhook", handleWebhook)

	// Check for SSL cert and key
	certFile := "../ssl/cert.pem" // Update path as needed
	keyFile := "../ssl/key.pem"   // Update path as needed

	// Try to start with HTTPS
	if err := r.RunTLS(":8443", certFile, keyFile); err != nil {
		log.Printf("Failed to start HTTPS server: %v", err)
		log.Printf("Falling back to HTTP")
		// Fall back to HTTP if SSL fails
		log.Fatal(r.Run(":8080"))
	}
}

func handleWebSocket(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Failed to upgrade connection: %v", err)
		return
	}
	defer conn.Close()

	clientsMu.Lock()
	clients[conn] = true
	clientsMu.Unlock()

	// Keep connection alive and handle disconnection
	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			clientsMu.Lock()
			delete(clients, conn)
			clientsMu.Unlock()
			break
		}
	}
}

func handleWebhook(c *gin.Context) {
	var data DataPoint
	if err := c.BindJSON(&data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Broadcast new data to all connected clients
	clientsMu.Lock()
	for client := range clients {
		err := client.WriteJSON(data)
		if err != nil {
			log.Printf("Failed to send to client: %v", err)
			client.Close()
			delete(clients, client)
		}
	}
	clientsMu.Unlock()

	c.JSON(http.StatusOK, gin.H{"status": "received"})
}
