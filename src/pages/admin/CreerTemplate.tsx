import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'

type Stat = { id: string; nom: string; description: string }

interface Props {
  retour: () => void
}

export default function CreerTemplate({ retour }: Props) {
  const [nom, setNom] = useState('')
  const [statsBase, setStatsBase] = useState<Stat[]>([])
  const [valeurs, setValeurs] = useState<Record<string, number>>({})
  const [etape, setEtape] = useState<'nom' | 'stats'>('nom')

  useEffect(() => {
    chargerStats()
  }, [])

  const chargerStats = async () => {
    const { data } = await supabase.from('stats').select('*')
    if (data) {
      setStatsBase(data)
      const initVals: Record<string, number> = {}
      data.forEach(s => initVals[s.id] = 10) // Valeur par défaut 10
      setValeurs(initVals)
    }
  }

  const handleValeurChange = (id: string, val: string) => {
    const n = parseInt(val) || 0
    setValeurs(prev => ({ ...prev, [id]: n }))
  }

  const confirmer = async () => {
    // Calcul des ressources (formule identique à la création classique)
    const constitutionStat = statsBase.find(s => s.nom === 'Constitution')
    const intelligenceStat = statsBase.find(s => s.nom === 'Intelligence')
    const sagesseStat      = statsBase.find(s => s.nom === 'Sagesse')
    const forceStat        = statsBase.find(s => s.nom === 'Force')
    const agiliteStat      = statsBase.find(s => s.nom === 'Agilité')

    const vConst = constitutionStat ? valeurs[constitutionStat.id] : 0
    const vInt   = intelligenceStat ? valeurs[intelligenceStat.id] : 0
    const vSag   = sagesseStat ? valeurs[sagesseStat.id] : 0
    const vForce = forceStat ? valeurs[forceStat.id] : 0
    const vAgil  = agiliteStat ? valeurs[agiliteStat.id] : 0

    const hp   = vConst * 4
    const mana = Math.round(((vInt + vSag) / 2) * 10)
    const stam = Math.round((vForce + vAgil + vConst) / 3 * 10)

    const { data: personnage, error } = await supabase
      .from('personnages')
      .insert({
        nom: `[Modèle] ${nom}`,
        est_pnj: true,
        categorie_pnj: 'Monstre',
        hp_max: hp, hp_actuel: hp,
        mana_max: mana, mana_actuel: mana,
        stam_max: stam, stam_actuel: stam,
      })
      .select().single()

    if (error || !personnage) {
      console.error("Erreur création template:", error)
      return
    }

    // Insérer les stats
    const statsToInsert = Object.entries(valeurs).map(([idStat, val]) => ({
      id_personnage: personnage.id,
      id_stat: idStat,
      valeur: val
    }))

    await supabase.from('personnage_stats').insert(statsToInsert)
    
    retour()
  }

  if (etape === 'nom') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4" style={{ backgroundColor: 'var(--bg-app)' }}>
        <Card className="w-full max-w-sm flex flex-col gap-6 p-6 sm:p-8 shadow-2xl">
          <h2 className="text-2xl font-black text-center" style={{ background: 'linear-gradient(135deg, var(--color-light), var(--color-accent2))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            🐉 Nouveau Modèle
          </h2>
          <div className="flex flex-col gap-4">
            <Input
              icon="🖋️"
              placeholder="Nom du monstre (ex: Gobelin)"
              value={nom}
              onChange={e => setNom(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && nom && setEtape('stats')}
              className="font-bold text-center"
            />
            <Button size="lg" onClick={() => nom && setEtape('stats')} disabled={!nom} className="w-full">
              Définir les Stats →
            </Button>
            <Button variant="ghost" onClick={retour} className="text-sm">← Annuler</Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full p-4 md:p-8 overflow-y-auto custom-scrollbar" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      <div className="max-w-4xl mx-auto w-full">
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-black tracking-tight" style={{ background: 'linear-gradient(135deg, var(--color-light), var(--color-accent2))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Stats de base : {nom}
          </h2>
          <p className="text-sm opacity-60">Saisis manuellement les statistiques du modèle</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {statsBase.map(s => (
            <Card key={s.id} className="flex-row justify-between items-center gap-4 p-4">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{s.nom}</p>
                <p className="text-xs opacity-50 truncate" title={s.description}>{s.description}</p>
              </div>
              <input
                type="number"
                value={valeurs[s.id]}
                onChange={e => handleValeurChange(s.id, e.target.value)}
                className="w-16 sm:w-20 px-2 sm:px-3 py-2 rounded-lg text-center font-bold outline-none border transition-all shrink-0"
                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--color-main)' }}
              />
            </Card>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="secondary" onClick={() => setEtape('nom')}>← Précédent</Button>
          <Button size="lg" className="px-10" onClick={confirmer}>Créer le modèle ✓</Button>
        </div>
      </div>
    </div>
  )
}
