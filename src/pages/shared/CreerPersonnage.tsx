import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useStore, type PersonnageType } from '../../Store/useStore'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'

type Stat    = { id: string; nom: string; description: string }
type StatJet = { stat: Stat; valeur: number }
type Props   = { type: PersonnageType; isTemplate?: boolean; retour: () => void }

const ORDRE_STATS = ['Force', 'Agilité', 'Constitution', 'Intelligence', 'Sagesse', 'Perception', 'Charisme']

export default function CreerPersonnage({ type, isTemplate = false, retour }: Props) {
  const compte        = useStore(s => s.compte)
  const sessionActive = useStore(s => s.sessionActive)

  const [nom, setNom]                     = useState('')
  const [stats, setStats]                 = useState<Stat[]>([])
  const [jets, setJets]                   = useState<StatJet[]>([])
  const [etape, setEtape]                 = useState<'nom' | 'stats'>('nom')
  const [rerollsRestants, setRerollsRestants] = useState(6)

  const isAuto = type === 'Monstre' || type === 'PNJ'
  const [modeCreation, setModeCreation] = useState<'roll' | 'manuel'>('roll')
  const [maxStat, setMaxStat] = useState(20)

  useEffect(() => {
    supabase.from('stats').select('*').then(({ data }) => {
      if (data) {
        const sorted = [...data].sort((a, b) => ORDRE_STATS.indexOf(a.nom) - ORDRE_STATS.indexOf(b.nom))
        setStats(sorted)
      }
    })
  }, [])

  const genererStats = () => {
    if (stats.length === 0) return
    if (modeCreation === 'roll') {
      const valDe = isAuto ? Math.max(1, Math.floor(maxStat / 4)) : 5
      const resultats = stats.map(stat => {
        const des = Array.from({ length: 4 }, () => Math.floor(Math.random() * valDe) + 1)
        return { stat, valeur: des.reduce((a, b) => a + b, 0) }
      })
      setJets(resultats)
      setRerollsRestants(6)
    } else {
      setJets(stats.map(s => ({ stat: s, valeur: 10 })))
      setRerollsRestants(0)
    }
    setEtape('stats')
  }

  const relancerStat = (index: number) => {
    if (rerollsRestants <= 0 || modeCreation === 'manuel') return
    const valDe = isAuto ? Math.max(1, Math.floor(maxStat / 4)) : 5
    const des = Array.from({ length: 4 }, () => Math.floor(Math.random() * valDe) + 1)
    const nouveauxJets = [...jets]
    nouveauxJets[index] = { ...nouveauxJets[index], valeur: des.reduce((a, b) => a + b, 0) }
    setJets(nouveauxJets)
    setRerollsRestants(r => r - 1)
  }

  const modifierManuel = (index: number, val: number) => {
    const nouveauxJets = [...jets]
    nouveauxJets[index] = { ...nouveauxJets[index], valeur: val }
    setJets(nouveauxJets)
  }

  const confirmer = async () => {
    if (!sessionActive) return
    const getVal = (n: string) => jets.find(j => j.stat.nom === n)?.valeur || 0
    const con = getVal('Constitution'), int = getVal('Intelligence'), sag = getVal('Sagesse'), for_ = getVal('Force'), agi = getVal('Agilité')
    const hp = con * 4, mana = Math.round(((int + sag) / 2) * 10), stam = Math.round(((for_ + agi + con) / 3) * 10)

    const { data: personnage, error } = await supabase
      .from('personnages')
      .insert({
        id_session: sessionActive.id,
        nom, type, is_template: isTemplate,
        lie_au_compte: (!isTemplate && type === 'Joueur') ? compte?.id : null,
        hp_max: hp, hp_actuel: hp,
        mana_max: mana, mana_actuel: mana,
        stam_max: stam, stam_actuel: stam,
      })
      .select().single()

    if (error || !personnage) { alert(error?.message); return }

    await supabase.from('personnage_stats').insert(jets.map(j => ({ id_personnage: personnage.id, id_stat: j.stat.id, valeur: j.valeur })))
    if (!isTemplate) await supabase.from('session_joueurs').insert({ id_session: sessionActive.id, id_personnage: personnage.id })
    
    retour()
  }

  if (etape === 'nom') return (
    <div className="flex flex-col items-center justify-center h-full p-4 overflow-y-auto" style={{ backgroundColor: 'var(--bg-app)' }}>
      <Card className="w-full max-w-sm p-6 sm:p-8 shadow-2xl">
        <h2 className="text-2xl font-black text-center mb-6" style={{ background: 'linear-gradient(135deg, var(--color-light), var(--color-accent2))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          {isTemplate ? `Nouveau Modèle ${type}` : `Nouveau ${type}`}
        </h2>
        <div className="flex flex-col gap-4">
          <Input icon="🖋️" type="text" placeholder="Nom" value={nom} onChange={e => setNom(e.target.value)} onKeyDown={e => e.key === 'Enter' && nom && genererStats()} className="font-bold text-center" />
          {isAuto && (
            <div className="flex flex-col gap-3 p-3 rounded-xl border border-dashed border-white/10 bg-white/5">
              <div className="flex gap-2">
                <Button variant={modeCreation === 'roll' ? 'primary' : 'secondary'} size="sm" className="flex-1" onClick={() => setModeCreation('roll')}>🎲 Roll</Button>
                <Button variant={modeCreation === 'manuel' ? 'primary' : 'secondary'} size="sm" className="flex-1" onClick={() => setModeCreation('manuel')}>✍️ Manuel</Button>
              </div>
              {modeCreation === 'roll' && (
                <div className="flex items-center justify-between gap-4 mt-1 px-1">
                  <label className="text-[10px] font-bold opacity-60">Max Stat :</label>
                  <input type="number" value={maxStat} onChange={e => setMaxStat(parseInt(e.target.value) || 20)} className="bg-transparent border-b border-white/20 w-12 text-center text-sm font-bold outline-none focus:border-main" />
                </div>
              )}
            </div>
          )}
          <Button size="lg" onClick={() => nom && genererStats()} disabled={!nom} className="w-full mt-2" variant={nom ? 'primary' : 'secondary'}>Suivant →</Button>
          <Button variant="ghost" onClick={retour} className="text-sm mt-1">Annuler</Button>
        </div>
      </Card>
    </div>
  )

  return (
    <div className="flex flex-col h-full p-4 md:p-8 overflow-y-auto custom-scrollbar" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-5" style={{ borderBottom: '1px solid var(--border)' }}>
        <h2 className="text-2xl md:text-3xl font-black tracking-tight" style={{ background: 'linear-gradient(135deg, var(--color-light), var(--color-accent2))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          {nom} ({isTemplate ? 'Modèle' : type})
        </h2>
        <div className="flex items-center gap-4">
          {modeCreation === 'roll' && <Badge variant={rerollsRestants <= 2 ? 'error' : 'default'}>🎲 Rerolls : {rerollsRestants}</Badge>}
          <Button variant="ghost" size="sm" onClick={() => setEtape('nom')}>← Retour</Button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {jets.map((jet, index) => (
          <Card key={jet.stat.id} className="flex-row justify-between items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate text-base">{jet.stat.nom}</p>
              <p className="text-xs truncate mt-0.5 opacity-60">{jet.stat.description}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {modeCreation === 'manuel' ? (
                <input type="number" value={jet.valeur} onChange={e => modifierManuel(index, parseInt(e.target.value) || 0)} className="w-16 bg-surface border border-border rounded-xl px-2 py-2 text-center font-black text-xl outline-none focus:border-main" style={{ color: 'var(--color-main)' }} />
              ) : (
                <>
                  <span className="text-3xl font-black w-10 text-center" style={{ color: 'var(--color-main)' }}>{jet.valeur}</span>
                  <Button size="sm" variant={rerollsRestants > 0 ? 'secondary' : 'ghost'} onClick={() => relancerStat(index)} disabled={rerollsRestants <= 0} className="w-10 h-10 p-0 text-lg flex items-center justify-center rounded-xl">🎲</Button>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>
      <div className="flex justify-center pb-8 mt-auto">
        <Button size="lg" onClick={confirmer} className="px-10 py-4 text-lg rounded-2xl w-full sm:w-auto">Confirmer ✓</Button>
      </div>
    </div>
  )
}
