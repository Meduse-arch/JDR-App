import { useState, useEffect, useCallback, useRef } from 'react';
import { itemsService } from '../services/itemsService';
import { Item, Stat } from '../types';
import { useStore } from '../store/useStore';
import { useRealtimeQuery } from './useRealtimeQuery';

export function useItems() {
  const sessionActive = useStore(s => s.sessionActive);
  const [items, setItems] = useState<Item[]>([]);
  const [stats, setStats] = useState<Stat[]>([]);
  const [chargement, setChargement] = useState(false);
  const lastUpdateRef = useRef<number>(0);

  const charger = useCallback(async (isRealtime = false) => {
    if (!sessionActive) return;
    if (isRealtime && Date.now() - lastUpdateRef.current < 1000) return;
    
    if (!isRealtime) setChargement(true);
    
    const [itemsData, statsData] = await Promise.all([
      itemsService.getItems(sessionActive.id),
      itemsService.getStats()
    ]);

    setItems(itemsData);
    setStats(statsData);
    if (!isRealtime) setChargement(false);
  }, [sessionActive]);

  useEffect(() => {
    charger();
  }, [charger]);

  useRealtimeQuery({
    tables: [
      { table: 'items', filtered: false },
      { table: 'modificateurs', filtered: false },
      { table: 'effets_actifs', filtered: false },
    ],
    sessionId: sessionActive?.id,
    onReload: () => charger(true),
    enabled: !!sessionActive
  });

  const supprimerItem = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id)) // Optimistic update
    const success = await itemsService.deleteItem(id)
    if (!success) charger() // Rollback
    return success
  }

  const modifierItem = async (id: string, data: any, modifs: any[], effets: any[]) => {
    const success = await itemsService.updateItem(id, data, modifs, effets)
    if (success) await charger()
    return success
  }

  return { items, stats, chargement, charger, supprimerItem, modifierItem };
}
