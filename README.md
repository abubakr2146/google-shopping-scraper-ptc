# Web Scraper with UI

A web scraper that reads URLs from a file, scrapes their HTML content, and provides a web interface for monitoring and viewing results.

## Setup

### Local Development
1. Install dependencies:
```bash
npm install
```

2. Run the server:
```bash
node index.js
```

3. Access the web interface at `http://localhost:3000`

### Web App Deployment

1. Install dependencies:
```bash
npm install
```
This will automatically install Chrome via Puppeteer's browser installer.

2. Start the server:
```bash
npm start
```

The web interface will be available at the configured port (default: 3000).

Note: The postinstall script will handle Chrome installation automatically. If you encounter any issues with Chrome installation, you can manually run:
```bash
npx puppeteer browsers install chrome
```

## Usage

1. Add URLs to `urls.txt`, one per line
2. Open the web interface
3. Click "Start Scraping" to begin the process
4. View results in real-time and access scraped pages through the interface

## Features

- Web interface for monitoring scraping progress
- Real-time updates via WebSocket
- Persistent view of scraped results
- Clean HTML output with basic tags only
- Error handling and logging
- Server-friendly configuration
