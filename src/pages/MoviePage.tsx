import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { tmdb, tmdbImg } from '../lib/tmdb'
import { useUserMovies, useSetMovieStatus, useRemoveMovie } from '../hooks/useMovies'
import DesktopLayout from '../components/DesktopLayout'

function CheckIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" fill={filled ? 'currentColor' : 'none'} opacity={filled ? '0.15' : '1'} />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12l3 3 5-5" />
    </svg>
  )
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M5 3h14a1 1 0 011 1v17l-7-4-7 4V4a1 1 0 011-1z"
        fill={filled ? 'currentColor' : 'none'}
        opacity={filled ? '0.3' : '1'}
      />
    </svg>
  )
}

export default function MoviePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const tmdbId = parseInt(id ?? '0')

  const { data: movie, isLoading } = useQuery({
    queryKey: ['movie', tmdbId],
    queryFn: () => tmdb.getMovie(tmdbId),
    enabled: !!tmdbId,
  })

  const { data: userMovies } = useUserMovies()
  const setStatus = useSetMovieStatus()
  const removeMovie = useRemoveMovie()

  const userMovie = userMovies?.find((m: any) => m.movies?.tmdb_id === tmdbId)
  const currentStatus = userMovie?.status as 'watched' | 'watchlist' | undefined

  const backdrop = tmdbImg(movie?.backdrop_path, 'w500')
  const poster   = tmdbImg(movie?.poster_path, 'w342')

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!movie) return null

  const handleStatus = (status: 'watched' | 'watchlist') => {
    if (currentStatus === status) {
      removeMovie.mutate(tmdbId)
    } else {
      setStatus.mutate({ tmdbId, title: movie.title, posterPath: movie.poster_path, status })
    }
  }

  const isPending = setStatus.isPending || removeMovie.isPending

  return (
    <DesktopLayout>
    <div className="min-h-screen pb-10">
      {/* Back button removed from fixed — now inside backdrop */}

      {/* Backdrop — poster + title overlay at bottom */}
      <div className="relative h-72 md:h-[432px] bg-surface-2">
        {backdrop && <img src={backdrop} alt="" className="w-full h-full object-cover opacity-50" />}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-background" />
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 z-10 w-9 h-9 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white border border-white/10 shadow-lg"
          style={{ top: `max(env(safe-area-inset-top), 16px)` }}
        >
          ←
        </button>

        {/* Poster + title inside backdrop */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 flex items-end gap-4">
          <div className="w-28 h-40 rounded-xl overflow-hidden bg-surface-2 shrink-0 border border-white/10 shadow-2xl">
            {poster
              ? <img src={poster} alt={movie.title} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-3xl">🎬</div>
            }
          </div>
          <div className="flex flex-col gap-1 pb-1">
            <h1 className="font-bold text-lg leading-tight drop-shadow-lg">{movie.title}</h1>
            <p className="text-xs text-white/70">
              {movie.release_date?.slice(0, 4)}
              {movie.runtime ? ` · ${movie.runtime} min` : ''}
            </p>
            <div className="flex items-center gap-1">
              <span className="text-yellow-400 text-xs">★</span>
              <span className="text-xs text-white/70">{movie.vote_average.toFixed(1)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 relative">
        {/* Status buttons */}
        <div className="mt-5 flex gap-3">
          {/* Watched */}
          <button
            onClick={() => handleStatus('watched')}
            disabled={isPending}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 border ${
              currentStatus === 'watched'
                ? 'bg-accent/20 border-accent/40 text-accent'
                : 'border-white/10 text-muted'
            }`}
          >
            {isPending && currentStatus !== 'watchlist'
              ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              : <CheckIcon filled={currentStatus === 'watched'} />
            }
            <span>Watched</span>
          </button>

          {/* Watchlist */}
          <button
            onClick={() => handleStatus('watchlist')}
            disabled={isPending}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 border ${
              currentStatus === 'watchlist'
                ? 'bg-accent/20 border-accent/40 text-accent'
                : 'border-white/10 text-muted'
            }`}
          >
            {isPending && currentStatus !== 'watched'
              ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              : <BookmarkIcon filled={currentStatus === 'watchlist'} />
            }
            <span>Watchlist</span>
          </button>
        </div>

        {movie.overview && (
          <p className="mt-5 text-sm text-white/70 leading-relaxed">{movie.overview}</p>
        )}
        {movie.tagline && (
          <p className="mt-3 text-sm text-muted italic">"{movie.tagline}"</p>
        )}
      </div>
    </div>
    </DesktopLayout>
  )
}
