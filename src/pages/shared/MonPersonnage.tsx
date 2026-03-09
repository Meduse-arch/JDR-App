import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'
import CreerPersonnage from './CreerPersonnage'
import { usePersonnage } from '../../hooks/usePersonnage'
import { useStats } from '../../hooks/useStats'
import { calculPourcentage } from '../../utils/math'

type RessourceKey = 'hp' | 'mana' | 'stam'

export default function MonPersonnage() {
  const compte = useStore(s => s.compte)
  const pnjControle = useStore(s => s.pnjControle)
  const setPnjControle = useStore(s => s.setPnjControle)

  const { personnage, chargement: chargementPerso, rechargerPersonnage } = usePersonnage()
  const { stats, chargement: chargementStats } = useStats()

  const [deltas, setDeltas] = useState<Record<RessourceKey, string>>({ hp: '', mana: '', stam: '' })
  const [message, setMessage] = useState('')
  const [pseudoJoueur, setPseudoJoueur] = useState<string | null>(null)

  useEffect(() => {
    if (personnage?.lie_au_compte) {
      supabase.from('comptes').select('pseudo').eq('id', personnage.lie_au_compte).single()
        .then(({ data }) => { if (data) setPseudoJoueur(data.pseudo) })
    }
  }, [personnage])

  const supprimerPersonnage = async () => {
    if (!personnage) return
    // (J'ai gardé ta logique de suppression intacte)
    await supabase.from('session_joueurs').delete().eq('id_personnage', personnage.id)
    await supabase.from('personnage_stats').delete().eq('id_personnage', personnage.id)
    await supabase.from('inventaire').delete().eq('id_personnage', personnage.id)
    await supabase.from('personnage_competences').delete().eq('id_personnage', personnage.id)
    await supabase.from('personnages').delete().eq('id', personnage.id)
    if (pnjControle) setPnjControle(null)
    rechargerPersonnage()
  }

  const appliquerDelta = async (key: RessourceKey) => {
    if (!personnage) return
    const delta = parseInt(deltas[key])
    if (isNaN(delta) || delta === 0) return

    const champActuel = `${key}_actuel` as keyof typeof personnage
    const champMax = `${key}_max` as keyof typeof personnage
    const actuel = personnage[champActuel] as number
    const max = personnage[champMax] as number

    const nouveau = Math.max(0, Math.min(max, actuel + delta))

    await supabase.from('personnages').update({ [champActuel]: nouveau }).eq('id', personnage.id)

    if (pnjControle && pnjControle.id === personnage.id) {
      setPnjControle({ ...pnjControle, [champActuel]: nouveau } as any)
    }
    
    rechargerPersonnage()
    setDeltas(prev => ({ ...prev, [key]: '' }))
    setMessage(`✨ Mise à jour réussie`)
    setTimeout(() => setMessage(''), 2000)
  }

  if (chargementPerso || chargementStats) return (
    <div className="flex items-center justify-center h-full text-gray-500 animate-pulse">
      Ouverture du grimoire...
    </div>
  )

  if (!personnage && compte?.role === 'joueur') return <CreerPersonnage estPnj={false} retour={() => rechargerPersonnage()} />
  if (!personnage && compte?.role === 'admin') return <div className="flex items-center justify-center h-full text-gray-400">Prends le contrôle d'un PNJ depuis la page PNJ</div>
  if (!personnage) return null

  // 🎨 Nouvelles couleurs avec des gradients
  const ressources = [
    { label: 'Points de vie', emoji: '❤️', actuel: personnage.hp_actuel, max: personnage.hp_max, textCol: 'text-red-400', bgCol: 'bg-red-500/10', gradient: 'from-red-600 to-red-400', rKey: 'hp' as RessourceKey },
    { label: 'Mana', emoji: '💧', actuel: personnage.mana_actuel, max: personnage.mana_max, textCol: 'text-blue-400', bgCol: 'bg-blue-500/10', gradient: 'from-blue-600 to-blue-400', rKey: 'mana' as RessourceKey },
    { label: 'Stamina', emoji: '⚡', actuel: personnage.stam_actuel, max: personnage.stam_max, textCol: 'text-yellow-400', bgCol: 'bg-yellow-500/10', gradient: 'from-yellow-600 to-yellow-400', rKey: 'stam' as RessourceKey },
  ]

  return (
    <div className="flex flex-col h-full text-white p-6 md:p-10 overflow-y-auto custom-scrollbar">
      
      {/* 👑 HEADER STYLISÉ */}
      <div className="flex justify-between items-end mb-10 pb-6 border-b border-gray-800">
        <div>
          <h2 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500 tracking-tight">
            {personnage.nom}
          </h2>
          {pnjControle && (
            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${personnage.est_pnj ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'}`}>
              {personnage.est_pnj ? 'Personnage Non Joueur' : `Joué par : ${pseudoJoueur ?? '...'}`}
            </span>
          )}
        </div>
        
        <div className="flex flex-col items-end gap-2">
          {message && <span className="text-green-400 text-sm font-semibold animate-bounce">{message}</span>}
          <button onClick={supprimerPersonnage} className="text-gray-500 hover:text-red-400 hover:bg-red-400/10 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300">
            Supprimer la fiche
          </button>
        </div>
      </div>

      {/* ❤️ BARRES DE RESSOURCES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
        {ressources.map(r => (
          <div key={r.rKey} className={`relative p-6 rounded-3xl ${r.bgCol} border border-gray-800/50 backdrop-blur-sm flex flex-col gap-4 overflow-hidden group`}>
            
            {/* Effet de brillance en fond */}
            <div className={`absolute -top-10 -right-10 w-32 h-32 ${r.bgCol} rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-500`}></div>

            <div className="relative z-10 flex justify-between items-center">
              <span className="text-gray-300 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                <span className="text-xl">{r.emoji}</span> {r.label}
              </span>
              <div className="flex items-baseline gap-1">
                <span className={`text-3xl font-black ${r.textCol}`}>{r.actuel}</span>
                <span className="text-gray-500 font-bold">/ {r.max}</span>
              </div>
            </div>

            {/* Barre de progression avec Gradient */}
            <div className="relative z-10 w-full bg-gray-900/80 rounded-full h-4 shadow-inner overflow-hidden border border-gray-800">
              <div 
                className={`h-full rounded-full bg-gradient-to-r ${r.gradient} transition-all duration-700 ease-out relative`} 
                style={{ width: `${calculPourcentage(r.actuel, r.max)}%` }}
              >
                {/* Petit reflet sur la barre */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-white/20 rounded-full"></div>
              </div>
            </div>

            {/* Contrôles intégrés plus discrets */}
            <div className="relative z-10 flex items-center bg-gray-900/50 p-1 rounded-xl border border-gray-800 mt-2">
              <button onClick={() => setDeltas(prev => ({ ...prev, [r.rKey]: String((parseInt(prev[r.rKey]) || 0) - 1) }))} className="text-gray-400 hover:text-white hover:bg-white/10 w-10 h-8 rounded-lg font-black transition text-lg">−</button>
              <input type="number" value={deltas[r.rKey]} placeholder="±0" onChange={e => setDeltas(prev => ({ ...prev, [r.rKey]: e.target.value }))} className="flex-1 bg-transparent text-white text-center font-bold text-sm outline-none" />
              <button onClick={() => setDeltas(prev => ({ ...prev, [r.rKey]: String((parseInt(prev[r.rKey]) || 0) + 1) }))} className="text-gray-400 hover:text-white hover:bg-white/10 w-10 h-8 rounded-lg font-black transition text-lg">+</button>
              
              <div className="w-px h-6 bg-gray-700 mx-1"></div>
              
              <button onClick={() => appliquerDelta(r.rKey)} disabled={!deltas[r.rKey] || deltas[r.rKey] === '0'} className={`w-10 h-8 rounded-lg font-bold transition flex items-center justify-center ${deltas[r.rKey] && deltas[r.rKey] !== '0' ? 'text-purple-400 hover:bg-purple-500/20' : 'text-gray-600 cursor-not-allowed'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 🛡️ STATISTIQUES */}
      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
        <span className="bg-gray-800 p-2 rounded-lg border border-gray-700">🛡️</span> 
        Attributs & Statistiques
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {stats.map(stat => (
          <div key={stat.nom} className="bg-gray-800/40 hover:bg-gray-800 p-5 rounded-2xl flex flex-col justify-center items-center gap-2 border border-gray-700/50 hover:border-purple-500/50 transition-all duration-300 group cursor-default">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-widest group-hover:text-gray-300 transition-colors">{stat.nom}</span>
            <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 group-hover:from-purple-300 group-hover:to-purple-600 transition-all">
              {stat.valeur}
            </span>
          </div>
        ))}
      </div>

    </div>
  )
}