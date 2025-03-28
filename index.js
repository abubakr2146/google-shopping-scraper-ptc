const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const express = require('express');
const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15'
];

// Helper functions for anti-scraping measures
function getRandomUserAgent() {
    return userAgents[Math.floor(Math.random() * userAgents.length)];
}

function getRandomViewport() {
    // Common desktop resolutions
    const resolutions = [
        { width: 1920, height: 1080 },
        { width: 1366, height: 768 },
        { width: 1536, height: 864 },
        { width: 1440, height: 900 },
        { width: 1280, height: 1024 }
    ];
    return resolutions[Math.floor(Math.random() * resolutions.length)];
}

function getRandomDelay(min = 3000, max = 7000) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);


// Serve static files
app.use(express.static('public'));
app.use('/scraped_pages', express.static('scraped_pages'));

// Route to get existing scraped files
app.get('/api/results', async (req, res) => {
    try {
        const files = await fs.readdir('scraped_pages');
        const sortedFiles = files.sort((a, b) => {
            // Extract timestamps from filenames and sort in descending order
            const timeA = a.match(/-(\d+)\.html$/)[1];
            const timeB = b.match(/-(\d+)\.html$/)[1];
            return timeB - timeA;
        });
        res.json(sortedFiles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('Client connected');

    socket.on('start-scrape', async () => {
        try {
            await scrapeUrls(socket);
        } catch (error) {
            socket.emit('scrape-error', error.message);
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Start server
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

async function scrapeUrls(socket) {
    try {
        // Read URLs from file
        const urls = (await fs.readFile('urls.txt', 'utf-8'))
            .split('\n')
            .filter(url => url.trim()) // Remove empty lines
            .map(url => url.trim());

        socket.emit('scrape-progress', { 
            message: `Found ${urls.length} URLs to process` 
        });

        // Create output directory if it doesn't exist
        const outputDir = 'scraped_pages';
        await fs.mkdir(outputDir, { recursive: true });

        // Launch browser
        const browser = await puppeteer.launch({
            headless: 'new',
            executablePath: '/usr/bin/chromium-browser',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
                '--disable-blink-features=AutomationControlled', // Hide automation
                '--disable-infobars',
                '--window-position=0,0'
            ],
            ignoreHTTPSErrors: true
        });

        // Process each URL
        for (const url of urls) {
            try {
                socket.emit('scrape-progress', { 
                    message: `Processing: ${url}` 
                });
                
                // Create new page with random viewport and user agent
                const page = await browser.newPage();
                const viewport = getRandomViewport();
                await page.setViewport(viewport);
                await page.setUserAgent(getRandomUserAgent());
                
                // Add random delay before navigation
                await new Promise(resolve => setTimeout(resolve, getRandomDelay(2000, 5000)));
                
                // Set additional headers
                await page.setExtraHTTPHeaders({
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    'DNT': '1'
                });

                // Enable JavaScript and other browser features
                await page.setJavaScriptEnabled(true);
                await page.setDefaultNavigationTimeout(30000);
                
                let retries = 3;
                while (retries > 0) {
                    try {
                        // Check for common bot detection flags
                        await page.evaluateOnNewDocument(() => {
                            // Overwrite navigator properties
                            Object.defineProperty(navigator, 'webdriver', {
                                get: () => false,
                            });
                            Object.defineProperty(navigator, 'plugins', {
                                get: () => [1, 2, 3, 4, 5],
                            });
                            // Add language
                            Object.defineProperty(navigator, 'languages', {
                                get: () => ['en-US', 'en'],
                            });
                        });

                        // Navigate to URL with timeout
                        const response = await page.goto(url, {
                            waitUntil: ['networkidle0', 'domcontentloaded'],
                            timeout: 30000
                        });

                        // Simulate human-like behavior
                        await page.evaluate(() => {
                            // Random scrolling
                            const scrolls = Math.floor(Math.random() * 4) + 2; // 2-5 scrolls
                            for (let i = 0; i < scrolls; i++) {
                                const delay = Math.random() * 1000 + 500;
                                setTimeout(() => {
                                    window.scrollBy(0, Math.random() * 500);
                                }, delay);
                            }
                            // Random mouse movements
                            for (let i = 0; i < 3; i++) {
                                const x = Math.random() * window.innerWidth;
                                const y = Math.random() * window.innerHeight;
                                setTimeout(() => {
                                    const event = new MouseEvent('mousemove', {
                                        view: window,
                                        bubbles: true,
                                        cancelable: true,
                                        clientX: x,
                                        clientY: y
                                    });
                                    document.dispatchEvent(event);
                                }, Math.random() * 2000);
                            }
                        });
                        
                        // Wait for random time to simulate reading
                        await new Promise(resolve => setTimeout(resolve, getRandomDelay(2000, 4000)));
                        
                        // Check if we hit a CAPTCHA or blocking page
                        const content = await page.content();
                        const lowerContent = content.toLowerCase();
                        if (
                            lowerContent.includes('captcha') ||
                            lowerContent.includes('robot') ||
                            lowerContent.includes('automated access') ||
                            lowerContent.includes('blocked') ||
                            response.status() === 403
                        ) {
                            throw new Error('Possible bot detection encountered');
                        }

                        break; // Success - exit retry loop
                    } catch (error) {
                        retries--;
                        if (retries === 0) throw error;
                        console.log(`Retrying ${url}, attempts left: ${retries}`);
                        await new Promise(resolve => setTimeout(resolve, getRandomDelay(5000, 10000))); // Longer delay between retries
                    }
                }

                // Get clean HTML content
                const html = await page.evaluate(() => {
                    // List of basic HTML tags to keep
                    const basicTags = ['div', 'span', 'p', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'tbody', 'thead', 'img', 'br'];
                    
                    // Clone the body to work with
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = document.body.innerHTML;
                    
                    // Function to clean node
                    function cleanNode(node) {
                        if (node.nodeType === 3) return; // Text node - keep it
                        
                        // Remove all attributes except href for links and src for images
                        const attrs = node.attributes;
                        if (attrs) {
                            for (let i = attrs.length - 1; i >= 0; i--) {
                                const attrName = attrs[i].name;
                                if (!(node.tagName === 'A' && attrName === 'href') && 
                                    !(node.tagName === 'IMG' && attrName === 'src')) {
                                    node.removeAttribute(attrName);
                                }
                            }
                        }
                        
                        // If not a basic tag, replace with its contents
                        if (!basicTags.includes(node.tagName.toLowerCase())) {
                            const parent = node.parentNode;
                            if (parent) {
                                while (node.firstChild) {
                                    parent.insertBefore(node.firstChild, node);
                                }
                                parent.removeChild(node);
                            }
                        }
                    }
                    
                    // Process all nodes
                    const walker = document.createTreeWalker(
                        tempDiv,
                        NodeFilter.SHOW_ELEMENT,
                        null,
                        false
                    );
                    
                    const nodes = [];
                    while (walker.nextNode()) nodes.push(walker.currentNode);
                    nodes.reverse().forEach(cleanNode);
                    
                    return tempDiv.innerHTML;
                });

                // Create filename from URL
                const filename = `${new URL(url).hostname}-${Date.now()}.html`;
                const filePath = path.join(outputDir, filename);

                // Save HTML to file
                await fs.writeFile(filePath, html);
                socket.emit('scrape-progress', { 
                    message: `Saved: ${filename}`,
                    filename: filename
                });

                // Close page
                await page.close();

                // Add random delay between requests
                await new Promise(resolve => setTimeout(resolve, getRandomDelay()));

            } catch (error) {
                console.error(`Error processing ${url}:`, error.message);
            }
        }

        // Close browser
        await browser.close();
        socket.emit('scrape-complete');

    } catch (error) {
        console.error('Fatal error:', error.message);
        socket.emit('scrape-error', error.message);
    }
}

// Export the scraper function for potential external use
module.exports = { scrapeUrls };
