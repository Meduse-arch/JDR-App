import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { useInventaire } from '../../hooks/useInventaire'
import { usePersonnage } from '../../hooks/usePersonnage'
import { useItems } from '../../hooks/useItems'
import { useStats } from '../../hooks/useStats'
import { CATEGORIES, CATEGORIE_EMOJI } from '../../utils/constants'
import { formatLabelModif } from '../../utils/formatters'
import { ItemCard } from '../../components/ItemCard'
import { InventaireEntry, CategorieItem } from '../../types'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { inventaireService } from '../../services/inventaireService'
import { personnageService } from '../../services/personnageService'

export default function MonInventaire() {
  const pnjControle = useStore(s => s.pnjControle)
  const setPnjControle = useStore(s => s.setPnjControle)

  const { personnage, rechargerPersonnage, mettreAJourLocalement } = usePersonnage()
  const { inventaire, charger: chargerInventaire } = useInventaire(personnage?.id)
  const { stats } = useItems()
  const { rechargerStats } = useStats()

  const [filtre, setFiltre] = useState('Tous')
  const [recherche, setRecherche] = useState('')
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([])

  const afficherToast = (msg: string) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, msg }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2500)
  }

  const utiliserItem = async (entry: InventaireEntry) => {
    if (!personnage) return
    const modifs = entry.items.item_modificateurs || []
    const updates: any = {}
    let utile = false

    for (const mod of modifs) {
      if (mod.type === 'stat' && mod.id_stat) {
        await personnageService.updateBaseStat(personnage.id, mod.id_stat, mod.valeur)
        utile = true
      } else {
        const champ = mod.type.endsWith('_max') ? mod.type : `${mod.type}_actuel`
        const maxChamp = mod.type.endsWith('_max') ? mod.type : `${mod.type}_max`
        const actuel = Number((personnage as any)[champ] ?? 0)
        const max = Number((personnage as any)[maxChamp] ?? actuel + mod.valeur)
        const nouveau = mod.type.endsWith('_max') ? actuel + mod.valeur : Math.max(0, Math.min(max, actuel + mod.valeur))
        if (nouveau !== actuel) { updates[champ] = nouveau; utile = true }
      }
    }

    if (!utile) return afficherToast('⚠️ Aucun effet utile !')

    if (Object.keys(updates).length > 0) {
      await mettreAJourLocalement(updates)
      if (pnjControle?.id === personnage.id) setPnjControle({ ...pnjControle, ...updates })
    }

    await inventaireService.retirerItem(entry.id, 1)
    await rechargerPersonnage()
    await rechargerStats()
    await chargerInventaire()
    afficherToast(`✨ ${entry.items.nom} utilisé !`)
  }

  const toggleEquiper = async (entry: InventaireEntry) => {
    await inventaireService.toggleEquipement(entry.id, !entry.equipe)
    await chargerInventaire()
    await personnageService.recalculerStats(personnage!.id)
    await rechargerPersonnage()
    await rechargerStats()
    afficherToast(entry.equipe ? `🔓 ${entry.items.nom} rangé` : `⚔️ ${entry.items.nom} équipé !`)
  }

  const itemsFiltrés = inventaire.filter(e => (filtre === 'Tous' || e.items.categorie === filtre) && e.items.nom.toLowerCase().includes(recherche.toLowerCase()))

  return (
    <div className="flex flex-col h-full p-4 md:p-8 lg:p-10 overflow-y-auto custom-scrollbar">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 pb-6 border-b border-white/5 gap-4">
        <h2 className="text-3xl font-black uppercase italic text-main">🎒 Sac d'Aventure</h2>
        <Input icon="🔍" placeholder="Rechercher un objet..." value={recherche} onChange={e => setRecherche(e.target.value)} className="md:max-w-xs" />
      </div>

      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 custom-scrollbar">
        {['Tous', ...CATEGORIES].map(cat => (
          <Button key={cat} variant={filtre === cat ? 'primary' : 'secondary'} onClick={() => setFiltre(cat)} size="sm" className="whitespace-nowrap text-[10px]">
            {cat !== 'Tous' && <span className="mr-1">{CATEGORIE_EMOJI[cat as CategorieItem]}</span>}{cat}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
        {itemsFiltrés.map(entry => (
          <ItemCard key={entry.id} entry={entry} onUtiliser={utiliserItem} onEquiper={toggleEquiper} labelModif={m => formatLabelModif(m, stats)} modifs={entry.items.item_modificateurs || []} />
        ))}
        {itemsFiltrés.length === 0 && <div className="col-span-full py-20 text-center opacity-20 font-black uppercase italic">Le sac est vide...</div>}
      </div>

      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="px-6 py-3 rounded-2xl bg-card border border-main/30 text-main font-black shadow-2xl animate-in slide-in-from-right-full">{t.msg}</div>
        ))}
      </div>
    </div>
  )
}
