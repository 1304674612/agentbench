/**
 * LlamaIndex — Document index with query and chat capabilities.
 *
 * Implements a mock document index that supports:
 *   - Querying with top-k retrieval
 *   - Chat with conversational history
 *   - Index inspection (metadata, quality metrics)
 */

interface IndexedDocument {
  id: string
  title: string
  content: string
  embedding: number[]
  metadata: Record<string, string>
}

const DOCS: IndexedDocument[] = [
  { id: 'doc1', title: 'Introduction to Machine Learning', content: 'Machine learning is a subset of artificial intelligence that enables systems to learn from data. Key algorithms include supervised learning (classification, regression), unsupervised learning (clustering, dimensionality reduction), and reinforcement learning. Popular frameworks include TensorFlow, PyTorch, and scikit-learn.', embedding: [], metadata: { author: 'AI Research Group', date: '2025', category: 'AI' } },
  { id: 'doc2', title: 'Python Best Practices', content: 'Python best practices include using type hints, following PEP 8 style guidelines, writing docstrings, using virtual environments, and leveraging comprehensions. Use list comprehensions over map/filter for readability. Prefer f-strings over format() or % formatting. Handle exceptions specifically rather than using bare except clauses.', embedding: [], metadata: { author: 'Python Foundation', date: '2024', category: 'Programming' } },
  { id: 'doc3', title: 'Web Development with React', content: 'React is a JavaScript library for building user interfaces. Key concepts include components, props, state, and hooks. React 19 introduces Server Components, the use() API, and improved form handling. State management options include useState, useReducer, Context API, and external libraries like Redux or Zustand.', embedding: [], metadata: { author: 'React Team', date: '2025', category: 'Web' } },
  { id: 'doc4', title: 'Database Design Principles', content: 'Good database design follows normalization principles (1NF through 3NF). Choose appropriate data types. Index columns used in WHERE and JOIN clauses. Use foreign keys to enforce referential integrity. Consider denormalization for read-heavy workloads. Always back up your data and test recovery procedures.', embedding: [], metadata: { author: 'DB Experts', date: '2024', category: 'Databases' } },
  { id: 'doc5', title: 'Cloud Architecture Patterns', content: 'Cloud architecture patterns include microservices, event-driven architecture, CQRS, and serverless. Use infrastructure as code (Terraform, Pulumi). Implement observability with metrics, logs, and traces. Design for failure with redundancy, circuit breakers, and graceful degradation. Optimize costs with auto-scaling and spot instances.', embedding: [], metadata: { author: 'Cloud Arch Guild', date: '2025', category: 'Cloud' } },
]

export function queryIndex(query: string, topK = 3): { results: Array<{ docId: string; title: string; snippet: string; score: number }>; query: string; totalResults: number } {
  const q = query.toLowerCase()
  const scored = DOCS.map((doc) => {
    let score = 0
    const words = q.split(/\s+/)
    for (const w of words) {
      if (doc.title.toLowerCase().includes(w)) score += 3
      if (doc.content.toLowerCase().includes(w)) score += 1
      if (doc.metadata.category?.toLowerCase().includes(w)) score += 2
    }
    return { docId: doc.id, title: doc.title, snippet: doc.content.slice(0, 200) + '...', score: Math.min(1, score / (words.length * 3)) }
  }).filter((r) => r.score > 0).sort((a, b) => b.score - a.score).slice(0, topK)
  return { results: scored, query, totalResults: scored.length }
}

export function chatWithIndex(message: string, history: Array<{ role: string; content: string }> = []): { response: string; sources: string[] } {
  const queryResult = queryIndex(message, 2)
  const sources = queryResult.results.map((r) => r.title)
  const context = queryResult.results.map((r) => r.snippet).join('\n')
  return { response: `[Chat Response based on ${queryResult.totalResults} documents] Context: ${context.slice(0, 300)}...`, sources }
}

export function inspectIndex(): { documentCount: number; categories: string[]; totalTokens: number; averageDocLength: number; lastUpdated: string } {
  const categories = [...new Set(DOCS.map((d) => d.metadata.category))]
  const totalTokens = DOCS.reduce((sum, d) => sum + d.content.split(/\s+/).length, 0)
  return { documentCount: DOCS.length, categories, totalTokens, averageDocLength: Math.round(totalTokens / DOCS.length), lastUpdated: '2025-07-10' }
}
