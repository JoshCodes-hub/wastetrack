'use client'
import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import supabase from '@/lib/supabase'
import type { Report } from '@/types'

const COLORS = ['#22c55e', '#eab308', '#f97316', '#ef4444', '#8b5cf6', '#3b82f6', '#ec4899']

export default function AnalyticsDashboard() {
  const [reports, setReports] = useState<Report[]>([])
  const [stats, setStats] = useState({ total: 0, avgPerDay: 0, mostCommonWaste: '', mostCommonSeverity: '', thisWeek: 0 })

  useEffect(() => {
    supabase.from('reports').select('*').then(({ data }) => {
      if (!data) return
      const r = data as Report[]
      setReports(r)

      const total = r.length
      const wasteCounts: Record<string, number> = {}
      const severityCounts: Record<string, number> = {}
      let thisWeek = 0
      const weekAgo = Date.now() - 7 * 86400000

      r.forEach(re => {
        wasteCounts[re.waste_type || 'other'] = (wasteCounts[re.waste_type || 'other'] || 0) + 1
        severityCounts[re.severity] = (severityCounts[re.severity] || 0) + 1
        if (new Date(re.created_at).getTime() > weekAgo) thisWeek++
      })

      const mostCommonWaste = Object.entries(wasteCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
      const mostCommonSeverity = Object.entries(severityCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
      const avgPerDay = total / 14

      setStats({ total, avgPerDay: Math.round(avgPerDay * 10) / 10, mostCommonWaste, mostCommonSeverity, thisWeek })
    })
  }, [])

  const wasteData = Object.entries(
    reports.reduce((acc: Record<string, number>, r) => {
      acc[r.waste_type || 'other'] = (acc[r.waste_type || 'other'] || 0) + 1
      return acc
    }, {})
  ).map(([name, value]) => ({ name, value }))

  const severityData = Object.entries(
    reports.reduce((acc: Record<string, number>, r) => {
      acc[r.severity] = (acc[r.severity] || 0) + 1
      return acc
    }, {})
  ).map(([name, value]) => ({ name, value }))

  const statusData = Object.entries(
    reports.reduce((acc: Record<string, number>, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1
      return acc
    }, {})
  ).map(([name, value]) => ({ name, value }))

  const dailyData: Record<string, number> = {}
  const now = new Date()
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    dailyData[key] = 0
  }
  reports.forEach(r => {
    const key = r.created_at.slice(0, 10)
    if (dailyData[key] !== undefined) dailyData[key]++
  })
  const dailyChartData = Object.entries(dailyData).map(([date, count]) => ({ date: date.slice(5), count }))

  const statCards = [
    { label: 'Total Reports', value: stats.total },
    { label: 'Avg Reports/Day', value: stats.avgPerDay },
    { label: 'Most Common Waste', value: stats.mostCommonWaste },
    { label: 'Most Common Severity', value: stats.mostCommonSeverity },
    { label: 'Reports This Week', value: stats.thisWeek },
  ]

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Analytics Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {statCards.map(s => (
          <div key={s.label} className="p-4 rounded-xl text-center" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
            <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>{s.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: 'var(--primary)' }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
          <h3 className="text-sm font-semibold mb-4">Waste Type Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={wasteData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name }) => name}>
                {wasteData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="p-4 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
          <h3 className="text-sm font-semibold mb-4">Severity Levels</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={severityData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="p-4 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
          <h3 className="text-sm font-semibold mb-4">Daily Reports (14 days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyChartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="p-4 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
          <h3 className="text-sm font-semibold mb-4">Report Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {statusData.map((_, i) => <Cell key={i} fill={['#f59e0b', '#8b5cf6', '#22c55e'][i] || '#6b7280'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl text-center" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
          <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Active Cleaners</p>
          <p className="text-2xl font-bold mt-1" style={{ color: '#3b82f6' }}>—</p>
        </div>
        <div className="p-4 rounded-xl text-center" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
          <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Smart Bins Online</p>
          <p className="text-2xl font-bold mt-1" style={{ color: '#10b981' }}>—</p>
        </div>
        <div className="p-4 rounded-xl text-center" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
          <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Avg Response Time</p>
          <p className="text-2xl font-bold mt-1" style={{ color: '#f97316' }}>—</p>
        </div>
        <div className="p-4 rounded-xl text-center" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
          <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Completion Rate</p>
          <p className="text-2xl font-bold mt-1" style={{ color: '#22c55e' }}>
            {reports.length > 0 ? `${Math.round((stats.total > 0 ? reports.filter(r => r.status === 'completed').length / stats.total : 0) * 100)}%` : '—'}
          </p>
        </div>
      </div>
    </div>
  )
}
