import Link from 'next/link'
import { getCompanies, getEvents, getCategories } from '@/lib/data'
import HashOpener from '@/components/HashOpener'

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
const ALERT_VISIBLE_LIMIT = 5
const TIMELINE_WINDOW_DAYS = 7

type UrgencyTier = 'critical' | 'urgent' | 'soon' | 'far'

function urgencyTier(days: number): UrgencyTier {
  if (days <= 1) return 'critical'
  if (days <= 3) return 'urgent'
  if (days <= 7) return 'soon'
  return 'far'
}

const URGENCY_STYLES: Record<UrgencyTier, { badge: string; card: string; label: string; title: string }> = {
  critical: {
    badge: 'text-red-700 bg-red-100 border-red-400',
    card: 'bg-red-50 border-red-200',
    label: 'text-red-700',
    title: 'text-red-800',
  },
  urgent: {
    badge: 'text-orange-700 bg-orange-100 border-orange-300',
    card: 'bg-orange-50 border-orange-200',
    label: 'text-orange-700',
    title: 'text-orange-800',
  },
  soon: {
    badge: 'text-amber-700 bg-amber-50 border-amber-300',
    card: 'bg-amber-50 border-amber-200',
    label: 'text-amber-700',
    title: 'text-amber-800',
  },
  far: {
    badge: 'text-muted-foreground bg-muted border-border',
    card: 'bg-muted/40 border-border',
    label: 'text-muted-foreground',
    title: 'text-foreground',
  },
}

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

function renderTimelineEvent(e: InternEvent, company: Company | undefined, isAlert: boolean) {
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
      title={`${isAlert ? '⚠ 要対応 - ' : ''}${company?.name ?? ''} - ${e.title}`}
    >
      <div className="font-medium truncate">
        {isAlert && <span className="text-red-600 mr-0.5">⚠</span>}
        {e.title}
      </div>
      <div className="text-[9px] text-muted-foreground truncate">
        {company?.name ?? ''}
      </div>
    </Link>
  )
}

export default function DashboardPage() {
  const allCompanies = getCompanies()
  const allEvents = getEvents()
  const categories = getCategories()
  const suspendedIds = new Set(allCompanies.filter(c => c.suspended).map(c => c.id))
  const companies = allCompanies.filter(c => !c.suspended)
  const events = allEvents.filter(e => !suspendedIds.has(e.companyId))
  const suspendedCount = suspendedIds.size

  // 企業が登録されていない場合の空状態
  if (companies.length === 0 && suspendedCount === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h1 className="text-2xl font-bold mb-3">選考ステータスダッシュボード</h1>
        <p className="text-muted-foreground mb-6 max-w-md">
          まだ企業が登録されていません。<br />
          企業を追加すると、選考状況やイベントが一覧で確認できます。
        </p>
        <Link
          href="/companies"
          className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          企業を追加する →
        </Link>
      </div>
    )
  }
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

  // 締切が近い順 → 締切なしは最終イベント新しい順 → どちらもなしは末尾
  enriched.sort((a, b) => {
    const aDeadline = a.nextDeadline ? new Date(a.nextDeadline.start).getTime() : null
    const bDeadline = b.nextDeadline ? new Date(b.nextDeadline.start).getTime() : null
    if (aDeadline !== null && bDeadline !== null) return aDeadline - bDeadline
    if (aDeadline !== null) return -1
    if (bDeadline !== null) return 1
    const aLast = a.lastEvent ? new Date(a.lastEvent.start).getTime() : -Infinity
    const bLast = b.lastEvent ? new Date(b.lastEvent.start).getTime() : -Infinity
    return bLast - aLast
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
  const alertIds = new Set(alerts.map(e => e.id))

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

  // === 業界別バランス: 各業界のステータス構成 ===
  const categoryStats = categories
    .map(cat => {
      const catRows = enriched.filter(r => r.company.category === cat.id)
      const byStatus: Record<CompanyStatus, number> = {
        in_progress: 0,
        not_applied: 0,
        passed: 0,
        rejected: 0,
        done: 0,
      }
      for (const r of catRows) byStatus[r.status]++
      return { cat, total: catRows.length, byStatus }
    })
    .filter(cs => cs.total > 0)
    .sort((a, b) => b.total - a.total)

  const total = companies.length

  return (
    <div id="top" className="p-4 sm:p-6">
      <HashOpener />
      <div className="mb-6 flex flex-wrap items-baseline gap-3">
        <h1 className="text-2xl font-bold">選考ステータスダッシュボード</h1>
        <span className="text-sm text-muted-foreground">
          {total}社
          {suspendedCount > 0 && (
            <>
              {' '}
              <Link
                href="/companies?status=suspended"
                className="text-muted-foreground/70 underline-offset-2 hover:underline"
              >
                (+保留 {suspendedCount})
              </Link>
            </>
          )}
        </span>
      </div>

      {/* サマリーナビ */}
      <nav className="flex flex-wrap gap-2 mb-6" aria-label="ステータス別ナビ">
        {STATUS_ORDER.map(status => {
          const meta = COMPANY_STATUS_META[status]
          const count = grouped[status].length
          return (
            <a
              key={status}
              href={`#section-${status}`}
              className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm hover:bg-accent transition-colors"
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: meta.color }}
              />
              <span className="text-foreground">{meta.label}</span>
              <span className="font-semibold tabular-nums" style={{ color: meta.color }}>
                {count}
              </span>
            </a>
          )
        })}
      </nav>

      {/* アクションアラート */}
      {alerts.length > 0 && (
        <section className="mb-8">
          <div className="rounded-lg border border-red-200 bg-red-50/30 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">⚠</span>
              <h2 className="text-lg font-semibold text-red-700">
                アクション必要 ({alerts.length}件)
              </h2>
              <span className="text-xs text-muted-foreground">
                {ALERT_WINDOW_DAYS}日以内に締切・未対応のイベント
              </span>
            </div>
            <ul className="space-y-2">
              {alerts.slice(0, ALERT_VISIBLE_LIMIT).map(e => (
                <AlertItem key={e.id} event={e} company={companyMap.get(e.companyId)} today={today} />
              ))}
            </ul>
            {alerts.length > ALERT_VISIBLE_LIMIT && (
              <details className="group mt-2">
                <summary className="cursor-pointer select-none list-none text-xs text-red-700 hover:underline px-1 py-1">
                  <span className="transition-transform group-open:rotate-90 inline-block mr-1">▶</span>
                  残り {alerts.length - ALERT_VISIBLE_LIMIT} 件を表示
                </summary>
                <ul className="space-y-2 mt-2">
                  {alerts.slice(ALERT_VISIBLE_LIMIT).map(e => (
                    <AlertItem key={e.id} event={e} company={companyMap.get(e.companyId)} today={today} />
                  ))}
                </ul>
              </details>
            )}
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
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-7 sm:overflow-visible">
          {timelineDays.map(td => {
            const isToday = td.date.getTime() === today.getTime()
            const isWeekend = td.date.getDay() === 0 || td.date.getDay() === 6
            return (
              <div
                key={td.key}
                className={`flex-shrink-0 w-[120px] sm:w-auto rounded-md border bg-card p-2 min-h-[110px] ${
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
                    <div className="h-1 w-6 mx-auto mt-3 rounded-full bg-muted" aria-label="予定なし" />
                  ) : (
                    <>
                      {td.events.slice(0, 4).map(e => renderTimelineEvent(e, companyMap.get(e.companyId), alertIds.has(e.id)))}
                      {td.events.length > 4 && (
                        <details className="group">
                          <summary className="list-none cursor-pointer text-[9px] text-muted-foreground text-center py-0.5 rounded hover:bg-muted/50">
                            <span className="group-open:hidden">+{td.events.length - 4}件 ▼</span>
                            <span className="hidden group-open:inline">閉じる ▲</span>
                          </summary>
                          <div className="space-y-1 mt-1">
                            {td.events.slice(4).map(e => renderTimelineEvent(e, companyMap.get(e.companyId), alertIds.has(e.id)))}
                          </div>
                        </details>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* セクション */}
      <div className="space-y-6">
        {STATUS_ORDER.map(status => {
          const meta = COMPANY_STATUS_META[status]
          const rows = grouped[status]
          return (
            <details key={status} id={`section-${status}`} className="group scroll-mt-20">
              <summary className="cursor-pointer select-none list-none">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground transition-transform group-open:rotate-90">▶</span>
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
              </summary>
              {rows.length === 0 ? (
                <p className="text-xs text-muted-foreground italic mt-3">該当企業なし</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mt-3">
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
            </details>
          )
        })}
      </div>

      {/* 業界別バランス */}
      <section className="mt-10">
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-lg font-semibold">業界別の進行状況</h2>
          <span className="text-xs text-muted-foreground">
            登録済 {total}社 のステータス構成
          </span>
        </div>
        <div className="rounded-md border bg-card p-4 space-y-3">
          {categoryStats.map(({ cat, total: catTotal, byStatus }) => {
            const activeCount = byStatus.in_progress + byStatus.passed
            const activeRate = catTotal > 0 ? (activeCount / catTotal) * 100 : 0
            return (
              <div key={cat.id}>
                <div className="flex items-center gap-2 mb-1 text-xs flex-wrap">
                  <span
                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="font-medium">{cat.label}</span>
                  <span className="text-muted-foreground">{catTotal}社</span>
                  <span className="text-muted-foreground ml-auto tabular-nums">
                    進行中 {activeCount}/{catTotal} ({activeRate.toFixed(0)}%)
                  </span>
                </div>
                <div className="flex h-2 rounded overflow-hidden bg-muted">
                  {STATUS_ORDER.map(status => {
                    const count = byStatus[status]
                    if (count === 0) return null
                    const pct = (count / catTotal) * 100
                    const meta = COMPANY_STATUS_META[status]
                    return (
                      <div
                        key={status}
                        style={{ width: `${pct}%`, backgroundColor: meta.color }}
                        title={`${meta.label} ${count}社 (${pct.toFixed(0)}%)`}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground pt-2 border-t">
            {STATUS_ORDER.map(status => {
              const meta = COMPANY_STATUS_META[status]
              return (
                <span key={status} className="inline-flex items-center gap-1">
                  <span
                    className="w-2 h-2 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: meta.color }}
                  />
                  {meta.label}
                </span>
              )
            })}
          </div>
        </div>
      </section>

      <a
        href="#top"
        aria-label="トップへ戻る"
        className="fixed bottom-6 right-6 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-opacity hover:opacity-90"
      >
        ↑
      </a>
    </div>
  )
}

function AlertItem({ event, company, today }: { event: InternEvent; company: Company | undefined; today: Date }) {
  const days = daysUntil(event.start, today)
  const urgency = URGENCY_STYLES[urgencyTier(days)]
  return (
    <li>
      <Link
        href={company ? `/companies/${company.id}` : '#'}
        className="flex items-center gap-3 rounded-md bg-white border px-3 py-2 hover:shadow transition-all"
      >
        <span
          className={`text-xs font-bold px-2 py-1 rounded border ${urgency.badge} min-w-[68px] text-center`}
        >
          {days === 0 ? '今日' : days === 1 ? '明日' : `あと${days}日`}
        </span>
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: company?.color ?? '#999' }}
        />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">
            {event.title}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {company?.name ?? '不明'} ・ {TYPE_LABELS[event.type]} ・ {formatEventWhen(event.start)}
          </div>
        </div>
      </Link>
    </li>
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
          {nextDeadline ? (() => {
            const days = daysUntil(nextDeadline.start, today)
            const urgency = URGENCY_STYLES[urgencyTier(days)]
            const mmdd = formatMMDD(new Date(nextDeadline.start))
            return (
              <div className={`text-xs border rounded px-2 py-1 ${urgency.card}`}>
                <div className={`font-medium ${urgency.label}`}>
                  次の締切: {days === 0 ? '今日' : days === 1 ? '明日' : `あと${days}日`}
                  <span className="text-muted-foreground/80 ml-1 font-normal">({mmdd})</span>
                </div>
                <div className={`truncate ${urgency.title}`}>{nextDeadline.title}</div>
              </div>
            )
          })() : lastEvent ? (
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
