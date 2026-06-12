'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import supabase from '@/lib/supabase'
import { useCleanerLocation } from '@/hooks/useCleanerLocation'
import { useCleanerRouting } from '@/hooks/useCleanerRouting'
import type { Assignment, Report } from '@/types'

const CleanerMap = dynamic(() => import('@/components/CleanerMap'), { ssr: false })

export default function CleanerDashboard() {
  const [user, setUser] = useState<any>(null)
  const [cleanerId, setCleanerId] = useState<string | null>(null)
  const [assignments, setAssignments] = useState<(Assignment & { report?: Report })[]>([])
  const [cleanerLat, setCleanerLat] = useState<number | null>(null)
  const [cleanerLng, setCleanerLng] = useState<number | null>(null)
  const [toast, setToast] = useState('')
  const [updatingId, setUpdatingId] = useState('')

  useCleanerLocation(cleanerId)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        supabase.from('cleaners').select('id').eq('user_id', session.user.id).single().then(({ data }) => {
          if (data) { setCleanerId(data.id); loadAssignments(data.id) }
        })
      }
    })
  }, [])

  useEffect(() => {
    if (!cleanerId) return
    const channel = supabase.channel('cleaner-live')
      .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'assignments', filter: `cleaner_id=eq.${cleanerId}` },
        (payload: any) => {
          const na = payload.new as Assignment
          supabase.from('reports').select('*').eq('id', na.report_id).single().then(({ data }) => {
            setAssignments(prev => [...prev, { ...na, report: data as Report }])
          })
          setToast('🎯 New assignment received!')
          setTimeout(() => setToast(''), 5000)
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
    if (data) {
      setAssignments(data as any)
      const first = data[0] as any
      if (first?.report) {
        setCleanerLat(first.report.latitude)
        setCleanerLng(first.report.longitude)
      }
    }
  }

  const sorted = useCleanerRouting(assignments, cleanerLat, cleanerLng)

  const updateStatus = async (assignmentId: string, status: string, reportId: string) => {
    setUpdatingId(assignmentId)
    await supabase.from('assignments').update({
      status, ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {}),
    }).eq('id', assignmentId)
    if (status === 'completed') {
      await supabase.from('reports').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', reportId)
    }
    if (cleanerId) loadAssignments(cleanerId)
    setUpdatingId('')
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {toast && (
        <div className="fixed top-20 right-4 z-50 px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-medium bg-gradient-to-r from-emerald-500 to-emerald-600 animate-slide-in">
          {toast}
        </div>
      )}

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold gradient-text">Cleaner Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{assignments.length} active assignment{assignments.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          {sorted.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="text-5xl mb-4">🎉</div>
              <p className="text-gray-500 dark:text-gray-400">No active assignments</p>
              <p className="text-xs text-gray-400 mt-1">You'll be notified when a new one arrives</p>
            </div>
          ) : (
            sorted.map((a, i) => (
              <div key={a.id} className="card p-5 animate-fade-up" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`badge ${
                      a.status === 'in_progress' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' :
                      'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    }`}>{a.status === 'in_progress' ? '🔄 In Progress' : '📌 Assigned'}</span>
                    {a.distance_km && (
                      <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg text-gray-500">
                        📍 {a.distance_km.toFixed(1)} km
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">#{i + 1}</span>
                </div>
                {a.report && (
                  <div className="space-y-1">
                    <p className="font-semibold">{a.report.waste_type?.replace('_', ' ')} · {a.report.severity}</p>
                    {a.report.address && <p className="text-sm text-gray-500 dark:text-gray-400">{a.report.address.slice(0, 80)}</p>}
                    {a.report.description && <p className="text-sm text-gray-600 dark:text-gray-300">{a.report.description}</p>}
                  </div>
                )}
                <div className="flex gap-2 mt-4">
                  {a.status === 'assigned' && (
                    <button onClick={() => updateStatus(a.id, 'in_progress', a.report_id)} disabled={updatingId === a.id}
                      className="btn-primary text-sm py-2 px-4 flex items-center gap-1">
                      {updatingId === a.id ? '⏳' : '▶'} Start
                    </button>
                  )}
                  {a.status === 'in_progress' && (
                    <button onClick={() => updateStatus(a.id, 'completed', a.report_id)} disabled={updatingId === a.id}
                      className="btn-primary text-sm py-2 px-4 flex items-center gap-1" style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                      {updatingId === a.id ? '⏳' : '✅'} Complete
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="h-[500px] rounded-2xl overflow-hidden card p-1">
          <CleanerMap assignments={sorted} cleanerLat={cleanerLat} cleanerLng={cleanerLng} />
        </div>
      </div>
    </div>
  )
}
