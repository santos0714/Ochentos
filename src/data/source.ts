/**
 * Fuente única del menú: el archivo menu.xlsx publicado junto a la página.
 * No hay base de datos ni servidor: para cambiar el menú se reemplaza ese
 * archivo, y las fotos viven en la carpeta «fotos» junto a él.
 */
import type { Menu, PhotoUrls } from '../lib/types';
import type { ParsedMenu } from '../lib/excel/validate';

const BASE = import.meta.env.BASE_URL;
export const MENU_FILE = 'menu.xlsx';
export const MENU_URL = `${BASE}${MENU_FILE}`;
export const PHOTOS_DIR = 'fotos';

/** En la vista previa de un solo archivo el Excel viaja incrustado en la página. */
let embedded: (() => ArrayBuffer) | null = null;
export function setEmbeddedMenu(get: () => ArrayBuffer) {
  embedded = get;
}

export class MenuFileError extends Error {}

/** Descarga el menu.xlsx publicado, siempre la versión más reciente. */
export async function fetchMenuFile(): Promise<ArrayBuffer> {
  if (embedded) return embedded();
  let res: Response;
  try {
    res = await fetch(`${MENU_URL}?v=${Date.now()}`, { cache: 'no-store' });
  } catch {
    throw new MenuFileError('Sin conexión. Revise su internet e intente de nuevo.');
  }
  if (!res.ok) throw new MenuFileError(`No se encontró el archivo del menú (${MENU_FILE}).`);
  return res.arrayBuffer();
}

/** Lee un .xlsx (publicado o elegido en el panel) como menú completo. */
export async function parseMenuFile(buf: ArrayBuffer, name = MENU_FILE): Promise<ParsedMenu> {
  const [{ readWorkbook }, { parseMenu }] = await Promise.all([
    import('../lib/excel/reader'),
    import('../lib/excel/validate'),
  ]);
  const sheets = await readWorkbook({ name, size: buf.byteLength, arrayBuffer: async () => buf });
  return parseMenu(sheets);
}

/** Menú público: lo publicado y válido. Las filas con errores se omiten y se avisan en la consola. */
export async function loadPublishedMenu(): Promise<Menu> {
  const parsed = await parseMenuFile(await fetchMenuFile());
  if (parsed.errors.length) {
    console.warn(`[menú] ${parsed.errors.length} fila(s) con errores se omitieron. Revise el archivo en /admin/.`, parsed.errors);
  }
  if (!parsed.menu.products.length) {
    throw new MenuFileError(parsed.errors[0]?.message ?? 'El archivo del menú no tiene productos.');
  }
  return parsed.menu;
}

export function photoUrls(name: string): PhotoUrls {
  const url = `${BASE}${PHOTOS_DIR}/${encodeURIComponent(name)}`;
  return { sm: url, lg: url };
}
