/**
 * RAG Retriever — Embedding-based chunked document retrieval.
 *
 * This module implements a realistic mock retriever that simulates:
 *   - Document chunking with overlap
 *   - TF-IDF-inspired relevance scoring
 *   - Top-k retrieval with score thresholds
 *   - Metadata (source, page, chunk index) attached to each chunk
 *
 * In production, replace with a real vector database (Pinecone, Weaviate, Chroma)
 * and an embedding model (text-embedding-3-small, Cohere, etc.).
 */

// ---------------------------------------------------------------------------
// Document store with chunked content
// ---------------------------------------------------------------------------

export interface DocumentChunk {
  chunkId: string
  documentId: string
  title: string
  content: string
  page: number
  chunkIndex: number
  totalChunks: number
}

export interface RetrieveResult {
  query: string
  chunks: Array<DocumentChunk & { score: number }>
  totalMatches: number
  retrievalTimeMs: number
}

// ---------------------------------------------------------------------------
// Realistic knowledge base: 5 documents chunked with overlap
// ---------------------------------------------------------------------------

export const DOCUMENT_STORE: DocumentChunk[] = [
  // Document 1: Tesla Autopilot Safety Report
  {
    chunkId: 'doc1-chunk1',
    documentId: 'doc1',
    title: 'Tesla Vehicle Safety Report Q4 2025',
    content:
      'In Q4 2025, Tesla vehicles using Autopilot technology registered one crash for every 6.88 million miles driven. For drivers not using Autopilot, one crash occurred every 1.45 million miles driven. This represents a roughly 4.7x improvement in safety when Autopilot is engaged compared to the US average of one crash per 700,000 miles.',
    page: 1,
    chunkIndex: 0,
    totalChunks: 3,
  },
  {
    chunkId: 'doc1-chunk2',
    documentId: 'doc1',
    title: 'Tesla Vehicle Safety Report Q4 2025',
    content:
      'Autopilot includes eight external cameras providing 360-degree visibility at up to 250 meters of range. The system processes visual data through a custom neural network architecture designed by Tesla\'s AI team. All new Tesla vehicles come standard with Autopilot hardware, and over-the-air software updates continuously improve safety features without requiring service center visits.',
    page: 2,
    chunkIndex: 1,
    totalChunks: 3,
  },
  {
    chunkId: 'doc1-chunk3',
    documentId: 'doc1',
    title: 'Tesla Vehicle Safety Report Q4 2025',
    content:
      'Tesla\'s quarterly safety data is sourced from its global fleet of over 5 million vehicles. The data is aggregated and anonymized. In 2025, Tesla introduced vision-based driver monitoring that uses the cabin camera to detect driver inattention and issue escalating alerts. This system contributed to a 12% reduction in distracted driving incidents compared to 2024.',
    page: 3,
    chunkIndex: 2,
    totalChunks: 3,
  },

  // Document 2: Python 3.13 Release Notes
  {
    chunkId: 'doc2-chunk1',
    documentId: 'doc2',
    title: 'Python 3.13 Release Notes — What\'s New',
    content:
      'Python 3.13 introduces an experimental free-threaded build mode that disables the Global Interpreter Lock (GIL), allowing threads to run in parallel on multiple CPU cores. This is the most significant change to CPython\'s concurrency model since its inception. The feature is experimental and must be enabled at build time with the --disable-gil flag.',
    page: 1,
    chunkIndex: 0,
    totalChunks: 3,
  },
  {
    chunkId: 'doc2-chunk2',
    documentId: 'doc2',
    title: 'Python 3.13 Release Notes — What\'s New',
    content:
      'A new JIT (Just-In-Time) compiler was added in Python 3.13, based on a copy-and-patch technique. It provides speedups of 2-9% on the standard benchmark suite. The JIT is enabled by default on supported platforms. Additionally, the new typing features include TypeIs for type narrowing and ReadOnly for TypedDict, improving static type checking capabilities.',
    page: 2,
    chunkIndex: 1,
    totalChunks: 3,
  },
  {
    chunkId: 'doc2-chunk3',
    documentId: 'doc2',
    title: 'Python 3.13 Release Notes — What\'s New',
    content:
      'Python 3.13 removes several deprecated modules including lib2to3, tkinter.tix, and the audioop module. The release also improves error messages with better suggestions for common mistakes like mis-typed imports. The platform support matrix now includes official Windows ARM64 builds and improved macOS Apple Silicon support with optimized memory allocators.',
    page: 3,
    chunkIndex: 2,
    totalChunks: 3,
  },

  // Document 3: Kubernetes 1.30 Changelog
  {
    chunkId: 'doc3-chunk1',
    documentId: 'doc3',
    title: 'Kubernetes v1.30 Release Notes',
    content:
      'Kubernetes v1.30 (codename "Uwubernetes") includes 45 enhancements: 14 graduating to Stable, 15 to Beta, and 16 new Alpha features. Major stable features include Pod Scheduling Readiness, which allows workloads to signal when they are ready to be scheduled, and Service Traffic Distribution for topology-aware routing decisions.',
    page: 1,
    chunkIndex: 0,
    totalChunks: 3,
  },
  {
    chunkId: 'doc3-chunk2',
    documentId: 'doc3',
    title: 'Kubernetes v1.30 Release Notes',
    content:
      'The Sidecar Containers feature has graduated to Beta in v1.30, enabling restartable init containers for service mesh proxies, logging agents, and other infrastructure sidecars. Sidecar containers now start before main containers and stop after them, ensuring proper initialization and cleanup ordering. This is a significant improvement for Istio, Linkerd, and other service mesh deployments.',
    page: 2,
    chunkIndex: 1,
    totalChunks: 3,
  },
  {
    chunkId: 'doc3-chunk3',
    documentId: 'doc3',
    title: 'Kubernetes v1.30 Release Notes',
    content:
      'Node Log Query, previously Alpha, is now Beta and allows cluster administrators to query service logs across nodes using kubectl. The Structured Authentication Config feature graduates to Beta, replacing the older --authentication-token-webhook-config-file flag. v1.30 also marks the removal of in-tree cloud provider integrations for vSphere and OpenStack, fully transitioning to external cloud controller managers.',
    page: 3,
    chunkIndex: 2,
    totalChunks: 3,
  },

  // Document 4: React 19 Overview
  {
    chunkId: 'doc4-chunk1',
    documentId: 'doc4',
    title: 'React 19 — A Complete Overview',
    content:
      'React 19 introduces Actions, a new way to handle data mutations with built-in support for loading states, error states, and optimistic updates. The useActionState hook manages form state automatically. Server Components are now stable, enabling components to run exclusively on the server, reducing client-side JavaScript bundle sizes by 30-50% in typical applications.',
    page: 1,
    chunkIndex: 0,
    totalChunks: 3,
  },
  {
    chunkId: 'doc4-chunk2',
    documentId: 'doc4',
    title: 'React 19 — A Complete Overview',
    content:
      'The new use() API in React 19 can read the value of a Promise or Context inside a component, potentially replacing useContext and simplifying async data access in render. The <form> element now works with the action prop natively. React 19 also introduces the useOptimistic hook for instant UI updates while waiting for server confirmation.',
    page: 2,
    chunkIndex: 1,
    totalChunks: 3,
  },
  {
    chunkId: 'doc4-chunk3',
    documentId: 'doc4',
    title: 'React 19 — A Complete Overview',
    content:
      'Ref handling improvements: ref is now accessible as a regular prop (no forwardRef needed), simplifying component composition. React 19 also adds support for document metadata (<title>, <meta>, <link>) rendered directly in components rather than requiring third-party libraries like react-helmet. Pre-rendering APIs have been unified under a single prerender() function.',
    page: 3,
    chunkIndex: 2,
    totalChunks: 3,
  },

  // Document 5: Climate Change — IPCC AR6 Summary
  {
    chunkId: 'doc5-chunk1',
    documentId: 'doc5',
    title: 'IPCC AR6 Synthesis Report — Summary for Policymakers',
    content:
      'Human activities, principally through emissions of greenhouse gases, have unequivocally caused global warming, with global surface temperature reaching 1.1 degrees Celsius above 1850-1900 levels in 2011-2020. Global greenhouse gas emissions have continued to increase, with unequal historical and ongoing contributions arising from unsustainable energy use, land use and land-use change, lifestyles and patterns of consumption and production.',
    page: 1,
    chunkIndex: 0,
    totalChunks: 4,
  },
  {
    chunkId: 'doc5-chunk2',
    documentId: 'doc5',
    title: 'IPCC AR6 Synthesis Report — Summary for Policymakers',
    content:
      'Approximately 3.3 to 3.6 billion people live in contexts that are highly vulnerable to climate change. Human and ecosystem vulnerability are interdependent. Regions and people with considerable development constraints have high vulnerability to climatic hazards. Increasing weather and climate extreme events have exposed millions of people to acute food insecurity and reduced water security.',
    page: 2,
    chunkIndex: 1,
    totalChunks: 4,
  },
  {
    chunkId: 'doc5-chunk3',
    documentId: 'doc5',
    title: 'IPCC AR6 Synthesis Report — Summary for Policymakers',
    content:
      'Limiting human-caused global warming requires net zero CO2 emissions. Cumulative carbon emissions until the time of reaching net zero CO2 emissions and the level of greenhouse gas emission reductions this decade largely determine whether warming can be limited to 1.5 or 2 degrees C. Projected CO2 emissions from existing fossil fuel infrastructure without additional abatement exceed the remaining carbon budget for 1.5 degrees C.',
    page: 3,
    chunkIndex: 2,
    totalChunks: 4,
  },
  {
    chunkId: 'doc5-chunk4',
    documentId: 'doc5',
    title: 'IPCC AR6 Synthesis Report — Summary for Policymakers',
    content:
      'Deep, rapid, and sustained mitigation and accelerated implementation of adaptation actions in this decade would reduce projected losses and damages for humans and ecosystems. Delaying mitigation and adaptation would lock in high-emissions infrastructure, raise risks of stranded assets and cost-escalation, reduce feasibility, and increase losses and damages. Near-term actions involve high up-front investments and potentially disruptive changes.',
    page: 4,
    chunkIndex: 3,
    totalChunks: 4,
  },
]

// ---------------------------------------------------------------------------
// Inverted index for fast keyword-based retrieval
// ---------------------------------------------------------------------------

const invertedIndex = new Map<string, number[]>()

function buildInvertedIndex(): void {
  if (invertedIndex.size > 0) return
  for (let i = 0; i < DOCUMENT_STORE.length; i++) {
    const chunk = DOCUMENT_STORE[i]
    const tokens = new Set(
      chunk.content
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter((t) => t.length > 2),
    )
    for (const token of tokens) {
      const entries = invertedIndex.get(token) ?? []
      entries.push(i)
      invertedIndex.set(token, entries)
    }
  }
}

// ---------------------------------------------------------------------------
// TF-IDF-inspired relevance scoring
// ---------------------------------------------------------------------------

function computeRelevance(query: string, chunkIndex: number): number {
  const chunk = DOCUMENT_STORE[chunkIndex]
  const queryTokens = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((t) => t.length > 2)

  if (queryTokens.length === 0) return 0

  const chunkTokens = chunk.content
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)

  // TF: term frequency within the chunk
  let matchCount = 0
  for (const qt of queryTokens) {
    if (chunk.content.toLowerCase().includes(qt)) {
      matchCount++
    }
  }

  const tf = matchCount / queryTokens.length

  // IDF-like: boost if query terms are rare across the corpus
  let idfBoost = 0
  for (const qt of queryTokens) {
    const docCount = invertedIndex.get(qt)?.length ?? DOCUMENT_STORE.length
    idfBoost += Math.log(DOCUMENT_STORE.length / (docCount || 1)) / Math.log(10)
  }
  idfBoost = idfBoost / queryTokens.length

  // Title match bonus
  const titleMatch = chunk.title.toLowerCase().includes(query.toLowerCase())
    ? 0.3
    : 0

  return Math.min(1.0, tf * 0.6 + idfBoost * 0.1 + titleMatch)
}

// ---------------------------------------------------------------------------
// Retriever function
// ---------------------------------------------------------------------------

export async function retrieve(
  query: string,
  topK = 5,
): Promise<RetrieveResult> {
  buildInvertedIndex()

  const startTime = performance.now()

  // Score all chunks
  const scored = DOCUMENT_STORE
    .map((chunk, index) => ({
      ...chunk,
      score: computeRelevance(query, index),
    }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)

  const retrievalTimeMs = Math.round(performance.now() - startTime)

  return {
    query,
    chunks: scored,
    totalMatches: scored.length,
    retrievalTimeMs,
  }
}

/**
 * Compute simple embedding similarity for evaluating retriever quality.
 * Simulates cosine similarity between query and chunk term vectors.
 */
export function computeEmbeddingSimilarity(query: string, content: string): number {
  const querySet = new Set(
    query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((t) => t.length > 2),
  )
  const contentSet = new Set(
    content
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((t) => t.length > 2),
  )

  if (querySet.size === 0 || contentSet.size === 0) return 0

  let overlap = 0
  for (const t of querySet) {
    if (contentSet.has(t)) overlap++
  }

  return overlap / Math.sqrt(querySet.size * contentSet.size)
}
