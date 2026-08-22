import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserShows } from '../../hooks/useUserShows'
import { tmdbImg } from '../../lib/tmdb'
import type { WatchStatus } from '../../types'

const STATUS_LABELS: Record<WatchStatus, string> = {
  watching: 'Watching',
  completed: 'Completed',
  dropped: 'Dropped',
  watchlist: 'Want to Watch',
}

export default function ShowsTab() {
  const { data: userShows, isLoading } = useUserShows()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<WatchStatus | 'all'>('watching')

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const filtered = filter === 'all'
    ? userShows ?? []
    : (userShows ?? []).filter((s: any) => s.status === filter)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {(['watching', 'watchlist', 'completed', 'all'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
              filter === s ? 'bg-accent border-accent text-white' : 'border-white/10 text-muted hover:text-white'
            }`}
          >
            {s === 'all' ? 'All' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="text-5xl">📺</span>
          <p className="text-muted text-sm">
            {filter === 'watching' ? 'No shows in progress' : 'Nothing here yet'}
          </p>
          <button onClick={() => navigate('/?tab=search')} className="text-accent text-sm">
            Search for shows →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {filtered.map((us: any) => {
            const show = us.shows
            const poster = tmdbImg(show.poster_path, 'w200')
            return (
              <button
                key={show.id}
                onClick={() => navigate(`/show/${show.tmdb_id}?dbid=${show.id}`)}
                className="flex flex-col gap-1.5 text-left active:scale-95 transition-transform"
              >
                <div className="aspect-[2/3] rounded-xl overflow-hidden bg-surface-2">
                  {poster
                    ? <img src={poster} alt={show.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-3xl">📺</div>
                  }
                </div>
                <p className="text-xs font-medium leading-tight line-clamp-2">{show.name}</p>
                <span className="text-[10px] text-muted">{STATUS_LABELS[us.status as WatchStatus]}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
