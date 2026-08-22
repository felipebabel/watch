import { useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tmdb, tmdbImg } from '../lib/tmdb'
import { useAuth } from '../contexts/AuthContext'
import { useAddShow, useRemoveShow, useUserShows } from '../hooks/useUserShows'
import { supabase } from '../lib/supabase'
import { upsertShow, setShowStatus } from '../lib/db'
import type { WatchStatus } from '../types'

const STATUS_LABELS: Record<WatchStatus, string> = {
  watching: 'Watching',
  completed: 'Completed',
  dropped: 'Dropped',
  watchlist: 'Want to Watch',
}

async function fetchWatchedMap(userId: string, showDbId: string) {
  const { data, error } = await supabase
    .from('watched_episodes')
    .select('episode_id, episodes!inner(season, episode, show_id)')
    .eq('user_id', userId)
    .eq('episodes.show_id', showDbId)
  if (error) throw error
  const map = new Map<string, string>()
  data.forEach((r: any) => {
    map.set(`${r.episodes.season}-${r.episodes.episode}`, r.episode_id)
  })
  return map
}

async function toggleEpisodeWatched(
  userId: string,
  showDbId: string,
  season: number,
  episode: number,
  name: string | null,
  currentlyWatched: boolean
) {
  const { data: epData, error: epError } = await supabase
    .from('episodes')
    .upsert({ show_id: showDbId, season, episode, name }, { onConflict: 'show_id,season,episode' })
    .select('id')
    .single()
  if (epError) throw epError
  const episodeId = epData.id as string

  if (currentlyWatched) {
    const { error } = await supabase
      .from('watched_episodes')
      .delete()
      .eq('user_id', userId)
      .eq('episode_id', episodeId)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('watched_episodes')
      .upsert({ user_id: userId, episode_id: episodeId }, { onConflict: 'user_id,episode_id' })
    if (error) throw error
  }
}

export default function ShowPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const dbId = searchParams.get('dbid') ?? ''
  const navigate = useNavigate()
  const { user } = useAuth()
  const qc = useQueryClient()

  const tmdbId = parseInt(id ?? '0')
  const [selectedSeason, setSelectedSeason] = useState(1)

  const { data: show, isLoading } = useQuery({
    queryKey: ['show', tmdbId],
    queryFn: () => tmdb.getShow(tmdbId),
    enabled: !!tmdbId,
  })

  const { data: userShows } = useUserShows()
  const userShow = userShows?.find((us: any) => us.shows.tmdb_id === tmdbId)
  const showDbId = userShow?.shows.id ?? dbId

  const { data: seasonData, isLoading: loadingSeason } = useQuery({
    queryKey: ['season', tmdbId, selectedSeason],
    queryFn: () => tmdb.getSeasonEpisodes(tmdbId, selectedSeason),
    enabled: !!tmdbId,
    staleTime: 1000 * 60 * 60,
  })

  const { data: watchedMap } = useQuery({
    queryKey: ['watched-map', user?.id, showDbId],
    queryFn: () => fetchWatchedMap(user!.id, showDbId),
    enabled: !!user && !!showDbId,
  })

  const addShow = useAddShow()
  const removeShow = useRemoveShow()

  const toggleMutation = useMutation({
    mutationFn: async ({ season, episode, name, watched }: {
      season: number; episode: number; name: string | null; watched: boolean
    }) => {
      let currentShowDbId = showDbId
      if (!currentShowDbId && show) {
        currentShowDbId = await upsertShow(tmdbId, show.name, show.poster_path)
        await setShowStatus(user!.id, currentShowDbId, 'watching')
        qc.invalidateQueries({ queryKey: ['user-shows'] })
      }
      await toggleEpisodeWatched(user!.id, currentShowDbId, season, episode, name, watched)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['watched-map', user?.id, showDbId] })
    },
  })

  const backdrop = tmdbImg(show?.backdrop_path, 'w500')
  const poster = tmdbImg(show?.poster_path, 'w342')

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!show) return null

  return (
    <div className="min-h-screen max-w-2xl mx-auto pb-10">
      {/* Back button — respects iPhone safe area */}
      <button
        onClick={() => navigate(-1)}
        className="fixed top-safe left-4 z-20 w-9 h-9 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white border border-white/10 shadow-lg"
        style={{ top: `max(env(safe-area-inset-top), 16px)` }}
      >
        ←
      </button>

      {/* Backdrop */}
      <div className="relative h-52 bg-surface-2">
        {backdrop && <img src={backdrop} alt="" className="w-full h-full object-cover opacity-60" />}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
      </div>

      <div className="px-4 -mt-16 relative">
        {/* Poster + info */}
        <div className="flex gap-4">
          <div className="w-24 h-36 rounded-xl overflow-hidden bg-surface-2 shrink-0 border border-white/10 shadow-xl">
            {poster
              ? <img src={poster} alt={show.name} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-3xl">📺</div>
            }
          </div>
          <div className="flex flex-col justify-end gap-1 pt-20">
            <h1 className="font-bold text-base leading-tight">{show.name}</h1>
            <p className="text-xs text-muted">
              {show.first_air_date?.slice(0, 4)} · {show.number_of_seasons} season{show.number_of_seasons !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-1">
              <span className="text-yellow-400 text-xs">★</span>
              <span className="text-xs text-muted">{show.vote_average.toFixed(1)}</span>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {userShow ? (
            <>
              <div className="shrink-0 bg-accent/20 border border-accent/40 text-accent text-xs px-3 py-1.5 rounded-full">
                ✓ {STATUS_LABELS[userShow.status as WatchStatus]}
              </div>
              <button
                onClick={() => removeShow.mutate(showDbId)}
                className="shrink-0 border border-white/10 text-muted text-xs px-3 py-1.5 rounded-full hover:border-red-500/40 hover:text-red-400 transition-colors"
              >
                Remove
              </button>
            </>
          ) : (
            (['watching', 'watchlist', 'completed'] as WatchStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => addShow.mutate({ tmdbId, name: show.name, posterPath: show.poster_path, status: s })}
                className="shrink-0 border border-white/10 text-muted text-xs px-3 py-1.5 rounded-full hover:border-accent/50 hover:text-accent transition-colors"
              >
                + {STATUS_LABELS[s]}
              </button>
            ))
          )}
        </div>

        {/* Overview */}
        {show.overview && (
          <p className="mt-4 text-sm text-white/70 leading-relaxed line-clamp-3">{show.overview}</p>
        )}

        {/* Season tabs */}
        <div className="mt-6 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {show.seasons.filter(s => s.season_number > 0).map(season => (
            <button
              key={season.season_number}
              onClick={() => setSelectedSeason(season.season_number)}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                selectedSeason === season.season_number
                  ? 'bg-accent border-accent text-white'
                  : 'border-white/10 text-muted'
              }`}
            >
              S{season.season_number}
            </button>
          ))}
        </div>

        {/* Episodes */}
        <div className="mt-3 flex flex-col gap-2">
          {loadingSeason ? (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            seasonData?.episodes.map(ep => {
              const key = `${ep.season_number}-${ep.episode_number}`
              const watched = watchedMap?.has(key) ?? false
              const still = tmdbImg(ep.still_path, 'w200')

              return (
                <button
                  key={ep.episode_number}
                  onClick={() => !toggleMutation.isPending && toggleMutation.mutate({
                    season: ep.season_number,
                    episode: ep.episode_number,
                    name: ep.name,
                    watched,
                  })}
                  className={`flex items-center gap-3 rounded-xl p-3 border text-left transition-all active:scale-[0.98] ${
                    watched ? 'bg-accent/10 border-accent/20' : 'bg-surface border-white/5'
                  }`}
                >
                  <div className="w-20 h-12 rounded-lg overflow-hidden bg-surface-2 shrink-0">
                    {still
                      ? <img src={still} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-lg">🎞️</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted">E{ep.episode_number}</p>
                    <p className="text-sm font-medium leading-tight line-clamp-1">{ep.name}</p>
                    {ep.runtime && <p className="text-[10px] text-muted mt-0.5">{ep.runtime} min</p>}
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                    watched ? 'bg-accent border-accent' : 'border-white/20'
                  }`}>
                    {watched && <span className="text-white text-xs font-bold">✓</span>}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
