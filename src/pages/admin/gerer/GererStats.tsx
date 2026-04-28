import { useState, useEffect } from 'react'
import { personnageService } from '../../../services/personnageService'
import { useStore, type Personnage } from '../../../store/useStore'
import { StatsCard } from '../../../components/ui/card'
import { ConfirmationBar } from '../../../components/ui/ConfirmationBar'
import { statsEngine } from '../../../utils/statsEngine'
import { ORDRE_STATS } from '../../../utils/constants'

type Props = { personnage: Personnage; onRecharger?: () => void }

export default function GererStats({ personnage, onRecharger }: Props) {
  const [stats, setStats] = useState<any[]>([])
  const [tempStats, setTempStats] = useState<Record<string, number>>({})
  const [deltas, setDeltas] = useState<Record<string, string>>({})
  const [sauvegardant, setSauvegardant] = useState(false)

  useEffect(() => {
    chargerStats()
  }, [personnage.id])

  const chargerStats = async () => {
    const db = (window as any).db;
    const res = await db.personnage_stats.getAll();
    const resRef = await db.stats.getAll();
    
    if (res.success && resRef.success) {
      const pStats = res.data.filter((d: any) => d.id_personnage === personnage.id)
      const refs = resRef.data

      const STATS_SYSTEME = ['PV Max', 'Mana Max', 'Stamina Max', 'HP Max', 'hp_max', 'mana_max', 'stam_max']
      const s = pStats
        .map((d: any) => {
          const ref = refs.find((r: any) => r.id === d.id_stat)
          return { id: d.id, id_stat: d.id_stat, nom: ref?.nom || '?', valeur: d.valeur }
        })
        .filter((d: any) => !STATS_SYSTEME.includes(d.nom))
      
      const sortedStats = statsEngine.trierStats(s, ORDRE_STATS)
      setStats(sortedStats)
      const initialTemp: Record<string, number> = {}
      const initialDeltas: Record<string, string> = {}
      sortedStats.forEach(item => {
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

  const hasChanges = stats.some(s => {
    const d = parseInt(deltas[s.nom]) || 0
    return d !== 0 || tempStats[s.nom] !== s.valeur
  })

  const adjustDelta = (nom: string, amount: number) => {
    setDeltas(prev => {
      const current = parseInt(prev[nom]) || 0
      const next = current + amount
      return { ...prev, [nom]: next === 0 ? '' : (next > 0 ? `+${next}` : `${next}`) }
    })
  }

  const handleDeltaChange = (nom: string, val: string) => {
    if (/^[+-]?\d*$/.test(val)) {
      setDeltas(prev => ({ ...prev, [nom]: val }))
    }
  }

  const pnjControle = useStore(s => s.pnjControle)
  const setPnjControle = useStore(s => s.setPnjControle)

  const enregistrer = async () => {
    setSauvegardant(true)
    const db = (window as any).db;
    try {
      for (const s of stats) {
        const d = parseInt(deltas[s.nom]) || 0
        const nv = (tempStats[s.nom] ?? s.valeur) + d
        if (s.id) {
          await db.personnage_stats.update(s.id, { valeur: nv })
        }
      }

      await personnageService.recalculerStats(personnage.id)
      await chargerStats()
      
      const resP = await db.personnages.getById(personnage.id)
      if (resP.success && resP.data) {
        const hydrated = await personnageService.hydraterPersonnages([resP.data]);
        const full = hydrated[0] as Personnage;
        if (pnjControle && pnjControle.id === personnage.id) {
          setPnjControle(full)
        }
        onRecharger?.()
      }
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
          <div key={r.label} className={`p-4 rounded-2xl ${r.bg} border ${r.border} text-center transition-all duration-500`}>
            <p className={`text-[10px] font-black uppercase opacity-50 ${r.color}`}>{r.label}</p>
            <p className="text-2xl font-black">{r.val}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stats.map(s => {
          const dVal = parseInt(deltas[s.nom]) || 0
          return (
            <StatsCard 
              key={s.id_stat}
              label={s.nom} 
              value={tempStats[s.nom]} 
              delta={dVal} 
              onChange={(amount) => adjustDelta(s.nom, amount)} 
              onInputChange={(val) => handleDeltaChange(s.nom, val)} 
              inputValue={deltas[s.nom]} 
            />
          )
        })}
      </div>

      {hasChanges && (
        <ConfirmationBar 
          onConfirm={enregistrer}
          onCancel={chargerStats}
          confirmText="Sauvegarder les statistiques"
          loading={sauvegardant}
        />
      )}
    </div>
  )
}
