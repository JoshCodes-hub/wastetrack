'use client'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import supabase from '@/lib/supabase'
import { useTheme } from '@/lib/theme-context'
import type { UserRole } from '@/types'

export default function Navbar() {
  const [role, setRole] = useState<UserRole | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase.from('users').select('role').eq('id', session.user.id).single().then(
          ({ data }) => { if (data) setRole(data.role as UserRole) }
        )
      }
    })
  }, [pathname])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  if (pathname === '/auth/login' || pathname === '/auth/register') return null

  const links: Record<UserRole, { href: string; label: string }[]> = {
    reporter: [
      { href: '/dashboard/reporter', label: 'Report' },
      { href: '/map', label: 'Map' },
      { href: '/dashboard/reporter', label: 'Leaderboard' },
    ],
    cleaner: [
      { href: '/dashboard/cleaner', label: 'My Assignments' },
      { href: '/map', label: 'Map' },
    ],
    admin: [
      { href: '/dashboard/admin', label: 'Dashboard' },
      { href: '/dashboard/admin/reports', label: 'Reports' },
      { href: '/dashboard/admin/cleaners', label: 'Cleaners' },
      { href: '/dashboard/admin/bins', label: 'Smart Bins' },
      { href: '/dashboard/admin/analytics', label: 'Analytics' },
      { href: '/map', label: 'Map' },
    ],
  }

  return (
    <nav className="flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: 'var(--card-border)', background: 'var(--card)' }}>
      <Link href="/" className="text-xl font-bold" style={{ color: 'var(--primary)' }}>♻ WasteTrack AI</Link>
      <div className="flex items-center gap-4">
        {role && links[role]?.map(l => (
          <Link key={l.href} href={l.href} className="text-sm font-medium hover:underline" style={{ color: pathname.startsWith(l.href) ? 'var(--primary)' : 'var(--foreground)' }}>
            {l.label}
          </Link>
        ))}
        <button onClick={toggleTheme} className="p-2 rounded text-sm" style={{ background: 'var(--card-border)' }}>
          {theme === 'dark' ? '☀' : '☾'}
        </button>
        {role && (
          <button onClick={handleLogout} className="text-sm text-red-500 hover:underline">Logout</button>
        )}
      </div>
    </nav>
  )
}
