/**
 * Solo para la vista previa publicada (un único archivo HTML, modo demostración):
 * muestra el menú público y el panel en la misma página, alternando con #panel.
 */
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/tokens.css';
import '../styles/menu.css';
import '../styles/admin.css';
import { MenuApp } from '../public/MenuApp';
import { AdminApp } from '../admin/AdminApp';
import { setEmbeddedMenu } from '../data/source';
// En la vista previa de un solo archivo, el menu.xlsx viaja incrustado.
import menuXlsx from '../../public/menu.xlsx?inline';

setEmbeddedMenu(() => {
  const b64 = menuXlsx.slice(menuXlsx.indexOf(',') + 1);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
});

function Preview() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const on = () => { setHash(location.hash); window.scrollTo(0, 0); };
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  const admin = hash === '#panel';
  return (
    <>
      <a className="preview-switch" href={admin ? '#menu-publico' : '#panel'}>
        {admin ? '← Ver menú público' : 'Ver panel de administración →'}
      </a>
      {admin ? <AdminApp key="a" /> : <MenuApp key="m" />}
    </>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><Preview /></StrictMode>);
