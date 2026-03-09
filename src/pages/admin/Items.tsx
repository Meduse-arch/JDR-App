import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'

type Item = { id: string; nom: string; description: string; categorie: string; cree_par: string | null }
type Stat  = { id: string; nom: string }
type Modificateur = { type: string; id_stat: string | null; valeur: number }

const CATEGORIES = ['Arme', 'Armure', 'Bijou', 'Consommable', 'Artéfact', 'Divers']
const CATEGORIE_EMOJI: Record<string, string> = {
  Arme: '⚔️', Armure: '🛡️', Bijou: '💍', Consommable: '🧪', 'Artéfact': '✨', Divers: '📦',
}
const TYPES_RESSOURCES = [
  { id: 'hp',       label: '❤️ PV actuel'   },
  { id: 'mana',     label: '💧 Mana actuel'  },
  { id: 'stam',     label: '⚡ Stamina actuel'},
  { id: 'hp_max',   label: '❤️ PV max'       },
  { id: 'mana_max', label: '💧 Mana max'     },
  { id: 'stam_max', label: '⚡ Stamina max'  },
]

export default function Items() {
  const sessionActive = useStore(s => s.sessionActive)
  const compte        = useStore(s => s.compte)

  const [items,     setItems]     = useState<Item[]>([])
  const [stats,     setStats]     = useState<Stat[]>([])
  const [filtreCategorie, setFiltreCategorie] = useState('Tous')
  const [recherche, setRecherche] = useState('')
  const [afficherFormulaire, setAfficherFormulaire] = useState(false)
  const [message,   setMessage]   = useState('')
  const [itemModifs, setItemModifs] = useState<Record<string, Modificateur[]>>({})

  const [nom,          setNom]          = useState('')
  const [description,  setDescription]  = useState('')
  const [categorie,    setCategorie]    = useState('Divers')
  const [modificateurs, setModificateurs] = useState<Modificateur[]>([])

  useEffect(() => {
    chargerItems()
    supabase.from('stats').select('id, nom').then(({ data }) => { if (data) setStats(data) })
  }, [sessionActive])

  const chargerItems = async () => {
    if (!sessionActive) return
    const { data } = await supabase.from('items').select('*').eq('id_session', sessionActive.id).order('nom')
    if (data) {
      setItems(data)
      for (const item of data) {
        const { data: modifs } = await supabase.from('item_modificateurs').select('*').eq('id_item', item.id)
        if (modifs) setItemModifs(prev => ({ ...prev, [item.id]: modifs }))
      }
    }
  }

  const ajouterModificateur = () =>
    setModificateurs(prev => [...prev, { type: 'hp', id_stat: null, valeur: 1 }])

  const majModificateur = (index: number, champ: keyof Modificateur, val: any) =>
    setModificateurs(prev => prev.map((m, i) => {
      if (i !== index) return m
      if (champ === 'type') return { ...m, type: val, id_stat: val === 'stat' ? m.id_stat : null }
      return { ...m, [champ]: val }
    }))

  const supprimerModificateur = (index: number) =>
    setModificateurs(prev => prev.filter((_, i) => i !== index))

  const creerItem = async () => {
    if (!nom || !sessionActive) return
    const { data: newItem, error } = await supabase.from('items').insert({
      nom, description, categorie, id_session: sessionActive.id, cree_par: compte?.id,
    }).select().single()
    if (error || !newItem) return
    if (modificateurs.length > 0)
      await supabase.from('item_modificateurs').insert(
        modificateurs.map(m => ({
          id_item: newItem.id, type: m.type,
          id_stat: m.type === 'stat' ? m.id_stat : null, valeur: m.valeur,
        }))
      )
    setNom(''); setDescription(''); setCategorie('Divers'); setModificateurs([])
    setAfficherFormulaire(false)
    setMessage('✅ Item créé !'); setTimeout(() => setMessage(''), 2500)
    chargerItems()
  }

  const supprimerItem = async (id: string) => {
    await supabase.from('items').delete().eq('id', id); chargerItems()
  }

  const labelModif = (m: Modificateur) => {
    if (m.type === 'stat') {
      const stat = stats.find(s => s.id === m.id_stat)
      return `${m.valeur > 0 ? '+' : ''}${m.valeur} ${stat?.nom ?? '?'}`
    }
    const res = TYPES_RESSOURCES.find(r => r.id === m.type)
    return `${m.valeur > 0 ? '+' : ''}${m.valeur} ${res?.label ?? m.type}`
  }

  const itemsFiltres = items
    .filter(i => filtreCategorie === 'Tous' || i.categorie === filtreCategorie)
    .filter(i => i.nom.toLowerCase().includes(recherche.toLowerCase()))

  const inputStyle  = { backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)' }
  const selectStyle = { backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }
  const cardStyle   = { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }

  return (
    <div className="flex flex-col h-full p-4 md:p-8 overflow-y-auto custom-scrollbar"
      style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-6"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <h2 className="text-2xl md:text-3xl font-black tracking-tight"
          style={{
            background: 'linear-gradient(135deg, var(--color-light), var(--color-accent2))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
          📚 Bibliothèque d'items
        </h2>
        <div className="flex items-center gap-3 shrink-0">
          {message && (
            <span className="text-sm font-bold" style={{ color: '#4ade80' }}>{message}</span>
          )}
          <button
            onClick={() => { setAfficherFormulaire(!afficherFormulaire); setModificateurs([]) }}
            className="px-4 py-2 rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5 text-white"
            style={{
              background: afficherFormulaire
                ? 'var(--bg-surface)'
                : 'linear-gradient(135deg, var(--color-main), var(--color-accent2))',
              color: afficherFormulaire ? 'var(--text-secondary)' : '#fff',
              border: afficherFormulaire ? '1px solid var(--border)' : 'none',
            }}
          >
            {afficherFormulaire ? '✕ Annuler' : '+ Créer un item'}
          </button>
        </div>
      </div>

      {!sessionActive && (
        <p className="text-center mt-16" style={{ color: 'var(--text-secondary)' }}>
          Rejoins une session d'abord
        </p>
      )}

      {sessionActive && (
        <div className="flex flex-col gap-6">

          {/* ── Formulaire création ── */}
          {afficherFormulaire && (
            <div className="p-6 rounded-2xl flex flex-col gap-5 w-full max-w-xl"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid color-mix(in srgb, var(--color-main) 40%, var(--border))',
                boxShadow: '0 0 25px var(--color-glow)',
              }}>
              <h3 className="font-black text-lg" style={{ color: 'var(--color-light)' }}>
                Nouvel item
              </h3>

              <input
                type="text" placeholder="Nom de l'item" value={nom}
                onChange={e => setNom(e.target.value)}
                className="px-4 py-2.5 rounded-xl outline-none text-sm w-full"
                style={inputStyle}
              />
              <textarea
                placeholder="Description (optionnel)" value={description}
                onChange={e => setDescription(e.target.value)}
                className="px-4 py-2.5 rounded-xl outline-none text-sm resize-none h-16 w-full"
                style={inputStyle}
              />

              {/* Catégorie */}
              <div className="flex gap-2 flex-wrap">
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setCategorie(cat)}
                    className="px-3 py-1.5 rounded-xl text-sm font-bold transition-all"
                    style={{
                      backgroundColor: categorie === cat ? 'var(--color-main)' : 'var(--bg-surface)',
                      color: categorie === cat ? '#fff' : 'var(--text-secondary)',
                      border: '1px solid var(--border)',
                    }}>
                    {CATEGORIE_EMOJI[cat]} {cat}
                  </button>
                ))}
              </div>

              {/* Modificateurs */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
                    ✨ Modificateurs
                  </p>
                  <button onClick={ajouterModificateur}
                    className="px-3 py-1 rounded-xl text-xs font-bold transition-all"
                    style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--color-main) 20%, transparent)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}>
                    + Ajouter
                  </button>
                </div>

                {modificateurs.map((mod, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 rounded-xl flex-wrap"
                    style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                    <select value={mod.type} onChange={e => majModificateur(index, 'type', e.target.value)}
                      className="px-2 py-1.5 rounded-lg text-xs outline-none flex-1 min-w-[120px]"
                      style={selectStyle}>
                      <optgroup label="Ressources">
                        {TYPES_RESSOURCES.map(r => (
                          <option key={r.id} value={r.id}>{r.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Stats">
                        <option value="stat">📊 Stat...</option>
                      </optgroup>
                    </select>

                    {mod.type === 'stat' && (
                      <select value={mod.id_stat ?? ''} onChange={e => majModificateur(index, 'id_stat', e.target.value)}
                        className="px-2 py-1.5 rounded-lg text-xs outline-none flex-1 min-w-[100px]"
                        style={selectStyle}>
                        <option value="">Choisir...</option>
                        {stats.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                      </select>
                    )}

                    <input type="number" value={mod.valeur}
                      onChange={e => majModificateur(index, 'valeur', parseInt(e.target.value) || 0)}
                      className="px-2 py-1.5 rounded-lg text-xs outline-none w-16 text-center font-bold"
                      style={inputStyle}
                    />

                    <button onClick={() => supprimerModificateur(index)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all"
                      style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.25)')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)')}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <button onClick={creerItem} disabled={!nom}
                className="py-3 rounded-xl font-bold transition-all text-white"
                style={{
                  background: nom
                    ? 'linear-gradient(135deg, var(--color-main), var(--color-accent2))'
                    : 'var(--bg-surface)',
                  color: nom ? '#fff' : 'var(--text-muted)',
                  cursor: nom ? 'pointer' : 'not-allowed',
                  boxShadow: nom ? '0 0 15px var(--color-glow)' : 'none',
                }}>
                Créer l'item
              </button>
            </div>
          )}

          {/* ── Recherche + filtres ── */}
          <div className="flex flex-col gap-3">
            <input type="text" placeholder="🔍 Rechercher un item..." value={recherche}
              onChange={e => setRecherche(e.target.value)}
              className="px-4 py-3 rounded-2xl outline-none text-sm w-full md:max-w-sm"
              style={inputStyle}
            />
            <div className="flex gap-2 flex-wrap">
              {['Tous', ...CATEGORIES].map(cat => (
                <button key={cat} onClick={() => setFiltreCategorie(cat)}
                  className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
                  style={{
                    backgroundColor: filtreCategorie === cat ? 'var(--color-main)' : 'var(--bg-card)',
                    color: filtreCategorie === cat ? '#fff' : 'var(--text-secondary)',
                    border: `1px solid ${filtreCategorie === cat ? 'var(--color-main)' : 'var(--border)'}`,
                    boxShadow: filtreCategorie === cat ? '0 0 10px var(--color-glow)' : 'none',
                  }}>
                  {cat !== 'Tous' && <span className="mr-1">{CATEGORIE_EMOJI[cat]}</span>}{cat}
                </button>
              ))}
            </div>
          </div>

          {/* ── Liste items ── */}
          {itemsFiltres.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 opacity-40">
              <span className="text-5xl mb-3">📭</span>
              <p className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
                Aucun item trouvé
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
            {itemsFiltres.map(item => (
              <div key={item.id}
                className="p-5 rounded-2xl flex flex-col gap-3 transition-all duration-300 hover:-translate-y-1 group"
                style={cardStyle}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-main)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>

                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl shrink-0">{CATEGORIE_EMOJI[item.categorie]}</span>
                    <p className="font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                      {item.nom}
                    </p>
                  </div>
                  <button onClick={() => supprimerItem(item.id)}
                    className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-all"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => {
                      e.currentTarget.style.color = '#f87171'
                      e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.color = 'var(--text-muted)'
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }}>
                    🗑️
                  </button>
                </div>

                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg w-fit"
                  style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                  {item.categorie}
                </span>

                {item.description && (
                  <p className="text-xs italic line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                    {item.description}
                  </p>
                )}

                {itemModifs[item.id]?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {itemModifs[item.id].map((m, i) => (
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
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}