import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { InternEvent } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 企業/業界用のカラーパレット。見分けやすい色相を選定。
 * Tailwind の 500 番台ベース。
 */
export const COLOR_PALETTE: string[] = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#10b981', // emerald
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
]

/**
 * 既に使われている色を避けて、パレットから1色選ぶ。
 * - 未使用の色があればそれを返す
 * - 全て使用済なら、最も使用回数の少ない色を返す
 */
export function pickUnusedColor(usedColors: string[]): string {
  const norm = (c: string) => c.toLowerCase()
  const usedCount = new Map<string, number>()
  for (const c of usedColors) {
    const k = norm(c)
    usedCount.set(k, (usedCount.get(k) ?? 0) + 1)
  }
  let best = COLOR_PALETTE[0]
  let bestCount = Infinity
  for (const c of COLOR_PALETTE) {
    const k = norm(c)
    const count = usedCount.get(k) ?? 0
    if (count < bestCount) {
      bestCount = count
      best = c
      if (count === 0) break
    }
  }
  return best
}

export type CompanyStatus = 'in_progress' | 'passed' | 'rejected' | 'not_applied' | 'done'

export const COMPANY_STATUS_META: Record<CompanyStatus, {
  label: string
  description: string
  color: string
  badge: string
  ring: string
}> = {
  in_progress: {
    label: '選考中',
    description: '応募済 / 選考プロセス進行中',
    color: '#16a34a',
    badge: 'bg-green-100 text-green-800 border-green-300',
    ring: 'ring-green-400',
  },
  passed: {
    label: '通過 / 内定',
    description: '通過実績あり、不合格イベントなし',
    color: '#0ea5e9',
    badge: 'bg-sky-100 text-sky-800 border-sky-300',
    ring: 'ring-sky-400',
  },
  not_applied: {
    label: '未応募',
    description: 'まだ応募していない / 締切のみ登録',
    color: '#f59e0b',
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
    ring: 'ring-amber-400',
  },
  rejected: {
    label: '不合格',
    description: '選考結果が不合格で終了',
    color: '#dc2626',
    badge: 'bg-red-100 text-red-800 border-red-300',
    ring: 'ring-red-400',
  },
  done: {
    label: '完了',
    description: '選考完了 / 辞退などで終了',
    color: '#6b7280',
    badge: 'bg-gray-100 text-gray-700 border-gray-300',
    ring: 'ring-gray-400',
  },
}

/**
 * イベント群から企業単位のステータスを導出する。
 * 説明会など type='event' のイベントは選考に直接関係しないため判定から除外する。
 * 優先度: in_progress > passed > rejected > done > not_applied
 */
export function deriveCompanyStatus(events: InternEvent[]): CompanyStatus {
  const selectionEvents = events.filter(e => e.type !== 'event')
  if (selectionEvents.length === 0) return 'not_applied'
  const has = (s: InternEvent['status']) => selectionEvents.some(e => e.status === s)
  if (has('in_progress') || has('applied')) return 'in_progress'
  if (has('passed')) return 'passed'
  if (selectionEvents.every(e => e.status === 'pending')) return 'not_applied'
  if (has('rejected') && !has('done')) return 'rejected'
  if (has('done')) return 'done'
  return 'not_applied'
}
