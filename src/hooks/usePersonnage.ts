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
    if (isRealtime && Date.now() - lastUpdateRef.current < 1000) return

    if (!sessionActive) {
      setPersonnage(null)
      setChargement(false)
      return
    }

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
        const fullPerso = await personnageService.recalculerStats(targetId);
        if (fullPerso) {
          setPersonnage(fullPerso as Personnage);
          // Synchro store si besoin
          if (personnageJoueur && personnageJoueur.id === fullPerso.id) setPersonnageJoueur(fullPerso as Personnage);
          if (pnjControle && pnjControle.id === fullPerso.id) setPnjControle(fullPerso as Personnage);
        }
      } else {
        setPersonnage(null);
      }
    } catch (error) {
      console.error("Erreur lors du chargement du personnage:", error)
      setPersonnage(null)
    } finally {
      if (!isRealtime) setChargement(false)
    }
  }, [compte, pnjControle, personnageJoueur, sessionActive, setPersonnageJoueur, setPnjControle])

  useEffect(() => {
    chargerPersonnage()
  }, [chargerPersonnage])

  useEffect(() => {
    if (!personnage) return;
    
    const unsubscribe = peerService.onStateUpdate((msg) => {
      if (msg.entity !== 'personnage') return;
      const payload = msg.payload;
      if (payload.id_personnage === personnage.id && payload.type) {
        setPersonnage(prev => prev ? { ...prev, [payload.type]: payload.valeur } : prev);
      }
    });

    return () => unsubscribe();
  }, [personnage?.id]);

  useRealtimeQuery({
    tables: [
      { table: 'personnages', filtered: false },
      { table: 'personnage_stats', filtered: false },
    ],
    sessionId: sessionActive?.id,
    onReload: () => chargerPersonnage(true),
    enabled: !!sessionActive
  })

  const mettreAJourLocalement = async (updates: Partial<Personnage>) => {
    if (!personnage) return
    const memoire = { ...personnage }
    lastUpdateRef.current = Date.now()

    const optimisticPerso = { ...personnage, ...updates }
    setPersonnage(optimisticPerso)

    const dbUpdates = { ...updates } as any;
    delete dbUpdates.hp_max;
    delete dbUpdates.mana_max;
    delete dbUpdates.stam_max;
    delete dbUpdates.stats;

    try {
      if (Object.keys(dbUpdates).length > 0) {
        const success = await personnageService.updatePersonnage(personnage.id, dbUpdates)
        if (!success) throw new Error("Erreur mise à jour BDD")
      }

      const updatedPerso = await personnageService.recalculerStats(personnage.id);
      if (updatedPerso) {
        const up = updatedPerso as Personnage
        setPersonnage(up)
        if (pnjControle && pnjControle.id === up.id) setPnjControle(up)
        if (personnageJoueur && personnageJoueur.id === up.id) setPersonnageJoueur(up)
      }
    } catch (e) {
      console.error(e)
      setPersonnage(memoire)
    }
  }

  const mettreAJourRessourceHybride = (type: 'hp' | 'mana' | 'stam', valeur: number, max: number) => {
    if (!personnage || !sessionActive) return;
    
    lastUpdateRef.current = Date.now();
    setPersonnage(prev => prev ? { ...prev, [type]: valeur } : prev);

    if (type === 'hp') {
      personnageService.updatePVHybride(sessionActive.id, personnage.id, valeur, max);
    } else if (type === 'mana') {
      personnageService.updateManaHybride(sessionActive.id, personnage.id, valeur, max);
    } else if (type === 'stam') {
      personnageService.updateStaminaHybride(sessionActive.id, personnage.id, valeur, max);
    }
  }

  return { 
    personnage, 
    chargement, 
    rechargerPersonnage: chargerPersonnage,
    mettreAJourLocalement,
    mettreAJourRessourceHybride
  }
}
