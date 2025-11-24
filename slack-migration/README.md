# Slack Migration Progress Tracker

A frontend application that tracks Slack migration progress and provides multiple prediction methods for when the migration will reach 100%.

## Features

- **Real-time Progress Display**: Shows current migration percentage with a visual progress bar
- **Multiple Prediction Methods**:
  1. **Upstream Prediction**: The prediction from the original tracking source
  2. **Overall Rate**: Calculates average rate from the beginning of tracking
  3. **Last 20 Minutes**: Uses recent data to capture current migration pace
  4. **Last Hour**: More stable prediction using the last hour of data
  5. **Weighted Average**: Gives more weight to recent data points
  6. **Linear Regression**: Fits a line through recent data points using least squares
- **Interactive Chart**: Visualizes progress over time using Chart.js
- **Auto-refresh**: Updates every 30 seconds
- **CORS Proxy Support**: Automatically tries multiple CORS proxies if direct fetch fails

## Usage

Simply open `index.html` in a web browser. The application will:
1. Fetch data from the migration tracking page
2. Parse the embedded JavaScript data (labels, values, predictionTs)
3. Display current progress
4. Calculate and show predictions using all methods
5. Auto-refresh every 30 seconds

## Data Source

Data is fetched from: https://when-will-we-get-there.sahil.hackclub.app/

The source returns an HTML page with embedded JavaScript containing:
- `labels`: Array of timestamp strings (e.g., "2025-11-24 19:24:50")
- `values`: Array of percentage values
- `predictionTs`: Unix timestamp of the upstream prediction

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

## CORS Considerations

The upstream data source may not have CORS headers enabled. The application attempts to:
1. Fetch directly first
2. Fall back to CORS proxies (corsproxy.io, allorigins.win)

**Security Note**: Third-party CORS proxies can potentially intercept or modify data. For production use, consider:
- Running your own local CORS proxy
- Using a browser extension to disable CORS (development only)
- Deploying a server-side proxy you control

If you experience issues, you can:
- Use a browser extension to disable CORS
- Run a local CORS proxy
- Open the source URL directly to verify it's working

## Prediction Methods Explained

### Upstream Prediction
The prediction provided by the original tracking source, extracted from the `predictionTs` variable in the HTML.

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
