// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Prevenir que la rueda del ratón cambie valores en inputs numéricos (UX fix global)
document.addEventListener('wheel', (e) => {
  if (e.target?.type === 'number') e.target.blur();
}, { passive: true });

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
