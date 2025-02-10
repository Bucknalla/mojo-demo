// Import battery configurations
import { batteryRanges } from './battery-config.js';

let currentBatteryChemistry = null;

// Helper function to create chart configuration
function createChartConfig(label, color, unit = '', isMAhChart = false) {
    const config = {
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
                pointBackgroundColor: color,  // Add point color
                pointBorderColor: color       // Add point border color
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    bottom: isMAhChart ? 30 : 0  // Add padding for mAh chart to fit legend
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'second',
                        displayFormats: {
                            second: 'HH:mm:ss'
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    title: {
                        display: true,
                        text: 'Time',
                        font: {
                            family: 'Atkinson Hyperlegible'
                        }
                    },
                    ticks: {
                        maxTicksLimit: 10,
                        autoSkip: true,
                        font: {
                            family: 'Atkinson Hyperlegible'
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    title: {
                        display: true,
                        text: label,
                        font: {
                            family: 'Atkinson Hyperlegible'
                        }
                    },
                    ticks: {
                        font: {
                            family: 'Atkinson Hyperlegible'
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',  // Move default legend to top
                    labels: {
                        font: {
                            family: 'Atkinson Hyperlegible'
                        }
                    }
                }
            },
            animation: {
                duration: 0
            }
        }
    };

    if (isMAhChart) {
        config.data.datasets[0].segment = {
            borderColor: (ctx) => {
                if (ctx.p0.parsed && ctx.p1.parsed) {
                    return ctx.p0.parsed.y > ctx.p1.parsed.y ?
                        '#ef4444' :  // Red for discharging
                        '#10b981';   // Green for charging
                }
                return color;
            },
            backgroundColor: (ctx) => {
                if (ctx.p0.parsed && ctx.p1.parsed) {
                    return ctx.p0.parsed.y > ctx.p1.parsed.y ?
                        '#ef444419' :  // Red with opacity for discharging
                        '#10b98119';   // Green with opacity for charging
                }
                return `${color}1a`;
            }
        };
    }

    return config;
}

const mAhCtx = document.getElementById('mAhChart').getContext('2d');
const voltageCtx = document.getElementById('voltageChart').getContext('2d');
const temperatureCtx = document.getElementById('temperatureChart').getContext('2d');
const statusDiv = document.getElementById('status');

let mAhChart, voltageChart, temperatureChart;

let firstDataTime = null;

const ws = new WebSocket('ws://' + window.location.host + '/ws');

ws.onopen = function() {
    statusDiv.textContent = 'Connected to server';
    statusDiv.className = 'connected';
};

ws.onmessage = function(event) {
    const data = JSON.parse(event.data);
    const timestamp = new Date(data.timestamp * 1000);

    // Update battery chemistry if changed
    if (data.battery_chemistry && data.battery_chemistry !== currentBatteryChemistry) {
        currentBatteryChemistry = data.battery_chemistry;
    }

    if (!firstDataTime) {
        firstDataTime = timestamp;
    }

    // Get battery configuration
    const batteryConfig = batteryRanges[data.battery_chemistry] || batteryRanges['default'];

    // Update voltage chart colors
    voltageChart.data.datasets[0].borderColor = batteryConfig.color;
    voltageChart.data.datasets[0].backgroundColor = `${batteryConfig.color}1a`;
    voltageChart.data.datasets[0].pointBackgroundColor = batteryConfig.color;
    voltageChart.data.datasets[0].pointBorderColor = batteryConfig.color;

    // Update voltage chart label with battery chemistry
    voltageChart.data.datasets[0].label = `Voltage (V) - Type: ${data.battery_chemistry}`;

    // Update voltage chart y-axis range
    voltageChart.options.scales.y.min = 0;
    voltageChart.options.scales.y.max = Math.ceil(batteryConfig.max) + 1;  // Round up to next whole number

    // Update charts with new data
    mAhChart.data.datasets[0].data.push({
        x: timestamp,
        y: data.milliamp_hours
    });

    voltageChart.data.datasets[0].data.push({
        x: timestamp,
        y: data.voltage
    });

    temperatureChart.data.datasets[0].data.push({
        x: timestamp,
        y: data.temperature
    });

    // Remove old data points
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    mAhChart.data.datasets[0].data = mAhChart.data.datasets[0].data.filter(point =>
        new Date(point.x) > fiveMinutesAgo
    );
    voltageChart.data.datasets[0].data = voltageChart.data.datasets[0].data.filter(point =>
        new Date(point.x) > fiveMinutesAgo
    );
    temperatureChart.data.datasets[0].data = temperatureChart.data.datasets[0].data.filter(point =>
        new Date(point.x) > fiveMinutesAgo
    );

    mAhChart.update('none');
    voltageChart.update('none');
    temperatureChart.update('none');

    statusDiv.textContent = `Last update: ${timestamp.toLocaleTimeString()}`;
    statusDiv.className = 'connected';
};

ws.onerror = function(error) {
    console.error('WebSocket error:', error);
    statusDiv.textContent = 'Error connecting to server';
    statusDiv.className = 'error';
};

ws.onclose = function() {
    console.log('WebSocket connection closed');
    statusDiv.textContent = 'Disconnected from server';
    statusDiv.className = 'error';
};

// Add this new function to determine charging state
function calculateChargingStates(data) {
    if (data.length < 2) return [];

    const states = [];
    for (let i = 1; i < data.length; i++) {
        const currentValue = data[i].y;
        const previousValue = data[i-1].y;
        const isCharging = currentValue < previousValue; // Lower mAh means charging
        states.push(isCharging);
    }
    return states;
}

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

// Update the initialization
function initializeCharts() {
    mAhChart = new Chart(mAhCtx, createChartConfig('Milliamp Hours', '#2c7be5', 'mAh', true));
    voltageChart = new Chart(voltageCtx, createChartConfig('Voltage', '#2c7be5', 'V', false));
    temperatureChart = new Chart(temperatureCtx, createChartConfig('Temperature', '#fd7e14', '°C'));

    // Add mAh legend only
    document.querySelector('#mAhChart').insertAdjacentHTML('afterend', 
        createLegendHtml('mah', [
            { class: 'charging', label: 'Charging' },
            { class: 'discharging', label: 'Discharging' }
        ])
    );
}

// Add the Chart.js annotation plugin script to the HTML
const annotationScript = document.createElement('script');
annotationScript.src = 'https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation';
document.head.appendChild(annotationScript);

annotationScript.onload = function() {
    // Initialize charts
    initializeCharts();
};