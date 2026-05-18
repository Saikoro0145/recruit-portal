'use client'

import { useState } from 'react'
import { COLOR_PALETTE } from '@/lib/utils'

interface Props {
  value: string
  onChange: (color: string) => void
  /**
   * パレット表示時に「使用済」と分かるよう半透明にする色のリスト。
   * 選択は妨げない。
   */
  usedColors?: string[]
}

export default function ColorPicker({ value, onChange, usedColors = [] }: Props) {
  const [customOpen, setCustomOpen] = useState(false)
  const norm = (c: string) => c.toLowerCase()
  const usedSet = new Set(usedColors.map(norm))
  const isPaletteColor = COLOR_PALETTE.some(c => norm(c) === norm(value))

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-8 gap-1.5">
        {COLOR_PALETTE.map(c => {
          const selected = norm(c) === norm(value)
          const used = usedSet.has(norm(c))
          return (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              aria-label={c}
              title={used ? `${c} (使用済)` : c}
              className={`w-6 h-6 rounded-full border-2 transition-all relative ${
                selected
                  ? 'border-foreground scale-110 shadow'
                  : 'border-transparent hover:scale-110'
              }`}
              style={{
                backgroundColor: c,
                opacity: used && !selected ? 0.4 : 1,
              }}
            >
              {used && !selected && (
                <span className="absolute inset-0 flex items-center justify-center text-white text-[8px]">
                  ●
                </span>
              )}
            </button>
          )
        })}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setCustomOpen(v => !v)}
          className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
        >
          {customOpen ? 'パレットだけ表示' : 'カスタムカラー…'}
        </button>
        {!isPaletteColor && (
          <span className="text-[10px] text-muted-foreground font-mono">
            選択中: {value}
          </span>
        )}
      </div>
      {customOpen && (
        <div className="flex items-center gap-2 pt-1">
          <input
            type="color"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border"
          />
          <span className="text-xs text-muted-foreground font-mono">{value}</span>
        </div>
      )}
    </div>
  )
}
