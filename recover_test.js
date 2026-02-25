const fs = require('fs');
const path = require('path');

const imgPath = path.join(__dirname, 'Catalog_Images', '7900.jpg');
const buffer = fs.readFileSync(imgPath);

// Search for the JPEG start marker: FF D8 FF
const startIdx = buffer.indexOf(Buffer.from([0xFF, 0xD8, 0xFF]));

if (startIdx !== -1) {
    console.log(`Found JPEG start marker at offset: ${startIdx}`);
    const recovered = buffer.slice(startIdx);
    fs.writeFileSync(path.join(__dirname, 'Catalog_Images', '7900_recovered.jpg'), recovered);
    console.log(`Recovered image saved! Check if 7900_recovered.jpg is readable.`);
} else {
    console.log(`Could not find JPEG start marker.`);
}
