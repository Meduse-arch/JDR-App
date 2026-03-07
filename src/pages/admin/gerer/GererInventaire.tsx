import { useEffect, useState } from 'react'
import { supabase } from '../../../supabase'
import { useStore } from '../../../store/useStore'

type Personnage = { id: string; nom: string; est_pnj: boolean }
type Item = { id: string; nom: string; description: string; categorie: string }
type InventaireEntry = { id: string; quantite: number; items: Item }
type Modificateur = { type: string; id_stat: string | null; valeur: number }
type Props = { personnage: Personnage }

const CATEGORIES = ['Arme', 'Armure', 'Bijou', 'Consommable', 'Artéfact', 'Divers']

const CATEGORIE_EMOJI: Record<string, string> = {
  Arme: '⚔️', Armure: '🛡️', Bijou: '💍', Consommable: '🧪', 'Artéfact': '✨', Divers: '📦'
}

export default function GererInventaire({ personnage }: Props) {
  const sessionActive = useStore(s => s.sessionActive)

  const [inventaire, setInventaire] = useState<InventaireEntry[]>([])
  const [itemsBibliotheque, setItemsBibliotheque] = useState<Item[]>([])
  const [onglet, setOnglet] = useState<'inventaire' | 'ajouter'>('inventaire')
  const [itemSelectionne, setItemSelectionne] = useState<string>('')
  const [quantiteAjout, setQuantiteAjout] = useState(1)
  const [filtreCategorie, setFiltreCategorie] = useState('Tous')
  const [recherche, setRecherche] = useState('')
  const [rechercheAjout, setRechercheAjout] = useState('')
  const [message, setMessage] = useState('')
  const [itemModifs, setItemModifs] = useState<Record<string, Modificateur[]>>({})
  const [stats, setStats] = useState<{ id: string; nom: string }[]>([])

  useEffect(() => {
    chargerInventaire()
    chargerBibliotheque()
    supabase.from('stats').select('id, nom').then(({ data }) => { if (data) setStats(data) })
  }, [personnage])

  const chargerInventaire = async () => {
    const { data } = await supabase
      .from('inventaire')
      .select('id, quantite, items(id, nom, description, categorie)')
      .eq('id_personnage', personnage.id)
    if (data) setInventaire(data as any)
  }

  const chargerBibliotheque = async () => {
    if (!sessionActive) return
    const { data } = await supabase
      .from('items')
      .select('*')
      .eq('id_session', sessionActive.id)
      .order('nom')
    if (data) {
      setItemsBibliotheque(data)
      for (const item of data) {
        const { data: modifs } = await supabase
          .from('item_modificateurs')
          .select('*')
          .eq('id_item', item.id)
        if (modifs) setItemModifs(prev => ({ ...prev, [item.id]: modifs }))
      }
    }
  }

  const afficherMessage = (msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(''), 2500)
  }

  const ajouterItem = async () => {
    if (!itemSelectionne) return
    const existing = inventaire.find(e => e.items.id === itemSelectionne)
    if (existing) {
      await supabase.from('inventaire').update({ quantite: existing.quantite + quantiteAjout }).eq('id', existing.id)
    } else {
      await supabase.from('inventaire').insert({ id_personnage: personnage.id, id_item: itemSelectionne, quantite: quantiteAjout })
    }
    afficherMessage('✅ Item ajouté !')
    setItemSelectionne('')
    setQuantiteAjout(1)
    chargerInventaire()
  }

  const retirerItem = async (entryId: string, quantiteActuelle: number) => {
    if (quantiteActuelle <= 1) {
      await supabase.from('inventaire').delete().eq('id', entryId)
    } else {
      await supabase.from('inventaire').update({ quantite: quantiteActuelle - 1 }).eq('id', entryId)
    }
    chargerInventaire()
  }

  const supprimerItem = async (entryId: string) => {
    await supabase.from('inventaire').delete().eq('id', entryId)
    chargerInventaire()
  }

  const labelModif = (m: Modificateur) => {
    if (m.type === 'stat') {
      const stat = stats.find(s => s.id === m.id_stat)
      return `${m.valeur > 0 ? '+' : ''}${m.valeur} ${stat?.nom ?? '?'}`
    }
    const labels: Record<string, string> = {
      hp: '❤️ PV', mana: '💧 Mana', stam: '⚡ Stam',
      hp_max: '❤️ PV max', mana_max: '💧 Mana max', stam_max: '⚡ Stam max'
    }
    return `${m.valeur > 0 ? '+' : ''}${m.valeur} ${labels[m.type] ?? m.type}`
  }

  const inventaireFiltré = inventaire
    .filter(e => filtreCategorie === 'Tous' || e.items.categorie === filtreCategorie)
    .filter(e => e.items.nom.toLowerCase().includes(recherche.toLowerCase()))

  const bibliothequeFiltrée = itemsBibliotheque
    .filter(i => i.nom.toLowerCase().includes(rechercheAjout.toLowerCase()))

  return (
    <div className="flex flex-col gap-4">
      {/* Onglets */}
      <div className="flex gap-2">
        {[
          { id: 'inventaire', label: '🎒 Inventaire' },
          { id: 'ajouter', label: '➕ Ajouter' },
        ].map(o => (
          <button
            key={o.id}
            onClick={() => setOnglet(o.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition
              ${onglet === o.id ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
          >
            {o.label}
          </button>
        ))}
        {message && <span className="ml-auto text-green-400 text-sm self-center">{message}</span>}
      </div>

      {/* Inventaire */}
      {onglet === 'inventaire' && (
        <div className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="🔍 Rechercher..."
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            className="bg-gray-700 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-purple-400 max-w-sm text-sm"
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

          {inventaireFiltré.length === 0 && (
            <p className="text-gray-500 text-sm text-center mt-4">Aucun item</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            {inventaireFiltré.map(entry => (
              <div key={entry.id} className="bg-gray-700 p-4 rounded-xl flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span>{CATEGORIE_EMOJI[entry.items.categorie]}</span>
                    <p className="font-semibold">{entry.items.nom}</p>
                    <span className="text-xs bg-gray-600 px-2 py-0.5 rounded-lg text-gray-400">{entry.items.categorie}</span>
                  </div>
                  {entry.items.description && <p className="text-gray-400 text-xs mt-1">{entry.items.description}</p>}
                  <p className="text-purple-400 font-bold mt-1">x{entry.quantite}</p>
                  {itemModifs[entry.items.id]?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {itemModifs[entry.items.id].map((m, i) => (
                        <span key={i} className="text-xs bg-purple-900 text-purple-300 px-2 py-0.5 rounded-lg">
                          {labelModif(m)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1 ml-2">
                  <button onClick={() => retirerItem(entry.id, entry.quantite)} className="bg-gray-600 hover:bg-red-700 px-3 py-1 rounded-lg text-xs transition">−1</button>
                  <button onClick={() => supprimerItem(entry.id)} className="bg-gray-600 hover:bg-red-800 px-3 py-1 rounded-lg text-xs transition text-red-400">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ajouter depuis bibliothèque */}
      {onglet === 'ajouter' && (
        <div className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="🔍 Rechercher un item..."
            value={rechercheAjout}
            onChange={e => setRechercheAjout(e.target.value)}
            className="bg-gray-700 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-purple-400 text-sm"
          />

          {bibliothequeFiltrée.length === 0 && (
            <p className="text-gray-500 text-sm">Aucun item trouvé. Crée des items depuis la page Items !</p>
          )}

          <div className="grid grid-cols-2 gap-3 max-h-72 overflow-y-auto">
            {bibliothequeFiltrée.map(item => (
              <button
                key={item.id}
                onClick={() => setItemSelectionne(item.id)}
                className={`p-3 rounded-xl text-left transition
                  ${itemSelectionne === item.id ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'}`}
              >
                <div className="flex items-center gap-2">
                  <span>{CATEGORIE_EMOJI[item.categorie]}</span>
                  <span className="font-semibold text-sm">{item.nom}</span>
                </div>
                <span className="text-xs text-gray-400">{item.categorie}</span>
                {itemModifs[item.id]?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {itemModifs[item.id].map((m, i) => (
                      <span key={i} className="text-xs bg-purple-900 text-purple-300 px-1 rounded">
                        {labelModif(m)}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>

          {itemSelectionne && (
            <div className="flex items-center gap-3 mt-2">
              <label className="text-gray-400 text-sm">Quantité :</label>
              <button onClick={() => setQuantiteAjout(q => Math.max(1, q - 1))} className="bg-gray-700 hover:bg-gray-600 w-8 h-8 rounded-lg font-bold">−</button>
              <span className="text-lg font-bold text-purple-400 w-8 text-center">{quantiteAjout}</span>
              <button onClick={() => setQuantiteAjout(q => q + 1)} className="bg-gray-700 hover:bg-gray-600 w-8 h-8 rounded-lg font-bold">+</button>
              <button onClick={ajouterItem} className="ml-auto bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm font-semibold transition">
                Ajouter à l'inventaire
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}