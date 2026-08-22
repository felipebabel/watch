import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import ShowsTab from '../components/tabs/ShowsTab'
import MoviesTab from '../components/tabs/MoviesTab'
import SearchTab from '../components/tabs/SearchTab'

type Tab = 'shows' | 'movies' | 'search'

const NAV_ITEMS: { id: Tab; label: string; icon: string }[] = [
  { id: 'shows',  label: 'Series',  icon: '📺' },
  { id: 'search', label: 'Search',  icon: '🔍' },
  { id: 'movies', label: 'Movies',  icon: '🎬' },
]

export default function HomePage() {
  const { user, signOut } = useAuth()
  const [tab, setTab] = useState<Tab>('shows')
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const avatar = user?.user_metadata?.avatar_url
  const name = user?.user_metadata?.full_name ?? user?.email ?? ''
  const email = user?.email ?? ''

  return (
    // Outer: full screen, split into sidebar + main on desktop
    <div className="min-h-screen flex">

      {/* ── Desktop sidebar ── (hidden on mobile) */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-white/5 px-4 py-6 gap-2 sticky top-0 h-screen">
        <div className="flex items-center gap-2 px-2 mb-6">
          <img src="/apple-touch-icon.png" alt="WatchTime" className="w-7 h-7 rounded-lg" />
          <span className="font-bold text-base">WatchTime</span>
        </div>

        {NAV_ITEMS.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
              tab === id ? 'bg-accent/15 text-accent' : 'text-muted hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="text-base">{icon}</span>
            {label}
          </button>
        ))}

        {/* Profile at bottom */}
        <div className="mt-auto" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(v => !v)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-left"
          >
            {avatar ? (
              <img src={avatar} alt="Avatar" className="w-7 h-7 rounded-full border border-white/10 shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-surface-2 border border-white/10 flex items-center justify-center text-xs shrink-0">
                {email[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{name.split(' ')[0]}</p>
              <p className="text-[10px] text-muted truncate">{email}</p>
            </div>
          </button>

          {profileOpen && (
            <div className="absolute bottom-20 left-4 w-48 bg-surface-2 border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-white/5">
                <p className="text-xs font-medium truncate">{name}</p>
                <p className="text-[10px] text-muted truncate">{email}</p>
              </div>
              <button
                onClick={() => { setProfileOpen(false); signOut() }}
                className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-white/5 transition-colors"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-h-screen max-w-2xl mx-auto w-full">

        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 pt-safe-top pb-3 border-b border-white/5 sticky top-0 bg-background/95 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2">
            <img src="/apple-touch-icon.png" alt="WatchTime" className="w-7 h-7 rounded-lg" />
            <span className="font-bold text-base">WatchTime</span>
          </div>

          {/* Avatar → profile dropdown */}
          <div ref={profileRef} className="relative">
            <button
              onClick={() => setProfileOpen(v => !v)}
              className="flex items-center"
            >
              {avatar ? (
                <img src={avatar} alt="Avatar" className="w-8 h-8 rounded-full border border-white/10" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-surface-2 border border-white/10 flex items-center justify-center text-sm">
                  {email[0]?.toUpperCase()}
                </div>
              )}
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-10 w-52 bg-surface-2 border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-white/5">
                  <p className="text-xs font-medium truncate">{name}</p>
                  <p className="text-[10px] text-muted truncate">{email}</p>
                </div>
                <button
                  onClick={() => { setProfileOpen(false); signOut() }}
                  className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-white/5 transition-colors"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Tab content */}
        <main className="flex-1 overflow-y-auto px-4 py-4">
          {tab === 'shows'  && <ShowsTab />}
          {tab === 'movies' && <MoviesTab />}
          {tab === 'search' && <SearchTab />}
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden border-t border-white/5 bg-background/95 backdrop-blur-sm sticky bottom-0 z-10">
          <div className="flex pb-safe-bottom">
            {NAV_ITEMS.map(({ id, label, icon }) => (
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
    </div>
  )
}
