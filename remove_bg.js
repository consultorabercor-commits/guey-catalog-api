const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

const API_KEY = "AQ.Ab8RN6IOHi89jSwFj-NA7MoAgtBsqeJp_n8xa_bZCLfSDkW-TQ";
const INPUT_DIR = path.join(__dirname, 'Catalog_Images');
const OUTPUT_DIR = path.join(__dirname, 'Catalog_Images_Processed');

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
}

async function removeBackground(imagePath) {
    const fileName = path.basename(imagePath);
    const outputFileName = fileName.replace('.jpg', '.png');
    const outputPath = path.join(OUTPUT_DIR, outputFileName);

    // Skip if already processed
    if (fs.existsSync(outputPath)) {
        console.log(`[SKIP] Ya procesado: ${fileName}`);
        return true;
    }

    const form = new FormData();
    form.append('image_file', fs.createReadStream(imagePath));
    form.append('size', 'auto');
    form.append('type', 'product'); // Optimized for product/clothing photos

    try {
        const response = await axios.post('https://api.remove.bg/v1.0/removebg', form, {
            headers: {
                ...form.getHeaders(),
                'X-Api-Key': API_KEY,
            },
            responseType: 'arraybuffer',
        });

        fs.writeFileSync(outputPath, response.data);
        console.log(`[OK] ${fileName} → ${outputFileName}`);
        return true;
    } catch (error) {
        const errMsg = error.response
            ? `HTTP ${error.response.status}: ${Buffer.from(error.response.data).toString()}`
            : error.message;
        console.error(`[ERROR] ${fileName}: ${errMsg}`);
        return false;
    }
}

async function main() {
    const args = process.argv.slice(2);
    const testMode = args.includes('--test');

    const files = fs.readdirSync(INPUT_DIR)
        .filter(f => f.endsWith('.jpg'))
        .map(f => path.join(INPUT_DIR, f));

    if (files.length === 0) {
        console.log("No se encontraron imágenes en Catalog_Images.");
        return;
    }

    if (testMode) {
        console.log(`\nModo TEST: Procesando solo la primera imagen: ${path.basename(files[0])}\n`);
        await removeBackground(files[0]);
        return;
    }

    console.log(`\nProcesando ${files.length} imágenes con Remove.bg...\n`);
    let succeeded = 0;
    let failed = 0;

    for (const file of files) {
        const result = await removeBackground(file);
        if (result) succeeded++;
        else failed++;
        // Small delay to be respectful to the API rate limit
        await new Promise(r => setTimeout(r, 500));
    }

    console.log(`\n========== COMPLETADO ==========`);
    console.log(`Exitosas: ${succeeded}`);
    console.log(`Fallidas:  ${failed}`);
    console.log(`Guardadas en: ${OUTPUT_DIR}`);
}

main();
