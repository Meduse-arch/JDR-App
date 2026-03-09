import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useStore } from '../store/useStore' // Vérifie bien le chemin (Store ou store selon ta casse)

export type StatCalculee = {
  nom: string;
  valeur: number;
}

export function useStats() {
  const compte = useStore(s => s.compte)
  const pnjControle = useStore(s => s.pnjControle)
  
  const [stats, setStats] = useState<StatCalculee[]>([])
  const [chargement, setChargement] = useState(true)

  const chargerStats = async () => {
    setChargement(true)
    
    try {
      let idPersonnage = pnjControle?.id

      // 1. Identifier le personnage actif
      if (!idPersonnage) {
        if (!compte) {
          setChargement(false)
          return
        }
        const { data: personnage } = await supabase
          .from('personnages')
          .select('id')
          .eq('lie_au_compte', compte.id)
          .eq('est_pnj', false)
          .single()
        
        if (!personnage) {
          setChargement(false)
          return
        }
        idPersonnage = personnage.id
      }

      // 2. Charger ses stats de base
      const { data: baseStats } = await supabase
        .from('personnage_stats')
        .select('id_stat, valeur, stats(nom)')
        .eq('id_personnage', idPersonnage)

      if (!baseStats) {
        setChargement(false)
        return
      }

      // 3. Charger ses items équipés
      const { data: equipements } = await supabase
        .from('inventaire')
        .select('id_item')
        .eq('id_personnage', idPersonnage)
        .eq('equipe', true)

      const statBonus: Record<string, number> = {}

      if (equipements && equipements.length > 0) {
        const itemIds = equipements.map(e => e.id_item)
        
        // 4. Charger les modificateurs de type "stat" de ces items
        const { data: modifs } = await supabase
          .from('item_modificateurs')
          .select('*')
          .in('id_item', itemIds)
          .eq('type', 'stat')

        if (modifs) {
          modifs.forEach(mod => {
            if (mod.id_stat) {
              statBonus[mod.id_stat] = (statBonus[mod.id_stat] || 0) + mod.valeur
            }
          })
        }
      }

      // 5. Additionner la Base + L'Équipement
      const statsFinales = baseStats.map((d: any) => ({
        nom: d.stats.nom,
        valeur: d.valeur + (statBonus[d.id_stat] || 0)
      }))

      setStats(statsFinales)
    } catch (error) {
      console.error("Erreur lors du calcul des stats:", error)
    } finally {
      setChargement(false)
    }
  }

  // Se déclenche tout seul au chargement ou si on change de personnage
  useEffect(() => {
    chargerStats()
  }, [pnjControle, compte])

  // On renvoie les données + une fonction pour forcer le rechargement si on équipe un item
  return { stats, chargement, rechargerStats: chargerStats }
}