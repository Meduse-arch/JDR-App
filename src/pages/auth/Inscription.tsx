import { useState } from 'react'
import { supabase } from '../../supabase'
import CryptoJS from 'crypto-js'

type Props = { retour: () => void; allerVersConnexion: () => void }

export default function Inscription({ retour, allerVersConnexion }: Props) {
  const [pseudo, setPseudo]         = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur]         = useState('')

  const sInscrire = async () => {
    if (!pseudo || !motDePasse) { setErreur('Remplis tous les champs'); return }
    const motDePasseHashe = CryptoJS.SHA256(motDePasse).toString()
    const { error } = await supabase
      .from('comptes')
      .insert({ pseudo, mot_de_passe: motDePasseHashe, role: 'joueur' })
    if (error) { setErreur('Ce pseudo est déjà pris'); return }
    allerVersConnexion()
  }

  const inputStyle = {
    backgroundColor: 'var(--bg-input)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
  }

  return (
    <div
      className="flex flex-col items-center justify-center h-screen"
      style={{ backgroundColor: 'var(--bg-app)' }}
    >
      <h1
        className="text-4xl font-black mb-8 tracking-tight"
        style={{
          background: 'linear-gradient(135deg, var(--color-light), var(--color-accent2))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        JDR App
      </h1>

      <div
        className="p-8 rounded-2xl w-80 flex flex-col gap-4"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <h2 className="text-xl font-bold text-center" style={{ color: 'var(--text-primary)' }}>
          Créer un compte
        </h2>

        <input
          type="text"
          placeholder="Pseudo"
          value={pseudo}
          onChange={e => setPseudo(e.target.value)}
          className="px-4 py-2 rounded-xl outline-none text-sm"
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={motDePasse}
          onChange={e => setMotDePasse(e.target.value)}
          className="px-4 py-2 rounded-xl outline-none text-sm"
          style={inputStyle}
        />

        {erreur && <p className="text-red-400 text-sm text-center">{erreur}</p>}

        <button
          onClick={sInscrire}
          className="py-2 rounded-xl font-bold transition-all hover:-translate-y-0.5 text-white"
          style={{
            background: 'linear-gradient(135deg, var(--color-main), var(--color-accent2))',
            boxShadow: '0 0 15px var(--color-glow)',
          }}
        >
          Créer le compte
        </button>
        <button onClick={retour} className="text-sm transition" style={{ color: 'var(--text-secondary)' }}>
          ← Retour
        </button>
      </div>
    </div>
  )
}
