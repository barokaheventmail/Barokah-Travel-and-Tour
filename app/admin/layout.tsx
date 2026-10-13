import { redirect } from 'next/navigation'
import { AdminNav } from '@/components/admin/admin-nav'
import { AutoRefresh } from '@/components/admin/auto-refresh'
import { LogoutButton } from '@/components/admin/logout-button'
import { Logo } from '@/components/site'
import { requireAdminSession } from '@/lib/auth'

const ROLE_LABEL: Record<string, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  CREW: 'Crew',
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminSession()
  if (!session) redirect('/login?scope=ADMIN&next=/admin')
  const roleLabel = ROLE_LABEL[session.role] ?? 'Admin'
  return (
    <div className="min-h-screen bg-[#f4f7fa]" suppressHydrationWarning>
      <AutoRefresh />

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-[#dfe4e8] bg-white lg:flex print:hidden">
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-[#dfe4e8] px-7">
          <Logo className="h-10 w-auto" />
              <p className="whitespace-nowrap text-sm font-bold text-[#1b3555]">Panel {roleLabel}</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <AdminNav role={session.role} className="h-full flex-col" />
        </div>
        <div className="shrink-0 border-t border-[#dfe4e8] p-3">
          <LogoutButton />
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-[#dfe4e8] bg-white/90 backdrop-blur lg:hidden print:hidden">
          <div className="container-wide flex h-16 items-center justify-between gap-3 px-4">
            <div className="flex min-w-0 items-center gap-3">
              <Logo className="h-8 w-auto" />
          <p className="whitespace-nowrap text-sm font-bold text-[#1b3555]">Panel {roleLabel}</p>
            </div>
            <LogoutButton />
          </div>
        </header>
        <div className="container-wide px-4 pt-4 lg:hidden">
          <AdminNav
            role={session.role}
            className="flex-row overflow-x-auto rounded-2xl border border-[#dfe4e8] bg-white p-2 shadow-sm"
          />
        </div>
        <main className="container-wide px-4 py-6 pb-16">{children}</main>
      </div>
    </div>
  )
}
