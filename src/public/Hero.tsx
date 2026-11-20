import { useEffect, useRef } from 'react';
import logoWhite from '../assets/logo-blanco.png';
import { BRAND } from '../config/brand';
import { HERO_PHOTO } from '../config/photos';
import { scrollToSection } from './motion';
import { ThemeToggle } from './theme';

const goToMenu = () => {
  const first = document.querySelector<HTMLElement>('.section');
  if (first) scrollToSection(first.id.replace(/^cat-/, ''));
};

export function Hero() {
  const photo = useRef<HTMLImageElement>(null);
  const content = useRef<HTMLDivElement>(null);

  // Paralaje suave: la foto se desplaza más lento que la página y el texto se desvanece.
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = Math.min(window.scrollY, 900);
        if (photo.current) photo.current.style.transform = `translate3d(0, ${y * 0.35}px, 0) scale(1.04)`;
        if (content.current) {
          content.current.style.transform = `translate3d(0, ${y * 0.15}px, 0)`;
          content.current.style.opacity = String(Math.max(0, 1 - y / 520));
        }
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', onScroll); };
  }, []);

  return (
    <header className="hero">
      <div className="hero__frame" aria-hidden="true">
        <img
          ref={photo}
          className="hero__photo"
          src={HERO_PHOTO.src}
          srcSet={HERO_PHOTO.srcSet}
          sizes="100vw"
          width={HERO_PHOTO.width}
          height={HERO_PHOTO.height}
          alt=""
          fetchPriority="high"
        />
      </div>
      <span className="sr-only">{HERO_PHOTO.alt}</span>
      <div className="hero__shade" aria-hidden="true" />
      <div className="hero__top">
        <ThemeToggle variant="photo" />
      </div>
      <div className="hero__content" ref={content}>
        <h1 className="hero__logo">
          <img src={logoWhite} width={1161} height={229} alt={`${BRAND.name} · ${BRAND.subtitle}`} />
        </h1>
        <p className="hero__tagline">{BRAND.tagline}</p>
        <button className="hero__cta" onClick={goToMenu}>
          <span>Ver el menú</span>
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10m0 0 4-4m-4 4-4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
      <button className="hero__cue" onClick={goToMenu} aria-label="Bajar al menú" tabIndex={-1}>
        <span />
      </button>
    </header>
  );
}

export function Intro() {
  return (
    <section className="intro reveal-intro" aria-label="Sobre Ochentos">
      <p className="intro__kicker">Menú</p>
      <p className="intro__text">{BRAND.intro}</p>
      <p className="intro__tag">{BRAND.hashtag}</p>
    </section>
  );
}
