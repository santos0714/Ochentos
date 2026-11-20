# Menú digital · Ochentos Pizza

Menú de consulta para teléfonos, tablets y computadoras, con el logotipo y las tipografías de Ochentos, fotografía real del lugar, modo claro y oscuro, y animaciones cuidadas.

**Todo el menú vive en un archivo de Excel: `menu.xlsx`.** No hay base de datos, servidor ni cuentas que mantener. Para cambiar precios, platillos o fotos se reemplaza ese archivo (y se suben las fotos a la carpeta `fotos`).

No incluye carrito, pedidos ni pagos.

---

## 1. Cómo funciona

```
sitio publicado/
├── index.html        el menú
├── admin/            herramienta para revisar el Excel y preparar fotos
├── menu.xlsx         ← EL MENÚ (lo que diga este archivo es lo que se ve)
└── fotos/            ← fotos de los platillos (pizza-hawaiana.webp, …)
```

Cada vez que alguien abre el menú, la página lee el `menu.xlsx` publicado. Reemplazar ese archivo cambia el menú, sin tocar código ni volver a compilar.

- Las filas con errores se omiten (el resto del menú sigue funcionando) y se reportan en `/admin/`.
- Si una fila nombra una foto que todavía no se ha subido, el platillo se muestra sin foto (nunca una imagen rota).
- Las fotos de la portada y de la sección Pizzas son fotos reales tomadas de ochentos.com; están en `src/assets` y se cambian en `src/config/photos.ts`.

## 2. Actualizar el menú (para el equipo del restaurante)

1. Entre a **`/admin/`** › «Descargar menu.xlsx». Ábralo en Excel.
2. Haga los cambios. La hoja «Instrucciones» explica cada columna.
3. En `/admin/` › «Revisar el archivo editado», elija el archivo. Verá:
   - los errores por hoja, fila y columna, con qué corregir;
   - qué productos son nuevos, cuáles cambian (antes → después) y cuáles desaparecerán;
   - las fotos nombradas que aún no están subidas;
   - el botón «Ver cómo quedará el menú», con la vista previa completa antes de publicar.
4. Cuando diga **«Listo para publicar»**: guarde el archivo con el nombre exacto `menu.xlsx` y súbalo en lugar del anterior (sección 5).

Revisar en `/admin/` no publica nada ni cambia el menú: solo revisa el archivo en esa computadora.

### Columnas de la hoja «Productos»

| Columna | Qué escribir |
|---|---|
| `id` | Identificador único: minúsculas, números y guiones (`pizza-chorizo`). No lo cambie en productos existentes. |
| `categoria` | id de la hoja Categorias (`pizzas`, `pastas`…). |
| `nombre`, `descripcion` | Texto libre. |
| `precio` | Solo el número (`260`). Si el producto tiene tamaños, escriba `-`. |
| `variantes` | `Chica: 360 \| Mediana: 440 \| Grande: 550`. Si tiene precio único, escriba `-`. |
| `opciones` | Sabores separados por ` / ` (`Fresa / Mango / Kiwi`). |
| `etiquetas` | `nuevo`, `medalla`, `vegetariano`, `picante`, separadas por coma. |
| `publicado` | `sí` o `no`. «no» oculta el producto sin borrar su fila. |
| `orden` | Número; menor aparece primero en su categoría. |
| `foto` | Nombre del archivo en la carpeta `fotos` (`pizza-hawaiana.webp`). Vacío = sin foto. |

Reglas:
- **El archivo es el menú.** Borrar una fila quita ese producto de la página. Para ocultarlo un tiempo, use `publicado = no`.
- Celda vacía = sin dato.
- Las categorías se editan en la hoja Categorias (nombre, orden, texto bajo el título, nota al final y publicado). Un texto con ` | ` bajo el título se muestra como leyenda; así aparecen los tamaños de pizza.

## 3. Fotos de los platillos

1. `/admin/` › **Fotografías** › elija el platillo › «Elegir foto».
2. La página la optimiza (de varios MB a unos cientos de KB) y la descarga con el nombre correcto, p. ej. `pizza-margarita.webp`.
3. Suba ese archivo a la carpeta `fotos` del sitio.
4. En el Excel, escriba ese nombre en la columna `foto` de la fila del platillo, y publique el Excel.

Use fotos reales del platillo, horizontales o cuadradas, en JPG, PNG o WebP de hasta 15 MB. Las fotos HEIC del iPhone no funcionan: en el iPhone, Ajustes › Cámara › Formatos › «Más compatible».

## 4. Ejecutar localmente (para quien mantenga el código)

Requisitos: Node.js 20 o superior.

```bash
npm install
npm run dev          # menú en http://localhost:5173 · revisión en /admin/
npm test             # pruebas del Excel (lectura, validación, comparación)
npm run build        # compila a dist/ (incluye menu.xlsx y la carpeta fotos)
```

`public/menu.xlsx` es el menú inicial, transcrito del PDF de octubre 2026 (`src/data/seed.json`). `npm run menu:inicial -- --force` lo regenera desde ese archivo; normalmente no hace falta.

Variables opcionales al compilar (ver `.env.example`; ninguna es secreta):

| Variable | Para qué |
|---|---|
| `VITE_BASE_PATH` | `/` para un dominio o subdominio propio; `/menu-digital/` si va dentro de otra ruta. |
| `VITE_UPDATE_URL` | Enlace a la carpeta donde se sube `menu.xlsx`. Si se define, `/admin/` muestra un botón para ir ahí. |

## 5. Publicar y actualizar el sitio

Cualquier alojamiento de páginas estáticas sirve; no necesita servidor ni base de datos. Recomendado: **GitHub + Cloudflare Pages** (gratuito), porque así actualizar el menú es subir un archivo desde el navegador.

**Una sola vez:**
1. Suba esta carpeta a un repositorio de GitHub.
2. Cloudflare › Workers & Pages › Create › Pages › conectar el repositorio. Build command: `npm run build` · Output directory: `dist`.
3. Opcional: `VITE_UPDATE_URL` = dirección de la carpeta `public` del repositorio en GitHub.

**Cada actualización del menú:**
1. En GitHub, entre a la carpeta `public` › «Add file» › «Upload files».
2. Arrastre el nuevo `menu.xlsx` (y, si hay, las fotos nuevas dentro de `public/fotos`) › «Commit changes».
3. Cloudflare vuelve a publicar solo; en uno o dos minutos el menú muestra los cambios.

Alternativa sin GitHub: compilar una vez con `npm run build` y subir la carpeta `dist` por arrastre (Netlify Drop o Cloudflare Pages «Upload assets»). Para actualizar, se reemplazan `menu.xlsx` y las fotos en esa carpeta y se vuelve a subir.

El archivo `public/_headers` agrega cabeceras de seguridad, evita que `/admin/` aparezca en buscadores y pide a los navegadores que no guarden en caché `menu.xlsx`, para que los cambios se vean de inmediato.

## 6. Dominio

ochentos.com está en GoDaddy Website Builder, que no puede servir otra aplicación dentro de una ruta.

- **Dominio propio para el menú:** en Cloudflare Pages › Custom domains, agregue el dominio y siga las instrucciones de DNS.
- **Subdominio (`menu.ochentos.com`):** en GoDaddy › DNS, registro `CNAME` con nombre `menu` y como valor la dirección de Cloudflare Pages (p. ej. `ochentos-menu.pages.dev`); luego agréguelo en Custom domains.
- **Exactamente `ochentos.com/menu-digital`:** requiere mover el DNS a Cloudflare y usar `deploy/cloudflare-worker.js`, compilando con `VITE_BASE_PATH=/menu-digital/`. Revise los registros MX (correo) antes de cambiar los nameservers.

En el editor de GoDaddy, cambie el enlace «Menú» del sitio para que apunte a la dirección nueva, y use esa misma dirección en los códigos QR de las mesas.

## 7. Problemas habituales

| Mensaje o síntoma | Solución |
|---|---|
| «Faltan columnas obligatorias» | Se cambió o borró un encabezado. Descargue de nuevo `menu.xlsx` desde `/admin/` y edite sobre ese archivo. |
| «La categoría X no existe» | Escriba el id exacto de la hoja Categorias, o cree la categoría en esa hoja. |
| «Tiene precio y variantes a la vez» | Deje uno y escriba `-` en el otro. |
| «El id … solo puede tener minúsculas…» | Sin acentos, espacios ni mayúsculas: `pizza-camaron-2`. |
| «El archivo debe ser .xlsx» | En Excel: Archivo › Guardar como › Libro de Excel (.xlsx). Desde Google Sheets: Archivo › Descargar › .xlsx. |
| Un producto no aparece | Su fila tiene un error (revise el archivo en `/admin/`) o tiene `publicado = no`. |
| Una foto no aparece | El nombre en la columna `foto` no coincide con el archivo en `fotos` (mayúsculas y extensión cuentan). `/admin/` lista las que faltan. |
| Subí el archivo y no cambia | Espere uno o dos minutos y recargue. Revise que el archivo se llame exactamente `menu.xlsx` y esté en la carpeta correcta. |

## 8. Estructura del proyecto

```
index.html                 menú público
admin/index.html           revisión del Excel y fotos (no indexado)
public/menu.xlsx           EL MENÚ
public/fotos/              fotos de los platillos
src/data/source.ts         lectura de menu.xlsx y rutas de fotos
src/public/                componentes del menú (portada, barra, secciones, detalle, animaciones, tema)
src/admin/                 revisión del Excel y preparación de fotos
src/lib/excel/             columnas (schema.ts), validación y comparación (validate.ts),
                           lectura (reader.ts) y plantilla (workbook.ts)
src/lib/images.ts          optimización de fotos en el navegador
src/data/seed.json         contenido transcrito del PDF (origen del menu.xlsx inicial)
src/config/                textos de marca, fotos de portada y enlace de actualización
tests/e2e.py               prueba en navegador real (Playwright)
docs/PENDIENTES.md         datos por confirmar con el restaurante
```

Prueba de navegador: `npm run build && npx vite preview --port 4173` y, en otra terminal, `python3 tests/e2e.py`. La prueba reemplaza temporalmente `dist/menu.xlsx` y sube una foto a `dist/fotos` para comprobar el flujo de publicar, y al final los restaura.

## 9. Versión de muestra en GitHub Pages

`.github/workflows/pages.yml` publica el sitio en `https://<usuario>.github.io/<repositorio>/` cada vez que se sube un cambio a la rama `main`. Esa versión lleva el aviso «Propuesta de diseño · aún no es el sitio oficial» y está bloqueada para buscadores (`VITE_PROPUESTA=1` y un `robots.txt` que lo impide). Para activarla una sola vez: en el repositorio, Settings › Pages › Source: **GitHub Actions**.

Cuando el restaurante apruebe, el sitio definitivo se publica sin `VITE_PROPUESTA` (sección 5), con su dominio.
