import logoWhite from '../assets/logo-blanco.png';
import { BRAND } from '../config/brand';

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <img className="footer__logo" src={logoWhite} width={1161} height={229} alt={BRAND.name} loading="lazy" />
        <ul className="footer__links" role="list">
          <li><a href={BRAND.maps} target="_blank" rel="noopener">Cómo llegar</a></li>
          <li><a href={BRAND.phoneHref}>{BRAND.phone}</a></li>
          <li><a href={BRAND.instagram} target="_blank" rel="noopener">Instagram</a></li>
          <li><a href={BRAND.facebook} target="_blank" rel="noopener">Facebook</a></li>
          <li><a href={BRAND.site}>ochentos.com</a></li>
        </ul>
        <p className="footer__note">{BRAND.pricesNote}</p>
        <p className="footer__tag">{BRAND.hashtag}</p>
      </div>
    </footer>
  );
}
