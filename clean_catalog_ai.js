const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_KEY = "AQ.Ab8RN6IOHi89jSwFj-NA7MoAgtBsqeJp_n8xa_bZCLfSDkW-TQ";
const CATALOG_IN = path.join(__dirname, 'guey_catalog_clean.json');
const IMAGES_DIR = path.join(__dirname, 'Catalog_Images_Processed');
const OUTPUT_FILE = path.join(__dirname, 'guey_catalog_verified.json');
const MODEL = 'gemini-2.0-flash'; // using stable 2.0 flash
const DELAY_MS = 3000;

// To track which filenames we generated (same logic as build_catalog.js)
const assignedNames = {};

const PROMPT = `You are an expert e-commerce catalog manager and proofreader.
Your task is to analyze the provided product image and its raw text data from WhatsApp, and return a clean, structured JSON object.

Raw WhatsApp Data:
Title: "{TITLE}"
Description: "{DESC}"
Price Field: "{PRICE}"

Instructions:
1. CORRECT SPELLING & SPANISH ONLY: Fix typos in the title and description (e.g. "Swetter" -> "Sweater", "win leg" -> "wide leg", "bengalina" -> "bengalina"). EVERYTHING MUST REMAIN IN RIOPLATENSE SPANISH. NEVER TRANSLATE TO ENGLISH.
2. FORMAT TITLE: Make the title Title Case.
3. EXTRACT PRICES & VARIANTS: The description often contains complex pricing (e.g., "$3500 talles 1 al 5 y $4900 6 al 10"). 
   - Identify the lowest baseline price as "base_price" (number, eg 16000, NOT 16).
   - If there are multiple prices depending on size/quantity/variant, set "price_type" to "VARIABLE", and populate the "variants" array with objects like {"condition": "Talles 1 al 5", "price": 3500}.
   - If it's a single price, set "price_type" to "SINGLE" and leave "variants" empty.
   - Ignore prices that say "0.00" or empty unless there's an actual price in the description. ALWAYS keep zeros, Argentine prices are in the thousands (e.g. 15000).
4. CLEAN DESCRIPTION: Write a clean, professional product description free of pricing clutter. Keep it concise, ALWAYS IN SPANISH. DO NOT hallucinate features.
5. IMAGE VERIFICATION: Look at the image. Does it match the product being sold? (e.g., if title says "Pantalon" but image shows only a hat, set image_matches_text to false).
   - If false, provide a short "mismatch_reason" in Spanish. If true, leave mismatch_reason empty.

Respond ONLY with valid JSON matching this schema:
{
  "type": "object",
  "properties": {
    "corrected_title": { "type": "string" },
    "corrected_description": { "type": "string" },
    "price_type": { "type": "string", "enum": ["SINGLE", "VARIABLE"] },
    "base_price": { "type": "number", "description": "Lowest integer price" },
    "variants": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "condition": { "type": "string", "description": "e.g., 'Talle 6 al 10'" },
          "price": { "type": "number" }
        },
        "required": ["condition", "price"]
      }
    },
    "image_matches_text": { "type": "boolean" },
    "mismatch_reason": { "type": "string" }
  },
  "required": ["corrected_title", "corrected_description", "price_type", "base_price", "variants", "image_matches_text", "mismatch_reason"]
}`;

async function processProduct(prod, iterIndex) {
    const safeTitleRaw = (prod.title || 'Unknown').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    let fileNameKey = safeTitleRaw;
    let iter = 1;

    while (assignedNames[fileNameKey] && assignedNames[fileNameKey] !== iterIndex) {
        fileNameKey = `${safeTitleRaw}_${iter}`;
        iter++;
    }
    assignedNames[fileNameKey] = iterIndex;

    const imgPath = path.join(IMAGES_DIR, `${fileNameKey}.png`);
    let imageBase64 = "";

    if (fs.existsSync(imgPath)) {
        imageBase64 = fs.readFileSync(imgPath, { encoding: 'base64' });
    } else {
        console.warn(`[WARN] Image not found for ${prod.title}: ${fileNameKey}.png`);
        return null;
    }

    const compiledPrompt = PROMPT
        .replace("{TITLE}", prod.title)
        .replace("{DESC}", prod.price || "") // Note: old script put description in 'price' field
        .replace("{PRICE}", prod.original_price || "");

    const url = `https://aiplatform.googleapis.com/v1/publishers/google/models/${MODEL}:generateContent?key=${API_KEY}`;

    const payload = {
        contents: [{
            role: "user",
            parts: [
                { inline_data: { mime_type: "image/png", data: imageBase64 } },
                { text: compiledPrompt }
            ]
        }],
        generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1
        }
    };

    try {
        const res = await axios.post(url, payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 60000
        });

        const textResponse = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textResponse) {
            const parsed = JSON.parse(textResponse);
            // Append original ids and paths
            parsed.original_id = prod.id;
            parsed.original_title = prod.title;
            parsed.image_file = `${fileNameKey}.png`;
            return parsed;
        }
    } catch (err) {
        console.error(`[ERR] Failed analyzing ${prod.title}:`, err.response?.data?.error || err.message);
    }
    return null;
}

async function main() {
    const args = process.argv.slice(2);
    const testMode = args.includes('--test');

    const products = JSON.parse(fs.readFileSync(CATALOG_IN, 'utf8'));

    // Find specific objects to test if in test mode
    let targetProducts = products;
    if (testMode) {
        console.log("🧪 TEST MODE: Finding specific known issue items...");
        targetProducts = products.filter(p =>
            p.title.toLowerCase().includes("blazer bengalina") ||
            p.title.toLowerCase().includes("short algodón") ||
            p.title.toLowerCase().includes("buzos algodon") ||
            p.title.toLowerCase().includes("chalecos") ||
            p.title.toLowerCase().includes("swetter")
        ).slice(0, 5); // Take up to 5 examples of problematic items
    }

    console.log(`🚀 Starting AI Processing for ${targetProducts.length} items...`);
    const results = [];

    for (let i = 0; i < targetProducts.length; i++) {
        process.stdout.write(`Analyzing [${i + 1}/${targetProducts.length}]: ${targetProducts[i].title}... `);
        const result = await processProduct(targetProducts[i], i);

        if (result) {
            results.push(result);
            process.stdout.write(`OK (${result.price_type})\n`);
            if (testMode) {
                console.log(JSON.stringify(result, null, 2));
            }
        } else {
            process.stdout.write(`FAIL\n`);
        }

        if (i < targetProducts.length - 1) {
            await new Promise(r => setTimeout(r, DELAY_MS));
        }
    }

    const outPath = testMode ? OUTPUT_FILE.replace('.json', '_test.json') : OUTPUT_FILE;
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
    console.log(`\n✅ Finished! Saved ${results.length} items to ${outPath}`);
}

main();
