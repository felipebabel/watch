// TMDB types
export interface TMDBShow {
  id: number
  name: string
  poster_path: string | null
  backdrop_path: string | null
  overview: string
  first_air_date: string
  vote_average: number
  genre_ids: number[]
}

export interface TMDBMovie {
  id: number
  title: string
  poster_path: string | null
  backdrop_path: string | null
  overview: string
  release_date: string
  vote_average: number
  genre_ids: number[]
}

export interface TMDBSeason {
  id: number
  season_number: number
  name: string
  episode_count: number
  poster_path: string | null
  air_date: string | null
}

export interface TMDBEpisode {
  id: number
  episode_number: number
  season_number: number
  name: string
  overview: string
  still_path: string | null
  air_date: string | null
  runtime: number | null
}

export interface TMDBShowDetail extends TMDBShow {
  seasons: TMDBSeason[]
  number_of_episodes: number
  number_of_seasons: number
  status: string
  tagline: string
}

export interface TMDBMovieDetail extends TMDBMovie {
  runtime: number | null
  tagline: string
  status: string
}

// DB types
export type WatchStatus = 'watching' | 'completed' | 'dropped' | 'watchlist'

export interface UserShow {
  user_id: string
  show_id: string
  status: WatchStatus
  shows: {
    id: string
    tmdb_id: number
    name: string
    poster_path: string | null
  }
}

export interface WatchedEpisode {
  user_id: string
  episode_id: string
  watched_at: string
  episodes: {
    id: string
    show_id: string
    season: number
    episode: number
    name: string | null
  }
}

export interface WatchedMovie {
  user_id: string
  movie_id: string
  watched_at: string
  movies: {
    id: string
    tmdb_id: number
    title: string
    poster_path: string | null
  }
}
