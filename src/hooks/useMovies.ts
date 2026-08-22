import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { upsertMovie, markMovieWatched, unmarkMovieWatched, getWatchedMovies } from '../lib/db'

export function useWatchedMovies() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['watched-movies', user?.id],
    queryFn: () => getWatchedMovies(user!.id),
    enabled: !!user,
    staleTime: 0,
  })
}

export function useToggleMovie() {
  const { user } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      tmdbId, title, posterPath, watched,
    }: { tmdbId: number; title: string; posterPath: string | null; watched: boolean }) => {
      const movieId = await upsertMovie(tmdbId, title, posterPath)
      if (watched) {
        await unmarkMovieWatched(user!.id, movieId)
      } else {
        await markMovieWatched(user!.id, movieId)
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['watched-movies', user?.id] }),
  })
}
