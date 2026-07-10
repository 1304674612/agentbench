import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get('title') ?? 'AgentBench'

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0a0a0b"/>
      <stop offset="50%" style="stop-color:#1a1040"/>
      <stop offset="100%" style="stop-color:#0a0a0b"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#6366f1"/>
      <stop offset="50%" style="stop-color:#a855f7"/>
      <stop offset="100%" style="stop-color:#ec4899"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Subtle grid pattern -->
  <g stroke="#6366f1" stroke-width="0.5" opacity="0.05">
    <line x1="0" y1="200" x2="1200" y2="200"/>
    <line x1="0" y1="420" x2="1200" y2="420"/>
  </g>

  <!-- Decorative circles -->
  <circle cx="150" cy="150" r="300" fill="#6366f1" opacity="0.03"/>
  <circle cx="1100" cy="500" r="250" fill="#a855f7" opacity="0.04"/>

  <!-- Logo shield -->
  <g transform="translate(540, 180)">
    <rect width="120" height="120" rx="24" fill="url(#accent)" filter="url(#glow)"/>
    <path d="M60 35 L75 50 L60 65 L60 85 L45 75 L45 55 L60 35Z" fill="white" transform="translate(24, 14) scale(1.6)"/>
  </g>

  <!-- Title -->
  <text x="600" y="370" text-anchor="middle" fill="white" font-family="system-ui, -apple-system, sans-serif" font-size="52" font-weight="800" letter-spacing="-1">
    ${escapeXml(title)}
  </text>

  <!-- Subtitle -->
  <text x="600" y="420" text-anchor="middle" fill="#a1a1aa" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="400">
    The Regression Testing Framework for AI Agents
  </text>

  <!-- Bottom bar -->
  <rect x="0" y="580" width="1200" height="50" fill="#ffffff" opacity="0.03"/>
  <text x="600" y="612" text-anchor="middle" fill="#71717a" font-family="system-ui, -apple-system, sans-serif" font-size="16">
    agentbench.dev
  </text>
</svg>`

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
    },
  })
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
