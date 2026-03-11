import { useState } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'
import CryptoJS from 'crypto-js'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'

type Props = { retour: () => void }

export default function Connexion({ retour }: Props) {
  const [pseudo, setPseudo]           = useState('')
  const [motDePasse, setMotDePasse]   = useState('')
  const [seSouvenir, setSeSouvenir]   = useState(false)
  const [erreur, setErreur]           = useState('')
  
  const setCompte = useStore(s => s.setCompte)

  const seConnecter = async () => {
    setErreur('')
    if (!pseudo || !motDePasse) {
      setErreur('Veuillez remplir tous les champs')
      return
    }

    const motDePasseHashe = CryptoJS.SHA256(motDePasse).toString()
    const { data, error } = await supabase
      .from('comptes')
      .select('*')
      .eq('pseudo', pseudo)
      .eq('mot_de_passe', motDePasseHashe)
      .single()
      
    if (error || !data) { 
      setErreur('Pseudo ou mot de passe incorrect')
      return 
    }
    
    // Sauvegarder dans le localStorage si la case est cochée
    if (seSouvenir) {
      localStorage.setItem('jdr-compte', JSON.stringify(data))
    } else {
      localStorage.removeItem('jdr-compte')
    }

    setCompte(data)
  }

  return (
    <div
      className="flex flex-col items-center justify-center h-screen p-4"
      style={{ backgroundColor: 'var(--bg-app)' }}
    >
      <h1
        className="text-4xl md:text-5xl font-black mb-8 tracking-tight text-center"
        style={{
          background: 'linear-gradient(135deg, var(--color-light), var(--color-accent2))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        JDR App
      </h1>

      <Card className="w-full max-w-sm p-6 sm:p-8 flex flex-col gap-5 shadow-2xl">
        <h2 className="text-xl font-bold text-center mb-2" style={{ color: 'var(--text-primary)' }}>
          Connexion
        </h2>

        <div className="flex flex-col gap-4">
          <Input
            icon="👤"
            type="text"
            placeholder="Pseudo"
            value={pseudo}
            onChange={e => setPseudo(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && seConnecter()}
          />
          <Input
            icon="🔑"
            type="password"
            placeholder="Mot de passe"
            value={motDePasse}
            onChange={e => setMotDePasse(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && seConnecter()}
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer mt-1 group w-fit">
          <div className="relative flex items-center justify-center w-5 h-5 rounded border transition-colors"
               style={{ 
                 backgroundColor: seSouvenir ? 'var(--color-main)' : 'var(--bg-input)',
                 borderColor: seSouvenir ? 'var(--color-main)' : 'var(--border)'
               }}>
            {seSouvenir && <span className="text-white text-xs font-bold">✓</span>}
            <input 
              type="checkbox" 
              className="absolute opacity-0 cursor-pointer w-full h-full"
              checked={seSouvenir}
              onChange={(e) => setSeSouvenir(e.target.checked)}
            />
          </div>
          <span className="text-sm font-semibold transition-colors group-hover:text-[var(--text-primary)]" style={{ color: 'var(--text-secondary)' }}>
            Se souvenir de moi
          </span>
        </label>

        {erreur && <p className="text-red-400 text-sm font-bold text-center mt-2 animate-pulse">{erreur}</p>}

        <Button
          size="lg"
          onClick={seConnecter}
          className="mt-4"
        >
          Se connecter
        </Button>
        
        <Button
          variant="ghost"
          onClick={retour}
          className="text-sm"
        >
          ← Retour
        </Button>
      </Card>
    </div>
  )
}
