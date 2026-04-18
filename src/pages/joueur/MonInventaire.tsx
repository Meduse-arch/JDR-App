import { useState, useMemo } from 'react'
import { usePersonnage } from '../../hooks/usePersonnage'
import { useStats as useGlobalStats } from '../../hooks/useStats'
import { useItems } from '../../hooks/useItems'
import { useInventaire } from '../../hooks/useInventaire'
import { useItemUsage } from '../../hooks/useItemUsage'
import { useItemInventaire } from '../../hooks/useItemInventaire'
import { ItemCard } from '../../components/ui/card'
import { CATEGORIES } from '../../utils/constants'
import { formatLabelModif, formatLabelEffet } from '../../utils/formatters'
import { inventaireService } from '../../services/inventaireService'
import { Backpack, Search } from 'lucide-react'
import { ItemDetailModal } from '../../components/ui/modal'
import { InventaireEntry } from '../../types'

export default function MonInventaire() {
  const { personnage, mettreAJourLocalement, rechargerPersonnage } = usePersonnage()
  const { stats: statsCalculees, rechargerStats } = useGlobalStats()
  const { stats: allStats } = useItems()

  const joueurInv = useInventaire(personnage?.id, personnage?.nom)
  const gerer = useItemInventaire(personnage)  
  const usage = useItemUsage(personnage, mettreAJourLocalement, async (id, q) => {
     await inventaireService.retirerItem(id, q)
     await joueurInv.charger()
     await rechargerPersonnage()
     await rechargerStats()
  }, statsCalculees)

  const [filtreCat, setFiltreCat] = useState('Tous')
  const [recherche, setRecherche] = useState('')
  const [detail, setDetail] = useState<InventaireEntry | null>(null)

  const handleEquiper = async (entry: InventaireEntry) => {
    await gerer.toggleEquipement(entry)
    await joueurInv.charger()
    await rechargerStats()
  }

  const filteredItems = useMemo(() => {
    if (!personnage) return []
    return joueurInv.inventaire.filter(entry => {
      const matchCat = filtreCat === 'Tous' || entry.items.categorie === filtreCat
      const matchSearch = entry.items.nom.toLowerCase().includes(recherche.toLowerCase())
      return matchCat && matchSearch
    })
  }, [joueurInv.inventaire, filtreCat, recherche, personnage])

  return (
    <div className="relative">
      {/* BARRE DE RECHERCHE & FILTRES - LIGNE ÉLÉGANTE */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-8 border-b border-theme/10 pb-6 mt-4 mb-10">
        {/* Catégories en labels fins */}
        <div className="flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-2">
          {['Tous', ...CATEGORIES].map(cat => (
            <button
              key={cat}
              onClick={() => setFiltreCat(cat)}
              className={`font-cinzel text-[11px] uppercase tracking-[0.3em] transition-all duration-500 relative py-1 ${
                filtreCat === cat 
                ? 'text-theme-main opacity-100' 
                : 'text-primary opacity-30 hover:opacity-70'
              }`}
            >
              {cat}
              {filtreCat === cat && (
                <div className="absolute bottom-0 left-0 w-full h-[1px] bg-theme-main shadow-[0_0_8px_var(--color-main)]" />
              )}
            </button>
          ))}
        </div>
        
        {/* Recherche Minimaliste */}
        <div className="relative w-full lg:w-64 group">
          <Search size={16} className="absolute left-0 top-1/2 -translate-y-1/2 text-theme-main opacity-40 group-focus-within:opacity-100 transition-opacity" />
          <input 
            type="text" 
            placeholder="Interroger les archives..." 
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="w-full pl-7 pr-4 py-2 bg-transparent border-b border-theme/10 font-garamond italic text-lg text-primary focus:border-theme-main/50 outline-none transition-all placeholder:opacity-20"
          />
        </div>
      </div>

      {/* GRILLE D'OBJETS - LOOK COFFRE */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40 text-center gap-6">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.05]">
            <Backpack size={300} strokeWidth={0.5} className="text-theme-main" />
          </div>
          <p className="font-cinzel text-xl max-w-md leading-relaxed tracking-[0.2em] opacity-20 italic">
            "Le vide résonne dans votre besace..."
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
          {filteredItems.map(entry => (
            <div key={entry.id} className="hover:shadow-[0_0_30px_rgba(var(--color-main-rgb),0.15)] transition-all duration-500">
              <ItemCard 
                entry={entry} 
                onUtiliser={usage.utiliserItem} 
                onEquiper={handleEquiper} 
                onClick={(e) => setDetail(e)} 
                labelModif={m => formatLabelModif(m, allStats)} 
                labelEffet={e => formatLabelEffet(e, allStats)} 
                modifs={entry.items.modificateurs || []} 
              />
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE DÉTAIL MYSTIQUE */}
      <ItemDetailModal 
        item={detail} 
        onClose={() => setDetail(null)} 
        mode="joueur" 
        stats={allStats}
        onUtiliser={usage.utiliserItem} 
        onEquiper={handleEquiper} 
      />
    </div>
  )
}
