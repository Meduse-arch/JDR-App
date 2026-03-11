import { useState, useEffect, useCallback } from 'react';
import { itemsService } from '../services/itemsService';
import { Item, Stat } from '../types';
import { useStore } from '../store/useStore';
import { supabase } from '../supabase';

export function useItems() {
  const sessionActive = useStore(s => s.sessionActive);
  const [items, setItems] = useState<Item[]>([]);
  const [stats, setStats] = useState<Stat[]>([]);
  const [chargement, setChargement] = useState(false);

  const charger = useCallback(async () => {
    if (!sessionActive) return;
    setChargement(true);
    
    const [itemsData, statsData] = await Promise.all([
      itemsService.getItems(sessionActive.id),
      itemsService.getStats()
    ]);

    setItems(itemsData);
    setStats(statsData);
    setChargement(false);
  }, [sessionActive]);

  useEffect(() => {
    charger();
    
    // Synchro Realtime
    const channel = supabase
      .channel('items-lib-' + sessionActive?.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => charger())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'item_modificateurs' }, () => charger())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [charger, sessionActive?.id]);

  const supprimerItem = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id)) // Optimistic update
    const success = await itemsService.deleteItem(id)
    if (!success) charger() // Rollback
    return success
  }

  return { items, stats, chargement, charger, supprimerItem };
}
