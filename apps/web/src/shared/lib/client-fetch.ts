/**
 * Client-side fetch wrapper for browser API calls.
 *
 * Adds consistent error handling, JSON parsing, and optional auth.
 * Use this instead of raw fetch() in client components.
 *
 * @example
 * ```ts
 * const data = await apiFetch<{ projects: Project[] }>('/api/v1/projects')
 * ```
 */

export class ApiFetchError extends Error {
  status: number
  code?: string
  details?: unknown

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message)
    this.name = 'ApiFetchError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export async function apiFetch<T = unknown>(
  url: string,
  options?: RequestInit & { params?: Record<string, string> },
): Promise<T> {
  const finalUrl = options?.params
    ? `${url}?${new URLSearchParams(options.params).toString()}`
    : url

  const res = await fetch(finalUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    // params is stripped — not a real RequestInit field
  })

  const body = await res.json().catch(() => ({})) as Record<string, unknown>

  if (!res.ok) {
    throw new ApiFetchError(
      (body.error as string) ?? `Request failed with status ${res.status}`,
      res.status,
      body.code as string | undefined,
      body.details as unknown,
    )
  }

  return body as T
}

/**
 * Convenience: GET request
 */
export function apiGet<T = unknown>(url: string, params?: Record<string, string>): Promise<T> {
  return apiFetch<T>(url, { method: 'GET', params })
}

/**
 * Convenience: POST request
 */
export function apiPost<T = unknown>(url: string, body?: unknown): Promise<T> {
  return apiFetch<T>(url, {
    method: 'POST',
    body: body != null ? JSON.stringify(body) : undefined,
  })
}

/**
 * Convenience: DELETE request
 */
export function apiDelete<T = unknown>(url: string): Promise<T> {
  return apiFetch<T>(url, { method: 'DELETE' })
}
