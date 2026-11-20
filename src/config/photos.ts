/**
 * Fotografías reales de Ochentos tomadas de ochentos.com (terraza y mesa con pizzas).
 * Se sirven desde el propio proyecto, optimizadas en WebP y en dos tamaños.
 * Para cambiarlas, reemplace los archivos en src/assets con el mismo nombre.
 */
import terraza1600 from '../assets/terraza-1600.webp';
import terraza900 from '../assets/terraza-900.webp';
import pizzas1200 from '../assets/pizzas-1200.webp';
import pizzas700 from '../assets/pizzas-700.webp';

export interface BrandPhoto {
  src: string;
  srcSet: string;
  width: number;
  height: number;
  alt: string;
}

export const HERO_PHOTO: BrandPhoto = {
  src: terraza900,
  srcSet: `${terraza900} 900w, ${terraza1600} 1600w`,
  width: 1600,
  height: 1066,
  alt: 'Terraza de Ochentos con mesas de madera y vista a los cerros de San Antonio de las Minas',
};

/** Foto de ambiente opcional al inicio de una categoría (por id de categoría). */
export const CATEGORY_PHOTOS: Record<string, BrandPhoto> = {
  pizzas: {
    src: pizzas700,
    srcSet: `${pizzas700} 700w, ${pizzas1200} 1200w`,
    width: 1200,
    height: 1800,
    alt: 'Mesa de Ochentos con pizzas recién servidas',
  },
};
