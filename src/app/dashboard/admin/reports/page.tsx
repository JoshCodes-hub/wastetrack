'use client'
import { useEffect, useState } from 'react'
import supabase from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import type { Report, Cleaner } from '@/types'

export default function AdminReports() {
  const [reports, setReports] = useState<Report[]>([])
  const [cleaners, setCleaners] = useState<Cleaner[]>([])
  const [filter, setFilter] = useState({ status: '', severity: '', wasteType: '' })
  const [sortField, setSortField] = useState('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [assignCleaner, setAssignCleaner] = useState('')

  useEffect(() => {
    supabase.from('reports').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      if (data) setReports(data as Report[])
    })
    supabase.from('cleaners').select('*').eq('is_active', true).then(({ data }) => {
      if (data) setCleaners(data as Cleaner[])
    })
  }, [])

  const filtered = reports
    .filter(r => !filter.status || r.status === filter.status)
    .filter(r => !filter.severity || r.severity === filter.severity)
    .filter(r => !filter.wasteType || r.waste_type === filter.wasteType)
    .sort((a, b) => {
      const aVal = (a as any)[sortField]
      const bVal = (b as any)[sortField]
      if (typeof aVal === 'string') return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal
    })

  const handleAssign = async (reportId: string) => {
    if (!assignCleaner) return
    const cleaner = cleaners.find(c => c.id === assignCleaner)
    const report = reports.find(r => r.id === reportId)
    let distance: number | undefined
    if (cleaner?.latitude && cleaner?.longitude && report?.latitude && report?.longitude) {
      const R = 6371
      const dLat = ((report.latitude - cleaner.latitude) * Math.PI) / 180
      const dLng = ((report.longitude - cleaner.longitude) * Math.PI) / 180
      const a = Math.sin(dLat / 2) ** 2 + Math.cos((cleaner.latitude * Math.PI) / 180) * Math.cos((report.latitude * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
      distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    }
    await supabase.from('assignments').insert({
      report_id: reportId,
      cleaner_id: assignCleaner,
      status: 'assigned',
      distance_km: distance ? parseFloat(distance.toFixed(2)) : undefined,
    })
    await supabase.from('reports').update({ status: 'in_progress', updated_at: new Date().toISOString() }).eq('id', reportId)
    setAssignCleaner('')
    setExpandedId(null)
    const { data } = await supabase.from('reports').select('*').order('created_at', { ascending: false })
    if (data) setReports(data as Report[])
  }

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  const SortHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <th className="p-3 text-left text-xs font-medium cursor-pointer select-none" style={{ color: 'var(--muted)' }}
      onClick={() => handleSort(field)}>
      {children} {sortField === field ? (sortDir === 'asc' ? '▲' : '▼') : ''}
    </th>
  )

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Reports Management</h1>

      <div className="flex gap-3 flex-wrap">
        <select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
          className="p-2 rounded-lg border text-sm" style={{ background: 'var(--card)', borderColor: 'var(--card-border)', color: 'var(--foreground)' }}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
        <select value={filter.severity} onChange={e => setFilter(f => ({ ...f, severity: e.target.value }))}
          className="p-2 rounded-lg border text-sm" style={{ background: 'var(--card)', borderColor: 'var(--card-border)', color: 'var(--foreground)' }}>
          <option value="">All Severity</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <select value={filter.wasteType} onChange={e => setFilter(f => ({ ...f, wasteType: e.target.value }))}
          className="p-2 rounded-lg border text-sm" style={{ background: 'var(--card)', borderColor: 'var(--card-border)', color: 'var(--foreground)' }}>
          <option value="">All Types</option>
          <option value="mixed_waste">Mixed Waste</option>
          <option value="plastic">Plastic</option>
          <option value="paper">Paper</option>
          <option value="metal">Metal</option>
          <option value="glass">Glass</option>
          <option value="food_waste">Food Waste</option>
          <option value="electronic">Electronic</option>
          <option value="hazardous">Hazardous</option>
        </select>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--card-border)' }}>
        <table className="w-full text-sm">
          <thead style={{ background: 'var(--card)' }}>
            <tr>
              <SortHeader field="waste_type">Type</SortHeader>
              <SortHeader field="severity">Severity</SortHeader>
              <SortHeader field="status">Status</SortHeader>
              <SortHeader field="created_at">Date</SortHeader>
              <th className="p-3 text-left text-xs font-medium" style={{ color: 'var(--muted)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <>
                <tr key={r.id} className="cursor-pointer" style={{ background: 'var(--background)', borderBottom: '1px solid var(--card-border)' }}
                  onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}>
                  <td className="p-3">{r.waste_type || '—'}</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded text-xs" style={{
                    background: r.severity === 'critical' ? '#fef2f2' : r.severity === 'high' ? '#fff7ed' : '#f0fdf4',
                    color: r.severity === 'critical' ? '#dc2626' : r.severity === 'high' ? '#ea580c' : '#16a34a'
                  }}>{r.severity}</span></td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded text-xs" style={{
                    background: r.status === 'completed' ? '#dcfce7' : r.status === 'in_progress' ? '#fef3c7' : '#f3f4f6',
                    color: r.status === 'completed' ? '#16a34a' : r.status === 'in_progress' ? '#d97706' : '#6b7280'
                  }}>{r.status}</span></td>
                  <td className="p-3" style={{ color: 'var(--muted)' }}>{formatDate(r.created_at)}</td>
                  <td className="p-3">—</td>
                </tr>
                {expandedId === r.id && (
                  <tr key={`${r.id}-details`} style={{ background: 'var(--card)' }}>
                    <td colSpan={5} className="p-4">
                      <div className="space-y-2 text-sm">
                        <p><strong>Description:</strong> {r.description || 'None'}</p>
                        <p><strong>Address:</strong> {r.address || 'None'}</p>
                        <p><strong>Priority:</strong> {r.priority}</p>
                        <p><strong>Location:</strong> {r.latitude}, {r.longitude}</p>
                        {r.image_url && <p><img src={r.image_url} alt="report" className="max-w-xs rounded-lg" /></p>}
                        {r.status !== 'completed' && (
                          <div className="flex gap-2 items-center mt-3">
                            <select value={assignCleaner} onChange={e => setAssignCleaner(e.target.value)}
                              className="p-2 rounded-lg border text-sm" style={{ background: 'var(--background)', borderColor: 'var(--card-border)', color: 'var(--foreground)' }}>
                              <option value="">Assign cleaner...</option>
                              {cleaners.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <button onClick={() => handleAssign(r.id)} disabled={!assignCleaner}
                              className="px-3 py-1.5 rounded text-xs font-medium text-white disabled:opacity-50" style={{ background: 'var(--primary)' }}>
                              Assign
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center" style={{ color: 'var(--muted)' }}>No reports found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
