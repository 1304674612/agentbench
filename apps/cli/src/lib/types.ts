export type Language = 'ts' | 'js'

export type TemplateKind = 'hello-agent' | 'customer-support' | 'rag-agent' | 'empty'

export type Provider =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'deepseek'
  | 'openrouter'
  | 'azure'
  | 'groq'
  | 'mistral'
  | 'cohere'

export interface ProviderInfo {
  key: Provider
  label: string
  envVar: string
  defaultModel: string
}

export const ALL_PROVIDERS: ProviderInfo[] = [
  { key: 'openai', label: 'OpenAI', envVar: 'OPENAI_API_KEY', defaultModel: 'gpt-4o' },
  {
    key: 'anthropic',
    label: 'Anthropic',
    envVar: 'ANTHROPIC_API_KEY',
    defaultModel: 'claude-sonnet-4-20250514',
  },
  {
    key: 'gemini',
    label: 'Google Gemini',
    envVar: 'GEMINI_API_KEY',
    defaultModel: 'gemini-2.5-flash',
  },
  { key: 'deepseek', label: 'DeepSeek', envVar: 'DEEPSEEK_API_KEY', defaultModel: 'deepseek-chat' },
  {
    key: 'openrouter',
    label: 'OpenRouter',
    envVar: 'OPENROUTER_API_KEY',
    defaultModel: 'openai/gpt-4o',
  },
  { key: 'azure', label: 'Azure OpenAI', envVar: 'AZURE_OPENAI_API_KEY', defaultModel: 'gpt-4o' },
  {
    key: 'groq',
    label: 'Groq',
    envVar: 'GROQ_API_KEY',
    defaultModel: 'llama-4-scout-17b-16e-instruct',
  },
  {
    key: 'mistral',
    label: 'Mistral',
    envVar: 'MISTRAL_API_KEY',
    defaultModel: 'mistral-large-latest',
  },
  { key: 'cohere', label: 'Cohere', envVar: 'COHERE_API_KEY', defaultModel: 'command-r-plus' },
]
