const fs = require('fs');
const catalog = require('./guey_catalog_verified.json');

let output = 'Listado final de **68 productos** que todavía dicen "Consultar" (no encontré números ocultos automáticos). Pasame los precios escribiendo como quieras, por ejemplo: "Del 1 al 10 valen 15000":\n\n';
let count = 1;

catalog.forEach(p => {
    let pBase = p.base_price;
    if (p.price_type === 'No Price' || !pBase || pBase === 0 || pBase === 'Consultar') {
        output += count + '. **' + p.corrected_title + '**\n';
        count++;
    }
});

fs.writeFileSync('price_issues_68.txt', output);
