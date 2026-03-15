import { useState, useEffect } from 'react'
import { usePersonnage } from '../../../hooks/usePersonnage'
import { type Personnage } from '../../../store/useStore'
import { Card } from '../../../components/ui/Card'
import { ConfirmationBar } from '../../../components/ui/ConfirmationBar'
import { CONFIG_RESSOURCES } from '../../../utils/constants'
import { RessourceKey } from '../../../hooks/useResourceManagement'

type Props = { personnage: Personnage }

export default function GererRessources({ personnage }: Props) {
  const { mettreAJourLocalement } = usePersonnage()
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

  const hasChanges = 
    tempRessources.hp !== (personnage.hp || 0) ||
    tempRessources.mana !== (personnage.mana || 0) ||
    tempRessources.stam !== (personnage.stam || 0) ||
    Object.values(deltas).some(d => d !== '' && d !== '0')

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
    <div className="flex flex-col gap-8 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ressources.map(r => {
          const dVal = parseInt(deltas[r.rKey]) || 0
          const previewVal = Math.max(0, Math.min(r.max, r.actuel + dVal))
          const pourcentage = Math.min(100, Math.max(0, (previewVal / r.max) * 100));
          const isChanged = previewVal !== (personnage as any)[r.rKey];

          return (
            <Card key={r.rKey} className="flex-col gap-4 p-6 relative overflow-hidden group">
              <div 
                className="absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl opacity-20 transition-opacity duration-500 group-hover:opacity-40"
                style={{ backgroundColor: r.glow }}
              />

              <div className="flex justify-between items-end relative z-10">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{r.emoji}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-50">
                    {r.label}
                  </span>
                </div>
                <div className="flex items-baseline gap-1 text-right">
                  <div className="flex flex-col items-end">
                    <span className={`text-2xl font-black ${isChanged ? 'text-main' : ''}`}>{previewVal}</span>
                    {dVal !== 0 && (
                      <span className={`text-[10px] font-bold ${dVal > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ({dVal > 0 ? '+' : ''}{dVal})
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold opacity-30">/ {r.max}</span>
                </div>
              </div>

              <div className="relative h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-[2px]">
                <div 
                  className="h-full rounded-full transition-all duration-700 ease-out relative"
                  style={{ 
                    width: `${pourcentage}%`,
                    background: r.gradient,
                  }}
                >
                  <div className="absolute inset-0 bg-white/20 w-full h-[1px] top-0" />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2 relative z-10">
                <button 
                  onClick={() => adjustDelta(r.rKey, -1)} 
                  className="w-12 h-12 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 font-bold text-xl transition-all active:scale-90"
                >-</button>
                
                <div className="flex-1 bg-black/40 rounded-xl border border-white/5 focus-within:border-main/50 transition-all overflow-hidden h-12 flex items-center justify-center">
                  <input 
                    type="text"
                    placeholder="0"
                    value={deltas[r.rKey]}
                    onChange={e => handleDeltaChange(r.rKey, e.target.value)}
                    className={`w-full bg-transparent text-center font-black text-lg outline-none placeholder:opacity-10 ${dVal > 0 ? 'text-green-400' : dVal < 0 ? 'text-red-400' : 'text-white'}`}
                  />
                </div>

                <button 
                  onClick={() => adjustDelta(r.rKey, 1)} 
                  className="w-12 h-12 flex items-center justify-center rounded-xl bg-white/10 hover:bg-main font-bold text-xl text-main hover:text-white transition-all active:scale-90"
                >+</button>
              </div>
            </Card>
          )
        })}
      </div>

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
