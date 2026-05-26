'use client'

import { useRef, useState, useCallback } from 'react'
import type { ClipboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid/index.js'
import interactionPlugin from '@fullcalendar/interaction/index.js'
import listPlugin from '@fullcalendar/list/index.js'
import { EventClickArg, EventContentArg } from '@fullcalendar/core/index.js'
import { DateClickArg } from '@fullcalendar/interaction/index.js'
import { Company, CategoryDef, EventType, InternEvent, Status } from '@/types'
import { addEvent, updateEventStatus, deleteEvent, updateEvent } from '@/lib/actions'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import Link from 'next/link'

type TextDetectorConstructor = new () => {
  detect: (source: ImageBitmap) => Promise<Array<{ rawValue: string }>>
}

interface WindowWithTextDetector extends Window {
  TextDetector?: TextDetectorConstructor
}

interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  allDay: boolean
  backgroundColor: string
  borderColor: string
  textColor: string
  extendedProps: {
    event: InternEvent
    company: Company
  }
}

interface Props {
  events: CalendarEvent[]
  companies: Company[]
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


function OverlapWarning({ internships }: { internships: CalendarEvent[] }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-md border border-yellow-400 bg-yellow-50 text-xs text-yellow-800">
      <button
        className="w-full flex items-center justify-between px-2 py-1.5 font-semibold"
        onClick={() => setOpen(v => !v)}
      >
        <span>⚠ 日程重複あり（{internships.length}件）</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <ul className="px-2 pb-2 space-y-1 border-t border-yellow-300">
          {internships.map(e => (
            <li key={e.id} className="pt-1">
              <div className="font-semibold">{e.extendedProps.company.name}</div>
              <div className="text-yellow-700 leading-tight">{e.title}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function EventContent({ arg }: { arg: EventContentArg }) {
  const { event } = arg.event.extendedProps as { event: InternEvent; company: Company }
  const isDeadline = event.type === 'deadline'
  const isPast = new Date(event.start) < new Date()

  if (isDeadline) {
    return (
      <div
        className="flex items-center gap-0.5 px-1 py-0.5 rounded overflow-hidden w-full"
        style={{
          backgroundColor: arg.event.backgroundColor + (isPast ? '60' : 'cc'),
          color: '#fff',
        }}
      >
        <span className="text-xs flex-shrink-0">⚠</span>
        <span className="text-xs truncate font-medium">{arg.event.title}</span>
      </div>
    )
  }

  return (
    <div
      className="px-1 py-0.5 rounded overflow-hidden w-full"
      style={{
        backgroundColor: arg.event.backgroundColor + (isPast ? '60' : 'cc'),
        color: '#fff',
      }}
    >
      <span className="text-xs truncate block font-medium">{arg.event.title}</span>
    </div>
  )
}

const TYPE_LABELS: Record<EventType, string> = {
  deadline: '締切',
  internship: 'インターン',
  selection: '選考',
  event: 'イベント',
}

const EMPTY_FORM = {
  companyId: '',
  title: '',
  type: 'deadline' as EventType,
  start: '',
  end: '',
  allDay: false,
  status: 'pending' as Status,
  note: '',
}

const toDateValue = (s: string) => (s ? s.split('T')[0] : '')

const toDateTimeValue = (s: string) => {
  if (!s) return ''
  if (s.includes('T')) return s.substring(0, 16)
  return `${s}T09:00`
}

const formatEventDate = (s: string) => {
  if (!s) return ''
  const d = new Date(s)
  return d.toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    ...(s.includes('T') ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}

const normalizeScheduleText = (value: string) =>
  value
    .replace(/[０-９]/g, char => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/[〜～－ー―–—]/g, '-')

const toDateString = (year: number, month: number, day: number) =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

const parseScheduleDates = (value: string) => {
  const normalized = normalizeScheduleText(value)
  const currentYear = new Date().getFullYear()
  const matches = [
    ...normalized.matchAll(
      /(?:(\d{4})\s*(?:年|[\/.-])\s*)?(\d{1,2})\s*(?:月|[\/.-])\s*(\d{1,2})\s*日?/g
    ),
  ]

  if (matches.length === 0) return null

  const firstYear = matches[0][1] ? Number(matches[0][1]) : currentYear
  const toDate = (match: RegExpMatchArray) => ({
    year: match[1] ? Number(match[1]) : firstYear,
    month: Number(match[2]),
    day: Number(match[3]),
  })

  const start = toDate(matches[0])
  const end = matches[1] ? toDate(matches[1]) : start
  const startDate = toDateString(start.year, start.month, start.day)
  const endDate = toDateString(end.year, end.month, end.day)

  return {
    start: startDate <= endDate ? startDate : endDate,
    end: startDate <= endDate ? endDate : startDate,
    isRange: startDate !== endDate,
  }
}

export default function CalendarClient({ events, companies, categories }: Props) {
  const categoryLabels = Object.fromEntries(categories.map(c => [c.id, c.label]))
  const router = useRouter()
  const calendarRef = useRef<FullCalendar>(null)
  const [selectedEvent, setSelectedEvent] = useState<{
    event: InternEvent
    company: Company
  } | null>(null)
  const [currentStatus, setCurrentStatus] = useState<Status>('pending')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({ title: '', type: 'deadline' as EventType, start: '', end: '', allDay: true })
  const [view, setView] = useState<'dayGridMonth' | 'listMonth'>('dayGridMonth')

  const [hiddenCompanies, setHiddenCompanies] = useState<Set<string>>(new Set())
  const [deadlineOpen, setDeadlineOpen] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [adding, setAdding] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [scheduleText, setScheduleText] = useState('')
  const [scheduleMessage, setScheduleMessage] = useState('')

  const toggleCompany = (id: string) => {
    setHiddenCompanies(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleDateClick = useCallback((arg: DateClickArg) => {
    const allDay = !arg.dateStr.includes('T')
    setForm({ ...EMPTY_FORM, start: arg.dateStr, end: arg.dateStr, allDay })
    setAddOpen(true)
  }, [])

  const applyScheduleText = (value: string) => {
    setScheduleText(value)
    const parsed = parseScheduleDates(value)
    if (!parsed) {
      setScheduleMessage(value.trim() ? '日付を読み取れませんでした' : '')
      return
    }

    setForm(f => ({
      ...f,
      start: parsed.start,
      end: parsed.end,
      allDay: true,
      type: parsed.isRange && f.type === 'deadline' ? 'internship' : f.type,
    }))
    setScheduleMessage(`日程を仮入力しました: ${parsed.start}${parsed.isRange ? ` - ${parsed.end}` : ''}`)
  }

  const handleSchedulePaste = async (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const imageItem = [...event.clipboardData.items].find(item => item.type.startsWith('image/'))
    if (!imageItem) return

    const file = imageItem.getAsFile()
    const TextDetector = (window as WindowWithTextDetector).TextDetector
    if (!file || !TextDetector) {
      setScheduleMessage('画像OCRはこのブラウザでは利用できません。文字列を貼り付けてください。')
      return
    }

    event.preventDefault()
    setScheduleMessage('画像から日程を読み取り中...')
    try {
      const bitmap = await createImageBitmap(file)
      const detector = new TextDetector()
      const results = await detector.detect(bitmap)
      const text = results.map(result => result.rawValue).join('\n')
      applyScheduleText(text)
    } catch {
      setScheduleMessage('画像から日程を読み取れませんでした。文字列を貼り付けてください。')
    }
  }

  const handleAddSave = async () => {
    if (!form.companyId || !form.title || !form.start) return
    setAdding(true)
    try {
      await addEvent({
        companyId: form.companyId,
        title: form.title,
        type: form.type,
        start: form.start,
        end: form.end || form.start,
        status: form.status,
        note: form.note,
      })
      setAddOpen(false)
      setForm(EMPTY_FORM)
      setScheduleText('')
      setScheduleMessage('')
      router.refresh()
    } finally {
      setAdding(false)
    }
  }

  const handleEventClick = useCallback((arg: EventClickArg) => {
    const { event: internEvent, company } = arg.event.extendedProps as {
      event: InternEvent
      company: Company
    }
    setSelectedEvent({ event: internEvent, company })
    setCurrentStatus(internEvent.status)
    setEditMode(false)
  }, [])

  const handleStatusSave = async () => {
    if (!selectedEvent) return
    setSaving(true)
    try {
      await updateEventStatus(selectedEvent.event.id, currentStatus)
      setSelectedEvent(prev =>
        prev ? { ...prev, event: { ...prev.event, status: currentStatus } } : null
      )
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedEvent) return
    setDeleting(true)
    try {
      await deleteEvent(selectedEvent.event.id)
      setSelectedEvent(null)
      router.refresh()
    } finally {
      setDeleting(false)
    }
  }

  const handleEditOpen = () => {
    if (!selectedEvent) return
    setEditForm({
      title: selectedEvent.event.title,
      type: selectedEvent.event.type,
      start: selectedEvent.event.start,
      end: selectedEvent.event.end,
      allDay: !selectedEvent.event.start.includes('T'),
    })
    setEditMode(true)
  }

  const handleEditSave = async () => {
    if (!selectedEvent) return
    setSaving(true)
    try {
      await updateEvent(selectedEvent.event.id, {
        title: editForm.title,
        type: editForm.type,
        start: editForm.start,
        end: editForm.end || editForm.start,
        status: currentStatus,
      })
      setSelectedEvent(prev =>
        prev ? { ...prev, event: { ...prev.event, ...editForm, end: editForm.end || editForm.start, status: currentStatus } } : null
      )
      setEditMode(false)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  const switchView = (v: 'dayGridMonth' | 'listMonth') => {
    setView(v)
    calendarRef.current?.getApi().changeView(v)
  }

  const resetAddDialog = () => {
    setForm(EMPTY_FORM)
    setScheduleText('')
    setScheduleMessage('')
  }

  const visibleEvents = events.filter(e => !hiddenCompanies.has(e.extendedProps.event.companyId))

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const daysUntil = (dateStr: string) => {
    const d = new Date(dateStr)
    d.setHours(0, 0, 0, 0)
    return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }

  const upcomingDeadlines = events
    .filter(e => e.extendedProps.event.type === 'deadline' && new Date(e.extendedProps.event.start) >= today)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

  // Detect overlapping internships
  const internships = visibleEvents.filter(e => e.extendedProps.event.type === 'internship')
  const overlaps = new Set<string>()
  for (let i = 0; i < internships.length; i++) {
    for (let j = i + 1; j < internships.length; j++) {
      const a = internships[i]
      const b = internships[j]
      const aStart = new Date(a.start)
      const aEnd = new Date(a.end)
      const bStart = new Date(b.start)
      const bEnd = new Date(b.end)
      if (aStart < bEnd && aEnd > bStart) {
        overlaps.add(a.id)
        overlaps.add(b.id)
      }
    }
  }

  const sidebarContent = (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">企業</h2>
        <ul className="space-y-1">
          {companies.map(c => {
            const hidden = hiddenCompanies.has(c.id)
            return (
              <li key={c.id}>
                <button
                  onClick={() => toggleCompany(c.id)}
                  className="w-full flex items-center gap-2 text-sm hover:bg-accent rounded-md px-2 py-1 transition-colors"
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full flex-shrink-0 border-2 transition-colors"
                    style={{ backgroundColor: hidden ? 'transparent' : c.color, borderColor: c.color }}
                  />
                  <span className={`truncate ${hidden ? 'text-muted-foreground line-through' : ''}`}>
                    {c.name}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {upcomingDeadlines.length > 0 && (
        <div>
          <button
            onClick={() => setDeadlineOpen(v => !v)}
            className="w-full flex items-center justify-between mb-2"
          >
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">直近の締切</h2>
            <span className="text-xs text-muted-foreground">{deadlineOpen ? '▲' : '▼'}</span>
          </button>
          {deadlineOpen && (
            <ul className="space-y-2">
              {upcomingDeadlines.map(e => {
                const days = daysUntil(e.start)
                const urgencyClass = days <= 3
                  ? 'text-red-600 font-bold'
                  : days <= 7
                  ? 'text-orange-500 font-semibold'
                  : 'text-muted-foreground'
                return (
                  <li key={e.id} className="flex items-start gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: e.backgroundColor }} />
                    <div className="min-w-0">
                      <div className={urgencyClass}>あと{days}日</div>
                      <div className="truncate text-foreground leading-tight">{e.title}</div>
                      <div className="truncate text-muted-foreground leading-tight">{e.extendedProps.company.name}</div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">凡例</h2>
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li className="flex items-center gap-2"><span>⚠</span><span>締切</span></li>
          <li className="flex items-center gap-2">
            <span className="w-4 h-2 rounded bg-blue-500 opacity-80" />
            <span>インターン期間</span>
          </li>
        </ul>
      </div>

      {overlaps.size > 0 && (
        <OverlapWarning internships={internships.filter(e => overlaps.has(e.id))} />
      )}
    </div>
  )

  return (
    <div className="flex gap-4 p-4 md:h-[calc(100vh-3.5rem)]">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-52 flex-shrink-0 overflow-y-auto">
        {sidebarContent}
      </aside>

      {/* Calendar */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between gap-2 mb-2">
          {/* Mobile: Sheet */}
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            ☰ フィルター
          </Button>
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetContent side="left" className="w-64 overflow-y-auto">
              <SheetHeader className="mb-4">
                <SheetTitle>フィルター</SheetTitle>
              </SheetHeader>
              {sidebarContent}
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2 ml-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={() => { resetAddDialog(); setAddOpen(true) }}
              className="text-xs h-7"
            >
              ＋ 追加
            </Button>
            <Button
              size="sm"
              variant={view === 'dayGridMonth' ? 'default' : 'outline'}
              onClick={() => switchView('dayGridMonth')}
              className="text-xs h-7"
            >
              月表示
            </Button>
            <Button
              size="sm"
              variant={view === 'listMonth' ? 'default' : 'outline'}
              onClick={() => switchView('listMonth')}
              className="text-xs h-7"
            >
              リスト
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, interactionPlugin, listPlugin]}
            initialView="dayGridMonth"
            initialDate={new Date().toISOString().split('T')[0]}
            locale="ja"
            height="auto"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: '',
            }}
            events={visibleEvents}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            eventContent={(arg) => <EventContent arg={arg} />}
            dayMaxEvents={4}
            moreLinkText={(n) => `+${n}件`}
            buttonText={{
              today: '今月',
              month: '月',
              list: 'リスト',
            }}
            listDayFormat={{ month: 'long', day: 'numeric', weekday: 'short' }}
            listDaySideFormat={false}
            noEventsText="イベントなし"
          />
        </div>
      </div>

      {/* Event detail dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => { setSelectedEvent(null); setEditMode(false) }}>
        <DialogContent className="max-w-md">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: selectedEvent.company.color }}
                  />
                  {editMode ? (
                    <Input
                      value={editForm.title}
                      onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                      className="h-7 text-base font-semibold"
                    />
                  ) : (
                    selectedEvent.event.title
                  )}
                </DialogTitle>
                <DialogDescription>
                  {selectedEvent.company.name} - {TYPE_LABELS[selectedEvent.event.type]}
                </DialogDescription>
                <div className="space-y-3 pt-1">
                  {editMode ? (
                    <>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">種別</label>
                        <Select value={editForm.type} onValueChange={v => setEditForm(f => ({ ...f, type: v as EventType }))}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.entries(TYPE_LABELS) as [EventType, string][]).map(([val, label]) => (
                              <SelectItem key={val} value={val}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={editForm.allDay}
                          onChange={e => {
                            const allDay = e.target.checked
                            setEditForm(f => ({
                              ...f,
                              allDay,
                              start: allDay ? toDateValue(f.start) : toDateTimeValue(f.start),
                              end: allDay ? toDateValue(f.end) : toDateTimeValue(f.end),
                            }))
                          }}
                          className="h-3.5 w-3.5"
                        />
                        終日（時刻を指定しない）
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">{editForm.allDay ? '開始日' : '開始日時'}</label>
                          <Input
                            type={editForm.allDay ? 'date' : 'datetime-local'}
                            value={editForm.allDay ? toDateValue(editForm.start) : toDateTimeValue(editForm.start)}
                            onChange={e => setEditForm(f => ({ ...f, start: e.target.value }))}
                          />
                        </div>
                        {editForm.type !== 'deadline' && (
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">{editForm.allDay ? '終了日' : '終了日時'}</label>
                            <Input
                              type={editForm.allDay ? 'date' : 'datetime-local'}
                              value={editForm.allDay ? toDateValue(editForm.end) : toDateTimeValue(editForm.end)}
                              onChange={e => setEditForm(f => ({ ...f, end: e.target.value }))}
                            />
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">{selectedEvent.company.name}</Badge>
                        <Badge variant="outline">{categoryLabels[selectedEvent.company.category] ?? selectedEvent.company.category}</Badge>
                        <Badge variant="outline">{TYPE_LABELS[selectedEvent.event.type]}</Badge>
                      </div>
                      <div className="text-sm space-y-1">
                        <div className="flex gap-2">
                          <span className="text-muted-foreground w-16">開始</span>
                          <span className="font-medium">{formatEventDate(selectedEvent.event.start)}</span>
                        </div>
                        {selectedEvent.event.end && selectedEvent.event.end !== selectedEvent.event.start && (
                          <div className="flex gap-2">
                            <span className="text-muted-foreground w-16">終了</span>
                            <span className="font-medium">{formatEventDate(selectedEvent.event.end)}</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">ステータス</label>
                    <Select value={currentStatus} onValueChange={(v) => setCurrentStatus(v as Status)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.entries(STATUS_LABELS) as [Status, string][]).map(([val, label]) => (
                          <SelectItem key={val} value={val}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {editMode ? (
                    <div className="flex justify-end gap-2 pt-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditMode(false)} disabled={saving}>
                        キャンセル
                      </Button>
                      <Button size="sm" onClick={handleEditSave} disabled={saving || !editForm.title || !editForm.start}>
                        {saving ? '保存中...' : '保存'}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center pt-1">
                      <Link
                        href={`/companies/${selectedEvent.company.id}`}
                        className="text-sm text-primary underline-offset-2 hover:underline"
                        onClick={() => setSelectedEvent(null)}
                      >
                        企業詳細を見る →
                      </Link>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={handleEditOpen} disabled={deleting}>
                          編集
                        </Button>
                        <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleting || saving}>
                          {deleting ? '削除中...' : '削除'}
                        </Button>
                        <Button size="sm" onClick={handleStatusSave} disabled={saving || deleting}>
                          {saving ? '保存中...' : '保存'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </DialogHeader>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add event dialog */}
      <Dialog open={addOpen} onOpenChange={v => { setAddOpen(v); if (!v) resetAddDialog() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>イベントを追加</DialogTitle>
            <DialogDescription>カレンダーに新しいイベントを追加します</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <Label htmlFor="schedule-text" className="text-xs">日程テキスト</Label>
              <Textarea
                id="schedule-text"
                value={scheduleText}
                onChange={e => applyScheduleText(e.target.value)}
                onPaste={handleSchedulePaste}
                placeholder="例: 2026年9月7日（月）～2026年9月11日（金）"
                className="min-h-16 text-sm"
              />
              {scheduleMessage && (
                <p className="text-xs text-muted-foreground">{scheduleMessage}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs">企業</Label>
              <Select value={form.companyId} onValueChange={v => setForm(f => ({ ...f, companyId: v ?? '' }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="選択..." />
                </SelectTrigger>
                <SelectContent>
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.id ?? ''}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">タイトル</Label>
              <Input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="例：ES締切、書類選考..."
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">種別</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as EventType }))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(TYPE_LABELS) as [EventType, string][]).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.allDay}
                onChange={e => {
                  const allDay = e.target.checked
                  setForm(f => ({
                    ...f,
                    allDay,
                    start: allDay ? toDateValue(f.start) : toDateTimeValue(f.start),
                    end: allDay ? toDateValue(f.end) : toDateTimeValue(f.end),
                  }))
                }}
                className="h-3.5 w-3.5"
              />
              終日（時刻を指定しない）
            </label>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">{form.allDay ? '開始日' : '開始日時'}</Label>
                <Input
                  type={form.allDay ? 'date' : 'datetime-local'}
                  value={form.allDay ? toDateValue(form.start) : toDateTimeValue(form.start)}
                  onChange={e => setForm(f => ({ ...f, start: e.target.value }))}
                />
              </div>
              {form.type !== 'deadline' && (
                <div className="space-y-1">
                  <Label className="text-xs">{form.allDay ? '終了日' : '終了日時'}</Label>
                  <Input
                    type={form.allDay ? 'date' : 'datetime-local'}
                    value={form.allDay ? toDateValue(form.end) : toDateTimeValue(form.end)}
                    onChange={e => setForm(f => ({ ...f, end: e.target.value }))}
                  />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs">ステータス</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as Status }))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(STATUS_LABELS) as [Status, string][]).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setAddOpen(false)} disabled={adding}>
                キャンセル
              </Button>
              <Button
                size="sm"
                onClick={handleAddSave}
                disabled={adding || !form.companyId || !form.title || !form.start}
              >
                {adding ? '保存中...' : '追加'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
