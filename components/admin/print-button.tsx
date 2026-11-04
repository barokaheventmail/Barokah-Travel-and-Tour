'use client'

import { Printer } from 'lucide-react'

export function PrintButton({ label = 'Cetak / Simpan PDF', scale = 1 }: { label?: string; scale?: number } = {}) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex items-center rounded-full bg-[#f5b915] font-bold text-[#1d2733] transition-colors duration-200 hover:bg-[#e4aa09] active:scale-95 print:hidden"
      style={{
        gap: `${8 * scale}px`,
        paddingLeft: `${20 * scale}px`,
        paddingRight: `${20 * scale}px`,
        paddingTop: `${10 * scale}px`,
        paddingBottom: `${10 * scale}px`,
        fontSize: `${14 * scale}px`,
      }}
    >
      <Printer size={Math.round(15 * scale)} /> {label}
    </button>
  )
}
