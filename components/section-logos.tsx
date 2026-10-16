export function SectionLogos({
  logoLeft,
  logoRight,
  topRight,
  topRight2,
}: {
  logoLeft: string
  logoRight: string
  topRight: string | null
  topRight2: string | null
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoLeft} alt="Logo Asita" className="h-20 w-auto object-contain" />
      <div className="flex items-center gap-3">
        {topRight && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={topRight} alt="Logo" className="h-20 w-auto object-contain" />
        )}
        {topRight2 && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={topRight2} alt="Logo" className="h-20 w-auto object-contain" />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoRight} alt="Logo Siluet Barokah Tour" className="-mr-5 -mt-5 h-24 w-auto object-contain" />
      </div>
    </div>
  )
}
