export function SectionLogos({
  logoLeft,
  logoLeft2,
  logoCenter,
  logoRight2,
  logoRight,
  compact = false,
}: {
  logoLeft?: string | null
  logoRight: string
  logoLeft2?: string | null
  logoCenter?: string | null
  logoRight2?: string | null
  topRight?: string | null
  topRight2?: string | null
  compact?: boolean
}) {
  // Slot kiri 1 / tengah / kanan 1 tidak punya logo bawaan — hanya tampil
  // bila pengguna mengunggahnya.
  const scale = compact ? 'scale-75' : ''
  const upShift = compact ? '-translate-y-[25px]' : ''
  const rightUpShift = compact ? '-translate-y-[15px]' : ''
  const leftShift = compact ? '-translate-x-[36px]' : ''
  const rightShift = compact ? 'translate-x-4' : ''
  const right2Size = compact ? 'h-[88px]' : 'h-20'
  const right2Shift = compact ? 'translate-x-[65px]' : 'translate-x-[85px]'
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex flex-1 items-center gap-3">
        {logoLeft && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={logoLeft} alt="Logo" className={`h-20 w-auto object-contain ${scale} ${upShift} ${leftShift}`} />
        )}
        {logoLeft2 && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={logoLeft2} alt="Logo" className={`h-20 w-auto object-contain ${scale} ${upShift} ${leftShift}`} />
        )}
      </div>
      {logoCenter && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={logoCenter} alt="Logo tengah" className={`h-20 w-auto object-contain ${scale} ${upShift}`} />
      )}
      <div className="flex flex-1 items-center justify-end gap-3">
        {logoRight2 && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={logoRight2} alt="Logo" className={`relative z-10 ${right2Size} w-auto ${right2Shift} object-contain ${scale} ${upShift}`} />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoRight} alt="Logo Siluet Barokah Tour" className={`-mr-5 -mt-5 h-24 w-auto object-contain ${scale} ${rightUpShift} ${rightShift}`} />
      </div>
    </div>
  )
}
