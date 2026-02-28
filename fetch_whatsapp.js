const axios = require('axios');
const fs = require('fs');

async function fetchCatalog() {
    const url = 'https://wa.me/c/5493518578028';
    try {
        const res = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
            }
        });
        fs.writeFileSync('whatsapp_catalog.html', res.data);
        console.log('Catálogo guardado en whatsapp_catalog.html');
    } catch (err) {
        console.error('Error fetching catalog:', err.message);
        if (err.response) {
            console.error('Status:', err.response.status);
            fs.writeFileSync('error_response.html', err.response.data);
        }
    }
}

fetchCatalog();
