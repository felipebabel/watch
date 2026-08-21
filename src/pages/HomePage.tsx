import { useAuth } from '../contexts/AuthContext'

export default function HomePage() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen px-4 py-8 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold">WatchTime</h1>
          <p className="text-sm text-muted">
            Olá, {user?.user_metadata?.name?.split(' ')[0] ?? 'Felipe'} 👋
          </p>
        </div>

        <button
          onClick={signOut}
          className="flex items-center gap-2 text-sm text-muted hover:text-white transition-colors"
        >
          {user?.user_metadata?.avatar_url && (
            <img
              src={user.user_metadata.avatar_url}
              alt="Avatar"
              className="w-8 h-8 rounded-full border border-white/10"
            />
          )}
        </button>
      </div>

      {/* Coming soon sections */}
      <div className="flex flex-col gap-4">
        {[
          { emoji: '📺', label: 'Séries', desc: 'Em breve' },
          { emoji: '🎬', label: 'Filmes', desc: 'Em breve' },
          { emoji: '📋', label: 'Watchlist', desc: 'Em breve' },
        ].map(({ emoji, label, desc }) => (
          <div
            key={label}
            className="card p-5 flex items-center gap-4 opacity-60 cursor-not-allowed"
          >
            <span className="text-3xl">{emoji}</span>
            <div>
              <p className="font-semibold">{label}</p>
              <p className="text-sm text-muted">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-muted mt-12">
        Login feito com sucesso ✅<br />
        As funcionalidades estão sendo desenvolvidas.
      </p>
    </div>
  )
}
