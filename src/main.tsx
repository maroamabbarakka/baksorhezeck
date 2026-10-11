import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { PosStoreProvider } from './context/PosStore'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PosStoreProvider><App /></PosStoreProvider>
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  const hadController = Boolean(navigator.serviceWorker.controller)
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => registration.update()).catch(error => console.error('Service worker gagal didaftarkan:', error))
  })
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController && !sessionStorage.getItem('pwa-update-reload-v4')) {
      sessionStorage.setItem('pwa-update-reload-v4', '1')
      window.location.reload()
    }
  })
}
