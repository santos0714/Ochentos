import { useCallback, useEffect, useState } from 'react';
import wordmark from '../assets/logo-wordmark.png';
import { fetchMenuFile, parseMenuFile } from '../data/source';
import type { Menu } from '../lib/types';
import { ExcelPanel } from './ExcelPanel';
import { PhotoPanel } from './PhotoPanel';
import { ThemeToggle } from '../public/theme';
import { MenuApp } from '../public/MenuApp';

type Tab = 'excel' | 'fotos';
type Published = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; menu: Menu; buf: ArrayBuffer };

/**
 * Herramienta para el equipo del restaurante. No guarda nada en ningún servidor:
 * revisa el Excel, muestra cómo se verá y prepara las fotos. Publicar es
 * reemplazar menu.xlsx (y subir fotos) en el alojamiento de la página.
 */
export function AdminApp() {
  const [tab, setTab] = useState<Tab>('excel');
  const [published, setPublished] = useState<Published>({ status: 'loading' });
  const [preview, setPreview] = useState<Menu | null>(null);

  const load = useCallback(async () => {
    setPublished({ status: 'loading' });
    try {
      const buf = await fetchMenuFile();
      const parsed = await parseMenuFile(buf);
      setPublished({ status: 'ready', menu: parsed.menu, buf });
    } catch (e) {
      setPublished({ status: 'error', message: (e as Error).message });
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openPreview = (menu: Menu) => { setPreview(menu); window.scrollTo(0, 0); };

  return (
    <>
    {preview && (
      <>
        <button className="adm-back" onClick={() => { setPreview(null); window.scrollTo(0, 0); }}>
          ← Volver a la revisión
        </button>
        <p className="adm-preview-note" role="note">Vista previa del archivo revisado · aún no está publicado</p>
        <MenuApp menu={preview} />
      </>
    )}
    {/* El panel se oculta (no se desmonta) durante la vista previa para conservar la revisión. */}
    <div className="adm" hidden={!!preview}>
      <header className="adm-top">
        <img src={wordmark} alt="Ochentos Pizza" width={1161} height={125} className="adm-top__logo" />
        <span className="adm-top__title">Actualizar el menú</span>
        <ThemeToggle variant="compact" />
      </header>

      <main className="adm-main">
        <nav className="adm-tabs" role="tablist" aria-label="Secciones">
          {([['excel', 'Productos y precios (Excel)'], ['fotos', 'Fotografías']] as const).map(([id, label]) => (
            <button key={id} role="tab" id={`tab-${id}`} aria-controls={`panel-${id}`} aria-selected={tab === id}
              className="adm-tab" onClick={() => setTab(id)}>{label}</button>
          ))}
          <a className="adm-tabs__link" href={import.meta.env.BASE_URL} target="_blank" rel="noopener">Ver menú publicado ↗</a>
        </nav>

        {published.status === 'error' && (
          <div className="adm-alert adm-alert--error" role="alert">
            No se pudo leer el menú publicado: {published.message}{' '}
            <button className="adm-btn adm-btn--small" onClick={load}>Reintentar</button>
          </div>
        )}

        <section id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`}>
          {tab === 'excel' ? (
            <ExcelPanel
              published={published.status === 'ready' ? published.menu : null}
              publishedFile={published.status === 'ready' ? published.buf : null}
              onPreview={openPreview}
            />
          ) : (
            <PhotoPanel menu={published.status === 'ready' ? published.menu : null} />
          )}
        </section>
      </main>
    </div>
    </>
  );
}
