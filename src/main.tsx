import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// O import do CSS deve vir preferencialmente antes dos componentes 
// para garantir que os estilos do Tailwind carreguem primeiro.
import './index.css'; 

import App from './App.tsx';

const rootElement = document.getElementById('root');

// Proteção para não bugar o app caso o elemento root suma do index.html
if (!rootElement) {
  const errorMessage = "Failed to find the root element. Check if index.html has <div id='root'></div>";
  console.error(errorMessage);
  throw new Error(errorMessage);
}

const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);