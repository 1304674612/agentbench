'use client'

import { useState, useCallback } from 'react'
import { Copy, Check } from 'lucide-react'

export interface CopyButtonProps {
  text: string
  className?: string
  label?: string
  size?: 'sm' | 'md'
}

export function CopyButton({ text, className = '', label, size = 'sm' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        // Copy failed silently
      }
      document.body.removeChild(textArea)
    }
  }, [text])

  const sizeClasses = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors ${className}`}
      title={`Copy ${label ?? text}`}
    >
      {copied ? (
        <Check className={`${sizeClasses} text-emerald-400`} />
      ) : (
        <Copy className={sizeClasses} />
      )}
    </button>
  )
}
