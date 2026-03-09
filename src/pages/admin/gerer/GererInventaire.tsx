import { useEffect, useState } from 'react'
import { supabase } from '../../../supabase'
import { useStore } from '../../../store/useStore'

type Personnage      = { id: string; nom: string; est_pnj: boolean }
type Item            = { id: string; nom: string; description: string; categorie: string }
type InventaireEntry = { id: string; quantite: number; items: Item }
type Modificateur    = { type: string; id_stat: string | null; valeur: number }
type Props           = { personnage: Personnage }

const CATEGORIES = ['Arme', 'Armure', 'Bijou', 'Consommable', 'Artéfact', 'Divers']
const CATEGORIE_EMOJI: Record<string, string> = {
  Arme: '⚔️', Armure: '🛡️', Bijou: '💍', Consommable: '🧪', 'Artéfact': '✨', Divers: '📦',
}

export default function GererInventaire({ personnage }: Props) {
  const sessionActive = useStore(s => s.sessionActive)

  const [inventaire,        setInventaire]        = useState<InventaireEntry[]>([])
  const [itemsBibliotheque, setItemsBibliotheque] = useState<Item[]>([])
  const [onglet,            setOnglet]            = useState<'inventaire' | 'ajouter'>('inventaire')
  const [itemSelectionne,   setItemSelectionne]   = useState('')
  const [quantiteAjout,     setQuantiteAjout]     = useState(1)
  const [filtreCategorie,   setFiltreCategorie]   = useState('Tous')
  const [recherche,         setRecherche]         = useState('')
  const [rechercheAjout,    setRechercheAjout]    = useState('')
  const [message,           setMessage]           = useState('')
  const [itemModifs,        setItemModifs]        = useState<Record<string, Modificateur[]>>({})
  const [stats,             setStats]             = useState<{ id: string; nom: string }[]>([])

  useEffect(() => {
    chargerInventaire()
    chargerBibliotheque()
    supabase.from('stats').select('id, nom').then(({ data }) => { if (data) setStats(data) })
  }, [personnage])

  const chargerInventaire = async () => {
    const { data } = await supabase
      .from('inventaire').select('id, quantite, items(id, nom, description, categorie)').eq('id_personnage', personnage.id)
    if (data) setInventaire(data as any)
  }

  const chargerBibliotheque = async () => {
    if (!sessionActive) return
    const { data } = await supabase.from('items').select('*').eq('id_session', sessionActive.id).order('nom')
    if (data) {
      setItemsBibliotheque(data)
      for (const item of data) {
        const { data: modifs } = await supabase.from('item_modificateurs').select('*').eq('id_item', item.id)
        if (modifs) setItemModifs(prev => ({ ...prev, [item.id]: modifs }))
      }
    }
  }

  const afficherMessage = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(''), 2500) }

  const ajouterItem = async () => {
    if (!itemSelectionne) return
    const existing = inventaire.find(e => e.items.id === itemSelectionne)
    if (existing) {
      await supabase.from('inventaire').update({ quantite: existing.quantite + quantiteAjout }).eq('id', existing.id)
    } else {
      await supabase.from('inventaire').insert({ id_personnage: personnage.id, id_item: itemSelectionne, quantite: quantiteAjout })
    }
    afficherMessage('✅ Item ajouté !')
    setItemSelectionne(''); setQuantiteAjout(1); chargerInventaire()
  }

  const retirerItem = async (entryId: string, q: number) => {
    if (q <= 1) await supabase.from('inventaire').delete().eq('id', entryId)
    else await supabase.from('inventaire').update({ quantite: q - 1 }).eq('id', entryId)
    chargerInventaire()
  }

  const supprimerItem = async (entryId: string) => {
    await supabase.from('inventaire').delete().eq('id', entryId); chargerInventaire()
  }

  const labelModif = (m: Modificateur) => {
    if (m.type === 'stat') { const s = stats.find(s => s.id === m.id_stat); return `${m.valeur > 0 ? '+' : ''}${m.valeur} ${s?.nom ?? '?'}` }
    const labels: Record<string, string> = { hp: '❤️ PV', mana: '💧 Mana', stam: '⚡ Stam', hp_max: '❤️ PV max', mana_max: '💧 Mana max', stam_max: '⚡ Stam max' }
    return `${m.valeur > 0 ? '+' : ''}${m.valeur} ${labels[m.type] ?? m.type}`
  }

  const inventaireFiltré = inventaire
    .filter(e => filtreCategorie === 'Tous' || e.items.categorie === filtreCategorie)
    .filter(e => e.items.nom.toLowerCase().includes(recherche.toLowerCase()))
  const bibliothequeFiltrée = itemsBibliotheque
    .filter(i => i.nom.toLowerCase().includes(rechercheAjout.toLowerCase()))

  const cardStyle  = { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }
  const inputStyle = { backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)' }

  const btnOnglet = (id: 'inventaire' | 'ajouter', label: string) => (
    <button key={id} onClick={() => setOnglet(id)}
      className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
      style={{
        backgroundColor: onglet === id ? 'var(--color-main)' : 'var(--bg-surface)',
        color: onglet === id ? '#fff' : 'var(--text-secondary)',
        border: '1px solid var(--border)',
      }}>
      {label}
    </button>
  )

  return (
    <div className="flex flex-col gap-5" style={{ color: 'var(--text-primary)' }}>
      {/* Onglets */}
      <div className="flex gap-2 items-center flex-wrap">
        {btnOnglet('inventaire', '🎒 Inventaire')}
        {btnOnglet('ajouter', '➕ Ajouter')}
        {message && <span className="ml-auto text-sm font-bold" style={{ color: '#4ade80' }}>{message}</span>}
      </div>

      {/* Inventaire actuel */}
      {onglet === 'inventaire' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <input type="text" placeholder="🔍 Rechercher..." value={recherche}
              onChange={e => setRecherche(e.target.value)}
              className="px-4 py-2 rounded-xl outline-none text-sm flex-1" style={inputStyle} />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['Tous', ...CATEGORIES].map(cat => (
              <button key={cat} onClick={() => setFiltreCategorie(cat)}
                className="px-3 py-1 rounded-xl text-xs font-bold transition-all"
                style={{
                  backgroundColor: filtreCategorie === cat ? 'var(--color-main)' : 'var(--bg-surface)',
                  color: filtreCategorie === cat ? '#fff' : 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                }}>
                {cat !== 'Tous' ? CATEGORIE_EMOJI[cat] + ' ' : ''}{cat}
              </button>
            ))}
          </div>

          {inventaireFiltré.length === 0 && (
            <p className="text-sm text-center mt-4" style={{ color: 'var(--text-muted)' }}>Aucun item</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {inventaireFiltré.map(entry => (
              <div key={entry.id} className="p-4 rounded-2xl flex justify-between items-start gap-3" style={cardStyle}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>{CATEGORIE_EMOJI[entry.items.categorie]}</span>
                    <p className="font-semibold truncate">{entry.items.nom}</p>
                    <span className="text-xs px-2 py-0.5 rounded-lg"
                      style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                      {entry.items.categorie}
                    </span>
                  </div>
                  {entry.items.description && (
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{entry.items.description}</p>
                  )}
                  <p className="font-black text-sm mt-1" style={{ color: 'var(--color-main)' }}>x{entry.quantite}</p>
                  {itemModifs[entry.items.id]?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {itemModifs[entry.items.id].map((m, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-lg font-bold"
                          style={{ backgroundColor: 'color-mix(in srgb, var(--color-main) 15%, transparent)', color: 'var(--color-light)' }}>
                          {labelModif(m)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button onClick={() => retirerItem(entry.id, entry.quantite)}
                    className="px-3 py-1 rounded-lg text-xs font-bold transition-all"
                    style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.15)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}>
                    −1
                  </button>
                  <button onClick={() => supprimerItem(entry.id)}
                    className="px-3 py-1 rounded-lg text-xs font-bold transition-all"
                    style={{ backgroundColor: 'var(--bg-surface)', color: '#f87171', border: '1px solid var(--border)' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.15)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}>
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ajouter depuis bibliothèque */}
      {onglet === 'ajouter' && (
        <div className="flex flex-col gap-4">
          <input type="text" placeholder="🔍 Rechercher un item..." value={rechercheAjout}
            onChange={e => setRechercheAjout(e.target.value)}
            className="px-4 py-2 rounded-xl outline-none text-sm" style={inputStyle} />

          {bibliothequeFiltrée.length === 0 && (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Aucun item trouvé. Crée des items depuis la page Items !
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto custom-scrollbar">
            {bibliothequeFiltrée.map(item => (
              <button key={item.id} onClick={() => setItemSelectionne(item.id)}
                className="p-3 rounded-2xl text-left transition-all"
                style={{
                  backgroundColor: itemSelectionne === item.id
                    ? 'color-mix(in srgb, var(--color-main) 20%, var(--bg-card))'
                    : 'var(--bg-card)',
                  border: `1px solid ${itemSelectionne === item.id ? 'var(--color-main)' : 'var(--border)'}`,
                }}>
                <div className="flex items-center gap-2">
                  <span>{CATEGORIE_EMOJI[item.categorie]}</span>
                  <span className="font-semibold text-sm">{item.nom}</span>
                </div>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.categorie}</span>
                {itemModifs[item.id]?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {itemModifs[item.id].map((m, i) => (
                      <span key={i} className="text-xs px-1.5 py-0.5 rounded font-bold"
                        style={{ backgroundColor: 'color-mix(in srgb, var(--color-main) 15%, transparent)', color: 'var(--color-light)' }}>
                        {labelModif(m)}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>

          {itemSelectionne && (
            <div className="flex items-center gap-3 flex-wrap">
              <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>Quantité :</label>
              <button onClick={() => setQuantiteAjout(q => Math.max(1, q - 1))}
                className="w-9 h-9 rounded-xl font-bold transition-all"
                style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                −
              </button>
              <span className="text-xl font-black w-8 text-center" style={{ color: 'var(--color-main)' }}>
                {quantiteAjout}
              </span>
              <button onClick={() => setQuantiteAjout(q => q + 1)}
                className="w-9 h-9 rounded-xl font-bold transition-all"
                style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                +
              </button>
              <button onClick={ajouterItem}
                className="ml-auto px-5 py-2 rounded-xl text-sm font-bold text-white transition-all"
                style={{ background: 'linear-gradient(135deg, var(--color-main), var(--color-accent2))' }}>
                Ajouter à l'inventaire
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}