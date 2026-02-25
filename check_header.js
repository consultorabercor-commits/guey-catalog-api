const fs = require('fs');
const buffer = fs.readFileSync('c:\\Users\\Agustin\\OneDrive\\Desktop\\Pagina Web M.C\\Catalog_Images\\7900.jpg');
console.log(buffer.slice(0, 20).toString('hex'));
