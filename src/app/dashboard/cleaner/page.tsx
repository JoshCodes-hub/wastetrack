'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import supabase from '@/lib/supabase'
import { useCleanerLocation } from '@/hooks/useCleanerLocation'
import { useCleanerRouting } from '@/hooks/useCleanerRouting'
import type { Assignment, Report } from '@/types'

const MapWithNoSSR = dynamic(() => import('@/components/CleanerMap'), { ssr: false })

export default function CleanerDashboard() {
  const [user, setUser] = useState<any>(null)
  const [cleanerId, setCleanerId] = useState<string | null>(null)
  const [assignments, setAssignments] = useState<(Assignment & { report?: Report })[]>([])
  const [cleanerLat, setCleanerLat] = useState<number | null>(null)
  const [cleanerLng, setCleanerLng] = useState<number | null>(null)
  const [toast, setToast] = useState('')

  useCleanerLocation(cleanerId)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        supabase.from('cleaners').select('id').eq('user_id', session.user.id).single().then(({ data }) => {
          if (data) {
            setCleanerId(data.id)
            loadAssignments(data.id)
          }
        })
      }
    })
  }, [])

  useEffect(() => {
    if (!cleanerId) return
    const channel = supabase.channel('cleaner-assignments')
      .on('postgres_changes' as any, {
        event: 'INSERT',
        schema: 'public',
        table: 'assignments',
        filter: `cleaner_id=eq.${cleanerId}`,
      }, (payload: any) => {
        const newAssign = payload.new as Assignment
        supabase.from('reports').select('*').eq('id', newAssign.report_id).single().then(({ data }) => {
          setAssignments(prev => [...prev, { ...newAssign, report: data as Report }])
        })
        setToast('New assignment received!')
        setTimeout(() => setToast(''), 4000)
      }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [cleanerId])

  useEffect(() => {
    if (!cleanerId) return
    const interval = setInterval(() => {
      supabase.from('cleaners').select('latitude,longitude').eq('id', cleanerId).single().then(({ data }) => {
        if (data?.latitude) { setCleanerLat(data.latitude); setCleanerLng(data.longitude) }
      })
    }, 3000)
    return () => clearInterval(interval)
  }, [cleanerId])

  const loadAssignments = async (id: string) => {
    const { data } = await supabase
      .from('assignments')
      .select('*, report:reports(*)')
      .eq('cleaner_id', id)
      .neq('status', 'completed')
      .order('assigned_at', { ascending: false })
    if (data) setAssignments(data as any)
    if (data && data[0]?.report) {
      const r = data[0].report as Report
      setCleanerLat(r.latitude)
      setCleanerLng(r.longitude)
    }
  }

  const sortedAssignments = useCleanerRouting(assignments, cleanerLat, cleanerLng)

  const updateStatus = async (assignmentId: string, status: string, reportId: string) => {
    await supabase.from('assignments').update({
      status,
      ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {}),
    }).eq('id', assignmentId)
    if (status === 'completed') {
      await supabase.from('reports').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', reportId)
    }
    if (cleanerId) loadAssignments(cleanerId)
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-white text-sm font-medium bg-green-600">
          {toast}
        </div>
      )}
      <h1 className="text-2xl font-bold">Cleaner Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">My Assignments ({sortedAssignments.length})</h2>
          {sortedAssignments.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>No active assignments</p>
          ) : (
            <div className="space-y-3">
              {sortedAssignments.map(a => (
                <div key={a.id} className="p-4 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-medium px-2 py-1 rounded" style={{
                      background: a.status === 'in_progress' ? '#fef3c7' : '#f3f4f6',
                      color: a.status === 'in_progress' ? '#d97706' : '#6b7280',
                    }}>{a.status}</span>
                    {a.distance_km && <span className="text-xs" style={{ color: 'var(--muted)' }}>{a.distance_km.toFixed(1)} km</span>}
                  </div>
                  {a.report && (
                    <>
                      <p className="text-sm font-medium">{a.report.waste_type} · {a.report.severity}</p>
                      {a.report.address && <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{a.report.address}</p>}
                    </>
                  )}
                  <div className="flex gap-2 mt-3">
                    {a.status === 'assigned' && (
                      <button onClick={() => updateStatus(a.id, 'in_progress', a.report_id)}
                        className="px-3 py-1.5 rounded text-xs font-medium text-white" style={{ background: '#d97706' }}>
                        Start
                      </button>
                    )}
                    {a.status === 'in_progress' && (
                      <button onClick={() => updateStatus(a.id, 'completed', a.report_id)}
                        className="px-3 py-1.5 rounded text-xs font-medium text-white" style={{ background: 'var(--primary)' }}>
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="h-[500px] rounded-xl overflow-hidden" style={{ border: '1px solid var(--card-border)' }}>
          <MapWithNoSSR assignments={sortedAssignments} cleanerLat={cleanerLat} cleanerLng={cleanerLng} />
        </div>
      </div>
    </div>
  )
}
