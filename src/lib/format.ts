import type { Category, Menu, Product } from './types';

const fmt = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 });

export function money(n: number, currency = 'MXN'): string {
  return `$${fmt.format(n)}${currency === 'USD' ? ' USD' : ''}`;
}

/** Texto sin acentos y en minúsculas, para búsquedas. */
export function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function splitOptions(opciones: string): string[] {
  return opciones
    .split(' / ')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function byOrder<T extends { orden: number; id: string }>(a: T, b: T): number {
  return a.orden - b.orden || a.id.localeCompare(b.id);
}

export interface Section {
  category: Category;
  products: Product[];
}

/** Agrupa el menú en secciones publicadas, en el orden configurado. */
export function buildSections(menu: Menu, query = ''): Section[] {
  const q = fold(query.trim());
  const cats = menu.categories.filter((c) => c.publicado).sort(byOrder);
  return cats
    .map((category) => ({
      category,
      products: menu.products
        .filter((p) => p.publicado && p.categoria === category.id)
        .filter((p) => !q || matches(p, q))
        .sort(byOrder),
    }))
    .filter((s) => s.products.length > 0);
}

function matches(p: Product, q: string): boolean {
  return [p.nombre, p.detalle, p.descripcion, p.opciones, p.subcategoria, ...p.variantes.map((v) => v.etiqueta)]
    .some((f) => fold(f).includes(q));
}

/** Precio mínimo, para mostrar "desde" en listas compactas. */
export function minPrice(p: Product): number | null {
  if (p.precio != null) return p.precio;
  if (!p.variantes.length) return null;
  return Math.min(...p.variantes.map((v) => v.precio));
}

export interface MatrixColumn {
  label: string;
  /** Detalle opcional tomado de la leyenda de la categoría (p. ej. 12" · 8 rebanadas). */
  sub: string;
}

/**
 * Si la mayoría de los productos de un grupo comparten las mismas variantes
 * (Chica/Mediana/Grande/Familiar, Pinta/Jarra, Botella/Copa…), devuelve esas
 * columnas para mostrar los precios alineados como en una carta impresa.
 */
export function priceMatrix(products: Product[], legend = ''): MatrixColumn[] | null {
  const withVariants = products.filter((p) => p.precio == null && p.variantes.length >= 2);
  if (withVariants.length < 2) return null;
  const counts = new Map<string, number>();
  for (const p of withVariants) {
    const key = p.variantes.map((v) => fold(v.etiqueta)).join('|');
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const [bestKey, n] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (n < 2 || n < products.length * 0.6) return null;
  const sample = withVariants.find((p) => p.variantes.map((v) => fold(v.etiqueta)).join('|') === bestKey)!;
  const tokens = legend.split('|').map((t) => t.trim()).filter(Boolean);
  return sample.variantes.map((v) => {
    const t = tokens.find((x) => fold(x).startsWith(fold(v.etiqueta)));
    return { label: v.etiqueta, sub: t ? t.slice(v.etiqueta.length).trim() : '' };
  });
}

export function fitsMatrix(p: Product, cols: MatrixColumn[] | null): boolean {
  return !!cols && p.precio == null && p.variantes.length === cols.length &&
    p.variantes.every((v, i) => fold(v.etiqueta) === fold(cols[i].label));
}
