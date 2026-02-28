const fs = require('fs');
const catalogPath = 'guey_catalog_verified.json';
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

// 1. Nuevos productos
const newProducts = [
    {
        "id": Date.now() + 1,
        "original_title": "Paisana fibrana",
        "corrected_title": "Paisana Fibrana Estampada",
        "category": "Prendas Superiores",
        "base_price": 15000,
        "description": "Paisana de fibrana estampada con variedad de diseños y excelente caída.",
        "image": "paisana_fibrana.png"
    },
    {
        "id": Date.now() + 2,
        "original_title": "Remeron lanilla",
        "corrected_title": "Remeron Lanilla y Modal Soft",
        "category": "Prendas Superiores",
        "base_price": 9900,
        "description": "Remeron suave talle único en lanilla y modal soft talles 3 al 8.",
        "image": "remeron_lanilla.png"
    }
];

newProducts.forEach(p => {
    if (!catalog.find(c => c.original_title.toLowerCase() === p.original_title.toLowerCase())) {
        catalog.push(p);
    }
});

// 2. Actualización de precios
const priceUpdates = {
    "Buzos algodon": 16900,
    "Solera seda fría": 15900,
    "Chalecos": 11000,
    "Pantalón lanilla": 9900,
    "Poleras modal": 4900,
    "Campera jean especial": 29000,
    "Jogger gabardina elastizados Cargo": 18900,
    "Babucha rustica y friza": 9900,
    "Shorts Baño": 5900,
    "Biker liso": 4900,
    "Pantalón Náutico": 19000,
    "Sudaderas": 7900,
    "Camperas de jean": 28000,
    "Calzas frizadasy sin friza": 7900,
    "Simil cuero de hombre": 35000
};

Object.keys(priceUpdates).forEach(name => {
    const p = catalog.find(c => c.original_title.toLowerCase() === name.toLowerCase() || c.corrected_title.toLowerCase() === name.toLowerCase());
    if (p) {
        p.base_price = priceUpdates[name];
        console.log(`Updated ${name} to ${priceUpdates[name]}`);
    }
});

fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));
console.log('--- ACTUALIZACIÓN COMPLETA ---');
console.log(`${newProducts.length} productos nuevos integrados.`);
console.log(`${Object.keys(priceUpdates).length} precios actualizados.`);
