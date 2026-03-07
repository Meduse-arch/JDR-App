import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'

type Item = { id: string; nom: string; description: string; categorie: string }
type Modificateur = { type: string; id_stat: string | null; valeur: number }
type InventaireEntry = { id: string; quantite: number; equipe: boolean; items: Item }
type Stat = { id: string; nom: string }

const CATEGORIE_EMOJI: Record<string, string> = {
  Arme: '⚔️', Armure: '🛡️', Bijou: '💍', Consommable: '🧪', 'Artéfact': '✨', Divers: '📦'
}

const CATEGORIES = ['Arme', 'Armure', 'Bijou', 'Consommable', 'Artéfact', 'Divers']

export default function MonInventaire() {
  const compte = useStore(s => s.compte)
  const sessionActive = useStore(s => s.sessionActive)
  const pnjControle = useStore(s => s.pnjControle)

  const [inventaire, setInventaire] = useState<InventaireEntry[]>([])
  const [itemModifs, setItemModifs] = useState<Record<string, Modificateur[]>>({})
  const [stats, setStats] = useState<Stat[]>([])
  const [filtreCategorie, setFiltreCategorie] = useState('Tous')
  const [recherche, setRecherche] = useState('')
  const [message, setMessage] = useState('')
  const [personnageId, setPersonnageId] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('stats').select('id, nom').then(({ data }) => { if (data) setStats(data) })
    chargerPersonnage()
  }, [pnjControle, sessionActive])

  const chargerPersonnage = async () => {
    if (pnjControle) {
      setPersonnageId(pnjControle.id)
      chargerInventaire(pnjControle.id)
      return
    }
    if (!sessionActive || !compte) return
    const { data } = await supabase
      .from('session_joueurs')
      .select('personnages(*)')
      .eq('id_session', sessionActive.id)
    if (data) {
      const perso = data
        .map((d: any) => d.personnages)
        .find((p: any) => p.lie_au_compte === compte.id && !p.est_pnj)
      if (perso) {
        setPersonnageId(perso.id)
        chargerInventaire(perso.id)
      }
    }
  }

  const chargerInventaire = async (idPersonnage: string) => {
    const { data } = await supabase
      .from('inventaire')
      .select('id, quantite, equipe, items(id, nom, description, categorie)')
      .eq('id_personnage', idPersonnage)
    if (data) {
      setInventaire(data as any)
      for (const entry of data as any[]) {
        const { data: modifs } = await supabase
          .from('item_modificateurs')
          .select('*')
          .eq('id_item', entry.items.id)
        if (modifs) setItemModifs(prev => ({ ...prev, [entry.items.id]: modifs }))
      }
    }
  }

  const afficherMessage = (msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(''), 2500)
  }

 const utiliserItem = async (entry: InventaireEntry) => {
    if (!personnageId) return

    const { data: modifs } = await supabase
      .from('item_modificateurs')
      .select('*')
      .eq('id_item', entry.items.id)

    const listeModifs = modifs ?? []

    if (listeModifs.length > 0) {
      const { data: perso } = await supabase
        .from('personnages')
        .select('hp_actuel, hp_max, mana_actuel, mana_max, stam_actuel, stam_max')
        .eq('id', personnageId)
        .single()

      const updates: Record<string, number> = {}
      let aBesoinDetreUtilise = false // 👈 On ajoute un flag

      for (const mod of listeModifs) {
        if (mod.type === 'stat') {
          // ... (ton code pour les stats reste identique)
          aBesoinDetreUtilise = true 
        } else if (perso) {
          const estMax = mod.type.endsWith('_max')
          const champActuel = estMax ? mod.type : `${mod.type}_actuel`
          const champMax = estMax ? mod.type : `${mod.type}_max`
          
          // On force la conversion en nombres pour éviter les bugs de calcul
          const actuel = Number((perso as any)[champActuel] ?? 0)
          const valeurModif = Number(mod.valeur)
          const max = Number((perso as any)[champMax] ?? actuel + valeurModif)
          
          const nouvelleValeur = estMax
            ? actuel + valeurModif
            : Math.max(0, Math.min(max, actuel + valeurModif))
          
          // 🛑 DEBUGGING : Regarde ce qui s'affiche dans ta console (F12)
          console.log(`[DEBUG] ${champActuel} -> Actuel en BDD: ${actuel} | Max en BDD: ${max} | Bonus: ${valeurModif} | Résultat prévu: ${nouvelleValeur}`)
          
          if (nouvelleValeur !== actuel) {
            updates[champActuel] = nouvelleValeur
            aBesoinDetreUtilise = true
          }
        }
      }
      // 👈 Si l'item n'a aucun effet (ex: PV déjà au max), on annule
      if (!aBesoinDetreUtilise) {
        afficherMessage(`⚠️ Inutile, tes stats sont déjà au max !`)
        return
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('personnages')
          .update(updates)
          .eq('id', personnageId)
        
        if (error) {
          afficherMessage(`❌ Erreur lors de l'utilisation`)
          return
        }
      }
    }

    // On consomme l'item uniquement s'il a eu un effet
    if (entry.quantite <= 1) {
      await supabase.from('inventaire').delete().eq('id', entry.id)
    } else {
      await supabase.from('inventaire').update({ quantite: entry.quantite - 1 }).eq('id', entry.id)
    }

    afficherMessage(`✅ ${entry.items.nom} utilisé !`)
    chargerInventaire(personnageId)
  }

  const toggleEquiper = async (entry: InventaireEntry) => {
    await supabase.from('inventaire').update({ equipe: !entry.equipe }).eq('id', entry.id)
    afficherMessage(entry.equipe ? `🔓 ${entry.items.nom} déséquipé` : `⚔️ ${entry.items.nom} équipé !`)
    chargerInventaire(personnageId!)
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

  const equipes = inventaireFiltré.filter(e => e.equipe)
  const nonEquipes = inventaireFiltré.filter(e => !e.equipe)

  if (!personnageId) return (
    <div className="flex items-center justify-center h-full text-gray-400">
      {compte?.role === 'admin' || compte?.role === 'mj'
        ? "Prends le contrôle d'un personnage depuis la page PNJ"
        : "Rejoins une session et crée un personnage d'abord"}
    </div>
  )

  return (
    <div className="flex flex-col h-full text-white p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-purple-400">🎒 Inventaire</h2>
        {message && <span className="text-green-400 text-sm">{message}</span>}
      </div>

      <div className="flex flex-col gap-3 mb-4">
        <input
          type="text"
          placeholder="🔍 Rechercher un item..."
          value={recherche}
          onChange={e => setRecherche(e.target.value)}
          className="bg-gray-800 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-purple-400 max-w-sm text-sm"
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

      {inventaire.length === 0 && (
        <p className="text-gray-500 text-center mt-16">Inventaire vide</p>
      )}

      {equipes.length > 0 && (
        <div className="mb-6">
          <p className="text-xs uppercase font-semibold text-gray-400 mb-3">⚔️ Équipé</p>
          <div className="grid grid-cols-2 gap-3">
            {equipes.map(entry => (
              <ItemCard key={entry.id} entry={entry} onUtiliser={utiliserItem} onEquiper={toggleEquiper} labelModif={labelModif} modifs={itemModifs[entry.items.id] ?? []} />
            ))}
          </div>
        </div>
      )}

      {nonEquipes.length > 0 && (
        <div>
          {equipes.length > 0 && <p className="text-xs uppercase font-semibold text-gray-400 mb-3">📦 Sac</p>}
          <div className="grid grid-cols-2 gap-3">
            {nonEquipes.map(entry => (
              <ItemCard key={entry.id} entry={entry} onUtiliser={utiliserItem} onEquiper={toggleEquiper} labelModif={labelModif} modifs={itemModifs[entry.items.id] ?? []} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ItemCard({ entry, onUtiliser, onEquiper, labelModif, modifs }: {
  entry: InventaireEntry
  onUtiliser: (e: InventaireEntry) => void
  onEquiper: (e: InventaireEntry) => void
  labelModif: (m: Modificateur) => string
  modifs: Modificateur[]
}) {
  const estConsommable = entry.items.categorie === 'Consommable'

  return (
    <div className={`bg-gray-800 p-4 rounded-xl flex flex-col gap-2 border-2 transition
      ${entry.equipe ? 'border-purple-500' : 'border-transparent'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{CATEGORIE_EMOJI[entry.items.categorie]}</span>
          <div>
            <p className="font-semibold">{entry.items.nom}</p>
            <span className="text-xs text-gray-400">{entry.items.categorie}</span>
          </div>
        </div>
        <span className="text-purple-400 font-bold text-sm">x{entry.quantite}</span>
      </div>

      {entry.items.description && (
        <p className="text-gray-400 text-xs">{entry.items.description}</p>
      )}

      {modifs.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {modifs.map((m, i) => (
            <span key={i} className="text-xs bg-purple-900 text-purple-300 px-2 py-0.5 rounded-lg">
              {labelModif(m)}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-1">
        {estConsommable ? (
          <button
            onClick={() => onUtiliser(entry)}
            className="flex-1 bg-green-700 hover:bg-green-600 px-3 py-1 rounded-lg text-xs font-semibold transition"
          >
            🧪 Utiliser
          </button>
        ) : (
          <button
            onClick={() => onEquiper(entry)}
            className={`flex-1 px-3 py-1 rounded-lg text-xs font-semibold transition
              ${entry.equipe ? 'bg-purple-700 hover:bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'}`}
          >
            {entry.equipe ? '✓ Équipé' : 'Équiper'}
          </button>
        )}
      </div>
    </div>
  )
}