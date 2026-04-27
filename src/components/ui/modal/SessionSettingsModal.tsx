import { useState, useEffect } from 'react'
import { ModalContainer } from './ModalContainer'
import { useStore } from '../../../store/useStore'
import { Button } from '../Button'
import { Settings, Users, Dice5, Coins } from 'lucide-react'

interface SessionSettingsModalProps {
  onClose: () => void
}

export function SessionSettingsModal({ onClose }: SessionSettingsModalProps) {
  const { sessionActive, setSessionActive } = useStore()
  const [loading, setLoading] = useState(false)
  
  // Paramètres locaux pour l'édition
  const [params, setParams] = useState<any>({
    methodeCreation: 'des', // 'des' ou 'points'
    maxRerolls: 3,
    pointsDeDepart: 100
  })

  useEffect(() => {
    if (sessionActive?.parametres) {
      setParams((prev: any) => ({
        ...prev,
        ...sessionActive.parametres
      }))
    }
  }, [sessionActive])

  const handleSave = () => {
    if (!sessionActive) return
    setLoading(true)
    
    try {
      // Sauvegarde en local (seul le MJ a besoin de sauvegarder ça localement de manière persistante)
      localStorage.setItem(`sigil-settings-${sessionActive.id}`, JSON.stringify(params))
      
      // Mettre à jour le store en local
      setSessionActive({
        ...sessionActive,
        parametres: params
      })

      // Diffuser les nouveaux paramètres à tous les joueurs connectés
      import('../../../services/broadcastService').then(({ broadcastService }) => {
        broadcastService.send(sessionActive.id, 'settings-update', params)
      })

      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const updateParam = (key: string, value: any) => {
    setParams((prev: any) => ({
      ...prev,
      [key]: value
    }))
  }

  return (
    <ModalContainer onClose={onClose} className="max-w-xl min-h-[400px]">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="text-theme-main" size={24} />
        <h2 className="text-xl font-cinzel font-bold text-primary tracking-widest uppercase">
          Paramètres de Session
        </h2>
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-cinzel text-theme-main border-b border-theme-main/20 pb-2 mb-4 flex items-center gap-2">
          <Users size={18} /> Création de Personnage
        </h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <label className={`flex flex-col cursor-pointer p-4 rounded border transition-all ${params.methodeCreation === 'des' ? 'bg-theme-main/10 border-theme-main' : 'bg-black/20 border-theme/10 hover:border-theme/30'}`}>
              <div className="flex items-center gap-3 mb-2">
                <input
                  type="radio"
                  name="methodeCreation"
                  value="des"
                  checked={params.methodeCreation === 'des'}
                  onChange={(e) => updateParam('methodeCreation', e.target.value)}
                  className="w-4 h-4 accent-theme-main"
                />
                <Dice5 size={18} className={params.methodeCreation === 'des' ? 'text-theme-main' : 'text-primary/60'} />
                <span className="font-garamond font-bold text-primary">Jets de dés</span>
              </div>
              <div className="text-xs text-primary/60 pl-7">Les joueurs lancent des dés pour déterminer leurs statistiques.</div>
            </label>

            <label className={`flex flex-col cursor-pointer p-4 rounded border transition-all ${params.methodeCreation === 'points' ? 'bg-theme-main/10 border-theme-main' : 'bg-black/20 border-theme/10 hover:border-theme/30'}`}>
              <div className="flex items-center gap-3 mb-2">
                <input
                  type="radio"
                  name="methodeCreation"
                  value="points"
                  checked={params.methodeCreation === 'points'}
                  onChange={(e) => updateParam('methodeCreation', e.target.value)}
                  className="w-4 h-4 accent-theme-main"
                />
                <Coins size={18} className={params.methodeCreation === 'points' ? 'text-theme-main' : 'text-primary/60'} />
                <span className="font-garamond font-bold text-primary">Allocation de points</span>
              </div>
              <div className="text-xs text-primary/60 pl-7">Les joueurs répartissent un nombre de points défini.</div>
            </label>
          </div>

          <div className="mt-6">
            {params.methodeCreation === 'des' && (
              <div className="p-4 bg-black/20 rounded border border-theme/10 flex items-center justify-between animate-in fade-in">
                <div>
                  <div className="font-garamond font-bold text-primary">Relances de dés de stats</div>
                  <div className="text-xs text-primary/60">Nombre de fois qu'un joueur peut relancer ses propres dés de stats</div>
                </div>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={params.maxRerolls}
                  onChange={(e) => updateParam('maxRerolls', parseInt(e.target.value) || 0)}
                  className="w-20 bg-surface/50 border border-theme/30 rounded px-2 py-1 text-primary focus:border-theme-main outline-none text-center font-garamond"
                />
              </div>
            )}

            {params.methodeCreation === 'points' && (
              <div className="p-4 bg-black/20 rounded border border-theme/10 flex items-center justify-between animate-in fade-in">
                <div>
                  <div className="font-garamond font-bold text-primary">Points de départ</div>
                  <div className="text-xs text-primary/60">Total de points à répartir pour la création</div>
                </div>
                <input
                  type="number"
                  min="0"
                  value={params.pointsDeDepart}
                  onChange={(e) => updateParam('pointsDeDepart', parseInt(e.target.value) || 0)}
                  className="w-20 bg-surface/50 border border-theme/30 rounded px-2 py-1 text-primary focus:border-theme-main outline-none text-center font-garamond"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-theme-main/20">
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          Annuler
        </Button>
        <Button onClick={handleSave} disabled={loading} className="gap-2">
          {loading ? 'Sauvegarde...' : 'Sauvegarder'}
        </Button>
      </div>
    </ModalContainer>
  )
}
