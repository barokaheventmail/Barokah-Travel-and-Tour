'use client'

import { DownloadPagePdf } from '@/components/admin/download-page-pdf'

export function PanduanPrintCta({ targetId, fileName }: { targetId: string; fileName: string }) {
  return (
    <DownloadPagePdf
      targetId={targetId}
      fileName={fileName}
      label="Cetak / Simpan PDF"
      hint="PDF langsung terunduh · kertas A4 · tampilan sama seperti panduan."
    />
  )
}
