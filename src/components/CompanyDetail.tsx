'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Trash2, Pencil, Copy, Check, Eye, EyeOff } from 'lucide-react'
import { Company, InternEvent, Status } from '@/types'
import { CompanyFile } from '@/lib/data'
import { updateCompanyNotes, updateEventStatus, deleteEvent, updateEvent, updateCompanyAccount, deleteCompany } from '@/lib/actions'
import { Input } from '@/components/ui/input'

const FILE_ICONS: Record<string, string> = {
  md: '📝', pdf: '📄', xlsx: '📊', xls: '📊', pptx: '📊', ppt: '📊',
}

interface Props {
  company: Company
  events: InternEvent[]
  files: CompanyFile[]
}

const STATUS_LABELS: Record<Status, string> = {
  pending: '未対応',
  applied: '応募済',
  in_progress: '選考中',
  passed: '通過',
  rejected: '不合格',
  done: '完了',
}

const TYPE_LABELS: Record<string, string> = {
  deadline: '締切',
  internship: 'インターン',
  selection: '選考',
  event: 'イベント',
}

export default function CompanyDetail({ company, events, files }: Props) {
  const router = useRouter()
  const [notes, setNotes] = useState(company.notes)
  const [editMode, setEditMode] = useState(false)
  const [editValue, setEditValue] = useState(company.notes)
  const [eventList, setEventList] = useState<InternEvent[]>(events)
  const [eventStatuses, setEventStatuses] = useState<Record<string, Status>>(
    Object.fromEntries(events.map(e => [e.id, e.status]))
  )
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ title: '', type: 'deadline' as InternEvent['type'], start: '', end: '' })
  const [officialUrl, setOfficialUrl] = useState(company.url ?? '')
  const [mypageUrl, setMypageUrl] = useState(company.mypageUrl ?? '')
  const [loginId, setLoginId] = useState(company.loginId ?? '')
  const [webTestType, setWebTestType] = useState(company.webTestType ?? '')
  const [password, setPassword] = useState(company.password ?? '')
  const [showPassword, setShowPassword] = useState(false)
  const [accountEdit, setAccountEdit] = useState(false)
  const [copiedKey, setCopiedKey] = useState<'loginId' | 'password' | null>(null)

  const copyToClipboard = (text: string, key: 'loginId' | 'password') => {
    if (!text) return
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
    } else {
      const el = document.createElement('textarea')
      el.value = text
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(prev => (prev === key ? null : prev)), 1500)
  }
  const [isPending, startTransition] = useTransition()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const sortedEvents = [...eventList].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  )

  const handleSaveNotes = () => {
    startTransition(async () => {
      await updateCompanyNotes(company.id, editValue)
      setNotes(editValue)
      setEditMode(false)
    })
  }

  const handleStatusChange = (eventId: string, status: Status) => {
    setEventStatuses(prev => ({ ...prev, [eventId]: status }))
    startTransition(async () => {
      await updateEventStatus(eventId, status)
    })
  }

  const handleDelete = (eventId: string) => {
    setEventList(prev => prev.filter(e => e.id !== eventId))
    startTransition(async () => {
      await deleteEvent(eventId)
    })
  }

  const handleDeleteCompany = () => {
    const ok = window.confirm(`「${company.name}」を削除します。\n関連イベントとフォルダもすべて削除されます。\nよろしいですか？`)
    if (!ok) return
    startTransition(async () => {
      await deleteCompany(company.id)
      router.push('/companies')
      router.refresh()
    })
  }

  const handleEditOpen = (event: InternEvent) => {
    setEditForm({ title: event.title, type: event.type, start: event.start, end: event.end })
    setEditingId(event.id)
  }

  const handleEditSave = (eventId: string) => {
    setEventList(prev => prev.map(e => e.id === eventId ? { ...e, ...editForm, end: editForm.end || editForm.start } : e))
    setEditingId(null)
    startTransition(async () => {
      await updateEvent(eventId, { ...editForm, end: editForm.end || editForm.start })
    })
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      ...(dateStr.includes('T') ? { hour: '2-digit', minute: '2-digit' } : {}),
    })
  }

  const isPast = (dateStr: string) => new Date(dateStr) < today

  return (
    <div className="p-4 sm:p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-4 h-4 rounded-full flex-shrink-0"
          style={{ backgroundColor: company.color }}
        />
        <h1 className="text-xl sm:text-2xl font-bold flex-1 min-w-0 truncate">{company.name}</h1>
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {mypageUrl && (
            <a href={mypageUrl} target="_blank" rel="noopener noreferrer"
              className="text-sm text-primary hover:underline whitespace-nowrap">
              マイページ ↗
            </a>
          )}
          {officialUrl && (
            <a href={officialUrl} target="_blank" rel="noopener noreferrer"
              className="text-sm text-primary hover:underline whitespace-nowrap">
              公式サイト ↗
            </a>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
            onClick={handleDeleteCompany}
            disabled={isPending}
            title="企業を削除"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Account info */}
      <div className="mb-6 p-3 rounded-lg border bg-card">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">アカウント情報</span>
          {!accountEdit ? (
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setAccountEdit(true)}>編集</Button>
          ) : (
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setAccountEdit(false)} disabled={isPending}>キャンセル</Button>
              <Button size="sm" className="h-6 text-xs" disabled={isPending} onClick={() => {
                startTransition(async () => {
                  await updateCompanyAccount(company.id, mypageUrl, loginId, officialUrl, webTestType, password)
                  setAccountEdit(false)
                })
              }}>保存</Button>
            </div>
          )}
        </div>
        {accountEdit ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-20 flex-shrink-0">公式サイト</span>
              <Input value={officialUrl} onChange={e => setOfficialUrl(e.target.value)} className="h-7 text-xs" placeholder="https://..." />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-20 flex-shrink-0">マイページURL</span>
              <Input value={mypageUrl} onChange={e => setMypageUrl(e.target.value)} className="h-7 text-xs" placeholder="https://..." />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-20 flex-shrink-0">ログインID</span>
              <Input value={loginId} onChange={e => setLoginId(e.target.value)} className="h-7 text-xs" placeholder="メールアドレスなど" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-20 flex-shrink-0">Webテスト</span>
              <Input value={webTestType} onChange={e => setWebTestType(e.target.value)} className="h-7 text-xs" placeholder="SPI・玉手箱・TG-WEBなど" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-20 flex-shrink-0">パスワード</span>
              <Input value={password} onChange={e => setPassword(e.target.value)} className="h-7 text-xs" placeholder="マイページパスワード" />
            </div>
          </div>
        ) : (
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-20 flex-shrink-0">公式サイト</span>
              {officialUrl
                ? <a href={officialUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">{officialUrl}</a>
                : <span className="text-muted-foreground italic">未設定</span>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-20 flex-shrink-0">マイページ</span>
              {mypageUrl
                ? <a href={mypageUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">{mypageUrl}</a>
                : <span className="text-muted-foreground italic">未設定</span>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-20 flex-shrink-0">ログインID</span>
              {loginId ? (
                <div className="flex items-center gap-1">
                  <span className="font-mono">{loginId}</span>
                  <button
                    onClick={() => copyToClipboard(loginId, 'loginId')}
                    title="コピー"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {copiedKey === 'loginId' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              ) : <span className="text-muted-foreground italic">未設定</span>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-20 flex-shrink-0">Webテスト</span>
              {webTestType
                ? <span className="font-medium">{webTestType}</span>
                : <span className="text-muted-foreground italic">未設定</span>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-20 flex-shrink-0">パスワード</span>
              {password ? (
                <div className="flex items-center gap-1">
                  <span className="font-mono">{showPassword ? password : '••••••••'}</span>
                  <button
                    onClick={() => setShowPassword(v => !v)}
                    title={showPassword ? '隠す' : '表示'}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={() => copyToClipboard(password, 'password')}
                    title="コピー"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {copiedKey === 'password' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              ) : <span className="text-muted-foreground italic">未設定</span>}
            </div>
          </div>
        )}
      </div>

      <Tabs defaultValue="events">
        <TabsList className="mb-4">
          <TabsTrigger value="events">イベント</TabsTrigger>
          <TabsTrigger value="notes">メモ</TabsTrigger>
          <TabsTrigger value="files">ファイル {files.length > 0 && `(${files.length})`}</TabsTrigger>
        </TabsList>

        {/* Events Tab */}
        <TabsContent value="events">
          <div className="space-y-2">
            {sortedEvents.length === 0 && (
              <p className="text-muted-foreground text-sm">イベントがありません</p>
            )}
            {sortedEvents.map(event => {
              const past = isPast(event.start)
              const isDeadline = event.type === 'deadline'
              const currentStatus = eventStatuses[event.id]
              const isEditing = editingId === event.id

              if (isEditing) {
                return (
                  <div key={event.id} className="flex items-center gap-2 p-3 rounded-lg border bg-card flex-wrap">
                    <div
                      className="w-1 h-10 rounded-full flex-shrink-0"
                      style={{ backgroundColor: company.color }}
                    />
                    <Input
                      value={editForm.title}
                      onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                      className="h-8 text-sm flex-1 min-w-[120px]"
                    />
                    <Select value={editForm.type} onValueChange={v => setEditForm(f => ({ ...f, type: v as InternEvent['type'] }))}>
                      <SelectTrigger className="h-8 text-xs w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TYPE_LABELS).map(([val, label]) => (
                          <SelectItem key={val} value={val} className="text-xs">{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="date"
                      value={editForm.start.split('T')[0]}
                      onChange={e => setEditForm(f => ({ ...f, start: e.target.value }))}
                      className="h-8 text-xs w-36"
                    />
                    {editForm.type !== 'deadline' && (
                      <Input
                        type="date"
                        value={editForm.end.split('T')[0]}
                        onChange={e => setEditForm(f => ({ ...f, end: e.target.value }))}
                        className="h-8 text-xs w-36"
                      />
                    )}
                    <div className="flex gap-1 ml-auto">
                      <Button variant="ghost" size="sm" onClick={() => setEditingId(null)} disabled={isPending}>
                        キャンセル
                      </Button>
                      <Button size="sm" onClick={() => handleEditSave(event.id)} disabled={isPending || !editForm.title || !editForm.start}>
                        保存
                      </Button>
                    </div>
                  </div>
                )
              }

              return (
                <div
                  key={event.id}
                  className={`flex gap-2 sm:gap-3 p-3 rounded-lg border ${past ? 'opacity-50' : ''} bg-card`}
                >
                  {/* Type indicator */}
                  <div
                    className="w-1 rounded-full flex-shrink-0 self-stretch"
                    style={{ backgroundColor: company.color }}
                  />

                  {/* Content area: stacks on mobile, row on desktop */}
                  <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2">
                    {/* Date */}
                    <div className="sm:w-36 sm:flex-shrink-0">
                      <div className={`text-sm font-medium ${past ? 'text-muted-foreground line-through' : ''}`}>
                        {formatDate(event.start)}
                      </div>
                      {event.end && event.end !== event.start && !isDeadline && (
                        <div className="text-xs text-muted-foreground">
                          〜 {formatDate(event.end)}
                        </div>
                      )}
                    </div>

                    {/* Title & type */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isDeadline && <span className="text-sm">⚠</span>}
                        <span className="text-sm font-medium">{event.title}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex-shrink-0">
                          {TYPE_LABELS[event.type]}
                        </span>
                      </div>
                    </div>

                    {/* Status selector + actions */}
                    <div className="flex items-center gap-2">
                      <Select
                        value={currentStatus}
                        onValueChange={(v) => handleStatusChange(event.id, v as Status)}
                        disabled={isPending}
                      >
                        <SelectTrigger className="h-8 text-xs w-full sm:w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.entries(STATUS_LABELS) as [Status, string][]).map(([val, label]) => (
                            <SelectItem key={val} value={val} className="text-xs">
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-shrink-0 h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => handleEditOpen(event)}
                        disabled={isPending}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-shrink-0 h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(event.id)}
                        disabled={isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-muted-foreground">メモ</h2>
              {!editMode ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditValue(notes)
                    setEditMode(true)
                  }}
                >
                  編集
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditMode(false)}
                    disabled={isPending}
                  >
                    キャンセル
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveNotes}
                    disabled={isPending}
                  >
                    {isPending ? '保存中...' : '保存'}
                  </Button>
                </div>
              )}
            </div>

            {editMode ? (
              <Textarea
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                className="min-h-64 font-mono text-sm"
                placeholder="Markdownで記入..."
              />
            ) : (
              <div className="prose prose-sm max-w-none border rounded-lg p-4 bg-card min-h-32">
                {notes ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{notes}</ReactMarkdown>
                ) : (
                  <p className="text-muted-foreground italic">メモなし</p>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files">
          {files.length === 0 ? (
            <p className="text-sm text-muted-foreground">ファイルがありません</p>
          ) : (
            <ul className="space-y-2">
              {files.map(f => (
                <li key={f.name} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  <span className="text-lg flex-shrink-0">{FILE_ICONS[f.ext] ?? '📎'}</span>
                  <span className="flex-1 text-sm font-medium truncate">{f.name}</span>
                  <a
                    href={`/api/open?path=${encodeURIComponent(f.relativePath)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0"
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                    >
                      開く
                    </Button>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
