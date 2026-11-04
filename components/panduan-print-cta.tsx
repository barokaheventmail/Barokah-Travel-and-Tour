'use client'

import { Download } from 'lucide-react'

import { PrintButton } from '@/components/admin/print-button'
import { useViewportCompensation } from '@/components/use-viewport-compensation'

export function PanduanPrintCta() {
  const c = useViewportCompensation()

  return (
    <div className="text-center">
      <span
        className="mx-auto flex items-center justify-center rounded-full bg-[#eef4fb] text-[#1b4f9c]"
        style={{ width: `${48 * c}px`, height: `${48 * c}px` }}
      >
        <Download size={Math.round(20 * c)} />
      </span>
      <div className="flex flex-col items-center justify-center" style={{ marginTop: `${16 * c}px` }}>
        <PrintButton scale={c} />
      </div>
    </div>
  )
}
