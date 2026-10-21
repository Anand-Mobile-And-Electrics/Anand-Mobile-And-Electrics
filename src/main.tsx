import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import PwaStatus from './components/PwaStatus';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <><App /><PwaStatus /></>
  </React.StrictMode>,
);

// Register the staff PWA service worker (installable app shell).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('Service worker registration failed:', err);
    });
  });
}
