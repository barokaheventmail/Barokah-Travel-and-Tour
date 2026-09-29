'use client'

import { useState } from 'react'
import { FileDown, KeyRound, Plus, ShieldAlert, Trash2, UserPlus } from 'lucide-react'
import { ActionMenu } from '@/components/admin/action-menu'
import { AddBus } from '@/components/admin/add-bus'
import { CrewCredentialsButton, type CredentialBus } from '@/components/admin/crew-credentials-modal'
import { DeleteCrewButton } from '@/components/admin/delete-crew'
import { GenerateCrewButton, type GenerateBus } from '@/components/admin/generate-crew'
import { ResetCrewPasswordsButton } from '@/components/admin/reset-crew-passwords'

type Key = 'generate' | 'reset' | 'delete' | 'addbus' | 'credentials'

export function ArmadaActions({
  eventId,
  eventTitle,
  defaultPrefix,
  eventDate,
  buses,
  credentialBuses,
  totalCrew,
  totalAccounts,
  hasBuses,
}: {
  eventId: string
  eventTitle: string
  eventDate: string
  defaultPrefix: string | null
  buses: GenerateBus[]
  credentialBuses: CredentialBus[]
  totalCrew: number
  totalAccounts: number
  hasBuses: boolean
}) {
  const [active, setActive] = useState<Key | null>(null)

  // Belum ada unit: menu hanya berisi satu aksi, jadi chevron-nya tidak
  // berguna. Tambah Bus muncul langsung sebagai tombol biasa.
  if (!hasBuses) return <AddBus eventId={eventId} mode="button" />

  const onOpen = (key: Key) => () => setActive(key)
  const onClose = (key: Key) => (v: boolean) => setActive(v ? key : null)

  return (
    <>
      <ActionMenu
        label="Aksi Unit"
        align="left"
        items={[
          {
            key: 'generate',
            label: 'Generate Akun Crew',
            hint: `${totalAccounts} akun · buat login crew`,
            icon: <UserPlus size={15} />,
            onSelect: onOpen('generate'),
          },
          {
            key: 'reset',
            label: 'Terapkan Pola Password Crew',
            hint:
              totalCrew === 0
                ? 'Belum ada crew di event ini'
                : `${totalCrew} crew · kembalikan ke username + 1123`,
            icon: <KeyRound size={15} />,
            disabled: totalCrew === 0,
            disabledTitle: 'Belum ada crew di event ini.',
            onSelect: onOpen('reset'),
          },
          {
            key: 'delete',
            label: 'Hapus Crew',
            hint:
              totalCrew === 0
                ? 'Belum ada crew di event ini'
                : `${totalCrew} crew · hapus semua sekaligus`,
            icon: <Trash2 size={15} />,
            tone: 'danger',
            disabled: totalCrew === 0,
            disabledTitle: 'Belum ada crew di event ini.',
            onSelect: onOpen('delete'),
          },
          {
            key: 'credentials',
            label: 'Kredensial Crew (PDF)',
            hint: totalCrew === 0 ? 'Belum ada crew di event ini' : `${totalCrew} crew · lihat & unduh PDF`,
            icon: <FileDown size={15} />,
            disabled: totalCrew === 0,
            disabledTitle: 'Belum ada crew di event ini.',
            onSelect: onOpen('credentials'),
          },
          {
            key: 'addbus',
            label: 'Tambah Bus',
            hint: 'Tambah unit baru ke event ini',
            icon: <Plus size={15} />,
            dividerBefore: true,
            onSelect: onOpen('addbus'),
          },
        ]}
      />

      {/*
        Modal dirender sebagai saudara ActionMenu, bukan di dalam panelnya. Selain
        menghindari jebakan containing-block, ini juga membuat panel boleh
        ditutup tanpa ikut melepas modal yang sedang tampil.
      */}
      {active === 'generate' && (
        <GenerateCrewButton
          mode="modal"
          eventId={eventId}
          eventTitle={eventTitle}
          defaultPrefix={defaultPrefix}
          buses={buses}
          open
          onOpenChange={onClose('generate')}
        />
      )}
      {active === 'reset' && (
        <ResetCrewPasswordsButton
          mode="modal"
          eventId={eventId}
          totalCrew={totalCrew}
          open
          onOpenChange={onClose('reset')}
        />
      )}
      {active === 'delete' && (
        <DeleteCrewButton
          mode="modal"
          eventId={eventId}
          totalCrew={totalCrew}
          open
          onOpenChange={onClose('delete')}
        />
      )}
      {active === 'credentials' && (
        <CrewCredentialsButton
          mode="modal"
          eventId={eventId}
          eventTitle={eventTitle}
          eventDate={eventDate}
          buses={credentialBuses}
          totalCrew={totalCrew}
          open
          onOpenChange={onClose('credentials')}
        />
      )}
      {active === 'addbus' && (
        <AddBus mode="modal" eventId={eventId} open onOpenChange={onClose('addbus')} />
      )}
    </>
  )
}
