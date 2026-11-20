import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadPublishedMenu, photoUrls } from '../data/source';
import { buildSections } from '../lib/format';
import type { Menu, Product } from '../lib/types';
import { Hero, Intro } from './Hero';
import { StickyBar } from './StickyBar';
import { CategorySection } from './CategorySection';
import { ProductDialog } from './ProductDialog';
import { Footer } from './Footer';
import { useActiveSection, useReveal } from './motion';

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; menu: Menu };

/**
 * Menú público. Sin `menu`, lee el menu.xlsx publicado; con `menu`, muestra ese
 * contenido (vista previa de un archivo antes de publicarlo).
 */
/** Versión de muestra para presentar la propuesta al restaurante. */
const PROPUESTA = import.meta.env.VITE_PROPUESTA === '1';
if (PROPUESTA && typeof document !== 'undefined' && !document.querySelector('meta[name="robots"]')) {
  const m = document.createElement('meta');
  m.name = 'robots';
  m.content = 'noindex, nofollow';
  document.head.appendChild(m);
}

export function MenuApp({ menu: given }: { menu?: Menu } = {}) {
  const [state, setState] = useState<State>(given ? { status: 'ready', menu: given } : { status: 'loading' });
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Product | null>(null);

  const load = useCallback(() => {
    if (given) { setState({ status: 'ready', menu: given }); return; }
    setState({ status: 'loading' });
    loadPublishedMenu()
      .then((menu) => setState({ status: 'ready', menu }))
      .catch((e: Error) => setState({ status: 'error', message: e.message }));
  }, [given]);
  useEffect(load, [load]);

  const sections = useMemo(
    () => (state.status === 'ready' ? buildSections(state.menu, query) : []),
    [state, query],
  );
  const allSections = useMemo(() => (state.status === 'ready' ? buildSections(state.menu) : []), [state]);
  const ids = useMemo(() => sections.map((s) => s.category.id), [sections]);
  const active = useActiveSection(ids);
  const mainRef = useRef<HTMLElement>(null);
  useReveal(mainRef, [sections]);

  const photo = useCallback((p: Product) => (p.imagen ? photoUrls(p.imagen) : null), []);

  return (
    <>
      {PROPUESTA && (
        <p className="demo-banner" role="note">
          Propuesta de diseño · aún no es el sitio oficial
        </p>
      )}
      <Hero />
      <Intro />
      <StickyBar
        categories={allSections.map((s) => s.category)}
        visible={new Set(ids)}
        active={active}
        query={query}
        onQuery={setQuery}
      />
      <main id="menu" ref={mainRef} className="menu" aria-busy={state.status === 'loading'}>
        {state.status === 'loading' && <Skeleton />}
        {state.status === 'error' && (
          <div className="menu-state" role="alert">
            <p className="menu-state__title">No pudimos cargar el menú</p>
            <p>{state.message}</p>
            <button className="btn" onClick={load}>Intentar de nuevo</button>
          </div>
        )}
        {state.status === 'ready' && sections.length === 0 && (
          <div className="menu-state" role="status">
            <p className="menu-state__title">Sin resultados para “{query}”</p>
            <p>Pruebe con otro platillo o ingrediente, por ejemplo “pesto” o “camarón”.</p>
            <button className="btn" onClick={() => setQuery('')}>Ver todo el menú</button>
          </div>
        )}
        {sections.map((s) => (
          <CategorySection key={s.category.id} section={s} photo={photo} onOpen={setSelected} query={query} />
        ))}
        {state.status === 'ready' && query && sections.length > 0 && (
          <p className="menu-state" role="status">
            {sections.reduce((n, s) => n + s.products.length, 0)} resultado(s) ·{' '}
            <button className="linklike" onClick={() => setQuery('')}>ver todo el menú</button>
          </p>
        )}
      </main>
      <Footer />
      <BackToTop />
      <ProductDialog
        product={selected}
        photo={selected ? photo(selected) : null}
        categoryName={
          selected && state.status === 'ready'
            ? state.menu.categories.find((c) => c.id === selected.categoria)?.nombre ?? ''
            : ''
        }
        onClose={() => setSelected(null)}
      />
    </>
  );
}

/** Botón para volver arriba; aparece al recorrer el menú. */
function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const on = () => setShow(window.scrollY > window.innerHeight * 1.4);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <button className={`to-top${show ? ' is-shown' : ''}`} aria-label="Volver arriba" tabIndex={show ? 0 : -1}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
      <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 13V3m0 0L4 7m4-4 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
  );
}

function Skeleton() {
  return (
    <div className="skeleton" aria-label="Cargando menú">
      {[0, 1].map((i) => (
        <div key={i} className="skeleton__section">
          <div className="skeleton__ribbon" />
          {[0, 1, 2, 3].map((j) => (
            <div key={j} className="skeleton__row" />
          ))}
        </div>
      ))}
    </div>
  );
}
