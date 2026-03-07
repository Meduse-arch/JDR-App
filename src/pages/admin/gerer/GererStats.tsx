import { useState } from 'react'
import { supabase } from '../../../supabase'

type Personnage = {
  id: string
  nom: string
  est_pnj: boolean
  hp_actuel: number
  hp_max: number
  mana_actuel: number
  mana_max: number
  stam_actuel: number
  stam_max: number
}

type Stat = { id: string; nom: string; description: string }
type PersonnageStat = { id_stat: string; valeur: number }

type Props = {
  personnage: Personnage
  stats: Stat[]
  personnageStats: PersonnageStat[]
  onUpdate: (p: Personnage) => void
}

export default function GererStats({ personnage, stats, personnageStats, onUpdate }: Props) {
  const [modifications, setModifications] = useState<Record<string, number>>({})
  const [chargement, setChargement] = useState(false)
  const [message, setMessage] = useState('')

  const getValeur = (idStat: string) => {
    const base = personnageStats.find(s => s.id_stat === idStat)?.valeur ?? 0
    return base + (modifications[idStat] ?? 0)
  }

  const modifierStat = (idStat: string, delta: number) => {
    setModifications(prev => ({ ...prev, [idStat]: (prev[idStat] ?? 0) + delta }))
  }

  const saisirDelta = (idStat: string, val: string) => {
    const n = parseInt(val)
    setModifications(prev => ({ ...prev, [idStat]: isNaN(n) ? 0 : n }))
  }

  const calculerRessources = (statsMap: Record<string, number>) => {
    const constitution = statsMap['Constitution'] ?? 0
    const intelligence = statsMap['Intelligence'] ?? 0
    const force = statsMap['Force'] ?? 0
    const agilite = statsMap['Agilité'] ?? 0
    return {
      hp_max: constitution * 4,
      mana_max: intelligence * 10,
      stam_max: Math.round(((force + agilite + constitution) / 3) * 10),
    }
  }

  const appliquer = async () => {
    setChargement(true)
    setMessage('')

    const statsMap: Record<string, number> = {}
    for (const stat of stats) statsMap[stat.nom] = getValeur(stat.id)

    for (const [idStat, delta] of Object.entries(modifications)) {
      if (delta === 0) continue
      const ancienne = personnageStats.find(s => s.id_stat === idStat)
      if (ancienne) {
        await supabase
          .from('personnage_stats')
          .update({ valeur: ancienne.valeur + delta })
          .eq('id_personnage', personnage.id)
          .eq('id_stat', idStat)
      }
    }

    const { hp_max, mana_max, stam_max } = calculerRessources(statsMap)
    const hp_actuel = Math.min(personnage.hp_actuel, hp_max)
    const mana_actuel = Math.min(personnage.mana_actuel, mana_max)
    const stam_actuel = Math.min(personnage.stam_actuel, stam_max)

    await supabase.from('personnages')
      .update({ hp_max, hp_actuel, mana_max, mana_actuel, stam_max, stam_actuel })
      .eq('id', personnage.id)

    setMessage('✅ Stats mises à jour !')
    setModifications({})
    onUpdate({ ...personnage, hp_max, hp_actuel, mana_max, mana_actuel, stam_max, stam_actuel })
    setChargement(false)
  }

  const aDesModifs = Object.values(modifications).some(v => v !== 0)

  return (
    <div className="flex flex-col gap-4">
      {/* Ressources */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '❤️ PV', val: personnage.hp_max },
          { label: '💧 Mana', val: personnage.mana_max },
          { label: '⚡ Stamina', val: personnage.stam_max },
        ].map(r => (
          <div key={r.label} className="bg-gray-800 rounded-lg px-4 py-2 text-center">
            <p className="text-xs text-gray-400">{r.label}</p>
            <p className="text-lg font-bold text-purple-400">{r.val}</p>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map(stat => {
          const delta = modifications[stat.id] ?? 0
          const valeurFinale = getValeur(stat.id)
          return (
            <div key={stat.id} className="bg-gray-800 p-4 rounded-xl flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">{stat.nom}</p>
                  <p className="text-gray-500 text-xs">{stat.description}</p>
                </div>
                <span className={`text-2xl font-bold ${delta !== 0 ? 'text-yellow-400' : 'text-purple-400'}`}>
                  {valeurFinale}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => modifierStat(stat.id, -1)} className="bg-gray-700 hover:bg-red-700 w-8 h-8 rounded-lg font-bold transition text-sm">−</button>
                <input
                  type="number"
                  value={delta === 0 ? '' : delta}
                  placeholder="±0"
                  onChange={e => saisirDelta(stat.id, e.target.value)}
                  className="flex-1 bg-gray-700 text-white text-center px-2 py-1 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-400"
                />
                <button onClick={() => modifierStat(stat.id, +1)} className="bg-gray-700 hover:bg-green-700 w-8 h-8 rounded-lg font-bold transition text-sm">+</button>
              </div>
              {delta !== 0 && (
                <p className="text-xs text-center text-yellow-400">
                  {delta > 0 ? `+${delta}` : delta} par rapport à la valeur actuelle
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* Boutons */}
      <div className="flex gap-3 mt-2">
        <button
          onClick={appliquer}
          disabled={!aDesModifs || chargement}
          className={`flex-1 py-3 rounded-lg font-semibold transition
            ${aDesModifs && !chargement ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
        >
          {chargement ? 'Application...' : 'Appliquer les modifications'}
        </button>
        {aDesModifs && (
          <button onClick={() => setModifications({})} className="px-4 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 transition text-sm">
            Annuler
          </button>
        )}
      </div>
      {message && <p className="text-center text-green-400 text-sm">{message}</p>}
    </div>
  )
}