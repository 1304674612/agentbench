import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Compare',
  description: 'Side-by-side comparison of agent runs — diff outputs, metrics, and execution traces across models.',
}

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
