/// <reference types="vite/client" />
interface ImportMetaEnv {
  /** Opcional: enlace a la carpeta donde se sube menu.xlsx (p. ej. en GitHub). */
  readonly VITE_UPDATE_URL?: string;
  /** "1" en la versión de muestra: aviso de propuesta y sin indexar en buscadores. */
  readonly VITE_PROPUESTA?: string;
}
