import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../supabase'
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
    // Si une mise à jour locale vient d'avoir lieu, on ignore le rechargement temps réel pendant 1s
    if (isRealtime && Date.now() - lastUpdateRef.current < 1000) return

    if (!sessionActive) {
      setPersonnage(null)
      setChargement(false)
      return
    }

    if (!isRealtime) setChargement(true)
    try {
      // 1. Priorité MJ : Si un PNJ est contrôlé, on l'affiche
      if (pnjControle && pnjControle.id_session === sessionActive.id) {
        const { data } = await supabase
          .from('v_personnages')
          .select('*')
          .eq('id', pnjControle.id)
          .single()
          
        if (data) {
          setPersonnage(data as Personnage)
          if (!isRealtime) setChargement(false)
          return
        }
      } 
      
      // 2. Priorité Joueur : Si un personnage joueur est sélectionné pour cette session
      if (personnageJoueur && personnageJoueur.id_session === sessionActive.id) {
        const { data } = await supabase
          .from('v_personnages')
          .select('*')
          .eq('id', personnageJoueur.id)
          .single()
        
        if (data) {
          setPersonnage(data as Personnage)
          if (!isRealtime) setChargement(false)
          return
        }
      }

      // 3. Fallback : Essayer de trouver un personnage par défaut pour le compte dans cette session
      if (compte) {
        const { data } = await supabase
          .from('v_personnages')
          .select('*')
          .eq('id_session', sessionActive.id)
          .eq('lie_au_compte', compte.id)
          .eq('type', 'Joueur')
          .eq('is_template', false)
          .limit(1)
          
        if (data && data.length > 0) {
          const pj = data[0] as Personnage
          setPersonnage(pj)
          setPersonnageJoueur(pj) // On le définit comme le perso par défaut
        } else {
          setPersonnage(null)
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement du personnage:", error)
      setPersonnage(null)
    } finally {
      if (!isRealtime) setChargement(false)
    }
  }, [compte, pnjControle, personnageJoueur, sessionActive, setPersonnageJoueur])

  useEffect(() => {
    chargerPersonnage()
  }, [chargerPersonnage])

  // Realtime Broadcasts (Ressources)
  // MIGRATION WebRTC
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

  // Realtime
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

    // 1. Optimistic Update
    const optimisticPerso = { ...personnage, ...updates }
    setPersonnage(optimisticPerso)

    // Pour la BDD, on ne veut envoyer que les champs qui existent dans 'personnages'
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

      // On recharge TOUJOURS depuis la vue pour avoir les max à jour et les données consistantes
      const { data: updatedPerso } = await supabase
        .from('v_personnages')
        .select('*')
        .eq('id', personnage.id)
        .single()

      if (updatedPerso) {
        const up = updatedPerso as Personnage
        setPersonnage(up)
        if (pnjControle && pnjControle.id === up.id) setPnjControle(up)
        if (personnageJoueur && personnageJoueur.id === up.id) setPersonnageJoueur(up)
      }
    } catch (e) {
      console.error(e)
      setPersonnage(memoire) // Rollback
    }
  }

  const mettreAJourRessourceHybride = (type: 'hp' | 'mana' | 'stam', valeur: number, max: number) => {
    if (!personnage || !sessionActive) return;
    
    lastUpdateRef.current = Date.now();
    
    // 1. Optimistic update local
    setPersonnage(prev => prev ? { ...prev, [type]: valeur } : prev);

    // 2. Appel au service hybride (Broadcast + DB Debouncée)
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
