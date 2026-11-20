import { useRef, useState } from 'react';
import { MENU_FILE, parseMenuFile, photoUrls } from '../data/source';
import { UPDATE_URL } from '../config/publishing';
import type { Menu, Product } from '../lib/types';
import { compareMenus, type MenuComparison, type ParsedMenu } from '../lib/excel/validate';
import { download } from './download';

type Step =
  | { s: 'idle' }
  | { s: 'reading'; name: string }
  | { s: 'checked'; name: string; parsed: ParsedMenu; cmp: MenuComparison | null; missingPhotos: Product[] | null }
  | { s: 'failed'; message: string };

/** Comprueba en el navegador qué fotos nombradas en el Excel todavía no están subidas. */
function findMissingPhotos(products: Product[]): Promise<Product[]> {
  const withPhoto = products.filter((p) => p.imagen);
  return Promise.all(
    withPhoto.map((p) => new Promise<Product | null>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(null);
      img.onerror = () => resolve(p);
      img.src = photoUrls(p.imagen!).sm;
    })),
  ).then((r) => r.filter((x): x is Product => x !== null));
}

export function ExcelPanel({ published, publishedFile, onPreview }: {
  published: Menu | null;
  publishedFile: ArrayBuffer | null;
  onPreview(menu: Menu): void;
}) {
  const [step, setStep] = useState<Step>({ s: 'idle' });
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function blankTemplate() {
    setBusy(true);
    try {
      const { buildWorkbook } = await import('../lib/excel/workbook');
      download(await buildWorkbook(published ?? { categories: [], products: [] }, { blank: true }), 'plantilla-menu.xlsx');
    } catch (e) {
      setStep({ s: 'failed', message: `No se pudo generar la plantilla: ${(e as Error).message}` });
    } finally { setBusy(false); }
  }

  async function onFile(f: File | undefined) {
    if (!f) return;
    setStep({ s: 'reading', name: f.name });
    try {
      const parsed = await parseMenuFile(await f.arrayBuffer(), f.name);
      const cmp = published ? compareMenus(published, parsed.menu) : null;
      setStep({ s: 'checked', name: f.name, parsed, cmp, missingPhotos: null });
      const missing = await findMissingPhotos(parsed.menu.products);
      setStep((cur) => (cur.s === 'checked' && cur.parsed === parsed ? { ...cur, missingPhotos: missing } : cur));
    } catch (e) {
      setStep({ s: 'failed', message: (e as Error).message });
    } finally {
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div className="adm-stack">
      <div className="adm-card">
        <h2><span className="adm-step">1</span> Descargar el menú</h2>
        <p>Descargue el menú publicado, ábralo en Excel y haga los cambios. Ese archivo <strong>es</strong> el menú: lo que diga es lo que verán los clientes. La hoja «Instrucciones» explica cada columna.</p>
        <div className="adm-row">
          <button className="adm-btn adm-btn--primary" disabled={!publishedFile}
            onClick={() => publishedFile && download(new Blob([publishedFile]), MENU_FILE)}>
            Descargar {MENU_FILE}{published ? ` (${published.products.length} productos)` : ''}
          </button>
          <button className="adm-btn" onClick={blankTemplate} disabled={busy}>{busy ? 'Generando…' : 'Plantilla en blanco'}</button>
        </div>
      </div>

      <div className="adm-card">
        <h2><span className="adm-step">2</span> Revisar el archivo editado</h2>
        <label
          className={`adm-drop${drag ? ' is-drag' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files[0]); }}
        >
          <input ref={input} id="xlsx-file" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
          <strong>Elegir archivo .xlsx</strong>
          <span>o arrástrelo aquí. Solo se revisa en esta computadora; no se publica nada.</span>
        </label>
        {step.s === 'reading' && <p className="adm-muted" role="status">Revisando «{step.name}»…</p>}
        {step.s === 'failed' && <p className="adm-alert adm-alert--error" role="alert">{step.message}</p>}
      </div>

      {step.s === 'checked' && (
        <Review step={step} onPreview={() => onPreview(step.parsed.menu)} hasPublished={!!published} />
      )}
    </div>
  );
}

function Review({ step, onPreview, hasPublished }: {
  step: Extract<Step, { s: 'checked' }>;
  onPreview(): void;
  hasPublished: boolean;
}) {
  const { parsed, cmp, missingPhotos, name } = step;
  const ok = parsed.errors.length === 0;
  const cats = parsed.menu.categories.length;
  const prods = parsed.menu.products.length;

  return (
    <div className="adm-card adm-preview" aria-live="polite">
      <h2><span className="adm-step">3</span> Resultado de la revisión</h2>
      <p className="adm-muted">Archivo: {name} · {prods} productos en {cats} categorías</p>

      {cmp && (
        <ul className="adm-stats" role="list">
          <li className="is-new"><b>{cmp.added.length}</b> nuevos</li>
          <li className="is-changed"><b>{cmp.changed.length}</b> modificados</li>
          <li className={cmp.removed.length ? 'is-error' : ''}><b>{cmp.removed.length}</b> se quitarán</li>
          <li><b>{cmp.unchanged}</b> sin cambios</li>
          <li className={parsed.errors.length ? 'is-error' : ''}><b>{parsed.errors.length}</b> con errores</li>
        </ul>
      )}

      {!ok && (
        <>
          <p className="adm-alert adm-alert--error">
            Corrija estas filas en Excel y vuelva a revisar el archivo. Si se publicara así, estas filas no aparecerían en el menú.
          </p>
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead><tr><th>Hoja</th><th>Fila</th><th>Columna</th><th>Qué corregir</th></tr></thead>
              <tbody>
                {parsed.errors.map((e, i) => (
                  <tr key={i}><td>{e.sheet}</td><td>{e.row ?? '—'}</td><td>{e.column ?? '—'}</td><td>{e.message}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {parsed.warnings.length > 0 && (
        <ul className="adm-warnings">{parsed.warnings.map((w, i) => <li key={i}>{w.message}</li>)}</ul>
      )}

      {cmp && cmp.removed.length > 0 && (
        <div className="adm-alert">
          <strong>Estos productos ya no están en el archivo y desaparecerán del menú:</strong>{' '}
          {cmp.removed.map((p) => p.nombre).join(', ')}.
          {' '}Si solo quiere ocultarlos un tiempo, vuelva a poner sus filas con «publicado» = no.
        </div>
      )}

      {missingPhotos && missingPhotos.length > 0 && (
        <div className="adm-alert">
          <strong>Fotos que todavía no están subidas</strong> (se verán sin foto hasta que las suba a la carpeta «fotos»):{' '}
          {missingPhotos.map((p) => `${p.nombre} (${p.imagen})`).join(', ')}.
        </div>
      )}

      {cmp && cmp.changed.length + cmp.added.length > 0 && (
        <div className="adm-changes">
          <h3>Cambios respecto al menú publicado</h3>
          {cmp.added.map((p) => (
            <details key={p.id} className="adm-change">
              <summary><span className="adm-pill is-new">Nuevo</span><span className="adm-change__name">{p.nombre}</span><code>{p.id}</code></summary>
            </details>
          ))}
          {cmp.changed.map((c) => (
            <details key={c.item.id} className="adm-change" open={cmp.changed.length <= 6}>
              <summary><span className="adm-pill is-changed">Modificado</span><span className="adm-change__name">{c.item.nombre}</span><code>{c.item.id}</code></summary>
              <table className="adm-table adm-table--diff">
                <tbody>
                  {c.changes.map((f) => (
                    <tr key={f.field}><th>{f.field}</th><td className="before">{f.before}</td><td aria-hidden="true">→</td><td className="after">{f.after}</td></tr>
                  ))}
                </tbody>
              </table>
            </details>
          ))}
        </div>
      )}

      {cmp && cmp.added.length + cmp.changed.length + cmp.removed.length === 0 && ok && (
        <p className="adm-alert">Este archivo es igual al menú publicado.</p>
      )}
      {!hasPublished && <p className="adm-muted">No se pudo leer el menú publicado, así que no se muestran las diferencias.</p>}

      <div className="adm-row">
        <button className="adm-btn adm-btn--primary" onClick={onPreview} disabled={prods === 0}>Ver cómo quedará el menú</button>
      </div>

      {prods > 0 && (
        <div className={`adm-publish${ok ? '' : ' is-blocked'}`}>
          <h3>{ok ? 'Listo para publicar' : 'Publicar cuando no haya errores'}</h3>
          <ol>
            <li>Guarde el archivo con el nombre exacto <code>{MENU_FILE}</code>.</li>
            <li>Súbalo a la carpeta del sitio en lugar del anterior{UPDATE_URL ? ' (botón de abajo)' : ''}, junto con las fotos nuevas en la carpeta <code>fotos</code>.</li>
            <li>En uno o dos minutos el menú publicado mostrará los cambios.</li>
          </ol>
          {UPDATE_URL && <a className="adm-btn" href={UPDATE_URL} target="_blank" rel="noopener">Abrir la carpeta del sitio ↗</a>}
        </div>
      )}
    </div>
  );
}
