'use client'

import { useRef } from 'react'
import { Bold, Italic } from 'lucide-react'

const inputCls =
  'w-full rounded-xl border border-[#dfe4e8] bg-white px-4 py-2.5 text-sm font-semibold text-[#1b3555] outline-none transition-colors placeholder:text-[#9aa3af] focus:border-[#1b4f9c] focus:ring-2 focus:ring-[#1b4f9c]/15'

export function RichTextarea({
  value,
  onChange,
  rows = 4,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  rows?: number
  placeholder?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  function wrap(marker: string) {
    const el = ref.current
    if (!el) return
    const start = el.selectionStart ?? value.length
    const end = el.selectionEnd ?? value.length
    const selected = value.slice(start, end) || 'teks'
    const next = value.slice(0, start) + marker + selected + marker + value.slice(end)
    onChange(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + marker.length, start + marker.length + selected.length)
    })
  }

  return (
    <div>
      <div className="mt-1.5 flex items-center gap-1">
        <button
          type="button"
          onClick={() => wrap('**')}
          title="Tebal"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#dfe4e8] bg-white text-[#1b3555] transition-colors hover:bg-[#f1f3f5] active:scale-95"
        >
          <Bold size={14} />
        </button>
        <button
          type="button"
          onClick={() => wrap('*')}
          title="Miring"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#dfe4e8] bg-white text-[#1b3555] transition-colors hover:bg-[#f1f3f5] active:scale-95"
        >
          <Italic size={14} />
        </button>
        <span className="ml-1 text-[11px] text-[#9aa3af]">Pilih teks lalu klik B / I</span>
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className={`${inputCls} mt-2 resize-y`}
      />
    </div>
  )
}
