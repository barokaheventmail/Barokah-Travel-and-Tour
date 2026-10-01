/**
 * Cara terbaik menyimpan PDF di perangkat masing-masing.
 *
 * Unduh lewat `blob:` + atribut `download` itu andal di desktop, tapi rusak
 * di HP:
 *
 * - iOS Safari mengabaikan atribut `download` untuk URL `blob:` (dan
 *   `window.open()` ke `blob:` juga ditolak), jadi tombolnya terasa "ngadat".
 * - Beberapa Android WebView/Firefox memblokir `a.click()` yang dipicu dari
 *   dalam continuation `fetch`, hasilnya file tidak pernah sampai.
 *
 * Di HP lebih baik daripada memaksa unduh: navigasi langsung ke URL PDF-nya
 * dengan `Content-Disposition: inline`, sehingga viewer PDF bawaan terbuka dan
 * pesertanya bisa memakai tombol Save/Share miliknya sendiri.
 *
 * Desktop tetap pakai cara lama (blob + `download`) supaya file mendarat di
 * folder Download dengan nama yang rapi dan halaman tiket tidak berubah.
 */

const MOBILE_UA = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Windows Phone/i

/**
 * iPadOS 13+ mengirim "Macintosh" sebagai user agent (Safari dalam mode
 * desktop), jadi harus dibedakan lewat titik sentuh. `maxTouchPoints > 1`
 * dipakai, bukan `=== 1`, supaya iPad dengan Apple Pencil tidak ikut salah
 * dikira Mac.
 */
export function needsInlinePdfViewer(input: { ua: string; maxTouchPoints: number }): boolean {
  if (MOBILE_UA.test(input.ua)) return true
  if (/iPad/i.test(input.ua)) return true
  return /Macintosh/i.test(input.ua) && input.maxTouchPoints > 1
}
