/**
 * Definición de la plantilla de Excel. Es la única fuente de verdad sobre
 * columnas, hojas y reglas: la usan la exportación, la plantilla y el validador.
 */

export const SHEET_PRODUCTS = 'Productos';
export const SHEET_CATEGORIES = 'Categorias';
export const SHEET_HELP = 'Instrucciones';

/** Un guion en una celda equivale a dejarla vacía (útil en precio/variantes para indicar «no aplica»). */
export const CLEAR = '-';

export interface ColumnDef {
  key: string;
  header: string;
  width: number;
  required: boolean;
  help: string;
  /** Columnas que se exportan para consulta pero se ignoran al importar. */
  readOnly?: boolean;
}

export const PRODUCT_COLUMNS: ColumnDef[] = [
  { key: 'id', header: 'id', width: 30, required: true, help: 'Identificador único y permanente. Minúsculas, números y guiones (ej. pizza-hawaiana). No lo cambie: con él se reconoce el producto y su foto.' },
  { key: 'categoria', header: 'categoria', width: 20, required: true, help: 'id de la categoría (ver hoja Categorias).' },
  { key: 'subcategoria', header: 'subcategoria', width: 14, required: false, help: 'Opcional. Agrupa dentro de la categoría (ej. Tinto, Blanco).' },
  { key: 'nombre', header: 'nombre', width: 30, required: true, help: 'Nombre visible del producto.' },
  { key: 'detalle', header: 'detalle', width: 22, required: false, help: 'Opcional. Línea corta bajo el nombre (estilo de cerveza, bodega…).' },
  { key: 'descripcion', header: 'descripcion', width: 60, required: true, help: 'Ingredientes o descripción.' },
  { key: 'opciones', header: 'opciones', width: 40, required: false, help: 'Opcional. Sabores u opciones separados por " / ".' },
  { key: 'precio', header: 'precio', width: 10, required: true, help: 'Precio único (solo número). Déjelo con "-" si usa variantes.' },
  { key: 'variantes', header: 'variantes', width: 50, required: true, help: 'Tamaños o presentaciones: "Chica: 360 | Mediana: 440". Use "-" si tiene precio único.' },
  { key: 'moneda', header: 'moneda', width: 8, required: true, help: 'MXN o USD.' },
  { key: 'etiquetas', header: 'etiquetas', width: 18, required: false, help: 'Opcional, separadas por coma: nuevo, medalla, vegetariano, picante.' },
  { key: 'publicado', header: 'publicado', width: 10, required: true, help: '"sí" para mostrarlo, "no" para ocultarlo sin borrarlo.' },
  { key: 'orden', header: 'orden', width: 8, required: true, help: 'Número entero. Menor aparece primero dentro de su categoría.' },
  { key: 'foto', header: 'foto', width: 26, required: false, help: 'Opcional. Nombre del archivo de la foto dentro de la carpeta «fotos» (ej. pizza-hawaiana.webp). Vacío = sin foto.' },
];

export const CATEGORY_COLUMNS: ColumnDef[] = [
  { key: 'id', header: 'id', width: 22, required: true, help: 'Identificador único y permanente de la categoría.' },
  { key: 'nombre', header: 'nombre', width: 26, required: true, help: 'Título visible.' },
  { key: 'descripcion', header: 'descripcion', width: 60, required: false, help: 'Opcional. Texto bajo el título (ej. tamaños de pizza).' },
  { key: 'nota', header: 'nota', width: 60, required: false, help: 'Opcional. Aviso al final de la sección.' },
  { key: 'orden', header: 'orden', width: 8, required: true, help: 'Orden de la categoría en el menú.' },
  { key: 'publicado', header: 'publicado', width: 10, required: true, help: '"sí" o "no".' },
];

export const LIMITS = {
  id: 64,
  nombre: 120,
  detalle: 120,
  subcategoria: 60,
  descripcion: 700,
  opciones: 700,
  nota: 400,
  variantes: 8,
  etiquetaVariante: 40,
  precioMax: 100000,
} as const;

export const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Nombre de archivo de foto: sin carpetas ni espacios, con extensión de imagen. */
export const FOTO_RE = /^[a-z0-9][a-z0-9._-]*\.(webp|jpe?g|png)$/i;
