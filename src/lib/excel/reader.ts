/**
 * Lectura de archivos .xlsx subidos por el administrador.
 * Usa read-excel-file (ligero y tolerante con archivos guardados por Excel,
 * Google Sheets, LibreOffice u otras herramientas). No modifica nada.
 */
import readXlsxFile from 'read-excel-file/universal';
import { SHEET_CATEGORIES, SHEET_PRODUCTS } from './schema';
import { normHeader, type Cell, type RawSheet } from './validate';

export const MAX_XLSX_BYTES = 5 * 1024 * 1024;

export class WorkbookError extends Error {}

function cell(v: unknown): Cell {
  if (v == null) return null;
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
}

function toSheet(name: string, data: unknown[][]): RawSheet {
  const headers = (data[0] ?? []).map((h) => String(cell(h) ?? '').trim());
  const rows = data.slice(1).map((r, i) => {
    const cells: Record<string, Cell> = {};
    headers.forEach((h, j) => { if (h) cells[h] = cell(r[j]); });
    return { row: i + 2, cells };
  });
  return { name, headers, rows };
}

export async function readWorkbook(file: { name: string; size: number; arrayBuffer(): Promise<ArrayBuffer> }) {
  if (!/\.xlsx$/i.test(file.name)) {
    throw new WorkbookError('El archivo debe ser de Excel con extensión .xlsx (en Excel: Archivo › Guardar como › Libro de Excel).');
  }
  if (file.size > MAX_XLSX_BYTES) throw new WorkbookError('El archivo pesa más de 5 MB. ¿Es la plantilla correcta?');
  const buf = await file.arrayBuffer();
  const sig = new Uint8Array(buf.slice(0, 4));
  if (!(sig[0] === 0x50 && sig[1] === 0x4b)) throw new WorkbookError('El archivo no es un .xlsx válido o está dañado.');

  let sheets: { sheet: string; data: unknown[][] }[];
  try {
    sheets = (await readXlsxFile(new Blob([buf]))) as { sheet: string; data: unknown[][] }[];
  } catch {
    throw new WorkbookError('No se pudo leer el archivo. Ábralo en Excel y vuelva a guardarlo como .xlsx.');
  }
  const find = (name: string) => sheets.find((s) => normHeader(s.sheet) === normHeader(name));
  const p = find(SHEET_PRODUCTS);
  const c = find(SHEET_CATEGORIES);
  return { products: p ? toSheet(p.sheet, p.data) : null, categories: c ? toSheet(c.sheet, c.data) : null };
}
