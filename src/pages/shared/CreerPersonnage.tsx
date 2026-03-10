import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'

type Stat    = { id: string; nom: string; description: string }
type StatJet = { stat: Stat; valeur: number }
type Props   = { 
  estPnj: boolean; 
  isTemplate?: boolean; 
  categorie?: 'PNJ' | 'Monstre';
  retour: () => void 
}

export default function CreerPersonnage({ estPnj, isTemplate = false, categorie = 'PNJ', retour }: Props) {
  const compte        = useStore(s => s.compte)
  const sessionActive = useStore(s => s.sessionActive)

  const [nom, setNom]                     = useState('')
  const [stats, setStats]                 = useState<Stat[]>([])
  const [jets, setJets]                   = useState<StatJet[]>([])
  const [etape, setEtape]                 = useState<'nom' | 'stats'>('nom')
  const [rerollsRestants, setRerollsRestants] = useState(6)

  useEffect(() => { chargerStats() }, [])

  const chargerStats = async () => {
    const { data } = await supabase.from('stats').select('*')
    if (data) setStats(data)
  }

  const lancerDes = () => {
    const resultats = stats.map(stat => {
      const des = Array.from({ length: 4 }, () => Math.floor(Math.random() * 5) + 1)
      return { stat, valeur: des.reduce((a, b) => a + b, 0) }
    })
    setJets(resultats)
    setRerollsRestants(6)
    setEtape('stats')
  }

  const relancerStat = (index: number) => {
    if (rerollsRestants <= 0) return
    const des = Array.from({ length: 4 }, () => Math.floor(Math.random() * 5) + 1)
    const nouveauxJets = [...jets]
    nouveauxJets[index] = { ...nouveauxJets[index], valeur: des.reduce((a, b) => a + b, 0) }
    setJets(nouveauxJets)
    setRerollsRestants(r => r - 1)
  }

  const confirmer = async () => {
    const constitution = jets.find(j => j.stat.nom === 'Constitution')
    const intelligence = jets.find(j => j.stat.nom === 'Intelligence')
    const sagesse      = jets.find(j => j.stat.nom === 'Sagesse')
    const force        = jets.find(j => j.stat.nom === 'Force')
    const agilite      = jets.find(j => j.stat.nom === 'Agilité')

    const hp   = constitution ? constitution.valeur * 4 : 0
    const mana = Math.round((( (intelligence?.valeur || 0) + (sagesse?.valeur || 0) ) / 2) * 10)
    const stam = (force && agilite && constitution)
      ? Math.round((force.valeur + agilite.valeur + constitution.valeur) / 3 * 10)
      : 0

    const insertData: any = {
      nom: isTemplate ? `[Modèle] ${nom}` : nom,
      est_pnj: estPnj,
      categorie_pnj: categorie,
      lie_au_compte: estPnj ? null : compte?.id,
      hp_max: hp, hp_actuel: hp,
      mana_max: mana, mana_actuel: mana,
      stam_max: stam, stam_actuel: stam,
    };

    const { data: personnage, error } = await supabase
      .from('personnages')
      .insert(insertData)
      .select().single()

    if (error || !personnage) {
      console.error("Erreur création personnage:", error);
      return;
    }

    await supabase.from('personnage_stats').insert(
      jets.map(j => ({ id_personnage: personnage.id, id_stat: j.stat.id, valeur: j.valeur }))
    )
    if (sessionActive) {
      await supabase.from('session_joueurs').insert({
        id_session: sessionActive.id,
        id_personnage: personnage.id,
      })
    }
    retour()
  }

  /* ── Étape 1 : Saisie du nom ── */
  if (etape === 'nom') return (
    <div
      className="flex flex-col items-center justify-center h-full p-4"
      style={{ backgroundColor: 'var(--bg-app)' }}
    >
      <Card className="w-full max-w-sm flex flex-col gap-6 p-6 sm:p-8 shadow-2xl">
        <h2
          className="text-2xl font-black text-center"
          style={{
            background: 'linear-gradient(135deg, var(--color-light), var(--color-accent2))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {estPnj ? '👤 Créer un PNJ' : '🧑 Créer un personnage'}
        </h2>

        <div className="flex flex-col gap-4">
          <Input
            icon="🖋️"
            type="text"
            placeholder="Nom du personnage"
            value={nom}
            onChange={e => setNom(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && nom && lancerDes()}
            className="font-bold text-center pl-4 pr-4" // Override icon padding for center alignment
          />

          <Button
            size="lg"
            onClick={() => nom && lancerDes()}
            disabled={!nom}
            className="w-full"
            variant={nom ? 'primary' : 'secondary'}
          >
            Lancer les dés →
          </Button>

          <Button
            variant="ghost"
            onClick={retour}
            className="text-sm mt-2"
          >
            ← Retour
          </Button>
        </div>
      </Card>
    </div>
  )

  /* ── Étape 2 : Stats générées ── */
  return (
    <div
      className="flex flex-col h-full p-4 md:p-8 overflow-y-auto custom-scrollbar"
      style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-5"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <h2
          className="text-2xl md:text-3xl font-black tracking-tight"
          style={{
            background: 'linear-gradient(135deg, var(--color-light), var(--color-accent2))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Stats de {nom}
        </h2>
        <div className="flex items-center gap-4 flex-wrap">
          <Badge 
            variant={rerollsRestants <= 2 ? 'error' : 'default'} 
            className="text-sm px-3 py-1.5"
          >
            🎲 Rerolls : {rerollsRestants}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEtape('nom')}
          >
            ← Modifier le nom
          </Button>
        </div>
      </div>

      {/* Grille de stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {jets.map((jet, index) => (
          <Card
            key={jet.stat.id}
            className="flex-row justify-between items-center gap-4"
          >
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate text-base" style={{ color: 'var(--text-primary)' }}>
                {jet.stat.nom}
              </p>
              <p className="text-xs truncate mt-0.5 opacity-60">
                {jet.stat.description}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-3xl font-black w-10 text-center" style={{ color: 'var(--color-main)' }}>
                {jet.valeur}
              </span>
              <Button
                size="sm"
                variant={rerollsRestants > 0 ? 'secondary' : 'ghost'}
                onClick={() => relancerStat(index)}
                disabled={rerollsRestants <= 0}
                className="w-10 h-10 p-0 text-lg flex items-center justify-center rounded-xl"
              >
                🎲
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Bouton confirmer */}
      <div className="flex justify-center pb-8 mt-auto">
        <Button
          size="lg"
          onClick={confirmer}
          className="px-10 py-4 text-lg rounded-2xl w-full sm:w-auto"
        >
          Confirmer le personnage ✓
        </Button>
      </div>
    </div>
  )
}
