// Coloca <title> y metadatos al inicio del HTML de vista previa (las fuentes incrustadas van después).
import { readFileSync, writeFileSync } from 'node:fs';
const f = 'dist-preview/preview.html';
let html = readFileSync(f, 'utf8');
const head = [];
html = html.replace(/<title>[\s\S]*?<\/title>\s*/, (m) => { head.push(m.trim()); return ''; });
html = html.replace(/<meta name="claude:viewport-fit-sides"[^>]*>\s*/, (m) => { head.push(m.trim()); return ''; });
// U+FFFD literal dentro de cadenas de librerías → secuencia de escape equivalente.
html = html.replace(/\uFFFD/g, '\\ufffd');
// Documento completo: el servidor de artifacts exige <!DOCTYPE html>.
const doc = '<!DOCTYPE html>\n<html lang="es-MX">\n<head>\n<meta charset="utf-8">\n' +
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
  head.join('\n') + '\n' + html.replace(/<div id="root"><\/div>/, '</head>\n<body>\n<div id="root"></div>') + '\n</body>\n</html>\n';
writeFileSync(f, doc);
console.log('preview listo:', (html.length / 1e6).toFixed(2), 'MB');
