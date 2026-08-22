import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserMovies } from '../../hooks/useMovies'
import { tmdbImg } from '../../lib/tmdb'

type Filter = 'watched' | 'watchlist' | 'all'

export default function MoviesTab() {
  const { data: movies, isLoading } = useUserMovies()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('watched')

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const filtered = filter === 'all'
    ? movies ?? []
    : (movies ?? []).filter((m: any) => m.status === filter)

  return (
    <div className="flex flex-col gap-4">
      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {(['watched', 'watchlist', 'all'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
              filter === f ? 'bg-accent border-accent text-white' : 'border-white/10 text-muted hover:text-white'
            }`}
          >
            {f === 'all' ? 'All' : f === 'watched' ? 'Watched' : 'Watchlist'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <span className="text-5xl">🎬</span>
          <p className="text-muted text-sm">
            {filter === 'watched' ? 'No movies watched yet' : filter === 'watchlist' ? 'Watchlist is empty' : 'No movies added yet'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {filtered.map((um: any) => {
            const movie = um.movies
            const poster = tmdbImg(movie.poster_path, 'w200')
            return (
              <button
                key={movie.id}
                onClick={() => navigate(`/movie/${movie.tmdb_id}`)}
                className="flex flex-col gap-1.5 text-left active:scale-95 transition-transform"
              >
                <div className="aspect-[2/3] rounded-xl overflow-hidden bg-surface-2">
                  {poster
                    ? <img src={poster} alt={movie.title} className="w-full h-full object-cover" loading="lazy" />
                    : <div className="w-full h-full flex items-center justify-center text-3xl">🎬</div>
                  }
                </div>
                <p className="text-xs font-medium leading-tight line-clamp-2">{movie.title}</p>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
