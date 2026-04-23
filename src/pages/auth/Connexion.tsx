import { useState } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'
import CryptoJS from 'crypto-js'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { User, Key, Check, ArrowLeft } from 'lucide-react'

type Props = { retour: () => void }

export default function Connexion({ retour }: Props) {
  const { mode } = useStore()
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
      localStorage.setItem('sigil-compte', JSON.stringify(data))
    } else {
      localStorage.removeItem('sigil-compte')
    }

    setCompte(data)
  }

  return (
    <div className={`flex flex-col items-center justify-center h-screen p-4 relative overflow-hidden transition-colors duration-500 ${mode} bg-app text-primary`}>
      {/* RUNE DE FOND RÉDUITE */}
      <div className="absolute inset-0 flex items-center justify-center text-[20rem] opacity-[0.02] pointer-events-none font-cinzel">ᛗ</div>

      <Card className="w-full max-w-sm p-6 sm:p-8 flex flex-col gap-4 sm:gap-6 shadow-2xl bg-card/40 border-theme/30 rounded-sm relative z-10">
        <div className="text-center mb-2">
          <h1 className="text-3xl font-cinzel font-black tracking-widest uppercase text-theme-main">
            SIGIL
          </h1>
          <h2 className="text-xs font-cinzel font-bold uppercase tracking-[0.3em] text-primary opacity-60">
            Authentification
          </h2>
        </div>

        <div className="flex flex-col gap-3 sm:gap-4">
          <Input
            icon={<User size={18} />}
            type="text"
            placeholder="Pseudo de l'aventurier"
            value={pseudo}
            onChange={e => setPseudo(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && seConnecter()}
            className="font-garamond font-bold"
          />
          <Input
            icon={<Key size={18} />}
            type="password"
            placeholder="Sceau de sécurité"
            value={motDePasse}
            onChange={e => setMotDePasse(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && seConnecter()}
            className="font-garamond font-bold"
          />
        </div>

        <label className="flex items-center gap-3 cursor-pointer mt-2 group w-fit">
          <div className={`relative flex items-center justify-center w-5 h-5 rounded-sm border transition-all ${seSouvenir ? 'bg-theme-main border-theme-main' : 'bg-black/20 border-theme/30'}`}>
            {seSouvenir && <Check size={12} className="text-white font-black" />}
            <input 
              type="checkbox" 
              className="absolute opacity-0 cursor-pointer w-full h-full"
              checked={seSouvenir}
              onChange={(e) => setSeSouvenir(e.target.checked)}
            />
          </div>
          <span className="text-xs font-cinzel font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity text-primary">
            Maintenir la session
          </span>
        </label>

        {erreur && <p className="text-red-600 text-xs font-bold text-center mt-2 animate-pulse font-garamond">{erreur}</p>}

        <Button
          size="lg"
          onClick={seConnecter}
          className="mt-6 font-cinzel uppercase tracking-widest font-black"
        >
          Pénétrer dans l'univers
        </Button>
        
        <Button
          variant="ghost"
          onClick={retour}
          className="text-[10px] font-cinzel uppercase tracking-widest opacity-40 hover:opacity-100"
        >
          <ArrowLeft size={12} className="mr-2" /> Retourner à l'accueil
        </Button>
      </Card>
    </div>
  )
}
