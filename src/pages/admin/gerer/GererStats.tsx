import { useState, useEffect } from 'react'
import { supabase } from '../../../supabase'
import { personnageService } from '../../../services/personnageService'
import { type Personnage } from '../../../store/useStore'
import { Card } from '../../../components/ui/Card'

type Props = { personnage: Personnage }

export default function GererStats({ personnage }: Props) {
  const [stats, setStats] = useState<any[]>([])
  const [tempStats, setTempStats] = useState<Record<string, number>>({})
  const [deltas, setDeltas] = useState<Record<string, string>>({})
  const [sauvegardant, setSauvegardant] = useState(false)

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
      const initialTemp: Record<string, number> = {}
      const initialDeltas: Record<string, string> = {}
      s.forEach(item => {
        initialTemp[item.nom] = item.valeur
        initialDeltas[item.nom] = ''
      })
      setTempStats(initialTemp)
      setDeltas(initialDeltas)
    }
  }

  const con = tempStats['Constitution'] || 0
  const int = tempStats['Intelligence'] || 0
  const sag = tempStats['Sagesse'] || 0
  const for_ = tempStats['Force'] || 0
  const agi = tempStats['Agilité'] || 0

  const previewHp   = con * 4
  const previewMana = Math.round(((int + sag) / 2) * 10)
  const previewStam = Math.round(((for_ + agi + con) / 3) * 10)

  const hasChanges = stats.some(s => tempStats[s.nom] !== s.valeur)

  const appliquerDelta = (nom: string) => {
    const val = parseInt(deltas[nom])
    if (isNaN(val)) return
    setTempStats(prev => ({ ...prev, [nom]: Math.max(0, prev[nom] + val) }))
    setDeltas(prev => ({ ...prev, [nom]: '' }))
  }

  const modifierUnitaire = (nom: string, amount: number) => {
    setTempStats(prev => ({ ...prev, [nom]: Math.max(0, prev[nom] + amount) }))
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
      for (const s of stats) {
        const nv = tempStats[s.nom]
        if (nv !== s.valeur) {
          await supabase.from('personnage_stats').update({ valeur: nv }).eq('id_personnage', personnage.id).eq('id_stat', s.id_stat)
        }
      }
      await personnageService.recalculerStats(personnage.id)
      setDeltas({})
      await chargerStats()
    } catch (e) {
      console.error(e)
    } finally {
      setSauvegardant(false)
    }
  }

  return (
    <div className="flex flex-col gap-8 pb-20">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'PV Max', val: previewHp, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
          { label: 'Mana Max', val: previewMana, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
          { label: 'Stam Max', val: previewStam, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' }
        ].map(r => (
          <div key={r.label} className={`p-4 rounded-2xl ${r.bg} border ${r.border} text-center`}>
            <p className={`text-[10px] font-black uppercase opacity-50 ${r.color}`}>{r.label}</p>
            <p className="text-2xl font-black">{r.val}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stats.map(s => (
          <Card key={s.id_stat} className="p-5 flex-col gap-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black uppercase tracking-widest opacity-40">{s.nom}</span>
              <span className={`text-3xl font-black ${tempStats[s.nom] !== s.valeur ? 'text-main animate-pulse' : ''}`}>
                {tempStats[s.nom]}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <button onClick={() => modifierUnitaire(s.nom, -1)} className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 font-bold text-lg">-</button>
              
              <div className="flex-1 flex bg-black/20 rounded-xl border border-white/5 overflow-hidden focus-within:border-main/50 transition-colors">
                <input 
                  type="text"
                  placeholder="± valeur..."
                  value={deltas[s.nom]}
                  onChange={e => setDeltas({...deltas, [s.nom]: e.target.value})}
                  className="w-full bg-transparent px-3 py-2 text-center text-xs font-bold outline-none"
                  onKeyDown={e => e.key === 'Enter' && appliquerDelta(s.nom)}
                />
                <button 
                  onClick={() => appliquerDelta(s.nom)}
                  className="px-3 bg-white/5 hover:bg-main hover:text-white transition-colors text-[10px] font-black"
                >
                  OK
                </button>
              </div>

              <button onClick={() => modifierUnitaire(s.nom, 1)} className="w-10 h-10 rounded-xl bg-white/10 hover:bg-main font-bold text-lg text-main hover:text-white">+</button>
            </div>
          </Card>
        ))}
      </div>

      {hasChanges && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-50">
          <div className="bg-surface/90 backdrop-blur-xl border border-main/30 p-4 rounded-3xl flex gap-4 shadow-2xl shadow-main/20 animate-in slide-in-from-bottom-8">
            <Button variant="secondary" className="flex-1" onClick={() => chargerStats()}>Annuler</Button>
            <Button className="flex-2" onClick={enregistrer} disabled={sauvegardant}>
              {sauvegardant ? 'Magie en cours...' : 'Sauvegarder ✓'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
