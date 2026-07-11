/**
 * Research Agent — Multi-step research workflow using @agentbench/openai.
 *
 * This agent demonstrates a complex, multi-tool workflow:
 *   1. web_search  — search for information
 *   2. fetch_page  — retrieve full page content
 *   3. summarize   — extract key points from content
 *   4. cite_sources — format citations properly
 *
 * The agent is designed to be tested on research quality, source
 * verification, and faithfulness to retrieved information.
 */

import { createOpenAIClient, runWithOpenAI } from '@agentbench/openai'
import type { ExecutionTrace } from '@agentbench/core'

// ---------------------------------------------------------------------------
// Mock data — realistic research content
// ---------------------------------------------------------------------------

interface SearchResult {
  title: string
  url: string
  snippet: string
  relevance: number
}

interface FetchedPage {
  url: string
  title: string
  content: string
  wordCount: number
  publishDate: string
  author: string
}

interface Source {
  title: string
  url: string
  author: string
  date: string
}

const mockSearchIndex: Record<string, SearchResult[]> = {
  'quantum computing': [
    {
      title: 'What is Quantum Computing? — IBM Research',
      url: 'https://research.ibm.com/quantum-computing',
      snippet:
        'Quantum computing uses quantum mechanics to process information in fundamentally new ways. Unlike classical bits, quantum bits (qubits) can exist in multiple states simultaneously through superposition.',
      relevance: 0.98,
    },
    {
      title: 'Quantum Computing: Progress and Prospects — National Academies',
      url: 'https://nap.nationalacademies.org/quantum-computing-progress',
      snippet:
        'A comprehensive report on the current state of quantum computing, including hardware challenges, error correction, and timelines for practical applications.',
      relevance: 0.94,
    },
    {
      title: 'How Quantum Computers Work — MIT Technology Review',
      url: 'https://www.technologyreview.com/quantum-computing-explained',
      snippet:
        'An accessible explanation of quantum computing concepts: superposition, entanglement, and quantum gates, with examples of real-world applications in cryptography and drug discovery.',
      relevance: 0.91,
    },
    {
      title: 'The Quantum Computing Landscape — McKinsey & Company',
      url: 'https://www.mckinsey.com/quantum-computing-market',
      snippet:
        'Market analysis estimating quantum computing will create $450-850 billion in value by 2040, with early applications in finance, pharmaceuticals, and materials science.',
      relevance: 0.87,
    },
  ],
  'climate change': [
    {
      title: 'Climate Change: Global Temperature — NOAA Climate.gov',
      url: 'https://www.climate.gov/news-features/understanding-climate/climate-change-global-temperature',
      snippet:
        "Earth's average surface temperature has risen about 1.1 degrees Celsius since the late 19th century, with most warming occurring in the past 40 years.",
      relevance: 0.97,
    },
    {
      title: 'Climate Change 2023: Synthesis Report — IPCC',
      url: 'https://www.ipcc.ch/report/ar6/syr',
      snippet:
        'The IPCC Sixth Assessment Report confirms human influence has warmed the atmosphere, ocean, and land. Urgent action is needed to limit warming to 1.5 degrees C.',
      relevance: 0.99,
    },
    {
      title: 'Renewable Energy Growth 2024 — IEA',
      url: 'https://www.iea.org/reports/renewables-2024',
      snippet:
        'Global renewable energy capacity additions reached a record 560 GW in 2024, with solar PV accounting for 75% of new capacity. China, EU, and US lead deployment.',
      relevance: 0.85,
    },
  ],
  default: [
    {
      title: 'Wikipedia — General Reference',
      url: 'https://en.wikipedia.org/wiki/Special:Search',
      snippet:
        'The free encyclopedia that anyone can edit. Contains articles on millions of topics.',
      relevance: 0.7,
    },
    {
      title: 'Google Scholar',
      url: 'https://scholar.google.com',
      snippet:
        'Search across scholarly literature from academic publishers, universities, and other research organizations.',
      relevance: 0.7,
    },
  ],
}

const mockPageContent: Record<string, FetchedPage> = {
  'https://research.ibm.com/quantum-computing': {
    url: 'https://research.ibm.com/quantum-computing',
    title: 'What is Quantum Computing? — IBM Research',
    content: `Quantum computing is a rapidly emerging technology that harnesses the laws of quantum mechanics to solve problems too complex for classical computers.

Key Concepts:

1. Qubits: Unlike classical bits (0 or 1), qubits can exist in a superposition of states, enabling quantum computers to process vast amounts of information simultaneously.

2. Entanglement: When qubits become entangled, the state of one qubit is directly correlated with the state of another, regardless of distance. This enables powerful correlations that have no classical analog.

3. Quantum Gates: Operations on qubits are performed using quantum gates, which manipulate the probability amplitudes of qubit states.

Current State of the Field (2026):
- IBM has demonstrated quantum processors with over 1,000 qubits
- Error correction remains the primary challenge
- Quantum advantage has been demonstrated for specific computational problems
- Hybrid classical-quantum algorithms are the most promising near-term approach

Applications:
- Drug discovery and molecular simulation
- Financial portfolio optimization
- Cryptography and security
- Climate modeling
- Supply chain optimization

Challenges:
- Qubit coherence times are still measured in microseconds
- Error rates remain too high for fault-tolerant quantum computing
- Cooling requirements (near absolute zero) make scaling difficult`,
    wordCount: 210,
    publishDate: '2026-03-15',
    author: 'IBM Research Team',
  },
  'https://www.ipcc.ch/report/ar6/syr': {
    url: 'https://www.ipcc.ch/report/ar6/syr',
    title: 'Climate Change 2023: Synthesis Report — IPCC',
    content: `The IPCC Sixth Assessment Report (AR6) represents the most comprehensive assessment of climate change science to date.

Key Findings:

1. Unequivocal Human Influence: Human activities, principally through emissions of greenhouse gases, have unequivocally caused global warming, with global surface temperature reaching 1.1 degrees C above 1850-1900 levels in 2011-2020.

2. Widespread Impacts: Climate change is already affecting every inhabited region across the globe, with increasingly severe heatwaves, heavy precipitation, droughts, and tropical cyclones.

3. Vulnerability: Approximately 3.3-3.6 billion people live in contexts that are highly vulnerable to climate change.

4. Mitigation Pathways: Limiting warming to 1.5 degrees C requires rapid, deep, and immediate greenhouse gas emission reductions across all sectors. Global GHG emissions must peak before 2025 and decline 43% by 2030.

5. Adaptation: Progress on adaptation has been uneven, with increasing gaps between current efforts and what is needed. There are feasible and effective adaptation options available.

6. Finance: Financial flows for mitigation and adaptation need to increase by 3-6 times current levels to meet climate goals.

The report emphasizes that the choices made in this decade will impact current and future generations for thousands of years.`,
    wordCount: 225,
    publishDate: '2023-03-20',
    author: 'IPCC Working Groups I, II, III',
  },
  'https://www.climate.gov/news-features/understanding-climate/climate-change-global-temperature': {
    url: 'https://www.climate.gov/news-features/understanding-climate/climate-change-global-temperature',
    title: 'Climate Change: Global Temperature — NOAA Climate.gov',
    content: `According to NOAA's 2025 Global Climate Report, the combined land and ocean temperature has increased at an average rate of 0.08 degrees C per decade since 1880. However, since 1981, the rate of increase has more than doubled to 0.18 degrees C per decade.

The 10 warmest years in the historical record have all occurred since 2014. 2024 was the warmest year on record, surpassing the previous record set in 2023.

Global temperature anomalies are calculated relative to a 1901-2000 baseline. The year 2025 shows continuing warming trends consistent with climate model projections under moderate-to-high emission scenarios.

Regional variations are significant: the Arctic is warming at roughly twice the global average rate, while some equatorial regions show less pronounced warming. Ocean heat content continues to reach record levels, contributing to sea level rise through thermal expansion.

The data comes from NOAA's National Centers for Environmental Information (NCEI), which maintains one of the world's most comprehensive climate data archives.`,
    wordCount: 178,
    publishDate: '2025-06-15',
    author: 'NOAA NCEI',
  },
}

// ---------------------------------------------------------------------------
// Tool handler
// ---------------------------------------------------------------------------

export function executeTool(name: string, args: Record<string, unknown>): Record<string, unknown> {
  switch (name) {
    case 'web_search': {
      const query = String(args.query ?? '').toLowerCase()
      const numResults = Math.min(Number(args.numResults ?? 5), 10)

      let results = mockSearchIndex[query]
      if (!results) {
        // Partial match search
        const matchingKey = Object.keys(mockSearchIndex).find(
          (key) => query.includes(key) || key.includes(query)
        )
        results = matchingKey ? mockSearchIndex[matchingKey] : mockSearchIndex.default
      }

      return {
        results: results.slice(0, numResults),
        totalResults: results.length,
        query,
        searchTime: '0.43s',
      }
    }

    case 'fetch_page': {
      const url = String(args.url ?? '')
      const page = mockPageContent[url]
      if (!page) {
        return {
          url,
          fetched: false,
          content: null,
          error: 'Page could not be fetched (404 or timeout)',
        }
      }
      return { ...page, fetched: true }
    }

    case 'summarize': {
      const text = String(args.text ?? '')
      const maxPoints = Number(args.maxPoints ?? 5)

      // Simple extractive summary: split into sentences, pick first N meaningful ones
      const sentences = text
        .split(/(?<=[.!?])\s+/)
        .filter((s) => s.length > 20)
        .slice(0, maxPoints)

      return {
        keyPoints: sentences.map((s, i) => ({ index: i + 1, point: s.trim() })),
        originalLength: text.length,
        summaryLength: sentences.join(' ').length,
        compressionRatio:
          text.length > 0 ? (sentences.join(' ').length / text.length).toFixed(2) : '0',
      }
    }

    case 'cite_sources': {
      const sources = (args.sources ?? []) as Source[]
      if (!Array.isArray(sources) || sources.length === 0) {
        return { citations: [], count: 0, error: 'No sources provided' }
      }

      const citations = sources.map((src, i) => {
        let citation = `${src.author ? src.author + '. ' : ''}"${src.title}."`
        if (src.date) citation += ` ${src.date}.`
        if (src.url) citation += ` ${src.url}`
        return { index: i + 1, citation }
      })

      return {
        citations,
        count: citations.length,
        format: 'APA-style',
      }
    }

    default:
      return { error: `Unknown tool: ${name}` }
  }
}

// ---------------------------------------------------------------------------
// Agent runner
// ---------------------------------------------------------------------------

export interface RunResearchParams {
  query: string
  apiKey: string
  model?: string
  maxSteps?: number
}

export interface ResearchResult {
  output: string
  trace: ExecutionTrace
  cost: number
}

export async function runResearchAgent(params: RunResearchParams): Promise<ResearchResult> {
  const { query, apiKey, model = 'gpt-4o', maxSteps = 10 } = params

  const client = createOpenAIClient({
    apiKey,
    tracing: true,
    timeout: 60000,
  })

  const tools = [
    {
      type: 'function' as const,
      function: {
        name: 'web_search',
        description: 'Search the web for information on a given query',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'The search query' },
            numResults: { type: 'number', description: 'Number of results (1-10)' },
          },
          required: ['query'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'fetch_page',
        description: 'Fetch and extract text content from a web page URL',
        parameters: {
          type: 'object',
          properties: { url: { type: 'string', description: 'The URL to fetch' } },
          required: ['url'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'summarize',
        description: 'Summarize text into key bullet points',
        parameters: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Text to summarize' },
            maxPoints: { type: 'number', description: 'Maximum key points' },
          },
          required: ['text'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'cite_sources',
        description: 'Format sources into properly styled citations',
        parameters: {
          type: 'object',
          properties: {
            sources: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  url: { type: 'string' },
                  author: { type: 'string' },
                  date: { type: 'string' },
                },
              },
            },
          },
          required: ['sources'],
        },
      },
    },
  ]

  const result = await runWithOpenAI({
    client,
    agent: {
      provider: 'openai',
      model,
      temperature: 0.3,
      maxTokens: 4096,
      systemPrompt: `You are a thorough research assistant. Research the topic and provide a well-sourced answer.

Process:
1. Search the web for information using multiple relevant queries
2. Fetch and read the most promising pages
3. Summarize key findings
4. Cite your sources properly

Always search before answering. Cross-reference claims across sources. Do not fabricate citations.`,
      tools: [
        {
          name: 'web_search',
          description: 'Search the web',
          parameters: { query: 'string', numResults: 'number' },
        },
        { name: 'fetch_page', description: 'Fetch page content', parameters: { url: 'string' } },
        {
          name: 'summarize',
          description: 'Summarize text',
          parameters: { text: 'string', maxPoints: 'number' },
        },
        {
          name: 'cite_sources',
          description: 'Format citations',
          parameters: { sources: 'object[]' },
        },
      ],
    },
    messages: [
      {
        role: 'user',
        content: `Please research the following topic and provide a comprehensive, well-sourced answer:\n\n${query}\n\nSearch the web, fetch relevant pages, summarize the key findings, and cite your sources.`,
      },
    ],
    tools,
    maxSteps,
  })

  return {
    output: result.output,
    trace: result.trace,
    cost: result.cost,
  }
}
