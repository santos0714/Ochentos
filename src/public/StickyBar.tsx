import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import wordmark from '../assets/logo-wordmark.png';
import type { Category } from '../lib/types';
import { scrollToSection } from './motion';
import { ThemeToggle } from './theme';

interface Props {
  categories: Category[];
  visible: Set<string>;
  active: string | null;
  query: string;
  onQuery(q: string): void;
}

export function StickyBar({ categories, visible, active, query, onQuery }: Props) {
  const [stuck, setStuck] = useState(false);
  const [searching, setSearching] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // La barra cambia de aspecto (sombra, logo compacto) al dejar atrás la portada.
  useEffect(() => {
    const hero = document.querySelector('.hero');
    if (!hero || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting), { threshold: 0, rootMargin: '-64px 0px 0px 0px' });
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  // Indicador deslizante bajo la categoría activa.
  useLayoutEffect(() => {
    const list = listRef.current;
    const pill = pillRef.current;
    if (!list || !pill) return;
    const place = () => {
      const btn = list.querySelector<HTMLElement>(`[data-cat="${active}"]`);
      if (!btn) { pill.style.opacity = '0'; return; }
      pill.style.opacity = '1';
      pill.style.width = `${btn.offsetWidth}px`;
      pill.style.transform = `translateX(${btn.offsetLeft}px)`;
      const target = btn.offsetLeft - list.clientWidth / 2 + btn.offsetWidth / 2;
      list.scrollTo({ left: target, behavior: 'smooth' });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [active, categories, searching]);

  useEffect(() => {
    if (searching) inputRef.current?.focus();
  }, [searching]);

  const closeSearch = () => { onQuery(''); setSearching(false); };

  return (
    <div className={`bar${stuck ? ' bar--stuck' : ''}`}>
      <div className="bar__inner">
        <a href="#top" className="bar__logo" aria-label="Volver al inicio" tabIndex={stuck ? 0 : -1}
          onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
          <img src={wordmark} width={1161} height={125} alt="" />
        </a>

        {searching ? (
          <form className="search" role="search" onSubmit={(e) => { e.preventDefault(); inputRef.current?.blur(); document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' }); }}>
            <label htmlFor="menu-search" className="sr-only">Buscar en el menú</label>
            <svg className="search__icon" width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="6" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m13 13 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            <input
              id="menu-search"
              ref={inputRef}
              type="search"
              inputMode="search"
              autoComplete="off"
              placeholder="Busca un platillo o ingrediente"
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && closeSearch()}
            />
            <button type="button" className="icon-btn" onClick={closeSearch} aria-label="Cerrar búsqueda">
              <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
          </form>
        ) : (
          <>
            <nav className="cats" aria-label="Categorías del menú">
              <div className="cats__list" ref={listRef}>
                <span className="cats__pill" ref={pillRef} aria-hidden="true" />
                {categories.map((c) => (
                  <button
                    key={c.id}
                    data-cat={c.id}
                    className="cats__chip"
                    aria-current={active === c.id ? 'true' : undefined}
                    disabled={!visible.has(c.id)}
                    onClick={() => scrollToSection(c.id)}
                  >
                    {c.nombre.replace(/…$/, '')}
                  </button>
                ))}
              </div>
            </nav>
            <button className="icon-btn icon-btn--search" onClick={() => setSearching(true)} aria-label="Buscar en el menú">
              <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="6" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m13 13 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
            <ThemeToggle variant="compact" />
          </>
        )}
      </div>
    </div>
  );
}
