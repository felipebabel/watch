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

function ProfileDropdown({
  avatar, name, email, onSignOut,
  position = 'bottom',
}: {
  avatar?: string; name: string; email: string
  onSignOut: () => void; position?: 'bottom' | 'top-right'
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const dropdownClass = position === 'top-right'
    ? 'absolute right-0 top-10 w-52'
    : 'fixed bottom-20 left-4 w-52'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        {avatar ? (
          <img src={avatar} alt="Avatar" className="w-8 h-8 rounded-full border border-white/10" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-surface-2 border border-white/10 flex items-center justify-center text-sm">
            {email[0]?.toUpperCase()}
          </div>
        )}
      </button>

      {open && (
        <div className={`${dropdownClass} bg-surface-2 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50`}>
          <div className="px-4 py-3 border-b border-white/5">
            <p className="text-xs font-medium truncate">{name}</p>
            <p className="text-[10px] text-muted truncate">{email}</p>
          </div>
          <button
            onMouseDown={e => e.preventDefault()} // prevent blur before click
            onClick={() => { setOpen(false); onSignOut() }}
            className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-white/5 transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

export default function HomePage() {
  const { user, signOut } = useAuth()
  const [tab, setTabState] = useState<Tab>(() => {
    const saved = sessionStorage.getItem('activeTab') as Tab | null
    return saved && ['shows', 'movies', 'search'].includes(saved) ? saved : 'shows'
  })

  const setTab = (t: Tab) => {
    sessionStorage.setItem('activeTab', t)
    setTabState(t)
  }

  const avatar = user?.user_metadata?.avatar_url as string | undefined
  const name   = user?.user_metadata?.full_name as string ?? user?.email ?? ''
  const email  = user?.email ?? ''

  return (
    <div className="min-h-screen flex">

      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-white/5 px-4 py-6 gap-2 sticky top-0 h-screen bg-[#27272a]">
        <div className="flex items-center justify-center px-2 mb-6 h-[55px]">
          <img src="/banner.jpg" alt="WatchTime" className="h-[55px] w-auto object-contain" />
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

        {/* Profile at bottom of sidebar */}
        <div className="mt-auto px-1">
          <div className="flex items-center gap-3">
            <ProfileDropdown
              avatar={avatar}
              name={name}
              email={email}
              onSignOut={signOut}
              position="bottom"
            />
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{name.split(' ')[0]}</p>
              <p className="text-[10px] text-muted truncate">{email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-h-screen max-w-2xl mx-auto w-full">

        {/* Mobile header */}
        <header
          className="md:hidden flex items-center justify-between px-4 border-b border-white/5 sticky top-0 bg-[#27272a] z-10"
          style={{
            minHeight: '64px',
            paddingTop: 'calc(env(safe-area-inset-top) + 10px)',
            paddingBottom: '10px',
          }}
        >
          <img src="/banner.jpg" alt="WatchTime" className="h-[44px] w-auto object-contain" />
          <ProfileDropdown
            avatar={avatar}
            name={name}
            email={email}
            onSignOut={signOut}
            position="top-right"
          />
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
