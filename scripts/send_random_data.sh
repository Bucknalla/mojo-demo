#!/bin/bash

if [ $# -ne 1 ]; then
    echo "Usage: $0 <number_of_values>"
    exit 1
fi

count=$1

for ((i=1; i<=$count; i++)); do
    # Generate random values
    milliamp_hours=$(awk -v min=1 -v max=100 'BEGIN{srand(); print min+rand()*(max-min)}' | xargs printf "%.2f")
    voltage=$(awk -v min=3.3 -v max=4.2 'BEGIN{srand(); print min+rand()*(max-min)}' | xargs printf "%.2f")
    temperature=$(awk -v min=20 -v max=40 'BEGIN{srand(); print min+rand()*(max-min)}' | xargs printf "%.2f")

    # Get current timestamp
    timestamp=$(date +%s)

    # Send webhook
    curl -s -X POST http://localhost:8080/webhook \
        -H "Content-Type: application/json" \
        -d "{\"timestamp\":$timestamp,\"milliamp_hours\":$milliamp_hours,\"voltage\":$voltage,\"temperature\":$temperature}"

    echo " - Sent mAh: $milliamp_hours, Voltage: $voltage, Temp: $temperature°C at $(date '+%H:%M:%S')"

    sleep 1
done