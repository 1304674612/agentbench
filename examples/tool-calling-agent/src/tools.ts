/**
 * Tool Implementations — 8 real tools for the tool-calling agent.
 *
 * Each tool is implemented as a standalone async function with realistic
 * behavior. In production, these would connect to real APIs and services.
 */

// ---------------------------------------------------------------------------
// Tool: get_weather
// ---------------------------------------------------------------------------

export interface WeatherResult {
  city: string
  temperature: number
  units: string
  condition: string
  humidity: number
  windSpeed: number
  forecast: string
}

const weatherDB: Record<string, WeatherResult> = {
  'new york': {
    city: 'New York',
    temperature: 22,
    units: 'celsius',
    condition: 'Partly Cloudy',
    humidity: 65,
    windSpeed: 12,
    forecast: 'Clearing by evening',
  },
  'san francisco': {
    city: 'San Francisco',
    temperature: 18,
    units: 'celsius',
    condition: 'Foggy',
    humidity: 80,
    windSpeed: 8,
    forecast: 'Fog clearing by noon',
  },
  london: {
    city: 'London',
    temperature: 15,
    units: 'celsius',
    condition: 'Light Rain',
    humidity: 75,
    windSpeed: 15,
    forecast: 'Rain continuing throughout the day',
  },
  tokyo: {
    city: 'Tokyo',
    temperature: 28,
    units: 'celsius',
    condition: 'Sunny',
    humidity: 55,
    windSpeed: 6,
    forecast: 'Clear skies all day',
  },
  beijing: {
    city: 'Beijing',
    temperature: 30,
    units: 'celsius',
    condition: 'Hazy',
    humidity: 40,
    windSpeed: 10,
    forecast: 'Haze reducing by afternoon',
  },
}

export async function getWeather(
  city: string,
  units: 'celsius' | 'fahrenheit' = 'celsius'
): Promise<WeatherResult> {
  const key = city.toLowerCase()
  const base = weatherDB[key]
  if (!base) {
    return {
      city,
      temperature: 0,
      units,
      condition: 'Unknown',
      humidity: 0,
      windSpeed: 0,
      forecast: `No weather data available for ${city}`,
    }
  }
  const temp =
    units === 'fahrenheit' ? Math.round((base.temperature * 9) / 5 + 32) : base.temperature
  return { ...base, temperature: temp, units }
}

// ---------------------------------------------------------------------------
// Tool: calculator
// ---------------------------------------------------------------------------

export interface CalculatorResult {
  expression: string
  result: number | string
  error?: string
}

export async function calculator(expression: string): Promise<CalculatorResult> {
  // Sanitize: only allow safe math expressions
  const sanitized = expression.replace(/[^0-9+\-*/().%\s]/g, '')
  if (sanitized !== expression.trim()) {
    return { expression, result: 0, error: 'Expression contains invalid characters' }
  }
  try {
    // biome-ignore lint/security/noGlobalEval: safe after sanitization
    const result = Function(`"use strict"; return (${sanitized})`)() as number
    if (typeof result !== 'number' || !isFinite(result)) {
      return { expression, result: 0, error: 'Result is not a finite number' }
    }
    return { expression, result: Math.round(result * 1e10) / 1e10 }
  } catch (err) {
    return {
      expression,
      result: 0,
      error: `Calculation error: ${err instanceof Error ? err.message : 'invalid expression'}`,
    }
  }
}

// ---------------------------------------------------------------------------
// Tool: search_docs
// ---------------------------------------------------------------------------

export interface SearchResult {
  query: string
  results: Array<{ title: string; snippet: string; relevance: number }>
  totalHits: number
}

const docIndex: Array<{ title: string; content: string }> = [
  {
    title: 'Getting Started Guide',
    content:
      'This guide covers installation, configuration, and your first query. To install, run npm install @agentbench/core. Configure your API keys in the .env file.',
  },
  {
    title: 'API Reference',
    content:
      'The API Reference documents all public methods. Key classes: Runner, Tracer, Evaluator, Assertion. Each class provides detailed method signatures and usage examples.',
  },
  {
    title: 'Deployment Guide',
    content:
      'Deploy AgentBench to production using Docker. Use docker-compose up to start all services. Configure environment variables for your cloud provider.',
  },
  {
    title: 'Troubleshooting',
    content:
      'Common issues: API key not set (check .env), rate limiting (reduce concurrency), timeout errors (increase maxSteps). Contact support for persistent issues.',
  },
  {
    title: 'Security Best Practices',
    content:
      'Never commit API keys. Use environment variables. Rotate keys regularly. Enable audit logging. Review tool permissions before deployment.',
  },
]

export async function searchDocs(query: string, maxResults = 3): Promise<SearchResult> {
  const q = query.toLowerCase()
  const scored = docIndex
    .map((doc) => {
      const words = q.split(/\s+/)
      let score = 0
      const titleLower = doc.title.toLowerCase()
      const contentLower = doc.content.toLowerCase()
      for (const w of words) {
        if (titleLower.includes(w)) score += 3
        if (contentLower.includes(w)) score += 1
      }
      return { ...doc, relevance: Math.round(score * 100) / 100 }
    })
    .filter((d) => d.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, maxResults)

  return {
    query,
    results: scored.map((d) => ({
      title: d.title,
      snippet: d.content.slice(0, 150) + '...',
      relevance: d.relevance,
    })),
    totalHits: scored.length,
  }
}

// ---------------------------------------------------------------------------
// Tool: query_database
// ---------------------------------------------------------------------------

export interface DatabaseResult {
  query: string
  columns: string[]
  rows: Array<Record<string, unknown>>
  rowCount: number
  error?: string
}

// In-memory mock database
const mockDB: Record<string, Array<Record<string, unknown>>> = {
  'SELECT * FROM users': [
    { id: 1, name: 'Alice', email: 'alice@example.com', status: 'active' },
    { id: 2, name: 'Bob', email: 'bob@example.com', status: 'active' },
    { id: 3, name: 'Carol', email: 'carol@example.com', status: 'inactive' },
  ],
  'SELECT * FROM products': [
    { id: 1, name: 'Widget', price: 9.99, stock: 100 },
    { id: 2, name: 'Gadget', price: 24.99, stock: 50 },
    { id: 3, name: 'Doohickey', price: 4.99, stock: 200 },
  ],
}

export async function queryDatabase(sql: string): Promise<DatabaseResult> {
  const normalized = sql.trim().replace(/\s+/g, ' ')
  const upper = normalized.toUpperCase()

  // Only allow SELECT queries
  if (!upper.startsWith('SELECT')) {
    return {
      query: sql,
      columns: [],
      rows: [],
      rowCount: 0,
      error: 'Only SELECT queries are allowed',
    }
  }

  // Check for known queries
  const known = mockDB[normalized]
  if (known) {
    const columns = known.length > 0 ? Object.keys(known[0]) : []
    return { query: sql, columns, rows: known, rowCount: known.length }
  }

  // Generic response for unknown queries
  return {
    query: sql,
    columns: ['id', 'name', 'value'],
    rows: [{ id: 1, name: 'Sample Result', value: 42 }],
    rowCount: 1,
  }
}

// ---------------------------------------------------------------------------
// Tool: send_email
// ---------------------------------------------------------------------------

export interface EmailResult {
  to: string
  subject: string
  status: 'sent' | 'failed'
  messageId?: string
  error?: string
}

export async function sendEmail(to: string, subject: string, body: string): Promise<EmailResult> {
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(to)) {
    return { to, subject, status: 'failed', error: `Invalid email address: ${to}` }
  }
  if (!subject.trim()) {
    return { to, subject, status: 'failed', error: 'Subject is required' }
  }
  // Simulate sending
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  return { to, subject, status: 'sent', messageId }
}

// ---------------------------------------------------------------------------
// Tool: check_calendar
// ---------------------------------------------------------------------------

export interface CalendarEvent {
  title: string
  date: string
  time: string
  duration: string
  attendees: string[]
}

export interface CalendarResult {
  events: CalendarEvent[]
  dateRange: { start: string; end: string }
  totalEvents: number
}

const calendarDB: CalendarEvent[] = [
  {
    title: 'Team Standup',
    date: '2025-07-10',
    time: '09:00',
    duration: '30m',
    attendees: ['Alice', 'Bob', 'Carol'],
  },
  {
    title: 'Sprint Planning',
    date: '2025-07-10',
    time: '14:00',
    duration: '2h',
    attendees: ['Alice', 'Bob', 'Carol', 'Dave'],
  },
  {
    title: '1:1 with Manager',
    date: '2025-07-11',
    time: '10:00',
    duration: '1h',
    attendees: ['Alice'],
  },
  {
    title: 'Design Review',
    date: '2025-07-11',
    time: '15:00',
    duration: '1h',
    attendees: ['Carol', 'Dave'],
  },
  {
    title: 'Company All Hands',
    date: '2025-07-12',
    time: '11:00',
    duration: '1h',
    attendees: ['All'],
  },
]

export async function checkCalendar(date?: string, days = 3): Promise<CalendarResult> {
  const startDate = date ? new Date(date) : new Date()
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + days)

  const events = calendarDB.filter((e) => {
    const eventDate = new Date(e.date)
    return eventDate >= startDate && eventDate <= endDate
  })

  return {
    events,
    dateRange: {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0],
    },
    totalEvents: events.length,
  }
}

// ---------------------------------------------------------------------------
// Tool: translate_text
// ---------------------------------------------------------------------------

export interface TranslateResult {
  original: string
  translated: string
  sourceLanguage: string
  targetLanguage: string
}

const translations: Record<string, Record<string, string>> = {
  hello: {
    spanish: 'hola',
    french: 'bonjour',
    german: 'hallo',
    japanese: 'こんにちは',
    chinese: '你好',
  },
  'good morning': {
    spanish: 'buenos días',
    french: 'bonjour',
    german: 'guten morgen',
    japanese: 'おはようございます',
    chinese: '早上好',
  },
  'thank you': {
    spanish: 'gracias',
    french: 'merci',
    german: 'danke',
    japanese: 'ありがとう',
    chinese: '谢谢',
  },
  goodbye: {
    spanish: 'adiós',
    french: 'au revoir',
    german: 'auf wiedersehen',
    japanese: 'さようなら',
    chinese: '再见',
  },
  'how are you': {
    spanish: '¿cómo estás?',
    french: 'comment allez-vous?',
    german: 'wie geht es ihnen?',
    japanese: 'お元気ですか',
    chinese: '你好吗',
  },
}

export async function translateText(
  text: string,
  targetLanguage: string
): Promise<TranslateResult> {
  const key = text.toLowerCase().trim()
  const lang = targetLanguage.toLowerCase()
  const entry = translations[key]
  const translated = entry?.[lang] ?? `[Translation of "${text}" to ${targetLanguage}]`
  return {
    original: text,
    translated,
    sourceLanguage: 'auto-detected',
    targetLanguage,
  }
}

// ---------------------------------------------------------------------------
// Tool: read_file
// ---------------------------------------------------------------------------

export interface FileResult {
  path: string
  content: string
  size: number
  exists: boolean
  error?: string
}

const fileSystem: Record<string, string> = {
  '/data/config.json': JSON.stringify(
    { app: 'AgentBench', version: '0.3.0', debug: false, port: 3000 },
    null,
    2
  ),
  '/data/users.csv':
    'id,name,email\n1,Alice,alice@example.com\n2,Bob,bob@example.com\n3,Carol,carol@example.com',
  '/data/README.md':
    '# Project Documentation\n\nThis is the main documentation for the project.\n\n## Setup\nRun `npm install` to get started.',
  '/logs/app.log':
    '[2025-07-10 09:00:01] INFO  Server started on port 3000\n[2025-07-10 09:00:05] INFO  Database connected\n[2025-07-10 09:01:00] WARN  High memory usage detected (85%)',
}

export async function readFile(path: string): Promise<FileResult> {
  const normalized = path.startsWith('/') ? path : `/${path}`
  const content = fileSystem[normalized]
  if (content === undefined) {
    return {
      path: normalized,
      content: '',
      size: 0,
      exists: false,
      error: `File not found: ${normalized}`,
    }
  }
  return { path: normalized, content, size: Buffer.byteLength(content), exists: true }
}
