const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_KEY = "AQ.Ab8RN6IOHi89jSwFj-NA7MoAgtBsqeJp_n8xa_bZCLfSDkW-TQ";
const INPUT_DIR = path.join(__dirname, 'Imagenes_Revisar');
const OUTPUT_DIR = path.join(__dirname, 'Catalog_Images_Processed');
const MODEL = 'gemini-2.0-flash-exp';
const DELAY_MS = 3000;

// Archivos que necesitan corrección - prendas inferiores que la IA convirtió en prendas superiores
// Cada entry tiene el archivo fuente y el tipo de prenda para usar el prompt correcto
const FILES_TO_FIX = [
    // Pantalones/Calzas - prenda inferior
    { file: 'conjunto_termico.jpg',         type: 'bottom', note: 'conjunto termico - pantalon termico + remera' },
    { file: 'jean_mom.jpg',                  type: 'bottom', note: 'jean mom - solo el jean, sin campera' },
    { file: 'calzas_anticelulitis.jpg',      type: 'bottom', note: 'calza anticelulitis' },
    { file: 'calzas_frizadasy_sin_friza.jpg',type: 'bottom', note: 'calzas frizadas y sin friza' },
    { file: 'seamless_larga.jpg',            type: 'bottom', note: 'calza seamless larga' },
    { file: 'pantal_n_lino.jpg',             type: 'bottom', note: 'pantalon lino' },
    { file: 'pantal_n_recto_friza.jpg',      type: 'bottom', note: 'pantalon recto de friza' },
    { file: 'yd_3_en_1_pantal_n.jpg',        type: 'bottom', note: 'pantalon importado 3 en 1 / bermuda' },
    // Medias - accesorio
    { file: 'media_antideslizantes.jpg',     type: 'socks',  note: 'medias antideslizantes deportivas' },
    { file: 'medias_antideslizante.jpg',     type: 'socks',  note: 'medias antideslizantes' },
];

// Prompt para prendas INFERIORES (pantalones, calzas, shorts, jeans)
const PROMPT_BOTTOM = `You are a professional e-commerce product photographer. Take this clothing photo and generate a new version showing ONLY the exact same BOTTOM GARMENT (pants/leggings/jeans/shorts/calza) with:
- Show ONLY the bottom garment - pants, jeans, leggings, shorts, or similar. DO NOT add any top, shirt, blouse, jacket, or upper body garment.
- The SAME garment preserved exactly (same colors, pattern, fabric, style, all details)
- Clean neutral light gray studio background (#F2F2F2), no people, no hanger, no props
- Professional 3-point studio lighting highlighting fabric texture
- Soft drop shadow at the base for depth
- Flat lay or ghost mannequin showing the full pants/leggings from waistband to hem
- Ultra sharp, high resolution, e-commerce catalog quality

IMPORTANT: This is a BOTTOM GARMENT ONLY. Show only from waistband to ankle/hem. No torso, no shirt, no jacket above it.
Output only the product image, nothing else.`;

// Prompt para MEDIAS/CALCETINES
const PROMPT_SOCKS = `You are a professional e-commerce product photographer. Take this photo of socks/sports socks and generate a new version showing ONLY the exact same SOCKS with:
- Show ONLY the socks/stockings. DO NOT add any shirt, pants, or other garment.
- The SAME socks preserved exactly (same colors, design, anti-slip pattern, all details)
- Clean neutral light gray studio background (#F2F2F2), no people, no hanger
- Professional studio lighting highlighting the fabric texture and anti-slip dots
- Multiple socks displayed together if the original shows multiple
- Ultra sharp, high resolution, e-commerce catalog quality

IMPORTANT: These are SOCKS/MEDIAS. Show only the socks, laid flat or standing up on a surface.
Output only the product image, nothing else.`;

// Prompt especial para el CONJUNTO TERMICO (muestra ambas prendas)
const PROMPT_THERMAL_SET = `You are a professional e-commerce product photographer. Take this thermal set photo and generate a new version showing BOTH the thermal top AND thermal bottom pants together as a SET with:
- Show BOTH the thermal long-sleeve top AND the thermal pants/leggings together
- The SAME garments preserved exactly (same colors, fabric, style)
- Clean neutral light gray studio background (#F2F2F2), no people, no hanger
- Professional studio lighting
- Display both pieces side by side or as a coordinated set
- Ultra sharp, high resolution, e-commerce catalog quality

Output only the product image, nothing else.`;

function getPrompt(type) {
    if (type === 'socks') return PROMPT_SOCKS;
    if (type === 'thermal_set') return PROMPT_THERMAL_SET;
    return PROMPT_BOTTOM;
}

async function processImage(fileInfo) {
    const { file, type, note } = fileInfo;
    const imagePath = path.join(INPUT_DIR, file);
    
    if (!fs.existsSync(imagePath)) {
        process.stdout.write(`[SKIP] ${file} - archivo no encontrado en Imagenes_Revisar\n`);
        return 'skipped';
    }

    const outputName = file.replace(/\.(jpg|jpeg|png)$/i, '.png');
    const outputPath = path.join(OUTPUT_DIR, outputName);

    process.stdout.write(`[PROC] ${file} (${note})\n`);

    const imageBase64 = fs.readFileSync(imagePath, { encoding: 'base64' });
    const ext = path.extname(file).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
    const prompt = getPrompt(type);

    const url = `https://aiplatform.googleapis.com/v1/publishers/google/models/${MODEL}:streamGenerateContent?key=${API_KEY}`;

    const payload = {
        contents: [{
            role: "user",
            parts: [
                { inline_data: { mime_type: mimeType, data: imageBase64 } },
                { text: prompt }
            ]
        }],
        generationConfig: {
            responseModalities: ["IMAGE", "TEXT"],
            temperature: 0.3
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
                        process.stdout.write(`[OK]   ${file} -> ${outputName}\n`);
                        return 'success';
                    }
                }
            }
            process.stdout.write(`[NO_IMG] ${file}\n`);
            return 'no_image';
        } catch (err) {
            const status = err.response?.status;
            lastErr = err.response ? JSON.stringify(err.response.data).substring(0, 200) : err.message;

            if (status === 429 && attempt < MAX_RETRIES) {
                const waitMs = Math.min(60000, 5000 * Math.pow(2, attempt));
                process.stdout.write(`[WAIT ${waitMs / 1000}s] ${file} (intento ${attempt}/${MAX_RETRIES})\n`);
                await new Promise(r => setTimeout(r, waitMs));
            } else {
                break;
            }
        }
    }

    process.stdout.write(`[ERR]  ${file}: ${lastErr}\n`);
    return 'error';
}

async function main() {
    console.log(`\n========================================`);
    console.log(`FIX: Re-procesando prendas inferiores MAL generadas`);
    console.log(`Total archivos a corregir: ${FILES_TO_FIX.length}`);
    console.log(`========================================\n`);

    let succeeded = 0, failed = 0, noImg = 0, skipped = 0;

    for (let i = 0; i < FILES_TO_FIX.length; i++) {
        const result = await processImage(FILES_TO_FIX[i]);
        if (result === 'success') succeeded++;
        else if (result === 'no_image') noImg++;
        else if (result === 'skipped') skipped++;
        else failed++;

        if (i < FILES_TO_FIX.length - 1) {
            await new Promise(r => setTimeout(r, DELAY_MS));
        }
    }

    console.log(`\n========================================`);
    console.log(`RESULTADO:`);
    console.log(`  Exitosas:   ${succeeded}`);
    console.log(`  Sin imagen: ${noImg}`);
    console.log(`  Saltadas:   ${skipped}`);
    console.log(`  Fallidas:   ${failed}`);
    console.log(`========================================`);
    console.log(`\nLas imagenes corregidas estan en: Catalog_Images_Processed/`);
    console.log(`El catalogo HTML ya las referencia, solo abrir Home_Catalog_Final.html`);
}

main();
