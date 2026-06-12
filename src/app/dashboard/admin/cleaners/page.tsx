'use client'
import { useEffect, useState } from 'react'
import supabase from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import type { Cleaner } from '@/types'

export default function AdminCleaners() {
  const [cleaners, setCleaners] = useState<Cleaner[]>([])

  useEffect(() => {
    supabase.from('cleaners').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      if (data) setCleaners(data as Cleaner[])
    })
    const channel = supabase.channel('admin-cleaners')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'cleaners' }, () => {
        supabase.from('cleaners').select('*').order('created_at', { ascending: false }).then(({ data }) => {
          if (data) setCleaners(data as Cleaner[])
        })
      }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('cleaners').update({ is_active: !current, updated_at: new Date().toISOString() }).eq('id', id)
    setCleaners(prev => prev.map(c => c.id === id ? { ...c, is_active: !current } : c))
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Cleaners Management</h1>

      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--card-border)' }}>
        <table className="w-full text-sm">
          <thead style={{ background: 'var(--card)' }}>
            <tr>
              <th className="p-3 text-left text-xs font-medium" style={{ color: 'var(--muted)' }}>Name</th>
              <th className="p-3 text-left text-xs font-medium" style={{ color: 'var(--muted)' }}>Email</th>
              <th className="p-3 text-left text-xs font-medium" style={{ color: 'var(--muted)' }}>Status</th>
              <th className="p-3 text-left text-xs font-medium" style={{ color: 'var(--muted)' }}>Last GPS</th>
              <th className="p-3 text-left text-xs font-medium" style={{ color: 'var(--muted)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {cleaners.map(c => (
              <tr key={c.id} style={{ background: 'var(--background)', borderBottom: '1px solid var(--card-border)' }}>
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3" style={{ color: 'var(--muted)' }}>{c.email}</td>
                <td className="p-3">
                  <span className="flex items-center gap-1 text-xs">
                    <span className={`w-2 h-2 rounded-full ${c.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                    {c.is_active ? 'Active' : 'Offline'}
                  </span>
                </td>
                <td className="p-3 text-xs" style={{ color: 'var(--muted)' }}>
                  {c.latitude && c.longitude
                    ? `${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)}`
                    : 'No GPS'}
                  <br />
                  {formatDate(c.updated_at)}
                </td>
                <td className="p-3">
                  <button onClick={() => toggleActive(c.id, c.is_active)}
                    className="px-3 py-1 rounded text-xs font-medium text-white"
                    style={{ background: c.is_active ? '#ef4444' : 'var(--primary)' }}>
                    {c.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
            {cleaners.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center" style={{ color: 'var(--muted)' }}>No cleaners registered</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
