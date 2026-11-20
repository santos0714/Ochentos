/** Modelo de datos central del menú. Todo el sitio (público y admin) lee de aquí. */

export type Currency = 'MXN' | 'USD';

/** Etiquetas reconocidas. Cualquier otra se rechaza al importar. */
export const TAGS = {
  nuevo: '¡Nuevo!',
  medalla: 'Medalla',
  vegetariano: 'Vegetariano',
  picante: 'Picante',
} as const;
export type Tag = keyof typeof TAGS;

export interface Variant {
  etiqueta: string;
  precio: number;
}

export interface Category {
  id: string;
  nombre: string;
  descripcion: string;
  nota: string;
  orden: number;
  publicado: boolean;
}

export interface Product {
  /** Identificador estable. Nunca cambia aunque cambie el nombre. */
  id: string;
  categoria: string;
  subcategoria: string;
  nombre: string;
  /** Línea corta bajo el nombre (estilo de cerveza, bodega…). */
  detalle: string;
  descripcion: string;
  /** Sabores u opciones a elegir, separadas por " / ". */
  opciones: string;
  /** Precio único. null cuando el producto usa variantes. */
  precio: number | null;
  variantes: Variant[];
  moneda: Currency;
  etiquetas: Tag[];
  publicado: boolean;
  orden: number;
  /** Ruta base de la foto en el almacenamiento. Solo la cambia el gestor de fotos. */
  imagen: string | null;
  /** Fecha de la última actualización (ISO). */
  actualizado?: string;
}

export interface Menu {
  categories: Category[];
  products: Product[];
}

/** URLs públicas de una foto en sus dos tamaños. */
export interface PhotoUrls {
  sm: string;
  lg: string;
}
