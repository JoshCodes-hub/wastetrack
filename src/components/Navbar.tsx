'use client'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import supabase from '@/lib/supabase'
import { useTheme } from '@/lib/theme-context'
import type { UserRole } from '@/types'

export default function Navbar() {
  const [role, setRole] = useState<UserRole | null>(null)
  const [userName, setUserName] = useState('')
  const [scrolled, setScrolled] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase.from('users').select('role,name').eq('id', session.user.id).single().then(
          ({ data }) => {
            if (data) { setRole(data.role as UserRole); setUserName(data.name) }
          }
        )
      }
    })
  }, [pathname])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  if (pathname === '/auth/login' || pathname === '/auth/register') return null
  if (pathname === '/') return null

  const links: Record<UserRole, { href: string; label: string; icon: string }[]> = {
    reporter: [
      { href: '/dashboard/reporter', label: 'Submit Report', icon: '📸' },
      { href: '/dashboard/reporter', label: 'My Reports', icon: '📋' },
      { href: '/map', label: 'Map View', icon: '🗺️' },
      { href: '/dashboard/admin', label: 'Admin Panel', icon: '⚙️' },
    ],
    cleaner: [
      { href: '/dashboard/cleaner', label: 'Assignments', icon: '📝' },
      { href: '/map', label: 'Map View', icon: '🗺️' },
    ],
    admin: [
      { href: '/dashboard/admin', label: 'Dashboard', icon: '📊' },
      { href: '/dashboard/admin/reports', label: 'Reports', icon: '📋' },
      { href: '/dashboard/admin/cleaners', label: 'Cleaners', icon: '👥' },
      { href: '/dashboard/admin/bins', label: 'Smart Bins', icon: '🗑️' },
      { href: '/dashboard/admin/analytics', label: 'Analytics', icon: '📈' },
      { href: '/map', label: 'Map View', icon: '🗺️' },
    ],
  }

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'glass shadow-lg' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold">
            <span className="text-2xl animate-float">♻</span>
            <span className="gradient-text">WasteTrack AI</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {role && links[role]?.map(l => (
              <Link key={l.href + l.label} href={l.href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  pathname === l.href
                    ? 'bg-white/20 dark:bg-white/10 text-emerald-600 dark:text-emerald-400'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-white/10'
                }`}>
                <span>{l.icon}</span>
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {userName && (
              <span className="hidden sm:block text-sm text-gray-500 dark:text-gray-400">
                {userName}
              </span>
            )}
            <button onClick={toggleTheme}
              className="w-9 h-9 flex items-center justify-center rounded-xl glass text-sm hover:scale-105 transition-transform">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            {role && (
              <button onClick={handleLogout}
                className="px-3 py-2 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                Logout
              </button>
            )}
          </div>
        </div>

        {/* Mobile nav */}
        {role && (
          <div className="md:hidden flex gap-1 pb-3 overflow-x-auto scrollbar-none">
            {links[role]?.map(l => (
              <Link key={l.href + l.label} href={l.href}
                className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium ${
                  pathname === l.href
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                    : 'text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-white/5'
                }`}>
                <span>{l.icon}</span>
                {l.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  )
}
