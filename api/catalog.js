export default function handler(request, response) {
    const catalog = require('../guey_catalog_verified.json');

    // Transform catalog items to include 4 photos as an array
    const processedCatalog = catalog.map(prod => {
        let photos = [];
        if (prod.image_url) {
            const rawBase = prod.image_url.replace('.jpg', '.png');
            photos = [
                rawBase,
                rawBase.replace('.png', '_back.png'),
                rawBase.replace('.png', '_diag_left.png'),
                rawBase.replace('.png', '_diag_right.png')
            ];
        } else {
            const imgName = (prod.image_file || "").replace('.jpg', '');
            if (imgName) {
                const baseUrl = `https://raw.githubusercontent.com/consultorabercor-commits/guey-catalog-api/main/Catalog_Images_Processed/${imgName}`;
                photos = [
                    `${baseUrl}.png`,
                    `${baseUrl}_back.png`,
                    `${baseUrl}_diag_left.png`,
                    `${baseUrl}_diag_right.png`
                ];
            }
        }

        return {
            ...prod,
            photos: photos
        };
    });

    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET');
    response.status(200).json(processedCatalog);
}
