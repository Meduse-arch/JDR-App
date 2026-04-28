import { useState, useEffect, useCallback, useRef } from 'react';
import { itemsService } from '../services/itemsService';
import { Item, Stat } from '../types';
import { useStore } from '../store/useStore';
import { useRealtimeQuery } from './useRealtimeQuery';
import { peerService } from '../services/peerService';

export function useItems() {
  const sessionActive = useStore(s => s.sessionActive);
  const libItems = useStore(s => s.libItems);
  const allStats = useStore(s => s.allStats);
  const setLibItems = useStore(s => s.setLibItems);
  const setAllStats = useStore(s => s.setAllStats);
  
  const [items, setItems] = useState<Item[]>(libItems);
  const [stats, setStats] = useState<Stat[]>(allStats);
  const [chargement, setChargement] = useState(false);
  const lastUpdateRef = useRef<number>(0);

  const charger = useCallback(async (isRealtime = false) => {
    // FIX Items affichage UI : Ne pas bloquer si pas host, tant qu'on a une session (pour le MJ local)
    if (!sessionActive) return;
    
    // Si on est joueur (pas MJ), on se contente de lire le store synchronisé par WebRTC
    if (!peerService.isHost && (window as any).db === undefined) {
       setItems(libItems);
       setStats(allStats);
       return;
    }
    
    if (isRealtime && Date.now() - lastUpdateRef.current < 1000) return;
    lastUpdateRef.current = Date.now(); // FIX boucle infinie : mise à jour du timer
    if (!isRealtime) setChargement(true);
    
    try {
      const [itemsData, statsData] = await Promise.all([
        itemsService.getItems(sessionActive.id),
        itemsService.getStats()
      ]);

      setLibItems(itemsData);
      setAllStats(statsData);
      setItems(itemsData);
      setStats(statsData);
      
      // Diffusion aux joueurs
      if (peerService.isHost) {
        peerService.broadcastToAll({
          type: 'STATE_UPDATE',
          entity: 'session',
          payload: { type: 'library_update', items: itemsData, stats: statsData }
        });
      }

    } catch (e) {
      console.error(e);
    } finally {
      if (!isRealtime) setChargement(false);
    }
  // FIX boucle infinie : libItems et allStats RETIRÉS des dépendances
  }, [sessionActive, setLibItems, setAllStats]);

  useEffect(() => {
    charger();
  }, [charger]);

  // Sync locale quand le store change (via WebRTC pour les joueurs)
  useEffect(() => {
    setItems(libItems);
    setStats(allStats);
  }, [libItems, allStats]);

  useRealtimeQuery({
    tables: [
      { table: 'items', filtered: false },
      { table: 'modificateurs', filtered: false },
      { table: 'effets_actifs', filtered: false },
    ],
    sessionId: sessionActive?.id,
    onReload: () => charger(true),
    enabled: !!sessionActive && (peerService.isHost || (window as any).db !== undefined)
  });

  const supprimerItem = async (id: string) => {
    const success = await itemsService.deleteItem(id)
    if (success) charger()
    return success
  }

  const modifierItem = async (id: string, data: any, modifs: any[], effets: any[]) => {
    const success = await itemsService.updateItem(id, data, modifs, effets)
    if (success) await charger()
    return success
  }

  return { items, stats, chargement, charger, supprimerItem, modifierItem };
}
