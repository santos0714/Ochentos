import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/tokens.css';
import '../styles/menu.css';
import { MenuApp } from './MenuApp';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MenuApp />
  </StrictMode>,
);
