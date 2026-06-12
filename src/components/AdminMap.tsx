'use client'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet-defaulticon-compatibility'
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css'
import 'leaflet/dist/leaflet.css'
import type { Report, Cleaner, SmartBin } from '@/types'
import { formatDate } from '@/lib/utils'

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
const binIcon = new L.DivIcon({
  className: '', html: '<div style="width:16px;height:16px;background:#22c55e;border:2px solid white;border-radius:2px;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>',
  iconSize: [16, 16], iconAnchor: [8, 8],
})

function FitAll({ reports, cleaners, bins }: Props) {
  const map = useMap()
  const points: [number, number][] = []
  reports.forEach(r => { if (r.latitude && r.longitude) points.push([r.latitude, r.longitude]) })
  cleaners.forEach(c => { if (c.latitude && c.longitude) points.push([c.latitude, c.longitude]) })
  bins.forEach(b => { if (b.latitude && b.longitude) points.push([b.latitude, b.longitude]) })
  if (points.length) map.fitBounds(points, { padding: [30, 30] })
  return null
}

export default function AdminMap({ reports, cleaners, bins }: Props) {
  return (
    <MapContainer center={[14.5995, 120.9842]} zoom={12} className="w-full h-full">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitAll reports={reports} cleaners={cleaners} bins={bins} />
      {reports.map(r => r.latitude && r.longitude && (
        <Marker key={`r-${r.id}`} position={[r.latitude, r.longitude]} icon={reportIcon}>
          <Popup><strong>{r.waste_type}</strong><br />{r.severity}<br />{r.address?.slice(0, 60)}<br /><span style={{ color: '#6b7280', fontSize: 11 }}>{formatDate(r.created_at)}</span></Popup>
        </Marker>
      ))}
      {cleaners.map(c => c.latitude && c.longitude && (
        <Marker key={`c-${c.id}`} position={[c.latitude, c.longitude]} icon={cleanerIcon}>
          <Popup><strong>{c.name}</strong><br />{c.is_active ? '🟢 Active' : '🔴 Offline'}</Popup>
        </Marker>
      ))}
      {bins.map(b => b.latitude && b.longitude && (
        <Marker key={`b-${b.id}`} position={[b.latitude, b.longitude]} icon={binIcon}>
          <Popup><strong>{b.name}</strong><br />Fill: {b.fill_level}%<br />Status: {b.status}</Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
