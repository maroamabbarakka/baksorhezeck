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
