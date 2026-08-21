# WatchTime

Clone pessoal do TV Time — acompanhe séries e filmes que você assistiu.

**URL:** https://watch.felipebabel.com

## Stack

- React + TypeScript + Vite
- Tailwind CSS
- Supabase (Auth + PostgreSQL)
- TMDB API (dados de séries/filmes)
- PWA (instalável no iPhone via Safari)

## Setup

### 1. Clonar e instalar

```bash
git clone https://github.com/felipebabel/watchtime.git
cd watchtime
npm install
```

### 2. Variáveis de ambiente

Crie um arquivo `.env` na raiz:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_TMDB_API_KEY=your-tmdb-api-key
```

### 3. Configurar Supabase

#### Auth — Google OAuth

1. No painel Supabase → **Authentication → Providers → Google**
2. Habilite o Google provider
3. Crie um OAuth App no [Google Cloud Console](https://console.cloud.google.com)
   - Authorized redirect URI: `https://your-project.supabase.co/auth/v1/callback`
4. Cole o Client ID e Secret no Supabase

#### Redirect URLs

Em **Authentication → URL Configuration**:
- Site URL: `https://watch.felipebabel.com`
- Redirect URLs: `https://watch.felipebabel.com`, `http://localhost:3000`

#### Banco de dados (SQL)

Execute no SQL Editor do Supabase:

```sql
-- Shows (séries)
create table shows (
  id uuid primary key default gen_random_uuid(),
  tmdb_id integer not null unique,
  name text not null,
  poster_path text,
  created_at timestamptz default now()
);

-- Episodes
create table episodes (
  id uuid primary key default gen_random_uuid(),
  show_id uuid references shows(id) on delete cascade,
  season integer not null,
  episode integer not null,
  name text,
  created_at timestamptz default now(),
  unique(show_id, season, episode)
);

-- Movies
create table movies (
  id uuid primary key default gen_random_uuid(),
  tmdb_id integer not null unique,
  title text not null,
  poster_path text,
  created_at timestamptz default now()
);

-- User show status
create table user_shows (
  user_id uuid references auth.users(id) on delete cascade,
  show_id uuid references shows(id) on delete cascade,
  status text check (status in ('watching', 'completed', 'dropped', 'watchlist')),
  primary key (user_id, show_id)
);

-- Watched episodes
create table watched_episodes (
  user_id uuid references auth.users(id) on delete cascade,
  episode_id uuid references episodes(id) on delete cascade,
  watched_at timestamptz default now(),
  primary key (user_id, episode_id)
);

-- Watched movies
create table watched_movies (
  user_id uuid references auth.users(id) on delete cascade,
  movie_id uuid references movies(id) on delete cascade,
  watched_at timestamptz default now(),
  primary key (user_id, movie_id)
);

-- Row Level Security
alter table user_shows enable row level security;
alter table watched_episodes enable row level security;
alter table watched_movies enable row level security;

create policy "Users own data" on user_shows
  for all using (auth.uid() = user_id);

create policy "Users own data" on watched_episodes
  for all using (auth.uid() = user_id);

create policy "Users own data" on watched_movies
  for all using (auth.uid() = user_id);
```

### 4. TMDB API Key

1. Crie uma conta em [themoviedb.org](https://www.themoviedb.org)
2. Settings → API → Request an API Key
3. Cole no `.env` como `VITE_TMDB_API_KEY`

### 5. Rodar localmente

```bash
npm run dev
```

### 6. Deploy (GitHub Pages)

```bash
npm run deploy
```

Configure o DNS do `watch.felipebabel.com` apontando para GitHub Pages e ative o HTTPS nas configurações do repositório.

## Roadmap

- [x] Estrutura base + PWA
- [x] Login com Google
- [ ] Busca de séries/filmes (TMDB)
- [ ] Marcar episódios como assistidos
- [ ] Marcar filmes como assistidos
- [ ] Watchlist
- [ ] Continue Watching
- [ ] Perfil + estatísticas
