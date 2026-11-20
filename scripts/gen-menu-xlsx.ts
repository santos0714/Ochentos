/**
 * Genera public/menu.xlsx a partir del contenido transcrito del PDF (src/data/seed.json).
 * Solo para el arranque: una vez publicado, el menú se edita en el propio Excel.
 * Uso: npm run menu:inicial   (no sobrescribe un menu.xlsx existente sin --force)
 */
import { existsSync, writeFileSync } from 'node:fs';
import { seedMenu } from '../src/data/seed';
import { buildWorkbook } from '../src/lib/excel/workbook';

const out = new URL('../public/menu.xlsx', import.meta.url);
if (existsSync(out) && !process.argv.includes('--force')) {
  console.log('public/menu.xlsx ya existe; no se sobrescribe. Use --force para regenerarlo.');
  process.exit(0);
}
const blob = await buildWorkbook(seedMenu());
writeFileSync(out, Buffer.from(await blob.arrayBuffer()));
console.log('public/menu.xlsx generado');
