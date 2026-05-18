'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deleteCategory } from '@/lib/actions'

interface Props {
  id: string
  label: string
  disabled?: boolean
}

export default function DeleteCategoryButton({ id, label, disabled }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleClick = () => {
    if (disabled) {
      window.alert('この業界には企業が残っているため削除できません。\n先に企業を削除してください。')
      return
    }
    const ok = window.confirm(`業界「${label}」を削除します。\nよろしいですか？`)
    if (!ok) return
    startTransition(async () => {
      try {
        await deleteCategory(id)
        router.refresh()
      } catch {
        window.alert('削除に失敗しました。所属企業がある可能性があります。')
      }
    })
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
      onClick={handleClick}
      disabled={isPending}
      title={disabled ? '企業がある業界は削除できません' : '業界を削除'}
    >
      <Trash2 className="w-3.5 h-3.5" />
    </Button>
  )
}
