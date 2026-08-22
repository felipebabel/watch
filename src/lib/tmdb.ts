import type { TMDBShow, TMDBMovie, TMDBShowDetail, TMDBMovieDetail, TMDBEpisode } from '../types'

const API_KEY = import.meta.env.VITE_TMDB_API_KEY as string
const BASE_URL = 'https://api.themoviedb.org/3'
const IMG_BASE = 'https://image.tmdb.org/t/p'

export const tmdbImg = (path: string | null | undefined, size: 'w200' | 'w342' | 'w500' | 'original' = 'w342') => {
  if (!path) return null
  return `${IMG_BASE}/${size}${path}`
}

async function fetchTMDB<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${endpoint}`)
  url.searchParams.set('api_key', API_KEY)
  url.searchParams.set('language', 'pt-BR')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`TMDB error: ${res.status}`)
  return res.json()
}

export const tmdb = {
  searchShows: (query: string) =>
    fetchTMDB<{ results: TMDBShow[] }>('/search/tv', { query }),

  searchMovies: (query: string) =>
    fetchTMDB<{ results: TMDBMovie[] }>('/search/movie', { query }),

  searchAll: async (query: string) => {
    const [shows, movies] = await Promise.all([
      tmdb.searchShows(query),
      tmdb.searchMovies(query),
    ])
    return { shows: shows.results, movies: movies.results }
  },

  getShow: (id: number) =>
    fetchTMDB<TMDBShowDetail>(`/tv/${id}`),

  getMovie: (id: number) =>
    fetchTMDB<TMDBMovieDetail>(`/movie/${id}`),

  getSeasonEpisodes: (showId: number, season: number) =>
    fetchTMDB<{ episodes: TMDBEpisode[] }>(`/tv/${showId}/season/${season}`),

  getTrendingShows: () =>
    fetchTMDB<{ results: TMDBShow[] }>('/trending/tv/week'),

  getTrendingMovies: () =>
    fetchTMDB<{ results: TMDBMovie[] }>('/trending/movie/week'),
}
