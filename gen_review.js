const fs = require('fs');
const path = require('path');

const d = JSON.parse(fs.readFileSync('./guey_catalog_verified.json', 'utf8'));
const bad = d.filter(p => p.image_matches_text === false);

const cards = bad.map((p, i) => {
    const title = (p.corrected_title || p.original_title || '').replace(/'/g, '&#39;');
    const reason = (p.mismatch_reason || '').replace(/'/g, '&#39;');
    const imgFile = p.image_file || '';
    return `
<div class="card">
  <img src="../Catalog_Images_Processed/${imgFile}" alt="${title}" onerror="this.parentElement.style.borderColor='#e60000'" />
  <div class="info">
    <span class="badge">#${i + 1}</span>
    <div class="title">${title}</div>
    <div class="img-name">📁 ${imgFile}</div>
    <div class="reason">⚠️ ${reason}</div>
  </div>
</div>`;
}).join('');

const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Revisión de Imágenes — GÜEY</title>
<style>
  body { font-family: sans-serif; background: #111; color: #eee; padding: 20px; margin: 0; }
  h1 { color: #e60000; margin-bottom: 4px; }
  .subtitle { color: #aaa; margin-bottom: 24px; font-size: 14px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; }
  .card { background: #1e1e1e; border-radius: 10px; overflow: hidden; border: 2px solid #333; }
  .card img { width: 100%; aspect-ratio: 4/5; object-fit: cover; display: block; background: #2a2a2a; }
  .card .info { padding: 12px; }
  .badge { background: #e60000; color: white; border-radius: 4px; padding: 2px 6px; font-size: 10px; margin-bottom: 6px; display: inline-block; }
  .title { font-weight: bold; font-size: 13px; margin: 4px 0; color: #fff; }
  .img-name { font-size: 10px; color: #e60000; font-family: monospace; word-break: break-all; }
  .reason { font-size: 11px; color: #f5a623; margin-top: 6px; line-height: 1.4; }
</style>
</head>
<body>
<h1>🚨 Imágenes Discordantes — GÜEY INDUMENTARIA</h1>
<p class="subtitle">${bad.length} productos con foto incorrecta. Reemplazá el archivo en <strong>Catalog_Images_Processed/</strong> con el nombre exacto que aparece en rojo.</p>
<div class="grid">
${cards}
</div>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, 'Export_Stitch_HTML', 'revision_imagenes.html'), html, 'utf8');
console.log('Página de revisión generada: Export_Stitch_HTML/revision_imagenes.html');
console.log('Total imágenes incorrectas:', bad.length);
