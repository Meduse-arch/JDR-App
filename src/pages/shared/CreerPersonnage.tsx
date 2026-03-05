import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'

type Stat = { id: string; nom: string; description: string }
type StatJet = { stat: Stat; valeur: number }
type Props = { estPnj: boolean; retour: () => void }

export default function CreerPersonnage({ estPnj, retour }: Props) {
  const compte = useStore(s => s.compte)
  const sessionActive = useStore(s => s.sessionActive)
  const [nom, setNom] = useState('')
  const [stats, setStats] = useState<Stat[]>([])
  const [jets, setJets] = useState<StatJet[]>([])
  const [etape, setEtape] = useState<'nom' | 'stats'>('nom')
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
    const force = jets.find(j => j.stat.nom === 'Force')
    const agilite = jets.find(j => j.stat.nom === 'Agilité')

    const hp = constitution ? constitution.valeur * 4 : 0
    const mana = intelligence ? intelligence.valeur * 10 : 0
    const stam = (force && agilite && constitution)
      ? Math.round((force.valeur + agilite.valeur + constitution.valeur) / 3 * 10)
      : 0

    const { data: personnage, error } = await supabase
      .from('personnages')
      .insert({
        nom,
        est_pnj: estPnj,
        lie_au_compte: estPnj ? null : compte?.id,
        hp_max: hp,
        hp_actuel: hp,
        mana_max: mana,
        mana_actuel: mana,
        stam_max: stam,
        stam_actuel: stam,
      })
      .select()
      .single()

    if (error || !personnage) return

    await supabase.from('personnage_stats').insert(
      jets.map(j => ({
        id_personnage: personnage.id,
        id_stat: j.stat.id,
        valeur: j.valeur
      }))
    )

    // Lier le personnage à la session active
    if (sessionActive) {
      await supabase.from('session_joueurs').insert({
        id_session: sessionActive.id,
        id_personnage: personnage.id
      })
    }

    retour()
  }

  if (etape === 'nom') return (
    <div className="flex flex-col items-center justify-center h-full text-white">
      <div className="bg-gray-800 p-8 rounded-xl w-96 flex flex-col gap-4">
        <h2 className="text-xl font-bold text-purple-400 text-center">
          {estPnj ? 'Créer un PNJ' : 'Créer un personnage'}
        </h2>
        <input
          type="text"
          placeholder="Nom du personnage"
          value={nom}
          onChange={e => setNom(e.target.value)}
          className="bg-gray-700 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-purple-400"
        />
        <button
          onClick={() => nom && lancerDes()}
          className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-semibold transition"
        >
          Lancer les dés pour les stats →
        </button>
        <button onClick={retour} className="text-gray-400 hover:text-white text-sm transition">
          ← Retour
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full text-white p-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-xl font-bold text-purple-400">Stats de {nom}</h2>
        <div className="flex items-center gap-4">
          <span className={`text-sm font-semibold ${rerollsRestants <= 2 ? 'text-red-400' : 'text-gray-400'}`}>
            🎲 Rerolls restants : {rerollsRestants}
          </span>
          <button onClick={() => setEtape('nom')} className="text-gray-400 hover:text-white text-sm transition">
            ← Retour
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-8">
        {jets.map((jet, index) => (
          <div key={jet.stat.id} className="bg-gray-800 p-4 rounded-xl flex justify-between items-center">
            <div>
              <p className="font-semibold">{jet.stat.nom}</p>
              <p className="text-gray-400 text-xs">{jet.stat.description}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-purple-400">{jet.valeur}</span>
              <button
                onClick={() => relancerStat(index)}
                disabled={rerollsRestants <= 0}
                className={`px-2 py-1 rounded-lg text-xs transition
                  ${rerollsRestants <= 0 ? 'bg-gray-600 opacity-40 cursor-not-allowed' : 'bg-gray-700 hover:bg-gray-600'}`}
              >
                🎲
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-center">
        <button
          onClick={confirmer}
          className="bg-purple-600 hover:bg-purple-700 px-8 py-3 rounded-lg font-semibold transition"
        >
          Confirmer le personnage
        </button>
      </div>
    </div>
  )
}