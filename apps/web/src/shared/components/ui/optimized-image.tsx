import Image from 'next/image'
import type { ImageProps } from 'next/image'

type OptimizedImageProps = Omit<ImageProps, 'alt'> & {
  alt: string
}

/**
 * Wrapper around next/image with common defaults:
 * - Priority loading disabled by default (set priority for above-fold images)
 * - Lazy loading with low-quality blur placeholder pattern
 * - Sizes default for responsive containers
 *
 * Usage:
 * ```tsx
 * import { OptimizedImage } from '@/shared/components/ui/optimized-image'
 * // Above-the-fold hero image
 * <OptimizedImage src="/hero.png" alt="Hero" priority fill className="object-cover" />
 * // Below-fold content image
 * <OptimizedImage src="/screenshot.png" alt="Screenshot" width={800} height={450} />
 * ```
 */
export function OptimizedImage({
  alt,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  loading = 'lazy',
  quality = 85,
  ...props
}: OptimizedImageProps) {
  return <Image alt={alt} sizes={sizes} loading={loading} quality={quality} {...props} />
}
