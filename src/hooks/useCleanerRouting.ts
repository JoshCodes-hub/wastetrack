'use client'
import { useMemo } from 'react'
import { calculateDistance } from '@/lib/utils'

interface AssignmentWithCoords {
  id: string
  report?: {
    latitude: number
    longitude: number
  } | null
}

export function useCleanerRouting<T extends AssignmentWithCoords>(
  assignments: T[],
  cleanerLat: number | null,
  cleanerLng: number | null
): T[] {
  return useMemo(() => {
    if (!cleanerLat || !cleanerLng || !assignments.length) return assignments
    return [...assignments].sort((a, b) => {
      const dA = a.report?.latitude != null && a.report?.longitude != null
        ? calculateDistance(cleanerLat, cleanerLng, a.report.latitude, a.report.longitude)
        : Infinity
      const dB = b.report?.latitude != null && b.report?.longitude != null
        ? calculateDistance(cleanerLat, cleanerLng, b.report.latitude, b.report.longitude)
        : Infinity
      return dA - dB
    })
  }, [assignments, cleanerLat, cleanerLng])
}
