import type { AgentConfig, RunOptions } from '@agentbench/core'

/**
 * AgentBench configuration for the Research Agent example.
 *
 * This config defines a multi-step research agent that searches the web,
 * fetches pages, summarizes content, and cites sources. It demonstrates
 * testing complex, multi-tool agent workflows.
 */

export interface ResearchProjectConfig {
  name: string
  description: string
  agent: AgentConfig
  options: Partial<RunOptions>
  testSuites: string[]
}

const config: ResearchProjectConfig = {
  name: 'research-agent',
  description:
    'Multi-step research agent that searches the web, summarizes findings, and cites sources',

  agent: {
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.3,
    maxTokens: 4096,
    systemPrompt: `You are a thorough research assistant. Your job is to research topics and provide well-sourced, factual answers.

Research process:
1. Search the web for relevant information using multiple queries
2. Fetch and read the most promising pages
3. Summarize key findings from each source
4. Synthesize a comprehensive answer with proper citations

Guidelines:
- Always search before answering — never rely on training data alone
- Cross-reference claims across multiple sources
- Cite sources with URLs so information can be verified
- Be clear about what is established fact vs. what is uncertain
- When sources disagree, present all perspectives fairly
- Do not fabricate citations or sources`,
    tools: [
      {
        name: 'web_search',
        description: 'Search the web for information on a given query',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'The search query' },
            numResults: { type: 'number', description: 'Number of results to return (1-10)' },
          },
          required: ['query'],
        },
      },
      {
        name: 'fetch_page',
        description: 'Fetch and extract the text content of a web page',
        parameters: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'The URL to fetch' },
          },
          required: ['url'],
        },
      },
      {
        name: 'summarize',
        description: 'Summarize a piece of text into key points',
        parameters: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'The text to summarize' },
            maxPoints: { type: 'number', description: 'Maximum number of key points' },
          },
          required: ['text'],
        },
      },
      {
        name: 'cite_sources',
        description: 'Format a list of sources into proper citations',
        parameters: {
          type: 'object',
          properties: {
            sources: {
              type: 'array',
              description: 'Array of sources to cite',
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
    ],
  },

  options: {
    timeout: 60000,
    maxSteps: 10,
    retries: 1,
    concurrency: 1,
  },

  testSuites: ['./tests/research-quality.test.ts', './tests/source-verification.test.ts'],
}

export default config
