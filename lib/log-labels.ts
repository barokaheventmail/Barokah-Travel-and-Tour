export type LogDetail = Record<string, unknown> | null

export type LogGroup = 'Import' | 'Kelola Event' | 'Kelola Paket' | 'Unit' | 'Peserta' | 'Kehadiran' | 'Scan' | 'Preset' | 'Keamanan' | 'Lainnya'

const GROUP_STYLE: Record<LogGroup, string> = {
  Import: 'bg-[#e6f4ea] text-[#2ca84a]',
  'Kelola Event': 'bg-[#eef3fb] text-[#1b4f9c]',
  'Kelola Paket': 'bg-[#e8f4fb] text-[#0d7bb5]',
  Unit: 'bg-[#f3ecfb] text-[#7b3fd4]',
  Peserta: 'bg-[#e8f4fb] text-[#0d7bb5]',
  Kehadiran: 'bg-[#fff7e0] text-[#b98a12]',
  Scan: 'bg-[#eff1f4] text-[#657080]',
  Preset: 'bg-[#eafaf1] text-[#1f8a5a]',
  Keamanan: 'bg-[#fdeaea] text-[#c0392b]',
  Lainnya: 'bg-[#eff1f4] text-[#657080]',
}

const ACTION_GROUP: Record<string, LogGroup> = {
  'event.import': 'Import',
  'event.create': 'Kelola Event',
  'event.update': 'Kelola Event',
  'event.delete': 'Kelola Event',
  'event.clearData': 'Kelola Event',
  'event.crewPhoto': 'Kelola Event',
  'event.crewPhotoRemove': 'Kelola Event',
  'paket.create': 'Kelola Paket',
  'paket.update': 'Kelola Paket',
  'paket.delete': 'Kelola Paket',
  'paket.image': 'Kelola Paket',
  'paket.imageRemove': 'Kelola Paket',
  'preset.create': 'Preset',
  'preset.update': 'Preset',
  'preset.delete': 'Preset',
  'bus.create': 'Unit',
  'bus.update': 'Unit',
  'bus.delete': 'Unit',
  'bus.seatLayout': 'Unit',
  'bus.seatLayoutClear': 'Unit',
  'bus.facilities': 'Unit',
  'bus.facilitiesClear': 'Unit',
  'busCrew.create': 'Unit',
  'busCrew.update': 'Unit',
  'busCrew.remove': 'Unit',
  'busCrew.generate': 'Unit',
  'busCrew.resetPassword': 'Unit',
  'busCrew.resetPasswords': 'Unit',
  'busCrew.deleteAccounts': 'Unit',
  'busCrew.photo': 'Unit',
  'busCrew.photoRemove': 'Unit',
  'participant.create': 'Peserta',
  'participant.update': 'Peserta',
  'participant.delete': 'Peserta',
  'attendance.reset': 'Kehadiran',
  'attendance.set': 'Kehadiran',
  'attendance.clear': 'Kehadiran',
  'scan.attended': 'Scan',
  'scan.duplicate': 'Scan',
  'auth.login.success': 'Keamanan',
  'auth.login.failed': 'Keamanan',
  'auth.logout': 'Keamanan',
  'auth.password.change': 'Keamanan',
  'log.delete': 'Keamanan',
}

/**
 * Aksi yang tetap dicatat ke database tapi tidak ditampilkan di daftar riwayat
 * dan tidak bisa disaring. dipakai `log.delete`: mengaudit penghapusan riwayat
 * itu penting, tapi menampilkannya hanya menghasilkan entri baru setiap kali
 * entri lamanya dihapus — jadi bersembunyi dari pandangan, bukan dihapus.
 */
export const HIDDEN_LOG_ACTIONS: string[] = ['log.delete']

export const LOG_ACTIONS: { group: LogGroup; actions: { value: string; label: string }[] }[] = [
  {
    group: 'Import',
    actions: [{ value: 'event.import', label: 'Impor data (Excel)' }],
  },
  {
    group: 'Kelola Event',
    actions: [
      { value: 'event.create', label: 'Buat event' },
      { value: 'event.update', label: 'Ubah event' },
      { value: 'event.delete', label: 'Hapus event' },
      { value: 'event.clearData', label: 'Hapus data bus & peserta' },
      { value: 'event.crewPhoto', label: 'Ganti foto crew on duty' },
      { value: 'event.crewPhotoRemove', label: 'Hapus foto crew on duty' },
    ],
  },
  {
    group: 'Kelola Paket',
    actions: [
      { value: 'paket.create', label: 'Buat paket event' },
      { value: 'paket.update', label: 'Ubah paket event' },
      { value: 'paket.delete', label: 'Hapus paket event' },
      { value: 'paket.image', label: 'Ganti gambar paket event' },
      { value: 'paket.imageRemove', label: 'Hapus gambar paket event' },
    ],
  },
  {
    group: 'Unit',
    actions: [
      { value: 'bus.create', label: 'Tambah bus' },
      { value: 'bus.update', label: 'Ubah bus' },
      { value: 'bus.delete', label: 'Hapus bus' },
      { value: 'bus.seatLayout', label: 'Atur layout kursi' },
      { value: 'bus.seatLayoutClear', label: 'Hapus layout kursi' },
      { value: 'bus.facilities', label: 'Atur fasilitas unit' },
      { value: 'bus.facilitiesClear', label: 'Hapus fasilitas unit' },
      { value: 'busCrew.create', label: 'Tambah crew' },
      { value: 'busCrew.update', label: 'Ubah crew' },
      { value: 'busCrew.remove', label: 'Lepas crew' },
      { value: 'busCrew.generate', label: 'Generate crew' },
      { value: 'busCrew.resetPassword', label: 'Ganti password crew' },
      { value: 'busCrew.resetPasswords', label: 'Terapkan pola password crew' },
      { value: 'busCrew.deleteAccounts', label: 'Hapus akun crew' },
      { value: 'busCrew.photo', label: 'Ganti foto crew' },
      { value: 'busCrew.photoRemove', label: 'Hapus foto crew' },
    ],
  },
  {
    group: 'Peserta',
    actions: [
      { value: 'participant.create', label: 'Tambah peserta' },
      { value: 'participant.update', label: 'Ubah peserta' },
      { value: 'participant.delete', label: 'Hapus peserta' },
    ],
  },
  {
    group: 'Preset',
    actions: [
      { value: 'preset.create', label: 'Buat preset' },
      { value: 'preset.update', label: 'Ubah preset' },
      { value: 'preset.delete', label: 'Hapus preset' },
    ],
  },
  {
    group: 'Kehadiran',
    actions: [
      { value: 'attendance.set', label: 'Tandai hadir (manual)' },
      { value: 'attendance.clear', label: 'Batalkan hadir (manual)' },
      { value: 'attendance.reset', label: 'Reset kehadiran' },
    ],
  },
  {
    group: 'Scan',
    actions: [
      { value: 'scan.attended', label: 'Scan — hadir' },
      { value: 'scan.duplicate', label: 'Scan — sudah hadir' },
    ],
  },
  {
    group: 'Keamanan',
    actions: [
      { value: 'auth.login.success', label: 'Login berhasil' },
      { value: 'auth.login.failed', label: 'Percobaan login gagal' },
      { value: 'auth.logout', label: 'Logout' },
      { value: 'auth.password.change', label: 'Ganti sandi' },
      { value: 'log.delete', label: 'Hapus riwayat' },
    ],
  },
]

export function getValue(d: LogDetail, key: string): string | number | null {
  const v = d && (d[key] as unknown)
  return typeof v === 'string' || typeof v === 'number' ? v : null
}

/** Detail log bertipe boolean (mis. `manual` pada ganti password crew). */
function getFlag(d: LogDetail, key: string): boolean {
  return d != null && (d[key] as unknown) === true
}

// Aksi massal (hapus layout kursi / fasilitas di seluruh unit) memakai satu baris
// log dengan scope 'all' + jumlah unit, bukan satu log per unit.
function isAllScope(d: LogDetail): boolean {
  return d != null && d.scope === 'all'
}

function busesLabel(d: LogDetail): string {
  const n = getValue(d, 'buses')
  return `${typeof n === 'number' ? n.toLocaleString('id-ID') : '???'} unit`
}

export function labelLog(action: string): string {
  for (const g of LOG_ACTIONS) {
    const f = g.actions.find((a) => a.value === action)
    if (f) return f.label
  }
  return action
}

export function groupLog(action: string): { group: LogGroup; cls: string } {
  const group = ACTION_GROUP[action] ?? 'Lainnya'
  return { group, cls: GROUP_STYLE[group] }
}

export function formatLogDetail(action: string, detail: LogDetail): string {
  switch (action) {
    case 'event.import': {
      const busesRaw = detail?.buses
      const buses = Array.isArray(busesRaw) ? busesRaw.length : typeof busesRaw === 'number' ? busesRaw : null
      const created = detail && typeof detail.created === 'number' ? detail.created : 0
      const updated = detail && typeof detail.updated === 'number' ? detail.updated : 0
      return `${buses ?? '?'} bus · ${created.toLocaleString('id-ID')} baru · ${updated.toLocaleString('id-ID')} diperbarui`
    }
    case 'event.create': {
      const t = getValue(detail, 'title')
      return `Event "${t ?? '??? '}" dibuat`
    }
    case 'event.update': {
      const t = getValue(detail, 'title')
      return `Pengaturan event "${t ?? '??? '}" diubah`
    }
    case 'event.delete': {
      const t = getValue(detail, 'title')
      return `Event "${t ?? '??? '}" dihapus`
    }
    case 'event.clearData': {
      const buses = detail && typeof detail.buses === 'number' ? detail.buses : 0
      const participants = detail && typeof detail.participants === 'number' ? detail.participants : 0
      return `${buses.toLocaleString('id-ID')} bus & ${participants.toLocaleString('id-ID')} peserta dihapus`
    }
    case 'bus.create': {
      const n = getValue(detail, 'name')
      return `Bus baru "${n ?? '??? '}"`
    }
    case 'bus.update': {
      const from = getValue(detail, 'from')
      const to = getValue(detail, 'to')
      return `${from ?? '???'} → ${to ?? '???'}`
    }
    case 'bus.delete': {
      const n = getValue(detail, 'name')
      const p = detail && typeof detail.participants === 'number' ? detail.participants : null
      return `Bus "${n ?? '???'}" dihapus${p !== null ? ` (${p.toLocaleString('id-ID')} peserta)` : ''}`
    }
    case 'bus.seatLayout': {
      const n = getValue(detail, 'name')
      const rows = getValue(detail, 'rows')
      const cols = getValue(detail, 'cols')
      const active = getValue(detail, 'active')
      const applied = detail && typeof detail.appliedToAll === 'number' ? detail.appliedToAll : 0
      const base = `Layout kursi ${rows}×${cols} (${typeof active === 'number' ? active : 0} kursi)${n ? ` • ${n}` : ''}`
      return applied > 0 ? `${base} + diterapkan ke ${applied.toLocaleString('id-ID')} unit lain` : base
    }
    case 'bus.seatLayoutClear': {
      const all = isAllScope(detail)
      const n = getValue(detail, 'name')
      return all ? `Layout kursi dihapus di ${busesLabel(detail)}` : `Layout kursi ${n ?? '???'} dihapus`
    }
    case 'bus.facilities': {
      const n = getValue(detail, 'name')
      const count = detail && typeof detail.count === 'number' ? detail.count : 0
      const names = Array.isArray(detail?.names) ? (detail.names as unknown[]).filter((v) => typeof v === 'string') : []
      const applied = detail && typeof detail.appliedToAll === 'number' ? detail.appliedToAll : 0
      const list = names.slice(0, 4).join(', ')
      const more = names.length > 4 ? `, +${names.length - 4} lainnya` : ''
      const base = `${count} fasilitas${n ? ` • ${n}` : ''}${list ? ` (${list}${more})` : ''}`
      return applied > 0 ? `${base} + diterapkan ke ${applied.toLocaleString('id-ID')} unit lain` : base
    }
    case 'bus.facilitiesClear': {
      const all = isAllScope(detail)
      const n = getValue(detail, 'name')
      return all ? `Fasilitas dihapus di ${busesLabel(detail)}` : `Fasilitas ${n ?? '???'} dihapus`
    }
    case 'busCrew.create': {
      const n = getValue(detail, 'name') ?? getValue(detail, 'username') ?? '???'
      const b = getValue(detail, 'bus')
      return `Crew ${n} ditambahkan di ${b ?? '???'}`
    }
    case 'busCrew.update': {
      const u = getValue(detail, 'username') ?? '???'
      const b = getValue(detail, 'bus')
      const bag: string[] = []
      if (typeof (detail as Record<string, unknown> | null)?.name === 'string') {
        bag.push(`nama: ${getValue(detail, 'name')}`)
      }
      if ('phone' in (detail ?? {})) {
        const ph = getValue(detail, 'phone')
        bag.push(`WA: ${ph ?? 'dikosongkan'}`)
      }
      return `Crew ${u} diubah di ${b ?? '???'}${bag.length ? ` (${bag.join(', ')})` : ''}`
    }
    case 'busCrew.remove': {
      const n = getValue(detail, 'name') ?? getValue(detail, 'username') ?? '???'
      const b = getValue(detail, 'bus')
      return `Crew ${n} dilepas dari ${b ?? '???'}`
    }
    case 'busCrew.generate': {
      const c = getValue(detail, 'created')
      const b = getValue(detail, 'buses')
      const px = getValue(detail, 'prefix')
      return `Generate ${(typeof c === 'number' ? c : 0).toLocaleString('id-ID')} crew di ${(typeof b === 'number' ? b : 0).toLocaleString('id-ID')} bus${px ? ` (prefix ${px})` : ''}`
    }
    case 'busCrew.resetPassword': {
      const u = getValue(detail, 'username') ?? '???'
      return getFlag(detail, 'manual')
        ? `Password crew ${u} diganti manual`
        : `Reset password crew ${u} ke pola username+1123`
    }
    case 'busCrew.resetPasswords': {
      const n = getValue(detail, 'count')
      return `Reset password ${(typeof n === 'number' ? n : 0).toLocaleString('id-ID')} crew ke pola username+1123`
    }
    case 'busCrew.deleteAccounts': {
      const n = getValue(detail, 'count')
      const u = getValue(detail, 'unlinked')
      return `Menghapus ${(typeof n === 'number' ? n : 0).toLocaleString('id-ID')} akun crew${typeof u === 'number' && u > 0 ? ` (${u.toLocaleString('id-ID')} di luar event)` : ''}`
    }
    case 'busCrew.photo': {
      const u = getValue(detail, 'username') ?? '???'
      return `Foto crew ${u} diunggah`
    }
    case 'busCrew.photoRemove': {
      const u = getValue(detail, 'username') ?? '???'
      return `Foto crew ${u} dihapus`
    }
    case 'paket.create': {
      const t = getValue(detail, 'title')
      return `Paket event "${t ?? '??? '}" dibuat`
    }
    case 'paket.update': {
      const t = getValue(detail, 'title')
      return `Paket event "${t ?? '??? '}" diubah`
    }
    case 'paket.delete': {
      const t = getValue(detail, 'title')
      return `Paket event "${t ?? '??? '}" dihapus`
    }
    case 'paket.image': {
      const t = getValue(detail, 'title')
      return `Gambar paket event "${t ?? '??? '}" diunggah`
    }
    case 'paket.imageRemove': {
      const t = getValue(detail, 'title')
      return `Gambar paket event "${t ?? '??? '}" dihapus`
    }
    case 'preset.create': {
      const n = getValue(detail, 'name')
      const k = getValue(detail, 'kind')
      return `Preset "${n ?? '???'}" dibuat (${k === 'PANDUAN' ? 'Panduan' : 'Kursi & Fasilitas'})`
    }
    case 'preset.update': {
      const n = getValue(detail, 'name')
      return `Preset "${n ?? '???'}" diubah`
    }
    case 'preset.delete': {
      const n = getValue(detail, 'name')
      return `Preset "${n ?? '???'}" dihapus`
    }
    case 'participant.create': {
      const n = getValue(detail, 'name')
      const bus = getValue(detail, 'bus')
      return `Peserta "${n ?? '???'}" ditambahkan${bus ? ` ke ${bus}` : ''}`
    }
    case 'participant.update': {
      const n = getValue(detail, 'name')
      return `Data peserta "${n ?? '???'}" diperbarui`
    }
    case 'participant.delete': {
      const n = getValue(detail, 'name')
      return `Peserta "${n ?? '???'}" dihapus`
    }
    case 'attendance.set': {
      const n = getValue(detail, 'name')
      return `${n ?? '???'} ditandai hadir (manual)`
    }
    case 'attendance.clear': {
      const n = getValue(detail, 'name')
      return `Kehadiran ${n ?? '???'} dibatalkan (manual)`
    }
    case 'attendance.reset': {
      const c =
        (detail && typeof detail.participants === 'number' ? detail.participants : null) ??
        (detail && typeof detail.count === 'number' ? detail.count : null)
      return `Kehadiran direset${c !== null ? ` (${c.toLocaleString('id-ID')} peserta)` : ''}`
    }
    case 'scan.attended': {
      const n = getValue(detail, 'name')
      return `Scan: ${n ?? '???'} — hadir`
    }
    case 'scan.duplicate': {
      const n = getValue(detail, 'name')
      return `Scan: ${n ?? '???'} — sudah hadir`
    }
    case 'auth.login.success': {
      const n = getValue(detail, 'username')
      const role = getValue(detail, 'role')
      return `Login berhasil${n ? ` • ${n}` : ''}${role ? ` (${String(role).toLowerCase()})` : ''}`
    }
    case 'auth.login.failed': {
      const n = getValue(detail, 'username')
      return `Percobaan login gagal${n ? ` • ${n}` : ''}`
    }
    case 'auth.logout': {
      const n = getValue(detail, 'username')
      return `Logout${n ? ` • ${n}` : ''}`
    }
    case 'auth.password.change': {
      const n = getValue(detail, 'username')
      const ok = detail?.ok === true
      return `Sandi ${n ?? '???'} ${ok ? 'diganti' : 'gagal diganti'}`
    }
    case 'log.delete': {
      const n = getValue(detail, 'count')
      return `Menghapus ${(typeof n === 'number' ? n : 0).toLocaleString('id-ID')} entri riwayat`
    }
    default: {
      if (!detail || Object.keys(detail).length === 0) return '—'
      const s = JSON.stringify(detail)
      return s.length > 120 ? `${s.slice(0, 117)}…` : s
    }
  }
}