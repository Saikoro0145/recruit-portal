'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Grid2X2, List, Search, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import AddCategoryDialog from '@/components/AddCategoryDialog'
import AddCompanyDialog from '@/components/AddCompanyDialog'
import DeleteCategoryButton from '@/components/DeleteCategoryButton'
import { COMPANY_STATUS_META, CompanyStatus, deriveCompanyStatus } from '@/lib/utils'
import { CategoryDef, Company, InternEvent, Status } from '@/types'

type ViewMode = 'cards' | 'table'
type StatusFilter = 'all' | CompanyStatus | 'suspended'

interface Props {
  companies: Company[]
  events: InternEvent[]
  categories: CategoryDef[]
}

const STATUS_LABELS: Record<Status, string> = {
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

const TYPE_LABELS: Record<InternEvent['type'], string> = {
  deadline: '締切',
  internship: 'インターン',
  selection: '選考',
  event: 'イベント',
}

const URGENCY_FILTER_LABELS = {
  all: '全予定',
  deadline: '締切あり',
  no_deadline: '締切なし',
}

const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  all: '全状態',
  suspended: '保留中',
  in_progress: COMPANY_STATUS_META.in_progress.label,
  passed: COMPANY_STATUS_META.passed.label,
  rejected: COMPANY_STATUS_META.rejected.label,
  not_applied: COMPANY_STATUS_META.not_applied.label,
  done: COMPANY_STATUS_META.done.label,
}

const COMPANY_NAME_SEARCH_ALIASES: Record<string, string[]> = {
  mufg: ['mitsubishi ufj bank', 'mitsubishi', 'ufj'],
  smbc: ['mitsui sumitomo bank', 'mitsui', 'sumitomo'],
  nomura: ['nomura'],
  nri: ['nomura research institute', 'nomura souken'],
  fujitsu: ['fujitsu'],
  ibm: ['ibm', 'nihon ibm'],
  toyota: ['toyota'],
  nec: ['nec'],
  nttdata: ['ntt data', 'nttdata'],
  mhi: ['mitsubishi heavy industries', 'mitsubishi'],
  kioxia: ['kioxia'],
  ctc: ['ctc'],
  sgs: ['sony global solutions', 'sony'],
  mizuho: ['mizuho'],
  sony: ['sony'],
  jal: ['jal'],
  'sc-mufg': ['mitsubishi ufj morgan stanley', 'mitsubishi', 'ufj', 'morgan stanley'],
  cisco: ['cisco'],
  nssol: ['nssol', 'nittetsu solutions', 'nippon steel solutions'],
  muit: ['mitsubishi ufj information technology', 'mitsubishi', 'ufj'],
  kddi: ['kddi'],
}

function daysUntil(dateStr: string, today: Date) {
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function formatEventWhen(s: string) {
  const [datePart, timePart] = s.split('T')
  if (!timePart) return datePart
  return `${datePart} ${timePart.substring(0, 5)}`
}

function formatNextDeadline(event: InternEvent | undefined, today: Date) {
  if (!event) return 'なし'
  const days = daysUntil(event.start, today)
  const prefix = days === 0 ? '今日' : days === 1 ? '明日' : days > 1 ? `あと${days}日` : '期限超過'
  return `${prefix} ・ ${formatEventWhen(event.start)}`
}

function getCompanyNameSearchText(company: Company) {
  return [
    company.name,
    ...(COMPANY_NAME_SEARCH_ALIASES[company.id] ?? []),
  ].join(' ').toLowerCase()
}

const VALID_STATUS_FILTERS: StatusFilter[] = ['all', 'suspended', 'in_progress', 'not_applied', 'passed', 'rejected', 'done']

function isStatusFilter(value: string | null): value is StatusFilter {
  return value !== null && (VALID_STATUS_FILTERS as string[]).includes(value)
}

export default function CompaniesClient({ companies, events, categories }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialStatus = searchParams?.get('status') ?? null
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    isStatusFilter(initialStatus) ? initialStatus : 'all'
  )
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'deadline' | 'no_deadline'>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('table')

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const categoryMap = useMemo(
    () => new Map(categories.map(category => [category.id, category])),
    [categories]
  )

  const rows = useMemo(() => {
    return companies.map(company => {
      const companyEvents = events.filter(e => e.companyId === company.id)
      const status = deriveCompanyStatus(companyEvents)
      const pendingDeadlines = companyEvents.filter(
        e => e.type === 'deadline' && e.status === 'pending' && new Date(e.start) >= today
      )
      const upcomingInternships = companyEvents.filter(
        e => e.type === 'internship' && new Date(e.end) >= today
      )
      const nextDeadline = companyEvents
        .filter(e => e.type === 'deadline' && new Date(e.start) >= today)
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())[0]
      const nextEvent = companyEvents
        .filter(e => new Date(e.start) >= today)
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())[0]
      const statusCounts = companyEvents.reduce<Record<string, number>>((acc, e) => {
        acc[e.status] = (acc[e.status] || 0) + 1
        return acc
      }, {})
      return {
        company,
        category: categoryMap.get(company.category),
        companyEvents,
        status,
        pendingDeadlines,
        upcomingInternships,
        nextDeadline,
        nextEvent,
        statusCounts,
      }
    })
  }, [companies, events, categoryMap, today])

  const activeRows = rows.filter(row => !row.company.suspended)
  const suspendedRows = rows.filter(row => row.company.suspended)

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const categoryOrder = new Map(categories.map((category, index) => [category.id, index]))
    const compareByDeadlineThenName = (a: (typeof rows)[number], b: (typeof rows)[number]) => {
      const aTime = a.nextDeadline ? new Date(a.nextDeadline.start).getTime() : Number.MAX_SAFE_INTEGER
      const bTime = b.nextDeadline ? new Date(b.nextDeadline.start).getTime() : Number.MAX_SAFE_INTEGER
      return aTime - bTime || a.company.name.localeCompare(b.company.name, 'ja')
    }

    return rows
      .filter(row => {
        if (categoryFilter !== 'all' && row.company.category !== categoryFilter) return false
        if (statusFilter === 'suspended' && !row.company.suspended) return false
        if (statusFilter !== 'all' && statusFilter !== 'suspended') {
          if (row.company.suspended || row.status !== statusFilter) return false
        }
        if (urgencyFilter === 'deadline' && !row.nextDeadline) return false
        if (urgencyFilter === 'no_deadline' && row.nextDeadline) return false
        if (!normalizedQuery) return true
        return getCompanyNameSearchText(row.company).includes(normalizedQuery)
      })
      .sort((a, b) => {
        if (categoryFilter === 'all') {
          const categoryCompare =
            (categoryOrder.get(a.company.category) ?? Number.MAX_SAFE_INTEGER) -
            (categoryOrder.get(b.company.category) ?? Number.MAX_SAFE_INTEGER)
          if (categoryCompare !== 0) return categoryCompare
        }
        return compareByDeadlineThenName(a, b)
      })
  }, [rows, categories, categoryFilter, query, statusFilter, urgencyFilter])

  const hasFilters =
    query.trim() || categoryFilter !== 'all' || statusFilter !== 'all' || urgencyFilter !== 'all'

  const resetFilters = () => {
    setQuery('')
    setCategoryFilter('all')
    setStatusFilter('all')
    setUrgencyFilter('all')
  }

  const quickStats = [
    { label: '表示中', value: filteredRows.length, suffix: '社' },
    { label: '締切あり', value: filteredRows.filter(row => row.nextDeadline).length, suffix: '社' },
    { label: '選考中', value: activeRows.filter(row => row.status === 'in_progress').length, suffix: '社' },
    { label: '保留', value: suspendedRows.length, suffix: '社' },
  ]

  const renderStatusBadge = (status: CompanyStatus) => {
    const meta = COMPANY_STATUS_META[status]
    return <span className={`rounded border px-2 py-0.5 text-xs font-medium ${meta.badge}`}>{meta.label}</span>
  }

  const renderCompanyStatusBadge = (row: (typeof rows)[number]) => {
    if (row.company.suspended) {
      return <span className="rounded border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">保留中</span>
    }
    return renderStatusBadge(row.status)
  }

  const renderCard = (row: (typeof rows)[number]) => (
    <Link key={row.company.id} href={`/companies/${row.company.id}`} className="block h-full">
      <Card className="h-full cursor-pointer border-l-4 transition-all hover:-translate-y-0.5 hover:shadow-md" style={{ borderLeftColor: row.company.color }}>
        <CardHeader className="pb-2">
          <div className="flex items-start gap-2">
            <CardTitle className="min-w-0 flex-1 truncate text-base leading-tight">{row.company.name}</CardTitle>
            {renderCompanyStatusBadge(row)}
          </div>
          <div className="text-xs text-muted-foreground">{row.category?.label ?? row.company.category}</div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <div className="font-semibold text-orange-600">{row.pendingDeadlines.length}</div>
              <div className="text-xs text-muted-foreground">未対応締切</div>
            </div>
            <div>
              <div className="font-semibold text-blue-600">{row.upcomingInternships.length}</div>
              <div className="text-xs text-muted-foreground">インターン</div>
            </div>
            <div>
              <div className="font-semibold">{row.companyEvents.length}</div>
              <div className="text-xs text-muted-foreground">予定合計</div>
            </div>
          </div>

          <div className="rounded-md border bg-muted/35 p-2 text-xs">
            <div className="font-medium text-foreground">{formatNextDeadline(row.nextDeadline, today)}</div>
            <div className="mt-0.5 truncate text-muted-foreground">{row.nextDeadline?.title ?? '次の締切は未登録'}</div>
          </div>

          <div className="flex flex-wrap gap-1">
            {Object.entries(row.statusCounts).map(([status, count]) => (
              <Badge key={status} variant={STATUS_BADGE_VARIANT[status] || 'secondary'} className="text-xs">
                {STATUS_LABELS[status as Status]} {count}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  )

  const renderTable = (tableRows: typeof filteredRows) => (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-muted/70 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">企業</th>
              <th className="px-3 py-2 text-left font-semibold">業界</th>
              <th className="px-3 py-2 text-left font-semibold">状態</th>
              <th className="px-3 py-2 text-left font-semibold">次の締切</th>
              <th className="px-3 py-2 text-left font-semibold">次の予定</th>
              <th className="px-3 py-2 text-right font-semibold">未対応</th>
              <th className="px-3 py-2 text-right font-semibold">合計</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {tableRows.map(row => (
              <tr
                key={row.company.id}
                className="group cursor-pointer hover:bg-muted/35 focus-within:bg-muted/35"
                onClick={() => router.push(`/companies/${row.company.id}`)}
              >
                <td className="px-3 py-2">
                  <Link
                    href={`/companies/${row.company.id}`}
                    className="flex min-w-0 items-center gap-2 font-medium"
                    onClick={event => event.stopPropagation()}
                  >
                    <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: row.company.color }} />
                    <span className="truncate group-hover:underline">{row.company.name}</span>
                  </Link>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{row.category?.label ?? row.company.category}</td>
                <td className="px-3 py-2">{renderCompanyStatusBadge(row)}</td>
                <td className="px-3 py-2">
                  <div className="font-medium">{formatNextDeadline(row.nextDeadline, today)}</div>
                  <div className="max-w-[220px] truncate text-xs text-muted-foreground">{row.nextDeadline?.title ?? ''}</div>
                </td>
                <td className="px-3 py-2">
                  {row.nextEvent ? (
                    <>
                      <div className="max-w-[220px] truncate font-medium">{row.nextEvent.title}</div>
                      <div className="text-xs text-muted-foreground">{TYPE_LABELS[row.nextEvent.type]} ・ {formatEventWhen(row.nextEvent.start)}</div>
                    </>
                  ) : (
                    <span className="text-muted-foreground">なし</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right font-semibold text-orange-600">{row.pendingDeadlines.length}</td>
                <td className="px-3 py-2 text-right font-semibold">{row.companyEvents.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">企業一覧</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length}社を業界順に整理
            {suspendedRows.length > 0 && <span className="text-muted-foreground/70"> ・ 保留 {suspendedRows.length}社</span>}
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <AddCategoryDialog categories={categories} />
          <AddCompanyDialog categories={categories} companies={companies} />
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {quickStats.map(stat => (
          <div key={stat.label} className="rounded-lg border bg-card px-3 py-2">
            <div className="text-xs text-muted-foreground">{stat.label}</div>
            <div className="text-xl font-bold">
              {stat.value}<span className="ml-1 text-xs font-normal text-muted-foreground">{stat.suffix}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="sticky top-0 z-20 mb-5 rounded-lg border bg-background/95 p-3 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="pl-8"
              placeholder="企業名で検索"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex">
            <Select value={categoryFilter} onValueChange={value => setCategoryFilter(value ?? 'all')}>
              <SelectTrigger className="w-full lg:w-36">
                <span className="truncate">
                  {categoryFilter === 'all' ? '全業界' : categoryMap.get(categoryFilter)?.label ?? categoryFilter}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全業界</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id}>{category.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={value => setStatusFilter((value ?? 'all') as StatusFilter)}>
              <SelectTrigger className="w-full lg:w-32">
                <span className="truncate">{STATUS_FILTER_LABELS[statusFilter]}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全状態</SelectItem>
                <SelectItem value="suspended">保留中</SelectItem>
                {Object.entries(COMPANY_STATUS_META).map(([status, meta]) => (
                  <SelectItem key={status} value={status}>{meta.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={urgencyFilter} onValueChange={value => setUrgencyFilter((value ?? 'all') as typeof urgencyFilter)}>
              <SelectTrigger className="w-full lg:w-32">
                <span className="truncate">{URGENCY_FILTER_LABELS[urgencyFilter]}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全予定</SelectItem>
                <SelectItem value="deadline">締切あり</SelectItem>
                <SelectItem value="no_deadline">締切なし</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <X className="h-4 w-4" />
                解除
              </Button>
            )}
            <div className="flex rounded-lg border p-0.5">
              <Button
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size="icon-sm"
                onClick={() => setViewMode('table')}
                title="表で表示"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
                size="icon-sm"
                onClick={() => setViewMode('cards')}
                title="カードで表示"
              >
                <Grid2X2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {filteredRows.length > 0 ? (
        viewMode === 'table' ? (
          renderTable(filteredRows)
        ) : (
          <div className="space-y-7">
            {categories.map(category => {
              const categoryRows = filteredRows.filter(row => row.company.category === category.id)
              if (categoryRows.length === 0) return null
              return (
                <section key={category.id}>
                  <div className="mb-3 flex items-center gap-3">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{category.label}</h2>
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: `${category.color}20`, color: category.color }}
                    >
                      {categoryRows.length}社
                    </span>
                    <DeleteCategoryButton id={category.id} label={category.label} disabled={rows.some(row => row.company.category === category.id)} />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {categoryRows.map(renderCard)}
                  </div>
                </section>
              )
            })}
          </div>
        )
      ) : (
        <div className="rounded-lg border bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
          条件に合う企業がありません
        </div>
      )}

      {viewMode === 'table' && !hasFilters && categories.length > 0 && (
        <div className="mt-8 space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">カテゴリ管理</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map(category => {
              const count = rows.filter(row => row.company.category === category.id).length
              return (
                <div key={category.id} className="flex items-center gap-2 rounded-lg border px-2 py-1">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: category.color }} />
                  <span className="text-sm">{category.label}</span>
                  <span className="text-xs text-muted-foreground">{count}社</span>
                  <DeleteCategoryButton id={category.id} label={category.label} disabled={count > 0} />
                </div>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}
