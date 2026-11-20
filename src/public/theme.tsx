import { useCallback, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

export type Theme = 'light' | 'dark';
const KEY = 'ochentos-tema';
const THEME_COLOR: Record<Theme, string> = { light: '#ffffff', dark: '#0e0d0c' };

function stored(): Theme | null {
  try {
    const s = localStorage.getItem(KEY);
    return s === 'light' || s === 'dark' ? s : null;
  } catch {
    return null;
  }
}

/** Preferencia guardada › tema ya marcado en la página › tema del teléfono. */
export function initialTheme(): Theme {
  const preset = document.documentElement.dataset.theme;
  return stored() ?? (preset === 'light' || preset === 'dark' ? preset : null) ??
    (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}

function apply(t: Theme) {
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[t]);
}

type ViewTransitionDoc = Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };

/**
 * Tema compartido por todos los selectores de la página. El cambio se anima con
 * un círculo que crece desde el botón (View Transitions) o, si el navegador no
 * lo admite, con un fundido de colores.
 */
export function useTheme(): [Theme, (t: Theme, from?: { x: number; y: number }) => void] {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  useEffect(() => apply(theme), [theme]);
  useEffect(() => {
    const sync = (e: Event) => setTheme((e as CustomEvent<Theme>).detail);
    window.addEventListener('ochentos:tema', sync);
    return () => window.removeEventListener('ochentos:tema', sync);
  }, []);

  const change = useCallback((t: Theme, from?: { x: number; y: number }) => {
    try { localStorage.setItem(KEY, t); } catch { /* sin almacenamiento: solo esta visita */ }
    const commit = () => {
      flushSync(() => setTheme(t));
      apply(t);
      window.dispatchEvent(new CustomEvent('ochentos:tema', { detail: t }));
    };
    const doc = document as ViewTransitionDoc;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!doc.startViewTransition || reduced) {
      document.documentElement.classList.add('theme-fade');
      commit();
      setTimeout(() => document.documentElement.classList.remove('theme-fade'), 500);
      return;
    }
    const x = from?.x ?? innerWidth - 40;
    const y = from?.y ?? 40;
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const vt = doc.startViewTransition(commit);
    vt.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 650, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' },
      );
    }).catch(() => undefined);
  }, []);

  return [theme, change];
}

/** Selector con las dos opciones siempre visibles: Claro · Oscuro. */
export function ThemeToggle({ variant = 'plain' }: { variant?: 'plain' | 'photo' | 'compact' }) {
  const [theme, setTheme] = useTheme();
  const pick = (t: Theme) => (e: React.MouseEvent<HTMLButtonElement>) => {
    if (t === theme) return;
    const r = e.currentTarget.getBoundingClientRect();
    setTheme(t, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
  };
  return (
    <div className={`theme theme--${variant}`} role="group" aria-label="Apariencia">
      <span className="theme__thumb" data-pos={theme} aria-hidden="true" />
      <button type="button" className="theme__opt" aria-pressed={theme === 'light'} onClick={pick('light')}>
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span>Claro</span>
      </button>
      <button type="button" className="theme__opt" aria-pressed={theme === 'dark'} onClick={pick('dark')}>
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
        <span>Oscuro</span>
      </button>
    </div>
  );
}
