import { supabase } from '../supabase'

export const inventaireService = {
  /**
   * Équipe ou déséquipe un objet
   */
  toggleEquipement: async (idInventaire: string, estEquipe: boolean) => {
    const { error } = await supabase
      .from('inventaire')
      .update({ equipe: estEquipe })
      .eq('id', idInventaire)
    
    if (error) console.error("Erreur d'équipement:", error)
    return !error // Renvoie true si ça a marché
  },

  /**
   * Utilise un objet (réduit sa quantité de 1, ou le supprime si c'est le dernier)
   */
  consommerItem: async (idInventaire: string, quantiteActuelle: number) => {
    if (quantiteActuelle <= 1) {
      const { error } = await supabase.from('inventaire').delete().eq('id', idInventaire)
      return !error
    } else {
      const { error } = await supabase.from('inventaire').update({ quantite: quantiteActuelle - 1 }).eq('id', idInventaire)
      return !error
    }
  },

  /**
   * Jette un objet définitivement
   */
  jeterItem: async (idInventaire: string) => {
    const { error } = await supabase.from('inventaire').delete().eq('id', idInventaire)
    return !error
  },

  /**
   * Ajoute un objet à l'inventaire d'un personnage
   */
  addItem: async (idPersonnage: string, idItem: string, quantite: number) => {
    // On vérifie si l'item est déjà présent
    const { data: existing } = await supabase
      .from('inventaire')
      .select('id, quantite')
      .eq('id_personnage', idPersonnage)
      .eq('id_item', idItem)
      .single()

    if (existing) {
      const { error } = await supabase
        .from('inventaire')
        .update({ quantite: existing.quantite + quantite })
        .eq('id', existing.id)
      return !error
    } else {
      const { error } = await supabase
        .from('inventaire')
        .insert({ id_personnage: idPersonnage, id_item: idItem, quantite })
      return !error
    }
  }
}
