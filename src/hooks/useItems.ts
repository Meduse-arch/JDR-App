import { useState, useEffect, useCallback } from 'react';
import { itemsService } from '../services/itemsService';
import { Item, Modificateur, Stat } from '../types';
import { useStore } from '../store/useStore';

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

    // Récupérer les modificateurs pour chaque item
    const modifsPromises = itemsData.map(async (item) => {
      const modifs = await itemsService.getItemModificateurs(item.id);
      return { id: item.id, modifs };
    });

    const allModifs = await Promise.all(modifsPromises);
    const modifsMap: Record<string, Modificateur[]> = {};
    allModifs.forEach(({ id, modifs }) => {
      modifsMap[id] = modifs;
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
    modificateurs: Modificateur[]
  ) => {
    if (!sessionActive) return null;
    const newItem = await itemsService.createItem(sessionActive.id, idCompte, itemData, modificateurs);
    if (newItem) {
      setItems(prev => [...prev, newItem].sort((a, b) => a.nom.localeCompare(b.nom)));
      setItemModifs(prev => ({ ...prev, [newItem.id]: modificateurs }));
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
