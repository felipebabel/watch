import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import ShowsTab from '../components/tabs/ShowsTab'
import MoviesTab from '../components/tabs/MoviesTab'
import SearchTab from '../components/tabs/SearchTab'

type Tab = 'shows' | 'movies' | 'search'

export default function HomePage() {
  const { user, signOut } = useAuth()
  const [tab, setTab] = useState<Tab>('shows')

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <img src="/apple-touch-icon.png" alt="WatchTime" className="w-7 h-7 rounded-lg" />
          <span className="font-bold text-base">WatchTime</span>
        </div>
        <button onClick={signOut} className="flex items-center gap-2">
          {user?.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt="Avatar"
              className="w-8 h-8 rounded-full border border-white/10"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-surface-2 border border-white/10 flex items-center justify-center text-sm">
              {user?.email?.[0].toUpperCase()}
            </div>
          )}
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4 py-4">
        {tab === 'shows' && <ShowsTab />}
        {tab === 'movies' && <MoviesTab />}
        {tab === 'search' && <SearchTab />}
      </main>

      {/* Bottom nav */}
      <nav className="border-t border-white/5 bg-background/95 backdrop-blur-sm pb-safe">
        <div className="flex">
          {([
            { id: 'shows', label: 'Séries', icon: '📺' },
            { id: 'search', label: 'Buscar', icon: '🔍' },
            { id: 'movies', label: 'Filmes', icon: '🎬' },
          ] as { id: Tab; label: string; icon: string }[]).map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
                tab === id ? 'text-accent' : 'text-muted'
              }`}
            >
              <span className="text-xl leading-none">{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
