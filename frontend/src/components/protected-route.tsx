import { SignedIn, SignedOut } from '@clerk/clerk-react'
import { Navigate } from 'react-router-dom'
import { isClerkConfigured } from '@/lib/clerkConfig'
import { useSessionSecurity } from '@/hooks/useSessionSecurity'

function ProtectedContent({ children }: { children: React.ReactNode }) {
  useSessionSecurity()
  return <>{children}</>
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!isClerkConfigured) {
    return <Navigate to="/login" replace />
  }

  return (
    <>
      <SignedIn>
        <ProtectedContent>{children}</ProtectedContent>
      </SignedIn>
      <SignedOut>
        <Navigate to="/login" replace />
      </SignedOut>
    </>
  )
}