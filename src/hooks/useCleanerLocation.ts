'use client'
import { useEffect, useRef } from 'react'
import supabase from '@/lib/supabase'

export function useCleanerLocation(cleanerId: string | null) {
  const watchIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (!cleanerId) return
    if (!navigator.geolocation) return

    let lastUpdate = 0
    let lastLat = 0
    let lastLng = 0

    const success = (pos: GeolocationPosition) => {
      const { latitude, longitude } = pos.coords
      const now = Date.now()

      if (calculateDelta(lastLat, lastLng, latitude, longitude) < 50 && now - lastUpdate < 10000) return

      lastLat = latitude
      lastLng = longitude
      lastUpdate = now

      supabase.from('cleaners').update({
        latitude,
        longitude,
        is_active: true,
        updated_at: new Date().toISOString(),
      }).eq('id', cleanerId).then(({ error }) => {
        if (error) console.error('GPS update failed:', error)
      })
    }

    const error = () => {
      supabase.from('cleaners').update({ is_active: false }).eq('id', cleanerId)
    }

    watchIdRef.current = navigator.geolocation.watchPosition(success, error, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000,
    })

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
      supabase.from('cleaners').update({ is_active: false }).eq('id', cleanerId)
    }
  }, [cleanerId])
}

function calculateDelta(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
