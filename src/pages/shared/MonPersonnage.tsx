import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'
import { usePersonnage } from '../../hooks/usePersonnage'
import { useStats } from '../../hooks/useStats'
import { personnageService } from '../../services/personnageService'
import { useResourceManagement, type RessourceKey } from '../../hooks/useResourceManagement'
import { CONFIG_RESSOURCES } from '../../utils/constants'
import { Camera, Loader2, RefreshCw } from 'lucide-react'

// Import des nouvelles vues Pro
import FicheHero from '../../components/ficheview/FicheHero'
import FicheClassique from '../../components/ficheview/FicheClassique'

export default function MonPersonnage() {
  const pnjControle = useStore(s => s.pnjControle)
  const setPnjControle = useStore(s => s.setPnjControle)
  const characterSheetMode = useStore(s => s.characterSheetMode)
  
  const { personnage, rechargerPersonnage, mettreAJourLocalement, mettreAJourRessourceHybride, chargement } = usePersonnage()
  const { stats } = useStats()
  const { deltas, updateDelta, adjustDelta, appliquerDelta } = useResourceManagement(personnage, mettreAJourLocalement, mettreAJourRessourceHybride)
  
  const [pseudoJoueur, setPseudoJoueur] = useState<string | null>(null)
  const [showImageModal, setShowImageModal] = useState(false)
  const [vh, setVh] = useState(window.innerHeight)

  useEffect(() => {
    const handleResize = () => setVh(window.innerHeight)
    window.addEventListener('resize', handleResize)
    
    // Récupération du pseudo via Supabase (Autorisé car c'est une info de Compte)
    if (personnage?.lie_au_compte) {
      supabase.from('comptes')
        .select('pseudo')
        .eq('id', personnage.lie_au_compte)
        .maybeSingle()
        .then(({ data }) => { if (data) setPseudoJoueur(data.pseudo) })
    }
    
    return () => window.removeEventListener('resize', handleResize)
  }, [personnage?.lie_au_compte])

  // ÉCRAN DE CHARGEMENT / SÉCURITÉ (Évite la page blanche filigrane)
  if (!personnage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 text-center px-6">
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="text-theme-main opacity-20"
        >
          <Loader2 size={64} />
        </motion.div>
        <div className="flex flex-col gap-2">
          <h2 className="font-cinzel text-xl text-theme-main uppercase tracking-widest animate-pulse">Inspiration de l'âme...</h2>
          <p className="font-garamond italic opacity-40 text-sm max-w-xs">
            Le Codex tente de se lier à votre essence. Si cela prend trop de temps, tentez une résonance manuelle.
          </p>
        </div>
        <button 
          onClick={() => rechargerPersonnage()}
          className="mt-4 flex items-center gap-2 px-6 py-3 border border-theme-main/30 font-cinzel text-[10px] uppercase tracking-[0.2em] hover:bg-theme-main/10 transition-all group"
        >
          <RefreshCw size={14} className="group-active:rotate-180 transition-transform" />
          Résonance Manuelle
        </button>
      </div>
    )
  }

  // Calcul des ressources avec valeurs de secours pour éviter NaN
  const ressources = (Object.keys(CONFIG_RESSOURCES) as RessourceKey[]).map(key => ({        
    ...CONFIG_RESSOURCES[key],
    actuel: (personnage[key as keyof typeof personnage] as number) ?? 0,
    max: (personnage[`${key}_max` as keyof typeof personnage] as number) ?? 10,
    rKey: key
  }))

  const handleSupprimer = async () => {
    const success = await personnageService.deletePersonnage(personnage.id)
    if (success) {
      if (pnjControle) setPnjControle(null)
      rechargerPersonnage()
    }
  }

  const commonProps = {
    personnage,
    ressources,
    stats,
    deltas,
    updateDelta,
    adjustDelta,
    appliquerDelta,
    handleSupprimer,
    onEditImage: () => setShowImageModal(true),
    pseudoJoueur,
    vh
  }

  return (
    <div className={`relative w-full ${characterSheetMode === 'hero' ? 'h-[calc(100vh-5rem)] overflow-hidden' : ''}`}>
      
      <AnimatePresence>
        {showImageModal && (
          <ImageEditModal 
            currentUrl={personnage.image_url} 
            onClose={() => setShowImageModal(false)} 
            onSave={async (url: string) => await mettreAJourLocalement({ image_url: url || null })} 
          />
        )}
      </AnimatePresence>

      {characterSheetMode === 'hero' ? (
        <FicheHero {...commonProps} />
      ) : (
        <FicheClassique {...commonProps} />
      )}
    </div>
  )
}

function ImageEditModal({ currentUrl, onClose, onSave }: any) {
    const [url, setUrl] = useState(currentUrl || '')
    return (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl" onClick={onClose}>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-card border border-theme-main/30 p-10 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-theme-main/10 rounded-sm text-theme-main"><Camera size={24} /></div>
            <h3 className="font-cinzel font-black text-xl text-primary uppercase tracking-[0.2em]">Reflet du Héros</h3>
          </div>
          <input 
            type="text" 
            autoFocus
            value={url} 
            onChange={e => setUrl(e.target.value)} 
            placeholder="Lien de l'image (https://...)" 
            className="w-full bg-black/40 border border-white/10 p-5 text-primary focus:border-theme-main outline-none font-mono text-sm mb-8 rounded-sm" 
          />
          <div className="flex gap-4">
              <button onClick={onClose} className="flex-1 py-4 border border-white/10 font-cinzel text-xs uppercase tracking-widest hover:bg-white/5 transition-colors">Annuler</button>
              <button onClick={() => { onSave(url); onClose(); }} className="flex-1 py-4 bg-theme-main text-white font-cinzel text-xs uppercase tracking-widest shadow-lg shadow-theme-main/20 hover:bg-theme-main/80 transition-all">Sceller</button>
          </div>
        </motion.div>
      </div>
    )
}
