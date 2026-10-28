import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext' 
import { TenantProvider } from './context/TenantContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider> 
      <TenantProvider>
        <App />
      </TenantProvider>
    </AuthProvider>
  </StrictMode>,
)
