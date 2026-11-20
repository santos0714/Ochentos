import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { seedMenu } from '../../data/seed';
import { buildWorkbook } from './workbook';
import { readWorkbook, WorkbookError } from './reader';
import { planImport, summarize, parseVariants, parsePrice, parseMenu, compareMenus, type RawSheet } from './validate';
import type { Menu } from '../types';

const asFile = async (blob: Blob, name = 'menu.xlsx') => ({ name, size: blob.size, arrayBuffer: () => blob.arrayBuffer() });

/** Abre el Excel exportado, aplica una edición y lo devuelve como archivo. */
async function editExport(menu: Menu, edit: (wb: ExcelJS.Workbook) => void) {
  const blob = await buildWorkbook(menu);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await blob.arrayBuffer());
  edit(wb);
  const out = await wb.xlsx.writeBuffer();
  return asFile(new Blob([out]));
}

function rowById(ws: ExcelJS.Worksheet, id: string) {
  for (let r = 2; r <= ws.rowCount; r++) if (ws.getRow(r).getCell(1).value === id) return ws.getRow(r);
  throw new Error('no row ' + id);
}
const COL = { categoria: 2, nombre: 4, descripcion: 6, precio: 8, variantes: 9, moneda: 10, etiquetas: 11, publicado: 12, orden: 13, foto: 14 };

async function plan(menu: Menu, edit: (wb: ExcelJS.Workbook) => void) {
  const sheets = await readWorkbook(await editExport(menu, edit));
  return planImport(menu, sheets);
}

describe('exportación e importación', () => {
  it('exportar y reimportar sin cambios no produce cambios ni duplicados', async () => {
    const menu = seedMenu();
    const p = await plan(menu, () => {});
    const s = summarize(p);
    expect(p.errors).toEqual([]);
    expect(s.newProducts + s.changedProducts + s.newCategories + s.changedCategories).toBe(0);
    expect(s.unchangedProducts).toBe(menu.products.length);
    expect(s.canApply).toBe(false);
  });

  it('la plantilla en blanco conserva las categorías y no trae productos', async () => {
    const sheets = await readWorkbook(await asFile(await buildWorkbook(seedMenu(), { blank: true })));
    expect(sheets.products!.rows.every((r) => Object.values(r.cells).every((v) => v == null || v === ''))).toBe(true);
    expect(sheets.categories!.rows.filter((r) => r.cells.id).length).toBe(12);
  });

  it('detecta un producto modificado por su id, aunque cambie el nombre', async () => {
    const menu = seedMenu();
    const p = await plan(menu, (wb) => {
      const row = rowById(wb.getWorksheet('Productos')!, 'pizza-hawaiana');
      row.getCell(COL.nombre).value = 'Hawaiana Especial';
      row.getCell(COL.variantes).value = 'Chica: 300 | Mediana: 370 | Grande: 495 | Familiar: 590';
    });
    const s = summarize(p);
    expect(p.errors).toEqual([]);
    expect(s.changedProducts).toBe(1);
    expect(s.newProducts).toBe(0);
    const ch = p.products.find((x) => x.status === 'changed')!;
    expect(ch.item.id).toBe('pizza-hawaiana');
    expect(ch.changes.map((c) => c.field).sort()).toEqual(['nombre', 'variantes']);
    expect(s.canApply).toBe(true);
  });

  it('agrega un producto nuevo', async () => {
    const menu = seedMenu();
    const p = await plan(menu, (wb) => {
      wb.getWorksheet('Productos')!.addRow(['pizza-chorizo', 'pizzas', '', 'Chorizo', '', 'Chorizo de la casa.', '', '-', 'Chica: 280 | Grande: 470', 'MXN', 'nuevo', 'sí', '']);
    });
    expect(p.errors).toEqual([]);
    const n = p.products.find((x) => x.status === 'new')!;
    expect(n.item).toMatchObject({ id: 'pizza-chorizo', categoria: 'pizzas', precio: null, etiquetas: ['nuevo'], publicado: true });
    expect(n.item.variantes).toHaveLength(2);
    expect(n.item.orden).toBe(120); // al final de su categoría
  });

  it('el archivo es el menú completo: celda vacía = sin dato', async () => {
    const menu = seedMenu();
    const file = await editExport(menu, (wb) => {
      rowById(wb.getWorksheet('Productos')!, 'pizza-pepperoni').getCell(COL.descripcion).value = null;
    });
    const parsed = parseMenu(await readWorkbook(file));
    expect(parsed.errors).toEqual([]);
    expect(parsed.menu.products.find((p) => p.id === 'pizza-pepperoni')!.descripcion).toBe('');
    const cmp = compareMenus(menu, parsed.menu);
    expect(cmp.changed.map((c) => c.item.id)).toEqual(['pizza-pepperoni']);
  });

  it('quitar filas del archivo quita esos productos y la comparación lo avisa', async () => {
    const menu = seedMenu();
    const file = await editExport(menu, (wb) => { wb.getWorksheet('Productos')!.spliceRows(2, 3); });
    const parsed = parseMenu(await readWorkbook(file));
    expect(parsed.menu.products).toHaveLength(menu.products.length - 3);
    const cmp = compareMenus(menu, parsed.menu);
    expect(cmp.removed.map((p) => p.id)).toEqual(['pizza-triple-ochentos', 'pizza-especial', 'pizza-vegetariana']);
    expect(cmp.unchanged).toBe(menu.products.length - 3);
  });

  it('la foto se toma de la columna foto y se valida su nombre', async () => {
    const menu = seedMenu();
    const file = await editExport(menu, (wb) => {
      const ws = wb.getWorksheet('Productos')!;
      rowById(ws, 'pizza-hawaiana').getCell(COL.foto).value = 'pizza-hawaiana.webp';
      rowById(ws, 'pizza-bbq').getCell(COL.foto).value = 'fotos/BBQ final.jpg';
    });
    const parsed = parseMenu(await readWorkbook(file));
    expect(parsed.menu.products.find((p) => p.id === 'pizza-hawaiana')!.imagen).toBe('pizza-hawaiana.webp');
    expect(parsed.errors).toHaveLength(1);
    expect(parsed.errors[0]).toMatchObject({ column: 'foto' });
    expect(parsed.menu.products.find((p) => p.id === 'pizza-bbq')).toBeUndefined();
    expect(compareMenus(menu, parsed.menu).changed.map((c) => c.changes.map((f) => f.field))).toEqual([['foto']]);
  });

  it('exportar y volver a leer conserva el menú idéntico', async () => {
    const menu = seedMenu();
    menu.products[0].imagen = 'pizza-triple-ochentos.webp';
    const parsed = parseMenu(await readWorkbook(await asFile(await buildWorkbook(menu))));
    expect(parsed.errors).toEqual([]);
    const cmp = compareMenus(menu, parsed.menu);
    expect(cmp.added.length + cmp.changed.length + cmp.removed.length).toBe(0);
    expect(parsed.menu.categories).toHaveLength(12);
  });

  it('avisa si falta una hoja', () => {
    const r = parseMenu({ products: null, categories: { name: 'Categorias', headers: [], rows: [] } });
    expect(r.errors[0].message).toContain('"Productos"');
  });

  it('reporta errores por fila: ids duplicados, precios inválidos, categorías inexistentes, publicado y variantes', async () => {
    const menu = seedMenu();
    const p = await plan(menu, (wb) => {
      const ws = wb.getWorksheet('Productos')!;
      ws.addRow(['pizza-hawaiana', 'pizzas', '', 'Duplicada', '', '', '', 50, '-', 'MXN', '', 'sí', 1]);
      rowById(ws, 'pizza-bbq').getCell(COL.variantes).value = 'Chica 400 | Mediana: abc';
      rowById(ws, 'entrada-caprese').getCell(COL.precio).value = 'doscientos';
      rowById(ws, 'pizza-especial').getCell(COL.categoria).value = 'hamburguesas';
      rowById(ws, 'pizza-colombiana').getCell(COL.publicado).value = 'tal vez';
      rowById(ws, 'pizza-mexicana').getCell(COL.precio).value = 99; // con variantes a la vez
      rowById(ws, 'pizza-pepperoni').getCell(COL.etiquetas).value = 'gratis';
      ws.addRow(['Pizza Nueva', 'pizzas', '', 'X', '', '', '', 10, '-', 'MXN', '', 'sí', 1]);
    });
    const msgs = p.errors.map((e) => `${e.row}:${e.column}`);
    expect(p.errors.length).toBe(8);
    expect(p.errors.every((e) => typeof e.row === 'number')).toBe(true);
    expect(msgs.filter((m) => m.endsWith(':id'))).toHaveLength(2);
    expect(p.errors.find((e) => e.column === 'categoria')!.message).toContain('hamburguesas');
    expect(summarize(p).canApply).toBe(false);
  });

  it('rechaza estructura incorrecta', async () => {
    const menu = seedMenu();
    const p = await plan(menu, (wb) => {
      wb.getWorksheet('Productos')!.getRow(1).getCell(COL.precio).value = 'costo';
    });
    expect(p.errors[0].message).toContain('Faltan columnas obligatorias: precio');
    expect(p.products).toHaveLength(0);
  });

  it('rechaza archivos que no son xlsx', async () => {
    await expect(readWorkbook(await asFile(new Blob(['a,b']), 'menu.csv'))).rejects.toBeInstanceOf(WorkbookError);
    await expect(readWorkbook(await asFile(new Blob(['no es zip']), 'menu.xlsx'))).rejects.toBeInstanceOf(WorkbookError);
  });

  it('crea categorías nuevas y permite usarlas en la misma importación', async () => {
    const menu = seedMenu();
    const p = await plan(menu, (wb) => {
      wb.getWorksheet('Categorias')!.addRow(['calzones', 'Calzones', '', '', 15, 'sí']);
      wb.getWorksheet('Productos')!.addRow(['calzone-clasico', 'calzones', '', 'Clásico', '', 'Jamón y queso.', '', 210, '-', 'MXN', '', 'sí', 10]);
    });
    expect(p.errors).toEqual([]);
    expect(summarize(p)).toMatchObject({ newCategories: 1, newProducts: 1 });
  });
});

describe('analizadores', () => {
  it('precios', () => {
    expect(parsePrice('$1,200')).toBe(1200);
    expect(parsePrice('360 mxn')).toBe(360);
    expect(parsePrice(0)).toMatch(/mayor/);
    expect(parsePrice('12.345')).toMatch(/decimales/);
  });
  it('variantes', () => {
    expect(parseVariants('Chica: 360 | Mediana: 440')).toEqual([{ etiqueta: 'Chica', precio: 360 }, { etiqueta: 'Mediana', precio: 440 }]);
    expect(parseVariants('Chica: 1 | chica: 2')).toMatch(/repetida/);
  });
  it('acepta columnas fuera de orden y encabezados con mayúsculas o acentos', () => {
    const menu = seedMenu();
    const sheet: RawSheet = {
      name: 'Productos',
      headers: ['Nombre', 'ID', 'Categoría', 'Descripción', 'Precio', 'Variantes', 'Moneda', 'Publicado', 'Orden'],
      rows: [{ row: 2, cells: { Nombre: 'Nueva', ID: 'pizza-x', 'Categoría': 'pizzas', 'Descripción': '', Precio: 100, Variantes: '-', Moneda: 'MXN', Publicado: 'Sí', Orden: 5 } }],
    };
    const p = planImport(menu, { products: sheet, categories: null });
    expect(p.errors).toEqual([]);
    expect(p.products[0].status).toBe('new');
  });
});
