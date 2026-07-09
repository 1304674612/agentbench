import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { ThemeProvider } from '@/shared/components/layout/theme-provider'
import { Toaster } from 'sonner'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
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
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'AgentBench',
    title: 'AgentBench — Agent Regression Testing Framework',
    description: 'The Verification Framework for AI Agents.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              className: 'font-sans text-sm',
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
