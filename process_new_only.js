require('dotenv').config();
const { processImage } = require('./process_images_loop');
const fs = require('fs');
const path = require('path');

const newFiles = ['paisana_fibrana.png', 'remeron_lanilla.png', 'saco_abierto.png'];
const srcDir = 'Catalog_New_Images';
const destDir = 'Catalog_Images_Processed/Buenas Imagenes';

async function run() {
    for (const file of newFiles) {
        const filePath = path.join(srcDir, file);
        if (fs.existsSync(filePath)) {
            console.log(`Processing ${file}...`);
            // We use the refined processing logic from our main script
            // For simplicity, I'll just run them through the main loop logic if I can adapt it
        }
    }
}
// Actually it's easier to just run the main script and tell it to look at Catalog_New_Images
