'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { addCompany } from '@/lib/actions'
import { CategoryDef, Company } from '@/types'
import { pickUnusedColor } from '@/lib/utils'
import ColorPicker from '@/components/ColorPicker'

interface Props {
  categories: CategoryDef[]
  companies: Company[]
}

export default function AddCompanyDialog({ categories, companies }: Props) {
  const router = useRouter()
  const defaultCategory = categories[0]?.id ?? ''

  const colorsByCategory = (catId: string) =>
    companies.filter(c => c.category === catId).map(c => c.color)

  const initialForm = () => ({
    id: '',
    name: '',
    category: defaultCategory,
    color: pickUnusedColor(colorsByCategory(defaultCategory)),
    url: '',
    mypageUrl: '',
    loginId: '',
    webTestType: '',
    password: '',
  })

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [colorTouched, setColorTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // カテゴリ変更時、色未編集なら自動で同業界の未使用色に切り替え
  useEffect(() => {
    if (colorTouched) return
    setForm(f => ({ ...f, color: pickUnusedColor(colorsByCategory(f.category)) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.category])

  const reset = () => {
    setForm(initialForm())
    setColorTouched(false)
    setError('')
  }

  const handleSave = async () => {
    if (!form.id || !form.name || !form.category) return
    setSaving(true)
    setError('')
    try {
      await addCompany(form)
      setOpen(false)
      reset()
      router.refresh()
    } catch {
      setError('このIDはすでに使われています')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>＋ 企業を追加</Button>

      <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) reset() }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>企業を追加</DialogTitle>
            <DialogDescription>新しい企業をリストに追加します</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <Label className="text-xs">ID（英数字・URL用）</Label>
              <Input
                value={form.id}
                onChange={e => setForm(f => ({ ...f, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                placeholder="例: mizuho, sony"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">企業名</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="例: みずほ銀行"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">カテゴリ</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v ?? f.category }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">カラー（同業界で未使用の色を自動選択）</Label>
              <ColorPicker
                value={form.color}
                onChange={c => { setForm(f => ({ ...f, color: c })); setColorTouched(true) }}
                usedColors={colorsByCategory(form.category)}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">公式サイトURL（任意）</Label>
              <Input
                value={form.url}
                onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">マイページURL（任意）</Label>
              <Input
                value={form.mypageUrl}
                onChange={e => setForm(f => ({ ...f, mypageUrl: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">ログインID（任意）</Label>
              <Input
                value={form.loginId}
                onChange={e => setForm(f => ({ ...f, loginId: e.target.value }))}
                placeholder="メールアドレスなど"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">パスワード（任意）</Label>
              <Input
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="マイページパスワード"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Webテスト種別（任意）</Label>
              <Input
                value={form.webTestType}
                onChange={e => setForm(f => ({ ...f, webTestType: e.target.value }))}
                placeholder="SPI・玉手箱・TG-WEBなど"
              />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={saving}>キャンセル</Button>
              <Button size="sm" onClick={handleSave} disabled={saving || !form.id || !form.name}>
                {saving ? '保存中...' : '追加'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
