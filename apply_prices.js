const fs = require('fs');
const catalog = require('./guey_catalog_verified.json');

// Prices provided by user for the 68 "Consultar" items (indexed 1-based)
// Format: { price, sale_price (optional - original/crossed price) }
const priceMap = {
    1: { price: 21500 },
    // 2 was #2 "Camisola Lino" - was already touched in previous run, skip
    3: { price: 13900 },
    4: { price: 6900 },
    5: { price: 14900, original_price: 15900 }, // SALE
    6: { price: 19000 },
    7: { price: 21900 },
    8: { price: 49000 },
    9: { price: 22000, original_price: 25000 }, // SALE
    10: { price: 28900 },
    11: { price: 5900 },
    12: { price: 9000, original_price: 9900 }, // SALE
    13: { price: 8900 },
    14: { price: 39900 },
    15: { price: 7800 },
    16: { price: 12000 },
    17: { price: 69000 },
    18: { price: 39000 },
    19: { price: 4900 },
    20: { price: 14000 },
    21: { price: 12900 },
    22: { price: 11900 },
    23: { price: 21000 },
    24: { price: 21000 },
    25: { price: 19900 },
    26: { price: 12000 },
    27: { price: 22000 },
    28: { price: 21900 },
    29: { price: 6000, original_price: 6900 }, // SALE
    30: { price: 13900 },
    31: { price: 23900 },
    32: { price: 9900 },
    33: { price: 23900 },
    34: null, // $- means no price / consultar
    35: { price: 9900 },
    36: { price: 15000 },
    37: { price: 3900 },
    38: { price: 19000 },
    39: { price: 28900 },
    40: { price: 10900 },
    41: { price: 8900 },
    42: { price: 5900 },
    43: { price: 29000 },
    44: { price: 17000 },
    45: { price: 13900 },
    46: { price: 35000 },
    47: { price: 8900 },
    48: { price: 20900 },
    49: { price: 15900 },
    50: { price: 14900 },
    51: { price: 12900 },
    52: { price: 7900 },
    53: { price: 58000 },
    54: { price: 13900 },
    55: { price: 10900 },
    56: { price: 18900 },
    57: { price: 8900 },
    58: { price: 9900 },
    59: { price: 7900 },
    60: { price: 12000 },
    61: { price: 5000 },
    62: { price: 22900 },
    63: { price: 18000 },
    64: { price: 9900 },
    65: { price: 14500 },
    66: { price: 5900 },
    67: { price: 5900 },
    68: { price: 21500 }
};

let listIndex = 1;
let updated = 0;

const result = catalog.map(p => {
    const pBase = p.base_price;
    const hasNoPrice = p.price_type === 'No Price' || !pBase || pBase === 0 || pBase === 'Consultar';

    if (hasNoPrice) {
        const entry = priceMap[listIndex];
        listIndex++;

        if (entry) {
            p.base_price = entry.price;
            p.price_type = 'Fixed Price';
            if (entry.original_price) {
                p.original_price = entry.original_price; // shown as crossed-out
                p.is_sale = true;
            }
            updated++;
        }
        // if entry is null (e.g. $-), leave as Consultar
    }

    return p;
});

fs.writeFileSync('guey_catalog_verified.json', JSON.stringify(result, null, 2));
console.log('Updated ' + updated + ' products. Final list index reached: ' + (listIndex - 1));
