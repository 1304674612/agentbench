import Link from 'next/link'
import { db } from '@/shared/lib/db'
import { Plus, TestTube, Layers, Clock } from 'lucide-react'
import { formatRelativeTime } from '@/shared/lib/utils'

export default async function TestsPage() {
  const suites = await db.testSuite.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { cases: true } },
      project: { select: { id: true, name: true } },
      cases: {
        take: 5,
        orderBy: { updatedAt: 'desc' },
        select: { id: true, name: true, status: true, updatedAt: true },
      },
    },
  })

  const totalSuites = suites.length
  const totalCases = suites.reduce((sum: number, s: { _count: { cases: number } }) => sum + s._count.cases, 0)
  const activeCases = suites.reduce(
    (sum: number, s: { cases: Array<{ status: string }> }) => sum + s.cases.filter((c: { status: string }) => c.status === 'ACTIVE').length,
    0,
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tests</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Test suites and test cases for evaluating your agents.
          </p>
        </div>
        <Link
          href="/tests/new"
          className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Suite
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Layers className="h-4 w-4" />
            Test Suites
          </div>
          <div className="text-2xl font-bold">{totalSuites}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <TestTube className="h-4 w-4" />
            Test Cases
          </div>
          <div className="text-2xl font-bold">{totalCases}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Clock className="h-4 w-4" />
            Active
          </div>
          <div className="text-2xl font-bold">{activeCases}</div>
        </div>
      </div>

      {/* Suites List */}
      {suites.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <div className="flex justify-center mb-3">
            <TestTube className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="text-sm text-muted-foreground mb-1">No test suites yet</p>
          <p className="text-xs text-muted-foreground/70">
            Create your first test suite to start evaluating agent behavior.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {suites.map((suite: { id: string; name: string; description?: string | null; _count: { cases: number }; cases: Array<{ id: string; name: string; status: string; updatedAt: Date }>; project: { name: string } }) => (
            <div
              key={suite.id}
              className="rounded-xl border border-border bg-card overflow-hidden"
            >
              {/* Suite Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-sm">{suite.name}</h3>
                    <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                      {suite.project.name}
                    </span>
                  </div>
                  {suite.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {suite.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {suite._count.cases} case{suite._count.cases !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Suite Cases */}
              {suite.cases.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                  No test cases in this suite yet.
                </div>
              ) : (
                <table className="w-full">
                  <tbody className="divide-y divide-border">
                    {suite.cases.map((testCase) => (
                      <tr
                        key={testCase.id}
                        className="hover:bg-muted/20 transition-colors"
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            <TestTube className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm font-medium">{testCase.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                              testCase.status === 'ACTIVE'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : testCase.status === 'DRAFT'
                                  ? 'bg-muted text-muted-foreground border-border'
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}
                          >
                            {testCase.status.toLowerCase()}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground text-right">
                          {testCase.updatedAt ? formatRelativeTime(testCase.updatedAt) : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Show "View all" if more than 5 */}
              {suite._count.cases > 5 && (
                <div className="px-4 py-2 border-t border-border text-center">
                  <Link
                    href={`/tests/${suite.id}`}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    View all {suite._count.cases} cases →
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
