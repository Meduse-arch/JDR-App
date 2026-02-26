type Props = {
  allerVers: (page: 'connexion' | 'inscription') => void
}

export default function Accueil({ allerVers }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
      <h1 className="text-4xl font-bold text-purple-400 mb-2">JDR App</h1>
      <p className="text-gray-400 mb-10">Bienvenue sur ton app de JDR</p>
      <div className="flex gap-4">
        <button
          onClick={() => allerVers('connexion')}
          className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg font-semibold transition"
        >
          Se connecter
        </button>
        <button
          onClick={() => allerVers('inscription')}
          className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-3 rounded-lg font-semibold transition"
        >
          Créer un compte
        </button>
      </div>
    </div>
  )
}