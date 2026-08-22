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
  watchlist: 'Watchlist',
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
  const [pendingEpisode, setPendingEpisode] = useState<{
    season: number; episode: number; name: string | null
  } | null>(null)
  const [showRemoveModal, setShowRemoveModal] = useState(false)

  const { data: show, isLoading } = useQuery({
    queryKey: ['show', tmdbId],
    queryFn: () => tmdb.getShow(tmdbId),
    enabled: !!tmdbId,
  })

  const { data: userShows } = useUserShows()
  const userShow = userShows?.find((us: any) => us.shows.tmdb_id === tmdbId)
  // showDbId from userShow first, then URL param, then fetch from DB by tmdb_id
  const showDbIdFromUser = userShow?.shows.id ?? dbId

  // Always try to find the show in DB by tmdb_id (even if not in user's list)
  const { data: showDbIdFromDB } = useQuery({
    queryKey: ['show-db-id', tmdbId],
    queryFn: async () => {
      const { data } = await supabase
        .from('shows')
        .select('id')
        .eq('tmdb_id', tmdbId)
        .maybeSingle()
      return data?.id as string | undefined
    },
    enabled: !!tmdbId && !showDbIdFromUser,
    staleTime: 1000 * 60 * 60,
  })

  const showDbId = showDbIdFromUser ?? showDbIdFromDB ?? ''

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
    staleTime: 0, // always refetch after invalidation
  })

  const addShow = useAddShow()
  const removeShow = useRemoveShow()

  // Remove show — optionally also delete all watched episodes
  const removeWithEpisodesMutation = useMutation({
    mutationFn: async (clearEpisodes: boolean) => {
      if (clearEpisodes && showDbId) {
        await supabase
          .from('watched_episodes')
          .delete()
          .eq('user_id', user!.id)
          .in('episode_id',
            supabase
              .from('episodes')
              .select('id')
              .eq('show_id', showDbId) as any
          )
        // simpler: delete via join
        const { data: eps } = await supabase
          .from('episodes')
          .select('id')
          .eq('show_id', showDbId)
        if (eps?.length) {
          await supabase
            .from('watched_episodes')
            .delete()
            .eq('user_id', user!.id)
            .in('episode_id', eps.map((e: any) => e.id))
        }
      }
      await removeShow.mutateAsync(showDbId)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['watched-map', user?.id, showDbId] })
      qc.invalidateQueries({ queryKey: ['watched-numbers', user?.id, showDbId] })
      navigate(-1)
    },
  })

  // Mark ALL episodes of all seasons as watched
  const markAllMutation = useMutation({
    mutationFn: async () => {
      if (!show) return
      // Ensure show exists in DB
      const currentShowDbId = await upsertShow(tmdbId, show.name, show.poster_path)
      await setShowStatus(user!.id, currentShowDbId, 'completed')
      qc.invalidateQueries({ queryKey: ['user-shows'] })

      // For each season, upsert all episodes and mark watched
      for (const season of show.seasons.filter(s => s.season_number > 0)) {
        // Fetch episode list from TMDB
        const { episodes } = await import('../lib/tmdb').then(m =>
          m.tmdb.getSeasonEpisodes(tmdbId, season.season_number)
        )
        for (const ep of episodes) {
          const { data: epData } = await supabase
            .from('episodes')
            .upsert(
              { show_id: currentShowDbId, season: ep.season_number, episode: ep.episode_number, name: ep.name },
              { onConflict: 'show_id,season,episode' }
            )
            .select('id').single()
          if (epData) {
            await supabase.from('watched_episodes')
              .upsert({ user_id: user!.id, episode_id: epData.id }, { onConflict: 'user_id,episode_id' })
          }
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['watched-map', user?.id, showDbId] })
      qc.invalidateQueries({ queryKey: ['watched-numbers', user?.id, showDbId] })
    },
  })

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
      // Invalidate all watched queries so ShowsTab updates too
      qc.invalidateQueries({ queryKey: ['watched-map', user?.id, showDbId] })
      qc.invalidateQueries({ queryKey: ['watched-numbers', user?.id, showDbId] })
    },
  })

  // Mark all episodes before a given season/episode as watched
  const markPreviousMutation = useMutation({
    mutationFn: async ({ untilSeason, untilEpisode }: { untilSeason: number; untilEpisode: number }) => {
      if (!show) return
      let currentShowDbId = showDbId
      if (!currentShowDbId) {
        currentShowDbId = await upsertShow(tmdbId, show.name, show.poster_path)
        await setShowStatus(user!.id, currentShowDbId, 'watching')
        qc.invalidateQueries({ queryKey: ['user-shows'] })
      }
      for (const s of show.seasons.filter(se => se.season_number > 0)) {
        if (s.season_number > untilSeason) break
        const maxEp = s.season_number === untilSeason ? untilEpisode - 1 : s.episode_count
        for (let e = 1; e <= maxEp; e++) {
          if (watchedMap?.has(`${s.season_number}-${e}`)) continue
          const { data: epData } = await supabase
            .from('episodes')
            .upsert({ show_id: currentShowDbId, season: s.season_number, episode: e, name: null },
              { onConflict: 'show_id,season,episode' })
            .select('id').single()
          if (epData) {
            await supabase.from('watched_episodes')
              .upsert({ user_id: user!.id, episode_id: epData.id }, { onConflict: 'user_id,episode_id' })
          }
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['watched-map', user?.id, showDbId] })
      qc.invalidateQueries({ queryKey: ['watched-numbers', user?.id, showDbId] })
    },
  })

  const hasPreviousUnwatched = (season: number, episode: number): boolean => {
    if (!show) return false
    // If watchedMap is undefined (show not in list yet), treat as all unwatched
    const wm = watchedMap ?? new Map()
    for (const s of show.seasons.filter(se => se.season_number > 0)) {
      if (s.season_number > season) break
      const maxEp = s.season_number === season ? episode - 1 : s.episode_count
      for (let e = 1; e <= maxEp; e++) {
        if (!wm.has(`${s.season_number}-${e}`)) return true
      }
    }
    return false
  }

  const handleEpisodeClick = (ep: { season_number: number; episode_number: number; name: string }) => {
    if (toggleMutation.isPending || markPreviousMutation.isPending) return
    const watched = watchedMap?.has(`${ep.season_number}-${ep.episode_number}`) ?? false
    if (watched) {
      toggleMutation.mutate({ season: ep.season_number, episode: ep.episode_number, name: ep.name, watched })
      return
    }
    if (hasPreviousUnwatched(ep.season_number, ep.episode_number)) {
      setPendingEpisode({ season: ep.season_number, episode: ep.episode_number, name: ep.name })
      return
    }
    toggleMutation.mutate({ season: ep.season_number, episode: ep.episode_number, name: ep.name, watched })
  }

  const confirmPrevious = async (markAll: boolean) => {
    if (!pendingEpisode) return
    const { season, episode, name } = pendingEpisode
    setPendingEpisode(null)
    if (markAll) {
      await markPreviousMutation.mutateAsync({ untilSeason: season, untilEpisode: episode })
    }
    toggleMutation.mutate({ season, episode, name, watched: false })
  }

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

      {/* Mark previous episodes modal */}
      {pendingEpisode && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-surface-2 border border-white/10 rounded-2xl w-full max-w-sm p-5 flex flex-col gap-4">
            <div>
              <h3 className="font-semibold text-base">Mark previous episodes?</h3>
              <p className="text-sm text-muted mt-1">
                There are unwatched episodes before S{pendingEpisode.season} E{pendingEpisode.episode}. Mark them all as watched?
              </p>
            </div>
            {markPreviousMutation.isPending ? (
              <div className="flex items-center justify-center py-2 gap-2 text-sm text-muted">
                <span className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                Marking episodes…
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <button onClick={() => confirmPrevious(true)}
                  className="w-full py-3 rounded-xl bg-accent text-white font-semibold text-sm">
                  Yes, mark all previous
                </button>
                <button onClick={() => confirmPrevious(false)}
                  className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-sm">
                  No, just this episode
                </button>
                <button onClick={() => setPendingEpisode(null)}
                  className="w-full py-2 text-sm text-muted">
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Remove show modal */}
      {showRemoveModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-surface-2 border border-white/10 rounded-2xl w-full max-w-sm p-5 flex flex-col gap-4">
            <div>
              <h3 className="font-semibold text-base">Remove series?</h3>
              <p className="text-sm text-muted mt-1">
                Do you want to keep your watched episodes history or clear it?
              </p>
            </div>
            {removeWithEpisodesMutation.isPending ? (
              <div className="flex items-center justify-center py-2 gap-2 text-sm text-muted">
                <span className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                Removing…
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => { setShowRemoveModal(false); removeWithEpisodesMutation.mutate(false) }}
                  className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold"
                >
                  Remove but keep history
                </button>
                <button
                  onClick={() => { setShowRemoveModal(false); removeWithEpisodesMutation.mutate(true) }}
                  className="w-full py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-semibold"
                >
                  Remove and clear history
                </button>
                <button
                  onClick={() => setShowRemoveModal(false)}
                  className="w-full py-2 text-sm text-muted"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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
          {/* Loading overlay while marking all episodes */}
          {markAllMutation.isPending && (
            <div className="shrink-0 flex items-center gap-2 bg-accent/10 border border-accent/30 text-accent text-xs px-3 py-1.5 rounded-full">
              <span className="w-3 h-3 border border-accent border-t-transparent rounded-full animate-spin" />
              Marking all episodes…
            </div>
          )}

          {!markAllMutation.isPending && (
            userShow ? (
              <>
                <div className="shrink-0 bg-accent/20 border border-accent/40 text-accent text-xs px-3 py-1.5 rounded-full">
                  ✓ {STATUS_LABELS[userShow.status as WatchStatus]}
                </div>
                <button
                  onClick={() => setShowRemoveModal(true)}
                  className="shrink-0 border border-white/10 text-muted text-xs px-3 py-1.5 rounded-full active:border-red-500/40 active:text-red-400 transition-colors"
                >
                  Remove
                </button>
              </>
            ) : (
              (['watching', 'watchlist', 'completed'] as WatchStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    if (s === 'completed') {
                      markAllMutation.mutate()
                    } else {
                      addShow.mutate({ tmdbId, name: show.name, posterPath: show.poster_path, status: s })
                    }
                  }}
                  className="shrink-0 border border-white/10 text-muted text-xs px-3 py-1.5 rounded-full hover:border-accent/50 hover:text-accent transition-colors"
                >
                  + {STATUS_LABELS[s]}
                </button>
              ))
            )
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
                  onClick={() => handleEpisodeClick(ep)}
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
