import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { ThemeProvider } from '@/shared/components/layout/theme-provider'
import { SessionProvider } from '@/shared/components/auth/session-provider'
import { Toaster } from 'sonner'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  preload: true,
  adjustFontFallback: true,
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  preload: true,
  adjustFontFallback: true,
})

export const metadata: Metadata = {
  metadataBase: new URL('https://agentbench.dev'),
  title: {
    default: 'AgentBench — Agent Regression Testing Framework',
    template: '%s — AgentBench',
  },
  description:
    'The Verification Framework for AI Agents. Replay, evaluate, compare, and regression test your AI agents with confidence.',
  keywords: [
    'AI Agent',
    'Regression Testing',
    'LLM Evaluation',
    'Prompt Testing',
    'Agent Framework',
    'AI Testing',
  ],
  authors: [{ name: 'AgentBench' }],
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'AgentBench',
    title: 'AgentBench — Agent Regression Testing Framework',
    description: 'The Verification Framework for AI Agents.',
    images: [
      {
        url: '/api/og?title=AgentBench',
        width: 1200,
        height: 630,
        alt: 'AgentBench — The Regression Testing Framework for AI Agents',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgentBench — Agent Regression Testing Framework',
    description:
      'The Verification Framework for AI Agents. Replay, evaluate, compare, and regression test your AI agents with confidence.',
    images: ['/api/og?title=AgentBench'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <SessionProvider>
            {children}
            <Toaster
              position="bottom-right"
              toastOptions={{
                className: 'font-sans text-sm',
              }}
            />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
