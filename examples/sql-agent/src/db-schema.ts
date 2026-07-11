/**
 * Database Schema — Defines the schema for the SQL agent's knowledge domain.
 *
 * Models an e-commerce database with users, products, orders, order_items,
 * categories, and reviews. The schema is introspectable and provides
 * a human-readable description for the LLM.
 */

export interface ColumnDef {
  name: string
  type: string
  nullable: boolean
  primaryKey: boolean
  foreignKey?: { table: string; column: string }
  description: string
}

export interface TableDef {
  name: string
  columns: ColumnDef[]
  description: string
}

export const SCHEMA: TableDef[] = [
  {
    name: 'users',
    description: 'Registered users of the e-commerce platform',
    columns: [
      {
        name: 'id',
        type: 'INTEGER',
        nullable: false,
        primaryKey: true,
        description: 'Unique user identifier',
      },
      {
        name: 'email',
        type: 'TEXT',
        nullable: false,
        primaryKey: false,
        description: 'User email address (unique)',
      },
      {
        name: 'name',
        type: 'TEXT',
        nullable: false,
        primaryKey: false,
        description: 'Full name of the user',
      },
      {
        name: 'created_at',
        type: 'DATETIME',
        nullable: false,
        primaryKey: false,
        description: 'Account creation timestamp',
      },
      {
        name: 'status',
        type: 'TEXT',
        nullable: false,
        primaryKey: false,
        description: 'Account status: active, inactive, banned',
      },
    ],
  },
  {
    name: 'products',
    description: 'Products available for purchase',
    columns: [
      {
        name: 'id',
        type: 'INTEGER',
        nullable: false,
        primaryKey: true,
        description: 'Unique product identifier',
      },
      {
        name: 'name',
        type: 'TEXT',
        nullable: false,
        primaryKey: false,
        description: 'Product display name',
      },
      {
        name: 'price',
        type: 'REAL',
        nullable: false,
        primaryKey: false,
        description: 'Current price in USD',
      },
      {
        name: 'category_id',
        type: 'INTEGER',
        nullable: false,
        primaryKey: false,
        foreignKey: { table: 'categories', column: 'id' },
        description: 'Category the product belongs to',
      },
      {
        name: 'stock',
        type: 'INTEGER',
        nullable: false,
        primaryKey: false,
        description: 'Current inventory count',
      },
      {
        name: 'created_at',
        type: 'DATETIME',
        nullable: false,
        primaryKey: false,
        description: 'Product listing creation date',
      },
    ],
  },
  {
    name: 'categories',
    description: 'Product categories',
    columns: [
      {
        name: 'id',
        type: 'INTEGER',
        nullable: false,
        primaryKey: true,
        description: 'Unique category identifier',
      },
      {
        name: 'name',
        type: 'TEXT',
        nullable: false,
        primaryKey: false,
        description: 'Category name (e.g., Electronics, Books)',
      },
      {
        name: 'parent_id',
        type: 'INTEGER',
        nullable: true,
        primaryKey: false,
        foreignKey: { table: 'categories', column: 'id' },
        description: 'Parent category for subcategories',
      },
    ],
  },
  {
    name: 'orders',
    description: 'Customer orders',
    columns: [
      {
        name: 'id',
        type: 'INTEGER',
        nullable: false,
        primaryKey: true,
        description: 'Unique order identifier',
      },
      {
        name: 'user_id',
        type: 'INTEGER',
        nullable: false,
        primaryKey: false,
        foreignKey: { table: 'users', column: 'id' },
        description: 'User who placed the order',
      },
      {
        name: 'total_amount',
        type: 'REAL',
        nullable: false,
        primaryKey: false,
        description: 'Total order amount in USD',
      },
      {
        name: 'status',
        type: 'TEXT',
        nullable: false,
        primaryKey: false,
        description: 'Order status: pending, shipped, delivered, cancelled',
      },
      {
        name: 'created_at',
        type: 'DATETIME',
        nullable: false,
        primaryKey: false,
        description: 'Order placement timestamp',
      },
    ],
  },
  {
    name: 'order_items',
    description: 'Individual items within an order',
    columns: [
      {
        name: 'id',
        type: 'INTEGER',
        nullable: false,
        primaryKey: true,
        description: 'Unique line item identifier',
      },
      {
        name: 'order_id',
        type: 'INTEGER',
        nullable: false,
        primaryKey: false,
        foreignKey: { table: 'orders', column: 'id' },
        description: 'Parent order',
      },
      {
        name: 'product_id',
        type: 'INTEGER',
        nullable: false,
        primaryKey: false,
        foreignKey: { table: 'products', column: 'id' },
        description: 'Product ordered',
      },
      {
        name: 'quantity',
        type: 'INTEGER',
        nullable: false,
        primaryKey: false,
        description: 'Number of units ordered',
      },
      {
        name: 'unit_price',
        type: 'REAL',
        nullable: false,
        primaryKey: false,
        description: 'Price per unit at time of order',
      },
    ],
  },
  {
    name: 'reviews',
    description: 'Product reviews by users',
    columns: [
      {
        name: 'id',
        type: 'INTEGER',
        nullable: false,
        primaryKey: true,
        description: 'Unique review identifier',
      },
      {
        name: 'product_id',
        type: 'INTEGER',
        nullable: false,
        primaryKey: false,
        foreignKey: { table: 'products', column: 'id' },
        description: 'Product being reviewed',
      },
      {
        name: 'user_id',
        type: 'INTEGER',
        nullable: false,
        primaryKey: false,
        foreignKey: { table: 'users', column: 'id' },
        description: 'User who wrote the review',
      },
      {
        name: 'rating',
        type: 'INTEGER',
        nullable: false,
        primaryKey: false,
        description: 'Rating from 1 to 5',
      },
      {
        name: 'comment',
        type: 'TEXT',
        nullable: true,
        primaryKey: false,
        description: 'Review text',
      },
      {
        name: 'created_at',
        type: 'DATETIME',
        nullable: false,
        primaryKey: false,
        description: 'Review submission timestamp',
      },
    ],
  },
]

/**
 * Generate a human-readable schema description for the LLM prompt.
 */
export function getSchemaDescription(): string {
  let desc = ''
  for (const table of SCHEMA) {
    desc += `\n## Table: ${table.name}\n`
    desc += `${table.description}\n\n`
    desc += '| Column | Type | Nullable | Key | Description |\n'
    desc += '|--------|------|----------|-----|-------------|\n'
    for (const col of table.columns) {
      const pk = col.primaryKey ? 'PK' : ''
      const fk = col.foreignKey ? `FK->${col.foreignKey.table}(${col.foreignKey.column})` : ''
      const key = [pk, fk].filter(Boolean).join(', ') || '-'
      desc += `| ${col.name} | ${col.type} | ${col.nullable ? 'YES' : 'NO'} | ${key} | ${col.description} |\n`
    }
  }

  // Relationships
  desc += '\n## Relationships\n'
  desc += '- users.id -> orders.user_id (One user has many orders)\n'
  desc += '- orders.id -> order_items.order_id (One order has many order items)\n'
  desc += '- products.id -> order_items.product_id (One product appears in many order items)\n'
  desc += '- products.id -> reviews.product_id (One product has many reviews)\n'
  desc += '- users.id -> reviews.user_id (One user writes many reviews)\n'
  desc += '- categories.id -> products.category_id (One category has many products)\n'
  desc += '- categories.parent_id -> categories.id (Self-referencing for subcategories)\n'

  return desc
}

export function getTable(tableName: string): TableDef | undefined {
  return SCHEMA.find((t) => t.name === tableName)
}

export function getColumns(tableName: string): ColumnDef[] {
  return getTable(tableName)?.columns ?? []
}
