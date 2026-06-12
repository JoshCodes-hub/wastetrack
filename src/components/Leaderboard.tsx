'use client'
import { useEffect, useState } from 'react'
import supabase from '@/lib/supabase'

interface Entry {
  user_id: string; name: string; count: number
}

export default function Leaderboard() {
  const [entries, setEntries] = useState<Entry[]>([])

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
          .sort((a, b) => b.count - a.count).slice(0, 10)
        setEntries(sorted)
      })
    })
  }, [])

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-5">
        <span className="text-2xl">🏆</span>
        <h2 className="text-lg font-bold gradient-text">Top Reporters</h2>
      </div>
      {entries.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No reports yet — be the first!</p>
      ) : (
        <div className="space-y-2">
          {entries.map((e, i) => (
            <div key={e.user_id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="flex items-center gap-3">
                <span className="text-lg w-8 text-center">{medals[i] || `#${i + 1}`}</span>
                <span className="font-medium text-sm">{e.name}</span>
              </div>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-lg">
                {e.count} {e.count === 1 ? 'report' : 'reports'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
