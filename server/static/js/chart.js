// Import battery configurations
import { batteryRanges } from './battery.js';

// Chart contexts and global variables
const mAhCtx = document.getElementById('mAhChart').getContext('2d');
const voltageCtx = document.getElementById('voltageChart').getContext('2d');
const temperatureCtx = document.getElementById('temperatureChart').getContext('2d');
const statusDiv = document.getElementById('status');
const usbAlertDiv = document.getElementById('usb-alert');

let mAhChart, voltageChart, temperatureChart;
let firstDataTime = null;
let ws = null;
let reconnectAttempt = 0;
const MAX_RECONNECT_DELAY = 5000; // Maximum reconnection delay of 5 seconds

// Add configuration object at the top
const config = {
    wsURL: window.location.protocol === 'https:' ?
        `wss://${window.location.host}/ws` :
        `ws://${window.location.host}/ws`,
    pingInterval: 30000, // Send ping every 30 seconds
    reconnectInterval: 1000 // Initial reconnection delay of 1 second
};

// Add at the top with other constants
const resetButton = document.getElementById('reset-data');

// Helper function to create chart configuration
function createChartConfig(label, color, unit = '', isMAhChart = false) {
    const options = createChartOptions(label);
    if (isMAhChart) {
        options.scales.y = createYScale(label, false); // Allow negative values for mAh chart
    }

    return {
        type: 'line',
        data: {
            datasets: [{
                label: `${label}${unit ? ` (${unit})` : ''}`,
                data: [],
                borderColor: color,
                backgroundColor: `${color}1a`,
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: color,
                pointBorderColor: color,
                ...(isMAhChart && {
                    segment: {
                        borderColor: ctx => getMAhSegmentColor(ctx, color),
                        backgroundColor: ctx => getMAhSegmentBgColor(ctx, color)
                    }
                })
            }]
        },
        options: options
    };
}

// Helper function for chart options
function createChartOptions(label) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
            padding: {
                bottom: 30
            }
        },
        scales: {
            x: createTimeScale(),
            y: createYScale(label)
        },
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    font: { family: 'Atkinson Hyperlegible' }
                }
            }
        },
        animation: { duration: 0 }
    };
}

// Helper function for time scale configuration
function createTimeScale() {
    return {
        type: 'time',
        time: {
            unit: 'second',
            displayFormats: { second: 'HH:mm:ss' }
        },
        grid: {
            color: 'rgba(0, 0, 0, 0.05)'
        },
        title: {
            display: true,
            text: 'Time',
            font: { family: 'Atkinson Hyperlegible' }
        },
        ticks: {
            maxTicksLimit: 10,
            autoSkip: true,
            font: { family: 'Atkinson Hyperlegible' }
        }
    };
}

// Helper function for Y scale configuration
function createYScale(label, beginAtZero = true) {
    return {
        beginAtZero: beginAtZero,
        grid: {
            color: 'rgba(0, 0, 0, 0.05)'
        },
        title: {
            display: true,
            text: label,
            font: { family: 'Atkinson Hyperlegible' }
        },
        ticks: {
            font: { family: 'Atkinson Hyperlegible' }
        }
    };
}

// Helper functions for mAh chart colors
function getMAhSegmentColor(ctx, defaultColor) {
    if (ctx.p0.parsed && ctx.p1.parsed) {
        return ctx.p0.parsed.y < ctx.p1.parsed.y ?
            '#ef4444' :  // Red for discharging (value increasing)
            '#10b981';   // Green for charging (value decreasing)
    }
    return defaultColor;
}

function getMAhSegmentBgColor(ctx, defaultColor) {
    if (ctx.p0.parsed && ctx.p1.parsed) {
        return ctx.p0.parsed.y < ctx.p1.parsed.y ?
            '#ef444419' :  // Red with opacity for discharging (value increasing)
            '#10b98119';   // Green with opacity for charging (value decreasing)
    }
    return `${defaultColor}1a`;
}

// WebSocket handlers
function setupWebSocket() {
    if (ws) {
        ws.close();
    }

    ws = new WebSocket(config.wsURL);
    let pingInterval;

    ws.onopen = () => {
        statusDiv.textContent = 'Connected to server';
        statusDiv.className = 'connected';
        reconnectAttempt = 0; // Reset reconnection attempts

        // Start sending pings
        pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, config.pingInterval);
    };

    ws.onmessage = handleWebSocketMessage;

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        statusDiv.textContent = 'Error connecting to server';
        statusDiv.className = 'error';
    };

    ws.onclose = () => {
        console.log('WebSocket connection closed');
        statusDiv.textContent = 'Disconnected from server - Reconnecting...';
        statusDiv.className = 'error';

        // Clear ping interval
        if (pingInterval) {
            clearInterval(pingInterval);
        }

        // Implement exponential backoff for reconnection
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempt), MAX_RECONNECT_DELAY);
        reconnectAttempt++;

        setTimeout(() => {
            setupWebSocket();
        }, delay);
    };
}

function handleWebSocketMessage(event) {
    const data = JSON.parse(event.data);

    // Check if it's a reset message
    if (data.type === 'reset') {
        mAhChart.data.datasets[0].data = [];
        voltageChart.data.datasets[0].data = [];
        temperatureChart.data.datasets[0].data = [];
        firstDataTime = null;
        updateCharts();
        usbAlertDiv.classList.add('hidden');  // Hide USB alert on reset
        return;
    }

    const timestamp = new Date(data.timestamp * 1000);

    if (!firstDataTime) firstDataTime = timestamp;

    updateVoltageChart(data, timestamp);
    updateOtherCharts(data, timestamp);
    removeOldDataPoints();
    updateUSBAlert(data.usb_alert);

    updateCharts();
    updateStatus(timestamp);
}

function updateVoltageChart(data, timestamp) {
    const batteryConfig = batteryRanges[data.battery_chemistry] || batteryRanges['default'];

    // Update colors and styling
    voltageChart.data.datasets[0].borderColor = batteryConfig.color;
    voltageChart.data.datasets[0].backgroundColor = `${batteryConfig.color}1a`;
    voltageChart.data.datasets[0].pointBackgroundColor = batteryConfig.color;
    voltageChart.data.datasets[0].pointBorderColor = batteryConfig.color;

    // Update label and axis
    voltageChart.data.datasets[0].label = `Voltage (V) - ${data.battery_chemistry.toUpperCase()}`;
    voltageChart.options.scales.y.min = 0;
    voltageChart.options.scales.y.max = Math.ceil(batteryConfig.max);

    // Add new data point
    voltageChart.data.datasets[0].data.push({
        x: timestamp,
        y: data.voltage
    });
}

function updateOtherCharts(data, timestamp) {
    mAhChart.data.datasets[0].data.push({
        x: timestamp,
        y: data.milliamp_hours
    });

    temperatureChart.data.datasets[0].data.push({
        x: timestamp,
        y: data.temperature
    });
}

function removeOldDataPoints() {
    // Remove data points keeping only the last 20 readings
    const maxReadings = 20;

    mAhChart.data.datasets[0].data = mAhChart.data.datasets[0].data.slice(-maxReadings);
    voltageChart.data.datasets[0].data = voltageChart.data.datasets[0].data.slice(-maxReadings);
    temperatureChart.data.datasets[0].data = temperatureChart.data.datasets[0].data.slice(-maxReadings);
}

function updateCharts() {
    mAhChart.update('none');
    voltageChart.update('none');
    temperatureChart.update('none');
}

function updateStatus(timestamp) {
    statusDiv.textContent = `Last update: ${timestamp.toLocaleTimeString()}`;
    statusDiv.className = 'connected';
}

// Initialize charts and add legends
function initializeCharts() {
    mAhChart = new Chart(mAhCtx, createChartConfig('Milliamp Hours', '#2c7be5', 'mAh', true));
    voltageChart = new Chart(voltageCtx, createChartConfig('Voltage', '#2c7be5', 'V'));
    temperatureChart = new Chart(temperatureCtx, createChartConfig('Temperature', '#fd7e14', '°C'));

    // Add mAh legend
    document.querySelector('#mAhChart').insertAdjacentHTML('afterend',
        createLegendHtml('mah', [
            { class: 'charging', label: 'Charging' },
            { class: 'discharging', label: 'Discharging' }
        ])
    );
}

document.addEventListener('DOMContentLoaded', () => {
    initializeCharts();
    setupWebSocket();

    // Add reset button handler
    if (resetButton) {
        resetButton.addEventListener('click', async () => {
            try {
                const response = await fetch('/api/reset', {
                    method: 'POST'
                });

                if (!response.ok) throw new Error('Failed to reset data');

                // Clear all chart data
                mAhChart.data.datasets[0].data = [];
                voltageChart.data.datasets[0].data = [];
                temperatureChart.data.datasets[0].data = [];

                // Reset first data time
                firstDataTime = null;

                // Update charts
                updateCharts();

                // Hide USB alert
                usbAlertDiv.classList.add('hidden');

                // Update status
                statusDiv.textContent = 'Data reset successfully';

            } catch (error) {
                console.error('Error resetting data:', error);
                statusDiv.textContent = 'Error resetting data';
                statusDiv.className = 'error';
            }
        });
    } else {
        console.error('Reset button not found in DOM');
    }
});

// Simplify the legend HTML creation
function createLegendHtml(type, items) {
    return `
        <div class="charging-legend">
            ${items.map(item => `
                <div class="legend-item">
                    <span class="color-box ${item.class}"></span>${item.label}
                </div>
            `).join('')}
        </div>
    `;
}

// Add new function to handle USB alert visibility
function updateUSBAlert(isUSBAlert) {
    if (isUSBAlert) {
        usbAlertDiv.classList.remove('hidden');
    } else {
        usbAlertDiv.classList.add('hidden');
    }
}
