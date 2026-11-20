import type { CSSProperties } from 'react';
import type { Section } from '../lib/format';
import { fitsMatrix, money, priceMatrix, splitOptions, type MatrixColumn } from '../lib/format';
import type { PhotoUrls, Product } from '../lib/types';
import { CATEGORY_PHOTOS } from '../config/photos';
import { Tags } from './Tags';

interface Props {
  section: Section;
  /** Texto de búsqueda: al cambiar, los resultados entran con una animación. */
  query?: string;
  photo(p: Product): PhotoUrls | null;
  onOpen(p: Product): void;
}

/** Precios en línea: único, o «Etiqueta $precio» para variantes. */
export function Prices({ p }: { p: Product }) {
  if (p.precio != null) return <span className="price">{money(p.precio, p.moneda)}</span>;
  return (
    <span className="vprices">
      {p.variantes.map((v) => (
        <span key={v.etiqueta} className="vprices__item">
          <span className="vprices__label">{v.etiqueta}</span>
          <span className="price">{money(v.precio, p.moneda)}</span>
        </span>
      ))}
    </span>
  );
}

function Item({ p, photo, cols, onOpen, index }: { p: Product; photo: PhotoUrls | null; cols: MatrixColumn[] | null; onOpen(p: Product): void; index: number }) {
  const inMatrix = fitsMatrix(p, cols);
  const opts = splitOptions(p.opciones);
  return (
    <li className={`item reveal${photo ? ' item--photo' : ''}${inMatrix ? ' item--matrix' : ''}`}
      style={{ '--i': Math.min(index, 8) } as CSSProperties}>
      <button className="item__btn" onClick={() => onOpen(p)} aria-haspopup="dialog">
        {photo && (
          <span className="item__photo">
            <img src={photo.sm} alt="" width={640} height={640} loading="lazy" decoding="async"
              onError={(e) => { const f = e.currentTarget.parentElement; if (f) f.hidden = true; }} />
          </span>
        )}
        <span className="item__text">
          <span className="item__head">
            <span className="item__name">{p.nombre}</span>
            <Tags tags={p.etiquetas} />
            {p.precio != null && <span className="item__single"><Prices p={p} /></span>}
          </span>
          {p.detalle && <span className="item__detail">{p.detalle}</span>}
          {p.descripcion && <span className="item__desc">{p.descripcion}</span>}
          {opts.length > 0 && <span className="item__opts">{opts.map((o) => o.split(':')[0]).join(' · ')}</span>}
          {p.precio == null && !inMatrix && <Prices p={p} />}
        </span>
        {inMatrix && (
          <span className="item__cells">
            {p.variantes.map((v) => (
              <span key={v.etiqueta} className="cell">
                <span className="cell__label" aria-hidden="true">{v.etiqueta}</span>
                <span className="price"><span className="sr-only">{v.etiqueta} </span>{money(v.precio, p.moneda)}</span>
              </span>
            ))}
          </span>
        )}
      </button>
    </li>
  );
}

export function CategorySection({ section, photo, onOpen, query = '' }: Props) {
  const { category, products } = section;
  const groups: { name: string; items: Product[] }[] = [];
  for (const p of products) {
    const last = groups[groups.length - 1];
    if (last && last.name === p.subcategoria) last.items.push(p);
    else groups.push({ name: p.subcategoria, items: [p] });
  }
  const isLegend = category.descripcion.includes(' | ');
  const legend = isLegend ? category.descripcion : '';
  const banner = CATEGORY_PHOTOS[category.id];
  const headingId = `h-${category.id}`;

  return (
    <section id={`cat-${category.id}`} className="section" aria-labelledby={headingId} tabIndex={-1}>
      <header className="section__head reveal">
        <h2 id={headingId} className="section__title"><span className="section__script">{category.nombre}</span></h2>
        <span className="section__count">{products.length} {products.length === 1 ? 'opción' : 'opciones'}</span>
        {category.descripcion && !isLegend && <p className="section__desc">{category.descripcion}</p>}
      </header>

      {banner && (
        <figure className="section__photo reveal">
          <img src={banner.src} srcSet={banner.srcSet} sizes="(min-width: 1100px) 1080px, 100vw"
            width={banner.width} height={banner.height} alt={banner.alt} loading="lazy" decoding="async" />
        </figure>
      )}

      {groups.map((g, i) => {
        const cols = priceMatrix(g.items, legend);
        return (
          <div key={`${g.name}-${i}`} className={`group${cols ? ' group--matrix' : ''}`}
            style={cols ? ({ '--cols': cols.length } as CSSProperties) : undefined}>
            {(g.name || cols) && (
              <div className="group__head reveal">
                <h3 className="group__title">{g.name}</h3>
                {cols && (
                  <div className="group__cols" aria-hidden="true">
                    {cols.map((c) => (
                      <span key={c.label} className="colhead">
                        <span className="colhead__label">{c.label}</span>
                        {c.sub && <span className="colhead__sub">{c.sub}</span>}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
            <ul key={query} className={`items${query ? ' items--found' : ''}`} role="list">
              {g.items.map((p, idx) => (
                <Item key={p.id} p={p} photo={photo(p)} cols={cols} onOpen={onOpen} index={idx} />
              ))}
            </ul>
          </div>
        );
      })}

      {category.nota && <p className="section__note reveal">{category.nota}</p>}
    </section>
  );
}
