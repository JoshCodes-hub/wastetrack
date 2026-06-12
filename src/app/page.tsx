'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import supabase from '@/lib/supabase'

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase.from('users').select('role').eq('id', session.user.id).single().then(
          ({ data }) => router.push(`/dashboard/${data?.role || 'reporter'}`)
        )
      } else { setLoading(false) }
    })
  }, [router])

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="spinner w-10 h-10"></div>
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl"></div>
        </div>

        <div className="animate-fade-up max-w-2xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-ring"></span>
            AI-Powered Smart Waste Management
          </div>

          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-6">
            <span className="gradient-text">WasteTrack</span>
            <br />
            <span>AI</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-500 dark:text-gray-400 mb-10 max-w-lg mx-auto leading-relaxed">
            Real-time IoT waste monitoring with AI-powered classification, smart bin tracking, and intelligent cleaner routing.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register" className="btn-primary text-lg px-8 py-4">
              Get Started Free
            </Link>
            <Link href="/auth/login" className="btn-ghost text-lg px-8 py-4">
              Sign In
            </Link>
          </div>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mt-16 mb-8 w-full px-4">
          {[
            { icon: '🤖', title: 'AI Classification', desc: 'Auto-detect waste types from photos' },
            { icon: '📡', title: 'IoT Monitoring', desc: 'Real-time smart bin fill levels' },
            { icon: '📍', title: 'Smart Routing', desc: 'Optimized cleaner dispatch' },
          ].map((f, i) => (
            <div key={i} className="card p-5 text-center animate-fade-up" style={{ animationDelay: `${i * 150}ms` }}>
              <div className="text-3xl mb-2">{f.icon}</div>
              <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
