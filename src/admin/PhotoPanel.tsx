import { useEffect, useMemo, useState } from 'react';
import { photoUrls } from '../data/source';
import { byOrder, fold } from '../lib/format';
import { ACCEPTED, optimizeImage, type Optimized } from '../lib/images';
import type { Menu, Product } from '../lib/types';
import { download } from './download';

/**
 * Prepara una foto para un producto: la optimiza y la descarga con el nombre
 * correcto. Después se sube a la carpeta «fotos» y se escribe ese nombre en la
 * columna «foto» del Excel.
 */
export function PhotoPanel({ menu }: { menu: Menu | null }) {
  const [q, setQ] = useState('');
  const [selId, setSelId] = useState<string | null>(null);

  if (!menu) return <div className="adm-card"><p className="adm-muted">Cargando el menú publicado…</p></div>;

  const cats = [...menu.categories].sort(byOrder);
  const order = new Map(cats.map((c, i) => [c.id, i]));
  const catName = (id: string) => menu.categories.find((c) => c.id === id)?.nombre ?? id;
  const list = menu.products
    .filter((p) => !q || fold(`${p.nombre} ${p.id}`).includes(fold(q)))
    .sort((a, b) => order.get(a.categoria)! - order.get(b.categoria)! || byOrder(a, b));
  const selected = menu.products.find((p) => p.id === selId) ?? null;

  return (
    <div className="adm-photos">
      <div className="adm-card adm-photos__list">
        <h2>Fotografías</h2>
        <p className="adm-muted">Elija el platillo para preparar su foto. {menu.products.filter((p) => p.imagen).length} de {menu.products.length} tienen foto en el menú publicado.</p>
        <div className="adm-filters">
          <label className="sr-only" htmlFor="ph-q">Buscar producto</label>
          <input id="ph-q" type="search" placeholder="Buscar producto" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <ul className="adm-plist" role="list">
          {list.map((p) => (
            <li key={p.id}>
              <button className={`adm-pitem${selId === p.id ? ' is-sel' : ''}`} onClick={() => setSelId(p.id)} aria-pressed={selId === p.id}>
                <span className="adm-thumb">
                  {p.imagen ? <img src={photoUrls(p.imagen).sm} alt="" loading="lazy" /> : <span>Sin foto</span>}
                </span>
                <span className="adm-pitem__text"><b>{p.nombre}</b><small>{catName(p.categoria)} · {p.id}</small></span>
              </button>
            </li>
          ))}
          {!list.length && <li className="adm-muted">Ningún producto coincide.</li>}
        </ul>
      </div>
      <div className="adm-card adm-photos__editor">
        {selected ? <PhotoMaker key={selected.id} p={selected} category={catName(selected.categoria)} />
          : <p className="adm-muted">Seleccione un producto de la lista.</p>}
      </div>
    </div>
  );
}

function PhotoMaker({ p, category }: { p: Product; category: string }) {
  const [opt, setOpt] = useState<Optimized | null>(null);
  const [src, setSrc] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const preview = useMemo(() => (opt ? URL.createObjectURL(opt.lg) : ''), [opt]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const ext = opt?.lg.type === 'image/jpeg' ? 'jpg' : 'webp';
  const fileName = `${p.id}.${ext}`;
  const current = p.imagen ? photoUrls(p.imagen).lg : '';

  async function choose(f: File | undefined) {
    if (!f) return;
    setError(null); setBusy(true); setCopied(false);
    try { setOpt(await optimizeImage(f)); setSrc(f); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  async function copyName() {
    try { await navigator.clipboard.writeText(fileName); setCopied(true); } catch { setCopied(false); }
  }

  const kb = (b: Blob) => `${Math.round(b.size / 1024)} KB`;
  return (
    <div className="adm-editor">
      <p className="adm-muted">{category}</p>
      <h2>{p.nombre}</h2>
      <p className="adm-muted">Foto en el menú publicado: {p.imagen ? <code>{p.imagen}</code> : 'ninguna'}</p>

      <div className="adm-compare">
        <figure>
          <figcaption>Actual</figcaption>
          <div className="adm-frame">{current ? <img src={current} alt={`Foto actual de ${p.nombre}`} /> : <span>Sin foto</span>}</div>
        </figure>
        {opt && (
          <figure>
            <figcaption>Nueva, optimizada</figcaption>
            <div className="adm-frame adm-frame--new"><img src={preview} alt="Vista previa de la nueva foto" /></div>
          </figure>
        )}
      </div>

      {opt && src && <p className="adm-muted">{opt.width}×{opt.height}px · original {kb(src)} → lista {kb(opt.lg)}</p>}
      {opt?.warning && <p className="adm-alert">{opt.warning}</p>}
      {error && <p className="adm-alert adm-alert--error" role="alert">{error}</p>}

      <div className="adm-row">
        <label className={`adm-btn${opt ? '' : ' adm-btn--primary'}${busy ? ' is-disabled' : ''}`}>
          <input id={`ph-file-${p.id}`} type="file" accept={ACCEPTED.join(',')} className="sr-only" disabled={busy}
            onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ''; }} />
          {busy ? 'Optimizando…' : opt ? 'Elegir otra foto' : 'Elegir foto'}
        </label>
        {opt && <button className="adm-btn adm-btn--primary" onClick={() => download(opt.lg, fileName)}>Descargar {fileName}</button>}
      </div>

      {opt && (
        <div className="adm-publish">
          <h3>Para que aparezca en el menú</h3>
          <ol>
            <li>Suba <code>{fileName}</code> a la carpeta <code>fotos</code> del sitio.</li>
            <li>En el Excel, en la fila <code>{p.id}</code>, escriba en la columna «foto»: <code>{fileName}</code>{' '}
              <button className="adm-btn adm-btn--small" onClick={copyName}>{copied ? 'Copiado' : 'Copiar nombre'}</button></li>
            <li>Publique el Excel como de costumbre.</li>
          </ol>
        </div>
      )}
      <p className="adm-hint">JPG, PNG o WebP hasta 15 MB. Se reduce y optimiza automáticamente. Recomendado: foto horizontal o cuadrada, bien iluminada, del platillo real.</p>
    </div>
  );
}
