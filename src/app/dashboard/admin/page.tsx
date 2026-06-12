'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import supabase from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import type { Report, Cleaner, SmartBin } from '@/types'

const AdminMap = dynamic(() => import('@/components/AdminMap'), { ssr: false })

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    total: 0, pending: 0, inProgress: 0, completed: 0,
    activeCleaners: 0, binsOnline: 0, todayReports: 0,
  })
  const [reports, setReports] = useState<Report[]>([])
  const [cleaners, setCleaners] = useState<Cleaner[]>([])
  const [bins, setBins] = useState<SmartBin[]>([])

  useEffect(() => {
    loadStats()
    loadRecent()
    loadCleaners()
    loadBins()

    const channel = supabase.channel('admin-dash')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'reports' }, () => { loadStats(); loadRecent() })
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'cleaners' }, () => loadCleaners())
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'smart_bins' }, () => { loadStats(); loadBins() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const loadStats = async () => {
    const [{ count: total }, { count: pending }, { count: ip }, { count: completed }] = await Promise.all([
      supabase.from('reports').select('*', { count: 'exact', head: true }),
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    ])
    const { count: activeC } = await supabase.from('cleaners').select('*', { count: 'exact', head: true }).eq('is_active', true)
    const today = new Date().toISOString().slice(0, 10)
    const { count: todayC } = await supabase.from('reports').select('*', { count: 'exact', head: true }).gte('created_at', today)
    const twoMinAgo = new Date(Date.now() - 120000).toISOString()
    const { count: onlineBins } = await supabase.from('smart_bins').select('*', { count: 'exact', head: true }).gte('last_updated', twoMinAgo)
    setStats({ total: total || 0, pending: pending || 0, inProgress: ip || 0, completed: completed || 0, activeCleaners: activeC || 0, binsOnline: onlineBins || 0, todayReports: todayC || 0 })
  }

  const loadRecent = async () => {
    const { data } = await supabase.from('reports').select('*').order('created_at', { ascending: false }).limit(6)
    if (data) setReports(data as Report[])
  }
  const loadCleaners = async () => {
    const { data } = await supabase.from('cleaners').select('*')
    if (data) setCleaners(data as Cleaner[])
  }
  const loadBins = async () => {
    const { data } = await supabase.from('smart_bins').select('*')
    if (data) setBins(data as SmartBin[])
  }

  const quickLinks = [
    { href: '/dashboard/admin/reports', label: 'Manage Reports', icon: '📋', color: 'from-blue-500 to-blue-600' },
    { href: '/dashboard/admin/cleaners', label: 'Manage Cleaners', icon: '👥', color: 'from-purple-500 to-purple-600' },
    { href: '/dashboard/admin/bins', label: 'Smart Bins', icon: '🗑️', color: 'from-emerald-500 to-emerald-600' },
    { href: '/dashboard/admin/analytics', label: 'Analytics', icon: '📈', color: 'from-amber-500 to-amber-600' },
    { href: '/map', label: 'Live Map', icon: '🗺️', color: 'from-rose-500 to-rose-600' },
  ]

  const statCards = [
    { label: 'Total Reports', value: stats.total, icon: '📊' },
    { label: 'Pending', value: stats.pending, icon: '⏳' },
    { label: 'In Progress', value: stats.inProgress, icon: '🔄' },
    { label: 'Completed', value: stats.completed, icon: '✅' },
    { label: 'Active Cleaners', value: stats.activeCleaners, icon: '👤' },
    { label: 'Bins Online', value: stats.binsOnline, icon: '📡' },
    { label: "Today's Reports", value: stats.todayReports, icon: '📅' },
  ]

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold gradient-text">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Real-time waste management overview</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {quickLinks.map(l => (
          <Link key={l.href} href={l.href}
            className={`card p-4 flex items-center gap-3 hover:scale-[1.02] transition-transform`}>
            <span className="text-2xl">{l.icon}</span>
            <span className="text-sm font-medium">{l.label}</span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {statCards.map(s => (
          <div key={s.label} className="card p-4 text-center">
            <div className="text-xl mb-1">{s.icon}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
            <p className="stat-value mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-[450px] rounded-2xl overflow-hidden card p-1">
          <AdminMap reports={reports} cleaners={cleaners} bins={bins} />
        </div>
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-lg">Recent Reports</h2>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {reports.length === 0 ? (
              <p className="text-sm text-gray-400">No reports yet</p>
            ) : (
              reports.map((r, i) => (
                <div key={r.id} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-medium">{r.waste_type?.replace('_', ' ') || 'Unknown'}</span>
                      <span className={`ml-2 badge text-[10px] ${
                        r.status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700' :
                        r.status === 'in_progress' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700' :
                        'bg-gray-100 dark:bg-gray-800 text-gray-600'
                      }`}>{r.status}</span>
                    </div>
                    <span className="text-[10px] text-gray-400">{formatDate(r.created_at)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
