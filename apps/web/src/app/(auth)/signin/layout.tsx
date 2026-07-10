import type { Metadata } from 'next'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your AgentBench account to manage agent testing, runs, and experiments.',
}

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return <Suspense>{children}</Suspense>
}
