/**
 * Password crew punya dua sumber:
 *
 * 1. Pola otomatis (default): password = username + "1123". Karena polanya
 *    deterministik, admin (dan panel admin ini) bisa menghitung ulang password
 *    kapan saja dari username, jadi tidak perlu ada kolom password plaintext di
 *    database. Yang disimpan tetap hash bcrypt seperti biasa.
 * 2. Password manual: admin/owner mengetiknya sendiri per crew. Nilainya tidak
 *    bisa dihitung ulang dari username dan tidak pernah disimpan plaintext --
 *    hanya hash-nya, ditandai lewat `User.customPassword`. Modal kredensial
 *    karena itu menampilkan "password manual", bukan tebakan pola.
 *
 * Suffix yang diubah = semua password crew berpola langsung tidak bisa ditebak
 * kembali, jadi hati-hati: pola ini harus stabil.
 */
export const CREW_PASSWORD_SUFFIX = '1123'

export function crewPassword(username: string): string {
  return `${username}${CREW_PASSWORD_SUFFIX}`
}
