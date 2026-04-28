import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { usePersonnage } from '../../hooks/usePersonnage'
import { useStats } from '../../hooks/useStats'
import { personnageService } from '../../services/personnageService'
import { useResourceManagement, type RessourceKey } from '../../hooks/useResourceManagement'
import { CONFIG_RESSOURCES } from '../../utils/constants'
import { Camera } from 'lucide-react'

// Import des nouvelles vues Pro
import FicheHero from '../../components/ficheview/FicheHero'
import FicheClassique from '../../components/ficheview/FicheClassique'

export default function MonPersonnage() {
  const pnjControle = useStore(s => s.pnjControle)
  const setPnjControle = useStore(s => s.setPnjControle)
  const characterSheetMode = useStore(s => s.characterSheetMode)
  
  const { personnage, rechargerPersonnage, mettreAJourLocalement, mettreAJourRessourceHybride } = usePersonnage()
  const { stats } = useStats()
  const { deltas, updateDelta, adjustDelta, appliquerDelta } = useResourceManagement(personnage, mettreAJourLocalement, mettreAJourRessourceHybride)
  
  const [pseudoJoueur, setPseudoJoueur] = useState<string | null>(null)
  const [showImageModal, setShowImageModal] = useState(false)
  const [vh, setVh] = useState(window.innerHeight)

  useEffect(() => {
    const handleResize = () => setVh(window.innerHeight)
    window.addEventListener('resize', handleResize)
    
    // Pour le pseudo du joueur, on essaie de le trouver via les comptes de la session ou une lib
    // Mais on évite de bloquer/crash si pas dispo en local
    if (personnage?.lie_au_compte) {
      if (peerService.isHost) {
        const db = (window as any).db;
        db.comptes.getById(personnage.lie_au_compte).then((res: any) => { if (res.success && res.data) setPseudoJoueur(res.data.pseudo) })
      } else {
        // Côté joueur, on pourrait l'avoir dans un futur message d'identité globale
        // Pour l'instant on laisse vide ou on met le pseudo du compte si c'est le nôtre
        const compte = useStore.getState().compte;
        if (compte && compte.id === personnage.lie_au_compte) {
          setPseudoJoueur(compte.pseudo);
        }
      }
    }
    return () => window.removeEventListener('resize', handleResize)
  }, [personnage?.lie_au_compte])

  if (!personnage) return null

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