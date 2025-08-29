// src/main.jsx
// Cache buster: 202508292122

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'   // <-- ensure this line exists

// Register Service Worker for instant loading (like popular apps)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.service-worker.register('/sw.js')
      .then((registration) => {
        console.log('✅ SW registered:', registration);
      })
      .catch((error) => {
        console.log('❌ SW registration failed:', error);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
