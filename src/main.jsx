import React from 'react';
import { createRoot } from 'react-dom/client';
import './shared/pwa/usePwaInstall';
import Portal from './portal/Portal';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

createRoot(document.getElementById('root')).render(<Portal />);
