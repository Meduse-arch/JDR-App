import { useEffect, useState } from 'react'
import { supabase } from '../../../supabase'
import { useStore } from '../../../store/useStore'
import GererStats from './GererStats'
import GererInventaire from './GererInventaire'

type Personnage = {
  id: string
  nom: string
  est_pnj: boolean
  lie_au_compte: string | null
  hp_actuel: number
  hp_max: number
  mana_actuel: number
  mana_max: number
  stam_actuel: number
  stam_max: number
}

type Stat = { id: string; nom: string; description: string }
type PersonnageStat = { id_stat: string; valeur: number }

export default function Gerer() {
  const sessionActive = useStore(s => s.sessionActive)

  const [personnages, setPersonnages] = useState<Personnage[]>([])
  const [selectionne, setSelectionne] = useState<Personnage | null>(null)
  const [onglet, setOnglet] = useState<'stats' | 'inventaire'>('stats')
  const [stats, setStats] = useState<Stat[]>([])
  const [personnageStats, setPersonnageStats] = useState<PersonnageStat[]>([])

  useEffect(() => { chargerPersonnages() }, [sessionActive])
  useEffect(() => {
    supabase.from('stats').select('*').then(({ data }) => { if (data) setStats(data) })
  }, [])

  const chargerPersonnages = async () => {
    if (!sessionActive) return
    const { data: sjData } = await supabase
      .from('session_joueurs')
      .select('id_personnage')
      .eq('id_session', sessionActive.id)
    if (!sjData || sjData.length === 0) return
    const ids = sjData.map((r: any) => r.id_personnage)
    const { data } = await supabase.from('personnages').select('*').in('id', ids)
    if (data) setPersonnages(data)
  }

  const selectionnerPersonnage = async (p: Personnage) => {
    setSelectionne(p)
    const { data } = await supabase
      .from('personnage_stats')
      .select('id_stat, valeur')
      .eq('id_personnage', p.id)
    if (data) setPersonnageStats(data)
  }

  return (
    <div className="flex flex-col h-full text-white p-8">
      <h2 className="text-2xl font-bold text-purple-400 mb-6">Gérer</h2>

      {!sessionActive && <p className="text-gray-400 text-center mt-16">Rejoins une session d'abord</p>}

      {sessionActive && (
        <div className="flex gap-6 h-full overflow-hidden">

          {/* Liste personnages */}
          <div className="w-56 flex flex-col gap-2 overflow-y-auto shrink-0">
            <p className="text-gray-400 text-xs uppercase font-semibold mb-2">Personnages & PNJ</p>
            {personnages.length === 0 && <p className="text-gray-500 text-sm">Aucun personnage</p>}
            {personnages.map(p => (
              <button
                key={p.id}
                onClick={() => selectionnerPersonnage(p)}
                className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition flex items-center gap-2
                  ${selectionne?.id === p.id ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
              >
                <span>{p.est_pnj ? '👤' : '🧑'}</span>
                <span className="truncate">{p.nom}</span>
              </button>
            ))}
          </div>

          {/* Panneau principal */}
          <div className="flex-1 overflow-y-auto">
            {!selectionne && <p className="text-gray-400 text-center mt-16">Sélectionne un personnage</p>}

            {selectionne && (
              <div className="flex flex-col gap-4">
                {/* Header */}
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold">{selectionne.nom}</h3>
                  <span className="text-xs bg-gray-700 px-2 py-1 rounded-lg text-gray-400">
                    {selectionne.est_pnj ? '👤 PNJ' : '🧑 Joueur'}
                  </span>
                </div>

                {/* Onglets */}
                <div className="flex gap-2">
                  {[
                    { id: 'stats', label: '📊 Stats' },
                    { id: 'inventaire', label: '🎒 Inventaire' },
                  ].map(o => (
                    <button
                      key={o.id}
                      onClick={() => setOnglet(o.id as any)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition
                        ${onglet === o.id ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>

                {onglet === 'stats' && (
                  <GererStats
                    personnage={selectionne}
                    stats={stats}
                    personnageStats={personnageStats}
                    onUpdate={(p) => { setSelectionne(p); selectionnerPersonnage(p) }}
                  />
                )}

                {onglet === 'inventaire' && (
                  <GererInventaire personnage={selectionne} />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}