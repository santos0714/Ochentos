/**
 * Escritura de archivos .xlsx (exportación y plantilla) con ExcelJS.
 * Solo se carga en el panel administrativo (no pesa en el menú público).
 */
import ExcelJS from 'exceljs';
import type { Menu } from '../types';
import { byOrder } from '../format';
import {
  CATEGORY_COLUMNS, CLEAR, PRODUCT_COLUMNS, SHEET_CATEGORIES, SHEET_HELP, SHEET_PRODUCTS, type ColumnDef,
} from './schema';
import { categoryToRow, productToRow } from './validate';

const BROWN = 'FF43220C';
const CREAM = 'FFFBF4E6';

function styleSheet(ws: ExcelJS.Worksheet, defs: ColumnDef[]) {
  ws.columns = defs.map((d) => ({ header: d.header, key: d.key, width: d.width }));
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BROWN } };
  head.alignment = { vertical: 'middle' };
  head.height = 22;
  defs.forEach((d, i) => {
    const cell = head.getCell(i + 1);
    cell.note = d.help;
    if (d.readOnly) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8A7560' } };
  });
  ws.views = [{ state: 'frozen', ySplit: 1, xSplit: 1 }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: defs.length } };
}

function addValidations(ws: ExcelJS.Worksheet, defs: ColumnDef[], rows: number, catCount: number) {
  const col = (key: string) => defs.findIndex((d) => d.key === key) + 1;
  const last = Math.max(rows + 200, 300);
  for (let r = 2; r <= last; r++) {
    const pub = col('publicado');
    if (pub) ws.getCell(r, pub).dataValidation = { type: 'list', allowBlank: true, formulae: ['"sí,no"'] };
    const mon = col('moneda');
    if (mon) ws.getCell(r, mon).dataValidation = { type: 'list', allowBlank: true, formulae: ['"MXN,USD"'] };
    const cat = col('categoria');
    if (cat && catCount) {
      ws.getCell(r, cat).dataValidation = {
        type: 'list', allowBlank: true, formulae: [`${SHEET_CATEGORIES}!$A$2:$A$${catCount + 50}`],
        showErrorMessage: false,
      };
    }
    for (const d of defs) {
      if (['descripcion', 'opciones', 'variantes', 'nota'].includes(d.key)) {
        ws.getCell(r, col(d.key)).alignment = { wrapText: true, vertical: 'top' };
      }
    }
  }
}

function helpSheet(wb: ExcelJS.Workbook) {
  const ws = wb.addWorksheet(SHEET_HELP, { properties: { tabColor: { argb: 'FFF0701E' } } });
  ws.columns = [{ width: 24 }, { width: 100 }];
  const lines: [string, string][] = [
    ['MENÚ DIGITAL · OCHENTOS PIZZA', ''],
    ['Cómo actualizar', '1) Edite las hojas "Productos" y "Categorias". 2) Guarde como .xlsx. 3) Revíselo en la página /admin/. 4) Súbalo con el nombre menu.xlsx en lugar del anterior.'],
    ['Este archivo es el menú', 'La página muestra exactamente lo que dice este archivo. Lo que borre aquí desaparece de la página.'],
    ['Precio o variantes', 'Cada producto lleva un precio único O variantes. Escriba "-" en la columna que no use.'],
    ['Formato de variantes', 'Nombre: precio | Nombre: precio   →   Chica: 360 | Mediana: 440 | Grande: 550'],
    ['Opciones', 'Sabores u opciones separados por " / "   →   Fresa / Mango / Kiwi'],
    ['Etiquetas', 'Separadas por coma. Permitidas: nuevo, medalla, vegetariano, picante'],
    ['Ocultar un producto', 'Ponga "no" en publicado. Así se oculta sin borrar la fila, y puede volver a mostrarlo después.'],
    ['Productos nuevos', 'Agregue una fila con un id nuevo (minúsculas, números y guiones; ej. pizza-chorizo). No reutilice ids.'],
    ['Borrar productos', 'Borrar la fila quita el producto de la página. Si solo es temporal, mejor use publicado = no.'],
    ['Fotos', 'Suba la foto a la carpeta «fotos» y escriba aquí su nombre de archivo (ej. pizza-hawaiana.webp). Vacío = sin foto. En /admin/ puede preparar la foto con el nombre correcto.'],
    ['No modifique', 'Los encabezados (fila 1), los nombres de las hojas ni los id existentes.'],
  ];
  lines.forEach(([a, b], i) => {
    const row = ws.addRow([a, b]);
    row.getCell(1).font = { bold: true, color: { argb: BROWN } };
    row.getCell(2).alignment = { wrapText: true, vertical: 'top' };
    if (i === 0) row.getCell(1).font = { bold: true, size: 14, color: { argb: 'FFF0701E' } };
    if (i > 0 && i % 2 === 0) row.eachCell((c) => (c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CREAM } }));
  });
}

/** Exporta el menú actual. Con `blank` genera la plantilla sin productos. */
export async function buildWorkbook(menu: Menu, opts: { blank?: boolean } = {}): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Menú digital Ochentos';
  wb.created = new Date();

  const prods = wb.addWorksheet(SHEET_PRODUCTS, { properties: { tabColor: { argb: BROWN } } });
  styleSheet(prods, PRODUCT_COLUMNS);
  const cats = [...menu.categories].sort(byOrder);
  const catOrder = new Map(cats.map((c, i) => [c.id, i]));
  const products = opts.blank
    ? []
    : [...menu.products].sort((a, b) => (catOrder.get(a.categoria)! - catOrder.get(b.categoria)!) || byOrder(a, b));
  products.forEach((p, i) => {
    const row = prods.addRow(productToRow(p));
    if (i % 2) row.eachCell({ includeEmpty: true }, (c) => (c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CREAM } }));
  });
  addValidations(prods, PRODUCT_COLUMNS, products.length, cats.length);

  const cs = wb.addWorksheet(SHEET_CATEGORIES, { properties: { tabColor: { argb: 'FF37B54A' } } });
  styleSheet(cs, CATEGORY_COLUMNS);
  cats.forEach((c) => cs.addRow(categoryToRow(c)));
  addValidations(cs, CATEGORY_COLUMNS, cats.length, 0);

  helpSheet(wb);
  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export { CLEAR };
