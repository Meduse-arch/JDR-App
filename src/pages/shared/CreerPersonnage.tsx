import { useState, useEffect } from 'react'
import { useStore, type PersonnageType } from '../../store/useStore'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { PenTool, Dices, Edit, ArrowRight, X, Check } from 'lucide-react'

type Stat    = { id: string; nom: string; description: string }
type StatJet = { stat: Stat; valeur: number }
type Props   = { type: PersonnageType; isTemplate?: boolean; lieAuCompte?: string; retour: () => void | Promise<void> }

const ORDRE_STATS = ['Force', 'Agilité', 'Constitution', 'Intelligence', 'Sagesse', 'Perception', 'Charisme']

export default function CreerPersonnage({ type, isTemplate = false, lieAuCompte, retour }: Props) {
  const compte        = useStore(s => s.compte)
  const sessionActive = useStore(s => s.sessionActive)

  const [nom, setNom]                     = useState('')
  const [stats, setStats]                 = useState<Stat[]>([])
  const [statsMax, setStatsMax]           = useState<Stat[]>([])
  const [jets, setJets]                   = useState<StatJet[]>([])
  const [etape, setEtape]                 = useState<'nom' | 'stats'>('nom')
  const [rerollsRestants, setRerollsRestants] = useState(6)

  const isAuto = type === 'Monstre' || type === 'PNJ' || type === 'Boss'
  const [modeCreation, setModeCreation] = useState<'roll' | 'manuel'>('roll')
  const [maxStat, setMaxStat] = useState(20)

  useEffect(() => {
    const db = (window as any).db;
    db.stats.getAll().then((res: any) => {
      if (res.success && res.data) {
        const data = res.data;
        const STATS_CALCULEES = ['PV Max', 'Mana Max', 'Stamina Max', 'HP Max', 'hp_max', 'mana_max', 'stam_max']
        const filtered = data.filter((s: any) => !STATS_CALCULEES.includes(s.nom))
        const sorted = filtered.sort((a: any, b: any) => ORDRE_STATS.indexOf(a.nom) - ORDRE_STATS.indexOf(b.nom))
        setStats(sorted)
        setStatsMax(data.filter((s: any) => STATS_CALCULEES.includes(s.nom)))
      }
    })
  }, [])

  const genererStats = () => {
    if (stats.length === 0) {
      alert("Erreur : Aucune statistique trouvée en base de données.")
      return
    }
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

  const [enCours, setEnCours] = useState(false)

  const getVal = (n: string) => jets.find(j => j.stat.nom === n)?.valeur || 0
  const con = getVal('Constitution'), int = getVal('Intelligence'), sag = getVal('Sagesse'), for_ = getVal('Force'), agi = getVal('Agilité')
  const hp = con * 4, mana = Math.round(((int + sag) / 2) * 10), stam = Math.round(((for_ + agi + con) / 3) * 10)

  const confirmer = async () => {
    if (!sessionActive || enCours) return
    setEnCours(true)
    try {
      const db = (window as any).db;
      const newPersoId = crypto.randomUUID();
      const personnageData = {
        id: newPersoId,
        id_session: sessionActive.id,
        nom, type, is_template: isTemplate ? 1 : 0,
        lie_au_compte: (!isTemplate && type === 'Joueur') ? (lieAuCompte || compte?.id) : null,
        hp: hp,
        mana: mana,
        stam: stam,
        created_at: new Date().toISOString()
      };

      const resPerso = await db.personnages.create(personnageData);

      if (!resPerso.success) { 
        alert(`Erreur de création: ${resPerso.error}`); 
        setEnCours(false);
        return 
      }

      for (const j of jets) {
        await db.personnage_stats.create({ id: crypto.randomUUID(), id_personnage: newPersoId, id_stat: j.stat.id, valeur: j.valeur });
      }
      
      const maxStatsToInsert = []
      const pvm = statsMax.find(s => s.nom === 'PV Max' || s.nom === 'HP Max' || s.nom === 'hp_max')
      if (pvm) maxStatsToInsert.push({ id_personnage: newPersoId, id_stat: pvm.id, valeur: hp })
      
      const manam = statsMax.find(s => s.nom === 'Mana Max' || s.nom === 'mana_max')
      if (manam) maxStatsToInsert.push({ id_personnage: newPersoId, id_stat: manam.id, valeur: mana })
      
      const stamm = statsMax.find(s => s.nom === 'Stamina Max' || s.nom === 'stam_max')
      if (stamm) maxStatsToInsert.push({ id_personnage: newPersoId, id_stat: stamm.id, valeur: stam })
      
      for (const ms of maxStatsToInsert) {
        await db.personnage_stats.create({ id: crypto.randomUUID(), id_personnage: ms.id_personnage, id_stat: ms.id_stat, valeur: ms.valeur });
      }

      if (!isTemplate && type === 'Joueur') {
        await db.session_joueurs.create({ id_session: sessionActive.id, id_personnage: newPersoId });
      }
      
      await retour()
      setEnCours(false)
    } catch (e: any) {
      alert(`Erreur inattendue: ${e.message}`)
      setEnCours(false)
    }
  }

  if (etape === 'nom') return (
    <div className="flex flex-col items-center justify-center h-full p-4 overflow-y-auto">
      <Card className="w-full max-w-sm p-8 shadow-2xl bg-card/40">
        <h2 className="text-2xl font-cinzel font-black text-center mb-8 uppercase tracking-widest text-theme-main">
          {isTemplate ? `Nouveau Modèle ${type}` : `Nouveau ${type}`}
        </h2>
        <div className="flex flex-col gap-6">
          <Input icon={<PenTool size={18} />} type="text" placeholder="Nom de l'entité" value={nom} onChange={e => setNom(e.target.value)} onKeyDown={e => e.key === 'Enter' && nom && genererStats()} className="font-garamond font-bold text-center" />
          {isAuto && (
            <div className="flex flex-col gap-4 p-4 rounded-sm border border-dashed border-theme/20 bg-black/20">
              <div className="flex gap-2">
                <Button variant={modeCreation === 'roll' ? 'primary' : 'secondary'} size="sm" className="flex-1 font-cinzel" onClick={() => setModeCreation('roll')}><Dices size={14} className="mr-2" /> Roll</Button>
                <Button variant={modeCreation === 'manuel' ? 'primary' : 'secondary'} size="sm" className="flex-1 font-cinzel" onClick={() => setModeCreation('manuel')}><Edit size={14} className="mr-2" /> Manuel</Button>
              </div>
              {modeCreation === 'roll' && (
                <div className="flex items-center justify-between gap-4 mt-1 px-1">
                  <label className="text-[10px] font-cinzel font-black uppercase opacity-40">Puissance Max :</label>
                  <input type="number" value={maxStat} onChange={e => setMaxStat(parseInt(e.target.value) || 20)} className="bg-transparent border-b border-theme/30 w-12 text-center text-sm font-black outline-none focus:border-theme-main text-primary" />
                </div>
              )}
            </div>
          )}
          <Button size="lg" onClick={() => nom && genererStats()} disabled={!nom} className="w-full mt-4 font-cinzel" variant={nom ? 'primary' : 'secondary'}>Suivant <ArrowRight size={18} className="ml-2" /></Button>
          <Button variant="ghost" onClick={retour} className="text-xs mt-2 font-cinzel opacity-40 hover:opacity-100">Abjurer la création</Button>
        </div>
      </Card>
    </div>
  )

  return (
    <div className="flex flex-col h-full p-4 md:p-8 overflow-y-auto custom-scrollbar">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10 pb-6 border-b border-theme">
        <h2 className="text-2xl md:text-3xl font-cinzel font-black tracking-widest uppercase text-theme-main">
          {nom} <span className="opacity-40 ml-2 font-garamond text-lg">({isTemplate ? 'Modèle' : type})</span>
        </h2>
        <div className="flex items-center gap-4">
          {modeCreation === 'roll' && <Badge variant={rerollsRestants <= 2 ? 'error' : 'default'} className="font-cinzel"><Dices size={12} className="mr-2" /> Rerolls : {rerollsRestants}</Badge>}
          <Button variant="ghost" size="sm" onClick={() => setEtape('nom')} className="font-cinzel"><X size={16} className="mr-2" /> Précédent</Button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {jets.map((jet, index) => (
          <Card key={jet.stat.id} className="flex-row justify-between items-center gap-4 bg-card/40 p-6">
            <div className="flex-1 min-w-0">
              <p className="font-cinzel font-bold text-base text-primary uppercase tracking-widest">{jet.stat.nom}</p>
              <p className="text-[10px] font-garamond truncate mt-1 opacity-50 italic">"{jet.stat.description}"</p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              {modeCreation === 'manuel' ? (
                <input type="number" value={jet.valeur} onChange={e => modifierManuel(index, parseInt(e.target.value) || 0)} className="w-16 bg-black/20 border border-theme/30 rounded-sm px-2 py-2 text-center font-cinzel font-black text-xl outline-none focus:border-theme-main text-theme-main" />
              ) : (
                <>
                  <span className="text-3xl font-cinzel font-black w-12 text-center text-theme-main">{jet.valeur}</span>
                  <Button size="sm" variant={rerollsRestants > 0 ? 'secondary' : 'ghost'} onClick={() => relancerStat(index)} disabled={rerollsRestants <= 0} className="w-10 h-10 p-0 flex items-center justify-center rounded-sm"><Dices size={18} /></Button>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>

      <div className="flex justify-center gap-6 mb-12 flex-wrap">
        {[
          { label: 'PV Max', val: hp, color: 'text-red-400', bg: 'bg-red-900/10', border: 'border-red-900/20' },
          { label: 'Mana Max', val: mana, color: 'text-blue-400', bg: 'bg-blue-900/10', border: 'border-blue-900/20' },
          { label: 'Stam Max', val: stam, color: 'text-yellow-400', bg: 'bg-yellow-900/10', border: 'border-yellow-900/20' }
        ].map(m => (
          <div key={m.label} className={`p-6 rounded-sm ${m.bg} border ${m.border} text-center flex-1 min-w-[120px] max-w-[180px] shadow-sm`}>
            <p className={`text-[10px] font-cinzel font-black uppercase opacity-50 ${m.color} tracking-widest mb-1`}>{m.label}</p>
            <p className={`text-3xl font-cinzel font-black ${m.color}`}>{m.val}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-center pb-10 mt-auto">
        <Button size="lg" onClick={confirmer} disabled={enCours} className="px-12 py-4 text-lg font-cinzel font-black uppercase tracking-widest w-full sm:w-auto">
          {enCours ? 'Invocations en cours...' : <><Check size={20} className="mr-2" /> Confirmer le destin</>}
        </Button>
      </div>
    </div>
  )
}
