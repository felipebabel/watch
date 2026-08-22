import { supabase } from './supabase'
import type { WatchStatus } from '../types'

// ─── Shows ────────────────────────────────────────────────────────────────────

export async function upsertShow(tmdbId: number, name: string, posterPath: string | null) {
  const { data, error } = await supabase
    .from('shows')
    .upsert({ tmdb_id: tmdbId, name, poster_path: posterPath }, { onConflict: 'tmdb_id' })
    .select('id')
    .single()
  if (error) throw error
  return data.id as string
}

export async function setShowStatus(userId: string, showId: string, status: WatchStatus) {
  const { error } = await supabase
    .from('user_shows')
    .upsert({ user_id: userId, show_id: showId, status }, { onConflict: 'user_id,show_id' })
  if (error) throw error
}

export async function removeShow(userId: string, showId: string) {
  const { error } = await supabase
    .from('user_shows')
    .delete()
    .eq('user_id', userId)
    .eq('show_id', showId)
  if (error) throw error
}

export async function getUserShows(userId: string) {
  const { data, error } = await supabase
    .from('user_shows')
    .select('*, shows(id, tmdb_id, name, poster_path)')
    .eq('user_id', userId)
  if (error) throw error
  return data
}

// ─── Episodes ─────────────────────────────────────────────────────────────────

export async function upsertEpisode(showId: string, season: number, episode: number, name: string | null) {
  const { data, error } = await supabase
    .from('episodes')
    .upsert({ show_id: showId, season, episode, name }, { onConflict: 'show_id,season,episode' })
    .select('id')
    .single()
  if (error) throw error
  return data.id as string
}

export async function markEpisodeWatched(userId: string, episodeId: string) {
  const { error } = await supabase
    .from('watched_episodes')
    .upsert({ user_id: userId, episode_id: episodeId }, { onConflict: 'user_id,episode_id' })
  if (error) throw error
}

export async function unmarkEpisodeWatched(userId: string, episodeId: string) {
  const { error } = await supabase
    .from('watched_episodes')
    .delete()
    .eq('user_id', userId)
    .eq('episode_id', episodeId)
  if (error) throw error
}

export async function getWatchedEpisodesForShow(userId: string, showId: string) {
  const { data, error } = await supabase
    .from('watched_episodes')
    .select('episode_id, episodes!inner(id, show_id, season, episode)')
    .eq('user_id', userId)
    .eq('episodes.show_id', showId)
  if (error) throw error
  // Return a Set of episode DB ids for fast lookup
  return new Set(data.map((r: any) => r.episode_id as string))
}

// ─── Movies ───────────────────────────────────────────────────────────────────

export async function upsertMovie(tmdbId: number, title: string, posterPath: string | null) {
  const { data, error } = await supabase
    .from('movies')
    .upsert({ tmdb_id: tmdbId, title, poster_path: posterPath }, { onConflict: 'tmdb_id' })
    .select('id')
    .single()
  if (error) throw error
  return data.id as string
}

export async function markMovieWatched(userId: string, movieId: string) {
  const { error } = await supabase
    .from('watched_movies')
    .upsert({ user_id: userId, movie_id: movieId }, { onConflict: 'user_id,movie_id' })
  if (error) throw error
}

export async function unmarkMovieWatched(userId: string, movieId: string) {
  const { error } = await supabase
    .from('watched_movies')
    .delete()
    .eq('user_id', userId)
    .eq('movie_id', movieId)
  if (error) throw error
}

export async function getWatchedMovies(userId: string) {
  const { data, error } = await supabase
    .from('watched_movies')
    .select('*, movies(id, tmdb_id, title, poster_path)')
    .eq('user_id', userId)
    .order('watched_at', { ascending: false })
  if (error) throw error
  return data
}
