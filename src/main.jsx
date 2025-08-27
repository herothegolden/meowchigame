// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './app/store.js'
import App from './App.jsx'
import './index.css'   // <-- ensure this line exists

// Register Service Worker for instant loading (like popular apps)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('✅ SW registered:', registration);
      })
      .catch((error) => {
        console.log('❌ SW registration failed:', error);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <App />
  </Provider>
)
