export function SectionLogos({
  logoLeft,
  logoLeft2,
  logoCenter,
  logoRight2,
  logoRight,
}: {
  logoLeft: string
  logoRight: string
  logoLeft2?: string | null
  logoCenter?: string | null
  logoRight2?: string | null
  topRight?: string | null
  topRight2?: string | null
}) {
  // Slot kiri 1 / tengah / kanan 1 tidak punya logo bawaan — hanya tampil
  // bila pengguna mengunggahnya.
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex flex-1 items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoLeft} alt="Logo Asita" className="h-20 w-auto object-contain" />
        {logoLeft2 && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={logoLeft2} alt="Logo" className="h-20 w-auto object-contain" />
        )}
      </div>
      {logoCenter && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={logoCenter} alt="Logo tengah" className="h-20 w-auto object-contain" />
      )}
      <div className="flex flex-1 items-center justify-end gap-3">
        {logoRight2 && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={logoRight2} alt="Logo" className="relative z-10 h-20 w-auto translate-x-5 object-contain" />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoRight} alt="Logo Siluet Barokah Tour" className="-mr-5 -mt-5 h-24 w-auto object-contain" />
      </div>
    </div>
  )
}
