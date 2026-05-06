'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { addCategory } from '@/lib/actions'

const EMPTY = { id: '', label: '', color: '#6366f1' }

export default function AddCategoryDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleLabelChange = (label: string) => {
    const id = label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    setForm(f => ({ ...f, label, id }))
  }

  const handleSave = async () => {
    if (!form.id || !form.label) return
    setSaving(true)
    setError('')
    try {
      await addCategory(form)
      setOpen(false)
      setForm(EMPTY)
      router.refresh()
    } catch {
      setError('このIDはすでに使われています')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>＋ 業界を追加</Button>

      <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) { setForm(EMPTY); setError('') } }}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>業界を追加</DialogTitle>
            <DialogDescription>新しい業界カテゴリを追加します</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <Label className="text-xs">業界名</Label>
              <Input
                value={form.label}
                onChange={e => handleLabelChange(e.target.value)}
                placeholder="例: コンサル、通信"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">ID（自動生成・変更可）</Label>
              <Input
                value={form.id}
                onChange={e => setForm(f => ({ ...f, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                placeholder="例: consulting"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">カラー</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.color}
                  onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                  className="w-8 h-8 rounded cursor-pointer border"
                />
                <span className="text-xs text-muted-foreground font-mono">{form.color}</span>
              </div>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={saving}>キャンセル</Button>
              <Button size="sm" onClick={handleSave} disabled={saving || !form.id || !form.label}>
                {saving ? '保存中...' : '追加'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
