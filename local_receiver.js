const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const OUTPUT_FILE = path.join(__dirname, 'guey_catalog_full.json');

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            console.log(`Received data of length: ${body.length}`);

            // If submitted via form enctype text/plain, decode it
            if (body.startsWith('data=')) {
                body = body.substring(5);
            }

            // Try to parse to ensure it's valid JSON
            try {
                // The browser might encode = or & in text/plain if not careful, 
                // but let's try direct write first.
                // It might be URL encoded if enctype was application/x-www-form-urlencoded
                // so we decodeURIComponent just in case.
                if (body.includes('%22')) {
                    body = decodeURIComponent(body.replace(/\+/g, ' '));
                }

                fs.writeFileSync(OUTPUT_FILE, body);
                console.log(`Saved to ${OUTPUT_FILE}`);
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end('<h1>Success! Data Saved.</h1><script>setTimeout(() => window.close(), 2000)</script>');

                setTimeout(() => {
                    console.log('Shutting down server...');
                    process.exit(0);
                }, 1000);
            } catch (e) {
                console.error("Error writing JSON", e);
                res.end("Error saving data");
            }
        });
    } else {
        res.writeHead(200);
        res.end('Server is running and listening for POST requests.');
    }
});

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
