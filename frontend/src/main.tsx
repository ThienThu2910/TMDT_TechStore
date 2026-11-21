import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

try { if (localStorage.getItem('ts-theme') === 'light') document.documentElement.dataset.theme = 'light' } catch { /* bỏ qua */ }

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
