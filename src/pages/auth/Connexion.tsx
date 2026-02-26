import { useState } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'

type Props = { retour: () => void }

export default function Connexion({ retour }: Props) {
  const [pseudo, setPseudo] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState('')
  const setCompte = useStore(s => s.setCompte)

  const seConnecter = async () => {
    const { data, error } = await supabase
      .from('comptes')
      .select('*')
      .eq('pseudo', pseudo)
      .eq('mot_de_passe', motDePasse)
      .single()

    if (error || !data) {
      setErreur('Pseudo ou mot de passe incorrect')
      return
    }

    setCompte(data)
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
      <h1 className="text-4xl font-bold text-purple-400 mb-8">JDR App</h1>
      <div className="bg-gray-800 p-8 rounded-xl w-80 flex flex-col gap-4">
        <h2 className="text-xl font-semibold text-center">Connexion</h2>
        <input
          type="text"
          placeholder="Pseudo"
          value={pseudo}
          onChange={e => setPseudo(e.target.value)}
          className="bg-gray-700 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-purple-400"
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={motDePasse}
          onChange={e => setMotDePasse(e.target.value)}
          className="bg-gray-700 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-purple-400"
        />
        {erreur && <p className="text-red-400 text-sm text-center">{erreur}</p>}
        <button
          onClick={seConnecter}
          className="bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-semibold transition"
        >
          Se connecter
        </button>
        <button onClick={retour} className="text-gray-400 hover:text-white text-sm transition">
          ← Retour
        </button>
      </div>
    </div>
  )
}