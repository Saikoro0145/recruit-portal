'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Copy, Check, Eye, EyeOff, ExternalLink } from 'lucide-react'
import { Settings } from '@/types'
import { updateSpiCredentials } from '@/lib/actions'

interface Props {
  settings: Settings
}

export default function SettingsClient({ settings }: Props) {
  const [spiMypageUrl, setSpiMypageUrl] = useState(settings.spiMypageUrl ?? '')
  const [spiTestCenterId, setSpiTestCenterId] = useState(settings.spiTestCenterId ?? '')
  const [spiPassword, setSpiPassword] = useState(settings.spiPassword ?? '')
  const [editMode, setEditMode] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [copiedKey, setCopiedKey] = useState<'spiId' | 'spiPassword' | null>(null)
  const [isPending, startTransition] = useTransition()

  const hasValues = !!(spiMypageUrl || spiTestCenterId || spiPassword)

  const copyToClipboard = (text: string, key: 'spiId' | 'spiPassword') => {
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

  const handleSave = () => {
    startTransition(async () => {
      await updateSpiCredentials(spiMypageUrl, spiTestCenterId, spiPassword)
      setEditMode(false)
    })
  }

  const handleCancel = () => {
    setSpiMypageUrl(settings.spiMypageUrl ?? '')
    setSpiTestCenterId(settings.spiTestCenterId ?? '')
    setSpiPassword(settings.spiPassword ?? '')
    setEditMode(false)
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      <h1 className="text-xl sm:text-2xl font-bold mb-6">設定</h1>

      <section className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold">SPIテストセンター</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              共通のテストセンターID・パスワードを保存します
            </p>
          </div>
          {!editMode ? (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditMode(true)}>
              編集
            </Button>
          ) : (
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleCancel} disabled={isPending}>
                キャンセル
              </Button>
              <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={isPending}>
                {isPending ? '保存中...' : '保存'}
              </Button>
            </div>
          )}
        </div>

        {editMode ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">マイページURL</Label>
              <Input
                value={spiMypageUrl}
                onChange={e => setSpiMypageUrl(e.target.value)}
                className="h-8 text-sm"
                placeholder="https://..."
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">テストセンターID</Label>
              <Input
                value={spiTestCenterId}
                onChange={e => setSpiTestCenterId(e.target.value)}
                className="h-8 text-sm"
                placeholder="例: 1234567890"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">パスワード</Label>
              <Input
                value={spiPassword}
                onChange={e => setSpiPassword(e.target.value)}
                className="h-8 text-sm"
                placeholder="SPIテストセンターのパスワード"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-3 gap-2">
              {spiMypageUrl ? (
                <a
                  href={spiMypageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-transparent bg-primary px-2.5 text-[0.8rem] font-medium text-primary-foreground transition-colors hover:bg-primary/80"
                >
                  マイページ
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <Button size="sm" className="h-8" variant="outline" disabled>マイページ未設定</Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => copyToClipboard(spiTestCenterId, 'spiId')}
                disabled={!spiTestCenterId}
              >
                {copiedKey === 'spiId' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                ID
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => copyToClipboard(spiPassword, 'spiPassword')}
                disabled={!spiPassword}
              >
                {copiedKey === 'spiPassword' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                PW
              </Button>
            </div>

            {hasValues ? (
              <div className="rounded-lg border bg-muted/25 px-3 py-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="min-w-0 sm:col-span-2">
                    <div className="text-muted-foreground">マイページURL</div>
                    <div className="mt-0.5 truncate font-mono text-foreground">
                      {spiMypageUrl
                        ? <a href={spiMypageUrl} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">{spiMypageUrl}</a>
                        : <span className="font-sans text-muted-foreground italic">未設定</span>}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-muted-foreground">テストセンターID</div>
                    <div className="mt-0.5 truncate font-mono text-foreground">
                      {spiTestCenterId || <span className="font-sans text-muted-foreground italic">未設定</span>}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-muted-foreground">パスワード</div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="min-w-0 truncate font-mono text-foreground">
                        {spiPassword ? (showPassword ? spiPassword : '••••••••') : <span className="font-sans text-muted-foreground italic">未設定</span>}
                      </span>
                      {spiPassword && (
                        <button
                          onClick={() => setShowPassword(v => !v)}
                          title={showPassword ? '隠す' : '表示'}
                          className="text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground italic">未設定です。「編集」から登録してください。</p>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
