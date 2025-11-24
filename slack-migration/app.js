// Slack Migration Progress Tracker
// Fetches data and provides multiple prediction methods

const API_URL = 'https://when-will-we-get-there.sahil.hackclub.app/';
const REFRESH_INTERVAL = 30000; // 30 seconds

let chart = null;
let migrationData = [];

// Fetch data from the API
async function fetchMigrationData() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        showError(`Failed to fetch data: ${error.message}`);
        console.error('Error fetching migration data:', error);
        return null;
    }
}

// Parse and normalize data
// Assumes data is an array of objects with timestamp and percentage fields
function parseData(rawData) {
    if (!rawData) return [];
    
    // Handle different possible data formats
    let dataArray = rawData;
    
    // If it's an object with a data property
    if (rawData.data && Array.isArray(rawData.data)) {
        dataArray = rawData.data;
    }
    
    // If it's an object with timestamps as keys
    if (!Array.isArray(dataArray) && typeof dataArray === 'object') {
        dataArray = Object.entries(dataArray).map(([key, value]) => ({
            timestamp: key,
            percentage: typeof value === 'object' ? value.percentage || value.progress : value
        }));
    }
    
    return dataArray.map(item => {
        // Try to extract timestamp and percentage from various possible formats
        let timestamp, percentage;
        
        if (item.timestamp) {
            timestamp = new Date(item.timestamp);
        } else if (item.time) {
            timestamp = new Date(item.time);
        } else if (item.date) {
            timestamp = new Date(item.date);
        } else if (item.t) {
            timestamp = new Date(item.t);
        }
        
        if (typeof item.percentage === 'number') {
            percentage = item.percentage;
        } else if (typeof item.progress === 'number') {
            percentage = item.progress;
        } else if (typeof item.percent === 'number') {
            percentage = item.percent;
        } else if (typeof item.value === 'number') {
            percentage = item.value;
        } else if (typeof item.p === 'number') {
            percentage = item.p;
        } else if (typeof item === 'number') {
            percentage = item;
        }
        
        return {
            timestamp: timestamp || new Date(),
            percentage: percentage || 0
        };
    }).filter(item => !isNaN(item.timestamp.getTime()) && !isNaN(item.percentage))
      .sort((a, b) => a.timestamp - b.timestamp);
}

// Prediction Methods

// Method 1: Overall Rate - Total progress divided by total time
function predictOverallRate(data) {
    if (data.length < 2) return null;
    
    const first = data[0];
    const last = data[data.length - 1];
    
    const totalProgress = last.percentage - first.percentage;
    const totalTime = last.timestamp - first.timestamp; // in ms
    
    if (totalProgress <= 0 || totalTime <= 0) return null;
    
    const ratePerMs = totalProgress / totalTime;
    const remaining = 100 - last.percentage;
    const msToComplete = remaining / ratePerMs;
    
    return {
        name: 'Overall Rate',
        predictedTime: new Date(last.timestamp.getTime() + msToComplete),
        ratePerHour: ratePerMs * 3600000,
        className: 'overall'
    };
}

// Method 2: Last 20 Minutes Rate
function predictRecentRate(data, minutes = 20) {
    if (data.length < 2) return null;
    
    const last = data[data.length - 1];
    const cutoffTime = new Date(last.timestamp.getTime() - minutes * 60 * 1000);
    
    const recentData = data.filter(d => d.timestamp >= cutoffTime);
    
    if (recentData.length < 2) return null;
    
    const first = recentData[0];
    const lastRecent = recentData[recentData.length - 1];
    
    const progress = lastRecent.percentage - first.percentage;
    const time = lastRecent.timestamp - first.timestamp;
    
    if (progress <= 0 || time <= 0) return null;
    
    const ratePerMs = progress / time;
    const remaining = 100 - lastRecent.percentage;
    const msToComplete = remaining / ratePerMs;
    
    return {
        name: `Last ${minutes} Minutes`,
        predictedTime: new Date(lastRecent.timestamp.getTime() + msToComplete),
        ratePerHour: ratePerMs * 3600000,
        className: 'recent'
    };
}

// Method 3: Last Hour Rate
function predictHourRate(data) {
    if (data.length < 2) return null;
    
    const last = data[data.length - 1];
    const cutoffTime = new Date(last.timestamp.getTime() - 60 * 60 * 1000);
    
    const hourData = data.filter(d => d.timestamp >= cutoffTime);
    
    if (hourData.length < 2) return null;
    
    const first = hourData[0];
    const lastHour = hourData[hourData.length - 1];
    
    const progress = lastHour.percentage - first.percentage;
    const time = lastHour.timestamp - first.timestamp;
    
    if (progress <= 0 || time <= 0) return null;
    
    const ratePerMs = progress / time;
    const remaining = 100 - lastHour.percentage;
    const msToComplete = remaining / ratePerMs;
    
    return {
        name: 'Last Hour',
        predictedTime: new Date(lastHour.timestamp.getTime() + msToComplete),
        ratePerHour: ratePerMs * 3600000,
        className: 'hour'
    };
}

// Method 4: Weighted Moving Average (more weight to recent data)
function predictWeightedAverage(data) {
    if (data.length < 3) return null;
    
    const last = data[data.length - 1];
    const rates = [];
    
    // Calculate rates between consecutive points
    for (let i = 1; i < data.length; i++) {
        const progress = data[i].percentage - data[i-1].percentage;
        const time = data[i].timestamp - data[i-1].timestamp;
        if (time > 0 && progress >= 0) {
            rates.push({
                rate: progress / time,
                timestamp: data[i].timestamp
            });
        }
    }
    
    if (rates.length === 0) return null;
    
    // Apply exponential weighting (more recent = higher weight)
    let weightedSum = 0;
    let totalWeight = 0;
    const decayFactor = 0.9;
    
    for (let i = rates.length - 1; i >= 0; i--) {
        const weight = Math.pow(decayFactor, rates.length - 1 - i);
        weightedSum += rates[i].rate * weight;
        totalWeight += weight;
    }
    
    const weightedRate = weightedSum / totalWeight;
    
    if (weightedRate <= 0) return null;
    
    const remaining = 100 - last.percentage;
    const msToComplete = remaining / weightedRate;
    
    return {
        name: 'Weighted Average',
        predictedTime: new Date(last.timestamp.getTime() + msToComplete),
        ratePerHour: weightedRate * 3600000,
        className: 'weighted'
    };
}

// Method 5: Linear Regression on recent data points
function predictLinearRegression(data, windowSize = 50) {
    if (data.length < 3) return null;
    
    // Use recent window of data
    const recentData = data.slice(-Math.min(windowSize, data.length));
    
    // Simple linear regression
    const n = recentData.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    // Use timestamp as X (normalized), percentage as Y
    const baseTime = recentData[0].timestamp.getTime();
    
    for (const point of recentData) {
        const x = (point.timestamp.getTime() - baseTime) / 3600000; // hours from start
        const y = point.percentage;
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
    }
    
    const denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) return null;
    
    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;
    
    if (slope <= 0) return null;
    
    // Find when y = 100
    const hoursTo100 = (100 - intercept) / slope;
    const predictedTime = new Date(baseTime + hoursTo100 * 3600000);
    
    const last = data[data.length - 1];
    
    return {
        name: 'Linear Regression',
        predictedTime: predictedTime,
        ratePerHour: slope,
        className: 'regression'
    };
}

// UI Functions

function updateUI(data) {
    if (!data || data.length === 0) {
        document.getElementById('progressText').textContent = 'No data';
        return;
    }
    
    const current = data[data.length - 1];
    
    // Update progress bar
    document.getElementById('progressFill').style.width = `${Math.min(current.percentage, 100)}%`;
    document.getElementById('progressText').textContent = `${current.percentage.toFixed(2)}%`;
    
    // Update status details
    document.getElementById('lastUpdated').textContent = formatTime(current.timestamp);
    document.getElementById('dataPoints').textContent = data.length.toLocaleString();
    
    // Calculate and display predictions
    const predictions = [
        predictOverallRate(data),
        predictRecentRate(data, 20),
        predictHourRate(data),
        predictWeightedAverage(data),
        predictLinearRegression(data)
    ].filter(p => p !== null);
    
    renderPredictions(predictions);
    updateChart(data);
}

function renderPredictions(predictions) {
    const grid = document.getElementById('predictionsGrid');
    grid.innerHTML = '';
    
    const now = new Date();
    
    for (const pred of predictions) {
        const card = document.createElement('div');
        card.className = `prediction-card ${pred.className}`;
        
        const timeDiff = pred.predictedTime - now;
        const relativeTime = formatRelativeTime(timeDiff);
        
        card.innerHTML = `
            <h3>${pred.name}</h3>
            <div class="prediction-time">${formatDateTime(pred.predictedTime)}</div>
            <div class="prediction-relative">${relativeTime}</div>
            <div class="prediction-rate">Rate: ${pred.ratePerHour.toFixed(4)}%/hour</div>
        `;
        
        grid.appendChild(card);
    }
    
    if (predictions.length === 0) {
        grid.innerHTML = '<p>Not enough data to make predictions yet.</p>';
    }
}

function updateChart(data) {
    const ctx = document.getElementById('progressChart').getContext('2d');
    
    // Sample data if there are too many points
    let chartData = data;
    if (data.length > 200) {
        const step = Math.ceil(data.length / 200);
        chartData = data.filter((_, i) => i % step === 0 || i === data.length - 1);
    }
    
    const labels = chartData.map(d => formatTime(d.timestamp));
    const values = chartData.map(d => d.percentage);
    
    if (chart) {
        chart.data.labels = labels;
        chart.data.datasets[0].data = values;
        chart.update('none');
    } else {
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Migration Progress (%)',
                    data: values,
                    borderColor: '#36c5f0',
                    backgroundColor: 'rgba(54, 197, 240, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHitRadius: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Time'
                        },
                        ticks: {
                            maxTicksLimit: 10
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Progress (%)'
                        },
                        min: 0,
                        max: 100
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
    }
}

// Utility Functions

function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(date) {
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = new Date(now.getTime() + 86400000).toDateString() === date.toDateString();
    
    if (isToday) {
        return `Today at ${formatTime(date)}`;
    } else if (isTomorrow) {
        return `Tomorrow at ${formatTime(date)}`;
    } else {
        return date.toLocaleDateString([], { 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

function formatRelativeTime(ms) {
    if (ms < 0) {
        return 'Already passed';
    }
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
        return `in ${days}d ${hours % 24}h`;
    } else if (hours > 0) {
        return `in ${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
        return `in ${minutes}m`;
    } else {
        return 'in < 1 minute';
    }
}

function showError(message) {
    const banner = document.getElementById('errorBanner');
    document.getElementById('errorMessage').textContent = message;
    banner.classList.remove('hidden');
}

function hideError() {
    document.getElementById('errorBanner').classList.add('hidden');
}

// Main initialization
async function init() {
    const rawData = await fetchMigrationData();
    migrationData = parseData(rawData);
    updateUI(migrationData);
}

// Start the app
init();

// Auto-refresh
setInterval(async () => {
    const rawData = await fetchMigrationData();
    if (rawData) {
        migrationData = parseData(rawData);
        updateUI(migrationData);
    }
}, REFRESH_INTERVAL);
