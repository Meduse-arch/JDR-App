import { useState, useEffect, useCallback, useRef } from 'react'
import { inventaireService } from '../services/inventaireService'
import { InventaireEntry } from '../types'
import { useRealtimeQuery } from './useRealtimeQuery'
import { useStore } from '../store/useStore'
import { logService } from '../services/logService'
import { peerService } from '../services/peerService'

export function useInventaire(personnageId: string | undefined, nomPersonnage?: string) {
  const sessionActive = useStore(s => s.sessionActive)
  const roleEffectif = useStore(s => s.roleEffectif)
  const [inventaire, setInventaire] = useState<InventaireEntry[]>([])
  const [chargement, setChargement] = useState(false)
  const lastUpdateRef = useRef<number>(0)

  const charger = useCallback(async (isRealtime = false) => {
    if (!personnageId) return
    if (isRealtime && Date.now() - lastUpdateRef.current < 1000) return
    
    if (peerService.isHost) {
      if (!isRealtime) setChargement(true)
      const data = await inventaireService.getInventaire(personnageId)
      setInventaire(data)
      if (!isRealtime) setChargement(false)
    } else {
      if (!isRealtime) setChargement(true)
      peerService.requestResync(personnageId, 'inventaire')
    }
  }, [personnageId])

  useEffect(() => {
    charger()
  }, [charger])

  const sessionActiveId = sessionActive?.id;

  // Abonnement WebRTC pour les joueurs
  useEffect(() => {
    if (peerService.isHost || !personnageId) return;

    const unsubResponse = peerService.onResyncResponse((msg) => {
      if (msg.dataType === 'inventaire') {
        setInventaire(msg.payload);
        setChargement(false);
      }
    });

    const unsubUpdate = peerService.onStateUpdate((msg) => {
      if (msg.entity === 'inventaire' || (msg.entity === 'session' && (msg.payload.type === 'character_created' || msg.payload.type === 'library_update'))) {
        charger(true);
      }
    });

    return () => {
      unsubResponse();
      unsubUpdate();
    };
  }, [personnageId, charger]);

  useRealtimeQuery({
    tables: [
      { table: 'inventaire', filtered: false },
      { table: 'items', filtered: false },
    ],
    sessionId: sessionActiveId,
    onReload: () => charger(true),
    enabled: peerService.isHost && !!personnageId
  })

  const equiper = useCallback(async (entryId: string, equipe: boolean) => {
    const memoire = [...inventaire]
    lastUpdateRef.current = Date.now()
    
    // Optimistic
    setInventaire(prev => prev.map(item => 
      item.id === entryId ? { ...item, equipe } : item
    ))

    try {
      const ok = await inventaireService.toggleEquipement(entryId, equipe)
      if (!ok) throw new Error("Erreur BDD")
      if (sessionActive && personnageId && nomPersonnage) {
        const item = inventaire.find(i => i.id === entryId)?.items
        if (item) {
          await logService.logAction({
            id_session: sessionActive.id,
            id_personnage: personnageId,
            nom_personnage: nomPersonnage,
            type: 'inventaire',
            action: equipe ? `Équipe ${item.nom}` : `Déséquipe ${item.nom}`,
            details: { categorie: item.categorie }
          })
        }
      }
    } catch (e) {
      setInventaire(memoire)
      console.error(e)
    }
  }, [inventaire, roleEffectif, sessionActive, personnageId, nomPersonnage])

  const retirer = useCallback(async (entryId: string, quantite: number = 1) => {
    const memoire = [...inventaire]
    lastUpdateRef.current = Date.now()

    // Optimistic
    setInventaire(prev => prev.map(item => {
      if (item.id === entryId) {
        const nv = item.quantite - quantite
        return nv > 0 ? { ...item, quantite: nv } : null
      }
      return item
    }).filter(Boolean) as InventaireEntry[])

    try {
      const ok = await inventaireService.retirerItem(entryId, quantite)
      if (!ok) throw new Error("Erreur BDD")
      if (sessionActive && personnageId && nomPersonnage) {
        const item = inventaire.find(i => i.id === entryId)?.items
        if (item) {
          await logService.logAction({
            id_session: sessionActive.id,
            id_personnage: personnageId,
            nom_personnage: nomPersonnage,
            type: 'inventaire',
            action: `Retire x${quantite} ${item.nom}`
          })
        }
      }
    } catch (e) {
      setInventaire(memoire)
      console.error(e)
    }
  }, [inventaire, roleEffectif, sessionActive, personnageId, nomPersonnage])

  const utiliser = useCallback(async (entryId: string) => {
    // Dans Sigil, utiliser un item consomme souvent 1 unité
    await retirer(entryId, 1)
  }, [retirer])

  return { inventaire, chargement, charger, setInventaire, equiper, retirer, utiliser }
}
