'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import supabase from '@/lib/supabase'
import { timeAgo } from '@/lib/utils'
import type { SmartBin, Cleaner } from '@/types'

const BinMap = dynamic(() => import('@/components/BinMap'), { ssr: false })

const statusColors: Record<string, string> = {
  LOW: '#22c55e', MEDIUM: '#eab308', HIGH: '#f97316', FULL: '#ef4444',
  empty: '#22c55e', half_full: '#eab308', full: '#ef4444',
}

function SmartBinCard({ bin }: { bin: SmartBin }) {
  const [placeName, setPlaceName] = useState('')
  const [secondsAgo, setSecondsAgo] = useState(0)
  const geocodeCache = useRef(new Map<string, string>())

  useEffect(() => {
    if (!bin.last_updated) return
    const update = () => setSecondsAgo(Math.floor((Date.now() - new Date(bin.last_updated).getTime()) / 1000))
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [bin.last_updated])

  useEffect(() => {
    if (!bin.latitude || !bin.longitude) return
    const key = `${bin.latitude.toFixed(3)},${bin.longitude.toFixed(3)}`
    if (geocodeCache.current.has(key)) { setPlaceName(geocodeCache.current.get(key)!); return }
    const timeout = setTimeout(() => {
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${bin.latitude}&lon=${bin.longitude}`)
        .then(r => r.json()).then(d => {
          const name = d.display_name?.split(',')?.slice(0, 3).join(', ') || d.name || 'Unknown'
          geocodeCache.current.set(key, name)
          setPlaceName(name)
        }).catch(() => {})
    }, 200)
    return () => clearTimeout(timeout)
  }, [bin.latitude, bin.longitude])

  const isOnline = secondsAgo < 120
  const isReading = bin.fill_level === 0 && bin.status === 'LOW'

  return (
    <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">{bin.name || bin.bin_id}</h3>
        <span className="flex items-center gap-1 text-xs">
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></span>
          {isOnline ? `${secondsAgo}s ago` : 'Offline'}
        </span>
      </div>

      {!bin.latitude ? (
        <p className="text-xs" style={{ color: 'var(--muted)' }}>Acquiring location...</p>
      ) : placeName ? (
        <p className="text-xs" style={{ color: 'var(--muted)' }}>{placeName}</p>
      ) : null}

      {isReading ? (
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Reading...</p>
      ) : (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Fill Level</span>
            <span className="font-bold" style={{ color: statusColors[bin.status] || '#6b7280' }}>{bin.fill_level}%</span>
          </div>
          <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'var(--background)' }}>
            <div className="h-full fill-bar-anim rounded-full transition-all duration-700"
              style={{ width: `${bin.fill_level}%`, background: statusColors[bin.status] || '#6b7280' }} />
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <span className="text-xs px-2 py-0.5 rounded font-medium"
          style={{ background: `${statusColors[bin.status]}20`, color: statusColors[bin.status] || '#6b7280' }}>
          {bin.status}
        </span>
        {bin.last_updated && <span className="text-xs" style={{ color: 'var(--muted)' }}>{timeAgo(bin.last_updated)}</span>}
      </div>
    </div>
  )
}

export default function BinsDashboard() {
  const [bins, setBins] = useState<SmartBin[]>([])
  const [cleaners, setCleaners] = useState<Cleaner[]>([])
  const [reconnected, setReconnected] = useState(false)
  const [mostRecentBinId, setMostRecentBinId] = useState<string | null>(null)
  const processedFullBins = useRef(new Set<string>())

  const loadBins = useCallback(async () => {
    const { data } = await supabase.from('smart_bins').select('*').order('last_updated', { ascending: false })
    if (data) setBins(data as SmartBin[])
  }, [])

  const loadCleaners = useCallback(async () => {
    const { data } = await supabase.from('cleaners').select('*').eq('is_active', true)
    if (data) setCleaners(data as Cleaner[])
  }, [])

  useEffect(() => {
    loadBins()
    loadCleaners()

    const channel = supabase.channel('smart_bins_monitor')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'smart_bins' }, async (payload: any) => {
        const bin = payload.new as SmartBin
        loadBins()
        setMostRecentBinId(bin.id)
        setTimeout(() => setMostRecentBinId(null), 5000)

        if (bin.status === 'FULL' && !processedFullBins.current.has(bin.id)) {
          processedFullBins.current.add(bin.id)
          await handleFullBin(bin)
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setReconnected(false)
        else if (status === 'CLOSED') setReconnected(true)
      })

    const retryTimer = setInterval(() => {
      if (reconnected) { loadBins(); setReconnected(false) }
    }, 5000)

    return () => { supabase.removeChannel(channel); clearInterval(retryTimer) }
  }, [])

  const handleFullBin = async (bin: SmartBin) => {
    if (!bin.latitude || !bin.longitude) return

    const { data: activeCleaners } = await supabase.from('cleaners').select('*').eq('is_active', true)
    const cList = (activeCleaners || []) as Cleaner[]

    let nearestId: string | null = null
    let minDist = Infinity
    for (const c of cList) {
      if (!c.latitude || !c.longitude) continue
      const R = 6371
      const dLat = ((bin.latitude - c.latitude) * Math.PI) / 180
      const dLng = ((bin.longitude - c.longitude) * Math.PI) / 180
      const a = Math.sin(dLat / 2) ** 2 + Math.cos((c.latitude * Math.PI) / 180) * Math.cos((bin.latitude * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
      const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      if (d < minDist) { minDist = d; nearestId = c.id }
    }

    const { data: adminUsers } = await supabase.from('users').select('id').eq('role', 'admin').limit(1)
    const adminId = (adminUsers as any)?.[0]?.id || '00000000-0000-0000-0000-000000000000'

    const { data: report } = await supabase.from('reports').insert({
      user_id: adminId,
      description: `Auto-report: Smart bin "${bin.name || bin.bin_id}" is FULL at ${bin.latitude}, ${bin.longitude}`,
      latitude: bin.latitude,
      longitude: bin.longitude,
      waste_type: 'mixed_waste',
      severity: 'high',
      priority: 'urgent',
      status: 'pending',
    }).select().single()

    if (report && nearestId) {
      await supabase.from('assignments').insert({
        report_id: report.id,
        cleaner_id: nearestId,
        status: 'assigned',
        distance_km: parseFloat(minDist.toFixed(2)),
      })
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {reconnected && (
        <div className="px-4 py-2 rounded-lg text-white text-sm font-medium bg-amber-600 text-center animate-pulse">
          Reconnecting...
        </div>
      )}

      <h1 className="text-2xl font-bold">Smart Bins IoT Dashboard</h1>
      <p className="text-sm" style={{ color: 'var(--muted)' }}>{bins.length} bin{bins.length !== 1 ? 's' : ''} connected</p>

      <div className="h-[400px] rounded-xl overflow-hidden" style={{ border: '1px solid var(--card-border)' }}>
        <BinMap bins={bins} mostRecentBinId={mostRecentBinId} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {bins.map(b => <SmartBinCard key={b.id} bin={b} />)}
        {bins.length === 0 && (
          <div className="col-span-full p-12 text-center rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
            <p style={{ color: 'var(--muted)' }}>No smart bins found. Waiting for ESP32 data...</p>
            <div className="spinner w-6 h-6 border-2 rounded-full mx-auto mt-2" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }}></div>
          </div>
        )}
      </div>
    </div>
  )
}
