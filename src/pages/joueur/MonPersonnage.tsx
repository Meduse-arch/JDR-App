import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'
import CreerPersonnage from '../shared/CreerPersonnage'

type Personnage = {
  id: string
  nom: string
  hp_actuel: number
  hp_max: number
}

type StatJet = {
  nom: string
  valeur: number
  description: string
}

export default function MonPersonnage() {
  const compte = useStore(s => s.compte)
  const [personnage, setPersonnage] = useState<Personnage | null>(null)
  const [stats, setStats] = useState<StatJet[]>([])
  const [chargement, setChargement] = useState(true)
  const [creer, setCreer] = useState(false)

  useEffect(() => { chargerPersonnage() }, [])

  const chargerPersonnage = async () => {
    setChargement(true)
    const { data } = await supabase
      .from('personnages')
      .select('*')
      .eq('lie_au_compte', compte?.id)
      .eq('est_pnj', false)
      .single()

    if (data) {
      setPersonnage(data)
      chargerStats(data.id)
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

  if (chargement) return (
    <div className="flex items-center justify-center h-full text-gray-400">
      Chargement...
    </div>
  )

  if (creer || !personnage) return (
    <CreerPersonnage
      estPnj={false}
      retour={() => { setCreer(false); chargerPersonnage() }}
    />
  )

  return (
    <div className="flex flex-col h-full text-white p-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-purple-400">{personnage.nom}</h2>
        <div className="bg-gray-800 px-4 py-2 rounded-lg text-sm">
          ❤️ HP : <span className="font-bold text-red-400">{personnage.hp_actuel}</span> / {personnage.hp_max}
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
}