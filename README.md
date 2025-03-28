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

### Server Deployment (Linux)

1. Install Node.js and npm if not already installed:
```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

2. Install Chrome dependencies:
```bash
sudo apt-get update
sudo apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils
```

3. Install Chrome:
```bash
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo dpkg -i google-chrome-stable_current_amd64.deb
```

4. Clone the repository and install dependencies:
```bash
git clone <repository-url>
cd <repository-directory>
npm install
```

5. Set Chrome binary path (if needed):
```bash
export CHROME_BIN=/usr/bin/google-chrome
```

6. Run the server:
```bash
node index.js
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
