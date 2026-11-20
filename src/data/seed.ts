import raw from './seed.json';
import type { Menu, Product, Tag } from '../lib/types';

interface RawProduct {
  id: string;
  categoria: string;
  subcategoria?: string;
  nombre: string;
  detalle?: string;
  descripcion?: string;
  opciones?: string;
  precio?: number;
  variantes?: [string, number][];
  etiquetas?: string[];
  orden: number;
}

/** Contenido inicial transcrito del PDF "MENU.OCTUBRE.2026.ESPAÑOL.OCHENTOS". */
export function seedMenu(): Menu {
  return {
    categories: raw.categories.map((c) => ({ ...c })),
    products: (raw.products as RawProduct[]).map(
      (p): Product => ({
        id: p.id,
        categoria: p.categoria,
        subcategoria: p.subcategoria ?? '',
        nombre: p.nombre,
        detalle: p.detalle ?? '',
        descripcion: p.descripcion ?? '',
        opciones: p.opciones ?? '',
        precio: p.precio ?? null,
        variantes: (p.variantes ?? []).map(([etiqueta, precio]) => ({ etiqueta, precio })),
        moneda: 'MXN',
        etiquetas: (p.etiquetas ?? []) as Tag[],
        publicado: true,
        orden: p.orden,
        imagen: null,
      }),
    ),
  };
}
