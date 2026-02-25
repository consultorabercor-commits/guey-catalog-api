const fs = require('fs');
const path = require('path');

const imgDir = path.join(__dirname, 'Catalog_Images');
const files = fs.readdirSync(imgDir).filter(f => f.endsWith('.jpg'));

let recoveredCount = 0;
let alreadyValidCount = 0;
let failedCount = 0;

for (const file of files) {
    const filePath = path.join(imgDir, file);
    const buffer = fs.readFileSync(filePath);

    // Check if already valid (starts with FF D8 FF)
    if (buffer.length > 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
        alreadyValidCount++;
        continue;
    }

    const startIdx = buffer.indexOf(Buffer.from([0xFF, 0xD8, 0xFF]));

    if (startIdx !== -1) {
        const recovered = buffer.slice(startIdx);
        fs.writeFileSync(filePath, recovered);
        recoveredCount++;
    } else {
        // Fallback for WEBP or PNG if they exist
        console.log(`Failed to find JPEG marker in ${file}`);
        failedCount++;
    }
}

console.log(`\nRecovery Complete!`);
console.log(`Recovered: ${recoveredCount}`);
console.log(`Already Valid: ${alreadyValidCount}`);
console.log(`Failed: ${failedCount}`);
