'use client'
import { useEffect, useState, useRef } from 'react'
import supabase from '@/lib/supabase'
import Leaderboard from '@/components/Leaderboard'
import { classifyWasteType } from '@/lib/ai'
import { Report } from '@/types'

export default function ReporterDashboard() {
  const [user, setUser] = useState<any>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [gpsStatus, setGpsStatus] = useState('📍 Acquiring GPS...')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [address, setAddress] = useState('')
  const [description, setDescription] = useState('')
  const [wasteType, setWasteType] = useState('mixed_waste')
  const [severity, setSeverity] = useState('low')
  const [priority, setPriority] = useState('low')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [tab, setTab] = useState<'submit' | 'reports'>('submit')
  const [aiLabel, setAiLabel] = useState('')
  const geocodeCache = useRef<Map<string, string>>(new Map())

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        loadReports(session.user.id)
      }
    })
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setLat(latitude.toFixed(6))
        setLng(longitude.toFixed(6))
        setGpsStatus(`📍 ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`)
        const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`
        if (geocodeCache.current.has(cacheKey)) {
          setAddress(geocodeCache.current.get(cacheKey)!)
        } else {
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
            .then(r => r.json()).then(d => {
              const addr = d.display_name || ''
              setAddress(addr)
              geocodeCache.current.set(cacheKey, addr)
            }).catch(() => {})
        }
      },
      () => setGpsStatus('⚠ GPS unavailable'),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  const loadReports = async (userId: string) => {
    const { data } = await supabase
      .from('reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (data) setReports(data as Report[])
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const result = await classifyWasteType(file)
    setWasteType(result.wasteType)
    setAiLabel(`AI: ${result.label} (${(result.confidence * 100).toFixed(0)}%) → ${result.wasteType}`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !lat || !lng) return
    setSubmitting(true)
    let imageUrl = ''
    if (imageFile) {
      const ext = imageFile.name.split('.').pop()
      const path = `reports/${user.id}/${Date.now()}.${ext}`
      await supabase.storage.from('report_images').upload(path, imageFile)
      const { data: { publicUrl } } = supabase.storage.from('report_images').getPublicUrl(path)
      imageUrl = publicUrl
    }
    const { error } = await supabase.from('reports').insert({
      user_id: user.id,
      image_url: imageUrl || undefined,
      description,
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
      address: address || undefined,
      waste_type: wasteType,
      severity,
      priority,
      status: 'pending',
    })
    if (!error) {
      setDescription('')
      setImageFile(null)
      setAiLabel('')
      loadReports(user.id)
      setTab('reports')
    }
    setSubmitting(false)
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Reporter Dashboard</h1>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('submit')} className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: tab === 'submit' ? 'var(--primary)' : 'var(--card)', color: tab === 'submit' ? 'white' : 'var(--foreground)' }}>
          Submit Report
        </button>
        <button onClick={() => setTab('reports')} className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: tab === 'reports' ? 'var(--primary)' : 'var(--card)', color: tab === 'reports' ? 'white' : 'var(--foreground)' }}>
          My Reports ({reports.length})
        </button>
      </div>

      {tab === 'submit' && (
        <form onSubmit={handleSubmit} className="space-y-4 p-6 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
          <p className="text-sm font-medium">{gpsStatus}</p>
          <input type="hidden" name="lat" value={lat} />
          <input type="hidden" name="lng" value={lng} />
          <div>
            <label className="text-sm font-medium">Photo</label>
            <input type="file" accept="image/*" capture="environment" onChange={handleImageChange}
              className="w-full p-2 rounded-lg border text-sm" style={{ background: 'var(--background)', borderColor: 'var(--card-border)' }} />
            {aiLabel && <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{aiLabel}</p>}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium">Waste Type</label>
              <select value={wasteType} onChange={e => setWasteType(e.target.value)}
                className="w-full p-2 rounded-lg border text-sm" style={{ background: 'var(--background)', borderColor: 'var(--card-border)', color: 'var(--foreground)' }}>
                <option value="mixed_waste">Mixed Waste</option>
                <option value="plastic">Plastic</option>
                <option value="paper">Paper</option>
                <option value="metal">Metal</option>
                <option value="glass">Glass</option>
                <option value="food_waste">Food Waste</option>
                <option value="electronic">Electronic</option>
                <option value="hazardous">Hazardous</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Severity</label>
              <select value={severity} onChange={e => setSeverity(e.target.value)}
                className="w-full p-2 rounded-lg border text-sm" style={{ background: 'var(--background)', borderColor: 'var(--card-border)', color: 'var(--foreground)' }}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)}
                className="w-full p-2 rounded-lg border text-sm" style={{ background: 'var(--background)', borderColor: 'var(--card-border)', color: 'var(--foreground)' }}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Address</label>
            <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Auto-filled from GPS"
              className="w-full p-2 rounded-lg border text-sm" style={{ background: 'var(--background)', borderColor: 'var(--card-border)', color: 'var(--foreground)' }} />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              className="w-full p-2 rounded-lg border text-sm" style={{ background: 'var(--background)', borderColor: 'var(--card-border)', color: 'var(--foreground)' }} />
          </div>
          <button type="submit" disabled={submitting || !lat}
            className="px-6 py-3 rounded-lg text-white font-semibold disabled:opacity-50"
            style={{ background: 'var(--primary)' }}>
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </form>
      )}

      {tab === 'reports' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl flex items-center justify-between" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
            <span className="font-medium">Total Reports Submitted</span>
            <span className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>{reports.length}</span>
          </div>
          {reports.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>No reports yet. Submit your first report!</p>
          ) : (
            <div className="space-y-3">
              {reports.map(r => (
                <div key={r.id} className="p-4 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-medium px-2 py-1 rounded" style={{
                        background: r.status === 'completed' ? '#dcfce7' : r.status === 'in_progress' ? '#fef3c7' : '#f3f4f6',
                        color: r.status === 'completed' ? '#16a34a' : r.status === 'in_progress' ? '#d97706' : '#6b7280'
                      }}>{r.status}</span>
                      <span className="ml-2 text-xs" style={{ color: 'var(--muted)' }}>{r.waste_type} · {r.severity}</span>
                    </div>
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  {r.description && <p className="text-sm mt-2">{r.description}</p>}
                  {r.address && <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{r.address}</p>}
                </div>
              ))}
            </div>
          )}
          <Leaderboard />
        </div>
      )}
    </div>
  )
}
