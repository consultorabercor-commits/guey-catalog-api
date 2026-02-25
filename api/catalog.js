export default function handler(request, response) {
    const catalog = require('../guey_catalog_verified.json');
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET');
    response.status(200).json(catalog);
}
