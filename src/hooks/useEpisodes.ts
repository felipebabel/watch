import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { tmdb } from '../lib/tmdb'
import {
  upsertEpisode,
  markEpisodeWatched,
  unmarkEpisodeWatched,
  getWatchedEpisodesForShow,
} from '../lib/db'

export function useSeasonEpisodes(showTmdbId: number, season: number) {
  return useQuery({
    queryKey: ['episodes', showTmdbId, season],
    queryFn: () => tmdb.getSeasonEpisodes(showTmdbId, season),
    enabled: !!showTmdbId && season > 0,
    staleTime: 1000 * 60 * 60, // 1h — episode data rarely changes
  })
}

export function useWatchedEpisodes(showDbId: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['watched-episodes', user?.id, showDbId],
    queryFn: () => getWatchedEpisodesForShow(user!.id, showDbId),
    enabled: !!user && !!showDbId,
  })
}

export function useToggleEpisode(showDbId: string) {
  const { user } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      episodeDbId,
      watched,
    }: { episodeDbId: string; watched: boolean }) => {
      if (watched) {
        await unmarkEpisodeWatched(user!.id, episodeDbId)
      } else {
        await markEpisodeWatched(user!.id, episodeDbId)
      }
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['watched-episodes', user?.id, showDbId] }),
  })
}

export function useUpsertEpisode() {
  return useMutation({
    mutationFn: ({
      showDbId, season, episode, name,
    }: { showDbId: string; season: number; episode: number; name: string | null }) =>
      upsertEpisode(showDbId, season, episode, name),
  })
}
