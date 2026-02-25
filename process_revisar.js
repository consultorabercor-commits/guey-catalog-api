const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_KEY = "AQ.Ab8RN6IOHi89jSwFj-NA7MoAgtBsqeJp_n8xa_bZCLfSDkW-TQ";
const INPUT_DIR = path.join(__dirname, 'Imagenes_Revisar');
const OUTPUT_DIR = path.join(__dirname, 'Catalog_Images_Processed');
const MODEL = 'gemini-2.0-flash-exp';
const DELAY_MS = 2500;

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

const PROMPT = `You are a professional e-commerce product photographer. Take this clothing photo and generate a new version showing the exact same garment with:
- The SAME garment preserved exactly (same colors, pattern, fabric, style, all details)
- Clean neutral light gray studio background (#F2F2F2), no people, no hanger, no props
- Professional 3-point studio lighting (Key, Fill, Backlight) highlighting fabric texture
- Soft drop shadow at the base for depth
- Invisible mannequin effect: the garment appears worn naturally with 3D volume, showing the collar interior and sleeve openings
- Ultra sharp, high resolution, e-commerce catalog quality

Output only the product image, nothing else.`;

async function processImage(imagePath) {
    const fileName = path.basename(imagePath);
    // Output always as .png, replacing .jpg extension
    const outputName = fileName.replace(/\.(jpg|jpeg|png)$/i, '.png');
    const outputPath = path.join(OUTPUT_DIR, outputName);

    // Always overwrite — these are replacements for wrong images
    const imageBase64 = fs.readFileSync(imagePath, { encoding: 'base64' });
    const ext = path.extname(fileName).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';

    const url = `https://aiplatform.googleapis.com/v1/publishers/google/models/${MODEL}:streamGenerateContent?key=${API_KEY}`;

    const payload = {
        contents: [{
            role: "user",
            parts: [
                { inline_data: { mime_type: mimeType, data: imageBase64 } },
                { text: PROMPT }
            ]
        }],
        generationConfig: {
            responseModalities: ["IMAGE", "TEXT"],
            temperature: 0.4
        }
    };

    const MAX_RETRIES = 5;
    let lastErr = '';

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const res = await axios.post(url, payload, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 120000
            });

            const chunks = Array.isArray(res.data) ? res.data : [res.data];
            for (const chunk of chunks) {
                const parts = chunk?.candidates?.[0]?.content?.parts || [];
                for (const part of parts) {
                    if (part.inlineData?.mimeType?.startsWith('image/')) {
                        fs.writeFileSync(outputPath, Buffer.from(part.inlineData.data, 'base64'));
                        process.stdout.write(`[OK] ${fileName} -> ${outputName}\n`);
                        return 'success';
                    }
                }
            }
            process.stdout.write(`[NO_IMG] ${fileName}\n`);
            return 'no_image';
        } catch (err) {
            const status = err.response?.status;
            lastErr = err.response ? JSON.stringify(err.response.data).substring(0, 150) : err.message;

            if (status === 429 && attempt < MAX_RETRIES) {
                const waitMs = Math.min(60000, 5000 * Math.pow(2, attempt));
                process.stdout.write(`[WAIT ${waitMs / 1000}s] ${fileName} (intento ${attempt}/${MAX_RETRIES})\n`);
                await new Promise(r => setTimeout(r, waitMs));
            } else {
                break;
            }
        }
    }

    process.stdout.write(`[ERR] ${fileName}: ${lastErr}\n`);
    return 'error';
}

async function main() {
    const args = process.argv.slice(2);
    const testMode = args.includes('--test');

    let files = fs.readdirSync(INPUT_DIR)
        .filter(f => /\.(jpg|jpeg|png)$/i.test(f))
        .map(f => path.join(INPUT_DIR, f));

    if (testMode) {
        files = files.slice(0, 3);
        console.log(`\n🧪 TEST MODE: Procesando las primeras 3 imágenes...\n`);
    } else {
        console.log(`\n🚀 PROCESANDO ${files.length} imágenes de Imagenes_Revisar -> Catalog_Images_Processed...\n`);
        console.log(`⚠️  NOTA: Estas imágenes SOBREESCRIBEN las existentes con el mismo nombre.\n`);
    }

    let succeeded = 0, failed = 0, noImg = 0;

    for (let i = 0; i < files.length; i++) {
        const result = await processImage(files[i]);
        if (result === 'success') succeeded++;
        else if (result === 'no_image') noImg++;
        else failed++;

        if ((i + 1) % 5 === 0) {
            console.log(`--- Progreso: ${i + 1}/${files.length} | OK: ${succeeded} | SinImg: ${noImg} | Error: ${failed} ---`);
        }

        if (result !== 'skipped' && i < files.length - 1) {
            await new Promise(r => setTimeout(r, DELAY_MS));
        }
    }

    console.log(`\n========== PROCESAMIENTO COMPLETO ==========`);
    console.log(`✅ Exitosas:  ${succeeded}`);
    console.log(`⚠️  Sin imagen: ${noImg}`);
    console.log(`❌ Fallidas:  ${failed}`);
    console.log(`📁 Output:   ${OUTPUT_DIR}`);
    console.log(`\n➡️  Ahora ejecutá: node build_catalog.js`);
}

main();
