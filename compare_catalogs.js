const fs = require('fs');
const path = require('path');

const localCatalog = JSON.parse(fs.readFileSync('guey_catalog_verified.json', 'utf8'));
const waCatalog = [
    { "name": "Buzos algodon", "price": "ARS 16,900.00" },
    { "name": "Swetter importados", "price": "ARS 21,500.00" },
    { "name": "Solera seda fría", "price": "ARS 15,900.00" },
    { "name": "Chalecos", "price": "ARS 11,000.00" },
    { "name": "Buzo Gótico Lanilla", "price": "ARS 14,000.00" },
    { "name": "Conjunto anticelulitis", "price": "ARS 17,900.00" },
    { "name": "Pantalón lanilla", "price": "ARS 9,900.00" },
    { "name": "Campera con piel", "price": "ARS 19,000.00" },
    { "name": "Calzas Sublimadas importadas", "price": "ARS 11,000.00" },
    { "name": "Remeras lisas", "price": "ARS 4,900.00" },
    { "name": "Poleras modal", "price": "ARS 4,900.00" },
    { "name": "Campera jean especial", "price": "ARS 29,000.00" },
    { "name": "Maxi Campera peluche", "price": "ARS 15,000.00" },
    { "name": "Pantalón lanilla Morley", "price": "ARS 13,900.00" },
    { "name": "Jogger gabardina elastizados Cargo", "price": "ARS 18,900.00" },
    { "name": "Conjunto importado", "price": "ARS 17,500.00" },
    { "name": "Paisana fibrana", "price": "ARS 15,000.00" },
    { "name": "Musculosa sublimada", "price": "ARS 3,900.00" },
    { "name": "Buzo peluche corto", "price": "ARS 19,000.00" },
    { "name": "Babucha rustica y friza", "price": "ARS 9,900.00" },
    { "name": "Campera rompeviento unisex", "price": "ARS 28,900.00" },
    { "name": "Shorts Baño", "price": "ARS 5,900.00" },
    { "name": "Biker liso", "price": "ARS 4,900.00" },
    { "name": "Calzas anticelulitis", "price": "ARS 10,900.00" },
    { "name": "Pantalón Náutico", "price": "ARS 19,000.00" },
    { "name": "Campera bengalina", "price": "ARS 29,000.00" },
    { "name": "Conjunto fibrana", "price": "ARS 17,000.00" },
    { "name": "Remeron lanilla", "price": "ARS 11,000.00" },
    { "name": "Remeras lurex", "price": "ARS 13,900.00" },
    { "name": "Campera Símil cuero x docena", "price": "ARS 39,000.00" },
    { "name": "Pantalón lino", "price": "ARS 14,900.00" },
    { "name": "Saco Wafle", "price": "ARS 12,900.00" },
    { "name": "Sudaderas", "price": "ARS 7,900.00" },
    { "name": "Camperas de jean", "price": "ARS 28,000.00" },
    { "name": "Calzas frizadasy sin friza", "price": "ARS 7,900.00" },
    { "name": "Campera simil cuero", "price": "ARS 49,000.00" },
    { "name": "Simil cuero de hombre", "price": "ARS 35,000.00" },
    { "name": "Calzas sublimada", "price": "ARS 8,900.00" }
];

const newProducts = [];
const priceChanges = [];

waCatalog.forEach(waItem => {
    const localMatch = localCatalog.find(l =>
        l.original_title.toLowerCase() === waItem.name.toLowerCase() ||
        l.corrected_title.toLowerCase() === waItem.name.toLowerCase()
    );

    if (!localMatch) {
        newProducts.push(waItem);
    } else {
        const waPriceNum = parseInt(waItem.price.replace(/[^\d]/g, '')) / 100;
        if (localMatch.base_price !== waPriceNum && waPriceNum > 0) {
            priceChanges.push({
                name: waItem.name,
                old: localMatch.base_price,
                new: waPriceNum
            });
        }
    }
});

const results = { newProducts, priceChanges };
fs.writeFileSync('compare_results.json', JSON.stringify(results, null, 2));
console.log(`Resultados guardados en compare_results.json. ${newProducts.length} nuevos, ${priceChanges.length} cambios.`);
