import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'
import CreerPersonnage from './CreerPersonnage'
import { usePersonnage } from '../../hooks/usePersonnage'
import { useStats } from '../../hooks/useStats'
import { calculPourcentage } from '../../utils/math'

type RessourceKey = 'hp' | 'mana' | 'stam'

/* Petit hook pour animer un nombre qui change */
function useAnimatedValue(target: number, duration = 600) {
  const [display, setDisplay] = useState(target)
  const prev = useRef(target)

  useEffect(() => {
    if (prev.current === target) return
    const start    = prev.current
    const diff     = target - start
    const startTs  = performance.now()

    const tick = (now: number) => {
      const t = Math.min(1, (now - startTs) / duration)
      // ease-out cubic
      const ease = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(start + diff * ease))
      if (t < 1) requestAnimationFrame(tick)
      else prev.current = target
    }
    requestAnimationFrame(tick)
  }, [target, duration])

  return display
}

/* Barre de ressource avec transitions CSS + compteur animé */
function BarreRessource({
  label, emoji, actuel, max, rKey, color, glow, gradient,
  delta, onDeltaChange, onDeltaDecrement, onDeltaIncrement, onAppliquer,
}: {
  label: string; emoji: string
  actuel: number; max: number; rKey: RessourceKey
  color: string; glow: string; gradient: string
  delta: string
  onDeltaChange: (v: string) => void
  onDeltaDecrement: () => void
  onDeltaIncrement: () => void
  onAppliquer: () => void
}) {
  const pct          = calculPourcentage(actuel, max)
  const valeurAnimee = useAnimatedValue(actuel)
  const pctAnimee    = useAnimatedValue(pct)

  // Flash de couleur quand la valeur change
  const [flash, setFlash] = useState<'gain' | 'perte' | null>(null)
  const prevActuel = useRef(actuel)

  useEffect(() => {
    if (prevActuel.current === actuel) return
    setFlash(actuel > prevActuel.current ? 'gain' : 'perte')
    const t = setTimeout(() => setFlash(null), 700)
    prevActuel.current = actuel
    return () => clearTimeout(t)
  }, [actuel])

  const deltaValide = delta !== '' && delta !== '0'

  return (
    <div
      className="relative p-4 sm:p-5 rounded-2xl sm:rounded-3xl flex flex-col gap-3 overflow-hidden transition-all duration-300"
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 8%, var(--bg-card))`,
        border: `1px solid color-mix(in srgb, ${color} 25%, var(--border))`,
        // Flash ring quand la valeur change
        boxShadow: flash === 'gain'
          ? `0 0 0 2px ${color}, 0 0 20px ${glow}`
          : flash === 'perte'
          ? `0 0 0 2px #ef4444, 0 0 15px rgba(239,68,68,0.3)`
          : 'none',
      }}
    >
      {/* Fond lumineux */}
      <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl pointer-events-none"
        style={{ backgroundColor: glow }} />

      {/* Label + valeur animée */}
      <div className="relative z-10 flex justify-between items-center">
        <span className="text-sm font-bold uppercase tracking-wide flex items-center gap-2"
          style={{ color: 'var(--text-secondary)' }}>
          <span className="text-lg">{emoji}</span>
          {label}
        </span>
        <div className="flex items-baseline gap-1">
          {/* Valeur avec animation de compteur */}
          <span
            className="text-2xl sm:text-3xl font-black tabular-nums transition-colors duration-300"
            style={{
              color: flash === 'gain' ? '#4ade80' : flash === 'perte' ? '#f87171' : color,
            }}
          >
            {valeurAnimee}
          </span>
          <span className="font-bold" style={{ color: 'var(--text-muted)' }}>/ {max}</span>
        </div>
      </div>

      {/* Barre de progression — transition CSS smooth */}
      <div className="relative z-10 w-full rounded-full h-2.5 overflow-hidden"
        style={{ backgroundColor: 'var(--bg-app)' }}>
        <div
          className="h-full rounded-full relative"
          style={{
            width: `${pctAnimee}%`,
            background: gradient,
            transition: 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-white/20 rounded-full" />
        </div>
      </div>

      {/* Contrôles */}
      <div className="relative z-10 flex items-center p-1 rounded-xl"
        style={{ backgroundColor: 'var(--bg-app)', border: '1px solid var(--border)' }}>
        <button
          onClick={onDeltaDecrement}
          className="w-11 h-11 sm:w-9 sm:h-9 rounded-lg font-black text-xl transition flex items-center justify-center shrink-0"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.07)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
          −
        </button>
        <input
          type="number"
          value={delta}
          placeholder="±0"
          onChange={e => onDeltaChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && deltaValide && onAppliquer()}
          className="flex-1 bg-transparent text-center font-bold text-sm outline-none min-w-0"
          style={{ color: 'var(--text-primary)' }}
        />
        <button
          onClick={onDeltaIncrement}
          className="w-11 h-11 sm:w-9 sm:h-9 rounded-lg font-black text-xl transition flex items-center justify-center shrink-0"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.07)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
          +
        </button>
        <div className="w-px h-6 mx-1 shrink-0" style={{ backgroundColor: 'var(--border)' }} />
        <button
          onClick={onAppliquer}
          disabled={!deltaValide}
          className="w-11 h-11 sm:w-9 sm:h-9 rounded-lg font-bold transition flex items-center justify-center shrink-0"
          style={{
            color: deltaValide ? 'var(--color-light)' : 'var(--text-muted)',
            cursor: deltaValide ? 'pointer' : 'not-allowed',
          }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}

/* ── Composant principal ─────────────────────────────────────────── */
export default function MonPersonnage() {
  const compte         = useStore(s => s.compte)
  const pnjControle    = useStore(s => s.pnjControle)
  const setPnjControle = useStore(s => s.setPnjControle)

  const { personnage, chargement: chargementPerso, rechargerPersonnage, mettreAJourLocalement } = usePersonnage()
  const { stats, chargement: chargementStats } = useStats()

  const [deltas, setDeltas]             = useState<Record<RessourceKey, string>>({ hp: '', mana: '', stam: '' })
  const [pseudoJoueur, setPseudoJoueur] = useState<string | null>(null)

  useEffect(() => {
    if (personnage?.lie_au_compte) {
      supabase.from('comptes').select('pseudo').eq('id', personnage.lie_au_compte).single()
        .then(({ data }) => { if (data) setPseudoJoueur(data.pseudo) })
    }
  }, [personnage?.lie_au_compte])

  const supprimerPersonnage = async () => {
    if (!personnage) return
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
    const champMax    = `${key}_max`    as keyof typeof personnage
    const actuel = personnage[champActuel] as number
    const max    = personnage[champMax]    as number
    const nouveau = Math.max(0, Math.min(max, actuel + delta))

    // ── Mise à jour optimiste : l'UI change AVANT Supabase ──
    await mettreAJourLocalement({ [champActuel]: nouveau } as any)

    // Sync du store pnjControle si besoin
    if (pnjControle && pnjControle.id === personnage.id)
      setPnjControle({ ...pnjControle, [champActuel]: nouveau } as any)

    setDeltas(prev => ({ ...prev, [key]: '' }))
  }

  /* ── États vides ── */
  if ((chargementPerso || chargementStats) && !personnage) return (
    <div className="flex items-center justify-center h-full animate-pulse"
      style={{ color: 'var(--text-muted)' }}>
      Ouverture du grimoire...
    </div>
  )
  if (!personnage && compte?.role === 'joueur')
    return <CreerPersonnage estPnj={false} retour={() => rechargerPersonnage()} />
  if (!personnage && compte?.role === 'admin')
    return (
      <div className="flex items-center justify-center h-full text-center px-6"
        style={{ color: 'var(--text-secondary)' }}>
        Prends le contrôle d'un PNJ depuis la page PNJ
      </div>
    )
  if (!personnage) return null

  const ressources = [
    { label: 'Points de vie', emoji: '❤️', actuel: personnage.hp_actuel,   max: personnage.hp_max,   rKey: 'hp'   as RessourceKey, color: '#ef4444', glow: 'rgba(239,68,68,0.2)',   gradient: 'linear-gradient(90deg,#dc2626,#ef4444)' },
    { label: 'Mana',          emoji: '💧', actuel: personnage.mana_actuel, max: personnage.mana_max, rKey: 'mana' as RessourceKey, color: '#3b82f6', glow: 'rgba(59,130,246,0.2)',  gradient: 'linear-gradient(90deg,#2563eb,#3b82f6)' },
    { label: 'Stamina',       emoji: '⚡', actuel: personnage.stam_actuel, max: personnage.stam_max, rKey: 'stam' as RessourceKey, color: '#eab308', glow: 'rgba(234,179,8,0.2)',   gradient: 'linear-gradient(90deg,#ca8a04,#eab308)' },
  ]

  return (
    <div className="flex flex-col h-full p-4 sm:p-6 md:p-8 lg:p-10 overflow-y-auto custom-scrollbar"
      style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 mb-6 pb-5"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight"
            style={{
              background: 'linear-gradient(135deg, var(--color-light), var(--color-accent2))',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
            {personnage.nom}
          </h2>
          {pnjControle && (
            <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
              style={{
                backgroundColor: personnage.est_pnj ? 'rgba(234,179,8,0.15)' : 'rgba(59,130,246,0.15)',
                color: personnage.est_pnj ? '#fbbf24' : '#60a5fa',
              }}>
              {personnage.est_pnj ? 'Personnage Non Joueur' : `Joué par : ${pseudoJoueur ?? '...'}`}
            </span>
          )}
        </div>
        <button
          onClick={supprimerPersonnage}
          className="ml-auto sm:ml-0 px-4 py-2 rounded-xl text-sm font-bold transition-all"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.backgroundColor = 'transparent' }}>
          Supprimer la fiche
        </button>
      </div>

      {/* Barres de ressources */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {ressources.map(r => (
          <BarreRessource
            key={r.rKey}
            {...r}
            delta={deltas[r.rKey]}
            onDeltaChange={v => setDeltas(prev => ({ ...prev, [r.rKey]: v }))}
            onDeltaDecrement={() => setDeltas(prev => ({ ...prev, [r.rKey]: String((parseInt(prev[r.rKey]) || 0) - 1) }))}
            onDeltaIncrement={() => setDeltas(prev => ({ ...prev, [r.rKey]: String((parseInt(prev[r.rKey]) || 0) + 1) }))}
            onAppliquer={() => appliquerDelta(r.rKey)}
          />
        ))}
      </div>

      {/* Statistiques */}
      <h3 className="text-base sm:text-lg font-bold mb-4 flex items-center gap-3"
        style={{ color: 'var(--text-primary)' }}>
        <span className="p-2 rounded-xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          🛡️
        </span>
        Attributs & Statistiques
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pb-4">
        {stats.map(stat => (
          <div key={stat.nom}
            className="p-4 sm:p-5 rounded-2xl flex flex-col justify-center items-center gap-1.5 transition-all duration-300 cursor-default"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-main)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-center"
              style={{ color: 'var(--text-muted)' }}>{stat.nom}</span>
            <span className="text-3xl sm:text-4xl font-black"
              style={{
                background: 'linear-gradient(180deg, var(--text-primary), var(--color-main))',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
              {stat.valeur}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}