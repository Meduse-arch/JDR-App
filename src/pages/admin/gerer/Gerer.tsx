import { useEffect, useState } from 'react'
import { supabase } from '../../../supabase'
import { useStore } from '../../../store/useStore'
import GererStats from './GererStats'
import GererInventaire from './GererInventaire'
import GererCompetences from './GererCompetences'

type Personnage = {
  id: string; nom: string; est_pnj: boolean; lie_au_compte?: string | null
  hp_actuel: number; hp_max: number; mana_actuel: number; mana_max: number
  stam_actuel: number; stam_max: number
}
type Stat           = { id: string; nom: string; description: string }
type PersonnageStat = { id_stat: string; valeur: number }

// Suppression de 'tous'
type FiltreType = 'joueur' | 'pnj'

export default function Gerer() {
  const sessionActive = useStore(s => s.sessionActive)

  const [personnages,     setPersonnages]     = useState<Personnage[]>([])
  const [selectionne,     setSelectionne]     = useState<Personnage | null>(null)
  const [onglet,          setOnglet]          = useState<'stats' | 'inventaire' | 'competences'>('stats')
  const [stats,           setStats]           = useState<Stat[]>([])
  const [personnageStats, setPersonnageStats] = useState<PersonnageStat[]>([])
  // Initialisation sur 'joueur' au lieu de 'tous'
  const [filtreType,      setFiltreType]      = useState<FiltreType>('joueur')

  useEffect(() => { chargerPersonnages() }, [sessionActive])
  useEffect(() => {
    supabase.from('stats').select('*').then(({ data }) => { if (data) setStats(data) })
  }, [])

  const chargerPersonnages = async () => {
    if (!sessionActive) return
    const { data: sjData } = await supabase
      .from('session_joueurs').select('id_personnage').eq('id_session', sessionActive.id)
    if (!sjData || sjData.length === 0) return
    const ids = sjData.map((r: any) => r.id_personnage)
    const { data } = await supabase.from('personnages').select('*').in('id', ids)
    if (data) setPersonnages(data)
  }

  const selectionnerPersonnage = async (p: Personnage) => {
    setSelectionne(p)
    const { data } = await supabase
      .from('personnage_stats').select('id_stat, valeur').eq('id_personnage', p.id)
    if (data) setPersonnageStats(data)
  }

  const nbJoueurs = personnages.filter(p => !p.est_pnj).length
  const nbPnjs    = personnages.filter(p => p.est_pnj).length

  // Logique de filtrage simplifiée
  const personnagesFiltres = personnages.filter(p => {
    if (filtreType === 'joueur') return !p.est_pnj
    return p.est_pnj
  })

  const btnFiltre = (id: FiltreType, label: string, count: number) => (
    <button
      key={id}
      onClick={() => {
        setFiltreType(id)
        if (selectionne) {
          // Désélection si le type ne correspond plus
          const visible = id === 'joueur' ? !selectionne.est_pnj : selectionne.est_pnj
          if (!visible) setSelectionne(null)
        }
      }}
      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
      style={{
        backgroundColor: filtreType === id ? 'var(--color-main)' : 'var(--bg-surface)',
        color: filtreType === id ? '#fff' : 'var(--text-secondary)',
        border: `1px solid ${filtreType === id ? 'var(--color-main)' : 'var(--border)'}`,
        boxShadow: filtreType === id ? '0 0 8px var(--color-glow)' : 'none',
      }}
    >
      {label}
      <span
        className="px-1.5 py-0.5 rounded-md text-[10px] font-black"
        style={{
          backgroundColor: filtreType === id ? 'rgba(255,255,255,0.25)' : 'var(--bg-app)',
          color: filtreType === id ? '#fff' : 'var(--text-muted)',
        }}
      >
        {count}
      </span>
    </button>
  )

  const btnOnglet = (id: 'stats' | 'inventaire' | 'competences', label: string) => (
    <button key={id} onClick={() => setOnglet(id)}
      className="px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap"
      style={{
        backgroundColor: onglet === id ? 'var(--color-main)' : 'var(--bg-surface)',
        color: onglet === id ? '#fff' : 'var(--text-secondary)',
        border: '1px solid var(--border)',
      }}>
      {label}
    </button>
  )

  return (
    <div className="flex flex-col h-full p-4 sm:p-6 md:p-8 overflow-y-auto custom-scrollbar"
      style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>

      <h2 className="text-xl sm:text-2xl font-black mb-5"
        style={{
          background: 'linear-gradient(135deg, var(--color-light), var(--color-accent2))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>
        Paramètres Session
      </h2>

      {!sessionActive && (
        <p className="text-center mt-16" style={{ color: 'var(--text-secondary)' }}>
          Rejoins une session d'abord
        </p>
      )}

      {sessionActive && (
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 min-h-0 flex-1">

          <div
            className="flex flex-col md:w-56 shrink-0 p-3 rounded-2xl gap-3"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            {/* Filtre "Tous" retiré ici */}
            <div className="flex gap-1.5">
              {btnFiltre('joueur', '🧑 Joueurs', nbJoueurs)}
              {btnFiltre('pnj',    '👤 PNJ',     nbPnjs)}
            </div>

            <div className="h-px" style={{ backgroundColor: 'var(--border)' }} />

            <div className="flex md:flex-col flex-row overflow-x-auto md:overflow-x-hidden overflow-y-hidden md:overflow-y-auto gap-1.5 custom-scrollbar flex-1">
              {personnagesFiltres.length === 0 && (
                <p className="text-sm px-1 whitespace-nowrap md:whitespace-normal"
                  style={{ color: 'var(--text-muted)' }}>
                  Aucun {filtreType === 'pnj' ? 'PNJ' : 'joueur'}
                </p>
              )}

              {personnagesFiltres.map(p => (
                <button key={p.id}
                  onClick={() => selectionnerPersonnage(p)}
                  className="shrink-0 md:w-full text-left px-3 py-2 md:py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap md:whitespace-normal"
                  style={{
                    backgroundColor: selectionne?.id === p.id ? 'var(--color-main)' : 'transparent',
                    color: selectionne?.id === p.id ? '#fff' : 'var(--text-secondary)',
                    border: `1px solid ${selectionne?.id === p.id ? 'var(--color-main)' : 'transparent'}`,
                  }}
                >
                  <span className="shrink-0">{p.est_pnj ? '👤' : '🧑'}</span>
                  <span className="truncate">{p.nom}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 min-w-0 overflow-y-auto custom-scrollbar">
            {!selectionne && (
              <div className="flex flex-col items-center justify-center h-32 md:h-full opacity-50">
                <span className="text-3xl mb-2">👆</span>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Sélectionne un personnage
                </p>
              </div>
            )}

            {selectionne && (
              <div className="flex flex-col gap-4 sm:gap-5">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-lg sm:text-xl font-black">{selectionne.nom}</h3>
                  <span className="text-xs px-2 py-1 rounded-lg font-bold"
                    style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                    {selectionne.est_pnj ? '👤 PNJ' : '🧑 Joueur'}
                  </span>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
                  {btnOnglet('stats', '📊 Stats')}
                  {btnOnglet('inventaire', '🎒 Inventaire')}
                  {btnOnglet('competences', '📖 Compétences')}
                </div>

                {onglet === 'stats' && (
                  <GererStats
                    personnage={selectionne} stats={stats} personnageStats={personnageStats}
                    onUpdate={(p: any) => { setSelectionne(p); selectionnerPersonnage(p) }}
                  />
                )}
                {onglet === 'inventaire' && <GererInventaire personnage={selectionne} />}
                {onglet === 'competences' && <GererCompetences personnage={selectionne} />}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}