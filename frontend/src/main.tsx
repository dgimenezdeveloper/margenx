import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { esES } from '@clerk/localizations'
import './index.css'
import App from './App.tsx'
import { isClerkConfigured, publishableKey } from './lib/clerkConfig'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isClerkConfigured ? (
      <ClerkProvider publishableKey={publishableKey} localization={esES}>
        <App />
      </ClerkProvider>
    ) : (
      <App />
    )}
  </StrictMode>,
)