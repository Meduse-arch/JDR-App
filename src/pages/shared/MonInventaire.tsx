import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'
import { useInventaire, ItemInventaire } from '../../hooks/useInventaire'
import { usePersonnage } from '../../hooks/usePersonnage'
import { inventaireService } from '../../services/inventaireService'

type Modificateur = { type: string; id_stat: string | null; valeur: number }
type Stat = { id: string; nom: string }

const CATEGORIE_EMOJI: Record<string, string> = {
  Arme: '⚔️', Armure: '🛡️', Bijou: '💍', Consommable: '🧪', 'Artéfact': '✨', Divers: '📦'
}
const CATEGORIES = ['Arme', 'Armure', 'Bijou', 'Consommable', 'Artéfact', 'Divers']

export default function MonInventaire() {
  const compte = useStore(s => s.compte)
  const pnjControle = useStore(s => s.pnjControle)
  const setPnjControle = useStore(s => s.setPnjControle)

  const { inventaire, chargement: chargementInv, rechargerInventaire } = useInventaire()
  const { personnage } = usePersonnage()

  const [itemModifs, setItemModifs] = useState<Record<string, Modificateur[]>>({})
  const [statsInfo, setStatsInfo] = useState<Stat[]>([])
  const [filtreCategorie, setFiltreCategorie] = useState('Tous')
  const [recherche, setRecherche] = useState('')
  const [message, setMessage] = useState('')

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
      if (Object.keys(nouveauxModifs).length > 0) setItemModifs(prev => ({ ...prev, ...nouveauxModifs }))
    }
    if (inventaire.length > 0) chargerModifs()
  }, [inventaire])

  const afficherMessage = (msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(''), 2500)
  }

  const utiliserItem = async (entry: ItemInventaire) => {
    if (!personnage) return
    const listeModifs = itemModifs[entry.items.id] || []
    
    if (listeModifs.length > 0) {
      const updates: Record<string, number> = {}
      let aBesoinDetreUtilise = false

      for (const mod of listeModifs) {
        if (mod.type === 'stat') {
          aBesoinDetreUtilise = true 
        } else {
          const estMax = mod.type.endsWith('_max')
          const champActuel = estMax ? mod.type : `${mod.type}_actuel`
          const champMax = estMax ? mod.type : `${mod.type}_max`
          
          const actuel = Number((personnage as any)[champActuel] ?? 0)
          const valeurModif = Number(mod.valeur)
          const max = Number((personnage as any)[champMax] ?? actuel + valeurModif)
          
          const nouvelleValeur = estMax ? actuel + valeurModif : Math.max(0, Math.min(max, actuel + valeurModif))
          
          if (nouvelleValeur !== actuel) {
            updates[champActuel] = nouvelleValeur
            aBesoinDetreUtilise = true
          }
        }
      }

      if (!aBesoinDetreUtilise) return afficherMessage(`⚠️ Inutile, stats déjà au max !`)

      if (Object.keys(updates).length > 0) {
        await supabase.from('personnages').update(updates).eq('id', personnage.id)
        if (pnjControle && pnjControle.id === personnage.id) setPnjControle({ ...pnjControle, ...updates } as any)
      }
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
    const labels: Record<string, string> = { hp: '❤️ PV', mana: '💧 Mana', stam: '⚡ Stam', hp_max: '❤️ PV max', mana_max: '💧 Mana max', stam_max: '⚡ Stam max' }
    return `${m.valeur > 0 ? '+' : ''}${m.valeur} ${labels[m.type] ?? m.type}`
  }

  if (chargementInv) return <div className="flex items-center justify-center h-full text-gray-500 animate-pulse">Fouille du sac en cours...</div>
  if (!personnage) return <div className="flex items-center justify-center h-full text-gray-400">Aucun personnage sélectionné.</div>

  const inventaireFiltré = inventaire
    .filter(e => filtreCategorie === 'Tous' || e.items.categorie === filtreCategorie)
    .filter(e => e.items.nom.toLowerCase().includes(recherche.toLowerCase()))

  const equipes = inventaireFiltré.filter(e => e.equipe)
  const nonEquipes = inventaireFiltré.filter(e => !e.equipe)

  return (
    <div className="flex flex-col h-full text-white p-4 md:p-8 lg:p-10 overflow-y-auto custom-scrollbar">
      
      {/* 👑 HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 pb-6 border-b border-gray-800 gap-4">
        <h2 className="text-3xl md:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-500 tracking-tight">
          Sac Aventure
        </h2>
        {message && <span className="text-emerald-400 text-sm font-bold bg-emerald-900/20 border border-emerald-500/30 px-4 py-2 rounded-xl animate-pulse">{message}</span>}
      </div>

      {/* 🔍 BARRE DE RECHERCHE ET FILTRES */}
      <div className="flex flex-col gap-4 mb-8">
        <input 
          type="text" 
          placeholder="🔍 Rechercher dans le sac..." 
          value={recherche} 
          onChange={e => setRecherche(e.target.value)} 
          className="w-full md:max-w-md bg-gray-900/50 backdrop-blur-sm text-white px-5 py-3 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/50 border border-gray-700/50 shadow-inner transition-all" 
        />
        <div className="flex gap-2 flex-wrap">
          {['Tous', ...CATEGORIES].map(cat => (
            <button key={cat} onClick={() => setFiltreCategorie(cat)} 
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 border backdrop-blur-sm 
              ${filtreCategorie === cat ? 'bg-gradient-to-r from-emerald-600 to-teal-500 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-gray-800/40 border-gray-700/50 text-gray-400 hover:text-white hover:bg-gray-700/60'}`}>
              {cat !== 'Tous' && <span className="mr-1">{CATEGORIE_EMOJI[cat]}</span>} {cat}
            </button>
          ))}
        </div>
      </div>

      {inventaire.length === 0 && <div className="flex flex-col items-center justify-center mt-20 opacity-50"><span className="text-6xl mb-4">🕸️</span><p className="text-lg font-bold">Le sac est totalement vide.</p></div>}

      {/* ⚔️ ÉQUIPEMENT ACTIF */}
      {equipes.length > 0 && (
        <div className="mb-10">
          <p className="text-xs uppercase font-black text-emerald-500 mb-4 tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Équipement Actif
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {equipes.map(entry => <ItemCard key={entry.id} entry={entry} onUtiliser={utiliserItem} onEquiper={toggleEquiper} labelModif={labelModif} modifs={itemModifs[entry.items.id] ?? []} />)}
          </div>
        </div>
      )}

      {/* 📦 CONTENU DU SAC */}
      {nonEquipes.length > 0 && (
        <div>
          {equipes.length > 0 && <p className="text-xs uppercase font-black text-gray-500 mb-4 tracking-widest">📦 Reste du sac</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {nonEquipes.map(entry => <ItemCard key={entry.id} entry={entry} onUtiliser={utiliserItem} onEquiper={toggleEquiper} labelModif={labelModif} modifs={itemModifs[entry.items.id] ?? []} />)}
          </div>
        </div>
      )}
    </div>
  )
}

function ItemCard({ entry, onUtiliser, onEquiper, labelModif, modifs }: { entry: ItemInventaire, onUtiliser: (e: ItemInventaire) => void, onEquiper: (e: ItemInventaire) => void, labelModif: (m: Modificateur) => string, modifs: Modificateur[] }) {
  const estConsommable = entry.items.categorie === 'Consommable'

  return (
    <div className={`relative bg-gray-800/40 backdrop-blur-md p-5 rounded-3xl flex flex-col gap-3 border transition-all duration-300 group hover:-translate-y-1
      ${entry.equipe ? 'border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)] bg-emerald-900/10' : 'border-gray-700/50 hover:border-gray-600 hover:shadow-xl hover:bg-gray-800/60'}`}>
      
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 flex items-center justify-center bg-gray-900/50 rounded-2xl border border-gray-700/50 shadow-inner text-2xl">
            {CATEGORIE_EMOJI[entry.items.categorie]}
          </div>
          <div>
            <p className="font-bold text-gray-100 leading-tight line-clamp-1">{entry.items.nom}</p>
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{entry.items.categorie}</span>
          </div>
        </div>
        <span className="bg-gray-900/80 border border-gray-700 text-gray-300 font-black text-xs px-2.5 py-1 rounded-xl shadow-inner">x{entry.quantite}</span>
      </div>

      {entry.items.description && <p className="text-gray-400 text-xs italic line-clamp-2 mt-1">{entry.items.description}</p>}

      {modifs.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {modifs.map((m, i) => (
            <span key={i} className="text-[10px] font-bold uppercase bg-gray-900/50 border border-gray-700 text-gray-300 px-2 py-1 rounded-lg">
              {labelModif(m)}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-auto pt-3">
        {estConsommable ? (
          <button onClick={() => onUtiliser(entry)} className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-900/20">
            Utiliser
          </button>
        ) : (
          <button onClick={() => onEquiper(entry)} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border backdrop-blur-sm
            ${entry.equipe 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-400' 
              : 'bg-gray-900/50 text-gray-300 border-gray-700 hover:bg-gray-700 hover:text-white'}`}>
            {entry.equipe ? 'Ranger' : 'Équiper'}
          </button>
        )}
      </div>
    </div>
  )
}