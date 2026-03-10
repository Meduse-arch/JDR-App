import { useState, useEffect } from 'react'
import { supabase } from '../../../supabase'
import { personnageService } from '../../../services/personnageService'
import { type Personnage } from '../../../store/useStore'
import { Card } from '../../../components/ui/Card'

type Props = { personnage: Personnage }

export default function GererStats({ personnage }: Props) {
  const [stats, setStats] = useState<any[]>([])
  const [deltas, setDeltas] = useState<Record<string, string>>({})
  const [chargement, setChargement] = useState(false)

  useEffect(() => {
    chargerStats()
  }, [personnage.id])

  const chargerStats = async () => {
    const { data } = await supabase
      .from('personnage_stats')
      .select('id_stat, valeur, stats(nom)')
      .eq('id_personnage', personnage.id)
    
    if (data) {
      const s = data.map((d: any) => ({ id_stat: d.id_stat, nom: d.stats.nom, valeur: d.valeur }))
      setStats(s)
      const initialDeltas: Record<string, string> = {}
      s.forEach(item => initialDeltas[item.id_stat] = '')
      setDeltas(initialDeltas)
    }
  }

  const handleDeltaChange = (idStat: string, val: string) => {
    if (/^[+-]?\d*$/.test(val)) setDeltas(prev => ({ ...prev, [idStat]: val }))
  }

  const adjustDelta = (idStat: string, amount: number) => {
    const current = parseInt(deltas[idStat]) || 0
    const next = current + amount
    setDeltas(prev => ({ ...prev, [idStat]: next === 0 ? '' : (next > 0 ? `+${next}` : next.toString()) }))
  }

  const appliquerTout = async () => {
    const mods = Object.entries(deltas).map(([id, v]) => ({ id, val: parseInt(v) || 0 })).filter(m => m.val !== 0)
    if (mods.length === 0) return
    setChargement(true)
    try {
      for (const m of mods) {
        const actuelle = stats.find(s => s.id_stat === m.id)
        if (actuelle) {
          const nv = Math.max(0, actuelle.valeur + m.val)
          await supabase.from('personnage_stats').update({ valeur: nv }).eq('id_personnage', personnage.id).eq('id_stat', m.id)
        }
      }
      await personnageService.recalculerStats(personnage.id)
      setDeltas({})
      await chargerStats()
    } finally { setChargement(false) }
  }

  const getStatVal = (nom: string) => stats.find(s => s.nom === nom)?.valeur || 0
  const previewHp   = getStatVal('Constitution') * 4
  const previewMana = Math.round(((getStatVal('Intelligence') + getStatVal('Sagesse')) / 2) * 10)
  const previewStam = Math.round(((getStatVal('Force') + getStatVal('Agilité') + getStatVal('Constitution')) / 3) * 10)

  const aDesChangements = Object.values(deltas).some(v => (parseInt(v) || 0) !== 0)

  return (
    <div className="flex flex-col gap-8 pb-24 relative">
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-center">
          <p className="text-[9px] font-black uppercase opacity-50 text-red-400">PV Max</p>
          <p className="text-xl font-black">{previewHp}</p>
        </div>
        <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-center">
          <p className="text-[9px] font-black uppercase opacity-50 text-blue-400">Mana Max</p>
          <p className="text-xl font-black">{previewMana}</p>
        </div>
        <div className="p-3 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-center">
          <p className="text-[9px] font-black uppercase opacity-50 text-yellow-400">Stam Max</p>
          <p className="text-xl font-black">{previewStam}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map(s => {
          const deltaVal = parseInt(deltas[s.id_stat]) || 0
          const previewVal = Math.max(0, s.valeur + deltaVal)
          const hasDelta = deltaVal !== 0
          return (
            <Card key={s.id_stat} className="flex-col gap-4 p-5">
              <div className="flex justify-between items-start">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{s.nom}</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black">{s.valeur}</span>
                    {hasDelta && <span className={`text-sm font-black ${deltaVal > 0 ? 'text-green-400' : 'text-red-400'}`}>{deltaVal > 0 ? `+${deltaVal}` : deltaVal} → {previewVal}</span>}
                  </div>
                </div>
              </div>
              <div className="flex bg-black/20 rounded-xl p-1 border border-white/5 w-full">
                <button onClick={() => adjustDelta(s.id_stat, -1)} className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors font-bold">-</button>
                <input type="text" value={deltas[s.id_stat]} onChange={(e) => handleDeltaChange(s.id_stat, e.target.value)} placeholder="0" className="w-full bg-transparent text-center font-black text-sm outline-none" />
                <button onClick={() => adjustDelta(s.id_stat, 1)} className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors font-bold">+</button>
              </div>
            </Card>
          )
        })}
      </div>

      {/* BOUTON FLOTTANT RESPONSIVE */}
      {aDesChangements && (
        <div className="fixed bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-5 duration-500">
          <button 
            onClick={appliquerTout}
            disabled={chargement}
            className="group relative px-6 py-2.5 md:px-12 md:py-4 bg-main/80 backdrop-blur-md border border-white/20 text-white rounded-full shadow-lg shadow-main/20 flex items-center justify-center font-black text-[10px] md:text-sm uppercase italic tracking-tighter active:scale-90 transition-all"
            style={{ backgroundColor: 'color-mix(in srgb, var(--color-main) 85%, transparent)' }}
          >
            <span className="relative flex items-center gap-2">
              {chargement ? '...' : 'Valider les changements ✓'}
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
