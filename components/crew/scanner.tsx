'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { BadgeCheck, Camera, CheckCircle2, Keyboard, Loader2, ScanBarcode, ShieldAlert, XCircle } from 'lucide-react'
import { decodeToken } from '@/lib/scan'

type ScanResult = {
  ok: boolean
  firstScan: boolean
  alreadyAttended: boolean
  attendedAt: string | null
  scannedBy: string | null
  participant: {
    name: string
    order: number
    seat: string | null
    room: string | null
    vw: string | null
    busName: string
    eventTitle: string
  }
}

type ScanBlock =
  | {
      code: 'WRONG_BUS'
      error: string
      participant: { name: string; busName: string; eventTitle: string }
      assignments: { busName: string; eventTitle: string }[]
    }
  | {
      code: 'NO_ASSIGNMENT'
      error: string
    }

const SCANNER_ID = 'crew-qr-reader'

export function CrewScanner({ username }: { username: string }) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [scanning, setScanning] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [block, setBlock] = useState<ScanBlock | null>(null)
  const [manualMode, setManualMode] = useState(false)
  const [manualToken, setManualToken] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    return () => {
      try {
        scannerRef.current?.stop()
        scannerRef.current?.clear()
      } catch {
        // ignore
      }
    }
  }, [])

  function handleDecoded(payload: string, autoClock = true) {
    const token = decodeToken(payload)
    if (!token) {
      setError('QR tidak valid. Coba lagi.')
      return
    }
    if (autoClock) stopCamera()
    processScan(token)
  }

  async function processScan(token: string, clearInput?: () => void) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/crew/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data?.code === 'WRONG_BUS' || data?.code === 'NO_ASSIGNMENT') {
          setBlock(data as ScanBlock)
          return
        }
        throw new Error(typeof data.error === 'string' ? data.error : 'Terjadi kesalahan.')
      }
      setResult(data as ScanResult)
      clearInput?.()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('crew:scan-done'))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.')
    } finally {
      setBusy(false)
    }
  }

  async function startCamera() {
    if (starting || scanning) return
    setStarting(true)
    setError(null)
    try {
      const scanner = new Html5Qrcode(SCANNER_ID, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      })
      scannerRef.current = scanner
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => handleDecoded(decodedText),
        () => {},
      )
      setScanning(true)
      setResult(null)
    } catch (err) {
      setError(
        'Tidak dapat mengakses kamera. Pastikan izinkan kamera di browser, atau gunakan input manual.',
      )
      console.error(err)
    } finally {
      setStarting(false)
    }
  }

  async function stopCamera() {
    try {
      scannerRef.current?.stop()
      scannerRef.current?.clear()
    } catch {
      // ignore
    }
    scannerRef.current = null
    setScanning(false)
  }

  function scanAgain() {
    setResult(null)
    setError(null)
    if (manualMode) return
    startCamera()
  }

  function dismissBlock(rescan: boolean) {
    setBlock(null)
    setError(null)
    setResult(null)
    if (rescan) startCamera()
  }

  async function submitManual(e: React.FormEvent) {
    e.preventDefault()
    const value = manualToken.trim()
    if (!value) return
    const token = decodeToken(value)
    if (!token) {
      setError('Input tidak valid. Cek token atau No. Tiket yang dimasukkan.')
      return
    }
    processScan(token, () => setManualToken(''))
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-center gap-2">
          {manualMode ? (
            <Keyboard size={18} className="text-[#1b4f9c]" />
          ) : (
            <ScanBarcode size={18} className="text-[#1b4f9c]" />
          )}
          <h2 className="text-sm font-bold text-[#1b3555]">{manualMode ? 'Input Manual' : 'Kamera QR'}</h2>
        </div>

        {/* Kamera area */}
        {!manualMode && (
          <div className="relative mt-4 overflow-hidden rounded-2xl border-2 border-dashed border-[#1b4f9c] bg-[#0f2a52]">
            <div id={SCANNER_ID} className="mx-auto aspect-square w-full" />
            {!scanning && (
              <button
                type="button"
                onClick={startCamera}
                disabled={starting || busy}
                className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm font-bold text-white transition-colors duration-200 hover:bg-white/10 active:scale-[0.99] disabled:opacity-60"
              >
                {starting ? (
                  <>
                    <Loader2 size={20} className="animate-spin" /> Mengaktifkan kamera…
                  </>
                ) : (
                  <>
                    <Camera size={20} /> Nyalakan Kamera
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Manual input */}
        {manualMode && (
          <form onSubmit={submitManual} className="mt-4 space-y-3">
            <input
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              placeholder="Tempel QR (BTHT:…), No. Tiket (BTH-26-XXXXX), atau tautan tiket (…/tiket/…)"
              className="w-full rounded-xl border border-[#dfe4e8] bg-[#f8fafc] px-4 py-3 text-sm font-semibold text-[#1b3555] outline-none placeholder:text-[#9aa3af] focus:border-[#1b4f9c] focus:bg-white focus:ring-2 focus:ring-[#1b4f9c]/15"
            />
            <button
              type="submit"
              disabled={busy || !manualToken.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1b4f9c] py-3 text-sm font-bold text-white transition-colors duration-200 hover:bg-[#143d79] active:scale-[0.98] disabled:opacity-60"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Keyboard size={15} />}
              Proses Token
            </button>
          </form>
        )}

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#edf0f3] pt-4">
          <button
            type="button"
            onClick={() => {
              if (!manualMode && scanning) stopCamera()
              setManualMode((m) => !m)
            }}
            className="rounded-full border border-[#dfe4e8] px-4 py-2 text-xs font-bold text-[#657080] transition-colors hover:bg-[#f1f3f5]"
          >
            {manualMode ? 'Beralih ke Kamera' : 'Input Manual'}
          </button>
          {scanning && (
            <button
              type="button"
              onClick={() => stopCamera()}
              className="rounded-full border border-red-200 px-4 py-2 text-xs font-bold text-red-600 transition-colors hover:bg-red-50"
            >
              Matikan Kamera
            </button>
          )}
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 p-4 text-xs font-semibold text-red-600">
            <XCircle className="mt-0.5 shrink-0" size={16} />
            {error}
          </div>
        )}
      </div>

      {/* Hasil scan */}
      {result && (
        <div className="animate-fade-up rounded-2xl bg-white p-6 shadow-2xl">
          <div className="flex items-center gap-3">
            {result.alreadyAttended ? (
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fff7e0] text-[#b98a12]">
                <BadgeCheck size={22} />
              </span>
            ) : (
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e6f4ea] text-[#2ca84a]">
                <CheckCircle2 size={22} />
              </span>
            )}
            <div>
              <p className={`text-base font-black ${result.alreadyAttended ? 'text-[#b98a12]' : 'text-[#2ca84a]'}`}>
                {result.alreadyAttended ? 'Sudah Terabsen' : 'Hadir Tercatat ✓'}
              </p>
              <p className="text-xs text-[#657080]">
                {result.alreadyAttended
                  ? `Kehadiran diinput ${result.scannedBy ? `oleh ${result.scannedBy}` : 'sebelumnya'}`
                  : `Kehadiran otomatis tercatat oleh crew ${username}`}
              </p>
            </div>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="col-span-2 rounded-xl bg-[#f8fafc] p-4">
              <dt className="text-xs text-[#657080]">Nama Peserta</dt>
              <dd className="mt-0.5 text-base font-bold text-[#1b3555]">{result.participant.name}</dd>
            </div>
            <div className="rounded-xl bg-[#f8fafc] p-3">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#9aa3af]">Bus</dt>
              <dd className="mt-0.5 font-bold text-[#1b4f9c]">{result.participant.busName}</dd>
            </div>
            <div className="rounded-xl bg-[#f8fafc] p-3">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#9aa3af]">Kursi</dt>
              <dd className="mt-0.5 font-semibold text-[#1b3555]">
                {result.participant.seat ?? '—'}
              </dd>
            </div>
            <div className="col-span-2 rounded-xl bg-[#f8fafc] p-3">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#9aa3af]">Event</dt>
              <dd className="mt-0.5 font-semibold text-[#1b3555]">{result.participant.eventTitle}</dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={scanAgain}
            disabled={busy}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#2ca84a] py-3 text-sm font-bold text-white transition-colors duration-200 hover:bg-[#219b42] active:scale-[0.98] disabled:opacity-60"
          >
            <ScanBarcode size={15} /> Scan Berikutnya
          </button>
        </div>
      )}

      <p className="px-4 text-center text-[11px] text-white/50">
        Valid scan otomatis menandai kehadiran peserta di panel admin.
      </p>

      {/* Popup scan ditolak (bukan unit / belum ditugaskan) */}
      {block && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-5 backdrop-blur-sm">
          <div className="animate-fade-up w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                <ShieldAlert size={22} />
              </span>
              <div>
                <h3 className="text-sm font-black text-[#8b1e1e]">
                  {block.code === 'WRONG_BUS' ? 'Bukan Unit Kamu' : 'Belum Ada Tugas'}
                </h3>
                <p className="mt-1 text-xs font-semibold text-[#657080]">
                  {block.code === 'WRONG_BUS'
                    ? 'Scan ditolak. Peserta ini tidak tercatat di unit yang kamu pegang.'
                    : block.error}
                </p>
              </div>
            </div>

            {block.code === 'WRONG_BUS' && (
              <div className="mt-4 space-y-2 rounded-2xl bg-[#f8fafc] p-4">
                <div className="rounded-xl border-l-4 border-red-400 bg-red-50 px-3 py-2">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[#9aa3af]">Peserta ini di</p>
                  <p className="text-sm font-bold text-[#1b3555]">
                    Unit {block.participant.busName}
                    <span className="font-semibold text-[#657080]"> · {block.participant.eventTitle}</span>
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-[#657080]">{block.participant.name}</p>
                </div>
                <div className="rounded-xl px-3 py-2">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[#9aa3af]">Unit yang kamu pegang</p>
                  {block.assignments.map((a, i) => (
                    <p key={i} className="text-xs font-bold text-[#2ca84a]">
                      • {a.busName} · {a.eventTitle}
                    </p>
                  ))}
                </div>
                <p className="rounded-xl bg-[#eef3fb] px-3 py-2 text-xs font-semibold text-[#1b4f9c]">
                  Arahkan peserta ke unit <span className="font-bold">{block.participant.busName}</span> sesuai dengan
                  kursi yang tertera di tiketnya.
                </p>
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => dismissBlock(false)}
                className="rounded-full border border-[#dfe4e8] px-4 py-2 text-xs font-bold text-[#657080] transition-colors hover:bg-[#f1f3f5]"
              >
                Tutup
              </button>
              {block.code === 'WRONG_BUS' && (
                <button
                  type="button"
                  onClick={() => dismissBlock(true)}
                  className="rounded-full bg-[#1b4f9c] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#143d79] active:scale-95"
                >
                  <ScanBarcode size={13} className="inline" /> Scan Berikutnya
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}