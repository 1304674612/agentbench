import type { Command } from 'commander'
import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'
import chalk from 'chalk'

// ── Types ───────────────────────────────────────────────────────────────────────

interface CsvRow {
  [key: string]: string
}

// ── CSV Helpers ─────────────────────────────────────────────────────────────────

/**
 * Parse a CSV string into an array of row objects.
 * Handles quoted values with commas inside them.
 */
function parseCsv(content: string): { headers: string[]; rows: CsvRow[] } {
  const lines = content.trim().split('\n')
  if (lines.length === 0) return { headers: [], rows: [] }

  const headers = parseCsvLine(lines[0])
  const rows: CsvRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i])
    if (values.length === 0) continue
    const row: CsvRow = {}
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? ''
    }
    rows.push(row)
  }

  return { headers, rows }
}

/**
 * Parse a single CSV line, handling quoted values.
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

// ── Dataset Discovery ───────────────────────────────────────────────────────────

/**
 * Discover all CSV files in a dataset directory.
 */
function discoverDatasets(dir: string): string[] {
  if (!nodeFs.existsSync(dir)) return []
  const entries = nodeFs.readdirSync(dir, { withFileTypes: true })
  return entries
    .filter((e) => e.isFile() && e.name.endsWith('.csv'))
    .map((e) => nodePath.join(dir, e.name))
}

/**
 * Resolve a dataset file path from a user-provided name.
 * Tries multiple naming conventions.
 */
function resolveDatasetPath(datasetDir: string, name: string): string | null {
  // Direct match
  const direct = nodePath.join(datasetDir, name.endsWith('.csv') ? name : `${name}.csv`)
  if (nodeFs.existsSync(direct)) return direct

  // Try with .queries.csv suffix
  const alt = name.endsWith('.csv')
    ? nodePath.join(datasetDir, name)
    : nodePath.join(datasetDir, `${name}.queries.csv`)
  if (nodeFs.existsSync(alt)) return alt

  return null
}

// ── Main Command ────────────────────────────────────────────────────────────────

export function registerDatasetCommand(program: Command): void {
  const datasetCmd = program
    .command('dataset')
    .description('Manage and inspect CSV datasets for parametrized tests')

  // ── dataset list ──────────────────────────────────────────────────────────
  datasetCmd
    .command('list')
    .description('List all datasets in the project')
    .option('-d, --dir <path>', 'Dataset directory path', 'dataset')
    .action(async (options) => {
      const cwd = process.cwd()
      const datasetDir = nodePath.join(cwd, options.dir)

      if (!nodeFs.existsSync(datasetDir)) {
        console.log(chalk.yellow(`  No dataset directory found at ${options.dir}/`))
        console.log(chalk.gray('  Create one with `mkdir dataset` or run `agentbench init`.'))
        return
      }

      const datasets = discoverDatasets(datasetDir)

      if (datasets.length === 0) {
        console.log(chalk.yellow(`  No CSV datasets found in ${options.dir}/`))
        console.log(chalk.gray('  Add .csv files to the dataset/ directory.'))
        return
      }

      console.log(chalk.hex('#7C3AED')('⚡ Datasets'))
      console.log('')

      for (const filePath of datasets) {
        const name = nodePath.basename(filePath)
        const content = nodeFs.readFileSync(filePath, 'utf-8')
        const { headers, rows } = parseCsv(content)
        console.log(
          `  ${chalk.bold(name)}  ${chalk.gray(`(${rows.length} rows, ${headers.length} columns)`)}`
        )
        console.log(chalk.gray(`    Columns: ${headers.join(', ')}`))
      }

      console.log('')
    })

  // ── dataset view ──────────────────────────────────────────────────────────
  datasetCmd
    .command('view <name>')
    .description('View the contents of a dataset')
    .option('-d, --dir <path>', 'Dataset directory path', 'dataset')
    .option('-n, --limit <number>', 'Maximum number of rows to show', '20')
    .option('--json', 'Output as JSON')
    .action(async (name, options) => {
      const cwd = process.cwd()
      const datasetDir = nodePath.join(cwd, options.dir)

      const filePath = resolveDatasetPath(datasetDir, name)

      if (!filePath) {
        console.log(chalk.red(`  Dataset "${name}" not found in ${options.dir}/`))
        console.log(chalk.gray('  Run `agentbench dataset list` to see available datasets.'))
        return
      }

      const content = nodeFs.readFileSync(filePath, 'utf-8')
      const { headers, rows } = parseCsv(content)
      const limit = parseInt(options.limit, 10)
      const displayRows = rows.slice(0, limit)

      if (options.json) {
        console.log(
          JSON.stringify(
            {
              name: nodePath.basename(filePath),
              columns: headers,
              rowCount: rows.length,
              rows: displayRows,
            },
            null,
            2
          )
        )
        return
      }

      console.log(
        chalk.hex('#7C3AED')(
          `⚡ ${nodePath.basename(filePath)}  ${chalk.gray(`(${rows.length} rows, ${headers.length} cols)`)}`
        )
      )
      console.log('')

      if (displayRows.length === 0) {
        console.log(chalk.gray('  (empty dataset)'))
        return
      }

      // Calculate column widths
      const colWidths = headers.map((h) => {
        let max = h.length
        for (const row of displayRows) {
          const val = row[h] ?? ''
          max = Math.max(max, val.length)
        }
        return Math.min(max, 60) // cap at 60 chars
      })

      // Header row
      const headerLine = headers
        .map((h, i) => chalk.bold(h.padEnd(colWidths[i])))
        .join(chalk.gray(' │ '))
      console.log(`  ${headerLine}`)
      console.log(chalk.gray(`  ${headers.map((_, i) => '─'.repeat(colWidths[i])).join('─┼─')}`))

      // Data rows
      for (const row of displayRows) {
        const dataLine = headers
          .map((h, i) => {
            const val = row[h] ?? ''
            const display = val.length > 60 ? val.slice(0, 57) + '...' : val
            return display.padEnd(colWidths[i])
          })
          .join(chalk.gray(' │ '))
        console.log(`  ${dataLine}`)
      }

      if (rows.length > limit) {
        console.log(
          chalk.gray(`\n  Showing ${limit} of ${rows.length} rows. Use --limit for more.`)
        )
      }

      console.log('')
    })

  // ── dataset validate ──────────────────────────────────────────────────────
  datasetCmd
    .command('validate <name>')
    .description('Validate a dataset for required columns and data integrity')
    .option('-d, --dir <path>', 'Dataset directory path', 'dataset')
    .option('--json', 'Output as JSON')
    .action(async (name, options) => {
      const cwd = process.cwd()
      const datasetDir = nodePath.join(cwd, options.dir)
      const filePath = resolveDatasetPath(datasetDir, name)

      if (!filePath) {
        console.log(chalk.red(`  Dataset "${name}" not found in ${options.dir}/`))
        return
      }

      const content = nodeFs.readFileSync(filePath, 'utf-8')
      const { headers, rows } = parseCsv(content)

      const issues: string[] = []
      const warnings: string[] = []

      // Check required columns
      if (!headers.includes('query')) {
        issues.push('Missing required column: "query"')
      }

      // Check for empty rows
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const queryVal = row['query'] ?? ''
        if (!queryVal.trim()) {
          issues.push(`Row ${i + 2}: empty "query" value`)
        }
      }

      // Check for duplicate queries
      const seenQueries = new Map<string, number>()
      for (let i = 0; i < rows.length; i++) {
        const query = (rows[i]['query'] ?? '').toLowerCase().trim()
        if (query && seenQueries.has(query)) {
          warnings.push(
            `Row ${i + 2}: duplicate query (also at row ${seenQueries.get(query)! + 2})`
          )
        }
        if (query) seenQueries.set(query, i)
      }

      if (options.json) {
        console.log(
          JSON.stringify(
            {
              name: nodePath.basename(filePath),
              rows: rows.length,
              columns: headers,
              valid: issues.length === 0,
              issues,
              warnings,
            },
            null,
            2
          )
        )
        return
      }

      console.log(
        chalk.hex('#7C3AED')(
          `⚡ Validating ${nodePath.basename(filePath)}  ${chalk.gray(`(${rows.length} rows)`)}`
        )
      )
      console.log('')

      if (issues.length === 0 && warnings.length === 0) {
        console.log(chalk.green(`  ✓ Dataset is valid`))
        console.log(chalk.gray(`  ${rows.length} rows, ${headers.length} columns`))
      } else {
        for (const issue of issues) {
          console.log(chalk.red(`  ✗ ${issue}`))
        }
        for (const warning of warnings) {
          console.log(chalk.yellow(`  ⚠ ${warning}`))
        }
        console.log('')
        if (issues.length > 0) {
          console.log(chalk.red(`  ${issues.length} issue(s) found.`))
        }
        if (warnings.length > 0) {
          console.log(chalk.yellow(`  ${warnings.length} warning(s).`))
        }
      }

      console.log('')
    })
}
