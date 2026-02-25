const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_KEY = "AQ.Ab8RN6IOHi89jSwFj-NA7MoAgtBsqeJp_n8xa_bZCLfSDkW-TQ";
const INPUT_DIR = path.join(__dirname, 'Catalog_Images');
const OUTPUT_DIR = path.join(__dirname, 'Catalog_Images_Processed');
const MODEL = 'gemini-2.0-flash-exp';
const DELAY_MS = 2000; // 2 second delay between requests to respect rate limits

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
    const outputName = fileName.replace('.jpg', '.png');
    const outputPath = path.join(OUTPUT_DIR, outputName);

    if (fs.existsSync(outputPath)) {
        process.stdout.write(`[SKIP] ${fileName}\n`);
        return 'skipped';
    }

    const imageBase64 = fs.readFileSync(imagePath, { encoding: 'base64' });
    const url = `https://aiplatform.googleapis.com/v1/publishers/google/models/${MODEL}:streamGenerateContent?key=${API_KEY}`;

    const payload = {
        contents: [{
            role: "user",
            parts: [
                { inline_data: { mime_type: "image/jpeg", data: imageBase64 } },
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
                        process.stdout.write(`[OK] ${fileName}\n`);
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
                const waitMs = Math.min(60000, 5000 * Math.pow(2, attempt)); // 10s, 20s, 40s, 60s...
                process.stdout.write(`[WAIT ${waitMs / 1000}s] ${fileName} (attempt ${attempt}/${MAX_RETRIES})\n`);
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
    const startFrom = parseInt(args.find(a => a.startsWith('--from='))?.split('=')[1] || '0');

    let files = fs.readdirSync(INPUT_DIR)
        .filter(f => f.endsWith('.jpg'))
        .map(f => path.join(INPUT_DIR, f))
        .slice(startFrom);

    if (testMode) {
        files = files.slice(0, 3);
        console.log(`\n🧪 TEST MODE: Processing first 3 images...\n`);
    } else {
        console.log(`\n🚀 BATCH MODE: Processing ${files.length} images...\n`);
    }

    let succeeded = 0, skipped = 0, failed = 0;

    for (let i = 0; i < files.length; i++) {
        const result = await processImage(files[i]);
        if (result === 'success') succeeded++;
        else if (result === 'skipped') skipped++;
        else failed++;

        // Progress update every 10
        if ((i + 1) % 10 === 0) {
            console.log(`--- Progress: ${i + 1}/${files.length} | OK: ${succeeded} | Skip: ${skipped} | Fail: ${failed} ---`);
        }

        // Delay between requests
        if (result !== 'skipped' && i < files.length - 1) {
            await new Promise(r => setTimeout(r, DELAY_MS));
        }
    }

    console.log(`\n========== BATCH COMPLETE ==========`);
    console.log(`Exitosas:  ${succeeded}`);
    console.log(`Saltadas:  ${skipped}`);
    console.log(`Fallidas:  ${failed}`);
    console.log(`Output: ${OUTPUT_DIR}`);
}

main();
