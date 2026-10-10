import type { Prisma } from '@prisma/client'

type Tx = Prisma.TransactionClient

async function writeOrder(tx: Tx, ids: string[]): Promise<void> {
  for (let i = 0; i < ids.length; i++) {
    await tx.paketEvent.update({ where: { id: ids[i] }, data: { order: i + 1 } })
  }
}

/** Urutkan ulang semua paket jadi 1..n berdasarkan urutan saat ini. */
export async function normalizePaketOrder(tx: Tx): Promise<void> {
  const all = await tx.paketEvent.findMany({
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    select: { id: true },
  })
  await writeOrder(
    tx,
    all.map((p) => p.id),
  )
}

/**
 * Menyusun ulang urutan paket event secara otomatis.
 *
 * `order` diperlakukan sebagai posisi (1, 2, 3, …). Saat sebuah paket diubah
 * ke posisi tertentu, paket itu didahulukan di posisi tsb dan paket lain yang
 * berada di posisi yang sama / setelahnya bergeser menyesuaikan. `order` <= 0
 * berarti diletakkan di paling akhir.
 *
 * Semua baris dinormalisasi ulang jadi 1..n supaya tidak ada nomor kembar.
 */
export async function reorderPaket(tx: Tx, movedId: string, desiredPos: number): Promise<void> {
  const all = await tx.paketEvent.findMany({
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    select: { id: true },
  })

  const ids = all.map((p) => p.id).filter((id) => id !== movedId)
  const pos =
    Number.isFinite(desiredPos) && desiredPos >= 1
      ? Math.min(Math.trunc(desiredPos), ids.length + 1)
      : ids.length + 1

  ids.splice(pos - 1, 0, movedId)
  await writeOrder(tx, ids)
}
