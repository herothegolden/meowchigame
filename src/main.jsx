import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Initialize Telegram Web App
if (window.Telegram?.WebApp) {
  window.Telegram.WebApp.ready()
  window.Telegram.WebApp.expand()
  
  // Set theme
  document.body.style.backgroundColor = window.Telegram.WebApp.backgroundColor || '#ffffff'
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
