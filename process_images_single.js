const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_KEY = "AQ.Ab8RN6IOHi89jSwFj-NA7MoAgtBsqeJp_n8xa_bZCLfSDkW-TQ";
const INPUT_DIR = path.join(__dirname, 'Catalog_Images');
const OUTPUT_DIR = path.join(__dirname, 'Catalog_Images_Processed');
const MODEL = 'gemini-2.0-flash-preview-image-generation';
const DELAY_MS = 3000;

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

// This prompt focuses ONLY on background removal and studio cleanup.
// It does NOT ask the model to change the garment or generate new angles.
const PROMPT = `TASK: High-end e-commerce product photo cleanup and isolation.

You are given a photo of a clothing garment. The garment may be on a model, on a mannequin, on a hanger, on a flat surface, or held by hand. Your ONLY task is:
1. REMOVE everything that is NOT the garment: remove the background, remove any mannequin or plastic torso, remove any human body (neck, arms, hands), remove any hanger or holder.
2. Show ONLY the clothing item alone, completely isolated, as if it were floating on a plain background.
3. Replace the background with a clean, flat, studio light-gray (#F0F0F0) background.
4. CENTER the garment perfectly in the frame with even padding on all sides.
5. Apply SOFT studio lighting so the garment looks well-lit and professional, highlighting fabric texture and color faithfully.
6. Add a very subtle, soft drop shadow directly under the garment to give it grounding.
7. DO NOT change, alter, reshape, or resize the garment itself. Keep its exact original shape, proportions, length, and color perfectly intact.
8. DO NOT remove, add, or modify any graphic, logo, button, zipper, or stitching present on the garment.
9. DO NOT add any new garment items that are not in the input photo.
10. If the original garment appears to be on a mannequin and has an opening at bottom (e.g. the collar area or waist of an invisible mannequin), fill it in naturally to look like a clean garment — do NOT leave mannequin holes or torso visible.
11. DO NOT add any person, mannequin, body part, or hanger in the final output.
12. The final image must be square or portrait-oriented (4:5 ratio) and look like a premium e-commerce product photo.

Output ONLY the final cleaned image. No text, no grids, no watermarks.`;

async function callGeminiImageEdit(imageBase64, outputPath, attempt = 1, MAX_RETRIES = 5) {
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
            temperature: 0.1  // Low creativity, high fidelity
        }
    };

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
                    return 'success';
                }
            }
        }
        return 'no_image';
    } catch (err) {
        const status = err.response?.status;
        if (status === 429 && attempt < MAX_RETRIES) {
            const waitMs = Math.min(60000, 5000 * Math.pow(2, attempt));
            console.log(`     [429] Rate limit. Esperando ${waitMs / 1000}s...`);
            await new Promise(r => setTimeout(r, waitMs));
            return callGeminiImageEdit(imageBase64, outputPath, attempt + 1, MAX_RETRIES);
        }
        const errorMsg = err.response ? JSON.stringify(err.response.data).substring(0, 200) : err.message;
        console.error(`     [ERROR] Status ${status}: ${errorMsg}`);
        return 'error';
    }
}

async function processImage(imagePath) {
    const fileName = path.basename(imagePath);
    const baseName = fileName.replace(/\.(jpg|jpeg|png)$/i, '');
    const outputName = `${baseName}.png`;
    const outputPath = path.join(OUTPUT_DIR, outputName);

    if (fs.existsSync(outputPath)) {
        console.log(`  [SKIP] ${outputName} ya existe.`);
        return 'skipped';
    }

    console.log(`\nProcesando: ${fileName}`);
    const imageBase64 = fs.readFileSync(imagePath, { encoding: 'base64' });
    const result = await callGeminiImageEdit(imageBase64, outputPath);

    if (result === 'success') {
        console.log(`  [OK] ${outputName} guardado.`);
    } else {
        console.log(`  [FAIL] No se pudo generar ${outputName}.`);
    }

    return result;
}

async function main() {
    const args = process.argv.slice(2);
    const testMode = args.includes('--test');

    let files = fs.readdirSync(INPUT_DIR)
        .filter(f => /\.(jpg|jpeg|png)$/i.test(f))
        .map(f => path.join(INPUT_DIR, f));

    if (testMode) {
        files = files.slice(0, 3);
        console.log(`\n🧪 TEST MODE: Procesando primeras ${files.length} imágenes...`);
    } else {
        console.log(`\n🚀 BATCH MODE: Procesando ${files.length} imágenes...`);
    }

    let ok = 0, skipped = 0, fail = 0;

    for (let i = 0; i < files.length; i++) {
        const result = await processImage(files[i]);
        if (result === 'success') ok++;
        else if (result === 'skipped') skipped++;
        else fail++;

        if (!testMode && (i + 1) % 10 === 0) {
            console.log(`\n--- Progreso: ${i + 1}/${files.length} | OK: ${ok} | Saltadas: ${skipped} | Falladas: ${fail} ---`);
        }

        await new Promise(r => setTimeout(r, DELAY_MS));
    }

    console.log(`\n========== PROCESO COMPLETO ==========`);
    console.log(`Total procesadas: ${files.length}`);
    console.log(`Guardadas con éxito: ${ok}`);
    console.log(`Ya existían (saltadas): ${skipped}`);
    console.log(`Falladas: ${fail}`);
}

main();
