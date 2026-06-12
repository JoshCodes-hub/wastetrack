'use client'
import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import supabase from '@/lib/supabase'
import type { Report, Cleaner, SmartBin } from '@/types'

const FullMap = dynamic(() => import('@/components/FullMap'), { ssr: false })

export default function MapPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [cleaners, setCleaners] = useState<Cleaner[]>([])
  const [bins, setBins] = useState<SmartBin[]>([])

  const loadData = useCallback(async () => {
    const [r, c, b] = await Promise.all([
      supabase.from('reports').select('*'),
      supabase.from('cleaners').select('*'),
      supabase.from('smart_bins').select('*'),
    ])
    if (r.data) setReports(r.data as Report[])
    if (c.data) setCleaners(c.data as Cleaner[])
    if (b.data) setBins(b.data as SmartBin[])
  }, [])

  useEffect(() => { loadData() }, [loadData])

  return (
    <div className="w-full h-[calc(100vh-60px)]">
      <FullMap reports={reports} cleaners={cleaners} bins={bins} />
    </div>
  )
}
