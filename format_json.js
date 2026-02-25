const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'guey_catalog_full.json');
const outputFile = path.join(__dirname, 'guey_catalog_clean.json');

try {
    let rawData = fs.readFileSync(inputFile, 'utf8');

    // Check if it's form encoded (e.g. data=%5B%7B%22title... )
    if (rawData.startsWith('data=')) {
        rawData = rawData.substring(5);
        // Replace + with space and uri decode
        rawData = decodeURIComponent(rawData.replace(/\+/g, ' '));
    }

    // Parse the JSON
    const products = JSON.parse(rawData);

    console.log(`Total Products Extracted: ${products.length}`);
    if (products.length > 0) {
        console.log('Sample Data (First Item):', products[0]);
        console.log('Sample Data (Middle Item):', products[Math.floor(products.length / 2)]);
    }

    // Save to clean formatted JSON
    fs.writeFileSync(outputFile, JSON.stringify(products, null, 2));
    console.log(`Clean JSON successfully saved to ${outputFile}`);
} catch (error) {
    console.error('Failed to parse or save data:', error.message);
}
