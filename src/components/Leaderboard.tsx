'use client'
import { useEffect, useState } from 'react'
import supabase from '@/lib/supabase'

interface LeaderboardEntry {
  user_id: string
  name: string
  count: number
}

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])

  useEffect(() => {
    supabase.from('reports').select('user_id').then(({ data }) => {
      if (!data) return
      const counts: Record<string, number> = {}
      const userIds = new Set<string>()
      data.forEach(r => { counts[r.user_id] = (counts[r.user_id] || 0) + 1; userIds.add(r.user_id) })
      const ids = Array.from(userIds)
      supabase.from('users').select('id,name').in('id', ids).then(({ data: users }) => {
        if (!users) return
        const nameMap: Record<string, string> = {}
        users.forEach(u => { nameMap[u.id] = u.name })
        const sorted = Object.entries(counts)
          .map(([user_id, count]) => ({ user_id, name: nameMap[user_id] || 'Unknown', count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
        setEntries(sorted)
      })
    })
  }, [])

  const medal = (i: number) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : ''

  return (
    <div className="p-4 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
      <h2 className="text-lg font-bold mb-3">Leaderboard 🏆</h2>
      {entries.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--muted)' }}>No reports yet</p>
      ) : (
        <div className="space-y-2">
          {entries.map((e, i) => (
            <div key={e.user_id} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'var(--background)' }}>
              <span className="font-mono">{medal(i)} {e.name}</span>
              <span className="font-bold text-sm" style={{ color: 'var(--primary)' }}>{e.count} reports</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
