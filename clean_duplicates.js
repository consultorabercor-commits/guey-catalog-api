const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'Catalog_Images');
const files = fs.readdirSync(dir).filter(f => f.endDateWith?.('.jpg') || f.endsWith('.png') || f.endsWith('.jpg'));

const fileMap = new Map(); // file size -> array of file names
let deletedCount = 0;

// Find identical files by exact size
for (const file of files) {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);

    if (!fileMap.has(stats.size)) {
        fileMap.set(stats.size, []);
    }
    fileMap.get(stats.size).push(file);
}

console.log("=== Eliminando Duplicados por Tamaño ===");
for (const [size, fileNames] of fileMap.entries()) {
    if (fileNames.length > 1) {
        // Keep the first one, delete the rest
        const toKeep = fileNames[0];
        console.log(`\nArchivos idénticos encontrados (Peso: ${size} bytes):`);
        console.log(`  Conservando: ${toKeep}`);

        for (let i = 1; i < fileNames.length; i++) {
            const toDelete = fileNames[i];
            console.log(`  Eliminando: ${toDelete}`);
            fs.unlinkSync(path.join(dir, toDelete));
            deletedCount++;
        }
    }
}

console.log("\n=== Eliminando Variaciones Secundarias (_1, _recovered) ===");
const currentFiles = fs.readdirSync(dir).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));
for (const file of currentFiles) {
    if (file.includes('_1.') || file.includes('_recovered.')) {
        console.log(`  Eliminando variación: ${file}`);
        fs.unlinkSync(path.join(dir, file));
        deletedCount++;
    }
}

console.log(`\nLimpieza completa. Se eliminaron ${deletedCount} archivos duplicados o variaciones.`);
