const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'Export_Stitch_HTML', 'Home_Catalog_Full.html');
const imgDir = path.join(__dirname, 'Catalog_Images');

const html = fs.readFileSync(htmlPath, 'utf8');

const regex = /src="\/Catalog_Images\/([^"]+\.jpg)"/g;
let match;
let missingCount = 0;
let totalCount = 0;

while ((match = regex.exec(html)) !== null) {
    totalCount++;
    const filename = match[1];
    const fullPath = path.join(imgDir, filename);
    if (!fs.existsSync(fullPath)) {
        console.log(`MISSING: ${filename}`);
        missingCount++;
    }
}

console.log(`Total images checked: ${totalCount}`);
if (missingCount > 0) {
    console.log(`MISSING IMAGES: ${missingCount}`);
} else {
    console.log(`ALL IMAGES EXIST.`);
}
