import { useState } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'
import CryptoJS from 'crypto-js'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { ArrowLeft, User, Key, Sparkles } from 'lucide-react'

type Props = { retour: () => void; allerVersConnexion: () => void }

export default function Inscription({ retour, allerVersConnexion }: Props) {
  const { mode } = useStore()
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
            Nouvelle Âme
          </h2>
        </div>

        <div className="flex flex-col gap-3 sm:gap-4">
          <Input
            icon={<User size={18} />}
            type="text"
            placeholder="Pseudo"
            value={pseudo}
            onChange={e => setPseudo(e.target.value)}
            className="font-garamond font-bold"
          />
          <Input
            icon={<Key size={18} />}
            type="password"
            placeholder="Mot de passe"
            value={motDePasse}
            onChange={e => setMotDePasse(e.target.value)}
            className="font-garamond font-bold"
          />
        </div>

        {erreur && <p className="text-red-600 text-xs font-bold text-center mt-2 animate-pulse font-garamond">{erreur}</p>}

        <Button
          size="lg"
          onClick={sInscrire}
          className="mt-6 font-cinzel uppercase tracking-widest font-black"
        >
          <Sparkles size={18} className="mr-2" /> Créer Compte
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
