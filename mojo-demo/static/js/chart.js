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

// Add configuration object at the top
const config = {
    wsURL: window.location.protocol === 'https:' ? 
        `wss://${window.location.host}/ws` : 
        `ws://${window.location.host}/ws`
};

// Helper function to create chart configuration
function createChartConfig(label, color, unit = '', isMAhChart = false) {
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
        options: createChartOptions(label)
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
function createYScale(label) {
    return {
        beginAtZero: true,
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
        return ctx.p0.parsed.y > ctx.p1.parsed.y ?
            '#ef4444' :  // Red for discharging
            '#10b981';   // Green for charging
    }
    return defaultColor;
}

function getMAhSegmentBgColor(ctx, defaultColor) {
    if (ctx.p0.parsed && ctx.p1.parsed) {
        return ctx.p0.parsed.y > ctx.p1.parsed.y ?
            '#ef444419' :  // Red with opacity for discharging
            '#10b98119';   // Green with opacity for charging
    }
    return `${defaultColor}1a`;
}

// WebSocket handlers
function setupWebSocket() {
    const ws = new WebSocket(config.wsURL);

    ws.onopen = () => {
        statusDiv.textContent = 'Connected to server';
        statusDiv.className = 'connected';
    };

    ws.onmessage = handleWebSocketMessage;

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        statusDiv.textContent = 'Error connecting to server';
        statusDiv.className = 'error';
    };

    ws.onclose = () => {
        console.log('WebSocket connection closed');
        statusDiv.textContent = 'Disconnected from server';
        statusDiv.className = 'error';
    };
}

function handleWebSocketMessage(event) {
    const data = JSON.parse(event.data);
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
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const filterOldPoints = point => new Date(point.x) > fiveMinutesAgo;

    mAhChart.data.datasets[0].data = mAhChart.data.datasets[0].data.filter(filterOldPoints);
    voltageChart.data.datasets[0].data = voltageChart.data.datasets[0].data.filter(filterOldPoints);
    temperatureChart.data.datasets[0].data = temperatureChart.data.datasets[0].data.filter(filterOldPoints);
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
