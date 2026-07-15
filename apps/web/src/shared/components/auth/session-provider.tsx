'use client'

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider
      // Avoid refetching on every window focus — session is JWT-based
      refetchOnWindowFocus={false}
      // Don't poll; session is refreshed on navigation
      refetchInterval={0}
    >
      {children}
    </NextAuthSessionProvider>
  )
}
