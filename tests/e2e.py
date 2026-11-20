"""
Prueba de extremo a extremo en navegador real (Chromium) contra `vite preview`.
Ejercita el menú público (leído de dist/menu.xlsx), el panel de revisión y el
flujo de publicar: reemplazar menu.xlsx y subir una foto a dist/fotos.

Uso:  npm run build && npx vite preview --port 4173 &   y luego   python3 tests/e2e.py
"""
import io, os, re, sys, shutil
from pathlib import Path
from openpyxl import load_workbook
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('BASE', 'http://localhost:4173')
OUT = Path(os.environ.get('OUT', '/tmp/e2e'))
OUT.mkdir(parents=True, exist_ok=True)
CHROME = '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome'
results = []

def check(name, cond, detail=''):
    results.append((name, bool(cond), detail))
    print(('PASA ' if cond else 'FALLA') + f'  {name}' + (f'  ({detail})' if detail else ''))

def test_image(path, color, text):
    im = Image.new('RGB', (1800, 1200), color)
    d = ImageDraw.Draw(im)
    d.rectangle((200, 200, 1600, 1000), outline='white', width=20)
    d.text((300, 300), text, fill='white')
    im.save(path, 'JPEG', quality=90)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROME)

    # ------------------------------------------------------------ menú público (móvil)
    ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(BASE + '/')
    page.wait_for_selector('.section')
    page.wait_for_timeout(900)
    page.screenshot(path=str(OUT / 'm1-portada.png'))
    n_sections = page.locator('.section').count()
    n_items = page.locator('.item').count()
    check('12 categorías visibles', n_sections == 12, n_sections)
    check('110 productos visibles', n_items == 110, n_items)
    first_cats = page.locator('.section h2').all_inner_texts()[:3]
    check('orden de categorías configurado', first_cats == ['Pizzas', 'Algo diferente…', 'Entradas'], first_cats)
    names = page.locator('#cat-pizzas .item__name').all_inner_texts()
    check('orden de productos configurado', names[:3] == ['Triple Ochentos', 'Especial', 'Vegetariana'], names[:3])
    check('sin desplazamiento horizontal', page.evaluate('document.documentElement.scrollWidth <= innerWidth'))

    page.locator('.cats__chip', has_text='Pastas').click()
    page.wait_for_timeout(1600)
    top = page.evaluate("document.getElementById('cat-pastas').getBoundingClientRect().top")
    bar = page.evaluate("document.querySelector('.bar').getBoundingClientRect().bottom")
    check('la navegación lleva a la categoría sin taparla', 0 <= top - bar < 40, f'top={top:.0f} barra={bar:.0f}')
    active = page.locator('.cats__chip[aria-current="true"]').inner_text()
    check('categoría activa marcada', active == 'Pastas', active)
    page.screenshot(path=str(OUT / 'm2-pastas.png'))

    page.locator('.cats__chip', has_text='Pizzas').click()
    page.wait_for_timeout(900)
    page.screenshot(path=str(OUT / 'm3-pizzas.png'))

    page.locator('.item__btn', has_text='Triple Ochentos').click()
    dlg = page.locator('dialog.sheet')
    expect(dlg).to_have_attribute('open', '')
    page.wait_for_timeout(500)
    check('detalle abre con nombre', 'Triple Ochentos' in dlg.locator('.sheet__name').inner_text())
    check('detalle muestra 4 tamaños', dlg.locator('.sheet__prices > div').count() == 4)
    check('foco dentro del detalle', page.evaluate("document.querySelector('dialog.sheet').contains(document.activeElement)"))
    page.screenshot(path=str(OUT / 'm4-detalle.png'))
    page.keyboard.press('Escape')
    page.wait_for_timeout(500)
    check('Escape cierra el detalle', dlg.get_attribute('open') is None)
    page.locator('.item__btn', has_text='Lasagna').click()
    page.wait_for_timeout(400)
    page.locator('.sheet__close').click()
    page.wait_for_timeout(500)
    check('botón cerrar funciona', dlg.get_attribute('open') is None)

    page.locator('.icon-btn--search').click()
    page.fill('#menu-search', 'camaron')
    page.wait_for_timeout(300)
    found = page.locator('.item').count()
    check('búsqueda sin acentos encuentra camarón', found >= 7, found)
    page.screenshot(path=str(OUT / 'm5-busqueda.png'))
    page.fill('#menu-search', 'sushi')
    page.wait_for_timeout(300)
    check('mensaje claro sin resultados', page.locator('text=Sin resultados').count() == 1)
    page.locator('#menu-search').press('Escape')
    page.wait_for_timeout(300)
    check('cerrar búsqueda restaura el menú', page.locator('.item').count() == 110)


    # ---- selector Claro / Oscuro
    page.evaluate('scrollTo(0,0)'); page.wait_for_timeout(300)
    page.locator('.hero__top button:has-text("Oscuro")').click()
    page.wait_for_timeout(900)
    check('selector cambia a oscuro', page.evaluate("document.documentElement.dataset.theme") == 'dark')
    bg = page.evaluate("getComputedStyle(document.body).backgroundColor")
    check('fondo oscuro aplicado', bg == 'rgb(14, 13, 12)', bg)
    check('ambos selectores sincronizados', page.locator('.bar .theme__opt[aria-pressed="true"]').get_attribute('aria-label') is None and 'Oscuro' in page.locator('.bar .theme__opt[aria-pressed="true"]').inner_text())
    page.screenshot(path=str(OUT / 'm0-oscuro.png'))
    page.reload(); page.wait_for_selector('.section')
    check('el tema elegido se recuerda', page.evaluate("document.documentElement.dataset.theme") == 'dark')
    page.locator('.hero__top button:has-text("Claro")').click()
    page.wait_for_timeout(900)
    check('selector vuelve a claro', page.evaluate("getComputedStyle(document.body).backgroundColor") == 'rgb(255, 255, 255)')

    page.locator('#cat-vinos').scroll_into_view_if_needed()
    page.wait_for_timeout(900)
    page.screenshot(path=str(OUT / 'm6-vinos.png'))
    check('sin errores de JavaScript (móvil)', not errors, errors[:2])
    ctx.close()

    # ------------------------------------------------------------ escritorio
    ctx = browser.new_context(viewport={'width': 1366, 'height': 900})
    page = ctx.new_page()
    page.goto(BASE + '/')
    page.wait_for_selector('.section')
    page.wait_for_timeout(900)
    page.screenshot(path=str(OUT / 'd1-portada.png'))
    page.mouse.wheel(0, 700)
    page.wait_for_timeout(900)
    page.screenshot(path=str(OUT / 'd2-pizzas.png'))
    page.locator('.cats__chip', has_text='Cerveza artesanal').click()
    page.wait_for_timeout(1100)
    page.screenshot(path=str(OUT / 'd3-cerveza.png'))
    page.locator('.item__btn', has_text='Chivito Lai').click()
    page.wait_for_timeout(500)
    page.screenshot(path=str(OUT / 'd4-detalle.png'))
    ctx.close()

    # ------------------------------------------------------------ panel: revisar Excel
    DIST = Path(__file__).resolve().parent.parent / 'dist'
    original = (DIST / 'menu.xlsx').read_bytes()
    ctx = browser.new_context(viewport={'width': 1280, 'height': 900}, accept_downloads=True)
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(BASE + '/admin/')
    page.wait_for_selector('button:has-text("Descargar menu.xlsx (110 productos)")')
    check('el panel abre sin usuario ni contraseña', page.locator('#adm-email').count() == 0)
    page.screenshot(path=str(OUT / 'a1-panel.png'))

    with page.expect_download() as d:
        page.click('button:has-text("Descargar menu.xlsx")')
    xlsx = OUT / 'menu-descargado.xlsx'
    d.value.save_as(xlsx)
    check('descarga el menú publicado con el nombre menu.xlsx', d.value.suggested_filename == 'menu.xlsx' and xlsx.read_bytes() == original)
    with page.expect_download() as d2:
        page.click('button:has-text("Plantilla en blanco")')
    check('descarga la plantilla en blanco', d2.value.suggested_filename == 'plantilla-menu.xlsx')

    wb = load_workbook(xlsx)
    ws = wb['Productos']
    head = [c.value for c in ws[1]]
    col = {h: i + 1 for i, h in enumerate(head)}
    check('columnas mínimas y columna foto', all(k in col for k in ['id', 'nombre', 'descripcion', 'categoria', 'precio', 'moneda', 'publicado', 'orden', 'foto']), head)
    check('hojas Productos, Categorias, Instrucciones', wb.sheetnames == ['Productos', 'Categorias', 'Instrucciones'], wb.sheetnames)

    def row_of(ws, pid):
        for r in range(2, ws.max_row + 1):
            if ws.cell(r, 1).value == pid:
                return r
        raise KeyError(pid)

    # 1) archivo con errores
    wb = load_workbook(xlsx); ws = wb['Productos']
    ws.cell(row_of(ws, 'entrada-caprese'), col['precio'], 'doscientos')
    ws.append(['pizza-hawaiana', 'pizzas', None, 'Duplicada', None, 'x', None, 100, '-', 'MXN', None, 'sí', 1])
    bad = OUT / 'con-errores.xlsx'; wb.save(bad)
    page.set_input_files('#xlsx-file', str(bad))
    page.wait_for_selector('text=Resultado de la revisión')
    page.screenshot(path=str(OUT / 'a2-errores.png'), full_page=True)
    rows = page.locator('.adm-table tbody tr').count()
    check('errores mostrados por fila', rows == 2, rows)
    check('indica que aún no se debe publicar', page.locator('text=Publicar cuando no haya errores').count() == 1)

    # 2) estructura incorrecta
    wb = load_workbook(xlsx); ws = wb['Productos']
    ws.cell(1, col['precio'], 'costo')
    wrong = OUT / 'estructura.xlsx'; wb.save(wrong)
    page.set_input_files('#xlsx-file', str(wrong))
    page.wait_for_selector('text=Faltan columnas obligatorias')
    check('rechaza estructura incorrecta', True)

    # 3) archivo no xlsx
    csvf = OUT / 'menu.csv'; csvf.write_text('id,nombre\n')
    page.set_input_files('#xlsx-file', str(csvf))
    page.wait_for_selector('text=extensión .xlsx')
    check('rechaza archivo que no es .xlsx', True)

    # 4) cambios válidos + foto
    wb = load_workbook(xlsx); ws = wb['Productos']
    ws.cell(row_of(ws, 'entrada-caprese'), col['precio'], 285)
    ws.cell(row_of(ws, 'pizza-hawaiana'), col['nombre'], 'Hawaiana de la casa')
    ws.cell(row_of(ws, 'pizza-margarita'), col['foto'], 'pizza-margarita.webp')
    ws.delete_rows(row_of(ws, 'bebida-cafe-te'))
    ws.append(['pizza-chorizo-prueba', 'pizzas', None, 'Chorizo (prueba)', None, 'Chorizo de la casa y cebolla.', None, '-', 'Chica: 280 | Grande: 470', 'MXN', 'nuevo', 'sí', 115])
    good = OUT / 'menu.xlsx'; wb.save(good)
    page.set_input_files('#xlsx-file', str(good))
    page.wait_for_selector('text=Listo para publicar')
    page.wait_for_selector('text=Fotos que todavía no están subidas')
    stats = ' '.join(page.locator('.adm-stats').inner_text().split())
    check('revisión: 1 nuevo, 3 modificados, 1 se quitará', '1 nuevos' in stats and '3 modificados' in stats and '1 se quitarán' in stats, stats)
    check('avisa qué producto desaparecerá', 'Café regular' in page.locator('.adm-preview').inner_text())
    check('avisa la foto que falta subir', 'pizza-margarita.webp' in page.locator('.adm-preview').inner_text())
    page.screenshot(path=str(OUT / 'a3-revision.png'), full_page=True)

    # 5) vista previa antes de publicar
    page.click('button:has-text("Ver cómo quedará el menú")')
    page.wait_for_selector('.section')
    check('vista previa muestra el cambio sin publicarlo', '$285' in page.locator('.item', has_text='Caprese').inner_text())
    page.screenshot(path=str(OUT / 'a4-vista-previa.png'))
    page.click('button:has-text("Volver a la revisión")')
    page.wait_for_selector('text=Resultado de la revisión')
    pub = ctx.new_page(); pub.goto(BASE + '/'); pub.wait_for_selector('.section')
    check('el menú publicado no cambia solo por revisar', '$260' in pub.locator('.item', has_text='Caprese').inner_text())

    # ------------------------------------------------------------ fotos
    page.click('button[role="tab"]:has-text("Fotografías")')
    page.fill('#ph-q', 'margarita')
    page.locator('.adm-pitem', has_text='Pizzas').first.click()
    img1 = OUT / 'foto1.jpg'; test_image(img1, (180, 60, 30), 'PRUEBA 1')
    page.set_input_files('input[id^="ph-file-"]', str(img1))
    page.wait_for_selector('text=Nueva, optimizada')
    with page.expect_download() as d3:
        page.click('button:has-text("Descargar pizza-margarita.")')
    foto_name = d3.value.suggested_filename
    check('la foto se descarga con el nombre del producto', foto_name in ('pizza-margarita.webp', 'pizza-margarita.jpg'), foto_name)
    bad_img = OUT / 'no-imagen.jpg'; bad_img.write_text('no soy una imagen')
    page.set_input_files('input[id^="ph-file-"]', str(bad_img))
    page.wait_for_selector('text=No se pudo abrir la imagen')
    gif = OUT / 'x.gif'; Image.new('RGB', (10, 10)).save(gif, 'GIF')
    page.set_input_files('input[id^="ph-file-"]', str(gif))
    page.wait_for_selector('text=Formato no admitido')
    check('valida tipo de archivo de foto', True)
    check('sin errores de JavaScript (panel)', not errors, errors[:2])

    # ------------------------------------------------------------ publicar = reemplazar archivos
    try:
        d3.value.save_as(DIST / 'fotos' / 'pizza-margarita.webp')
        (DIST / 'menu.xlsx').write_bytes(good.read_bytes())
        pub.reload(); pub.wait_for_selector('.section'); pub.wait_for_timeout(500)
        check('tras reemplazar menu.xlsx el menú muestra el precio nuevo', '$285' in pub.locator('.item', has_text='Caprese').inner_text())
        check('muestra el producto nuevo', pub.locator('.item', has_text='Chorizo (prueba)').count() == 1)
        check('quita el producto borrado del archivo', pub.locator('.item', has_text='Café regular').count() == 0)
        marg = pub.locator('#cat-pizzas .item', has_text='Margarita').first
        marg.scroll_into_view_if_needed(); pub.wait_for_timeout(800)
        check('muestra la foto subida', marg.locator('.item__photo img').evaluate('i => i.complete && i.naturalWidth > 0'))
        pub.screenshot(path=str(OUT / 'a5-publicado.png'))
        # foto nombrada pero no subida: no se muestra imagen rota
        wb = load_workbook(good); ws = wb['Productos']
        ws.cell(row_of(ws, 'pizza-bbq'), col['foto'], 'no-existe.webp')
        wb.save(DIST / 'menu.xlsx')
        pub.reload(); pub.wait_for_selector('.section')
        pub.locator('.item', has_text='BBQ').first.scroll_into_view_if_needed(); pub.wait_for_timeout(1000)
        hidden = pub.evaluate("(() => { const it=[...document.querySelectorAll('.item')].find(e=>e.textContent.includes('BBQ')); const f=it && it.querySelector('.item__photo'); return !f || f.hidden; })()")
        check('foto faltante no se ve rota', hidden)
    finally:
        (DIST / 'menu.xlsx').write_bytes(original)
        (DIST / 'fotos' / 'pizza-margarita.webp').unlink(missing_ok=True)
    pub.close()

    # panel en móvil
    page.set_viewport_size({'width': 390, 'height': 844})
    page.click('button[role="tab"]:has-text("Productos y precios")')
    page.wait_for_timeout(300)
    page.screenshot(path=str(OUT / 'a6-panel-movil.png'), full_page=True)
    check('panel sin desplazamiento horizontal en móvil', page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
    browser.close()

failed = [r for r in results if not r[1]]
print(f'\n{len(results) - len(failed)}/{len(results)} comprobaciones pasaron')
sys.exit(1 if failed else 0)
