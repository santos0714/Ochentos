import { useEffect, useRef, useState } from 'react';
import { money, splitOptions } from '../lib/format';
import type { PhotoUrls, Product } from '../lib/types';
import { Tags } from './Tags';

interface Props {
  product: Product | null;
  photo: PhotoUrls | null;
  categoryName: string;
  onClose(): void;
}

/**
 * Detalle del platillo. Usa <dialog> nativo: atrapa el foco, cierra con Escape
 * y devuelve el foco al elemento que lo abrió. En móvil sube como hoja inferior.
 */
export function ProductDialog({ product, photo, categoryName, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [shown, setShown] = useState<{ p: Product; photo: PhotoUrls | null; cat: string } | null>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (product) {
      opener.current = document.activeElement as HTMLElement;
      setShown({ p: product, photo, cat: categoryName });
      if (!d.open) {
        d.classList.remove('is-closing');
        d.showModal();
        document.documentElement.classList.add('modal-open');
      }
    } else if (d.open) {
      d.classList.add('is-closing');
      const done = () => {
        d.classList.remove('is-closing');
        d.close();
        document.documentElement.classList.remove('modal-open');
        opener.current?.focus({ preventScroll: true });
      };
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) done();
      else d.addEventListener('animationend', done, { once: true });
    }
  }, [product, photo, categoryName]);

  const opts = shown ? splitOptions(shown.p.opciones) : [];
  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby="sheet-title"
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
    >
      {shown && (
        <article className="sheet__card">
          <button className="sheet__close" onClick={onClose} aria-label="Cerrar">
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
          </button>
          {shown.photo?.lg && (
            <figure className="sheet__photo">
              <img src={shown.photo.lg} alt={shown.p.nombre} width={1600} height={1200}
                onError={(e) => { const f = e.currentTarget.parentElement; if (f) f.hidden = true; }} />
            </figure>
          )}
          <div className="sheet__body">
            <p className="sheet__cat">{shown.cat}{shown.p.subcategoria ? ` · ${shown.p.subcategoria}` : ''}</p>
            <h2 id="sheet-title" className="sheet__name">
              {shown.p.nombre} <Tags tags={shown.p.etiquetas} />
            </h2>
            {shown.p.detalle && <p className="sheet__detail">{shown.p.detalle}</p>}
            {shown.p.descripcion && <p className="sheet__desc">{shown.p.descripcion}</p>}
            {opts.length > 0 && (
              <ul className="sheet__opts">
                {opts.map((o) => {
                  const [head, ...rest] = o.split(':');
                  return (
                    <li key={o}>
                      {rest.length ? (<><strong>{head}</strong>{':'}{rest.join(':')}</>) : o}
                    </li>
                  );
                })}
              </ul>
            )}
            <dl className="sheet__prices">
              {shown.p.precio != null ? (
                <div><dt>Precio</dt><dd>{money(shown.p.precio, shown.p.moneda)}</dd></div>
              ) : (
                shown.p.variantes.map((v) => (
                  <div key={v.etiqueta}><dt>{v.etiqueta}</dt><dd>{money(v.precio, shown.p.moneda)}</dd></div>
                ))
              )}
            </dl>
          </div>
        </article>
      )}
    </dialog>
  );
}
