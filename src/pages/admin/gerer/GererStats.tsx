import { useState, useEffect } from 'react'
import { supabase } from '../../../supabase'
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
    const { data } = await supabase
      .from('personnage_stats')
      .select('id_stat, valeur, stats(nom)')
      .eq('id_personnage', personnage.id)
    
    if (data) {
      const STATS_SYSTEME = ['PV Max', 'Mana Max', 'Stamina Max', 'HP Max', 'hp_max', 'mana_max', 'stam_max']
      const s = data
        .filter((d: any) => !STATS_SYSTEME.includes(d.stats.nom))
        .map((d: any) => ({ id_stat: d.id_stat, nom: d.stats.nom, valeur: d.valeur }))
      
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
    console.log('Stats à sauvegarder:', JSON.stringify(stats))
    try {
      for (const s of stats) {
        const d = parseInt(deltas[s.nom]) || 0
        const nv = (tempStats[s.nom] ?? s.valeur) + d
        console.log('UPSERT stat:', s.nom, 'id_stat:', s.id_stat, 'nouvelle valeur:', nv)
        const { error } = await supabase
          .from('personnage_stats')
          .upsert(
            { id_personnage: personnage.id, id_stat: s.id_stat, valeur: nv },
            { onConflict: 'id_personnage,id_stat' }
          )
        if (error) console.error('ERREUR upsert stat:', s.nom, error)
      }

      // Recalcul obligatoire des max après chaque save
      const statsFinales: Record<string, number> = { ...tempStats }
      stats.forEach(s => {
        const d = parseInt(deltas[s.nom]) || 0
        statsFinales[s.nom] = (tempStats[s.nom] ?? s.valeur) + d
      })

      const con_ = statsFinales['Constitution'] || 0
      const int_ = statsFinales['Intelligence'] || 0
      const sag_ = statsFinales['Sagesse'] || 0
      const for_ = statsFinales['Force'] || 0
      const agi_ = statsFinales['Agilité'] || 0

      const nouveauxMax = [
        { nom: 'PV Max',       valeur: con_ * 4 },
        { nom: 'Mana Max',     valeur: Math.round(((int_ + sag_) / 2) * 10) },
        { nom: 'Stamina Max',  valeur: Math.round(((for_ + agi_ + con_) / 3) * 10) }
      ]

      for (const m of nouveauxMax) {
        const { data: statRow } = await supabase
          .from('stats')
          .select('id')
          .eq('nom', m.nom)
          .single()
        
        if (statRow) {
          await supabase
            .from('personnage_stats')
            .upsert(
              { id_personnage: personnage.id, id_stat: statRow.id, valeur: m.valeur },
              { onConflict: 'id_personnage,id_stat' }
            )
        }
      }
      
      console.log('Stats sauvegardées, recalcul des jauges (clamp)...')
      await personnageService.recalculerStats(personnage.id)

      console.log('Rechargement des stats dans UI...')
      await chargerStats()
      
      // Recharger le personnage depuis la vue pour avoir les max à jour dans le store parent
      const { data } = await supabase
        .from('v_personnages')
        .select('*')
        .eq('id', personnage.id)
        .single()

      if (data) {
        if (pnjControle && pnjControle.id === personnage.id) {
          setPnjControle(data as Personnage)
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
