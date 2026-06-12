'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import supabase from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import type { Report, Cleaner, SmartBin } from '@/types'

const AdminMap = dynamic(() => import('@/components/AdminMap'), { ssr: false })

export default function AdminDashboard() {
  const [stats, setStats] = useState({ total: 0, pending: 0, inProgress: 0, completed: 0, activeCleaners: 0, binsOnline: 0, todayReports: 0 })
  const [reports, setReports] = useState<Report[]>([])
  const [cleaners, setCleaners] = useState<Cleaner[]>([])
  const [bins, setBins] = useState<SmartBin[]>([])

  useEffect(() => {
    loadStats()
    loadRecentReports()
    loadCleaners()
    loadBins()

    const channel = supabase.channel('admin-map')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'reports' }, () => { loadStats(); loadRecentReports() })
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'cleaners' }, () => loadCleaners())
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'smart_bins' }, () => loadBins())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const loadStats = async () => {
    const [{ count: total }, { count: pending }, { count: inProgress }, { count: completed }] = await Promise.all([
      supabase.from('reports').select('*', { count: 'exact', head: true }),
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    ])

    const [{ count: activeC }] = await Promise.all([
      supabase.from('cleaners').select('*', { count: 'exact', head: true }).eq('is_active', true),
    ])

    const today = new Date().toISOString().slice(0, 10)
    const { count: todayC } = await supabase.from('reports').select('*', { count: 'exact', head: true }).gte('created_at', today)

    const twoMinAgo = new Date(Date.now() - 120000).toISOString()
    const { count: onlineBins } = await supabase.from('smart_bins').select('*', { count: 'exact', head: true }).gte('last_updated', twoMinAgo)

    setStats({ total: total || 0, pending: pending || 0, inProgress: inProgress || 0, completed: completed || 0, activeCleaners: activeC || 0, binsOnline: onlineBins || 0, todayReports: todayC || 0 })
  }

  const loadRecentReports = async () => {
    const { data } = await supabase.from('reports').select('*').order('created_at', { ascending: false }).limit(10)
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

  const statCards = [
    { label: 'Total Reports', value: stats.total, color: '#3b82f6' },
    { label: 'Pending', value: stats.pending, color: '#f59e0b' },
    { label: 'In Progress', value: stats.inProgress, color: '#8b5cf6' },
    { label: 'Completed', value: stats.completed, color: '#22c55e' },
    { label: 'Active Cleaners', value: stats.activeCleaners, color: '#06b6d4' },
    { label: 'Smart Bins Online', value: stats.binsOnline, color: '#10b981' },
    { label: "Today's Reports", value: stats.todayReports, color: '#ef4444' },
  ]

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {statCards.map(s => (
          <div key={s.label} className="p-4 rounded-xl text-center" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
            <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>{s.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-[500px] rounded-xl overflow-hidden" style={{ border: '1px solid var(--card-border)' }}>
          <AdminMap reports={reports} cleaners={cleaners} bins={bins} />
        </div>
        <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
          <h2 className="text-lg font-semibold">Recent Reports</h2>
          {reports.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>No reports yet</p>
          ) : (
            <div className="space-y-2 max-h-[440px] overflow-y-auto">
              {reports.map(r => (
                <div key={r.id} className="p-2 rounded-lg text-xs" style={{ background: 'var(--background)' }}>
                  <div className="flex justify-between">
                    <span className="font-medium">{r.waste_type}</span>
                    <span style={{ color: 'var(--muted)' }}>{formatDate(r.created_at)}</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[10px]" style={{
                    background: r.status === 'completed' ? '#dcfce7' : r.status === 'in_progress' ? '#fef3c7' : '#f3f4f6',
                    color: r.status === 'completed' ? '#16a34a' : r.status === 'in_progress' ? '#d97706' : '#6b7280'
                  }}>{r.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
