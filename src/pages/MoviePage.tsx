import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { tmdb, tmdbImg } from '../lib/tmdb'
import { useWatchedMovies, useToggleMovie } from '../hooks/useMovies'

export default function MoviePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const tmdbId = parseInt(id ?? '0')

  const { data: movie, isLoading } = useQuery({
    queryKey: ['movie', tmdbId],
    queryFn: () => tmdb.getMovie(tmdbId),
    enabled: !!tmdbId,
  })

  const { data: watchedMovies } = useWatchedMovies()
  const toggleMovie = useToggleMovie()

  const isWatched = watchedMovies?.some((wm: any) => wm.movies.tmdb_id === tmdbId) ?? false

  const handleToggle = () => {
    if (!movie) return
    toggleMovie.mutate({
      tmdbId,
      title: movie.title,
      posterPath: movie.poster_path,
      watched: isWatched,
    })
  }

  const backdrop = tmdbImg(movie?.backdrop_path, 'w500')
  const poster = tmdbImg(movie?.poster_path, 'w342')

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!movie) return null

  return (
    <div className="min-h-screen max-w-md mx-auto pb-8">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="fixed top-4 left-4 z-10 w-9 h-9 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white border border-white/10"
      >
        ←
      </button>

      {/* Backdrop */}
      <div className="relative h-52 bg-surface-2">
        {backdrop && (
          <img src={backdrop} alt="" className="w-full h-full object-cover opacity-60" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
      </div>

      <div className="px-4 -mt-16 relative">
        <div className="flex gap-4">
          <div className="w-24 h-36 rounded-xl overflow-hidden bg-surface-2 flex-shrink-0 border border-white/10">
            {poster ? (
              <img src={poster} alt={movie.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl">🎬</div>
            )}
          </div>
          <div className="flex flex-col justify-end gap-1 pt-20">
            <h1 className="font-bold text-base leading-tight">{movie.title}</h1>
            <p className="text-xs text-muted">
              {movie.release_date?.slice(0, 4)}
              {movie.runtime ? ` · ${movie.runtime} min` : ''}
            </p>
            <div className="flex items-center gap-1">
              <span className="text-yellow-400 text-xs">★</span>
              <span className="text-xs text-muted">{movie.vote_average.toFixed(1)}</span>
            </div>
          </div>
        </div>

        {/* Watch button */}
        <button
          onClick={handleToggle}
          disabled={toggleMovie.isPending}
          className={`mt-5 w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 ${
            isWatched
              ? 'bg-green-500/20 border border-green-500/40 text-green-400'
              : 'bg-accent hover:bg-accent-hover text-white'
          }`}
        >
          {toggleMovie.isPending
            ? '...'
            : isWatched
              ? '✓ Assistido — clique para desmarcar'
              : 'Marcar como assistido'}
        </button>

        {/* Overview */}
        {movie.overview && (
          <p className="mt-5 text-sm text-white/70 leading-relaxed">{movie.overview}</p>
        )}

        {movie.tagline && (
          <p className="mt-3 text-sm text-muted italic">"{movie.tagline}"</p>
        )}
      </div>
    </div>
  )
}
