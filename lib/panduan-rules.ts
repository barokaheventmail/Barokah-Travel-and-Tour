export type PanduanRule = { text: string; items?: string[] }

export const DEFAULT_PANDUAN_RULES: PanduanRule[] = [
  { text: 'Bawalah selalu catatan ini agar sewaktu-waktu diperlukan, peserta dapat lebih mudah menyesuaikan selama perjalanan.' },
  { text: 'Peserta wajib hadir tepat waktu di lokasi keberangkatan. Keterlambatan dapat mengganggu kenyamanan peserta lain dan berpotensi menyebabkan peserta tertinggal rombongan.' },
  {
    text: 'Peserta disarankan membawa tas kecil yang mudah diakses untuk menyimpan kebutuhan penting selama perjalanan tanpa membuka koper, seperti:',
    items: [
      'Dompet dan identitas pribadi',
      'Obat-obatan pribadi',
      'Peralatan ibadah',
      'Payung lipat atau jas hujan',
      'Snack ringan dan minuman pribadi',
      'Plastik serbaguna',
      'Pakaian ganti',
      'Peralatan mandi',
      'Jaket, syal, kupluk, sarung tangan, atau kaos kaki (antisipasi cuaca dingin)',
      'Aksesoris tambahan: kacamata, topi, kipas portable',
    ],
  },
  { text: 'Peserta wajib mematuhi jadwal, tata tertib, dan instruksi Tour Leader/Team Leader selama kegiatan berlangsung.' },
  { text: 'Peserta disarankan dalam kondisi sehat sebelum mengikuti perjalanan.' },
  { text: 'Peserta tidak diperkenankan meninggalkan rombongan tanpa izin dari Tour Leader/Team Leader.' },
  { text: 'Barang bawaan pribadi menjadi tanggung jawab masing-masing peserta. Hindari membawa barang berharga atau perhiasan berlebihan.' },
  { text: 'Peserta wajib menaati aturan yang berlaku dan menjaga kebersihan di setiap destinasi wisata maupun penginapan yang digunakan selama perjalanan.' },
  { text: 'Apabila peserta memiliki riwayat penyakit tertentu, disarankan untuk menginformasikan kepada Tour Leader sebelum keberangkatan.' },
]

export function parsePanduanRules(value: string | null | undefined): PanduanRule[] {
  if (!value) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []
  const rules: PanduanRule[] = []
  for (const entry of parsed) {
    if (!entry || typeof entry !== 'object') continue
    const text = typeof (entry as { text?: unknown }).text === 'string' ? (entry as { text: string }).text : ''
    const rawItems = (entry as { items?: unknown }).items
    const items = Array.isArray(rawItems) ? rawItems.filter((i): i is string => typeof i === 'string') : undefined
    if (!text && !items?.length) continue
    if (items && items.length) rules.push({ text, items })
    else rules.push({ text })
  }
  return rules
}

export function serializePanduanRules(rules: PanduanRule[]): string {
  const clean = rules
    .map((rule) => {
      const items = rule.items?.map((item) => item.trim()).filter(Boolean)
      return items && items.length ? { text: rule.text.trim(), items } : { text: rule.text.trim() }
    })
    .filter((rule) => rule.text || ('items' in rule && rule.items?.length))
  return JSON.stringify(clean)
}
