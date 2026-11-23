import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import './index.css'
import App from './App.tsx'
import { isClerkConfigured, publishableKey } from './lib/clerkConfig'
import { clerkLocalization } from './lib/clerkLocalization'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isClerkConfigured ? (
      <ClerkProvider publishableKey={publishableKey} localization={clerkLocalization}>
        <App />
      </ClerkProvider>
    ) : (
      <App />
    )}
  </StrictMode>,
)