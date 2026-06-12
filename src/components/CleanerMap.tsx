'use client'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet-defaulticon-compatibility'
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css'
import 'leaflet/dist/leaflet.css'
import { Assignment, Report } from '@/types'

interface Props {
  assignments: (Assignment & { report?: Report })[]
  cleanerLat: number | null
  cleanerLng: number | null
}

function FitBounds({ assignments, cleanerLat, cleanerLng }: Props) {
  const map = useMap()
  const points: [number, number][] = []
  if (cleanerLat && cleanerLng) points.push([cleanerLat, cleanerLng])
  assignments.forEach(a => {
    if (a.report?.latitude != null && a.report?.longitude != null) {
      points.push([a.report.latitude, a.report.longitude])
    }
  })
  if (points.length) map.fitBounds(points, { padding: [50, 50] })
  return null
}

const cleanerIcon = new L.DivIcon({
  className: '',
  html: '<div style="width:24px;height:24px;background:#3b82f6;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

const reportIcon = new L.DivIcon({
  className: '',
  html: '<div style="width:20px;height:20px;background:#ef4444;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

export default function CleanerMap({ assignments, cleanerLat, cleanerLng }: Props) {
  const defaultCenter: [number, number] = [14.5995, 120.9842]

  const routePoints: [number, number][] = []
  if (cleanerLat && cleanerLng) routePoints.push([cleanerLat, cleanerLng])
  assignments.forEach(a => {
    if (a.report?.latitude != null && a.report?.longitude != null) {
      routePoints.push([a.report.latitude, a.report.longitude])
    }
  })

  return (
    <MapContainer center={defaultCenter} zoom={13} className="w-full h-full" style={{ background: '#e8e8e8' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds assignments={assignments} cleanerLat={cleanerLat} cleanerLng={cleanerLng} />
      {cleanerLat && cleanerLng && (
        <Marker position={[cleanerLat, cleanerLng]} icon={cleanerIcon}>
          <Popup>Your Location</Popup>
        </Marker>
      )}
      {assignments.map(a => {
        if (a.report?.latitude == null || a.report?.longitude == null) return null
        return (
          <Marker key={a.id} position={[a.report.latitude, a.report.longitude]} icon={reportIcon}>
            <Popup>
              <strong>{a.report.waste_type}</strong><br />
              {a.report.severity} severity<br />
              {a.report.address}
            </Popup>
          </Marker>
        )
      })}
      {routePoints.length > 1 && (
        <Polyline positions={routePoints} color="#3b82f6" weight={3} opacity={0.6} dashArray="10 10" />
      )}
    </MapContainer>
  )
}
