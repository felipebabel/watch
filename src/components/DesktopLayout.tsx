import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

type Tab = 'shows' | 'movies' | 'search'

const NAV_ITEMS: { id: Tab; label: string; icon: string }[] = [
  { id: 'shows',  label: 'Series',  icon: '📺' },
  { id: 'search', label: 'Search',  icon: '🔍' },
  { id: 'movies', label: 'Movies',  icon: '🎬' },
]

function ProfileDropdown({ avatar, name, email, onSignOut }: {
  avatar?: string; name: string; email: string; onSignOut: () => void
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

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(v => !v)} className="flex items-center hover:opacity-80 transition-opacity">
        {avatar
          ? <img src={avatar} alt="Avatar" className="w-8 h-8 rounded-full border border-white/10" />
          : <div className="w-8 h-8 rounded-full bg-surface-2 border border-white/10 flex items-center justify-center text-sm">{email[0]?.toUpperCase()}</div>
        }
      </button>
      {open && (
        <div className="fixed bottom-20 left-4 w-52 bg-surface-2 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-white/5">
            <p className="text-xs font-medium truncate">{name}</p>
            <p className="text-[10px] text-muted truncate">{email}</p>
          </div>
          <button
            onMouseDown={e => e.preventDefault()}
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

export default function DesktopLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const avatar = user?.user_metadata?.avatar_url as string | undefined
  const name   = user?.user_metadata?.full_name as string ?? user?.email ?? ''
  const email  = user?.email ?? ''

  const savedTab = sessionStorage.getItem('activeTab') as Tab | null
  const activeTab: Tab = savedTab && ['shows', 'movies', 'search'].includes(savedTab) ? savedTab : 'shows'

  const goTo = (t: Tab) => {
    sessionStorage.setItem('activeTab', t)
    navigate('/')
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-white/5 px-4 py-6 gap-2 sticky top-0 h-screen bg-[#27272a]">
        <div className="flex items-center justify-center px-2 mb-6 h-[55px]">
          <img src="/banner.jpg" alt="WatchTime" className="h-[55px] w-auto object-contain" />
        </div>

        {NAV_ITEMS.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => goTo(id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
              activeTab === id ? 'bg-accent/15 text-accent' : 'text-muted hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="text-base">{icon}</span>
            {label}
          </button>
        ))}

        <div className="mt-auto px-1">
          <div className="flex items-center gap-3">
            <ProfileDropdown avatar={avatar} name={name} email={email} onSignOut={signOut} />
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{name.split(' ')[0]}</p>
              <p className="text-[10px] text-muted truncate">{email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Page content */}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  )
}
