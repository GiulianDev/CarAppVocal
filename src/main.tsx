import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { routes } from './router.tsx'
import './index.css'
import { AuthProvider } from './shared/Auth/AuthContext.tsx'
import { VoiceProvider } from './shared/VoiceCommand/speech/VoiceContext.tsx'

const router = createBrowserRouter(routes);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <VoiceProvider>
      <RouterProvider router={router} />
    </VoiceProvider>
    </AuthProvider>
  </StrictMode>
)
