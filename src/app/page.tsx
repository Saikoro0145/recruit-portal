import Link from 'next/link'
import { getCompanies, getEvents, getCategories } from '@/lib/data'

export const dynamic = 'force-dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  COMPANY_STATUS_META,
  CompanyStatus,
  deriveCompanyStatus,
} from '@/lib/utils'
import { Company, InternEvent } from '@/types'

const STATUS_ORDER: CompanyStatus[] = [
  'in_progress',
  'not_applied',
  'passed',
  'rejected',
  'done',
]

const TYPE_LABELS: Record<InternEvent['type'], string> = {
  deadline: '締切',
  internship: 'インターン',
  selection: '選考',
  event: 'イベント',
}

const ALERT_WINDOW_DAYS = 7
const TIMELINE_WINDOW_DAYS = 7

function daysUntil(dateStr: string, today: Date) {
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function formatMMDD(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function formatEventWhen(s: string) {
  const [datePart, timePart] = s.split('T')
  if (!timePart) return datePart
  return `${datePart} ${timePart.substring(0, 5)}`
}

const WEEKDAY_JA = ['日', '月', '火', '水', '木', '金', '土']

export default function DashboardPage() {
  const companies = getCompanies()
  const events = getEvents()
  const categories = getCategories()
  const categoryLabels = Object.fromEntries(categories.map(c => [c.id, c.label]))
  const companyMap = new Map(companies.map(c => [c.id, c]))

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const eventsByCompany = new Map<string, InternEvent[]>()
  for (const e of events) {
    const list = eventsByCompany.get(e.companyId) ?? []
    list.push(e)
    eventsByCompany.set(e.companyId, list)
  }

  const enriched = companies.map(company => {
    const companyEvents = eventsByCompany.get(company.id) ?? []
    const status = deriveCompanyStatus(companyEvents)
    const nextDeadline = companyEvents
      .filter(e => e.type === 'deadline' && new Date(e.start) >= today)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())[0]
    const lastEvent = [...companyEvents]
      .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())[0]
    return { company, status, companyEvents, nextDeadline, lastEvent }
  })

  const grouped: Record<CompanyStatus, typeof enriched> = {
    in_progress: [],
    passed: [],
    not_applied: [],
    rejected: [],
    done: [],
  }
  for (const row of enriched) grouped[row.status].push(row)

  // === アラート対象 ===
  const alerts = events
    .filter(e => {
      if (e.status !== 'pending') return false
      if (e.type === 'event') return false
      const d = daysUntil(e.start, today)
      return d >= 0 && d <= ALERT_WINDOW_DAYS
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

  // === タイムライン (今日 +7日) ===
  // タイムゾーン依存を避けるため YYYY-MM-DD 文字列で比較する
  const toLocalYMD = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  const timelineDays: { date: Date; key: string; events: InternEvent[] }[] = []
  for (let i = 0; i < TIMELINE_WINDOW_DAYS; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    timelineDays.push({ date: d, key: toLocalYMD(d), events: [] })
  }
  for (const e of events) {
    const startKey = e.start.split('T')[0]
    const endKey = (e.end || e.start).split('T')[0]
    for (const td of timelineDays) {
      if (td.key >= startKey && td.key <= endKey) {
        td.events.push(e)
      }
    }
  }

  // === 業界別バランス: 全企業に占める各業界の比率 ===
  const categoryStats = categories
    .map(cat => ({
      cat,
      total: companies.filter(c => c.category === cat.id).length,
    }))
    .filter(cs => cs.total > 0)
    .sort((a, b) => b.total - a.total)

  const total = companies.length

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-baseline gap-3">
        <h1 className="text-2xl font-bold">選考ステータスダッシュボード</h1>
        <span className="text-sm text-muted-foreground">{total}社</span>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        {STATUS_ORDER.map(status => {
          const meta = COMPANY_STATUS_META[status]
          const count = grouped[status].length
          return (
            <a
              key={status}
              href={`#section-${status}`}
              className="rounded-lg border bg-card px-4 py-3 hover:shadow-md transition-all"
              style={{ borderLeftWidth: 4, borderLeftColor: meta.color }}
            >
              <div className="text-xs text-muted-foreground">{meta.label}</div>
              <div className="text-2xl font-bold" style={{ color: meta.color }}>
                {count}
                <span className="text-sm font-normal text-muted-foreground ml-1">社</span>
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                {meta.description}
              </div>
            </a>
          )
        })}
      </div>

      {/* アクションアラート */}
      {alerts.length > 0 && (
        <section className="mb-8">
          <div className="rounded-lg border-2 border-red-300 bg-red-50/60 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">⚠</span>
              <h2 className="text-lg font-bold text-red-800">
                アクション必要 ({alerts.length}件)
              </h2>
              <span className="text-xs text-red-700">
                {ALERT_WINDOW_DAYS}日以内に締切・未対応のイベント
              </span>
            </div>
            <ul className="space-y-2">
              {alerts.map(e => {
                const days = daysUntil(e.start, today)
                const company = companyMap.get(e.companyId)
                const urgency =
                  days <= 1 ? 'text-red-700 bg-red-100 border-red-400' :
                  days <= 3 ? 'text-orange-700 bg-orange-100 border-orange-300' :
                  'text-amber-700 bg-amber-50 border-amber-300'
                return (
                  <li key={e.id}>
                    <Link
                      href={company ? `/companies/${company.id}` : '#'}
                      className="flex items-center gap-3 rounded-md bg-white border px-3 py-2 hover:shadow transition-all"
                    >
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded border ${urgency} min-w-[68px] text-center`}
                      >
                        {days === 0 ? '今日' : days === 1 ? '明日' : `あと${days}日`}
                      </span>
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: company?.color ?? '#999' }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {e.title}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {company?.name ?? '不明'} ・ {TYPE_LABELS[e.type]} ・ {formatEventWhen(e.start)}
                        </div>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>
      )}

      {/* 直近1週間のタイムライン */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-lg font-semibold">直近1週間</h2>
          <span className="text-xs text-muted-foreground">
            今日〜{formatMMDD(timelineDays[timelineDays.length - 1].date)}
          </span>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {timelineDays.map(td => {
            const isToday = td.date.getTime() === today.getTime()
            const isWeekend = td.date.getDay() === 0 || td.date.getDay() === 6
            return (
              <div
                key={td.key}
                className={`rounded-md border bg-card p-2 min-h-[110px] ${
                  isToday ? 'ring-2 ring-primary border-primary' : ''
                }`}
              >
                <div className="text-center mb-1.5">
                  <div className={`text-[10px] ${
                    td.date.getDay() === 0 ? 'text-red-500' :
                    td.date.getDay() === 6 ? 'text-blue-500' :
                    'text-muted-foreground'
                  }`}>
                    {WEEKDAY_JA[td.date.getDay()]}
                  </div>
                  <div className={`text-sm font-bold ${isWeekend ? 'text-muted-foreground' : ''}`}>
                    {formatMMDD(td.date)}
                  </div>
                </div>
                <div className="space-y-1">
                  {td.events.length === 0 ? (
                    <div className="text-[10px] text-muted-foreground italic text-center mt-2">
                      －
                    </div>
                  ) : (
                    td.events.slice(0, 4).map(e => {
                      const company = companyMap.get(e.companyId)
                      return (
                        <Link
                          key={e.id}
                          href={company ? `/companies/${company.id}` : '#'}
                          className="block text-[10px] leading-tight rounded px-1.5 py-1 truncate hover:opacity-80 transition-opacity"
                          style={{
                            backgroundColor: (company?.color ?? '#888') + '20',
                            borderLeft: `3px solid ${company?.color ?? '#888'}`,
                            color: '#333',
                          }}
                          title={`${company?.name ?? ''} - ${e.title}`}
                        >
                          <div className="font-medium truncate">{e.title}</div>
                          <div className="text-[9px] text-muted-foreground truncate">
                            {company?.name ?? ''}
                          </div>
                        </Link>
                      )
                    })
                  )}
                  {td.events.length > 4 && (
                    <div className="text-[9px] text-muted-foreground text-center">
                      +{td.events.length - 4}件
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* 業界別バランス */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-lg font-semibold">業界別バランス</h2>
          <span className="text-xs text-muted-foreground">
            登録済 {total}社 の業界比率
          </span>
        </div>
        <div className="rounded-md border bg-card p-4">
          <div className="flex h-4 rounded overflow-hidden bg-muted mb-3">
            {categoryStats.map(({ cat, total: catTotal }) => {
              const pct = (catTotal / total) * 100
              return (
                <div
                  key={cat.id}
                  style={{ width: `${pct}%`, backgroundColor: cat.color }}
                  title={`${cat.label} ${catTotal}社 (${pct.toFixed(0)}%)`}
                />
              )
            })}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
            {categoryStats.map(({ cat, total: catTotal }) => {
              const pct = (catTotal / total) * 100
              return (
                <div key={cat.id} className="inline-flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="font-medium">{cat.label}</span>
                  <span className="text-muted-foreground">
                    {catTotal}社 ({pct.toFixed(0)}%)
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* セクション */}
      <div className="space-y-10">
        {STATUS_ORDER.map(status => {
          const meta = COMPANY_STATUS_META[status]
          const rows = grouped[status]
          return (
            <section key={status} id={`section-${status}`} className="scroll-mt-20">
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: meta.color }}
                />
                <h2 className="text-lg font-semibold">{meta.label}</h2>
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: meta.color + '20', color: meta.color }}
                >
                  {rows.length}社
                </span>
                <span className="text-xs text-muted-foreground">{meta.description}</span>
              </div>

              {rows.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">該当企業なし</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {rows.map(({ company, companyEvents, nextDeadline, lastEvent }) => (
                    <CompanyMiniCard
                      key={company.id}
                      company={company}
                      events={companyEvents}
                      nextDeadline={nextDeadline}
                      lastEvent={lastEvent}
                      categoryLabel={categoryLabels[company.category] ?? company.category}
                      today={today}
                    />
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}

function CompanyMiniCard({
  company,
  events,
  nextDeadline,
  lastEvent,
  categoryLabel,
  today,
}: {
  company: Company
  events: InternEvent[]
  nextDeadline?: InternEvent
  lastEvent?: InternEvent
  categoryLabel: string
  today: Date
}) {
  return (
    <Link href={`/companies/${company.id}`}>
      <Card
        className="hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer h-full border-l-4"
        style={{ borderLeftColor: company.color }}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-sm leading-tight flex items-start justify-between gap-2">
            <span className="truncate">{company.name}</span>
          </CardTitle>
          <div className="flex items-center gap-1 flex-wrap">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {categoryLabel}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              イベント{events.length}件
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {nextDeadline ? (
            <div className="text-xs bg-orange-50 border border-orange-200 rounded px-2 py-1">
              <div className="text-orange-700 font-medium">
                次の締切: あと{daysUntil(nextDeadline.start, today)}日
              </div>
              <div className="text-orange-800 truncate">{nextDeadline.title}</div>
            </div>
          ) : lastEvent ? (
            <div className="text-xs text-muted-foreground truncate">
              最終: {lastEvent.start.split('T')[0]} {lastEvent.title}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground italic">イベント未登録</div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
