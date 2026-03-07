import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'

type Item = {
  id: string
  nom: string
  description: string
  categorie: string
  cree_par: string | null
}

type Stat = { id: string; nom: string }

type Modificateur = {
  type: string
  id_stat: string | null
  valeur: number
}

const CATEGORIES = ['Arme', 'Armure', 'Bijou', 'Consommable', 'Artéfact', 'Divers']

const CATEGORIE_EMOJI: Record<string, string> = {
  Arme: '⚔️', Armure: '🛡️', Bijou: '💍', Consommable: '🧪', 'Artéfact': '✨', Divers: '📦'
}

const TYPES_RESSOURCES = [
  { id: 'hp', label: '❤️ PV actuel' },
  { id: 'mana', label: '💧 Mana actuel' },
  { id: 'stam', label: '⚡ Stamina actuel' },
  { id: 'hp_max', label: '❤️ PV max' },
  { id: 'mana_max', label: '💧 Mana max' },
  { id: 'stam_max', label: '⚡ Stamina max' },
]

export default function Items() {
  const sessionActive = useStore(s => s.sessionActive)
  const compte = useStore(s => s.compte)

  const [items, setItems] = useState<Item[]>([])
  const [stats, setStats] = useState<Stat[]>([])
  const [filtreCategorie, setFiltreCategorie] = useState('Tous')
  const [recherche, setRecherche] = useState('')
  const [afficherFormulaire, setAfficherFormulaire] = useState(false)
  const [message, setMessage] = useState('')
  const [itemModifs, setItemModifs] = useState<Record<string, Modificateur[]>>({})

  // Formulaire
  const [nom, setNom] = useState('')
  const [description, setDescription] = useState('')
  const [categorie, setCategorie] = useState('Divers')
  const [modificateurs, setModificateurs] = useState<Modificateur[]>([])

  useEffect(() => {
    chargerItems()
    supabase.from('stats').select('id, nom').then(({ data }) => { if (data) setStats(data) })
  }, [sessionActive])

  const chargerItems = async () => {
    if (!sessionActive) return
    const { data } = await supabase
      .from('items')
      .select('*')
      .eq('id_session', sessionActive.id)
      .order('nom')
    if (data) {
      setItems(data)
      // Charger les modifs pour chaque item
      for (const item of data) {
        const { data: modifs } = await supabase
          .from('item_modificateurs')
          .select('*')
          .eq('id_item', item.id)
        if (modifs) setItemModifs(prev => ({ ...prev, [item.id]: modifs }))
      }
    }
  }

  const ajouterModificateur = () => {
    setModificateurs(prev => [...prev, { type: 'hp', id_stat: null, valeur: 1 }])
  }

  const majModificateur = (index: number, champ: keyof Modificateur, val: any) => {
    setModificateurs(prev => prev.map((m, i) => i === index ? { ...m, [champ]: val, ...(champ === 'type' && val === 'stat' ? {} : { id_stat: null }) } : m))
  }

  const supprimerModificateur = (index: number) => {
    setModificateurs(prev => prev.filter((_, i) => i !== index))
  }

  const creerItem = async () => {
    if (!nom || !sessionActive) return
    const { data: newItem, error } = await supabase.from('items').insert({
      nom, description, categorie,
      id_session: sessionActive.id,
      cree_par: compte?.id
    }).select().single()

    if (error || !newItem) return

    // Insérer les modificateurs
    if (modificateurs.length > 0) {
      await supabase.from('item_modificateurs').insert(
        modificateurs.map(m => ({
          id_item: newItem.id,
          type: m.type,
          id_stat: m.type === 'stat' ? m.id_stat : null,
          valeur: m.valeur
        }))
      )
    }

    setNom('')
    setDescription('')
    setCategorie('Divers')
    setModificateurs([])
    setAfficherFormulaire(false)
    setMessage('✅ Item créé !')
    setTimeout(() => setMessage(''), 2500)
    chargerItems()
  }

  const supprimerItem = async (id: string) => {
    await supabase.from('items').delete().eq('id', id)
    chargerItems()
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

  return (
    <div className="flex flex-col h-full text-white p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-purple-400">📚 Bibliothèque d'items</h2>
        <div className="flex items-center gap-3">
          {message && <span className="text-green-400 text-sm">{message}</span>}
          <button
            onClick={() => { setAfficherFormulaire(!afficherFormulaire); setModificateurs([]) }}
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm font-semibold transition"
          >
            {afficherFormulaire ? '✕ Annuler' : '+ Créer un item'}
          </button>
        </div>
      </div>

      {!sessionActive && <p className="text-gray-400 text-center mt-16">Rejoins une session d'abord</p>}

      {sessionActive && (
        <div className="flex flex-col gap-4">

          {/* Formulaire création */}
          {afficherFormulaire && (
            <div className="bg-gray-800 p-6 rounded-xl flex flex-col gap-4 max-w-lg">
              <h3 className="font-semibold text-lg">Nouvel item</h3>
              <input
                type="text"
                placeholder="Nom de l'item"
                value={nom}
                onChange={e => setNom(e.target.value)}
                className="bg-gray-700 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-purple-400"
              />
              <textarea
                placeholder="Description (optionnel)"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="bg-gray-700 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-purple-400 resize-none h-16"
              />

              {/* Catégorie */}
              <div className="flex gap-2 flex-wrap">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategorie(cat)}
                    className={`px-3 py-1 rounded-lg text-sm font-semibold transition
                      ${categorie === cat ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                  >
                    {CATEGORIE_EMOJI[cat]} {cat}
                  </button>
                ))}
              </div>

              {/* Modificateurs */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-300">✨ Modificateurs</p>
                  <button
                    onClick={ajouterModificateur}
                    className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded-lg text-xs transition"
                  >+ Ajouter</button>
                </div>

                {modificateurs.map((mod, index) => (
                  <div key={index} className="flex items-center gap-2 bg-gray-700 p-2 rounded-lg">
                    {/* Type */}
                    <select
                      value={mod.type}
                      onChange={e => majModificateur(index, 'type', e.target.value)}
                      className="bg-gray-600 text-white px-2 py-1 rounded-lg text-xs outline-none flex-1"
                    >
                      <optgroup label="Ressources">
                        {TYPES_RESSOURCES.map(r => (
                          <option key={r.id} value={r.id}>{r.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Stats">
                        <option value="stat">📊 Stat...</option>
                      </optgroup>
                    </select>

                    {/* Stat spécifique */}
                    {mod.type === 'stat' && (
                      <select
                        value={mod.id_stat ?? ''}
                        onChange={e => majModificateur(index, 'id_stat', e.target.value)}
                        className="bg-gray-600 text-white px-2 py-1 rounded-lg text-xs outline-none flex-1"
                      >
                        <option value="">Choisir...</option>
                        {stats.map(s => (
                          <option key={s.id} value={s.id}>{s.nom}</option>
                        ))}
                      </select>
                    )}

                    {/* Valeur */}
                    <input
                      type="number"
                      value={mod.valeur}
                      onChange={e => majModificateur(index, 'valeur', parseInt(e.target.value) || 0)}
                      className="bg-gray-600 text-white px-2 py-1 rounded-lg text-xs outline-none w-16 text-center"
                    />

                    <button
                      onClick={() => supprimerModificateur(index)}
                      className="text-red-400 hover:text-red-300 text-xs px-1"
                    >✕</button>
                  </div>
                ))}
              </div>

              <button
                onClick={creerItem}
                disabled={!nom}
                className={`py-2 rounded-lg font-semibold transition
                  ${nom ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
              >
                Créer
              </button>
            </div>
          )}

          {/* Recherche + filtres */}
          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="🔍 Rechercher un item..."
              value={recherche}
              onChange={e => setRecherche(e.target.value)}
              className="bg-gray-800 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-purple-400 max-w-sm"
            />
            <div className="flex gap-2 flex-wrap">
              {['Tous', ...CATEGORIES].map(cat => (
                <button
                  key={cat}
                  onClick={() => setFiltreCategorie(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition
                    ${filtreCategorie === cat ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                >
                  {cat !== 'Tous' ? CATEGORIE_EMOJI[cat] : ''} {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Liste items */}
          {itemsFiltres.length === 0 && (
            <p className="text-gray-500 text-sm text-center mt-8">Aucun item trouvé</p>
          )}

          <div className="grid grid-cols-3 gap-3 overflow-y-auto">
            {itemsFiltres.map(item => (
              <div key={item.id} className="bg-gray-800 p-4 rounded-xl flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{CATEGORIE_EMOJI[item.categorie]}</span>
                    <p className="font-semibold">{item.nom}</p>
                  </div>
                  <button onClick={() => supprimerItem(item.id)} className="text-gray-600 hover:text-red-400 transition text-sm">🗑️</button>
                </div>
                <span className="text-xs bg-gray-700 px-2 py-0.5 rounded-lg text-gray-400 w-fit">{item.categorie}</span>
                {item.description && <p className="text-gray-400 text-xs">{item.description}</p>}
                {/* Modificateurs */}
                {itemModifs[item.id]?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {itemModifs[item.id].map((m, i) => (
                      <span key={i} className="text-xs bg-purple-900 text-purple-300 px-2 py-0.5 rounded-lg">
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