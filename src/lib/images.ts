/**
 * Optimización de fotografías en el navegador antes de subirlas:
 * corrige la orientación, reduce a dos tamaños y codifica en WebP (o JPEG si el
 * navegador no sabe generar WebP). Así el servidor nunca recibe fotos de 12 MB.
 */

export const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_INPUT_BYTES = 15 * 1024 * 1024;
const SIZES = { lg: 1600, sm: 640 } as const;
const MIN_SIDE = 500;

export class ImageError extends Error {}

export function checkImageFile(f: File): void {
  if (!ACCEPTED.includes(f.type)) {
    throw new ImageError(
      /heic|heif/i.test(f.type || f.name)
        ? 'Las fotos HEIC del iPhone no son compatibles. En el iPhone: Ajustes › Cámara › Formatos › "Más compatible", o envíela como JPG.'
        : 'Formato no admitido. Use JPG, PNG o WebP.',
    );
  }
  if (f.size > MAX_INPUT_BYTES) throw new ImageError('La foto pesa más de 15 MB. Use una versión más ligera.');
}

async function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  const as = (type: string) => new Promise<Blob | null>((res) => canvas.toBlob(res, type, quality));
  const webp = await as('image/webp');
  if (webp && webp.type === 'image/webp') return webp;
  const jpg = await as('image/jpeg');
  if (!jpg) throw new ImageError('Este navegador no pudo procesar la imagen.');
  return jpg;
}

function draw(bmp: ImageBitmap, max: number): HTMLCanvasElement {
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  return c;
}

export interface Optimized {
  lg: Blob;
  sm: Blob;
  width: number;
  height: number;
  warning?: string;
}

export async function optimizeImage(f: File): Promise<Optimized> {
  checkImageFile(f);
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(f, { imageOrientation: 'from-image' });
  } catch {
    throw new ImageError('No se pudo abrir la imagen. ¿Está dañada?');
  }
  try {
    const lg = await encode(draw(bmp, SIZES.lg), 0.82);
    const sm = await encode(draw(bmp, SIZES.sm), 0.78);
    const warning =
      Math.min(bmp.width, bmp.height) < MIN_SIDE
        ? `La foto es pequeña (${bmp.width}×${bmp.height}); podría verse borrosa en pantallas grandes.`
        : undefined;
    return { lg, sm, width: bmp.width, height: bmp.height, warning };
  } finally {
    bmp.close();
  }
}
