import { useState, useEffect } from 'react'
import { ModalContainer } from './ModalContainer'
import { useStore } from '../../../store/useStore'
import { supabase } from '../../../supabase'
import { Button } from '../Button'
import { Share2, User } from 'lucide-react'

interface DiceSharingModalProps {
  onClose: () => void
}

type EntitePartage = {
  id: string; // ID du compte
  pseudo: string;
  labelSecondaire: string; // Nom du perso ou "Admin / MJ"
}

export function DiceSharingModal({ onClose }: DiceSharingModalProps) {
  const { sessionActive, setSessionActive } = useStore()
  const [loading, setLoading] = useState(false)
  const [entites, setEntites] = useState<EntitePartage[]>([])
  
  // partagesDes: Record<string, string[]> (clé = id du compte lanceur, valeur = ids des comptes qui peuvent voir)
  const [partagesDes, setPartagesDes] = useState<Record<string, string[]>>({})

  useEffect(() => {
    if (sessionActive?.parametres?.partagesDes) {
      setPartagesDes(sessionActive.parametres.partagesDes)
    }

    const loadEntites = async () => {
      if (!sessionActive) return;
      
      const entitesMap = new Map<string, EntitePartage>();

      // 1. Ajouter le compte actuel (pour être sûr qu'il est là)
      const state = useStore.getState();
      if (state.compte) {
        entitesMap.set(state.compte.id, {
          id: state.compte.id,
          pseudo: state.compte.pseudo,
          labelSecondaire: (state.roleEffectif === 'admin' || state.roleEffectif === 'mj') ? 'Admin / MJ' : (state.personnageJoueur?.nom || 'Joueur')
        });
      }

      // 2. Récupérer les MJ de la session
      const { data: mjs } = await supabase
        .from('session_mj')
        .select('comptes(id, pseudo)')
        .eq('id_session', sessionActive.id);

      if (mjs) {
        mjs.forEach((m: any) => {
          if (m.comptes) {
            entitesMap.set(m.comptes.id, {
              id: m.comptes.id,
              pseudo: m.comptes.pseudo,
              labelSecondaire: 'Admin / MJ'
            });
          }
        });
      }

      // 3. Récupérer les personnages liés à un compte
      const { data: persos } = await supabase
        .from('personnages')
        .select('nom, lie_au_compte, comptes(id, pseudo)')
        .eq('id_session', sessionActive.id)
        .eq('type', 'Joueur')
        .not('lie_au_compte', 'is', null);

      if (persos) {
        persos.forEach((p: any) => {
          if (p.comptes) {
            // Si le compte est déjà là en tant que MJ, on peut garder "Admin / MJ"
            // ou on peut ajouter le nom du perso. Gardons le nom du perso si trouvé.
            const existant = entitesMap.get(p.comptes.id);
            if (!existant || existant.labelSecondaire === 'Joueur') {
               entitesMap.set(p.comptes.id, {
                 id: p.comptes.id,
                 pseudo: p.comptes.pseudo,
                 labelSecondaire: p.nom
               });
            }
          }
        });
      }

      // 4. Mettre à jour l'état, trié par pseudo
      setEntites(Array.from(entitesMap.values()).sort((a, b) => a.pseudo.localeCompare(b.pseudo)));
    }
    loadEntites()
  }, [sessionActive])

  const togglePartage = (lanceurId: string, viewerId: string) => {
    setPartagesDes(prev => {
      const current = prev[lanceurId] || []
      const updated = current.includes(viewerId)
        ? current.filter(id => id !== viewerId)
        : [...current, viewerId]
      return { ...prev, [lanceurId]: updated }
    })
  }

  const handleSave = () => {
    if (!sessionActive) return
    setLoading(true)
    
    try {
      const nouveauxParams = {
        ...(sessionActive.parametres || {}),
        partagesDes
      }
      
      // Sauvegarde en local
      localStorage.setItem(`sigil-settings-${sessionActive.id}`, JSON.stringify(nouveauxParams))
      
      // Mettre à jour le store en local
      setSessionActive({
        ...sessionActive,
        parametres: nouveauxParams
      })

      // Diffuser les nouveaux paramètres
      import('../../../services/broadcastService').then(({ broadcastService }) => {
        broadcastService.send(sessionActive.id, 'settings-update', nouveauxParams)
      })

      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModalContainer onClose={onClose} className="max-w-2xl min-h-[400px]">
      <div className="flex items-center gap-3 mb-6">
        <Share2 className="text-theme-main" size={24} />
        <h2 className="text-xl font-cinzel font-bold text-primary tracking-widest uppercase">
          Partages Individuels (Jets Secrets)
        </h2>
      </div>

      <div className="space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
        <p className="text-sm font-garamond italic text-primary/60">
          Sélectionnez pour chaque compte qui a le droit de voir ses jets de dés lorsqu'ils sont secrets.
        </p>

        {entites.map(lanceur => (
          <div key={lanceur.id} className="p-4 bg-black/20 border border-theme/10 rounded">
            <div className="mb-3 flex items-center gap-2 border-b border-theme/10 pb-2">
              <User size={16} className="text-theme-main" />
              <div className="flex flex-col">
                <span className="font-cinzel font-bold text-primary uppercase tracking-widest text-sm">{lanceur.pseudo}</span>
                <span className="text-[10px] text-theme-main/60 font-cinzel tracking-widest">{lanceur.labelSecondaire}</span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-2">
              {entites.filter(e => e.id !== lanceur.id).map(viewer => {
                const estCoche = (partagesDes[lanceur.id] || []).includes(viewer.id)
                return (
                  <button
                    key={viewer.id}
                    onClick={() => togglePartage(lanceur.id, viewer.id)}
                    className={`px-3 py-1.5 rounded flex flex-col items-start transition-all ${
                      estCoche 
                        ? 'bg-theme-main/20 text-theme-main border border-theme-main/50' 
                        : 'bg-black/40 text-primary/40 border border-white/5 hover:border-white/20 hover:text-primary/80'
                    }`}
                  >
                    <span className="text-xs font-cinzel tracking-widest">{viewer.pseudo}</span>
                    <span className="text-[9px] font-cinzel tracking-widest opacity-60">{viewer.labelSecondaire}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
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
