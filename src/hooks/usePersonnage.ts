import { useState, useEffect, useCallback, useRef } from 'react'
import { useStore, type Personnage } from '../store/useStore'
import { personnageService } from '../services/personnageService'
import { useRealtimeQuery } from './useRealtimeQuery'
import { peerService } from '../services/peerService'

export function usePersonnage() {
  const compte = useStore(s => s.compte)
  const pnjControle = useStore(s => s.pnjControle)
  const personnageJoueur = useStore(s => s.personnageJoueur)
  const setPnjControle = useStore(s => s.setPnjControle)
  const setPersonnageJoueur = useStore(s => s.setPersonnageJoueur)
  const sessionActive = useStore(s => s.sessionActive)
  
  const [personnage, setPersonnage] = useState<Personnage | null>(null)
  const [chargement, setChargement] = useState(true)
  const lastUpdateRef = useRef<number>(0)

  const chargerPersonnage = useCallback(async (isRealtime = false) => {
    if (!sessionActive) {
      setPersonnage(null)
      setChargement(false)
      return
    }

    // --- LOGIQUE JOUEUR (WebRTC) ---
    if (!peerService.isHost) {
      const currentPerso = pnjControle || personnageJoueur;
      
      if (currentPerso) {
        // Lénience session pour le mode P2P
        const isCorrectSession = sessionActive.id === 'remote-session' || 
                                 currentPerso.id_session === sessionActive.id;

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

      if (pnjControle && pnjControle.id_session === sessionActive.id) {
        targetId = pnjControle.id;
      } else if (personnageJoueur && personnageJoueur.id_session === sessionActive.id) {
        targetId = personnageJoueur.id;
      } else if (compte) {
        const res = await db.personnages.getAll();
        if (res.success) {
          const pj = res.data.find((p: any) => 
            p.id_session === sessionActive.id && 
            p.lie_au_compte === compte.id && 
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
            if (personnageJoueur && personnageJoueur.id === fullPerso.id) setPersonnageJoueur(fullPerso as Personnage);
            if (pnjControle && pnjControle.id === fullPerso.id) setPnjControle(fullPerso as Personnage);
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
  }, [compte, pnjControle, personnageJoueur, sessionActive, setPersonnageJoueur, setPnjControle])

  useEffect(() => {
    chargerPersonnage()
  }, [chargerPersonnage])

  useEffect(() => {
    const unsubscribe = peerService.onStateUpdate((msg) => {
      if (msg.entity !== 'personnage') return;
      const payload = msg.payload;
      
      const currentId = pnjControle?.id || personnageJoueur?.id;
      if (payload.id_personnage === currentId) {
        if (payload.type === 'full') {
          const updated = payload.valeur;
          setPersonnage(updated);
          if (personnageJoueur && personnageJoueur.id === updated.id) setPersonnageJoueur(updated);
          if (pnjControle && pnjControle.id === updated.id) setPnjControle(updated);
        } else if (payload.type) {
           setPersonnage(prev => {
             if (!prev) return prev;
             const next = { ...prev, [payload.type]: payload.valeur };
             if (personnageJoueur && personnageJoueur.id === next.id) setPersonnageJoueur(next);
             if (pnjControle && pnjControle.id === next.id) setPnjControle(next);
             return next;
           });
        }
      }
    });

    return () => unsubscribe();
  }, [pnjControle?.id, personnageJoueur?.id, setPersonnageJoueur, setPnjControle]);

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
        await personnageService.updatePersonnage(personnage.id, dbUpdates)
      }
      const updated = await personnageService.recalculerStats(personnage.id);
      if (updated) {
        setPersonnage(updated as Personnage);
        if (pnjControle && pnjControle.id === updated.id) setPnjControle(updated as Personnage);
        if (personnageJoueur && personnageJoueur.id === updated.id) setPersonnageJoueur(updated as Personnage);
      }
    } catch (e) {
      console.error(e)
    }
  }

  const mettreAJourRessourceHybride = (type: 'hp' | 'mana' | 'stam', valeur: number, max: number) => {
    if (!personnage || !sessionActive) return;
    lastUpdateRef.current = Date.now();
    setPersonnage(prev => prev ? { ...prev, [type]: valeur } : prev);
    if (type === 'hp') personnageService.updatePVHybride(sessionActive.id, personnage.id, valeur, max);
    else if (type === 'mana') personnageService.updateManaHybride(sessionActive.id, personnage.id, valeur, max);
    else if (type === 'stam') personnageService.updateStaminaHybride(sessionActive.id, personnage.id, valeur, max);
  }

  return { personnage, chargement, rechargerPersonnage: chargerPersonnage, mettreAJourLocalement, mettreAJourRessourceHybride }
}
