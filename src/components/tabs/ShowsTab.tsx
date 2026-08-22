import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useUserShows } from '../../hooks/useUserShows'
import { tmdbImg, tmdb } from '../../lib/tmdb'
import { supabase } from '../../lib/supabase'
import { getWatchedEpisodeNumbers } from '../../lib/db'
import { useAuth } from '../../contexts/AuthContext'
import type { WatchStatus } from '../../types'

const STATUS_LABELS: Record<WatchStatus, string> = {
  watching:  'Watching',
  completed: 'Completed',
  dropped:   'Dropped',
  watchlist: 'Watchlist',
}

// ─── Next episode card ────────────────────────────────────────────────────────
function NextEpisodeCard({ userShow }: { userShow: any }) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [imgLoaded, setImgLoaded] = useState(false)
  const [pendingMark, setPendingMark] = useState<{ season: number; episode: number } | null>(null)

  const show = userShow.shows
  const tmdbId: number = show.tmdb_id
  const showDbId: string = show.id
  const poster = tmdbImg(show.poster_path, 'w200')

  // Show detail (seasons + episode counts)
  const { data: showDetail } = useQuery({
    queryKey: ['show', tmdbId],
    queryFn: () => tmdb.getShow(tmdbId),
    staleTime: 1000 * 60 * 60,
  })

  // Watched episode numbers for this show
  const { data: watched = [] } = useQuery({
    queryKey: ['watched-numbers', user?.id, showDbId],
    queryFn: () => getWatchedEpisodeNumbers(user!.id, showDbId),
    enabled: !!user && !!showDbId,
    staleTime: 0, // always refetch after invalidation
  })

  const watchedSet = new Set(watched.map((w: any) => `${w.season}-${w.episode}`))

  // Total episodes across all seasons (excluding specials)
  const totalEpisodes = showDetail
    ? showDetail.seasons.filter(s => s.season_number > 0).reduce((sum, s) => sum + s.episode_count, 0)
    : null

  const totalWatched = watched.length
  const remaining = totalEpisodes !== null ? totalEpisodes - totalWatched : null

  // Find next unwatched episode
  let nextSeason = 0
  let nextEp = 0
  if (showDetail) {
    outer: for (const season of showDetail.seasons.filter(s => s.season_number > 0)) {
      for (let e = 1; e <= season.episode_count; e++) {
        if (!watchedSet.has(`${season.season_number}-${e}`)) {
          nextSeason = season.season_number
          nextEp = e
          break outer
        }
      }
    }
  }

  const allWatched = showDetail && nextSeason === 0

  const toggleMutation = useMutation({
    mutationFn: async ({ season, episode, markWatched }: {
      season: number; episode: number; markWatched: boolean
    }) => {
      const { data: epData, error: epErr } = await supabase
        .from('episodes')
        .upsert({ show_id: showDbId, season, episode, name: null }, { onConflict: 'show_id,season,episode' })
        .select('id').single()
      if (epErr) throw epErr
      const episodeId = epData.id as string
      if (markWatched) {
        const { error } = await supabase.from('watched_episodes')
          .upsert({ user_id: user!.id, episode_id: episodeId }, { onConflict: 'user_id,episode_id' })
        if (error) throw error
      } else {
        const { error } = await supabase.from('watched_episodes')
          .delete().eq('user_id', user!.id).eq('episode_id', episodeId)
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['watched-numbers', user?.id, showDbId] })
      qc.invalidateQueries({ queryKey: ['watched-map', user?.id, showDbId] })
    },
  })

  const handleMarkNext = () => {
    if (!nextSeason) return
    const isFirstEp = nextSeason === 1 && nextEp === 1
    if (!isFirstEp && totalWatched === 0) {
      setPendingMark({ season: nextSeason, episode: nextEp })
      return
    }
    toggleMutation.mutate({ season: nextSeason, episode: nextEp, markWatched: true })
  }

  const confirmMarkPrevious = async (markAll: boolean) => {
    if (!pendingMark || !showDetail) { setPendingMark(null); return }
    const { season, episode } = pendingMark
    setPendingMark(null)

    if (markAll) {
      for (const s of showDetail.seasons.filter(se => se.season_number > 0)) {
        if (s.season_number > season) break
        const maxEp = s.season_number === season ? episode - 1 : s.episode_count
        for (let e = 1; e <= maxEp; e++) {
          if (!watchedSet.has(`${s.season_number}-${e}`)) {
            await supabase.from('episodes')
              .upsert({ show_id: showDbId, season: s.season_number, episode: e, name: null }, { onConflict: 'show_id,season,episode' })
              .select('id').single()
              .then(async ({ data }) => {
                if (data) await supabase.from('watched_episodes')
                  .upsert({ user_id: user!.id, episode_id: data.id }, { onConflict: 'user_id,episode_id' })
              })
          }
        }
      }
      qc.invalidateQueries({ queryKey: ['watched-numbers', user?.id, showDbId] })
    }
    toggleMutation.mutate({ season, episode, markWatched: true })
  }

  return (
    <>
      {/* Mark previous modal */}
      {pendingMark && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-surface-2 border border-white/10 rounded-2xl w-full max-w-sm p-5 flex flex-col gap-4">
            <div>
              <h3 className="font-semibold text-base">Mark previous episodes?</h3>
              <p className="text-sm text-muted mt-1">
                Mark all episodes before S{pendingMark.season} E{pendingMark.episode} as watched?
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => confirmMarkPrevious(true)}
                className="w-full py-3 rounded-xl bg-accent text-white font-semibold text-sm">
                Yes, mark all previous
              </button>
              <button onClick={() => confirmMarkPrevious(false)}
                className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-sm">
                No, just this episode
              </button>
              <button onClick={() => setPendingMark(null)}
                className="w-full py-2 text-sm text-muted">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => navigate(`/show/${tmdbId}?dbid=${showDbId}`)}
        className="flex items-center gap-3 bg-surface border border-white/5 rounded-xl p-3 w-full text-left active:scale-[0.98] transition-transform"
      >
        {/* Poster with loading shimmer */}
        <div className="w-12 h-16 rounded-lg overflow-hidden bg-surface-2 shrink-0 relative">
          {poster ? (
            <>
              {!imgLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                </div>
              )}
              <img
                src={poster}
                alt={show.name}
                loading="lazy"
                decoding="async"
                onLoad={() => setImgLoaded(true)}
                className={`w-full h-full object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
              />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xl">📺</div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{show.name}</p>

          {allWatched ? (
            <p className="text-xs text-green-400 mt-0.5">✓ All episodes watched</p>
          ) : nextSeason ? (
            <p className="text-xs text-muted mt-0.5">Next: S{nextSeason} E{nextEp}</p>
          ) : (
            <p className="text-xs text-muted mt-0.5">Loading…</p>
          )}

          {/* Watched / remaining */}
          {totalEpisodes !== null ? (
            <p className="text-[10px] text-muted mt-0.5">
              {totalWatched}/{totalEpisodes} watched
              {remaining !== null && remaining > 0 && (
                <span className="ml-1 text-white/30">· {remaining} left</span>
              )}
            </p>
          ) : totalWatched > 0 ? (
            <p className="text-[10px] text-muted mt-0.5">{totalWatched} watched</p>
          ) : null}
        </div>

        {/* Mark next button */}
        {!allWatched && nextSeason > 0 && (
          <button
            onClick={e => { e.stopPropagation(); handleMarkNext() }}
            onMouseDown={e => e.preventDefault()}
            disabled={toggleMutation.isPending}
            className="w-8 h-8 rounded-full border-2 border-white/20 flex items-center justify-center shrink-0 active:scale-90 active:border-accent active:bg-accent/10 transition-all"
            title="Mark next episode as watched"
          >
            {toggleMutation.isPending
              ? <span className="w-3 h-3 border border-accent border-t-transparent rounded-full animate-spin" />
              : <span className="text-white/50 text-xs font-bold">✓</span>
            }
          </button>
        )}
      </button>
    </>
  )
}

// ─── Main ShowsTab ────────────────────────────────────────────────────────────
export default function ShowsTab() {
  const { data: userShows, isLoading } = useUserShows()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<WatchStatus | 'all'>('watching')

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const filtered = filter === 'all'
    ? userShows ?? []
    : (userShows ?? []).filter((s: any) => s.status === filter)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {(['watching', 'watchlist', 'completed', 'all'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
              filter === s ? 'bg-accent border-accent text-white' : 'border-white/10 text-muted hover:text-white'
            }`}
          >
            {s === 'all' ? 'All' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <span className="text-5xl">📺</span>
          <p className="text-muted text-sm">
            {filter === 'watching' ? 'No series in progress' : 'Nothing here yet'}
          </p>
        </div>
      ) : filter === 'watching' ? (
        <div className="flex flex-col gap-2">
          {filtered.map((us: any) => (
            <NextEpisodeCard key={us.shows.id} userShow={us} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {filtered.map((us: any) => {
            const show = us.shows
            const poster = tmdbImg(show.poster_path, 'w200')
            return (
              <button
                key={show.id}
                onClick={() => navigate(`/show/${show.tmdb_id}?dbid=${show.id}`)}
                className="flex flex-col gap-1.5 text-left active:scale-95 transition-transform"
              >
                <div className="aspect-[2/3] rounded-xl overflow-hidden bg-surface-2">
                  {poster
                    ? <img src={poster} alt={show.name} className="w-full h-full object-cover" loading="lazy" />
                    : <div className="w-full h-full flex items-center justify-center text-3xl">📺</div>
                  }
                </div>
                <p className="text-xs font-medium leading-tight line-clamp-2">{show.name}</p>
                <span className="text-[10px] text-muted">{STATUS_LABELS[us.status as WatchStatus]}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
