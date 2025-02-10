#!/bin/bash

# Add this at the start of the script to ensure UTF-8
export LANG=en_US.UTF-8

# Check for correct number of arguments
if [ $# -ne 2 ]; then
    echo "Usage: $0 <number_of_values> <battery_type>"
    echo "Valid battery types: lipo, l91, alkaline, tad, lic, default"
    exit 1
fi

count=$1
battery_chemistry=$2

# Set voltage ranges based on battery type with all defined levels
case $battery_chemistry in
    "lipo")
        usb_voltage=4.6
        high_voltage=4.0
        normal_voltage=3.5
        low_voltage=3.2
        dead_voltage=0.0
        min_voltage=$low_voltage
        max_voltage=$usb_voltage
        ;;
    "l91")
        high_voltage=5.0
        normal_voltage=4.5
        low_voltage=0.0
        min_voltage=$normal_voltage
        max_voltage=$high_voltage
        ;;
    "alkaline")
        usb_voltage=4.6
        high_voltage=4.2
        normal_voltage=3.6
        low_voltage=0.0
        min_voltage=$normal_voltage
        max_voltage=$usb_voltage
        ;;
    "tad")
        usb_voltage=4.6
        normal_voltage=3.2
        low_voltage=0.0
        min_voltage=$normal_voltage
        max_voltage=$usb_voltage
        ;;
    "lic")
        usb_voltage=4.6
        high_voltage=3.8
        normal_voltage=3.1
        low_voltage=0.0
        min_voltage=$normal_voltage
        max_voltage=$usb_voltage
        ;;
    "default")
        normal_voltage=2.5
        dead_voltage=0.0
        min_voltage=$normal_voltage
        max_voltage=$normal_voltage
        ;;
    *)
        echo "Error: Invalid battery type '$battery_chemistry'"
        echo "Valid battery types: lipo, l91, alkaline, tad, lic, default"
        exit 1
        ;;
esac

echo "Using voltage range for $battery_chemistry: $min_voltage to $max_voltage"

for ((i=1; i<=$count; i++)); do
    # Generate random values with explicit srand() for each calculation
    milliamp_hours=$(awk -v min=1 -v max=100 'BEGIN{srand(); print min+rand()*(max-min)}' | xargs printf "%.2f")
    voltage=$(awk -v min="$min_voltage" -v max="$max_voltage" 'BEGIN{srand(); print min+rand()*(max-min)}' | xargs printf "%.2f")
    temperature=$(awk -v min=20 -v max=40 'BEGIN{srand(); print min+rand()*(max-min)}' | xargs printf "%.2f")
    
    timestamp=$(date +%s)
    
    # Send webhook
    curl -s -X POST http://localhost:8080/webhook \
        -H "Content-Type: application/json" \
        -d "{\"timestamp\":$timestamp,\"milliamp_hours\":$milliamp_hours,\"voltage\":$voltage,\"temperature\":$temperature,\"battery_chemistry\":\"$battery_chemistry\"}"
    
    echo " - Sent mAh: $milliamp_hours, Voltage: $voltage, Temp: $temperature$(echo -e '\xc2\xb0')C, Battery: $battery_chemistry at $(date '+%H:%M:%S')"
    
    sleep 1
done