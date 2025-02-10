// Helper function to create chart configuration
function createChartConfig(label, color, unit = '') {
    return {
        type: 'line',
        data: {
            datasets: [{
                label: `${label}${unit ? ` (${unit})` : ''}`,
                data: [],
                borderColor: color,
                backgroundColor: `${color}1a`, // Add 10% opacity
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
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
}

const mAhCtx = document.getElementById('mAhChart').getContext('2d');
const voltageCtx = document.getElementById('voltageChart').getContext('2d');
const temperatureCtx = document.getElementById('temperatureChart').getContext('2d');
const statusDiv = document.getElementById('status');

const mAhChart = new Chart(mAhCtx, createChartConfig('Milliamp Hours', '#2c7be5', 'mAh'));
const voltageChart = new Chart(voltageCtx, createChartConfig('Voltage', '#00c9a7', 'V'));
const temperatureChart = new Chart(temperatureCtx, createChartConfig('Temperature', '#fd7e14', '°C'));

let firstDataTime = null;

const ws = new WebSocket('ws://' + window.location.host + '/ws');

ws.onopen = function() {
    statusDiv.textContent = 'Connected to server';
    statusDiv.className = 'connected';
};

ws.onmessage = function(event) {
    const data = JSON.parse(event.data);
    const timestamp = new Date(data.timestamp * 1000);
    
    if (!firstDataTime) {
        firstDataTime = timestamp;
    }
    
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    // Update all charts
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

    // Remove old data points from all charts
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