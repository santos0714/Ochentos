/**
 * Dónde se sube el menu.xlsx actualizado (opcional). Si se define
 * VITE_UPDATE_URL al publicar el sitio (por ejemplo, la carpeta «public» del
 * repositorio en GitHub), el panel muestra un botón que lleva directo ahí.
 */
export const UPDATE_URL: string = (import.meta.env.VITE_UPDATE_URL as string | undefined) ?? '';
