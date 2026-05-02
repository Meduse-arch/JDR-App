import { useState, useEffect, useCallback, useRef } from 'react'
import { useStore, type Personnage } from '../store/useStore'
import { personnageService } from '../services/personnageService'
import { useRealtimeQuery } from './useRealtimeQuery'
import { peerService } from '../services/peerService'

export function usePersonnage() {
  const compte = useStore(s => s.compte)
  const pnjControle = useStore(s => s.pnjControle)
  const personnageJoueur = useStore(s => s.personnageJoueur)
  const sessionActive = useStore(s => s.sessionActive)
  
  const [personnage, setPersonnage] = useState<Personnage | null>(null)
  const [chargement, setChargement] = useState(true)
  const lastUpdateRef = useRef<number>(0)

  const chargerPersonnage = useCallback(async (isRealtime = false) => {
    const state = useStore.getState();
    const currentCompte = state.compte;
    const currentPnj = state.pnjControle;
    const currentPj = state.personnageJoueur;
    const currentSession = state.sessionActive;

    if (!currentSession) {
      setPersonnage(null)
      setChargement(false)
      return
    }

    // --- LOGIQUE JOUEUR (WebRTC) ---
    if (!peerService.isHost) {
      const currentPerso = currentPnj || currentPj;
      
      if (currentPerso) {
        // Lénience session pour le mode P2P
        const isCorrectSession = currentSession.id === 'remote-session' || 
                                 currentPerso.id_session === currentSession.id;

        if (isCorrectSession) {
          setPersonnage(currentPerso);
          if (!isRealtime) {
            console.log("[usePersonnage] Demande de resync au MJ...");
            peerService.requestResync(currentPerso.id);
          }
        } else {
          setPersonnage(null);
        }
      } else {
        setPersonnage(null);
      }
      setChargement(false);
      return;
    }

    // --- LOGIQUE MJ (SQLite) ---
    if (isRealtime && Date.now() - lastUpdateRef.current < 2000) return
    if (!isRealtime) setChargement(true)

    try {
      const db = (window as any).db;
      let targetId: string | null = null;

      if (currentPnj && currentPnj.id_session === currentSession.id) {
        targetId = currentPnj.id;
      } else if (currentPj && currentPj.id_session === currentSession.id) {
        targetId = currentPj.id;
      } else if (currentCompte) {
        const res = await db.personnages.getAll();
        if (res.success) {
          const pj = res.data.find((p: any) => 
            p.id_session === currentSession.id && 
            p.lie_au_compte === currentCompte.id && 
            p.type === 'Joueur' && 
            p.is_template === 0
          );
          if (pj) targetId = pj.id;
        }
      }

      if (targetId) {
        const resP = await db.personnages.getById(targetId);
        if (resP.success && resP.data) {
          const fullPerso = isRealtime 
            ? (await personnageService.hydraterPersonnages([resP.data]))[0]
            : await personnageService.recalculerStats(targetId);
            
          if (fullPerso) {
            setPersonnage(fullPerso as Personnage);
            // Sync store global
            if (currentPj && currentPj.id === fullPerso.id) state.setPersonnageJoueur(fullPerso as Personnage);
            if (currentPnj && currentPnj.id === fullPerso.id) state.setPnjControle(fullPerso as Personnage);
          }
        }
      } else {
        setPersonnage(null);
      }
    } catch (error) {
      console.error("[usePersonnage] Erreur MJ:", error)
      setPersonnage(null)
    } finally {
      if (!isRealtime) setChargement(false)
    }
  }, [])

  const compteId = compte?.id;
  const pnjControleId = pnjControle?.id;
  const personnageJoueurId = personnageJoueur?.id;
  const sessionId = sessionActive?.id;

  useEffect(() => {
    chargerPersonnage()
  }, [chargerPersonnage, compteId, pnjControleId, personnageJoueurId, sessionId])

  useEffect(() => {
    const unsubscribe = peerService.onStateUpdate((msg) => {
      const state = useStore.getState();
      const currentId = state.pnjControle?.id || state.personnageJoueur?.id;

      if (msg.entity === 'personnage') {
        const payload = msg.payload;
        if (payload.id_personnage === currentId) {
          if (payload.type === 'full') {
            const updated = payload.valeur;
            console.log("[usePersonnage] Mise à jour complète reçue:", updated.nom);
            
            setPersonnage(updated);
            if (state.personnageJoueur && state.personnageJoueur.id === updated.id) state.setPersonnageJoueur(updated);
            if (state.pnjControle && state.pnjControle.id === updated.id) state.setPnjControle(updated);
          } else if (payload.type) {
             setPersonnage(prev => {
               if (!prev) return prev;
               const next = { ...prev, [payload.type]: payload.valeur };
               if (state.personnageJoueur && state.personnageJoueur.id === next.id) state.setPersonnageJoueur(next);
               if (state.pnjControle && state.pnjControle.id === next.id) state.setPnjControle(next);
               return next;
             });
          }
        }
      }

      // Si la bibliothèque d'items ou de compétences change, le personnage doit recalculer ses stats
      if (msg.entity === 'session' && (msg.payload.type === 'library_update' || msg.payload.type === 'library_update_competences')) {
        if (currentId) {
          console.log("[usePersonnage] Bibliothèque modifiée, demande de resync pour le personnage...");
          if (peerService.isHost) {
            chargerPersonnage(true);
          } else {
            peerService.requestResync(currentId);
          }
        }
      }
    });

    return () => unsubscribe();
  }, [chargerPersonnage]);

  useRealtimeQuery({
    tables: [{ table: 'personnages', filtered: false }, { table: 'personnage_stats', filtered: false }],
    sessionId: sessionActive?.id,
    onReload: () => chargerPersonnage(true),
    enabled: !!sessionActive && peerService.isHost
  })

  const mettreAJourLocalement = async (updates: Partial<Personnage>) => {
    if (!personnage) return
    lastUpdateRef.current = Date.now()
    const optimisticPerso = { ...personnage, ...updates }
    setPersonnage(optimisticPerso)

    try {
      const dbUpdates = { ...updates } as any;
      delete dbUpdates.hp_max; delete dbUpdates.mana_max; delete dbUpdates.stam_max; delete dbUpdates.stats;

      if (Object.keys(dbUpdates).length > 0) {
        if (peerService.isHost) {
          await personnageService.updatePersonnage(personnage.id, dbUpdates)
        } else {
          for (const [key, value] of Object.entries(dbUpdates)) {
            peerService.sendToMJ({
              type: 'ACTION',
              kind: 'update_resource',
              payload: { id_personnage: personnage.id, type: key, valeur: value }
            });
          }
        }
      }
      
      if (peerService.isHost) {
        const updated = await personnageService.recalculerStats(personnage.id);
        if (updated) {
          setPersonnage(updated as Personnage);
          const state = useStore.getState();
          if (state.pnjControle && state.pnjControle.id === updated.id) state.setPnjControle(updated as Personnage);
          if (state.personnageJoueur && state.personnageJoueur.id === updated.id) state.setPersonnageJoueur(updated as Personnage);
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  const mettreAJourRessourceHybride = (type: 'hp' | 'mana' | 'stam', valeur: number, max: number) => {
    if (!personnage || !sessionActive) return;
    lastUpdateRef.current = Date.now();
    setPersonnage(prev => prev ? { ...prev, [type]: valeur } : prev);
    
    if (peerService.isHost) {
      if (type === 'hp') personnageService.updatePVHybride(sessionActive.id, personnage.id, valeur, max);
      else if (type === 'mana') personnageService.updateManaHybride(sessionActive.id, personnage.id, valeur, max);
      else if (type === 'stam') personnageService.updateStaminaHybride(sessionActive.id, personnage.id, valeur, max);
    } else {
      peerService.sendToMJ({
        type: 'ACTION',
        kind: 'update_resource',
        payload: { id_personnage: personnage.id, type, valeur }
      });
    }
  }

  return { personnage, chargement, rechargerPersonnage: chargerPersonnage, mettreAJourLocalement, mettreAJourRessourceHybride }
}
