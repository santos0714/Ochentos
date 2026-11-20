/**
 * Validación y cálculo de cambios de una importación de Excel.
 *
 * Funciones puras: reciben las filas leídas del archivo y el menú actual, y
 * devuelven un plan (nuevos, modificados, sin cambios, errores) SIN tocar nada.
 * El plan solo se aplica cuando el administrador lo confirma, y el servidor
 * vuelve a validar todo antes de guardar.
 *
 * El Excel publicado es el menú completo (`parseMenu`): lo que no está en el
 * archivo no aparece en la página. `compareMenus` muestra qué cambia respecto
 * al archivo publicado antes de reemplazarlo. Celda vacía o "-" = sin dato.
 * `planImport` conserva además el modo de fusión (celda vacía = sin cambio),
 * que `parseMenu` usa partiendo de un menú vacío.
 */
import { CATEGORY_COLUMNS, CLEAR, FOTO_RE, ID_RE, LIMITS, PRODUCT_COLUMNS, type ColumnDef } from './schema';
import { TAGS, type Category, type Currency, type Menu, type Product, type Tag, type Variant } from '../types';
import { fold } from '../format';

export type Cell = string | number | boolean | null | undefined;

export interface RawRow {
  /** Número de fila tal como lo ve el usuario en Excel (1 = encabezados). */
  row: number;
  cells: Record<string, Cell>;
}

export interface RawSheet {
  name: string;
  headers: string[];
  rows: RawRow[];
}

export interface Issue {
  sheet: string;
  row: number | null;
  column?: string;
  message: string;
}

export interface FieldChange {
  field: string;
  before: string;
  after: string;
}

export interface Planned<T> {
  row: number;
  item: T;
  status: 'new' | 'changed' | 'unchanged';
  changes: FieldChange[];
}

export interface ImportPlan {
  categories: Planned<Category>[];
  products: Planned<Product>[];
  errors: Issue[];
  warnings: Issue[];
  skippedEmptyRows: number;
}

export function summarize(plan: ImportPlan) {
  const count = <T,>(xs: Planned<T>[], s: Planned<T>['status']) => xs.filter((x) => x.status === s).length;
  const s = {
    newCategories: count(plan.categories, 'new'),
    changedCategories: count(plan.categories, 'changed'),
    newProducts: count(plan.products, 'new'),
    changedProducts: count(plan.products, 'changed'),
    unchangedProducts: count(plan.products, 'unchanged'),
    errors: plan.errors.length,
  };
  return {
    ...s,
    hasChanges: s.newCategories + s.changedCategories + s.newProducts + s.changedProducts > 0,
    canApply: s.errors === 0 && s.newCategories + s.changedCategories + s.newProducts + s.changedProducts > 0,
  };
}

// ---------------------------------------------------------------------------
// Utilidades de celdas

export function normHeader(h: string): string {
  return fold(String(h ?? ''))
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

function str(c: Cell): string {
  if (c == null) return '';
  if (typeof c === 'boolean') return c ? 'sí' : 'no';
  return String(c).replace(/\r\n?/g, '\n').trim();
}

function isEmpty(c: Cell): boolean {
  return str(c) === '';
}

export function parsePrice(c: Cell): number | string {
  let n: number;
  if (typeof c === 'number') n = c;
  else {
    const s = str(c).toLowerCase().replace(/mxn|usd|\$|\s/g, '').replace(/,/g, '');
    if (!/^\d+(\.\d+)?$/.test(s)) return `"${str(c)}" no es un precio válido. Escriba solo el número, por ejemplo 360.`;
    n = Number(s);
  }
  if (!Number.isFinite(n)) return 'El precio no es un número.';
  if (n <= 0) return 'El precio debe ser mayor que 0.';
  if (n > LIMITS.precioMax) return `El precio ${n} parece demasiado alto.`;
  if (Math.round(n * 100) !== n * 100) return 'El precio admite como máximo 2 decimales.';
  return n;
}

export function parseVariants(c: Cell): Variant[] | string {
  const s = str(c);
  const parts = s.split(/[|\n;]/).map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return 'Las variantes están vacías.';
  if (parts.length > LIMITS.variantes) return `Máximo ${LIMITS.variantes} variantes.`;
  const out: Variant[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    const i = part.lastIndexOf(':');
    if (i <= 0) return `La variante "${part}" debe tener el formato "Nombre: precio" (ej. "Chica: 360").`;
    const etiqueta = part.slice(0, i).trim();
    const precio = parsePrice(part.slice(i + 1));
    if (!etiqueta) return `Falta el nombre en la variante "${part}".`;
    if (etiqueta.length > LIMITS.etiquetaVariante) return `El nombre de variante "${etiqueta}" es demasiado largo.`;
    if (typeof precio === 'string') return `Variante "${etiqueta}": ${precio}`;
    const key = fold(etiqueta);
    if (seen.has(key)) return `La variante "${etiqueta}" está repetida.`;
    seen.add(key);
    out.push({ etiqueta, precio });
  }
  return out;
}

export function formatVariants(v: Variant[]): string {
  return v.map((x) => `${x.etiqueta}: ${x.precio}`).join(' | ');
}

const TRUE = new Set(['si', 's', 'yes', 'y', 'true', 'verdadero', '1', 'x', 'publicado']);
const FALSE = new Set(['no', 'n', 'false', 'falso', '0', 'oculto']);
export function parseBool(c: Cell): boolean | string {
  if (typeof c === 'boolean') return c;
  const s = fold(str(c));
  if (TRUE.has(s)) return true;
  if (FALSE.has(s)) return false;
  return `"${str(c)}" no es válido. Escriba "sí" o "no".`;
}

export function parseOrder(c: Cell): number | string {
  const n = typeof c === 'number' ? c : Number(str(c));
  if (!Number.isInteger(n) || n < 0 || n > 1_000_000) return `"${str(c)}" no es un número de orden válido (entero, 0 o mayor).`;
  return n;
}

export function parseTags(c: Cell): Tag[] | string {
  const raw = str(c).split(/[,;]/).map((t) => fold(t).replace(/[¡!]/g, '').trim()).filter(Boolean);
  const out: Tag[] = [];
  for (const t of raw) {
    if (!(t in TAGS)) return `Etiqueta "${t}" desconocida. Use: ${Object.keys(TAGS).join(', ')}.`;
    if (!out.includes(t as Tag)) out.push(t as Tag);
  }
  return out;
}

function parseCurrency(c: Cell): Currency | string {
  const s = str(c).toUpperCase().replace(/[$.\s]/g, '');
  if (s === 'MXN' || s === 'MN' || s === 'PESOS') return 'MXN';
  if (s === 'USD' || s === 'DOLARES' || s === 'DÓLARES') return 'USD';
  return `Moneda "${str(c)}" no válida. Use MXN o USD.`;
}

// ---------------------------------------------------------------------------
// Encabezados

function mapHeaders(sheet: RawSheet, defs: ColumnDef[], errors: Issue[], warnings: Issue[]): Map<string, string> | null {
  const byNorm = new Map(defs.map((d) => [normHeader(d.header), d.key]));
  const present = new Map<string, string>(); // key -> header original
  for (const h of sheet.headers) {
    if (!str(h)) continue;
    const key = byNorm.get(normHeader(h));
    if (!key) {
      warnings.push({ sheet: sheet.name, row: 1, column: h, message: `La columna "${h}" no es reconocida y se ignorará.` });
      continue;
    }
    if (present.has(key)) {
      errors.push({ sheet: sheet.name, row: 1, column: h, message: `La columna "${h}" está repetida.` });
      return null;
    }
    present.set(key, h);
  }
  const missing = defs.filter((d) => d.required && !present.has(d.key)).map((d) => d.header);
  if (missing.length) {
    errors.push({
      sheet: sheet.name,
      row: 1,
      message: `Faltan columnas obligatorias: ${missing.join(', ')}. Descargue la plantilla oficial y no cambie los encabezados.`,
    });
    return null;
  }
  return present;
}

function rowIsEmpty(r: RawRow): boolean {
  return Object.values(r.cells).every(isEmpty);
}

/** Lee una celda por clave lógica; undefined si la columna no existe en el archivo. */
function cellOf(r: RawRow, cols: Map<string, string>, key: string): Cell | undefined {
  const h = cols.get(key);
  return h === undefined ? undefined : r.cells[h];
}

// ---------------------------------------------------------------------------
// Plan

const CAT_FIELDS: (keyof Category)[] = ['nombre', 'descripcion', 'nota', 'orden', 'publicado'];
const PROD_FIELDS: (keyof Product)[] = [
  'categoria', 'subcategoria', 'nombre', 'detalle', 'descripcion', 'opciones',
  'precio', 'variantes', 'moneda', 'etiquetas', 'publicado', 'orden', 'imagen',
];

function show(v: unknown): string {
  if (v == null || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'sí' : 'no';
  if (Array.isArray(v)) {
    if (!v.length) return '—';
    return typeof v[0] === 'object' ? formatVariants(v as Variant[]) : v.join(', ');
  }
  return String(v);
}

function diff<T>(before: T | undefined, after: T, fields: (keyof T)[]): FieldChange[] {
  if (!before) return [];
  return fields
    .filter((f) => JSON.stringify(before[f]) !== JSON.stringify(after[f]))
    .map((f) => ({ field: f === 'imagen' ? 'foto' : String(f), before: show(before[f]), after: show(after[f]) }));
}

export function planImport(
  current: Menu,
  sheets: { products: RawSheet | null; categories: RawSheet | null },
): ImportPlan {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  let skippedEmptyRows = 0;
  const plan: ImportPlan = { categories: [], products: [], errors, warnings, skippedEmptyRows: 0 };

  if (!sheets.products && !sheets.categories) {
    errors.push({ sheet: '—', row: null, message: 'El archivo no contiene las hojas "Productos" ni "Categorias". Use la plantilla oficial.' });
    return plan;
  }

  // ---- Categorías ---------------------------------------------------------
  const catsById = new Map(current.categories.map((c) => [c.id, c]));
  const finalCatIds = new Set(catsById.keys());

  if (sheets.categories) {
    const sh = sheets.categories;
    const cols = mapHeaders(sh, CATEGORY_COLUMNS, errors, warnings);
    if (cols) {
      const seen = new Map<string, number>();
      for (const r of sh.rows) {
        if (rowIsEmpty(r)) { skippedEmptyRows++; continue; }
        const rowErr = (column: string | undefined, message: string) => errors.push({ sheet: sh.name, row: r.row, column, message });
        const id = str(cellOf(r, cols, 'id'));
        if (!id) { rowErr('id', 'Falta el id de la categoría.'); continue; }
        if (!ID_RE.test(id) || id.length > LIMITS.id) { rowErr('id', `El id "${id}" solo puede tener minúsculas, números y guiones.`); continue; }
        if (seen.has(id)) { rowErr('id', `El id "${id}" está repetido (también en la fila ${seen.get(id)}).`); continue; }
        seen.set(id, r.row);

        const prev = catsById.get(id);
        const before = errors.length;
        const next: Category = prev ? { ...prev } : { id, nombre: '', descripcion: '', nota: '', orden: 0, publicado: true };

        const nombre = cellOf(r, cols, 'nombre');
        if (!isEmpty(nombre)) {
          const v = str(nombre);
          if (v === CLEAR) rowErr('nombre', 'El nombre no se puede borrar.');
          else if (v.length > LIMITS.nombre) rowErr('nombre', 'El nombre es demasiado largo.');
          else next.nombre = v;
        } else if (!prev) rowErr('nombre', 'Falta el nombre de la nueva categoría.');

        for (const f of ['descripcion', 'nota'] as const) {
          const c = cellOf(r, cols, f);
          if (c === undefined || isEmpty(c)) continue;
          const v = str(c);
          if (v.length > LIMITS.nota * 2) rowErr(f, 'El texto es demasiado largo.');
          else next[f] = v === CLEAR ? '' : v;
        }

        const orden = cellOf(r, cols, 'orden');
        if (!isEmpty(orden)) {
          const v = parseOrder(orden!);
          if (typeof v === 'string') rowErr('orden', v); else next.orden = v;
        } else if (!prev) next.orden = (Math.max(0, ...current.categories.map((c) => c.orden)) + 10);

        const pub = cellOf(r, cols, 'publicado');
        if (!isEmpty(pub)) {
          const v = parseBool(pub!);
          if (typeof v === 'string') rowErr('publicado', v); else next.publicado = v;
        }

        if (errors.length > before) continue;
        finalCatIds.add(id);
        const changes = diff(prev, next, CAT_FIELDS);
        plan.categories.push({ row: r.row, item: next, status: !prev ? 'new' : changes.length ? 'changed' : 'unchanged', changes });
      }
    }
  }

  // ---- Productos ----------------------------------------------------------
  if (sheets.products) {
    const sh = sheets.products;
    const cols = mapHeaders(sh, PRODUCT_COLUMNS.filter((c) => !c.readOnly), errors, warnings);
    // La columna de solo lectura no debe generar advertencia de "no reconocida".
    for (let i = warnings.length - 1; i >= 0; i--) {
      const w = warnings[i];
      if (w.sheet === sh.name && normHeader(w.column ?? '') === 'foto') warnings.splice(i, 1);
    }
    if (cols) {
      const prodById = new Map(current.products.map((p) => [p.id, p]));
      const seen = new Map<string, number>();
      const maxOrderByCat = new Map<string, number>();
      for (const p of current.products) maxOrderByCat.set(p.categoria, Math.max(maxOrderByCat.get(p.categoria) ?? 0, p.orden));

      for (const r of sh.rows) {
        if (rowIsEmpty(r)) { skippedEmptyRows++; continue; }
        const rowErr = (column: string | undefined, message: string) => errors.push({ sheet: sh.name, row: r.row, column, message });
        const id = str(cellOf(r, cols, 'id'));
        if (!id) { rowErr('id', 'Falta el id. Cada producto necesita un id único (ej. pizza-nueva).'); continue; }
        if (!ID_RE.test(id) || id.length > LIMITS.id) {
          rowErr('id', `El id "${id}" solo puede tener minúsculas sin acentos, números y guiones (ej. ${suggestId(id)}).`);
          continue;
        }
        if (seen.has(id)) { rowErr('id', `El id "${id}" está repetido (también en la fila ${seen.get(id)}).`); continue; }
        seen.set(id, r.row);

        const prev = prodById.get(id);
        const before = errors.length;
        const next: Product = prev
          ? { ...prev, variantes: [...prev.variantes], etiquetas: [...prev.etiquetas] }
          : {
              id, categoria: '', subcategoria: '', nombre: '', detalle: '', descripcion: '', opciones: '',
              precio: null, variantes: [], moneda: 'MXN', etiquetas: [], publicado: true, orden: 0, imagen: null,
            };

        // categoría
        const cat = cellOf(r, cols, 'categoria');
        if (!isEmpty(cat)) {
          const v = str(cat);
          if (!finalCatIds.has(v)) rowErr('categoria', `La categoría "${v}" no existe. Revise la hoja Categorias.`);
          else next.categoria = v;
        } else if (!prev) rowErr('categoria', 'Falta la categoría.');

        // nombre
        const nombre = cellOf(r, cols, 'nombre');
        if (!isEmpty(nombre)) {
          const v = str(nombre);
          if (v === CLEAR) rowErr('nombre', 'El nombre no se puede borrar.');
          else if (v.length > LIMITS.nombre) rowErr('nombre', `El nombre supera ${LIMITS.nombre} caracteres.`);
          else next.nombre = v;
        } else if (!prev) rowErr('nombre', 'Falta el nombre.');

        // textos opcionales
        for (const f of ['subcategoria', 'detalle', 'descripcion', 'opciones'] as const) {
          const c = cellOf(r, cols, f);
          if (c === undefined || isEmpty(c)) continue;
          const v = str(c);
          if (v.length > LIMITS[f]) { rowErr(f, `El texto supera ${LIMITS[f]} caracteres.`); continue; }
          next[f] = v === CLEAR ? '' : v;
        }

        // precio / variantes
        const pc = cellOf(r, cols, 'precio');
        if (!isEmpty(pc)) {
          if (str(pc) === CLEAR) next.precio = null;
          else {
            const v = parsePrice(pc!);
            if (typeof v === 'string') rowErr('precio', v); else next.precio = v;
          }
        }
        const vc = cellOf(r, cols, 'variantes');
        if (!isEmpty(vc)) {
          if (str(vc) === CLEAR) next.variantes = [];
          else {
            const v = parseVariants(vc!);
            if (typeof v === 'string') rowErr('variantes', v); else next.variantes = v;
          }
        }
        if (errors.length === before) {
          if (next.precio != null && next.variantes.length) {
            rowErr('precio', 'Tiene precio y variantes a la vez. Deje solo uno y escriba "-" en el otro.');
          } else if (next.precio == null && !next.variantes.length) {
            rowErr('precio', 'Falta el precio: escriba un precio único o las variantes.');
          }
        }

        const mc = cellOf(r, cols, 'moneda');
        if (!isEmpty(mc)) {
          const v = parseCurrency(mc!);
          if (v !== 'MXN' && v !== 'USD') rowErr('moneda', v); else next.moneda = v;
        }

        const tc = cellOf(r, cols, 'etiquetas');
        if (tc !== undefined && !isEmpty(tc)) {
          if (str(tc) === CLEAR) next.etiquetas = [];
          else {
            const v = parseTags(tc);
            if (typeof v === 'string') rowErr('etiquetas', v); else next.etiquetas = v;
          }
        }

        const pub = cellOf(r, cols, 'publicado');
        if (!isEmpty(pub)) {
          const v = parseBool(pub!);
          if (typeof v === 'string') rowErr('publicado', v); else next.publicado = v;
        }

        const fc = cellOf(r, cols, 'foto');
        if (fc !== undefined && !isEmpty(fc)) {
          const v = str(fc).replace(/^fotos\//i, '');
          if (v === CLEAR) next.imagen = null;
          else if (!FOTO_RE.test(v)) rowErr('foto', `"${v}" no es un nombre de foto válido. Use solo el nombre del archivo, sin espacios ni acentos (ej. ${id}.webp).`);
          else next.imagen = v;
        }

        const oc = cellOf(r, cols, 'orden');
        if (!isEmpty(oc)) {
          const v = parseOrder(oc!);
          if (typeof v === 'string') rowErr('orden', v); else next.orden = v;
        } else if (!prev && next.categoria) {
          const m = (maxOrderByCat.get(next.categoria) ?? 0) + 10;
          maxOrderByCat.set(next.categoria, m);
          next.orden = m;
        }

        if (errors.length > before) continue;
        const changes = diff(prev, next, PROD_FIELDS);
        plan.products.push({ row: r.row, item: next, status: !prev ? 'new' : changes.length ? 'changed' : 'unchanged', changes });
      }

      const missing = current.products.filter((p) => !seen.has(p.id)).length;
      if (missing) {
        warnings.push({
          sheet: sh.name,
          row: null,
          message: `${missing} producto(s) existentes no aparecen en el archivo. No se borrarán ni se modificarán.`,
        });
      }
    }
  }

  plan.skippedEmptyRows = skippedEmptyRows;
  return plan;
}

export function suggestId(s: string): string {
  return fold(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, LIMITS.id) || 'producto-nuevo';
}

/** Filas para exportar (las mismas columnas que la plantilla). */
export function productToRow(p: Product): Record<string, string | number> {
  return {
    id: p.id,
    categoria: p.categoria,
    subcategoria: p.subcategoria,
    nombre: p.nombre,
    detalle: p.detalle,
    descripcion: p.descripcion,
    opciones: p.opciones,
    precio: p.precio ?? CLEAR,
    variantes: p.variantes.length ? formatVariants(p.variantes) : CLEAR,
    moneda: p.moneda,
    etiquetas: p.etiquetas.join(', '),
    publicado: p.publicado ? 'sí' : 'no',
    orden: p.orden,
    foto: p.imagen ?? '',
  };
}

export function categoryToRow(c: Category): Record<string, string | number> {
  return { id: c.id, nombre: c.nombre, descripcion: c.descripcion, nota: c.nota, orden: c.orden, publicado: c.publicado ? 'sí' : 'no' };
}

// ---------------------------------------------------------------------------
// El archivo como menú completo

const EMPTY_MENU: Menu = { categories: [], products: [] };

export interface ParsedMenu {
  menu: Menu;
  errors: Issue[];
  warnings: Issue[];
}

/**
 * Lee el Excel como el menú completo. Las filas con errores se omiten y se
 * reportan; el resto del menú sigue funcionando.
 */
export function parseMenu(sheets: { products: RawSheet | null; categories: RawSheet | null }): ParsedMenu {
  const missing = [!sheets.products && 'Productos', !sheets.categories && 'Categorias'].filter(Boolean);
  if (missing.length) {
    return {
      menu: EMPTY_MENU,
      errors: [{ sheet: '—', row: null, message: `Al archivo le falta la hoja ${missing.map((m) => `"${m}"`).join(' y ')}. Use la plantilla oficial.` }],
      warnings: [],
    };
  }
  const plan = planImport(EMPTY_MENU, sheets);
  return {
    menu: { categories: plan.categories.map((c) => c.item), products: plan.products.map((p) => p.item) },
    errors: plan.errors,
    warnings: plan.warnings,
  };
}

export interface MenuComparison {
  added: Product[];
  changed: { item: Product; changes: FieldChange[] }[];
  removed: Product[];
  unchanged: number;
  categoriesAdded: Category[];
  categoriesChanged: { item: Category; changes: FieldChange[] }[];
  categoriesRemoved: Category[];
}

/** Qué cambia al reemplazar el menú publicado (`before`) por el nuevo archivo (`after`). */
export function compareMenus(before: Menu, after: Menu): MenuComparison {
  const prevP = new Map(before.products.map((p) => [p.id, p]));
  const nextP = new Set(after.products.map((p) => p.id));
  const prevC = new Map(before.categories.map((c) => [c.id, c]));
  const nextC = new Set(after.categories.map((c) => c.id));
  const out: MenuComparison = {
    added: [], changed: [], removed: before.products.filter((p) => !nextP.has(p.id)), unchanged: 0,
    categoriesAdded: [], categoriesChanged: [], categoriesRemoved: before.categories.filter((c) => !nextC.has(c.id)),
  };
  for (const p of after.products) {
    const prev = prevP.get(p.id);
    if (!prev) { out.added.push(p); continue; }
    const changes = diff(prev, p, PROD_FIELDS);
    if (changes.length) out.changed.push({ item: p, changes }); else out.unchanged++;
  }
  for (const c of after.categories) {
    const prev = prevC.get(c.id);
    if (!prev) { out.categoriesAdded.push(c); continue; }
    const changes = diff(prev, c, CAT_FIELDS);
    if (changes.length) out.categoriesChanged.push({ item: c, changes });
  }
  return out;
}
