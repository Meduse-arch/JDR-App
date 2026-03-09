import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'
import { useInventaire, ItemInventaire } from '../../hooks/useInventaire'
import { usePersonnage } from '../../hooks/usePersonnage'

type Modificateur = { type: string; id_stat: string | null; valeur: number }
type Stat         = { id: string; nom: string }

const CATEGORIE_EMOJI: Record<string, string> = {
  Arme: '⚔️', Armure: '🛡️', Bijou: '💍', Consommable: '🧪', 'Artéfact': '✨', Divers: '📦',
}
const CATEGORIES = ['Arme', 'Armure', 'Bijou', 'Consommable', 'Artéfact', 'Divers']

export default function MonInventaire() {
  const pnjControle    = useStore(s => s.pnjControle)
  const setPnjControle = useStore(s => s.setPnjControle)

  const { inventaire, chargement: chargementInv, toggleEquipementOptimiste, consommerItemOptimiste } = useInventaire()
  const { personnage, mettreAJourLocalement } = usePersonnage()

  const [itemModifs, setItemModifs]             = useState<Record<string, Modificateur[]>>({})
  const [statsInfo,  setStatsInfo]              = useState<Stat[]>([])
  const [filtreCategorie, setFiltreCategorie]   = useState('Tous')
  const [recherche, setRecherche]               = useState('')
  // Toasts légers (pas de re-render global)
  const [toasts, setToasts]                     = useState<{ id: number; msg: string }[]>([])

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

  const afficherToast = (msg: string) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, msg }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2500)
  }

  const utiliserItem = async (entry: ItemInventaire) => {
    if (!personnage) return
    const listeModifs = itemModifs[entry.items.id] || []
    const updates: Partial<typeof personnage> = {}
    let utile = false

    for (const mod of listeModifs) {
      if (mod.type === 'stat') { utile = true; continue }
      const estMax      = mod.type.endsWith('_max')
      const champActuel = estMax ? mod.type : `${mod.type}_actuel`
      const champMax    = estMax ? mod.type : `${mod.type}_max`
      const actuel = Number((personnage as any)[champActuel] ?? 0)
      const max    = Number((personnage as any)[champMax]    ?? actuel + mod.valeur)
      const nouvelleValeur = estMax ? actuel + mod.valeur : Math.max(0, Math.min(max, actuel + mod.valeur))
      if (nouvelleValeur !== actuel) {
        ;(updates as any)[champActuel] = nouvelleValeur
        utile = true
      }
    }

    if (!utile) { afficherToast('⚠️ Déjà au maximum !'); return }

    // Mise à jour optimiste des ressources + suppression item
    if (Object.keys(updates).length > 0) {
      await mettreAJourLocalement(updates as any)
      if (pnjControle && pnjControle.id === personnage.id)
        setPnjControle({ ...pnjControle, ...updates } as any)
    }
    await consommerItemOptimiste(entry.id, entry.quantite)
    afficherToast(`✨ ${entry.items.nom} utilisé !`)
  }

  const toggleEquiper = async (entry: ItemInventaire) => {
    // Optimiste : l'icône bascule immédiatement
    await toggleEquipementOptimiste(entry.id, !entry.equipe)
    afficherToast(entry.equipe ? `🔓 ${entry.items.nom} rangé` : `⚔️ ${entry.items.nom} équipé !`)
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
    <div className="flex flex-col h-full p-4 md:p-8 lg:p-10 overflow-y-auto custom-scrollbar"
      style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>

      {/* Header */}
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

      {/* Toasts flottants (coin bas-droite) */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className="px-4 py-2.5 rounded-2xl text-sm font-bold shadow-xl"
            style={{
              backgroundColor: 'var(--bg-card)',
              color: 'var(--color-light)',
              border: '1px solid color-mix(in srgb, var(--color-main) 40%, transparent)',
              boxShadow: '0 0 20px var(--color-glow)',
              animation: 'fadeSlideUp 0.3s ease-out',
            }}
          >
            {t.msg}
          </div>
        ))}
      </div>

      {/* Animation keyframe via style tag */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Filtres */}
      <div className="flex flex-col gap-4 mb-8">
        <input
          type="text" placeholder="🔍 Rechercher dans le sac..." value={recherche}
          onChange={e => setRecherche(e.target.value)}
          className="w-full md:max-w-md px-5 py-3 rounded-2xl outline-none text-sm"
          style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
        />
        <div className="flex gap-2 flex-wrap">
          {['Tous', ...CATEGORIES].map(cat => (
            <button key={cat} onClick={() => setFiltreCategorie(cat)}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-all border"
              style={{
                backgroundColor: filtreCategorie === cat ? 'var(--color-main)' : 'var(--bg-card)',
                color: filtreCategorie === cat ? '#fff' : 'var(--text-secondary)',
                borderColor: filtreCategorie === cat ? 'var(--color-main)' : 'var(--border)',
                boxShadow: filtreCategorie === cat ? '0 0 12px var(--color-glow)' : 'none',
              }}>
              {cat !== 'Tous' && <span className="mr-1">{CATEGORIE_EMOJI[cat]}</span>}{cat}
            </button>
          ))}
        </div>
      </div>

      {inventaire.length === 0 && (
        <div className="flex flex-col items-center justify-center mt-20 opacity-40">
          <span className="text-6xl mb-4">🕸️</span>
          <p className="text-lg font-bold" style={{ color: 'var(--text-secondary)' }}>Le sac est totalement vide.</p>
        </div>
      )}

      {/* Équipement actif */}
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

      {/* Reste du sac */}
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

/* ── Carte item ── */
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
  // Petit flash lors du clic sur Équiper
  const [pressed, setPressed] = useState(false)

  const handleEquiper = () => {
    setPressed(true)
    setTimeout(() => setPressed(false), 300)
    onEquiper(entry)
  }

  return (
    <div
      className="relative p-5 rounded-3xl flex flex-col gap-3 transition-all duration-300 hover:-translate-y-1"
      style={{
        backgroundColor: entry.equipe
          ? 'color-mix(in srgb, var(--color-main) 8%, var(--bg-card))'
          : 'var(--bg-card)',
        border: `1px solid ${entry.equipe
          ? 'color-mix(in srgb, var(--color-main) 40%, transparent)'
          : 'var(--border)'}`,
        boxShadow: entry.equipe ? '0 0 20px var(--color-glow)' : 'none',
        // Légère mise à l'échelle au press
        transform: pressed ? 'scale(0.97)' : undefined,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 flex items-center justify-center rounded-2xl text-2xl shrink-0"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
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
        <span className="font-black text-xs px-2.5 py-1 rounded-xl shrink-0"
          style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
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
            <span key={i} className="text-[10px] font-bold uppercase px-2 py-1 rounded-lg"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-main) 15%, transparent)',
                color: 'var(--color-light)',
                border: '1px solid color-mix(in srgb, var(--color-main) 30%, transparent)',
              }}>
              {labelModif(m)}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-auto pt-2">
        {estConsommable ? (
          <button onClick={() => onUtiliser(entry)}
            className="flex-1 py-2 rounded-xl text-xs font-bold transition-all text-white active:scale-95"
            style={{
              background: 'linear-gradient(135deg, var(--color-main), var(--color-accent2))',
              boxShadow: '0 0 10px var(--color-glow)',
            }}>
            Utiliser
          </button>
        ) : (
          <button onClick={handleEquiper}
            className="flex-1 py-2 rounded-xl text-xs font-bold transition-all border active:scale-95"
            style={{
              backgroundColor: entry.equipe
                ? 'color-mix(in srgb, var(--color-main) 15%, transparent)'
                : 'transparent',
              color: entry.equipe ? 'var(--color-light)' : 'var(--text-secondary)',
              borderColor: entry.equipe
                ? 'color-mix(in srgb, var(--color-main) 50%, transparent)'
                : 'var(--border)',
            }}>
            {entry.equipe ? 'Ranger' : 'Équiper'}
          </button>
        )}
      </div>
    </div>
  )
}