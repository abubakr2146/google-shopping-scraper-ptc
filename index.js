const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const express = require('express');
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
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        });

        // Process each URL
        for (const url of urls) {
            try {
                socket.emit('scrape-progress', { 
                    message: `Processing: ${url}` 
                });
                
                // Create new page
                const page = await browser.newPage();
                
                // Navigate to URL with timeout
                await page.goto(url, {
                    waitUntil: 'networkidle0',
                    timeout: 30000
                });

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

                // Add small delay between requests
                await new Promise(resolve => setTimeout(resolve, 1000));

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
