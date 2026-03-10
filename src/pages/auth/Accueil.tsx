type Props = {
  allerVers: (page: 'connexion' | 'inscription') => void
}

export default function Accueil({ allerVers }: Props) {
  return (
    <div
      className="flex flex-col items-center justify-center h-screen"
      style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}
    >
      <h1
        className="text-5xl font-black mb-3 tracking-tight"
        style={{
          background: 'linear-gradient(135deg, var(--color-light), var(--color-accent2))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        JDR App
      </h1>
      <p className="mb-10 text-lg" style={{ color: 'var(--text-secondary)' }}>
        Bienvenue sur ton app de JDR
      </p>
      <div className="flex gap-4">
        <button
          onClick={() => allerVers('connexion')}
          className="px-8 py-3 rounded-xl font-bold transition-all hover:-translate-y-1 text-white"
          style={{
            background: 'linear-gradient(135deg, var(--color-main), var(--color-accent2))',
            boxShadow: '0 0 20px var(--color-glow)',
          }}
        >
          Se connecter
        </button>
        <button
          onClick={() => allerVers('inscription')}
          className="px-8 py-3 rounded-xl font-bold transition-all hover:-translate-y-1"
          style={{
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
          }}
        >
          Créer un compte
        </button>
      </div>
    </div>
  )
}
