import { useState, useEffect } from 'react'
import { supabase } from '../../../supabase'
import { personnageService } from '../../../services/personnageService'
import { type Personnage } from '../../../Store/useStore'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'

type Props = { personnage: Personnage }

export default function GererStats({ personnage }: Props) {
  const [stats, setStats] = useState<any[]>([])
  const [tempStats, setTempStats] = useState<Record<string, number>>({})
  const [chargement, setChargement] = useState(true)
  const [sauvegardant, setSauvegardant] = useState(false)

  useEffect(() => {
    chargerStats()
  }, [personnage.id])

  const chargerStats = async () => {
    setChargement(true)
    const { data } = await supabase
      .from('personnage_stats')
      .select('id_stat, valeur, stats(nom)')
      .eq('id_personnage', personnage.id)
    
    if (data) {
      const s = data.map((d: any) => ({ id_stat: d.id_stat, nom: d.stats.nom, valeur: d.valeur }))
      setStats(s)
      const initialTemp: Record<string, number> = {}
      s.forEach(item => initialTemp[item.nom] = item.valeur)
      setTempStats(initialTemp)
    }
    setChargement(false)
  }

  // Calcul des ressources dérivées en temps réel
  const con = tempStats['Constitution'] || 0
  const int = tempStats['Intelligence'] || 0
  const sag = tempStats['Sagesse'] || 0
  const for_ = tempStats['Force'] || 0
  const agi = tempStats['Agilité'] || 0

  const previewHp   = con * 4
  const previewMana = Math.round(((int + sag) / 2) * 10)
  const previewStam = Math.round(((for_ + agi + con) / 3) * 10)

  const hasChanges = stats.some(s => tempStats[s.nom] !== s.valeur)

  const modifierTemp = (nom: string, delta: number) => {
    setTempStats(prev => ({ ...prev, [nom]: Math.max(0, prev[nom] + delta) }))
  }

  const enregistrer = async () => {
    setSauvegardant(true)
    try {
      // 1. Mettre à jour chaque stat modifiée
      for (const s of stats) {
        const nv = tempStats[s.nom]
        if (nv !== s.valeur) {
          await supabase.from('personnage_stats').update({ valeur: nv }).eq('id_personnage', personnage.id).eq('id_stat', s.id_stat)
        }
      }
      // 2. Recalculer les max PV/Mana/Stam
      await personnageService.recalculerStats(personnage.id)
      await chargerStats()
      alert("Statistiques enregistrées avec succès !")
    } catch (e) {
      console.error(e)
    } finally {
      setSauvegardant(false)
    }
  }

  // On retire le blocage visuel du chargement


  return (
    <div className="flex flex-col gap-8">
      {/* APERÇU DES RESSOURCES */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-center">
          <p className="text-[10px] font-black uppercase opacity-50 text-red-400">PV Max</p>
          <p className="text-2xl font-black">{previewHp}</p>
        </div>
        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-center">
          <p className="text-[10px] font-black uppercase opacity-50 text-blue-400">Mana Max</p>
          <p className="text-2xl font-black">{previewMana}</p>
        </div>
        <div className="p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-center">
          <p className="text-[10px] font-black uppercase opacity-50 text-yellow-400">Stam Max</p>
          <p className="text-2xl font-black">{previewStam}</p>
        </div>
      </div>

      {/* GRILLE DE MODIFICATION */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map(s => (
          <Card key={s.id_stat} className="flex-col gap-3 p-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black uppercase tracking-widest opacity-40">{s.nom}</span>
              <span className={`text-2xl font-black ${tempStats[s.nom] !== s.valeur ? 'text-main animate-pulse' : ''}`}>
                {tempStats[s.nom]}
              </span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => modifierTemp(s.nom, -1)} className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 font-bold">-</button>
              <button onClick={() => modifierTemp(s.nom, 1)} className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-main font-bold">+</button>
            </div>
          </Card>
        ))}
      </div>

      {/* ACTIONS */}
      {hasChanges && (
        <div className="sticky bottom-0 p-4 bg-surface/80 backdrop-blur-md border border-main/30 rounded-2xl flex gap-4 animate-in slide-in-from-bottom-4">
          <Button variant="secondary" className="flex-1" onClick={() => setTempStats(Object.fromEntries(stats.map(s => [s.nom, s.valeur])))}>Annuler</Button>
          <Button className="flex-2" onClick={enregistrer} disabled={sauvegardant}>
            {sauvegardant ? 'Enregistrement...' : 'Confirmer les modifications ✓'}
          </Button>
        </div>
      )}
    </div>
  )
}
