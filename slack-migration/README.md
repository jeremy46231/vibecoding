# Slack Migration Progress Tracker

A frontend application that tracks Slack migration progress and provides multiple prediction methods for when the migration will reach 100%.

## Features

- **Real-time Progress Display**: Shows current migration percentage with a visual progress bar
- **Multiple Prediction Methods**:
  1. **Overall Rate**: Calculates average rate from the beginning of tracking
  2. **Last 20 Minutes**: Uses recent data to capture current migration pace
  3. **Last Hour**: More stable prediction using the last hour of data
  4. **Weighted Average**: Gives more weight to recent data points
  5. **Linear Regression**: Fits a line through recent data points using least squares
- **Interactive Chart**: Visualizes progress over time using Chart.js
- **Auto-refresh**: Updates every 30 seconds

## Usage

Simply open `index.html` in a web browser. The application will:
1. Fetch data from the migration API
2. Display current progress
3. Calculate and show predictions using all methods
4. Auto-refresh every 30 seconds

## Data Source

Data is fetched from: https://when-will-we-get-there.sahil.hackclub.app/

## Files

- `index.html` - Main HTML structure
- `styles.css` - Styling and responsive design
- `app.js` - Core application logic and prediction algorithms

## Running Locally

You can run this locally by serving the files with any static file server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js (npx)
npx serve .

# Using PHP
php -S localhost:8000
```

Then open http://localhost:8000 in your browser.

## Prediction Methods Explained

### Overall Rate
Takes the total progress made divided by total time elapsed, then extrapolates to find when 100% will be reached. Best for long-term, stable processes.

### Last 20 Minutes
Uses only the most recent 20 minutes of data. Best for capturing sudden changes in migration speed.

### Last Hour
Uses the last hour of data for a balance between recency and stability.

### Weighted Average
Applies exponential weighting to rate calculations, giving more importance to recent data points while still considering historical trends.

### Linear Regression
Performs least squares regression on recent data points to find the best-fit line, then extrapolates to 100%. Good for identifying consistent trends.
