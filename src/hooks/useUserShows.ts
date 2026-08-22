import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { getUserShows, upsertShow, setShowStatus, removeShow } from '../lib/db'
import type { WatchStatus } from '../types'

export function useUserShows() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['user-shows', user?.id],
    queryFn: () => getUserShows(user!.id),
    enabled: !!user,
  })
}

export function useAddShow() {
  const { user } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      tmdbId, name, posterPath, status,
    }: { tmdbId: number; name: string; posterPath: string | null; status: WatchStatus }) => {
      const showId = await upsertShow(tmdbId, name, posterPath)
      await setShowStatus(user!.id, showId, status)
      return showId
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user-shows', user?.id] }),
  })
}

export function useRemoveShow() {
  const { user } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (showId: string) => removeShow(user!.id, showId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user-shows', user?.id] }),
  })
}
