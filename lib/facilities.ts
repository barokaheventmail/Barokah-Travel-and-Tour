export type FacilityIcon =
  | 'armchair'
  | 'sofa'
  | 'bed'
  | 'luggage'
  | 'backpack'
  | 'snowflake'
  | 'fan'
  | 'wind'
  | 'thermometer'
  | 'sun'
  | 'moon'
  | 'plug'
  | 'plug-zap'
  | 'usb-plug'
  | 'cable'
  | 'battery-charging'
  | 'battery-full'
  | 'zap'
  | 'lightbulb'
  | 'wifi'
  | 'tv'
  | 'monitor'
  | 'volume-2'
  | 'music'
  | 'radio'
  | 'smartphone'
  | 'video'
  | 'camera'
  | 'cup-soda'
  | 'utensils'
  | 'sandwich'
  | 'coffee'
  | 'cookie'
  | 'candy'
  | 'apple'
  | 'toilet'
  | 'bath'
  | 'door-open'
  | 'shield-check'
  | 'shield-plus'
  | 'briefcase-medical'
  | 'pill'
  | 'baby'
  | 'accessibility'
  | 'ticket'
  | 'ticket-check'
  | 'qr-code'
  | 'nfc'
  | 'map-pinned'
  | 'navigation'
  | 'route'
  | 'compass'
  | 'bus-front'
  | 'fuel'
  | 'gauge'
  | 'satellite'
  | 'ellipsis'
  | 'star'
  | 'gift'
  | 'megaphone'
  | 'info'
  | 'clock'
  | 'recycle'
  | 'sparkles'

export type Facility = {
  icon: FacilityIcon
  name: string
  note: string
}

export const FACILITY_MAX_ITEMS = 30
export const FACILITY_MAX_NAME = 60
export const FACILITY_MAX_NOTE = 160

export type FacilityIconGroup = { label: string; icons: readonly FacilityIcon[] }

export const FACILITY_ICON_GROUPS: readonly FacilityIconGroup[] = [
  {
    label: 'Kenyamanan',
    icons: ['armchair', 'sofa', 'bed', 'luggage', 'backpack'],
  },
  {
    label: 'Kelistrikan',
    icons: ['plug', 'plug-zap', 'usb-plug', 'cable', 'battery-charging', 'battery-full', 'zap', 'lightbulb'],
  },
  {
    label: 'AC & Ventilasi',
    icons: ['snowflake', 'fan', 'wind', 'thermometer', 'sun', 'moon'],
  },
  {
    label: 'Hiburan',
    icons: ['tv', 'monitor', 'volume-2', 'music', 'radio', 'smartphone', 'video', 'camera'],
  },
  {
    label: 'Konektivitas',
    icons: ['wifi', 'nfc', 'satellite'],
  },
  {
    label: 'Makanan & Minum',
    icons: ['cup-soda', 'utensils', 'sandwich', 'coffee', 'cookie', 'candy', 'apple'],
  },
  {
    label: 'Sanitari',
    icons: ['toilet', 'bath', 'door-open'],
  },
  {
    label: 'Keselamatan',
    icons: ['shield-check', 'shield-plus', 'briefcase-medical', 'pill', 'baby', 'accessibility'],
  },
  {
    label: 'Perjalanan',
    icons: [
      'ticket',
      'ticket-check',
      'qr-code',
      'map-pinned',
      'navigation',
      'route',
      'compass',
      'bus-front',
      'fuel',
      'gauge',
    ],
  },
  {
    label: 'Lainnya',
    icons: ['ellipsis', 'star', 'gift', 'megaphone', 'info', 'clock', 'recycle', 'sparkles'],
  },
]

export const FACILITY_ICON_OPTIONS: readonly FacilityIcon[] = FACILITY_ICON_GROUPS.flatMap((g) => [...g.icons])

export const FACILITY_ICON_LABELS: Record<FacilityIcon, string> = {
  armchair: 'Kursi',
  sofa: 'Sofa / Santai',
  bed: 'Bantal & Selimut',
  luggage: 'Rak Bagasi',
  backpack: 'Tas',
  snowflake: 'AC / Pendingin',
  fan: 'Kipas / Ventilasi',
  wind: 'Sirkulasi udara',
  thermometer: 'Suhu kabin',
  sun: 'Terik / Matahari',
  moon: 'Perjalanan malam',
  plug: 'Colokan',
  'plug-zap': 'Colokan cepat',
  'usb-plug': 'Port USB',
  cable: 'Kabel & adaptor',
  'battery-charging': 'Pengisian daya',
  'battery-full': 'Baterai penuh',
  zap: 'Listrik / Energi',
  lightbulb: 'Lampu',
  wifi: 'WiFi',
  tv: 'TV / Layar',
  monitor: 'Monitor',
  'volume-2': 'Audio / Speaker',
  music: 'Musik',
  radio: 'Radio',
  smartphone: 'H Hiburan digital',
  video: 'Video',
  camera: 'Kamera',
  'cup-soda': 'Minuman',
  utensils: 'Makanan',
  sandwich: 'Makan ringan',
  coffee: 'Kopi / Teh',
  cookie: 'Camilan',
  candy: 'Permen',
  apple: 'Buah',
  toilet: 'Toilet',
  bath: 'Tempat mandi',
  'door-open': 'Pintu',
  'shield-check': 'Safety belt',
  'shield-plus': 'Keamanan',
  'briefcase-medical': 'P3K',
  pill: 'Obat',
  baby: 'Bayi',
  accessibility: 'Aksesibilitas',
  ticket: 'Tiket',
  'ticket-check': 'Tiket check-in',
  'qr-code': 'QR Code',
  nfc: 'K contactless',
  'map-pinned': 'Peta rute',
  navigation: 'Navigasi',
  route: 'Rute perjalanan',
  compass: 'Mata angin',
  'bus-front': 'Bus / Unit',
  fuel: 'Bahan bakar',
  gauge: 'Speedometer',
  satellite: 'Sinyal / GPS',
  ellipsis: 'Lainnya (dll)',
  star: 'Unggulan',
  gift: 'Bonus',
  megaphone: 'Pengumuman',
  info: 'Informasi',
  clock: 'Waktu',
  recycle: 'Ramah lingkungan',
  sparkles: 'Khusus',
}

export type FacilityPreset = { icon: FacilityIcon; name: string; note: string }

export const FACILITY_PRESETS: readonly FacilityPreset[] = [
  { icon: 'snowflake', name: 'AC', note: 'Pendingin kabin' },
  { icon: 'wifi', name: 'WiFi', note: 'Gratis onboard' },
  { icon: 'tv', name: 'TV', note: 'Layar entertainment' },
  { icon: 'toilet', name: 'Toilet', note: 'Tersedia di dalam bus' },
  { icon: 'cup-soda', name: 'Snack', note: 'Makan ringan & minum' },
  { icon: 'usb-plug', name: 'USB Charger', note: 'Port pengisian daya' },
  { icon: 'battery-charging', name: 'Charging', note: 'Colokan listrik' },
  { icon: 'bed', name: 'Bantal & Selimut', note: 'Ready di setiap kursi' },
  { icon: 'plug', name: 'Colokan', note: 'Kabel & adaptor' },
  { icon: 'volume-2', name: 'Audio', note: 'Musik & pengumuman' },
  { icon: 'armchair', name: 'Kursi Nyaman', note: 'Bantalan tebal' },
  { icon: 'shield-check', name: 'Safety Belt', note: 'Sabuk pengaman' },
  { icon: 'luggage', name: 'Rak Bagasi', note: 'Kapasitas bawah' },
  { icon: 'ticket', name: 'Tiket & Peta Rute', note: 'Panduan perjalanan' },
]

export const FACILITY_LAINNYA_PRESET: FacilityPreset = { icon: 'ellipsis', name: '', note: '' }

type FacilitySource = { facilities?: string | null }

function toStr(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function normalizeItem(raw: unknown): Facility | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  const name = toStr(record.name).trim().slice(0, FACILITY_MAX_NAME)
  if (!name) return null
  const iconRaw = toStr(record.icon)
  const icon = (FACILITY_ICON_OPTIONS as readonly string[]).includes(iconRaw)
    ? (iconRaw as FacilityIcon)
    : 'armchair'
  return { icon, name, note: toStr(record.note).trim().slice(0, FACILITY_MAX_NOTE) }
}

export function parseFacilities(bus: FacilitySource | string | null | undefined): Facility[] {
  let raw: unknown = null
  if (typeof bus === 'string') {
    try {
      raw = bus ? JSON.parse(bus) : null
    } catch {
      raw = null
    }
  } else if (bus && typeof bus === 'object' && 'facilities' in bus) {
    const value = bus.facilities
    if (value) {
      try {
        raw = JSON.parse(value)
      } catch {
        raw = null
      }
    }
  }
  if (!Array.isArray(raw)) return []
  const out: Facility[] = []
  for (const item of raw) {
    const facility = normalizeItem(item)
    if (facility) out.push(facility)
    if (out.length >= FACILITY_MAX_ITEMS) break
  }
  return out
}

export function serializeFacilities(items: Facility[]): string | null {
  if (items.length === 0) return null
  return JSON.stringify(items.map((f) => ({ icon: f.icon, name: f.name, note: f.note })))
}

export function validateFacilities(input: unknown): { items: Facility[]; error?: string } {
  if (!Array.isArray(input)) return { items: [], error: 'Daftar fasilitas tidak valid.' }
  if (input.length > FACILITY_MAX_ITEMS) {
    return { items: [], error: `Maksimal ${FACILITY_MAX_ITEMS} fasilitas per unit.` }
  }
  const items: Facility[] = []
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') return { items: [], error: 'Daftar fasilitas tidak valid.' }
    const record = raw as Record<string, unknown>
    const name = toStr(record.name).trim()
    if (!name) continue
    if (name.length > FACILITY_MAX_NAME) {
      return { items: [], error: `Nama fasilitas maksimal ${FACILITY_MAX_NAME} karakter.` }
    }
    const note = toStr(record.note).trim()
    if (note.length > FACILITY_MAX_NOTE) {
      return { items: [], error: `Keterangan fasilitas maksimal ${FACILITY_MAX_NOTE} karakter.` }
    }
    const iconRaw = toStr(record.icon).trim() || 'armchair'
    if (!(FACILITY_ICON_OPTIONS as readonly string[]).includes(iconRaw)) {
      return { items: [], error: 'Ikon fasilitas tidak dikenal.' }
    }
    items.push({ icon: iconRaw as FacilityIcon, name, note })
  }
  return { items }
}
