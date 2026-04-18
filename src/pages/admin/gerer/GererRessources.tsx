import { useState, useEffect } from 'react'
import { type Personnage } from '../../../store/useStore'
import { ConfirmationBar } from '../../../components/ui/ConfirmationBar'
import { CONFIG_RESSOURCES } from '../../../utils/constants'
import { RessourceKey } from '../../../hooks/useResourceManagement'
import { Heart, Zap, Flame } from 'lucide-react'

const RESSOURCE_ICONS: Record<string, React.ReactNode> = {
  hp:   <Heart size={16} className="text-red-400/70" />,
  mana: <Zap size={16} className="text-blue-400/70" />,
  stam: <Flame size={16} className="text-amber-400/70" />,
}

type Props = { 
  personnage: Personnage
  mettreAJourLocalement: (updates: Partial<Personnage>) => Promise<void>
}

export default function GererRessources({ personnage, mettreAJourLocalement }: Props) {
  const [tempRessources, setTempRessources] = useState<Record<string, number>>({
    hp: personnage.hp || 0,
    mana: personnage.mana || 0,
    stam: personnage.stam || 0
  })
  const [deltas, setDeltas] = useState<Record<string, string>>({
    hp: '',
    mana: '',
    stam: ''
  })
  const [sauvegardant, setSauvegardant] = useState(false)

  useEffect(() => {
    setTempRessources({
      hp: personnage.hp || 0,
      mana: personnage.mana || 0,
      stam: personnage.stam || 0
    })
    setDeltas({ hp: '', mana: '', stam: '' })
  }, [personnage])

  const ressources = (Object.keys(CONFIG_RESSOURCES) as RessourceKey[]).map(key => ({
    ...CONFIG_RESSOURCES[key],
    actuel: tempRessources[key],
    max: (personnage as any)[`${key}_max`] as number,
    rKey: key
  }))

  const hasChanges = Object.values(deltas).some(d => {
    const n = parseInt(d)
    return !isNaN(n) && n !== 0
  })

  const adjustDelta = (key: string, amount: number) => {
    setDeltas(prev => {
      const current = parseInt(prev[key]) || 0
      const next = current + amount
      return { ...prev, [key]: next === 0 ? '' : (next > 0 ? `+${next}` : `${next}`) }
    })
  }

  const handleDeltaChange = (key: string, val: string) => {
    // Permettre uniquement les chiffres et les signes + / - au début
    if (/^[+-]?\d*$/.test(val)) {
      setDeltas(prev => ({ ...prev, [key]: val }))
    }
  }

  const enregistrer = async () => {
    setSauvegardant(true)
    try {
      const finalUpdates: any = { ...tempRessources }
      
      // Appliquer les deltas en cours s'il y en a
      Object.keys(deltas).forEach(key => {
        const d = parseInt(deltas[key])
        if (!isNaN(d)) {
          const max = (personnage as any)[`${key}_max`] || 999
          finalUpdates[key] = Math.max(0, Math.min(max, finalUpdates[key] + d))
        }
      })

      await mettreAJourLocalement({
        hp: finalUpdates.hp,
        mana: finalUpdates.mana,
        stam: finalUpdates.stam
      })
      
      setTempRessources(finalUpdates)
      setDeltas({ hp: '', mana: '', stam: '' })
      
    } catch (e) {
      console.error(e)
    } finally {
      setSauvegardant(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 pb-20">
      {ressources.map(r => {
        const dVal = parseInt(deltas[r.rKey]) || 0
        const previewVal = Math.max(0, Math.min(r.max, r.actuel + dVal))
        const pct = Math.round((previewVal / r.max) * 100)

        return (
          <div key={r.rKey} className="relative p-4" style={{ background: 'var(--bg-card)' }}>
            {/* Ligne top dégradé colorée */}
            <div className="absolute top-0 left-3.5 right-3.5 h-px" style={{ background: `linear-gradient(90deg, transparent, ${r.glow}, transparent)` }} />

            {/* Header : icône + label + valeur */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 flex items-center justify-center border border-theme" style={{ background: 'rgba(0,0,0,0.3)' }}>
                  {RESSOURCE_ICONS[r.rKey]}
                </span>
                <span className="font-cinzel text-[9px] font-black uppercase tracking-[0.25em] opacity-50">{r.label}</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-cinzel font-black text-2xl text-primary">{previewVal}</span>
                <span className="font-cinzel text-xs opacity-20">/ {r.max}</span>
                {dVal !== 0 && (
                  <span className={`font-cinzel font-black text-[10px] ${dVal > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ({dVal > 0 ? '+' : ''}{dVal})
                  </span>
                )}
              </div>
            </div>

            {/* Barre */}
            <div className="h-[3px] w-full bg-surface border border-theme mb-3">
              <div
                className="h-full transition-all duration-500"
                style={{ width: `${pct}%`, background: r.gradient }}
              />
            </div>

            {/* Contrôles +/- */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => adjustDelta(r.rKey, -1)}
                className="w-8 h-8 flex items-center justify-center border border-theme bg-surface text-secondary hover:text-theme-main hover:bg-card-hover transition-all font-black text-base"
              >−</button>
              <input
                type="text"
                placeholder="±0"
                value={deltas[r.rKey]}
                onChange={e => handleDeltaChange(r.rKey, e.target.value)}
                className={`flex-1 bg-input-theme border border-theme text-center font-cinzel font-black text-sm py-1.5 outline-none focus:border-theme-main/40 transition-all ${dVal > 0 ? 'text-green-400' : dVal < 0 ? 'text-red-400' : 'text-secondary'}`}
              />
              <button
                onClick={() => adjustDelta(r.rKey, 1)}
                className="w-8 h-8 flex items-center justify-center border border-theme bg-surface text-secondary hover:text-theme-main hover:bg-card-hover transition-all font-black text-base"
              >+</button>
            </div>
          </div>
        )
      })}

      {hasChanges && (
        <ConfirmationBar
          onConfirm={enregistrer}
          onCancel={() => {
            setTempRessources({ hp: personnage.hp || 0, mana: personnage.mana || 0, stam: personnage.stam || 0 })
            setDeltas({ hp: '', mana: '', stam: '' })
          }}
          confirmText="Sauvegarder les ressources"
          loading={sauvegardant}
        />
      )}
    </div>
  )
}
