import { getCompanies, getEvents, getCategories } from '@/lib/data'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import AddCompanyDialog from '@/components/AddCompanyDialog'
import AddCategoryDialog from '@/components/AddCategoryDialog'
import DeleteCategoryButton from '@/components/DeleteCategoryButton'

export const dynamic = 'force-dynamic'

const STATUS_LABELS: Record<string, string> = {
  pending: '未対応',
  applied: '応募済',
  in_progress: '選考中',
  passed: '通過',
  rejected: '不合格',
  done: '完了',
}

const STATUS_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  applied: 'default',
  in_progress: 'default',
  passed: 'default',
  rejected: 'destructive',
  done: 'secondary',
}

export default function CompaniesPage() {
  const companies = getCompanies()
  const events = getEvents()
  const categories = getCategories()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const activeCompanies = companies.filter(c => !c.suspended)
  const suspendedCompanies = companies.filter(c => c.suspended)

  const grouped = categories.map(cat => ({
    cat,
    companies: activeCompanies.filter(c => c.category === cat.id),
  }))

  const renderCard = (company: ReturnType<typeof getCompanies>[number]) => {
    const companyEvents = events.filter(e => e.companyId === company.id)
    const pendingDeadlines = companyEvents.filter(
      e => e.type === 'deadline' && e.status === 'pending' && new Date(e.start) >= today
    )
    const upcomingInternships = companyEvents.filter(
      e => e.type === 'internship' && new Date(e.end) >= today
    )
    const statusCounts = companyEvents.reduce<Record<string, number>>((acc, e) => {
      acc[e.status] = (acc[e.status] || 0) + 1
      return acc
    }, {})
    const nextDeadline = companyEvents
      .filter(e => e.type === 'deadline' && new Date(e.start) >= today)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())[0]

    return (
      <Link key={company.id} href={`/companies/${company.id}`}>
        <Card className="hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer h-full border-l-4" style={{ borderLeftColor: company.color }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base leading-tight">{company.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3 text-sm">
              <div className="text-center">
                <div className="font-semibold text-orange-600">{pendingDeadlines.length}</div>
                <div className="text-xs text-muted-foreground">締切</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-blue-600">{upcomingInternships.length}</div>
                <div className="text-xs text-muted-foreground">インターン</div>
              </div>
              <div className="text-center">
                <div className="font-semibold">{companyEvents.length}</div>
                <div className="text-xs text-muted-foreground">合計</div>
              </div>
            </div>

            {nextDeadline && (
              <div className="text-xs bg-orange-50 border border-orange-200 rounded p-2">
                <span className="text-orange-700 font-medium">次の締切: </span>
                <span className="text-orange-800">
                  {nextDeadline.start.includes('T')
                    ? `${nextDeadline.start.split('T')[0]} ${nextDeadline.start.split('T')[1].substring(0, 5)}`
                    : nextDeadline.start.split('T')[0]} {nextDeadline.title}
                </span>
              </div>
            )}

            <div className="flex flex-wrap gap-1">
              {Object.entries(statusCounts).map(([status, count]) => (
                <Badge key={status} variant={STATUS_BADGE_VARIANT[status] || 'secondary'} className="text-xs">
                  {STATUS_LABELS[status]} {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </Link>
    )
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold flex-1">企業一覧</h1>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-sm text-muted-foreground">
            {activeCompanies.length}社
            {suspendedCompanies.length > 0 && (
              <span className="text-muted-foreground/60"> (+保留 {suspendedCompanies.length})</span>
            )}
          </span>
          <AddCategoryDialog categories={categories} />
          <AddCompanyDialog categories={categories} companies={companies} />
        </div>
      </div>

      <div className="space-y-8">
        {grouped.map(({ cat, companies }) => (
          <section key={cat.id}>
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {cat.label}
              </h2>
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: cat.color + '20', color: cat.color }}
              >
                {companies.length}社
              </span>
              <DeleteCategoryButton id={cat.id} label={cat.label} disabled={companies.length > 0} />
            </div>
            {companies.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {companies.map(renderCard)}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">企業なし</p>
            )}
          </section>
        ))}
      </div>

      {suspendedCompanies.length > 0 && (
        <details className="mt-12 group">
          <summary className="cursor-pointer flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground select-none">
            <span className="inline-block transition-transform group-open:rotate-90">▶</span>
            <span className="font-medium">保留中の企業</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{suspendedCompanies.length}社</span>
            <span className="text-xs text-muted-foreground/70">
              サマー見送り・冬/本選考で再検討
            </span>
          </summary>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 opacity-70">
            {suspendedCompanies.map(renderCard)}
          </div>
        </details>
      )}
    </div>
  )
}
