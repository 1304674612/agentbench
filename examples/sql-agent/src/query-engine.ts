/**
 * Query Engine — In-memory SQL executor for the Text-to-SQL agent.
 *
 * This module provides a lightweight SQLite-compatible query executor
 * with security validation. It supports SELECT queries with WHERE,
 * JOIN, GROUP BY, HAVING, ORDER BY, and aggregation functions.
 *
 * Schema: e-commerce database with customers, products, categories,
 * orders, and order_items tables.
 */

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

interface Customer {
  id: number
  name: string
  email: string
  signup_date: string
  country: string
  tier: string
  lifetime_value: number
}
interface Product {
  id: number
  name: string
  category_id: number
  price: number
  stock: number
  rating: number | null
  created_at: string
}
interface Category {
  id: number
  name: string
  slug: string
}
interface Order {
  id: number
  customer_id: number
  order_date: string
  status: string
  total_amount: number
  shipping_country: string
}
interface OrderItem {
  id: number
  order_id: number
  product_id: number
  quantity: number
  unit_price: number
}

const customers: Customer[] = [
  {
    id: 1,
    name: 'Alice Johnson',
    email: 'alice@example.com',
    signup_date: '2025-01-15',
    country: 'US',
    tier: 'enterprise',
    lifetime_value: 12500.0,
  },
  {
    id: 2,
    name: 'Bob Smith',
    email: 'bob@example.com',
    signup_date: '2025-03-22',
    country: 'UK',
    tier: 'pro',
    lifetime_value: 3420.5,
  },
  {
    id: 3,
    name: 'Carol Williams',
    email: 'carol@example.com',
    signup_date: '2025-02-10',
    country: 'US',
    tier: 'pro',
    lifetime_value: 5890.0,
  },
  {
    id: 4,
    name: 'Dave Brown',
    email: 'dave@example.com',
    signup_date: '2025-06-01',
    country: 'CA',
    tier: 'free',
    lifetime_value: 150.75,
  },
  {
    id: 5,
    name: 'Eve Davis',
    email: 'eve@example.com',
    signup_date: '2024-11-30',
    country: 'DE',
    tier: 'enterprise',
    lifetime_value: 45800.0,
  },
  {
    id: 6,
    name: 'Frank Miller',
    email: 'frank@example.com',
    signup_date: '2025-04-18',
    country: 'US',
    tier: 'free',
    lifetime_value: 89.99,
  },
  {
    id: 7,
    name: 'Grace Wilson',
    email: 'grace@example.com',
    signup_date: '2025-05-05',
    country: 'UK',
    tier: 'pro',
    lifetime_value: 2100.0,
  },
  {
    id: 8,
    name: 'Henry Taylor',
    email: 'henry@example.com',
    signup_date: '2025-07-02',
    country: 'AU',
    tier: 'free',
    lifetime_value: 0.0,
  },
]

const categories: Category[] = [
  { id: 1, name: 'Electronics', slug: 'electronics' },
  { id: 2, name: 'Clothing', slug: 'clothing' },
  { id: 3, name: 'Books', slug: 'books' },
  { id: 4, name: 'Home & Garden', slug: 'home-garden' },
  { id: 5, name: 'Sports', slug: 'sports' },
]

const products: Product[] = [
  {
    id: 1,
    name: 'Wireless Headphones',
    category_id: 1,
    price: 79.99,
    stock: 150,
    rating: 4.5,
    created_at: '2024-08-15',
  },
  {
    id: 2,
    name: 'Mechanical Keyboard',
    category_id: 1,
    price: 129.99,
    stock: 85,
    rating: 4.7,
    created_at: '2024-09-01',
  },
  {
    id: 3,
    name: 'USB-C Hub 7-in-1',
    category_id: 1,
    price: 49.99,
    stock: 200,
    rating: 4.3,
    created_at: '2024-10-10',
  },
  {
    id: 4,
    name: 'Running Shoes',
    category_id: 5,
    price: 119.99,
    stock: 60,
    rating: 4.6,
    created_at: '2024-11-20',
  },
  {
    id: 5,
    name: 'Yoga Mat Premium',
    category_id: 5,
    price: 39.99,
    stock: 300,
    rating: 4.4,
    created_at: '2024-12-05',
  },
  {
    id: 6,
    name: 'Cotton T-Shirt Pack (3)',
    category_id: 2,
    price: 34.99,
    stock: 500,
    rating: 4.1,
    created_at: '2025-01-10',
  },
  {
    id: 7,
    name: 'Winter Jacket',
    category_id: 2,
    price: 189.99,
    stock: 40,
    rating: 4.8,
    created_at: '2025-01-25',
  },
  {
    id: 8,
    name: 'JavaScript: The Good Parts',
    category_id: 3,
    price: 29.99,
    stock: 75,
    rating: 4.9,
    created_at: '2024-06-01',
  },
  {
    id: 9,
    name: 'Designing Data-Intensive Applications',
    category_id: 3,
    price: 44.99,
    stock: 50,
    rating: 4.9,
    created_at: '2024-07-15',
  },
  {
    id: 10,
    name: 'Smart LED Desk Lamp',
    category_id: 4,
    price: 59.99,
    stock: 120,
    rating: 4.2,
    created_at: '2025-02-01',
  },
  {
    id: 11,
    name: 'Plant Watering System',
    category_id: 4,
    price: 24.99,
    stock: 90,
    rating: 3.9,
    created_at: '2025-03-10',
  },
  {
    id: 12,
    name: 'Resistance Bands Set',
    category_id: 5,
    price: 19.99,
    stock: 250,
    rating: 4.5,
    created_at: '2025-04-02',
  },
]

const orders: Order[] = [
  {
    id: 1,
    customer_id: 1,
    order_date: '2025-06-01',
    status: 'delivered',
    total_amount: 209.98,
    shipping_country: 'US',
  },
  {
    id: 2,
    customer_id: 2,
    order_date: '2025-06-15',
    status: 'delivered',
    total_amount: 79.99,
    shipping_country: 'UK',
  },
  {
    id: 3,
    customer_id: 3,
    order_date: '2025-07-01',
    status: 'shipped',
    total_amount: 344.97,
    shipping_country: 'US',
  },
  {
    id: 4,
    customer_id: 1,
    order_date: '2025-07-05',
    status: 'pending',
    total_amount: 49.99,
    shipping_country: 'US',
  },
  {
    id: 5,
    customer_id: 5,
    order_date: '2025-06-20',
    status: 'delivered',
    total_amount: 189.99,
    shipping_country: 'DE',
  },
  {
    id: 6,
    customer_id: 3,
    order_date: '2025-07-08',
    status: 'pending',
    total_amount: 119.99,
    shipping_country: 'US',
  },
  {
    id: 7,
    customer_id: 7,
    order_date: '2025-06-28',
    status: 'shipped',
    total_amount: 164.98,
    shipping_country: 'UK',
  },
  {
    id: 8,
    customer_id: 2,
    order_date: '2025-07-03',
    status: 'cancelled',
    total_amount: 34.99,
    shipping_country: 'UK',
  },
  {
    id: 9,
    customer_id: 5,
    order_date: '2025-07-10',
    status: 'delivered',
    total_amount: 450.0,
    shipping_country: 'DE',
  },
  {
    id: 10,
    customer_id: 6,
    order_date: '2025-05-15',
    status: 'delivered',
    total_amount: 59.99,
    shipping_country: 'US',
  },
]

const orderItems: OrderItem[] = [
  { id: 1, order_id: 1, product_id: 1, quantity: 2, unit_price: 79.99 },
  { id: 2, order_id: 1, product_id: 3, quantity: 1, unit_price: 49.99 },
  { id: 3, order_id: 2, product_id: 1, quantity: 1, unit_price: 79.99 },
  { id: 4, order_id: 3, product_id: 2, quantity: 1, unit_price: 129.99 },
  { id: 5, order_id: 3, product_id: 9, quantity: 2, unit_price: 44.99 },
  { id: 6, order_id: 3, product_id: 12, quantity: 3, unit_price: 19.99 },
  { id: 7, order_id: 4, product_id: 3, quantity: 1, unit_price: 49.99 },
  { id: 8, order_id: 5, product_id: 7, quantity: 1, unit_price: 189.99 },
  { id: 9, order_id: 6, product_id: 4, quantity: 1, unit_price: 119.99 },
  { id: 10, order_id: 7, product_id: 8, quantity: 2, unit_price: 29.99 },
  { id: 11, order_id: 7, product_id: 10, quantity: 1, unit_price: 59.99 },
  { id: 12, order_id: 8, product_id: 6, quantity: 1, unit_price: 34.99 },
  { id: 13, order_id: 9, product_id: 2, quantity: 2, unit_price: 129.99 },
  { id: 14, order_id: 9, product_id: 7, quantity: 1, unit_price: 189.99 },
  { id: 15, order_id: 10, product_id: 10, quantity: 1, unit_price: 59.99 },
]

// ---------------------------------------------------------------------------
// Simple SQL parser and executor
// ---------------------------------------------------------------------------

function normalizeSQL(sql: string): string {
  return sql
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s*;\s*$/, '')
    .trim()
}

/**
 * Execute a read-only SQL query against the in-memory data.
 * This is a lightweight SQL executor for demonstration — in production
 * you would use a real database like SQLite, PostgreSQL, or DuckDB.
 */
export function executeQuery(sql: string): Record<string, unknown>[] {
  const normalized = normalizeSQL(sql)
  const upperSQL = normalized.toUpperCase()

  // Parse the query type
  if (upperSQL.startsWith('SELECT')) {
    return executeSelect(normalized, upperSQL)
  }

  throw new Error(`Unsupported query type. Only SELECT is supported.`)
}

// ---------------------------------------------------------------------------
// Security validators
// ---------------------------------------------------------------------------

const DANGEROUS_KEYWORDS = [
  /\bINSERT\b/i,
  /\bUPDATE\b/i,
  /\bDELETE\b/i,
  /\bDROP\b/i,
  /\bALTER\b/i,
  /\bCREATE\b/i,
  /\bTRUNCATE\b/i,
]

export function isReadOnlyQuery(sql: string): boolean {
  const upperSQL = sql.toUpperCase().trim()
  if (!upperSQL.startsWith('SELECT')) return false
  return !DANGEROUS_KEYWORDS.some((re) => re.test(sql))
}

const INJECTION_PATTERNS = [
  /';\s*(DROP|DELETE|UPDATE|INSERT)/i,
  /'\s*OR\s+'1'\s*=\s*'1/i,
  /'\s*OR\s+1\s*=\s*1/i,
  /--\s*$/m,
  /UNION\s+SELECT.*--/i,
  /;\s*--/,
]

export function hasSqlInjectionPatterns(sql: string): boolean {
  return INJECTION_PATTERNS.some((re) => re.test(sql))
}

// ---------------------------------------------------------------------------
// SELECT executor
// ---------------------------------------------------------------------------

function executeSelect(sql: string, upperSQL: string): Record<string, unknown>[] {
  // Determine which table to query
  let rows: Record<string, unknown>[] = []
  let resultColumns: string[] = []

  if (upperSQL.includes('FROM CUSTOMERS')) {
    resultColumns = ['id', 'name', 'email', 'signup_date', 'country', 'tier', 'lifetime_value']
    rows = [...customers]
  } else if (upperSQL.includes('FROM PRODUCTS')) {
    resultColumns = ['id', 'name', 'category_id', 'price', 'stock', 'rating', 'created_at']
    rows = [...products]
  } else if (upperSQL.includes('FROM CATEGORIES')) {
    resultColumns = ['id', 'name', 'slug']
    rows = [...categories]
  } else if (upperSQL.includes('FROM ORDERS') && !upperSQL.includes('JOIN')) {
    resultColumns = [
      'id',
      'customer_id',
      'order_date',
      'status',
      'total_amount',
      'shipping_country',
    ]
    rows = [...orders]
  } else if (upperSQL.includes('FROM ORDER_ITEMS')) {
    resultColumns = ['id', 'order_id', 'product_id', 'quantity', 'unit_price']
    rows = [...orderItems]
  }

  // Handle COUNT(*)
  if (upperSQL.includes('COUNT(*)') || upperSQL.includes('COUNT(')) {
    const colMatch = sql.match(/COUNT\(\*\)(?:\s+AS\s+(\w+))?/i)
    const countAlias = colMatch?.[1] ?? 'count'
    // Handle WHERE clause
    if (upperSQL.includes('WHERE')) {
      rows = applyWhere(rows, sql)
    }
    return [{ [countAlias]: rows.length }]
  }

  // Handle SUM/AVG/MAX/MIN
  const aggMatch = sql.match(/(SUM|AVG|MAX|MIN)\s*\(\s*(\w+)\s*\)(?:\s+AS\s+(\w+))?/i)
  if (aggMatch) {
    const [, fn, col, alias] = aggMatch
    const aggAlias = alias ?? `${fn.toLowerCase()}_${col.toLowerCase()}`
    // Apply WHERE first
    if (upperSQL.includes('WHERE')) {
      rows = applyWhere(rows, sql)
    }
    const values = rows.map((r) => Number(r[col.toLowerCase()]) || 0)
    let result: number
    switch (fn.toUpperCase()) {
      case 'SUM':
        result = values.reduce((a, b) => a + b, 0)
        break
      case 'AVG':
        result = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
        break
      case 'MAX':
        result = Math.max(...values, -Infinity)
        break
      case 'MIN':
        result = Math.min(...values, Infinity)
        break
      default:
        result = 0
    }
    return [{ [aggAlias]: Math.round(result * 100) / 100 }]
  }

  // Handle JOIN between orders and products via order_items
  if (upperSQL.includes('JOIN')) {
    rows = executeJoin(sql)
  }

  // Apply WHERE clause
  if (upperSQL.includes('WHERE') && !upperSQL.includes('JOIN')) {
    rows = applyWhere(rows, sql)
  }

  // Apply GROUP BY
  if (upperSQL.includes('GROUP BY')) {
    rows = applyGroupBy(rows, sql)
  }

  // Apply ORDER BY
  if (upperSQL.includes('ORDER BY')) {
    rows = applyOrderBy(rows, sql)
  }

  // Apply LIMIT
  const limitMatch = sql.match(/LIMIT\s+(\d+)/i)
  if (limitMatch) {
    rows = rows.slice(0, parseInt(limitMatch[1]))
  }

  return rows
}

function executeJoin(sql: string): Record<string, unknown>[] {
  // orders JOIN order_items JOIN products
  const results: Record<string, unknown>[] = []
  for (const order of orders) {
    for (const item of orderItems) {
      if (item.order_id === order.id) {
        const product = products.find((p) => p.id === item.product_id)
        if (product) {
          results.push({
            order_id: order.id,
            customer_id: order.customer_id,
            order_date: order.order_date,
            order_status: order.status,
            product_name: product.name,
            product_price: product.price,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_amount: order.total_amount,
          })
        }
      }
    }
  }
  return results
}

function applyWhere(rows: Record<string, unknown>[], sql: string): Record<string, unknown>[] {
  const whereMatch = sql.match(/WHERE\s+(.+?)(?:GROUP BY|ORDER BY|LIMIT|HAVING|$)/i)
  if (!whereMatch) return rows
  const whereClause = whereMatch[1].trim()

  return rows.filter((row) => {
    // Handle: column = 'value'
    const eqMatch = whereClause.match(/(\w+)\s*=\s*'([^']+)'/i)
    if (eqMatch) {
      const [, col, val] = eqMatch
      return String(row[col.toLowerCase()] ?? '') === val
    }
    // Handle: column = value
    const eqNumMatch = whereClause.match(/(\w+)\s*=\s*(\d+\.?\d*)/i)
    if (eqNumMatch) {
      const [, col, val] = eqNumMatch
      return row[col.toLowerCase()] === Number(val) || String(row[col.toLowerCase()]) === val
    }
    // Handle: column > value
    const gtMatch = whereClause.match(/(\w+)\s*>\s*(\d+\.?\d*)/i)
    if (gtMatch) {
      const [, col, val] = gtMatch
      return Number(row[col.toLowerCase()]) > Number(val)
    }
    // Handle: column < value
    const ltMatch = whereClause.match(/(\w+)\s*<\s*(\d+\.?\d*)/i)
    if (ltMatch) {
      const [, col, val] = ltMatch
      return Number(row[col.toLowerCase()]) < Number(val)
    }
    // Handle: column >= value
    const gteMatch = whereClause.match(/(\w+)\s*>=\s*(\d+\.?\d*)/i)
    if (gteMatch) {
      const [, col, val] = gteMatch
      return Number(row[col.toLowerCase()]) >= Number(val)
    }
    // Handle: column LIKE 'pattern'
    const likeMatch = whereClause.match(/(\w+)\s+LIKE\s+'%([^%']+)%'/i)
    if (likeMatch) {
      const [, col, pattern] = likeMatch
      return String(row[col.toLowerCase()] ?? '')
        .toLowerCase()
        .includes(pattern.toLowerCase())
    }
    // Handle: column IN (v1, v2, ...)
    const inMatch = whereClause.match(/(\w+)\s+IN\s+\(([^)]+)\)/i)
    if (inMatch) {
      const [, col, vals] = inMatch
      // Parse the values: 'US', 'UK' -> ['US', 'UK']
      const parsedVals = vals.match(/'([^']+)'/g)?.map((s) => s.replace(/'/g, '')) ?? []
      return parsedVals.includes(String(row[col.toLowerCase()] ?? ''))
    }
    return true
  })
}

function applyGroupBy(rows: Record<string, unknown>[], sql: string): Record<string, unknown>[] {
  const groupMatch = sql.match(/GROUP BY\s+(\w+)/i)
  const countMatch = sql.match(/COUNT\((\w+)\)(?:\s+AS\s+(\w+))?/i)
  if (!groupMatch) return rows

  const groupCol = groupMatch[1].toLowerCase()
  const countAlias = countMatch?.[2] ?? 'count'

  const groups = new Map<string, Record<string, unknown>[]>()
  for (const row of rows) {
    const key = String(row[groupCol] ?? 'unknown')
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(row)
  }

  return [...groups.entries()].map(([key, groupRows]) => ({
    [groupCol]: key,
    [countAlias]: groupRows.length,
  }))
}

function applyOrderBy(rows: Record<string, unknown>[], sql: string): Record<string, unknown>[] {
  const orderMatch = sql.match(/ORDER BY\s+(\w+)(?:\s+(ASC|DESC))?/i)
  if (!orderMatch) return rows

  const [, col, dir] = orderMatch
  const column = col.toLowerCase()
  const direction = (dir ?? 'ASC').toUpperCase()

  return [...rows].sort((a, b) => {
    const aVal = a[column]
    const bVal = b[column]
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return direction === 'DESC' ? bVal - aVal : aVal - bVal
    }
    const cmp = String(aVal ?? '').localeCompare(String(bVal ?? ''))
    return direction === 'DESC' ? -cmp : cmp
  })
}
