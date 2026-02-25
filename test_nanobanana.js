const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

// Placeholder for API Key. Ideally, this should come from process.env.NANO_BANANA_KEY
const API_KEY = process.env.NANO_BANANA_KEY || 'YOUR_API_KEY_HERE';
const INPUT_DIR = path.join(__dirname, 'Catalog_Images');
const OUTPUT_DIR = path.join(__dirname, 'Catalog_Images_Processed');

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
}

async function removeBackground(imagePath) {
    const fileName = path.basename(imagePath);
    console.log(`Processing: ${fileName} ...`);

    // Note: This is a placeholder structure for the hypothetical Nano Banana API.
    // In a real scenario, the exact endpoint and input format (e.g., base64 vs multipart form-data)
    // would depend on their official documentation.

    // Typically, background removal APIs use form-data
    const form = new FormData();
    form.append('image', fs.createReadStream(imagePath));
    form.append('format', 'png'); // We want transparent PNGs usually

    try {
        const response = await axios.post('https://api.nanobanana.com/v1/remove-background', form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${API_KEY}`
            },
            responseType: 'arraybuffer' // Expect binary image data back
        });

        const outputPath = path.join(OUTPUT_DIR, fileName.replace('.jpg', '.png'));
        fs.writeFileSync(outputPath, response.data);
        console.log(`Success! Saved to ${outputPath}`);
        return true;
    } catch (error) {
        console.error(`Error processing ${fileName}:`, error.response ? error.response.statusText : error.message);
        return false;
    }
}

async function main() {
    const files = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith('.jpg'));
    if (files.length === 0) {
        console.log("No images found in Catalog_Images");
        return;
    }

    // Test on the first file
    const testFile = path.join(INPUT_DIR, files[0]);
    console.log(`Testing Nano Banana on sample: ${testFile}`);

    if (API_KEY === 'YOUR_API_KEY_HERE') {
        console.log("WARNING: API Key is not set. The request will likely fail.");
    }

    await removeBackground(testFile);
}

main();
