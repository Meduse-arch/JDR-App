import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'
import { useInventaire, ItemInventaire } from '../../hooks/useInventaire'
import { usePersonnage } from '../../hooks/usePersonnage'
import { inventaireService } from '../../services/inventaireService'

type Modificateur = { type: string; id_stat: string | null; valeur: number }
type Stat         = { id: string; nom: string }

const CATEGORIE_EMOJI: Record<string, string> = {
  Arme: '⚔️', Armure: '🛡️', Bijou: '💍', Consommable: '🧪', 'Artéfact': '✨', Divers: '📦',
}
const CATEGORIES = ['Arme', 'Armure', 'Bijou', 'Consommable', 'Artéfact', 'Divers']

export default function MonInventaire() {
  const pnjControle    = useStore(s => s.pnjControle)
  const setPnjControle = useStore(s => s.setPnjControle)

  const { inventaire, chargement: chargementInv, rechargerInventaire } = useInventaire()
  const { personnage } = usePersonnage()

  const [itemModifs, setItemModifs]   = useState<Record<string, Modificateur[]>>({})
  const [statsInfo, setStatsInfo]     = useState<Stat[]>([])
  const [filtreCategorie, setFiltreCategorie] = useState('Tous')
  const [recherche, setRecherche]     = useState('')
  const [message, setMessage]         = useState('')

  useEffect(() => {
    supabase.from('stats').select('id, nom').then(({ data }) => { if (data) setStatsInfo(data) })
  }, [])

  useEffect(() => {
    const chargerModifs = async () => {
      const nouveauxModifs: Record<string, Modificateur[]> = {}
      for (const entry of inventaire) {
        if (!itemModifs[entry.items.id]) {
          const { data } = await supabase.from('item_modificateurs').select('*').eq('id_item', entry.items.id)
          if (data) nouveauxModifs[entry.items.id] = data
        }
      }
      if (Object.keys(nouveauxModifs).length > 0)
        setItemModifs(prev => ({ ...prev, ...nouveauxModifs }))
    }
    if (inventaire.length > 0) chargerModifs()
  }, [inventaire])

  const afficherMessage = (msg: string) => {
    setMessage(msg); setTimeout(() => setMessage(''), 2500)
  }

  const utiliserItem = async (entry: ItemInventaire) => {
    if (!personnage) return
    const listeModifs = itemModifs[entry.items.id] || []
    const updates: Record<string, number> = {}
    let aBesoinDetreUtilise = false

    for (const mod of listeModifs) {
      if (mod.type === 'stat') {
        aBesoinDetreUtilise = true
      } else {
        const estMax = mod.type.endsWith('_max')
        const champActuel = estMax ? mod.type : `${mod.type}_actuel`
        const champMax    = estMax ? mod.type : `${mod.type}_max`
        const actuel = Number((personnage as any)[champActuel] ?? 0)
        const max    = Number((personnage as any)[champMax]    ?? actuel + mod.valeur)
        const nouvelleValeur = estMax
          ? actuel + mod.valeur
          : Math.max(0, Math.min(max, actuel + mod.valeur))
        if (nouvelleValeur !== actuel) { updates[champActuel] = nouvelleValeur; aBesoinDetreUtilise = true }
      }
    }

    if (!aBesoinDetreUtilise) return afficherMessage('⚠️ Inutile, stats déjà au max !')
    if (Object.keys(updates).length > 0) {
      await supabase.from('personnages').update(updates).eq('id', personnage.id)
      if (pnjControle && pnjControle.id === personnage.id)
        setPnjControle({ ...pnjControle, ...updates } as any)
    }
    await inventaireService.consommerItem(entry.id, entry.quantite)
    afficherMessage(`✨ ${entry.items.nom} utilisé !`)
    rechargerInventaire()
  }

  const toggleEquiper = async (entry: ItemInventaire) => {
    await inventaireService.toggleEquipement(entry.id, !entry.equipe)
    afficherMessage(entry.equipe ? `🔓 ${entry.items.nom} rangé` : `⚔️ ${entry.items.nom} équipé !`)
    rechargerInventaire()
  }

  const labelModif = (m: Modificateur) => {
    if (m.type === 'stat') {
      const stat = statsInfo.find(s => s.id === m.id_stat)
      return `${m.valeur > 0 ? '+' : ''}${m.valeur} ${stat?.nom ?? '?'}`
    }
    const labels: Record<string, string> = {
      hp: '❤️ PV', mana: '💧 Mana', stam: '⚡ Stam',
      hp_max: '❤️ PV max', mana_max: '💧 Mana max', stam_max: '⚡ Stam max',
    }
    return `${m.valeur > 0 ? '+' : ''}${m.valeur} ${labels[m.type] ?? m.type}`
  }

  if (chargementInv) return (
    <div className="flex items-center justify-center h-full animate-pulse"
      style={{ color: 'var(--text-muted)' }}>
      Fouille du sac en cours...
    </div>
  )
  if (!personnage) return (
    <div className="flex items-center justify-center h-full"
      style={{ color: 'var(--text-secondary)' }}>
      Aucun personnage sélectionné.
    </div>
  )

  const inventaireFiltré = inventaire
    .filter(e => filtreCategorie === 'Tous' || e.items.categorie === filtreCategorie)
    .filter(e => e.items.nom.toLowerCase().includes(recherche.toLowerCase()))
  const equipes    = inventaireFiltré.filter(e => e.equipe)
  const nonEquipes = inventaireFiltré.filter(e => !e.equipe)

  return (
    <div
      className="flex flex-col h-full p-4 md:p-8 lg:p-10 overflow-y-auto custom-scrollbar"
      style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}
    >
      {/* Header */}
      <div
        className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 pb-6 gap-4"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <h2
          className="text-3xl md:text-4xl font-black tracking-tight"
          style={{
            background: 'linear-gradient(135deg, var(--color-light), var(--color-accent2))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Sac Aventure
        </h2>
        {message && (
          <span
            className="text-sm font-bold px-4 py-2 rounded-xl animate-pulse"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-main) 15%, transparent)',
              color: 'var(--color-light)',
              border: '1px solid color-mix(in srgb, var(--color-main) 35%, transparent)',
            }}
          >
            {message}
          </span>
        )}
      </div>

      {/* Recherche + filtres */}
      <div className="flex flex-col gap-4 mb-8">
        <input
          type="text"
          placeholder="🔍 Rechercher dans le sac..."
          value={recherche}
          onChange={e => setRecherche(e.target.value)}
          className="w-full md:max-w-md px-5 py-3 rounded-2xl outline-none text-sm transition-all"
          style={{
            backgroundColor: 'var(--bg-input)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
          }}
        />
        <div className="flex gap-2 flex-wrap">
          {['Tous', ...CATEGORIES].map(cat => (
            <button
              key={cat}
              onClick={() => setFiltreCategorie(cat)}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-all border"
              style={{
                backgroundColor: filtreCategorie === cat ? 'var(--color-main)' : 'var(--bg-card)',
                color: filtreCategorie === cat ? '#fff' : 'var(--text-secondary)',
                borderColor: filtreCategorie === cat ? 'var(--color-main)' : 'var(--border)',
                boxShadow: filtreCategorie === cat ? '0 0 12px var(--color-glow)' : 'none',
              }}
            >
              {cat !== 'Tous' && <span className="mr-1">{CATEGORIE_EMOJI[cat]}</span>}{cat}
            </button>
          ))}
        </div>
      </div>

      {inventaire.length === 0 && (
        <div className="flex flex-col items-center justify-center mt-20 opacity-40">
          <span className="text-6xl mb-4">🕸️</span>
          <p className="text-lg font-bold" style={{ color: 'var(--text-secondary)' }}>
            Le sac est totalement vide.
          </p>
        </div>
      )}

      {/* Équipement actif */}
      {equipes.length > 0 && (
        <div className="mb-10">
          <p
            className="text-xs uppercase font-black mb-4 tracking-widest flex items-center gap-2"
            style={{ color: 'var(--color-main)' }}
          >
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: 'var(--color-main)' }}
            />
            Équipement Actif
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {equipes.map(entry => (
              <ItemCard
                key={entry.id} entry={entry}
                onUtiliser={utiliserItem} onEquiper={toggleEquiper}
                labelModif={labelModif} modifs={itemModifs[entry.items.id] ?? []}
              />
            ))}
          </div>
        </div>
      )}

      {/* Reste du sac */}
      {nonEquipes.length > 0 && (
        <div>
          {equipes.length > 0 && (
            <p className="text-xs uppercase font-black mb-4 tracking-widest"
              style={{ color: 'var(--text-muted)' }}>
              📦 Reste du sac
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {nonEquipes.map(entry => (
              <ItemCard
                key={entry.id} entry={entry}
                onUtiliser={utiliserItem} onEquiper={toggleEquiper}
                labelModif={labelModif} modifs={itemModifs[entry.items.id] ?? []}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Carte d'item ── */
function ItemCard({
  entry, onUtiliser, onEquiper, labelModif, modifs,
}: {
  entry: ItemInventaire
  onUtiliser: (e: ItemInventaire) => void
  onEquiper:  (e: ItemInventaire) => void
  labelModif: (m: Modificateur) => string
  modifs: Modificateur[]
}) {
  const estConsommable = entry.items.categorie === 'Consommable'

  return (
    <div
      className="relative p-5 rounded-3xl flex flex-col gap-3 transition-all duration-300 hover:-translate-y-1"
      style={{
        backgroundColor: entry.equipe
          ? 'color-mix(in srgb, var(--color-main) 8%, var(--bg-card))'
          : 'var(--bg-card)',
        border: `1px solid ${entry.equipe ? 'color-mix(in srgb, var(--color-main) 40%, transparent)' : 'var(--border)'}`,
        boxShadow: entry.equipe ? '0 0 20px var(--color-glow)' : 'none',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-12 h-12 flex items-center justify-center rounded-2xl text-2xl shrink-0"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            {CATEGORIE_EMOJI[entry.items.categorie]}
          </div>
          <div className="min-w-0">
            <p className="font-bold leading-tight truncate" style={{ color: 'var(--text-primary)' }}>
              {entry.items.nom}
            </p>
            <span className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}>
              {entry.items.categorie}
            </span>
          </div>
        </div>
        <span
          className="font-black text-xs px-2.5 py-1 rounded-xl shrink-0"
          style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
        >
          x{entry.quantite}
        </span>
      </div>

      {entry.items.description && (
        <p className="text-xs italic line-clamp-2" style={{ color: 'var(--text-muted)' }}>
          {entry.items.description}
        </p>
      )}

      {modifs.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {modifs.map((m, i) => (
            <span
              key={i}
              className="text-[10px] font-bold uppercase px-2 py-1 rounded-lg"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-main) 15%, transparent)',
                color: 'var(--color-light)',
                border: '1px solid color-mix(in srgb, var(--color-main) 30%, transparent)',
              }}
            >
              {labelModif(m)}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-auto pt-2">
        {estConsommable ? (
          <button
            onClick={() => onUtiliser(entry)}
            className="flex-1 py-2 rounded-xl text-xs font-bold transition-all text-white"
            style={{
              background: 'linear-gradient(135deg, var(--color-main), var(--color-accent2))',
              boxShadow: '0 0 10px var(--color-glow)',
            }}
          >
            Utiliser
          </button>
        ) : (
          <button
            onClick={() => onEquiper(entry)}
            className="flex-1 py-2 rounded-xl text-xs font-bold transition-all border"
            style={{
              backgroundColor: entry.equipe
                ? 'color-mix(in srgb, var(--color-main) 15%, transparent)'
                : 'transparent',
              color: entry.equipe ? 'var(--color-light)' : 'var(--text-secondary)',
              borderColor: entry.equipe
                ? 'color-mix(in srgb, var(--color-main) 50%, transparent)'
                : 'var(--border)',
            }}
          >
            {entry.equipe ? 'Ranger' : 'Équiper'}
          </button>
        )}
      </div>
    </div>
  )
}