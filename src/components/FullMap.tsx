'use client'
import { useState, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet-defaulticon-compatibility'
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css'
import 'leaflet/dist/leaflet.css'
import type { Report, Cleaner, SmartBin } from '@/types'
import { timeAgo } from '@/lib/utils'

interface Props {
  reports: Report[]
  cleaners: Cleaner[]
  bins: SmartBin[]
}

const reportIcon = new L.DivIcon({
  className: '', html: '<div style="width:18px;height:18px;background:#ef4444;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>',
  iconSize: [18, 18], iconAnchor: [9, 9],
})
const cleanerIcon = new L.DivIcon({
  className: '', html: '<div style="width:20px;height:20px;background:#3b82f6;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
  iconSize: [20, 20], iconAnchor: [10, 10],
})
const binIcon = (status: string) => {
  const color = status === 'FULL' ? '#ef4444' : status === 'HIGH' ? '#f97316' : status === 'MEDIUM' ? '#eab308' : '#22c55e'
  return new L.DivIcon({
    className: '', html: `<div style="width:16px;height:16px;background:${color};border:2px solid white;border-radius:2px;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>`,
    iconSize: [16, 16], iconAnchor: [8, 8],
  })
}

function MapController({ reports, cleaners, bins, layers }: any) {
  const map = useMap()
  const points: [number, number][] = []
  if (layers.reports) reports.forEach((r: Report) => { if (r.latitude && r.longitude) points.push([r.latitude, r.longitude]) })
  if (layers.cleaners) cleaners.forEach((c: Cleaner) => { if (c.latitude && c.longitude) points.push([c.latitude, c.longitude]) })
  if (layers.bins) bins.forEach((b: SmartBin) => { if (b.latitude && b.longitude) points.push([b.latitude, b.longitude]) })
  if (points.length) map.fitBounds(points, { padding: [40, 40] })
  return null
}

function clusterPoints(points: { lat: number; lng: number; data: any; type: string }[], zoom: number) {
  if (zoom >= 13) return points.map(p => ({ ...p, cluster: false }))
  const clusters: any[] = []
  const grid: Record<string, any[]> = {}
  const gridSize = 0.5 / Math.pow(2, zoom - 8)
  points.forEach(p => {
    const key = `${Math.floor(p.lat / gridSize)},${Math.floor(p.lng / gridSize)}`
    if (!grid[key]) grid[key] = []
    grid[key].push(p)
  })
  Object.values(grid).forEach(group => {
    if (group.length === 1) {
      clusters.push({ ...group[0], cluster: false })
    } else {
      const avgLat = group.reduce((s, p) => s + p.lat, 0) / group.length
      const avgLng = group.reduce((s, p) => s + p.lng, 0) / group.length
      clusters.push({ lat: avgLat, lng: avgLng, data: group, type: 'cluster', cluster: true, count: group.length })
    }
  })
  return clusters
}

export default function FullMap({ reports, cleaners, bins }: Props) {
  const [layers, setLayers] = useState({ reports: true, cleaners: true, bins: true })
  const [zoom, setZoom] = useState(10)

  const allPoints = useMemo(() => {
    const pts: { lat: number; lng: number; data: any; type: string }[] = []
    if (layers.reports) reports.forEach(r => { if (r.latitude && r.longitude) pts.push({ lat: r.latitude, lng: r.longitude, data: r, type: 'report' }) })
    if (layers.cleaners) cleaners.forEach(c => { if (c.latitude && c.longitude) pts.push({ lat: c.latitude, lng: c.longitude, data: c, type: 'cleaner' }) })
    if (layers.bins) bins.forEach(b => { if (b.latitude && b.longitude) pts.push({ lat: b.latitude, lng: b.longitude, data: b, type: 'bin' }) })
    return pts
  }, [reports, cleaners, bins, layers])

  const displayMarkers = clusterPoints(allPoints, zoom)

  const clusterIcon = (count: number) => new L.DivIcon({
    className: '',
    html: `<div style="width:36px;height:36px;background:#6366f1;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:bold;box-shadow:0 2px 8px rgba(0,0,0,0.3)">${count}</div>`,
    iconSize: [36, 36], iconAnchor: [18, 18],
  })

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-1 p-2 rounded-lg shadow-lg" style={{ background: 'var(--card)' }}>
        {(['reports', 'cleaners', 'bins'] as const).map(k => (
          <label key={k} className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={layers[k]} onChange={() => setLayers(l => ({ ...l, [k]: !l[k] }))} />
            <span style={{ color: k === 'reports' ? '#ef4444' : k === 'cleaners' ? '#3b82f6' : '#22c55e' }}>●</span>
            {k.charAt(0).toUpperCase() + k.slice(1)}
          </label>
        ))}
      </div>

      <MapContainer center={[14.5995, 120.9842]} zoom={zoom} className="w-full h-full"
        zoomSnap={1} zoomDelta={1}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapController reports={reports} cleaners={cleaners} bins={bins} layers={layers} />
        <MapZoomHandler onZoomChange={setZoom} />

        {displayMarkers.map((m, i) => {
          if (m.cluster) {
            return (
              <Marker key={`cluster-${i}`} position={[m.lat, m.lng]} icon={clusterIcon(m.count)}>
                <Popup>
                  <div className="text-xs">
                    <strong>{m.count} items</strong><br />
                    {m.data.map((d: any) => <span key={d.data?.id || Math.random()}>{d.type} · </span>)}
                  </div>
                </Popup>
              </Marker>
            )
          }

          if (m.type === 'report') {
            const r = m.data as Report
            return (
              <Marker key={`r-${r.id}`} position={[m.lat, m.lng]} icon={reportIcon}>
                <Popup>
                  <div className="text-xs space-y-1" style={{ minWidth: 120 }}>
                    <strong className="text-sm">{r.waste_type}</strong>
                    <br />Severity: {r.severity} · Priority: {r.priority}
                    <br />Status: {r.status}
                    <br />{r.address?.slice(0, 80) || 'No address'}
                    <br /><span style={{ color: '#6b7280' }}>{timeAgo(r.created_at)}</span>
                    {r.image_url && <><br /><img src={r.image_url} alt="report" className="w-full max-w-[160px] rounded mt-1" /></>}
                    <br /><a href={`/reports/${r.id}`} className="text-blue-500 underline">View details →</a>
                  </div>
                </Popup>
              </Marker>
            )
          }
          if (m.type === 'cleaner') {
            const c = m.data as Cleaner
            return (
              <Marker key={`c-${c.id}`} position={[m.lat, m.lng]} icon={cleanerIcon}>
                <Popup>
                  <strong>{c.name}</strong><br />
                  {c.is_active ? '🟢 Active' : '🔴 Offline'}<br />
                  {c.phone || ''}
                </Popup>
              </Marker>
            )
          }
          if (m.type === 'bin') {
            const b = m.data as SmartBin
            return (
              <Marker key={`b-${b.id}`} position={[m.lat, m.lng]} icon={binIcon(b.status)}>
                <Popup>
                  <strong>{b.name || b.bin_id}</strong><br />
                  Fill: {b.fill_level}% · Status: {b.status}<br />
                  {timeAgo(b.last_updated)}
                </Popup>
              </Marker>
            )
          }
          return null
        })}
      </MapContainer>
    </div>
  )
}

function MapZoomHandler({ onZoomChange }: { onZoomChange: (z: number) => void }) {
  const map = useMap()
  useState(() => { onZoomChange(map.getZoom()) })
  map.on('zoomend', () => onZoomChange(map.getZoom()))
  return null
}
