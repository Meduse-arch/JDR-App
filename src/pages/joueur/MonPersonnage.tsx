import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'
import CreerPersonnage from '../shared/CreerPersonnage'

type Personnage = {
  id: string
  nom: string
  hp_actuel: number
  hp_max: number
  mana_actuel: number
  mana_max: number
  stam_actuel: number
  stam_max: number
}

type StatJet = { nom: string; valeur: number; description: string }

export default function MonPersonnage() {
  const compte = useStore(s => s.compte)
  const sessionActive = useStore(s => s.sessionActive)
  const pnjControle = useStore(s => s.pnjControle)
  const setPnjControle = useStore(s => s.setPnjControle)
  const [personnage, setPersonnage] = useState<Personnage | null>(null)
  const [stats, setStats] = useState<StatJet[]>([])
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    if (pnjControle) {
      setPersonnage(pnjControle as any)
      chargerStats(pnjControle.id)
      setChargement(false)
    } else if (compte?.role === 'joueur') {
      chargerPersonnage()
    } else {
      setChargement(false)
    }
  }, [pnjControle])

  const chargerPersonnage = async () => {
    setChargement(true)
    if (!sessionActive) { setChargement(false); return }

    // Cherche le personnage du joueur dans la session active
    const { data } = await supabase
      .from('session_joueurs')
      .select('personnages(*)')
      .eq('id_session', sessionActive.id)

    if (data) {
      const perso = data
        .map((d: any) => d.personnages)
        .find((p: any) => p.lie_au_compte === compte?.id && !p.est_pnj)

      if (perso) {
        setPersonnage(perso)
        chargerStats(perso.id)
      }
    }
    setChargement(false)
  }

  const chargerStats = async (idPersonnage: string) => {
    const { data } = await supabase
      .from('personnage_stats')
      .select('valeur, stats(nom, description)')
      .eq('id_personnage', idPersonnage)

    if (data) {
      setStats(data.map((d: any) => ({
        nom: d.stats.nom,
        description: d.stats.description,
        valeur: d.valeur
      })))
    }
  }

  const supprimerPersonnage = async () => {
    if (!personnage) return
    await supabase.from('session_joueurs').delete().eq('id_personnage', personnage.id)
    await supabase.from('personnage_stats').delete().eq('id_personnage', personnage.id)
    await supabase.from('inventaire').delete().eq('id_personnage', personnage.id)
    await supabase.from('personnage_competences').delete().eq('id_personnage', personnage.id)
    await supabase.from('personnages').delete().eq('id', personnage.id)
    if (pnjControle) setPnjControle(null)
    setPersonnage(null)
  }

  const AfficherPersonnage = ({ p }: { p: Personnage }) => (
    <div className="flex flex-col h-full text-white p-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-purple-400">
          {p.nom}
          {pnjControle && <span className="text-yellow-400 text-sm ml-2">PNJ</span>}
        </h2>
        <button
          onClick={supprimerPersonnage}
          className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm transition"
        >
          💀 Supprimer
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-800 p-4 rounded-xl flex flex-col gap-1">
          <span className="text-gray-400 text-xs">❤️ Points de vie</span>
          <div className="flex items-end gap-1">
            <span className="text-2xl font-bold text-red-400">{p.hp_actuel}</span>
            <span className="text-gray-500 text-sm mb-1">/ {p.hp_max}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
            <div className="bg-red-500 h-2 rounded-full transition-all" style={{ width: `${(p.hp_actuel / p.hp_max) * 100}%` }} />
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded-xl flex flex-col gap-1">
          <span className="text-gray-400 text-xs">💧 Mana</span>
          <div className="flex items-end gap-1">
            <span className="text-2xl font-bold text-blue-400">{p.mana_actuel}</span>
            <span className="text-gray-500 text-sm mb-1">/ {p.mana_max}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
            <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${(p.mana_actuel / p.mana_max) * 100}%` }} />
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded-xl flex flex-col gap-1">
          <span className="text-gray-400 text-xs">⚡ Stamina</span>
          <div className="flex items-end gap-1">
            <span className="text-2xl font-bold text-yellow-400">{p.stam_actuel}</span>
            <span className="text-gray-500 text-sm mb-1">/ {p.stam_max}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
            <div className="bg-yellow-500 h-2 rounded-full transition-all" style={{ width: `${(p.stam_actuel / p.stam_max) * 100}%` }} />
          </div>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-gray-300 mb-4">Stats</h3>
      <div className="grid grid-cols-2 gap-4">
        {stats.map(stat => (
          <div key={stat.nom} className="bg-gray-800 p-4 rounded-xl flex justify-between items-center">
            <div>
              <p className="font-semibold">{stat.nom}</p>
              <p className="text-gray-400 text-xs">{stat.description}</p>
            </div>
            <span className="text-2xl font-bold text-purple-400">{stat.valeur}</span>
          </div>
        ))}
      </div>
    </div>
  )

  if (chargement) return (
    <div className="flex items-center justify-center h-full text-gray-400">Chargement...</div>
  )

  if (pnjControle && personnage) return <AfficherPersonnage p={personnage} />

  if (!personnage && compte?.role === 'joueur') return (
    <CreerPersonnage estPnj={false} retour={() => chargerPersonnage()} />
  )

  if (!personnage && compte?.role === 'admin') return (
    <div className="flex items-center justify-center h-full text-gray-400">
      Prends le contrôle d'un PNJ depuis la page PNJ
    </div>
  )

  return <AfficherPersonnage p={personnage!} />
}