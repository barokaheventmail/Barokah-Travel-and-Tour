'use client'

import { Loader2, ShieldAlert, Trash2 } from 'lucide-react'

/**
 * Konfirmasi untuk aksi yang menimpa SELURUH unit di satu event (hapus massal
 * layout kursi / fasilitas). Sengaja memakai modal dengan tombol Batal, bukan
 * two-step button seperti aksi per-unit: dampaknya jauh lebih luas sehingga
 * admin harus punya jalan keluar tanpa menjalankan request.
 *
 * `impact` ditulis tegas karena ini satu-satunya kesempatan admin membaca
 * konsekuensi sebelum data hilang.
 */
export function ConfirmBulkDialog({
  open,
  title,
  impact,
  note,
  error,
  confirmLabel,
  loading,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  impact: string
  note?: string
  error?: string | null
  confirmLabel: string
  loading: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={loading ? undefined : onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="animate-fade-up w-full max-w-sm rounded-2xl border border-[#dfe4e8] bg-white p-5 shadow-xl"
      >
        <h3 className="text-sm font-bold text-[#1b3555]">{title}</h3>

        <div className="mt-3 flex items-start gap-2 rounded-2xl bg-[#fdf0f0] p-4">
          <ShieldAlert className="mt-0.5 shrink-0 text-[#c03a3a]" size={16} />
          <div>
            <p className="text-xs font-bold text-[#c03a3a]">{impact}</p>
            {note && <p className="mt-1 text-[11px] font-semibold text-[#a04545]">{note}</p>}
          </div>
        </div>

        {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-full border border-[#dfe4e8] px-4 py-2 text-xs font-bold text-[#657080] transition-colors hover:bg-[#f1f3f5] disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-full bg-[#c03a3a] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#a93226] active:scale-95 disabled:opacity-60"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
