import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'

type Personnage = { id: string; nom: string; hp_actuel: number; hp_max: number; est_pnj: boolean }

export default function Joueurs() {
  const [personnages, setPersonnages] = useState<Personnage[]>([])
  const setPnjControle = useStore(s => s.setPnjControle)
  const setPageCourante = useStore(s => s.setPageCourante)
  const sessionActive = useStore(s => s.sessionActive)

  useEffect(() => { chargerJoueurs() }, [])

  const chargerJoueurs = async () => {
    if (!sessionActive) return

    const { data } = await supabase
      .from('session_joueurs')
      .select('personnages(*)')
      .eq('id_session', sessionActive.id)

    if (data) {
      const persos = data
        .map((d: any) => d.personnages)
        .filter((p: any) => p.est_pnj === false)
      setPersonnages(persos)
    }
  }

  const gererJoueur = (perso: Personnage) => {
    setPnjControle(perso)
    setPageCourante('mon-personnage')
  }

  return (
    <div className="flex flex-col h-full text-white p-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-purple-400">Joueurs</h2>
      </div>
      <div className="flex flex-col gap-4 overflow-y-auto">
        {personnages.length === 0 && (
          <p className="text-gray-400 text-center mt-16">Aucun joueur dans cette session</p>
        )}
        {personnages.map(perso => (
          <div key={perso.id} className="bg-gray-800 p-6 rounded-xl flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-lg">{perso.nom}</h3>
              <p className="text-gray-400 text-sm mt-1">HP : {perso.hp_actuel} / {perso.hp_max}</p>
            </div>
            <button
              onClick={() => gererJoueur(perso)}
              className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm transition"
            >
              Gérer
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}