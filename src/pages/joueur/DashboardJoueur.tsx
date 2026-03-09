import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'

type Personnage = {
  id: string; nom: string
  hp_actuel: number; hp_max: number
  mana_actuel: number; mana_max: number
  stam_actuel: number; stam_max: number
}
type Equipement = { id: string; items: { nom: string; categorie: string } }

const CATEGORIE_EMOJI: Record<string, string> = {
  Arme: '⚔️', Armure: '🛡️', Bijou: '💍', Consommable: '🧪', 'Artéfact': '✨', Divers: '📦',
}

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
      <button
        onClick={() => setPageCourante('mon-personnage')}
        className="px-6 py-2 rounded-xl font-bold text-white transition-all hover:-translate-y-0.5 mt-2"
        style={{ background: 'linear-gradient(135deg, var(--color-main), var(--color-accent2))' }}>
        Créer mon personnage
      </button>
    </div>
  )

  const ressources = [
    { label: 'PV',   emoji: '❤️', actuel: personnage.hp_actuel,   max: personnage.hp_max,   color: '#ef4444' },
    { label: 'Mana', emoji: '💧', actuel: personnage.mana_actuel, max: personnage.mana_max, color: '#3b82f6' },
    { label: 'Stam', emoji: '⚡', actuel: personnage.stam_actuel, max: personnage.stam_max, color: '#eab308' },
  ]

  const cardStyle = { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }

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
          <button key={btn.id} onClick={() => setPageCourante(btn.id)}
            className="p-4 md:p-6 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all hover:-translate-y-1 group"
            style={cardStyle}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-main)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
            <span className="text-3xl md:text-4xl transition-transform group-hover:scale-110">{btn.emoji}</span>
            <span className="font-bold text-sm md:text-base">{btn.label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* État de santé */}
        <div className="p-6 rounded-2xl" style={cardStyle}>
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
        </div>

        {/* Équipement */}
        <div className="p-6 rounded-2xl" style={cardStyle}>
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
                  <span className="text-xl">{CATEGORIE_EMOJI[eq.items.categorie] || '📦'}</span>
                  <div>
                    <p className="font-semibold text-sm">{eq.items.nom}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{eq.items.categorie}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}