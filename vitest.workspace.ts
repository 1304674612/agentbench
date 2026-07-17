import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  'packages/core',
  'packages/config',
  'packages/provider-utils',
  'packages/adapter',
  'packages/anthropic',
  'packages/openai',
  'packages/azure-openai',
  'packages/deepseek',
  'packages/gemini',
  'packages/groq',
  'packages/ollama',
  'packages/openrouter',
  'packages/mcp',
  'packages/langgraph',
  'apps/web',
])
