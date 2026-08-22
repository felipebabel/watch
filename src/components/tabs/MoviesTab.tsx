import { useNavigate } from 'react-router-dom'
import { useWatchedMovies } from '../../hooks/useMovies'
import { tmdbImg } from '../../lib/tmdb'

export default function MoviesTab() {
  const { data: movies, isLoading } = useWatchedMovies()
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!movies?.length) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <span className="text-5xl">🎬</span>
        <p className="text-muted text-sm">No movies watched yet</p>
        <button onClick={() => navigate('/?tab=search')} className="text-accent text-sm">
          Search for movies →
        </button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {movies.map((wm: any) => {
        const movie = wm.movies
        const poster = tmdbImg(movie.poster_path, 'w200')
        return (
          <button
            key={movie.id}
            onClick={() => navigate(`/movie/${movie.tmdb_id}`)}
            className="flex flex-col gap-1.5 text-left active:scale-95 transition-transform"
          >
            <div className="aspect-[2/3] rounded-xl overflow-hidden bg-surface-2">
              {poster
                ? <img src={poster} alt={movie.title} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-3xl">🎬</div>
              }
            </div>
            <p className="text-xs font-medium leading-tight line-clamp-2">{movie.title}</p>
            <span className="text-[10px] text-green-400">✓ Watched</span>
          </button>
        )
      })}
    </div>
  )
}
