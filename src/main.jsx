// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import OneSignal from 'react-onesignal'

// Inicializar OneSignal Push Notifications
OneSignal.init({
  appId: '964ef142-ad4c-40ef-a27b-b94de919baa3',
  serviceWorkerParam: { scope: '/' },
  serviceWorkerPath: '/OneSignalSDKWorker.js',
}).catch(err => console.log('OneSignal init error:', err));

// Prevenir que la rueda del ratón cambie valores en inputs numéricos (UX fix global)
document.addEventListener('wheel', (e) => {
  if (e.target?.type === 'number') e.target.blur();
}, { passive: true });

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
