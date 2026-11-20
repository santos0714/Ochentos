import { useEffect, useState, type RefObject } from 'react';

const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Revela con suavidad los elementos `.reveal` que están FUERA de pantalla al cargar.
 * Lo que ya se ve nunca se oculta, y sin JavaScript todo queda visible.
 */
export function useReveal(root: RefObject<HTMLElement>, deps: unknown[]) {
  useEffect(() => {
    const el = root.current;
    if (!el || reduced() || typeof IntersectionObserver === 'undefined') return;
    const items = Array.from(el.querySelectorAll<HTMLElement>('.reveal:not(.is-in)'));
    const vh = window.innerHeight;
    const io = new IntersectionObserver(
      (entries) => {
        let i = 0;
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const t = e.target as HTMLElement;
          t.style.transitionDelay = `${Math.min(i++, 5) * 45}ms`;
          t.classList.add('is-in');
          t.classList.remove('is-pending');
          io.unobserve(t);
        }
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.01 },
    );
    for (const it of items) {
      if (it.getBoundingClientRect().top < vh) { it.classList.add('is-in'); continue; }
      it.classList.add('is-pending');
      io.observe(it);
    }
    return () => {
      io.disconnect();
      for (const it of items) it.classList.remove('is-pending');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Categoría visible bajo la barra fija, para marcarla en la navegación. */
export function useActiveSection(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);
  useEffect(() => {
    if (!ids.length) return;
    const onScroll = () => {
      const line = (document.querySelector('.bar')?.getBoundingClientRect().bottom ?? 0) + 56;
      let current = ids[0];
      for (const id of ids) {
        const s = document.getElementById(`cat-${id}`);
        if (s && s.getBoundingClientRect().top <= line) current = id;
      }
      // Al llegar al final de la página, la última sección es la activa.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = ids[ids.length - 1];
      setActive(current);
    };
    let raf = 0;
    let lockUntil = 0;
    const handler = () => {
      if (Date.now() < lockUntil) return;
      cancelAnimationFrame(raf); raf = requestAnimationFrame(onScroll);
    };
    // Al elegir una categoría se marca de inmediato y se mantiene durante el desplazamiento suave.
    const onGoto = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (!ids.includes(id)) return;
      lockUntil = Date.now() + 1100;
      setActive(id);
      setTimeout(onScroll, 1150);
    };
    window.addEventListener('menu:goto', onGoto);
    onScroll();
    window.addEventListener('scroll', handler, { passive: true });
    window.addEventListener('resize', handler);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', handler);
      window.removeEventListener('resize', handler);
      window.removeEventListener('menu:goto', onGoto);
    };
  }, [ids]);
  return active;
}

/** Desplaza hasta una sección dejando libre la barra fija. */
export function scrollToSection(id: string) {
  const s = document.getElementById(`cat-${id}`);
  if (!s) return;
  const bar = document.querySelector('.bar')?.getBoundingClientRect().height ?? 0;
  const top = s.getBoundingClientRect().top + window.scrollY - bar - 8;
  window.dispatchEvent(new CustomEvent('menu:goto', { detail: id }));
  window.scrollTo({ top, behavior: reduced() ? 'auto' : 'smooth' });
  s.focus({ preventScroll: true });
}
