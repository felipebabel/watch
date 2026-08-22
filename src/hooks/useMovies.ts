import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { upsertMovie, setMovieStatus, removeMovieStatus, getUserMovies } from '../lib/db'
import type { MovieStatus } from '../lib/db'

export function useUserMovies() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['user-movies', user?.id],
    queryFn: () => getUserMovies(user!.id),
    enabled: !!user,
    staleTime: 0,
  })
}

// Legacy alias used by MoviePage
export function useWatchedMovies() {
  return useUserMovies()
}

export function useSetMovieStatus() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      tmdbId, title, posterPath, status,
    }: { tmdbId: number; title: string; posterPath: string | null; status: MovieStatus }) => {
      const movieId = await upsertMovie(tmdbId, title, posterPath)
      await setMovieStatus(user!.id, movieId, status)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user-movies', user?.id] }),
  })
}

export function useRemoveMovie() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (tmdbId: number) => {
      // Find movieId from cache or re-upsert to get id
      const { data } = await import('../lib/supabase').then(m =>
        m.supabase.from('movies').select('id').eq('tmdb_id', tmdbId).single()
      )
      if (data) await removeMovieStatus(user!.id, data.id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user-movies', user?.id] }),
  })
}

// Legacy toggle used by old MoviePage — kept for compat
export function useToggleMovie() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      tmdbId, title, posterPath, watched,
    }: { tmdbId: number; title: string; posterPath: string | null; watched: boolean }) => {
      const movieId = await upsertMovie(tmdbId, title, posterPath)
      if (watched) {
        await removeMovieStatus(user!.id, movieId)
      } else {
        await setMovieStatus(user!.id, movieId, 'watched')
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user-movies', user?.id] }),
  })
}
