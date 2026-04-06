// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

// Registra el Service Worker con auto-update silencioso
registerSW({
  onNeedRefresh() {
    // Nueva versión disponible — se actualiza en el próximo reload
  },
  onOfflineReady() {
    console.log('✅ SplitGroup está lista para usarse sin conexión');
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
