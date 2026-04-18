import { supabase } from '../supabase'
import { InventaireEntry } from '../types'

export const inventaireService = {
  /**
   * Récupère l'inventaire complet d'un personnage avec les détails des items
   */
  getInventaire: async (personnageId: string): Promise<InventaireEntry[]> => {
    const { data } = await supabase
      .from('inventaire')
      .select('*, items(*, modificateurs(*, stats:id_stat(nom)), effets_actifs(*), item_tags(id_tag, tags(id, nom)))')
      .eq('id_personnage', personnageId)

    return (data || []).map((entry: any) => ({
      ...entry,
      items: {
        ...entry.items,
        tags: entry.items?.item_tags?.map((it: any) => it.tags) || []
      }
    })) as unknown as InventaireEntry[]
  },

  /**
   * Ajoute ou incrémente un item dans l'inventaire
   */
  ajouterItem: async (personnageId: string, itemId: string, quantite: number = 1) => {
    // On tente de récupérer la ligne existante
    const { data: existing } = await supabase
      .from('inventaire')
      .select('id, quantite')
      .eq('id_personnage', personnageId)
      .eq('id_item', itemId)
      .maybeSingle()

    if (existing) {
      const { error } = await supabase
        .from('inventaire')
        .update({ quantite: existing.quantite + quantite })
        .eq('id', existing.id)
      return !error
    } else {
      const { error } = await supabase
        .from('inventaire')
        .insert({ id_personnage: personnageId, id_item: itemId, quantite })
      return !error
    }
  },

  /**
   * Change l'état d'équipement d'un objet
   */
  toggleEquipement: async (entryId: string, equipe: boolean) => {
    const { error } = await supabase
      .from('inventaire')
      .update({ equipe })
      .eq('id', entryId)
    return !error
  },

  /**
   * Retire une quantité d'un objet (et supprime la ligne si 0)
   */
  retirerItem: async (entryId: string, quantiteARetirer: number = 1) => {
    const { data: current } = await supabase
      .from('inventaire')
      .select('quantite')
      .eq('id', entryId)
      .single()

    if (!current) return false

    const nouvelleQuantite = current.quantite - quantiteARetirer

    if (nouvelleQuantite <= 0) {
      const { error } = await supabase.from('inventaire').delete().eq('id', entryId)
      return !error
    } else {
      const { error } = await supabase.from('inventaire').update({ quantite: nouvelleQuantite }).eq('id', entryId)
      return !error
    }
  }
}
