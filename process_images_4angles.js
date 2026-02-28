const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_KEY = "AQ.Ab8RN6IOHi89jSwFj-NA7MoAgtBsqeJp_n8xa_bZCLfSDkW-TQ";
const INPUT_DIR = path.join(__dirname, 'Catalog_Images');
const OUTPUT_DIR = path.join(__dirname, 'Catalog_Images_Processed');
const MODEL = 'gemini-2.0-flash-preview-image-generation';
const DELAY_MS = 2500; // Delay between API calls

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

const BASE_PROMPT = `PROFESSIONAL E-COMMERCE APPAREL PHOTOGRAPHY.

Core Objective: Generate an isolated image of the EXACT garment from the input, presented as clean "Flat Lay" or "Invisible Mannequin" style. DO NOT ALTER THE SHAPE, LENGTH, OR PROPORTIONS OF THE CLOTHING.

Angle to generate this time: {ANGLE}

CRITICAL RULES (FOLLOW STRICTLY):
1. PRESERVE ORIGINAL GARMENT: You MUST keep the exact shape, cut, drape, length, and width of the input clothing. If it is a short blouse, DO NOT turn it into a dress. If it is flat, keep it flat.
2. NO NEW ITEMS: If the input is only a top, DO NOT generate pants or shoes. DO NOT invent accessories.
3. ISOLATED SUBJECT: Remove all busy backgrounds, hangers, hands, or unneeded elements.
4. NO VISIBLE MANNEQUIN: Do not show plastic necks, arms, or stands.
5. NO CLIPPING: The entire garment must fit inside the image, do not cut sleeves or borders.
6. BACKGROUND & LIGHTING: Pure light-gray background (#F0F0F0) with soft studio lighting. Add a minimal natural shadow underneath.

Failure to maintain the exact silhouette and length of the original input item is unacceptable. Output ONLY the image.`;

const ANGLES = [
    { title: "FULL FRONT: Direct front view of the garment.", suffix: "" },
    { title: "FULL BACK: Direct view of the back of the garment.", suffix: "_back" },
    { title: "DIAGONAL FRONT LEFT: 3/4 front view, focusing on the left shoulder/hip.", suffix: "_diag_left" },
    { title: "DIAGONAL BACK RIGHT: 3/4 back view, focusing on the right shoulder/hip.", suffix: "_diag_right" }
];

async function callVertexAIWithRetry(imageBase64, promptText, outputPath, attempt = 1, MAX_RETRIES = 5) {
    const url = `https://aiplatform.googleapis.com/v1/publishers/google/models/${MODEL}:streamGenerateContent?key=${API_KEY}`;

    const payload = {
        contents: [{
            role: "user",
            parts: [
                { inline_data: { mime_type: "image/jpeg", data: imageBase64 } },
                { text: promptText }
            ]
        }],
        generationConfig: {
            responseModalities: ["IMAGE", "TEXT"],
            temperature: 0.4
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
            const waitMs = Math.min(60000, 5000 * Math.pow(2, attempt)); // Exponencial backoff
            await new Promise(r => setTimeout(r, waitMs));
            return callVertexAIWithRetry(imageBase64, promptText, outputPath, attempt + 1, MAX_RETRIES);
        }
        const errorMsg = err.response ? JSON.stringify(err.response.data).substring(0, 150) : err.message;
        console.error(`Status ${status}: ${errorMsg}`);
        return 'error';
    }
}

async function processImage(imagePath) {
    const fileName = path.basename(imagePath);
    const baseName = fileName.replace('.jpg', '').replace('.png', '');
    const imageBase64 = fs.readFileSync(imagePath, { encoding: 'base64' });

    console.log(`\nProcesando: ${fileName}`);
    let imgResults = [];

    for (const angle of ANGLES) {
        const outputName = `${baseName}${angle.suffix}.png`;
        const outputPath = path.join(OUTPUT_DIR, outputName);

        if (fs.existsSync(outputPath)) {
            console.log(`  [SKIP] ${outputName} ya existe.`);
            imgResults.push('skipped');
            continue;
        }

        console.log(`  -> Generando ángulo: ${angle.suffix || "front"}`);
        const promptText = BASE_PROMPT.replace('{ANGLE}', angle.title);

        const result = await callVertexAIWithRetry(imageBase64, promptText, outputPath);

        if (result === 'success') {
            console.log(`     [OK] ${outputName} guardado.`);
        } else {
            console.log(`     [FAIL] ${outputName} falló.`);
        }
        imgResults.push(result);

        await new Promise(r => setTimeout(r, DELAY_MS)); // Prevent spamming
    }

    return imgResults;
}

async function main() {
    const args = process.argv.slice(2);
    const testMode = args.includes('--test');

    let files = fs.readdirSync(INPUT_DIR)
        .filter(f => f.endsWith('.jpg') || f.endsWith('.png'))
        .map(f => path.join(INPUT_DIR, f));

    if (testMode) {
        files = files.slice(0, 2); // Sólo 2 fotos de prueba en test
        console.log(`\n🧪 TEST MODE: Procesando primeras ${files.length} imágenes...`);
    } else {
        console.log(`\n🚀 BATCH MODE: Procesando ${files.length} imágenes...`);
        console.log(`   Se generarán 4 ángulos por imagen (Total: ${files.length * 4} imágenes)`);
    }

    let anglesSuccess = 0, anglesSkipped = 0, anglesFail = 0;

    for (let i = 0; i < files.length; i++) {
        const results = await processImage(files[i]);

        results.forEach(r => {
            if (r === 'success') anglesSuccess++;
            else if (r === 'skipped') anglesSkipped++;
            else anglesFail++;
        });

        if (!testMode && (i + 1) % 5 === 0) {
            console.log(`\n--- Progreso Productos: ${i + 1}/${files.length} | Ángulos OK: ${anglesSuccess} | Fallados: ${anglesFail} ---`);
        }
    }

    console.log(`\n========== GENERACIÓN COMPLETA ==========`);
    console.log(`Productos procesados: ${files.length}`);
    console.log(`Ángulos generados con éxito: ${anglesSuccess}`);
    console.log(`Ángulos saltados (ya existían): ${anglesSkipped}`);
    console.log(`Ángulos fallados: ${anglesFail}`);
}

main();
