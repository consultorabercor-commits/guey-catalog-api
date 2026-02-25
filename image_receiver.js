const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const OUTPUT_DIR = path.join(__dirname, 'Catalog_Images');

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                let payload = body;
                if (body.startsWith('payload=')) {
                    payload = decodeURIComponent(body.substring(8).replace(/\+/g, ' '));
                }

                const data = JSON.parse(payload);

                if (data.items && data.items.length > 0) {
                    let count = 0;
                    for (const item of data.items) {
                        if (!item.base64) continue;

                        const base64Data = item.base64.replace(/^data:image\/jpeg;base64,/, "");
                        const safeTitle = item.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();

                        // Handle duplicate titles
                        let filePath = path.join(OUTPUT_DIR, `${safeTitle}.jpg`);
                        let iter = 1;
                        while (fs.existsSync(filePath)) {
                            filePath = path.join(OUTPUT_DIR, `${safeTitle}_${iter}.jpg`);
                            iter++;
                        }

                        fs.writeFileSync(filePath, base64Data, 'base64');
                        count++;
                    }
                    console.log(`Saved batch of ${count} images.`);
                }

                if (data.done) {
                    console.log('Done flag received. Shutting down receiver...');
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end('<h1>All Images Saved.</h1><script>setTimeout(() => window.close(), 2000)</script>');
                    setTimeout(() => process.exit(0), 1000);
                    return;
                }

                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end('<h1>Batch Saved.</h1><script>setTimeout(() => window.close(), 1000)</script>');

            } catch (e) {
                console.error("Error processing request:", e.message);
                res.writeHead(500);
                res.end("Error processing request");
            }
        });
    } else {
        res.writeHead(200);
        res.end('Image Receiver active.');
    }
});

server.listen(PORT, () => {
    console.log(`Image Receiver listening on port ${PORT}`);
});
