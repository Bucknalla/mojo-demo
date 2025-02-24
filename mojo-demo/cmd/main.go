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

	// Add cache for last 20 readings
	dataCache   = make([]DataPoint, 0, 20)
	dataCacheMu sync.RWMutex
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

	// Add reset endpoint
	r.POST("/api/reset", func(c *gin.Context) {
		// Clear the data cache
		dataCacheMu.Lock()
		dataCache = make([]DataPoint, 0, 20) // Reset to empty cache with same capacity
		dataCacheMu.Unlock()

		// Clear all client data
		clientsMu.Lock()
		for client := range clients {
			client.WriteJSON(gin.H{"type": "reset"})
		}
		clientsMu.Unlock()

		c.JSON(http.StatusOK, gin.H{"status": "Data reset successfully"})
	})

	// Add development flag
	devMode := true // You might want to make this configurable

	if devMode {
		// Use HTTP for development
		log.Printf("Running in development mode on HTTP")
		log.Fatal(r.Run(":8080"))
	} else {
		// Use HTTPS for production
		certFile := "./ssl/cert.pem"
		keyFile := "./ssl/key.pem"

		if err := r.RunTLS(":8443", certFile, keyFile); err != nil {
			log.Printf("Failed to start HTTPS server: %v", err)
			log.Printf("Falling back to HTTP")
			log.Fatal(r.Run(":8080"))
		}
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

	// Send cached data to new client
	dataCacheMu.RLock()
	for _, data := range dataCache {
		if err := conn.WriteJSON(data); err != nil {
			log.Printf("Failed to send cached data: %v", err)
			break
		}
	}
	dataCacheMu.RUnlock()

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

	// Update cache
	dataCacheMu.Lock()
	dataCache = append(dataCache, data)
	if len(dataCache) > 20 {
		dataCache = dataCache[1:] // Remove oldest reading when we exceed 20
	}
	dataCacheMu.Unlock()

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
