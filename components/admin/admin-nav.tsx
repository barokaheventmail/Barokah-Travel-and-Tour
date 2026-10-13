'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bookmark, Eye, History, Package, QrCode } from 'lucide-react'

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number }>
  ownerOnly?: boolean
  pushBottom?: boolean
  match: (pathname: string) => boolean
}

const ITEMS: NavItem[] = [
  {
    href: '/admin',
    label: 'Event',
    icon: QrCode,
    match: (p) => p === '/admin' || p.startsWith('/admin/events'),
  },
  {
    href: '/admin/paket',
    label: 'Paket Event',
    icon: Package,
    match: (p) => p.startsWith('/admin/paket'),
  },
  {
    href: '/admin/pengawasan',
    label: 'Pengawasan',
    icon: Eye,
    ownerOnly: true,
    match: (p) => p.startsWith('/admin/pengawasan'),
  },
  {
    href: '/admin/preset',
    label: 'Preset',
    icon: Bookmark,
    match: (p) => p.startsWith('/admin/preset'),
  },
  {
    href: '/admin/logs',
    label: 'Riwayat',
    icon: History,
    pushBottom: true,
    match: (p) => p.startsWith('/admin/logs'),
  },
]

export function AdminNav({ role, className = '' }: { role: string; className?: string }) {
  const pathname = usePathname()
  return (
    <nav className={`flex gap-1.5 lg:gap-0 ${className}`}>
      {ITEMS.filter((item) => !item.ownerOnly || role === 'OWNER').map((item) => {
        const active = item.match(pathname)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-colors duration-200 lg:w-full lg:rounded-none lg:px-5 ${
              item.pushBottom ? 'lg:mt-auto' : ''
            } ${active ? 'bg-[#1b4f9c] text-white' : 'text-[#657080] hover:bg-[#f1f3f5]'}`}
          >
            <Icon size={14} />
            <span className="whitespace-nowrap">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
