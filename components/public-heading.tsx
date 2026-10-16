import type { ReactNode } from 'react'

/**
 * Judul section panduan peserta + keterangan orange/hijau di sebelahnya,
 * dipisah garis vertikal — gaya yang sama dengan "Keterangan Denah Duduk".
 * Keterangan kosong = hanya judul yang tampil.
 */
export function PublicHeading({
  title,
  keterangan,
  keterangan2,
  className = '',
  captionClassName = 'text-base',
}: {
  title: ReactNode
  keterangan?: string | null
  keterangan2?: string | null
  className?: string
  captionClassName?: string
}) {
  const ket1 = (keterangan ?? '').trim()
  const ket2 = (keterangan2 ?? '').trim()
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <div className="min-w-0">{title}</div>
      {(ket1 || ket2) && (
        <div className="flex items-center gap-3">
          <span aria-hidden className="h-9 w-0.5 shrink-0 bg-[#00A3E0]" />
          <div className="flex flex-col text-left leading-tight">
            {ket1 && (
              <p className={`font-bold uppercase tracking-wide text-[#e8830c] ${captionClassName}`}>{ket1}</p>
            )}
            {ket2 && (
              <p className={`font-bold uppercase tracking-wide text-[#2ca84a] ${captionClassName}`}>{ket2}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
