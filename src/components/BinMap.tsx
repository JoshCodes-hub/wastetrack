'use client'
import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet-defaulticon-compatibility'
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css'
import 'leaflet/dist/leaflet.css'
import type { SmartBin } from '@/types'

interface Props {
  bins: SmartBin[]
  mostRecentBinId: string | null
}

function BinMarker({ bin, isRecent }: { bin: SmartBin; isRecent: boolean }) {
  if (!bin.latitude || !bin.longitude) return null
  const color = bin.status === 'FULL' ? '#ef4444' : bin.status === 'HIGH' ? '#f97316' : bin.status === 'MEDIUM' ? '#eab308' : '#22c55e'
  const icon = new L.DivIcon({
    className: '',
    html: `<div style="width:${isRecent ? 28 : 20}px;height:${isRecent ? 28 : 20}px;background:${color};border-radius:50%;border:3px solid white;box-shadow:0 0 0 ${isRecent ? '4px' : '0'} rgba(34,197,94,0.4)${isRecent ? ',0 2px 8px rgba(0,0,0,0.3)' : ''};transition:all 0.3s"></div>`,
    iconSize: [isRecent ? 28 : 20, isRecent ? 28 : 20],
    iconAnchor: [isRecent ? 14 : 10, isRecent ? 14 : 10],
  })
  return (
    <Marker position={[bin.latitude, bin.longitude]} icon={icon}>
      <Popup>
        <strong>{bin.name || bin.bin_id}</strong><br />
        Fill: {bin.fill_level}%<br />
        Status: {bin.status}
      </Popup>
    </Marker>
  )
}

function AutoFly({ bins, mostRecentBinId }: Props) {
  const map = useMap()
  const recent = bins.find(b => b.id === mostRecentBinId)
  useEffect(() => {
    if (recent?.latitude && recent?.longitude) {
      map.flyTo([recent.latitude, recent.longitude], 16, { duration: 1.5 })
    }
  }, [mostRecentBinId])
  return null
}

export default function BinMap({ bins, mostRecentBinId }: Props) {
  const points: [number, number][] = []
  bins.forEach(b => { if (b.latitude && b.longitude) points.push([b.latitude, b.longitude]) })

  return (
    <MapContainer center={points.length ? points[0] : [14.5995, 120.9842]} zoom={12} className="w-full h-full">
      <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <AutoFly bins={bins} mostRecentBinId={mostRecentBinId} />
      {bins.map(b => (
        <BinMarker key={b.id} bin={b} isRecent={b.id === mostRecentBinId} />
      ))}
    </MapContainer>
  )
}
