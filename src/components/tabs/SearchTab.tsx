import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { tmdb, tmdbImg } from '../../lib/tmdb'

export default function SearchTab() {
  const [query, setQuery] = useState('')
  const [type, setType] = useState<'tv' | 'movie'>('tv')
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['search', type, query],
    queryFn: (): Promise<{ results: any[] }> =>
      type === 'tv' ? tmdb.searchShows(query) : tmdb.searchMovies(query),
    enabled: query.trim().length > 1,
    staleTime: 1000 * 60,
  })

  const { data: trending } = useQuery({
    queryKey: ['trending', type],
    queryFn: (): Promise<{ results: any[] }> =>
      type === 'tv' ? tmdb.getTrendingShows() : tmdb.getTrendingMovies(),
    enabled: query.trim().length === 0,
    staleTime: 1000 * 60 * 10,
  })

  const results = query.trim().length > 1 ? (data?.results ?? []) : (trending?.results ?? [])
  const getTitle = (item: any) => item.name ?? item.title ?? ''
  const getDate  = (item: any) => item.first_air_date ?? item.release_date ?? ''

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">🔍</span>
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={type === 'tv' ? 'Search TV shows...' : 'Search movies...'}
          className="w-full bg-surface border border-white/10 rounded-xl pl-9 pr-4 py-3 text-base outline-none focus:border-accent/50 transition-colors placeholder:text-muted"
          autoComplete="off"
          autoCorrect="off"
        />
      </div>

      <div className="flex bg-surface rounded-xl p-1 gap-1">
        {(['tv', 'movie'] as const).map(t => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              type === t ? 'bg-accent text-white' : 'text-muted'
            }`}
          >
            {t === 'tv' ? '📺 Series' : '🎬 Movies'}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted font-medium uppercase tracking-wider">
        {query.trim().length > 1 ? 'Results' : 'Trending this week'}
      </p>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {results.map((item: any) => {
            const poster = tmdbImg(item.poster_path, 'w200')
            const title = getTitle(item)
            const year  = getDate(item)?.slice(0, 4)
            return (
              <button
                key={item.id}
                onClick={() => navigate(type === 'tv' ? `/show/${item.id}` : `/movie/${item.id}`)}
                className="flex flex-col gap-1.5 text-left active:scale-95 transition-transform"
              >
                <div className="aspect-[2/3] rounded-xl overflow-hidden bg-surface-2">
                  {poster
                    ? <img src={poster} alt={title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-3xl">{type === 'tv' ? '📺' : '🎬'}</div>
                  }
                </div>
                <p className="text-xs font-medium leading-tight line-clamp-2">{title}</p>
                {year && <span className="text-[10px] text-muted">{year}</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
