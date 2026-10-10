'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Check, ChevronDown, Loader2, Plus, Trash2, X } from 'lucide-react'
import { RichTextarea } from './rich-textarea'

export type PaketPriceData = { label: string; price: string; facilities: string[]; badge: string }

export type PaketFormData = {
  title: string
  location: string
  description: string
  subtitle: string
  body: string
  badge: string
  order: number
  prices: PaketPriceData[]
}

const emptyForm: PaketFormData = {
  title: '',
  location: '',
  description: '',
  subtitle: '',
  body: '',
  badge: '',
  order: 0,
  prices: [],
}

const inputCls =
  'mt-1.5 w-full rounded-xl border border-[#dfe4e8] bg-white px-4 py-2.5 text-sm font-semibold text-[#1b3555] outline-none transition-colors placeholder:text-[#9aa3af] focus:border-[#1b4f9c] focus:ring-2 focus:ring-[#1b4f9c]/15'
const labelCls = 'text-xs font-semibold uppercase tracking-wide text-[#657080]'

function Section({
  title,
  desc,
  action,
  children,
}: {
  title: string
  desc?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="border-t border-[#eef1f4] pt-4 first:border-t-0 first:pt-0">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-[#1b3555]">{title}</h3>
          {desc && <p className="mt-0.5 text-[11px] leading-relaxed text-[#9aa3af]">{desc}</p>}
        </div>
        {action}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>
        {label}
        {required && <span className="text-[#c0392b]"> *</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] leading-relaxed text-[#9aa3af]">{hint}</p>}
    </div>
  )
}

export function PaketForm({
  initial,
  onDone,
}: {
  initial?: PaketFormData & { id: string }
  onDone: () => void
}) {
  const router = useRouter()
  const [form, setForm] = useState<PaketFormData>(
    initial
      ? {
          title: initial.title,
          location: initial.location ?? '',
          description: initial.description ?? '',
          subtitle: initial.subtitle ?? '',
          body: initial.body ?? '',
          badge: initial.badge ?? '',
          order: initial.order,
          prices: (initial.prices ?? []).map((p) => ({ label: p.label, price: String(p.price ?? ''), facilities: p.facilities ?? [], badge: p.badge })),
        }
      : emptyForm,
  )
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function set<K extends keyof PaketFormData>(key: K, value: PaketFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function setPrice(index: number, patch: Partial<PaketPriceData>) {
    setForm((f) => ({
      ...f,
      prices: f.prices.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    }))
  }

  function addPrice() {
    setForm((f) => ({ ...f, prices: [...f.prices, { label: '', price: '', facilities: [], badge: '' }] }))
  }

  function removePrice(index: number) {
    setForm((f) => ({ ...f, prices: f.prices.filter((_, i) => i !== index) }))
  }

  function addFacility(index: number) {
    setForm((f) => ({
      ...f,
      prices: f.prices.map((p, i) => (i === index ? { ...p, facilities: [...p.facilities, ''] } : p)),
    }))
  }

  function setFacility(index: number, facilityIndex: number, value: string) {
    setForm((f) => ({
      ...f,
      prices: f.prices.map((p, i) =>
        i === index ? { ...p, facilities: p.facilities.map((v, fi) => (fi === facilityIndex ? value : v)) } : p,
      ),
    }))
  }

  function removeFacility(index: number, facilityIndex: number) {
    setForm((f) => ({
      ...f,
      prices: f.prices.map((p, i) =>
        i === index ? { ...p, facilities: p.facilities.filter((_, fi) => fi !== facilityIndex) } : p,
      ),
    }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const cleanPrices = form.prices
      .map((p) => ({
        label: p.label.trim(),
        price: Number(p.price) || 0,
        facilities: p.facilities.map((f) => f.trim()).filter((f) => f.length > 0),
        badge: p.badge.trim(),
      }))
      .filter((p) => p.label.length > 0)

    setLoading(true)
    try {
      const res = await fetch(initial ? `/api/admin/paket-events/${initial.id}` : '/api/admin/paket-events', {
        method: initial ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, prices: cleanPrices }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal menyimpan.')
      router.refresh()
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Section title="Informasi Dasar" desc="Nama dan lokasi paket yang jadi judul di website.">
        <Field label="Nama Paket" required>
          <input
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            required
            placeholder="Open Trip Ancol–Dufan"
            className={inputCls}
          />
        </Field>
        <Field label="Lokasi">
          <input
            value={form.location}
            onChange={(e) => set('location', e.target.value)}
            placeholder="Graha Barokah, Sukabumi"
            className={inputCls}
          />
        </Field>
      </Section>

      <Section title="Deskripsi" desc="Teks singkat yang tampil di atas gambar banner.">
        <RichTextarea
          value={form.description}
          onChange={(v) => set('description', v)}
          rows={4}
          placeholder="Deskripsi singkat yang tampil di atas gambar…"
        />
      </Section>

      <Section
        title="Daftar Harga & Fasilitas"
        desc="Tambah tiap kategori harga, lalu tambah fasilitasnya dengan tombol + di kanan."
        action={
          <button
            type="button"
            onClick={addPrice}
            className="flex shrink-0 items-center gap-1 rounded-full border border-[#dfe4e8] bg-white px-3 py-1.5 text-xs font-bold text-[#1b3555] transition-colors hover:bg-[#f1f3f5] active:scale-95"
          >
            <Plus size={12} /> Tambah Harga
          </button>
        }
      >
        {form.prices.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#dfe4e8] bg-white px-4 py-3 text-xs text-[#9aa3af]">
            Belum ada harga. Klik &ldquo;Tambah Harga&rdquo;, isi label &amp; harga, lalu tambah fasilitas dengan tombol +.
          </p>
        ) : (
          <div className="space-y-2">
            {form.prices.map((p, i) => (
              <div key={i}>
                <div className="rounded-xl border border-[#e7ebef] bg-white p-3">
                  <div className="flex flex-wrap items-start gap-2">
                  <input
                    value={p.label}
                    onChange={(e) => setPrice(i, { label: e.target.value })}
                    placeholder="Label (mis. Dewasa)"
                    className="min-w-[8rem] flex-1 rounded-lg border border-[#dfe4e8] bg-[#f8fafc] px-3 py-2 text-sm font-semibold text-[#1b3555] outline-none focus:border-[#1b4f9c] focus:bg-white focus:ring-2 focus:ring-[#1b4f9c]/15"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={p.price}
                    onChange={(e) => setPrice(i, { price: e.target.value.replace(/\D/g, '') })}
                    placeholder="Harga (Rp)"
                    className="w-32 rounded-lg border border-[#dfe4e8] bg-[#f8fafc] px-3 py-2 text-sm font-semibold text-[#1b3555] outline-none focus:border-[#1b4f9c] focus:bg-white focus:ring-2 focus:ring-[#1b4f9c]/15"
                  />
                  <input
                    value={p.badge}
                    onChange={(e) => setPrice(i, { badge: e.target.value })}
                    placeholder="Pita (mis. Populer)"
                    className="min-w-[7rem] flex-1 rounded-lg border border-[#f0dca0] bg-[#fffdf5] px-3 py-2 text-sm font-semibold text-[#1b3555] outline-none focus:border-[#f5b915] focus:ring-2 focus:ring-[#f5b915]/20"
                  />
                  <button
                    type="button"
                    onClick={() => removePrice(i)}
                    title="Hapus baris harga"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#f0c4c4] bg-white text-[#c0392b] transition-colors hover:bg-[#fdecec] active:scale-95"
                  >
                    <Trash2 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => addFacility(i)}
                    title="Tambah fasilitas"
                    className="flex h-9 items-center gap-1 rounded-lg border border-[#c9d6ea] bg-white px-2.5 text-xs font-bold text-[#1b4f9c] transition-colors hover:bg-[#eef4ff] active:scale-95"
                  >
                    <Plus size={14} /> Fasilitas
                  </button>
                  </div>
                </div>

                {p.facilities.length > 0 && (
                  <div className="mt-1.5 space-y-1.5 pl-3">
                    {p.facilities.map((facility, fi) => (
                      <div key={fi} className="flex items-center gap-2">
                        <Check size={14} className="shrink-0 text-[#1b9c5a]" />
                        <input
                          value={facility}
                          onChange={(e) => setFacility(i, fi, e.target.value)}
                          placeholder="Nama fasilitas (mis. Makan 3x)"
                          className="min-w-[8rem] flex-1 rounded-lg border border-[#dfe4e8] bg-white px-3 py-1.5 text-sm text-[#1b3555] outline-none focus:border-[#1b4f9c] focus:ring-2 focus:ring-[#1b4f9c]/15"
                        />
                        <button
                          type="button"
                          onClick={() => removeFacility(i, fi)}
                          title="Hapus fasilitas"
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#eef1f4] bg-white text-[#9aa3af] transition-colors hover:bg-[#f1f3f5] hover:text-[#c0392b] active:scale-95"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      <div className="border-t border-[#eef1f4] pt-4">
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex w-full items-center justify-between gap-2 text-left"
          aria-expanded={showAdvanced}
        >
          <span>
            <span className="block text-sm font-bold text-[#1b3555]">Pengaturan Lanjutan</span>
            <span className="mt-0.5 block text-[11px] leading-relaxed text-[#9aa3af]">
              Subjudul, keterangan di bawah gambar, dan urutan tampil. Semua opsional.
            </span>
          </span>
          <ChevronDown size={16} className={`shrink-0 text-[#657080] transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-3">
            <Field label="Subjudul" hint="Tampil sebagai judul kecil pada blok di bawah gambar.">
              <input
                value={form.subtitle}
                onChange={(e) => set('subtitle', e.target.value)}
                placeholder="Paket wisata keluarga 2 hari 1 malam"
                className={inputCls}
              />
            </Field>

            <Field label="Keterangan di Bawah Gambar">
              <RichTextarea
                value={form.body}
                onChange={(v) => set('body', v)}
                rows={5}
                placeholder="Paragraf penjelasan paket…"
              />
            </Field>

            <Field
              label="Urutan (otomatis)"
              hint="Nomor posisi (1, 2, 3…). Paket lain akan bergeser menyesuaikan. Isi 0 untuk paling akhir."
            >
              <input
                type="number"
                min={0}
                value={form.order}
                onChange={(e) => set('order', Number(e.target.value) || 0)}
                placeholder="0"
                className={inputCls}
              />
            </Field>
          </div>
        )}
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600">{error}</p>}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onDone}
          className="rounded-full border border-[#dfe4e8] px-4 py-2 text-xs font-bold text-[#657080] hover:bg-[#f1f3f5]"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-1.5 rounded-full bg-[#1b4f9c] px-5 py-2 text-xs font-bold text-white transition-colors duration-200 hover:bg-[#143d79] active:scale-95 disabled:opacity-60"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          {initial ? 'Simpan Perubahan' : 'Tambah Paket'}
        </button>
      </div>
    </form>
  )
}
