import { useState, useEffect, useCallback } from 'react';
import { itemsService } from '../services/itemsService';
import { Item, Modificateur, Stat } from '../types';
import { useStore } from '../Store/useStore';

export function useItems() {
  const sessionActive = useStore(s => s.sessionActive);
  const [items, setItems] = useState<Item[]>([]);
  const [stats, setStats] = useState<Stat[]>([]);
  const [itemModifs, setItemModifs] = useState<Record<string, Modificateur[]>>({});
  const [chargement, setChargement] = useState(false);

  const chargerItems = useCallback(async () => {
    if (!sessionActive) return;
    setChargement(true);
    
    const [itemsData, statsData] = await Promise.all([
      itemsService.getItems(sessionActive.id),
      itemsService.getStats()
    ]);

    setItems(itemsData);
    setStats(statsData);

    const modifsMap: Record<string, Modificateur[]> = {};
    itemsData.forEach((item: any) => {
      // Détection universelle : on cherche item_modificateurs ou item_modificateur
      const rawModifs = item.item_modificateurs || item.item_modificateur;
      if (Array.isArray(rawModifs)) {
        modifsMap[item.id] = rawModifs;
      } else if (rawModifs) {
        modifsMap[item.id] = [rawModifs];
      } else {
        modifsMap[item.id] = [];
      }
    });

    setItemModifs(modifsMap);
    setChargement(false);
  }, [sessionActive]);

  useEffect(() => {
    chargerItems();
  }, [chargerItems]);

  const supprimerItem = async (id: string) => {
    const success = await itemsService.deleteItem(id);
    if (success) {
      setItems(prev => prev.filter(i => i.id !== id));
      const newModifs = { ...itemModifs };
      delete newModifs[id];
      setItemModifs(newModifs);
    }
    return success;
  };

  const creerItem = async (
    idCompte: string | undefined,
    itemData: { nom: string; description: string; categorie: any },
    modificateurs: Partial<Modificateur>[]
  ) => {
    if (!sessionActive) return null;
    const newItem = await itemsService.createItem(sessionActive.id, idCompte, itemData, modificateurs);
    if (newItem) {
      await chargerItems();
    }
    return newItem;
  };

  return {
    items,
    stats,
    itemModifs,
    chargement,
    chargerItems,
    supprimerItem,
    creerItem
  };
}
