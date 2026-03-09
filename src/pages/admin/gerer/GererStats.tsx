import { useState } from 'react'
import { supabase } from '../../../supabase'

type Personnage = {
  id: string; nom: string; est_pnj: boolean
  hp_actuel: number; hp_max: number; mana_actuel: number; mana_max: number
  stam_actuel: number; stam_max: number
}
type Stat           = { id: string; nom: string; description: string }
type PersonnageStat = { id_stat: string; valeur: number }
type Props = {
  personnage: Personnage; stats: Stat[]; personnageStats: PersonnageStat[]
  onUpdate: (p: Personnage) => void
}

export default function GererStats({ personnage, stats, personnageStats, onUpdate }: Props) {
  const [modifications, setModifications] = useState<Record<string, number>>({})
  const [chargement,    setChargement]    = useState(false)
  const [message,       setMessage]       = useState('')

  const getValeur = (idStat: string) =>
    (personnageStats.find(s => s.id_stat === idStat)?.valeur ?? 0) + (modifications[idStat] ?? 0)

  const modifierStat = (idStat: string, delta: number) =>
    setModifications(prev => ({ ...prev, [idStat]: (prev[idStat] ?? 0) + delta }))

  const saisirDelta = (idStat: string, val: string) => {
    const n = parseInt(val)
    setModifications(prev => ({ ...prev, [idStat]: isNaN(n) ? 0 : n }))
  }

  const calculerRessources = (statsMap: Record<string, number>) => ({
    hp_max:   (statsMap['Constitution'] ?? 0) * 4,
    mana_max: (statsMap['Intelligence'] ?? 0) * 10,
    stam_max: Math.round(((statsMap['Force'] ?? 0) + (statsMap['Agilité'] ?? 0) + (statsMap['Constitution'] ?? 0)) / 3 * 10),
  })

  const appliquer = async () => {
    setChargement(true); setMessage('')
    const statsMap: Record<string, number> = {}
    for (const stat of stats) statsMap[stat.nom] = getValeur(stat.id)

    for (const [idStat, delta] of Object.entries(modifications)) {
      if (delta === 0) continue
      const ancienne = personnageStats.find(s => s.id_stat === idStat)
      if (ancienne)
        await supabase.from('personnage_stats')
          .update({ valeur: ancienne.valeur + delta })
          .eq('id_personnage', personnage.id).eq('id_stat', idStat)
    }

    const { hp_max, mana_max, stam_max } = calculerRessources(statsMap)
    const hp_actuel   = Math.min(personnage.hp_actuel, hp_max)
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
  const cardStyle  = { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }

  return (
    <div className="flex flex-col gap-4 sm:gap-5">

      {/* Résumé ressources — 3 colonnes même sur mobile (compact) */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: '❤️ PV',     val: personnage.hp_max   },
          { label: '💧 Mana',   val: personnage.mana_max },
          { label: '⚡ Stam',   val: personnage.stam_max },
        ].map(r => (
          <div key={r.label} className="rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-center" style={cardStyle}>
            <p className="text-[10px] sm:text-xs" style={{ color: 'var(--text-muted)' }}>{r.label}</p>
            <p className="text-lg sm:text-xl font-black" style={{ color: 'var(--color-light)' }}>{r.val}</p>
          </div>
        ))}
      </div>

      {/* Grille stats — 1 colonne mobile, 2 colonnes sm+ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {stats.map(stat => {
          const delta        = modifications[stat.id] ?? 0
          const valeurFinale = getValeur(stat.id)
          return (
            <div key={stat.id} className="p-4 rounded-2xl flex flex-col gap-3" style={cardStyle}>
              <div className="flex justify-between items-center gap-2">
                <div className="min-w-0">
                  <p className="font-bold truncate">{stat.nom}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{stat.description}</p>
                </div>
                <span className="text-2xl font-black shrink-0"
                  style={{ color: delta !== 0 ? '#fbbf24' : 'var(--color-light)' }}>
                  {valeurFinale}
                </span>
              </div>

              {/* Contrôles — boutons 44px sur mobile (touch target recommandé) */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => modifierStat(stat.id, -1)}
                  className="w-11 h-11 sm:w-9 sm:h-9 rounded-xl font-bold text-base transition-all flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.15)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}>
                  −
                </button>
                <input
                  type="number"
                  value={delta === 0 ? '' : delta}
                  placeholder="±0"
                  onChange={e => saisirDelta(stat.id, e.target.value)}
                  className="flex-1 text-center px-2 py-2.5 sm:py-2 rounded-xl text-sm outline-none font-bold min-w-0"
                  style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                />
                <button
                  onClick={() => modifierStat(stat.id, +1)}
                  className="w-11 h-11 sm:w-9 sm:h-9 rounded-xl font-bold text-base transition-all flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(74,222,128,0.15)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}>
                  +
                </button>
              </div>

              {delta !== 0 && (
                <p className="text-xs text-center font-semibold" style={{ color: '#fbbf24' }}>
                  {delta > 0 ? `+${delta}` : delta} par rapport à la valeur actuelle
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* Boutons Appliquer / Annuler */}
      <div className="flex gap-3">
        <button
          onClick={appliquer}
          disabled={!aDesModifs || chargement}
          className="flex-1 py-3 rounded-xl font-bold transition-all"
          style={{
            background: aDesModifs && !chargement
              ? 'linear-gradient(135deg, var(--color-main), var(--color-accent2))'
              : 'var(--bg-surface)',
            color: aDesModifs && !chargement ? '#fff' : 'var(--text-muted)',
            cursor: aDesModifs && !chargement ? 'pointer' : 'not-allowed',
            border: '1px solid var(--border)',
          }}>
          {chargement ? 'Application...' : 'Appliquer les modifications'}
        </button>
        {aDesModifs && (
          <button
            onClick={() => setModifications({})}
            className="px-4 py-3 rounded-xl font-bold transition-all text-sm"
            style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            Annuler
          </button>
        )}
      </div>

      {message && (
        <p className="text-center text-sm font-bold" style={{ color: '#4ade80' }}>{message}</p>
      )}
    </div>
  )
}