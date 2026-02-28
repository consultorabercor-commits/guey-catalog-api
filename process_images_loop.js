const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_KEY = "AQ.Ab8RN6IOHi89jSwFj-NA7MoAgtBsqeJp_n8xa_bZCLfSDkW-TQ";
const INPUT_DIR = path.join(__dirname, 'Catalog_Images');
const WORK_DIR = path.join(__dirname, 'Catalog_Images_Processed');
const GOOD_DIR = path.join(WORK_DIR, 'Buenas Imagenes');
const GENERATION_MODEL = 'gemini-2.0-flash-preview-image-generation';
const REVIEW_MODEL = 'gemini-2.0-flash';
const DELAY_MS = 2500;
const MAX_RETRIES_PER_IMAGE = 5;

// Files to skip (handle manually)
// poplin_1_al_14_adulto_y_ni_o: source photo shows fabric rolls (tela), NOT a finished garment — needs new photo
const SKIP_FILES = new Set(['kimono_encaje', 'poplin_1_al_14_adulto_y_ni_o']);

if (!fs.existsSync(WORK_DIR)) fs.mkdirSync(WORK_DIR);
if (!fs.existsSync(GOOD_DIR)) fs.mkdirSync(GOOD_DIR);

// ─── PER-FILE CUSTOM HINTS ───────────────────────────────────────────────────
// For source photos that are cropped, have overlays, or complex backgrounds
const CUSTOM_HINTS = {
    'camisaco': `\n\nSPECIAL INSTRUCTIONS FOR THIS IMAGE: This is a CAMISACO — a PLAID SHACKET (overshirt worn as a light outer jacket). The source is a mirror selfie of a woman wearing it. The camisaco has LARGE PLAID/CHECKERED SQUARES in BROWN/CAMEL, WHITE/CREAM, and DARK GRAY. It has a CLASSIC SHIRT COLLAR (NOT a hood), button-down front, a chest pocket on the left side, and long sleeves. It is oversized and hip-length. It is NOT a hoodie. Extract ONLY the plaid shirt-jacket. Remove the woman, her phone, the cap, mirror frame, and bedroom. IMPORTANT: Do NOT add any brand logos, labels, or text to the garment in the output.`,

    'campera_con_piel': `\n\nSPECIAL INSTRUCTIONS FOR THIS IMAGE: The source shows 4 zip-up hoodies on wooden hangers on a wall — olive/green (far left), BLACK (second), WINE/BURGUNDY (third), GRAY (far right). Extract ONLY the BLACK HOODIE (second from left). It is a full-zip hoodie with: hood, long sleeves with ribbed cuffs, a front kangaroo-style pocket at the waist, ribbed hem, and a warm fleece/fur lining inside. Show ONLY this single black hoodie floating on the #F0F0F0 background. Remove all other hoodies and hangers.`,

    'camperas_de_jean': `\n\nSPECIAL INSTRUCTIONS FOR THIS IMAGE: The source shows a woman in a store wearing a SHORT BLACK DENIM JACKET with SILVER RHINESTONE/STUD DECORATIONS at the collar and shoulder areas. The jacket has: cropped/short length, silver decorative round buttons down the front, studded rhinestone embellishments at the top of each lapel and shoulder, a classic denim jacket collar, and long sleeves. There is a ZARA price tag hanging — remove it. Remove the woman, the animal-print blue top she is wearing underneath, and the busy store background with other garments. Show ONLY the black denim jacket with its silver studs clearly visible.`,

    'campera_jean_especial': `\n\nSPECIAL INSTRUCTIONS FOR THIS IMAGE: The source shows a classic BLUE DENIM JACKET on a mannequin. There is red text reading "campera especial de 6 al 9" — ERASE this text completely. Remove the mannequin. Show ONLY the blue denim jacket: spread collar, gold metal buttons, 2 chest pockets, long sleeves with button cuffs. CRITICAL: The jacket is shown open/unbuttoned, creating a gap between the two jacket fronts. After removing the mannequin, DO NOT leave a white or blank hole in the center gap. Fill the area between the jacket panels naturally with the jacket's inner facing/lining fabric (dark denim or a neutral fabric). The jacket must look SOLID with NO transparent or white area in the center.`,

    'campera_lanilla': `\n\nSPECIAL INSTRUCTIONS FOR THIS IMAGE: This product is a LANILLA ZIP JACKET — a full-zip jacket made entirely of thin knit wool fabric. It has long sleeves, a ribbed collar, ribbed cuffs, and NO HOOD. It is NOT a hoodie.\n\nCRITICAL — COLOR: Show this jacket in ONE SINGLE SOLID DARK NAVY BLUE color. The entire jacket — chest, back, sleeves, collar — must be the SAME solid navy blue color. NO mixed patterns, NO patchwork, NO horizontal color bands, NO floral or ethnic prints. Just a clean, solid-colored navy blue knit zip jacket. The fabric texture should look like fine knit wool.\n\nShow the jacket fully upright and centered on #F0F0F0 background.`,

    'saco_abierto': `\n\nSPECIAL INSTRUCTIONS FOR THIS IMAGE: This is a LONG OPEN-FRONT KNIT CARDIGAN (saco abierto largo). It is MAXI length (well below the knee), has NO buttons or zipper (completely open front), and features large COLOR-BLOCK sections in PINK (rose), GRAY, and BLACK. The source is a phone screenshot showing a mannequin with a HAT on its head, an owl necklace, white inner top, and black pants. CRITICAL: Remove ALL of these completely — especially the HAT, which must NOT appear in the output. Show ONLY the long cardigan floating on #F0F0F0 background. Do NOT invent or add any accessory (no hat, no necklace, no jewelry). The garment is ONLY the cardigan. CRITICAL: The open-front design means the center gap between the two front panels will show the background — this background MUST be #F0F0F0 GRAY, absolutely NOT white. Show the cardigan with the front panels slightly angled toward each other to minimize the center gap.`,

    'saco_tricolor': `\n\nSPECIAL INSTRUCTIONS FOR THIS IMAGE: The product is the CENTER garment on the hanger — a LONG OPEN-FRONT KNIT CARDIGAN with wide HORIZONTAL STRIPE color blocks in FUCHSIA/PINK, GRAY, and BLACK. It is maxi length (knee-length or longer), has long sleeves, and an open front with no closure. The hanger and all other garments visible left and right must be removed. Show ONLY this pink/gray/black striped cardigan on a clean #F0F0F0 background, centered and floating.`,

    'tapado_nacional': `\n\nSPECIAL INSTRUCTIONS FOR THIS IMAGE: The source is a flat-lay of a BLACK PUFFER COAT (tapado) on a gray textured surface. The coat has: diagonal CHEVRON-pattern quilting stitching, a WHITE/SILVER front zipper, two zippered side pockets, and a HOOD with a prominent BEIGE/CAMEL FUR TRIM around the face opening (like a subtle lion's mane). Show the coat UPRIGHT/FLOATING as a product photo — lift it from the flat-lay position. The hood must be visible at the top with its fur trim clearly shown. The coat is medium-long length. Remove the gray floor/surface completely.`,

    'campera_engomada_elastizada': `\n\nSPECIAL INSTRUCTIONS FOR THIS IMAGE: The source is a CROPPED SIDE/LATERAL view of a dark brown biker-style jacket being worn. The jacket has quilted diamond-pattern elbow panels and a silver front zipper. Show the jacket FRONT-FACING, centered. Reconstruct what is necessary to complete the front view. Keep the exact dark brown "engomada" (coated) fabric texture and all original details.`,

    'calzas_sublimadas_importadas': `\n\nSPECIAL INSTRUCTIONS FOR THIS IMAGE: The product is a pair of SUBLIMATED LEGGINGS in a PINK and PURPLE HONEYCOMB/BUBBLE geometric print. The source photo only shows from the waist to the upper thigh — the lower half is cut off. Complete the full legging from waist to ankle using the same pink/purple honeycomb pattern throughout the entire leg. The waistband is high-waisted with a small logo tag. Show the complete legging pair.`,

    'chalecos': `\n\nSPECIAL INSTRUCTIONS FOR THIS IMAGE: This is a CHALECO — a VEST (sleeveless jacket). It has NO sleeves — the armholes are open. It may have a zipper or buttons at the front, a collar or hood, and pockets. Show ONLY the vest floating on #F0F0F0 background, centered. Remove mannequin, hanger, background, and any model. IMPORTANT: The garment MUST be a VEST (no sleeves). If the source shows multiple vests, pick the most visible one.`,

    'chalecos_puffer': `\n\nSPECIAL INSTRUCTIONS FOR THIS IMAGE: This is a CHALECO PUFFER — a PUFFER VEST (sleeveless puffer jacket). It is a quilted/puffed vest with NO SLEEVES — the armholes are completely open. It has a zipper at the front and a collar (may have a hood). The puffer panels are stitched in horizontal lines. Show ONLY the puffer vest floating on #F0F0F0 background, centered. Remove mannequin, hanger, background, and any model. IMPORTANT: The garment MUST have NO sleeves — it is a vest.`,
};

// ─── GARMENT TYPE DETECTION ──────────────────────────────────────────────────
function getExpectedGarmentType(baseName) {
    const n = baseName.toLowerCase();
    if (/short|shorts|bermuda|ba.o/.test(n)) return 'SHORTS or SWIM SHORTS (a bottom garment, NOT a shirt or top)';
    // Chaleco = vest (sleeveless) — check before generic jacket
    if (/chaleco/.test(n)) return 'VEST (sleeveless outerwear — NO sleeves, open armholes)';
    // Check campera/jacket BEFORE jean so "campera_jean" is classified as JACKET, not PANTS
    if (/campera|buzo|sweater|saco|kimono|ruanas|polar|sudadera|superpuesta|peluche|plush|puffer|rompeviento/.test(n)) return 'JACKET, HOODIE, or OUTERWEAR (a top outer layer)';
    if (/pantalon|pantal|jean|jogger|babucha|palazzo|palazos|palazo|biker|corte.chino|wid.leg|win.leg|wide.leg|capri|elephant|tiro.fino|pitbull|pilu/.test(n)) return 'PANTS or TROUSERS (a bottom garment, NOT a shirt or top)';
    if (/vestido|mono/.test(n)) return 'DRESS or JUMPSUIT (a full-length garment)';
    if (/conjunto|seamless|catsuit/.test(n)) return 'MATCHING SET — show ALL pieces of the outfit together (e.g., both the top/jacket AND the bottom/pants laid out together, not just one piece)';
    if (/media|accesorio/.test(n)) return 'ACCESSORY (socks or similar)';
    if (/remera|camiseta|polera|musculosa|crop|camisola|poplin|camisaco|lurex/.test(n)) return 'T-SHIRT, TANK TOP, or BLOUSE (a top garment)';
    return null;
}

// ─── GENERATION PROMPT ───────────────────────────────────────────────────────
const GEN_PROMPT = `TASK: High-end e-commerce product photo CLEANUP — NOT generation.

⚠️ CRITICAL: This is a CLEANUP task, NOT a free generation task. You MUST work EXCLUSIVELY from the actual garment shown in the input photo. DO NOT invent, imagine, or generate any garment from scratch. The output garment must be the EXACT same garment from the input photo — same style, same cut, same color, same print, same fabric texture, same details. If the input shows a denim jacket, output a denim jacket. If it shows a floral dress, output a floral dress. NEVER substitute with a different garment.

You are given a photo of a clothing garment. The garment may be on a model, on a mannequin, on a hanger, on a flat surface, or held by hand. Your ONLY task is:
1. REMOVE everything that is NOT the garment: remove the background, remove any mannequin or plastic torso, remove any human body (neck, arms, hands), remove any hanger or holder. ALSO remove: any text overlays, price tags, watermarks, social media interface elements (Instagram stories UI, timestamps, usernames, buttons), store shelf/rack elements, other garments hanging nearby, price labels, and any other non-garment elements.
2. Show ONLY the clothing item alone, completely isolated, as if it were floating on a plain background.
3. BACKGROUND: Replace with a clean, flat, studio LIGHT GRAY (#F0F0F0) background. The background MUST be #F0F0F0 gray — NOT white, NOT off-white, NOT cream. A pure white (#FFFFFF) background is WRONG.
4. CENTER the garment perfectly in the frame with even padding on all sides.
5. Apply SOFT studio lighting so the garment looks well-lit and professional, highlighting fabric texture and color faithfully.
6. Add a very subtle, soft drop shadow directly under the garment to give it grounding.
7. DO NOT change, alter, reshape, or resize the garment itself. Keep its exact original shape, proportions, length, and color perfectly intact.
8. DO NOT remove, add, or modify any graphic, logo, button, zipper, or stitching present on the garment.
9. DO NOT add any new garment items that are not in the input photo.
9b. CRITICAL — SLEEVES: If the garment has sleeves (short or long), they MUST appear COMPLETE in the final image. NEVER crop, cut, or clip the sleeve tips or cuffs. The full sleeve from shoulder to hem must be visible. If needed, zoom out to fit the entire garment including sleeves.
10. FILL ALL HOLES: If there are ANY hollow, transparent, or white/blank areas INSIDE the garment (where a mannequin torso was), fill them COMPLETELY with the natural fabric color and texture of the garment. This includes chest area, torso, waist, or any internal gap. The garment must look fully SOLID — no holes, no transparent gaps, no white or empty spaces inside the clothing shape.
11. DO NOT add any person, mannequin, body part, or hanger in the final output.
12. The final image must be square or portrait-oriented (4:5 ratio) and look like a premium e-commerce product photo.
13. FIDELITY CHECK: Before outputting, verify that the garment in your output is the SAME garment as in the input. Same type, same color, same print. If it looks different, redo it.

Output ONLY the final cleaned image. No text, no grids, no watermarks.`;

// ─── REVIEW PROMPT ────────────────────────────────────────────────────────────
const REVIEW_PROMPT = `You are a strict quality control inspector for a high-end clothing e-commerce store.
Review this product image and answer ONLY with a JSON object like this:
{
  "pass": true or false,
  "issues": ["list of issues if any, empty array if none"]
}

CRITERIA TO PASS (ALL must be true):
1. BACKGROUND: The background must be a plain light-gray (#F0F0F0) color. A pure white (#FFFFFF) background is a FAIL — it means the background was not properly replaced. A busy, photographic, or colored background is also a FAIL.
2. NO mannequin body, plastic torso, neck, head, arms, or hands must be visible anywhere in the image.
3. NO hanger, hook, surface, floor, or holder must be visible.
4. The garment must be the MAIN and ALMOST ONLY element in the image.
5. GARMENT MUST BE CLEARLY VISIBLE: The image must show an actual clothing item occupying a significant portion of the frame. If the image is mostly blank, all-gray, all-white, or nearly empty with only a faint or tiny garment, it is a FAIL. A completely blank or featureless image is always a FAIL.
6. The garment must look like a real, complete clothing item (not deformed beyond recognition, not a sketch, not a silhouette).
7. SLEEVES MUST BE COMPLETE: If the garment has sleeves (short or long), the full sleeve including the cuff/hem must be visible. A sleeve that is cropped or cut off at the edge of the frame is a FAIL.
8. NO INTERNAL HOLES: The garment must look fully solid. There must be NO white, blank, transparent, or hollow areas INSIDE the clothing shape (remnants of a removed mannequin torso). If a hole or gap is visible inside the garment body, it is a FAIL.

If ALL criteria are met → "pass": true
If even ONE criterion is violated → "pass": false and list the issues.

Respond ONLY with the JSON. No extra text.`;

// ─── API CALLS ────────────────────────────────────────────────────────────────
async function generateImage(imageBase64, outputPath, typeHint = '', attempt = 1) {
    const url = `https://aiplatform.googleapis.com/v1/publishers/google/models/${GENERATION_MODEL}:streamGenerateContent?key=${API_KEY}`;
    const payload = {
        contents: [{
            role: "user", parts: [
                { inline_data: { mime_type: "image/jpeg", data: imageBase64 } },
                { text: GEN_PROMPT + typeHint }
            ]
        }],
        generationConfig: { responseModalities: ["IMAGE", "TEXT"], temperature: 0.1 }
    };
    try {
        const res = await axios.post(url, payload, { headers: { 'Content-Type': 'application/json' }, timeout: 120000 });
        const chunks = Array.isArray(res.data) ? res.data : [res.data];
        for (const chunk of chunks) {
            for (const part of (chunk?.candidates?.[0]?.content?.parts || [])) {
                if (part.inlineData?.mimeType?.startsWith('image/')) {
                    fs.writeFileSync(outputPath, Buffer.from(part.inlineData.data, 'base64'));
                    return 'success';
                }
            }
        }
        return 'no_image';
    } catch (err) {
        const status = err.response?.status;
        if (status === 429 && attempt <= 5) {
            const wait = Math.min(60000, 5000 * Math.pow(2, attempt));
            console.log(`     [429] Esperando ${wait / 1000}s...`);
            await new Promise(r => setTimeout(r, wait));
            return generateImage(imageBase64, outputPath, typeHint, attempt + 1);
        }
        console.error(`     [GEN ERROR] ${status}: ${JSON.stringify(err.response?.data || err.message).substring(0, 150)}`);
        return 'error';
    }
}

async function reviewImage(imagePath, expectedType = null) {
    const url = `https://aiplatform.googleapis.com/v1/publishers/google/models/${REVIEW_MODEL}:generateContent?key=${API_KEY}`;
    const imageBase64 = fs.readFileSync(imagePath, { encoding: 'base64' });
    const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
    let reviewText = REVIEW_PROMPT;
    if (expectedType) {
        reviewText += `\n\n9. GARMENT TYPE CHECK: The expected garment type for this product is: ${expectedType}. The image MUST show this type of garment. If it shows a different type (e.g., a shirt when pants or shorts are expected), it FAILS. Answer "pass": false if the garment type does not match.`;
    }
    const payload = {
        contents: [{
            role: "user", parts: [
                { inline_data: { mime_type: mimeType, data: imageBase64 } },
                { text: reviewText }
            ]
        }],
        generationConfig: { temperature: 0.0, maxOutputTokens: 256 }
    };
    try {
        const res = await axios.post(url, payload, { headers: { 'Content-Type': 'application/json' }, timeout: 30000 });
        const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return { pass: false, issues: ['No se pudo parsear la respuesta del revisor'] };
    } catch (err) {
        return { pass: false, issues: [`Error en revisión: ${err.message}`] };
    }
}

// ─── MAIN LOOP ────────────────────────────────────────────────────────────────
async function processUntilGood(inputPath) {
    const fileName = path.basename(inputPath);
    const baseName = fileName.replace(/\.(jpg|jpeg|png)$/i, '');
    const outputName = `${baseName}.png`;
    const workPath = path.join(WORK_DIR, outputName);
    const goodPath = path.join(GOOD_DIR, outputName);

    // Manual skip list
    if (SKIP_FILES.has(baseName)) {
        console.log(`  ⏭️  [SALTEAR MANUAL] ${outputName}`);
        return 'already_done';
    }

    // Already approved → skip
    if (fs.existsSync(goodPath)) {
        console.log(`  ✅ [YA APROBADA] ${outputName}`);
        return 'already_done';
    }

    const expectedType = getExpectedGarmentType(baseName);
    const customHint = CUSTOM_HINTS[baseName] || '';
    const typeHint = (expectedType
        ? `\n\nIMPORTANT: The product being photographed is a ${expectedType}. Make sure the final image shows ONLY this type of garment.`
        : '') + customHint;

    if (expectedType) {
        console.log(`  🏷️  Tipo esperado: ${expectedType}`);
    }
    if (customHint) {
        console.log(`  📌 Instrucciones especiales aplicadas para: ${baseName}`);
    }

    const imageBase64 = fs.readFileSync(inputPath, { encoding: 'base64' });

    for (let attempt = 1; attempt <= MAX_RETRIES_PER_IMAGE; attempt++) {
        console.log(`\n  🎨 Generando (intento ${attempt}/${MAX_RETRIES_PER_IMAGE}): ${outputName}`);

        // Generate
        const genResult = await generateImage(imageBase64, workPath, typeHint);
        await new Promise(r => setTimeout(r, DELAY_MS));

        if (genResult !== 'success') {
            console.log(`     [FAIL] Generación fallida: ${genResult}`);
            if (fs.existsSync(workPath)) fs.unlinkSync(workPath);
            continue;
        }

        // Review
        console.log(`  🔍 Revisando calidad...`);
        const review = await reviewImage(workPath, expectedType);
        await new Promise(r => setTimeout(r, 1000));

        if (review.pass) {
            // Move to good folder
            fs.copyFileSync(workPath, goodPath);
            fs.unlinkSync(workPath);
            console.log(`  ✅ APROBADA → Buenas Imagenes/${outputName}`);
            return 'approved';
        } else {
            console.log(`  ❌ RECHAZADA: ${review.issues.join(' | ')}`);
            console.log(`     Reintentando...`);
            if (fs.existsSync(workPath)) fs.unlinkSync(workPath);
        }
    }

    // Exhausted retries - move best attempt (re-generate one last time and accept)
    console.log(`  ⚠️  [MAX REINTENTOS] ${outputName} - generando última versión y aceptando...`);
    await generateImage(imageBase64, workPath, typeHint);
    if (fs.existsSync(workPath)) {
        fs.copyFileSync(workPath, goodPath);
        fs.unlinkSync(workPath);
    }
    return 'max_retries';
}

async function main() {
    const args = process.argv.slice(2);
    const testMode = args.includes('--test');

    let files = fs.readdirSync(INPUT_DIR)
        .filter(f => /\.(jpg|jpeg|png)$/i.test(f))
        .map(f => path.join(INPUT_DIR, f));

    if (testMode) {
        files = files.slice(0, 3);
        console.log(`\n🧪 TEST MODE: ${files.length} imágenes`);
    } else {
        console.log(`\n🚀 INICIANDO PROCESO CON AUTO-REVISIÓN`);
        console.log(`   📁 Total a procesar: ${files.length} imágenes`);
        console.log(`   📂 Aprobadas → Catalog_Images_Processed/Buenas Imagenes/`);
        console.log(`   🔁 Máximo reintentos por imagen: ${MAX_RETRIES_PER_IMAGE}`);
    }

    let approved = 0, maxRetries = 0, alreadyDone = 0;

    for (let i = 0; i < files.length; i++) {
        const result = await processUntilGood(files[i]);
        if (result === 'approved') approved++;
        else if (result === 'already_done') { approved++; alreadyDone++; }
        else maxRetries++;

        if ((i + 1) % 10 === 0 || i + 1 === files.length) {
            const goodCount = fs.readdirSync(GOOD_DIR).filter(f => f.endsWith('.png')).length;
            console.log(`\n📊 Progreso: ${i + 1}/${files.length} procesadas | ✅ En "Buenas Imagenes": ${goodCount}/${files.length}`);
        }
    }

    console.log(`\n========== PROCESO COMPLETO ==========`);
    console.log(`✅ Aprobadas esta sesión: ${approved}`);
    console.log(`⚠️  Aceptadas por máx reintentos: ${maxRetries}`);
    const goodCount = fs.readdirSync(GOOD_DIR).filter(f => f.endsWith('.png')).length;
    console.log(`📂 Total en Buenas Imagenes: ${goodCount}/${files.length}`);
}

main();
