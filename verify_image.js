const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_KEY = "AQ.Ab8RN6IOHi89jSwFj-NA7MoAgtBsqeJp_n8xa_bZCLfSDkW-TQ";
const INPUT_DIR = path.join(__dirname, 'Catalog_Images');
const OUTPUT_DIR = path.join(__dirname, 'Catalog_Images_Processed');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

const testFile = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith('.jpg'))[0];
const testImagePath = path.join(INPUT_DIR, testFile);
const imageBase64 = fs.readFileSync(testImagePath, { encoding: 'base64' });

const PROMPT = `You are a professional e-commerce product photographer. Take this clothing photo and generate a new version of the exact same garment with:
- The same garment preserved exactly as-is (same colors, pattern, style)
- A clean neutral light gray studio background (#F2F2F2), no people, no hanger, no background props
- Professional 3-point studio lighting (Key, Fill, Backlight)
- Soft drop shadow at the base
- Invisible mannequin effect: the garment appears worn by an invisible person with natural 3D volume
- E-commerce catalog quality, ultra sharp

Output only the product image.`;

async function tryGeminiImageGen(modelName) {
    // Gemini 2.0 Flash Experimental can output images with responseModalities
    const url = `https://aiplatform.googleapis.com/v1/publishers/google/models/${modelName}:streamGenerateContent?key=${API_KEY}`;
    console.log(`\nTrying ${modelName}...`);

    const payload = {
        contents: [{
            role: "user",
            parts: [
                {
                    inline_data: {
                        mime_type: "image/jpeg",
                        data: imageBase64
                    }
                },
                { text: PROMPT }
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

        // streamGenerateContent returns array of chunks
        const chunks = Array.isArray(res.data) ? res.data : [res.data];
        for (const chunk of chunks) {
            const parts = chunk?.candidates?.[0]?.content?.parts || [];
            for (const part of parts) {
                if (part.inlineData?.mimeType?.startsWith('image/')) {
                    const outPath = path.join(OUTPUT_DIR, `result_gemini_${modelName.replace(/[/:@]/g, '_')}.png`);
                    fs.writeFileSync(outPath, Buffer.from(part.inlineData.data, 'base64'));
                    console.log(`✅ SUCCESS! Image saved: ${outPath}`);
                    return true;
                }
                if (part.text) console.log("Text response:", part.text.substring(0, 200));
            }
        }
        console.log("No image found in response.");
        return false;
    } catch (err) {
        const e = err.response ? JSON.stringify(err.response.data).substring(0, 500) : err.message;
        console.log(`✗ Failed: ${e}`);
        return false;
    }
}

async function main() {
    console.log(`📸 Testing with: ${testFile}\n`);

    // gemini-2.0-flash-exp supports image output via responseModalities
    const models = [
        'gemini-2.0-flash-exp',
        'gemini-2.0-flash-preview-image-generation',
        'gemini-2.0-flash'
    ];

    for (const m of models) {
        const ok = await tryGeminiImageGen(m);
        if (ok) {
            console.log(`\n🎉 Working model: ${m}`);
            break;
        }
    }
}

main();
