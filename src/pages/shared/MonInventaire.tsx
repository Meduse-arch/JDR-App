import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { useInventaire } from '../../hooks/useInventaire'
import { usePersonnage } from '../../hooks/usePersonnage'
import { useItems } from '../../hooks/useItems'
import { useStats } from '../../hooks/useStats'
import { CATEGORIES, CATEGORIE_EMOJI } from '../../utils/constants'
import { formatLabelModif } from '../../utils/formatters'
import { ItemCard } from '../../components/ItemCard'
import { InventaireEntry } from '../../types'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { personnageService } from '../../services/personnageService'

export default function MonInventaire() {
  const pnjControle    = useStore(s => s.pnjControle)
  const setPnjControle = useStore(s => s.setPnjControle)

  const { inventaire, chargement: chargementInv, toggleEquipementOptimiste, consommerItemOptimiste } = useInventaire()
  const { personnage, mettreAJourLocalement, rechargerPersonnage } = usePersonnage()
  const { rechargerStats } = useStats()
  const { stats, itemModifs } = useItems()

  const [filtreCategorie, setFiltreCategorie]   = useState('Tous')
  const [recherche, setRecherche]               = useState('')
  const [toasts, setToasts]                     = useState<{ id: number; msg: string }[]>([])

  const afficherToast = (msg: string) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, msg }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2500)
  }

  const utiliserItem = async (entry: InventaireEntry) => {
    if (!personnage) return
    const listeModifs = itemModifs[entry.items.id] || []
    const updates: any = {}
    let utile = false

    for (const mod of listeModifs) {
      if (mod.type === 'stat') {
        if (mod.id_stat) {
          await personnageService.updateBaseStat(personnage.id, mod.id_stat, mod.valeur)
          utile = true
        }
        continue
      }
      
      const estMax      = mod.type.endsWith('_max')
      // Mappage correct : hp -> hp_actuel, mana -> mana_actuel, stam -> stam_actuel
      const champActuel = estMax ? mod.type : `${mod.type}_actuel`
      const champMax    = estMax ? mod.type : `${mod.type}_max`
      
      const actuel = Number((personnage as any)[champActuel] ?? 0)
      const max    = Number((personnage as any)[champMax]    ?? actuel + mod.valeur)
      const nouvelleValeur = estMax ? actuel + mod.valeur : Math.max(0, Math.min(max, actuel + mod.valeur))
      
      if (nouvelleValeur !== actuel) {
        updates[champActuel] = nouvelleValeur
        utile = true
      }
    }

    if (!utile) { afficherToast('⚠️ Déjà au maximum !'); return }

    if (Object.keys(updates).length > 0) {
      await mettreAJourLocalement(updates)
      if (pnjControle && pnjControle.id === personnage.id)
        setPnjControle({ ...pnjControle, ...updates } as any)
    }

    await consommerItemOptimiste(entry.id, entry.quantite)
    
    // Tout rafraîchir pour être sûr
    await rechargerPersonnage()
    await rechargerStats()
    
    afficherToast(`✨ ${entry.items.nom} utilisé !`)
  }

  const toggleEquiper = async (entry: InventaireEntry) => {
    await toggleEquipementOptimiste(entry.id, !entry.equipe)
    await rechargerPersonnage()
    afficherToast(entry.equipe ? `🔓 ${entry.items.nom} rangé` : `⚔️ ${entry.items.nom} équipé !`)
  }

  const labelModif = (m: any) => formatLabelModif(m, stats)

  if (chargementInv) return (
    <div className="flex items-center justify-center h-full animate-pulse font-bold"
      style={{ color: 'var(--text-muted)' }}>
      Fouille du sac en cours...
    </div>
  )
  if (!personnage) return (
    <div className="flex items-center justify-center h-full font-bold"
      style={{ color: 'var(--text-secondary)' }}>
      Aucun personnage sélectionné.
    </div>
  )

  const inventaireFiltré = (inventaire as unknown as InventaireEntry[])
    .filter(e => filtreCategorie === 'Tous' || e.items.categorie === filtreCategorie)
    .filter(e => e.items.nom.toLowerCase().includes(recherche.toLowerCase()))
  
  const equipes    = inventaireFiltré.filter(e => e.equipe)
  const nonEquipes = inventaireFiltré.filter(e => !e.equipe)

  return (
    <div className="flex flex-col h-full p-4 md:p-8 lg:p-10 overflow-y-auto custom-scrollbar"
      style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-6 gap-4"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <h2 className="text-3xl md:text-4xl font-black tracking-tight"
          style={{
            background: 'linear-gradient(135deg, var(--color-light), var(--color-accent2))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
          Sac Aventure
        </h2>
      </div>

      {/* Système de toasts pour les retours utilisateur */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="px-4 py-2.5 rounded-2xl text-sm font-bold shadow-xl"
            style={{
              backgroundColor: 'var(--bg-card)',
              color: 'var(--color-light)',
              border: '1px solid color-mix(in srgb, var(--color-main) 40%, transparent)',
              boxShadow: '0 0 20px var(--color-glow)',
              animation: 'fadeSlideUp 0.3s ease-out',
            }}>
            {t.msg}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Barre de recherche et Filtres */}
      <div className="flex flex-col gap-4 mb-8">
        <Input
          icon="🔍"
          type="text" placeholder="Rechercher dans le sac..." value={recherche}
          onChange={e => setRecherche(e.target.value)}
          className="md:max-w-md"
        />
        <div className="flex gap-2 flex-wrap">
          {['Tous', ...CATEGORIES].map(cat => (
            <Button 
              key={cat} 
              variant={filtreCategorie === cat ? 'active' : 'secondary'}
              onClick={() => setFiltreCategorie(cat)}
              className="text-xs"
              size="sm"
            >
              {cat !== 'Tous' && <span className="mr-1">{CATEGORIE_EMOJI[cat as import('../../types').CategorieItem]}</span>}{cat}
            </Button>
          ))}
        </div>
      </div>

      {inventaire.length === 0 && (
        <div className="flex flex-col items-center justify-center mt-20 opacity-40">
          <span className="text-6xl mb-4">🕸️</span>
          <p className="text-lg font-bold" style={{ color: 'var(--text-secondary)' }}>Le sac est totalement vide.</p>
        </div>
      )}

      {equipes.length > 0 && (
        <div className="mb-10">
          <p className="text-xs uppercase font-black mb-4 tracking-widest flex items-center gap-2"
            style={{ color: 'var(--color-main)' }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--color-main)' }} />
            Équipement Actif
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {equipes.map(entry => (
              <ItemCard key={entry.id} entry={entry}
                onUtiliser={utiliserItem} onEquiper={toggleEquiper}
                labelModif={labelModif} modifs={itemModifs[entry.items.id] ?? []} />
            ))}
          </div>
        </div>
      )}

      {nonEquipes.length > 0 && (
        <div>
          {equipes.length > 0 && (
            <p className="text-xs uppercase font-black mb-4 tracking-widest"
              style={{ color: 'var(--text-muted)' }}>📦 Reste du sac</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {nonEquipes.map(entry => (
              <ItemCard key={entry.id} entry={entry}
                onUtiliser={utiliserItem} onEquiper={toggleEquiper}
                labelModif={labelModif} modifs={itemModifs[entry.items.id] ?? []} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
