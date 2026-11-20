/**
 * OPCIONAL · Publicar el menú en https://ochentos.com/menu-digital
 *
 * Requiere que el DNS de ochentos.com se administre en Cloudflare (plan gratuito)
 * con los registros del sitio de GoDaddy en modo "proxied" (nube naranja).
 * El sitio de GoDaddy sigue sirviendo todo lo demás; solo /menu-digital/* se
 * toma de la app publicada en Cloudflare Pages (compilada con VITE_BASE_PATH=/menu-digital/).
 *
 * Ruta del Worker (Workers Routes):  ochentos.com/menu-digital*
 * Variable del Worker:               MENU_ORIGIN = https://ochentos-menu.pages.dev
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/menu-digital') {
      return Response.redirect(`${url.origin}/menu-digital/${url.search}`, 301);
    }
    if (!url.pathname.startsWith('/menu-digital/')) return fetch(request); // resto: GoDaddy
    const origin = new URL(env.MENU_ORIGIN);
    // La app vive en la raíz de Pages, pero sus rutas internas llevan el prefijo /menu-digital/.
    const target = new URL(url.pathname.replace(/^\/menu-digital/, '') + url.search, origin);
    const res = await fetch(new Request(target, request));
    return new Response(res.body, res);
  },
};
