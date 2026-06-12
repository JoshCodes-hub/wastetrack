'use client'
import { useEffect, useState, useRef } from 'react'
import supabase from '@/lib/supabase'
import Leaderboard from '@/components/Leaderboard'
import { classifyWasteType } from '@/lib/ai'
import { Report } from '@/types'
import Link from 'next/link'

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
  const [imagePreview, setImagePreview] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [tab, setTab] = useState<'submit' | 'reports'>('submit')
  const [aiLabel, setAiLabel] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const geocodeCache = useRef<Map<string, string>>(new Map())

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        loadReports(session.user.id)
        supabase.from('users').select('role').eq('id', session.user.id).single().then(
          ({ data }) => { if (data?.role === 'admin') setIsAdmin(true) }
        )
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
    setImagePreview(URL.createObjectURL(file))
    setAiLabel('🧠 Analyzing with AI...')
    const result = await classifyWasteType(file)
    setWasteType(result.wasteType)
    setAiLabel(`🧠 AI detected: ${result.label} → ${result.wasteType.replace('_', ' ')} (${(result.confidence * 100).toFixed(0)}%)`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !lat || !lng) return
    setSubmitting(true)
    setSuccessMsg('')
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
      setSuccessMsg('✅ Report submitted successfully!')
      setDescription('')
      setImageFile(null)
      setImagePreview('')
      setAiLabel('')
      loadReports(user.id)
      setTimeout(() => setSuccessMsg(''), 3000)
    }
    setSubmitting(false)
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold gradient-text">Reporter Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Submit and track waste reports</p>
        </div>
        {isAdmin && (
          <Link href="/dashboard/admin" className="btn-ghost flex items-center gap-2 text-sm">
            ⚙️ Admin Panel
          </Link>
        )}
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm font-medium animate-fade-up">
          {successMsg}
        </div>
      )}

      <div className="flex gap-2">
        {(['submit', 'reports'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              tab === t ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25' : 'card text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}>
            {t === 'submit' ? '📸 New Report' : `📋 My Reports (${reports.length})`}
          </button>
        ))}
      </div>

      {tab === 'submit' && (
        <form onSubmit={handleSubmit} className="card p-6 space-y-5 animate-fade-up">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
            <span className="text-lg">{gpsStatus}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Photo</label>
              <div className="relative">
                <input type="file" accept="image/*" capture="environment" onChange={handleImageChange}
                  className="input-field file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-emerald-50 dark:file:bg-emerald-900/30 file:text-emerald-700 dark:file:text-emerald-300" />
                {imagePreview && (
                  <img src={imagePreview} alt="Preview" className="mt-2 w-32 h-32 object-cover rounded-xl" />
                )}
              </div>
              {aiLabel && <p className="text-xs mt-2 text-gray-500 dark:text-gray-400">{aiLabel}</p>}
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Waste Type</label>
                <select value={wasteType} onChange={e => setWasteType(e.target.value)} className="select-field">
                  {['mixed_waste','plastic','paper','metal','glass','food_waste','electronic','hazardous','other'].map(t => (
                    <option key={t} value={t}>{t.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Severity</label>
                  <select value={severity} onChange={e => setSeverity(e.target.value)} className="select-field">
                    {['low','medium','high','critical'].map(t => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Priority</label>
                  <select value={priority} onChange={e => setPriority(e.target.value)} className="select-field">
                    {['low','medium','high','urgent'].map(t => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Address</label>
            <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Auto-detected from GPS" className="input-field" />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Describe what you see..." className="input-field resize-none" />
          </div>

          <button type="submit" disabled={submitting || !lat} className="btn-primary w-full flex items-center justify-center gap-2">
            {submitting ? <><div className="spinner w-4 h-4 border-2 border-white/30 border-t-white"></div> Submitting...</> : '📤 Submit Report'}
          </button>
        </form>
      )}

      {tab === 'reports' && (
        <div className="space-y-4 animate-fade-up">
          <div className="card p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Reports</p>
              <p className="text-3xl font-bold gradient-text">{reports.length}</p>
            </div>
            <div className="text-4xl">📊</div>
          </div>

          {reports.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="text-5xl mb-4">📭</div>
              <p className="text-gray-500 dark:text-gray-400">No reports yet. Submit your first report!</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {reports.map((r, i) => (
                <div key={r.id} className="card p-5 animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`badge ${
                          r.status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' :
                          r.status === 'in_progress' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' :
                          'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                        }`}>{r.status}</span>
                        <span className="badge bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">{r.waste_type?.replace('_', ' ')}</span>
                        <span className={`badge ${
                          r.severity === 'critical' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                          r.severity === 'high' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' :
                          'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        }`}>{r.severity}</span>
                      </div>
                      {r.description && <p className="text-sm mb-1">{r.description}</p>}
                      {r.address && <p className="text-xs text-gray-400">{r.address.slice(0, 100)}</p>}
                      <p className="text-xs text-gray-400 mt-2">{new Date(r.created_at).toLocaleString()}</p>
                    </div>
                    {r.image_url && (
                      <img src={r.image_url} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                    )}
                  </div>
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
