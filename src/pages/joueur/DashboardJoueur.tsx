import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { CATEGORIE_EMOJI } from '../../utils/constants'

type Personnage = {
  id: string; nom: string
  hp_actuel: number; hp_max: number
  mana_actuel: number; mana_max: number
  stam_actuel: number; stam_max: number
}
type Equipement = { id: string; items: { nom: string; categorie: string } }

export default function DashboardJoueur() {
  const compte        = useStore(s => s.compte)
  const sessionActive = useStore(s => s.sessionActive)
  const setPageCourante = useStore(s => s.setPageCourante)

  const [personnage,  setPersonnage]  = useState<Personnage | null>(null)
  const [equipements, setEquipements] = useState<Equipement[]>([])
  const [chargement,  setChargement]  = useState(true)

  useEffect(() => { chargerDonnees() }, [sessionActive])

  const chargerDonnees = async () => {
    if (!sessionActive || !compte) { setChargement(false); return }
    const { data: persoData } = await supabase
      .from('session_joueurs').select('personnages(*)').eq('id_session', sessionActive.id)
    if (persoData) {
      const perso = persoData.map((d: any) => d.personnages)
        .find((p: any) => p.lie_au_compte === compte.id && !p.est_pnj)
      if (perso) {
        setPersonnage(perso)
        const { data: eqData } = await supabase
          .from('inventaire').select('id, items(nom, categorie)')
          .eq('id_personnage', perso.id).eq('equipe', true)
        if (eqData) setEquipements(eqData as any)
      }
    }
    setChargement(false)
  }

  if (chargement) return (
    <div className="p-8 animate-pulse" style={{ color: 'var(--text-muted)' }}>
      Chargement de l'aventure...
    </div>
  )
  if (!sessionActive) return (
    <div className="flex flex-col items-center justify-center h-full gap-4"
      style={{ color: 'var(--text-secondary)' }}>
      <span className="text-4xl">🏕️</span>
      <p>Rejoins une session pour commencer l'aventure.</p>
    </div>
  )
  if (!personnage) return (
    <div className="flex flex-col items-center justify-center h-full gap-4"
      style={{ color: 'var(--text-secondary)' }}>
      <span className="text-4xl">📜</span>
      <p>Tu n'as pas encore de personnage pour cette session.</p>
      <Button
        onClick={() => setPageCourante('mon-personnage')}
        className="mt-2"
        size="lg"
      >
        Créer mon personnage
      </Button>
    </div>
  )

  const ressources = [
    { label: 'PV',   emoji: '❤️', actuel: personnage.hp_actuel,   max: personnage.hp_max,   color: '#ef4444' },
    { label: 'Mana', emoji: '💧', actuel: personnage.mana_actuel, max: personnage.mana_max, color: '#3b82f6' },
    { label: 'Stam', emoji: '⚡', actuel: personnage.stam_actuel, max: personnage.stam_max, color: '#eab308' },
  ]

  return (
    <div className="flex flex-col h-full p-4 md:p-8 overflow-y-auto custom-scrollbar"
      style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>

      <div className="mb-8">
        <h2 className="text-2xl md:text-3xl font-black mb-1">
          Bon retour,{' '}
          <span style={{
            background: 'linear-gradient(135deg, var(--color-light), var(--color-accent2))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            {personnage.nom}
          </span>
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>Session : {sessionActive.nom}</p>
      </div>

      {/* Raccourcis */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Ma Fiche',    emoji: '🎭', id: 'mon-personnage' },
          { label: 'Mon Sac',     emoji: '🎒', id: 'mon-inventaire' },
          { label: 'Lancer les Dés', emoji: '🎲', id: 'lancer-des' },
        ].map(btn => (
          <Card 
            key={btn.id} 
            hoverEffect 
            onClick={() => setPageCourante(btn.id)}
            className="flex-col items-center justify-center p-4 md:p-6 cursor-pointer group"
          >
            <span className="text-3xl md:text-4xl transition-transform group-hover:scale-110">{btn.emoji}</span>
            <span className="font-bold text-sm md:text-base mt-2">{btn.label}</span>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* État de santé */}
        <Card className="p-6">
          <h3 className="text-base font-bold mb-5 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
            🩺 État de santé
          </h3>
          <div className="flex flex-col gap-5">
            {ressources.map(r => (
              <div key={r.label}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    {r.emoji} {r.label}
                  </span>
                  <span className="font-black">{r.actuel} / {r.max}</span>
                </div>
                <div className="w-full rounded-full h-3 overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (r.actuel / r.max) * 100)}%`,
                      backgroundColor: r.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Équipement */}
        <Card className="p-6">
          <h3 className="text-base font-bold mb-5 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
            ⚔️ Actuellement Équipé
          </h3>
          {equipements.length === 0 ? (
            <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>Aucun équipement porté.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {equipements.map(eq => (
                <div key={eq.id} className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                  <span className="text-xl">{CATEGORIE_EMOJI[eq.items.categorie as import('../../types').CategorieItem] || '📦'}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{eq.items.nom}</p>
                    <Badge variant="ghost" className="mt-1">{eq.items.categorie}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
