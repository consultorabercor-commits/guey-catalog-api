const fs = require('fs'), path = require('path');
const GOOD = path.join(__dirname, 'Catalog_Images_Processed', 'Buenas Imagenes');
const SRC = path.join(__dirname, 'Catalog_Images');

const goodFiles = new Set(fs.readdirSync(GOOD).filter(f => f.endsWith('.png')).map(f => f.replace('.png', '')));
const srcFiles = fs.readdirSync(SRC).filter(f => /\.(jpg|jpeg|png)$/i.test(f)).map(f => f.replace(/\.(jpg|jpeg|png)$/i, ''));

const missing = srcFiles.filter(f => !goodFiles.has(f));
console.log('Faltantes (' + missing.length + '):');
missing.forEach(f => console.log(' -', f));
console.log('\nTotal aprobadas:', goodFiles.size, '/ Total fuente:', srcFiles.length);
