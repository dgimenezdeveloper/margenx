import { SignedIn, SignedOut } from '@clerk/clerk-react'
import { Navigate } from 'react-router-dom'
import { isClerkConfigured } from '@/lib/clerkConfig'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!isClerkConfigured) {
    return <Navigate to="/login" replace />
  }

  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <Navigate to="/login" replace />
      </SignedOut>
    </>
  )
}