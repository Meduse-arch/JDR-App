import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'
import CreerPersonnage from '../shared/CreerPersonnage'

type PNJ = { id: string; nom: string; hp_actuel: number; hp_max: number; est_pnj: boolean }

export default function PNJ() {
  const [pnjs, setPnjs] = useState<PNJ[]>([])
  const [creer, setCreer] = useState(false)
  const setPnjControle = useStore(s => s.setPnjControle)
  const setPageCourante = useStore(s => s.setPageCourante)
  const sessionActive = useStore(s => s.sessionActive)

  useEffect(() => { chargerPnjs() }, [])

  const chargerPnjs = async () => {
    if (!sessionActive) return

    const { data } = await supabase
      .from('session_joueurs')
      .select('personnages(*)')
      .eq('id_session', sessionActive.id)

    if (data) {
      const persos = data
        .map((d: any) => d.personnages)
        .filter((p: any) => p.est_pnj === true)
      setPnjs(persos)
    }
  }

  const supprimerPnj = async (id: string) => {
    await supabase.from('session_joueurs').delete().eq('id_personnage', id)
    await supabase.from('personnage_stats').delete().eq('id_personnage', id)
    await supabase.from('inventaire').delete().eq('id_personnage', id)
    await supabase.from('personnage_competences').delete().eq('id_personnage', id)
    await supabase.from('personnages').delete().eq('id', id)
    chargerPnjs()
  }

  const gererPnj = (pnj: PNJ) => {
    setPnjControle(pnj)
    setPageCourante('mon-personnage')
  }

  if (creer) return <CreerPersonnage estPnj={true} retour={() => { setCreer(false); chargerPnjs() }} />

  return (
    <div className="flex flex-col h-full text-white p-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-purple-400">PNJ</h2>
        <button
          onClick={() => setCreer(true)}
          className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm font-semibold transition"
        >
          + Nouveau PNJ
        </button>
      </div>
      <div className="flex flex-col gap-4 overflow-y-auto">
        {pnjs.length === 0 && (
          <p className="text-gray-400 text-center mt-16">Aucun PNJ pour le moment</p>
        )}
        {pnjs.map(pnj => (
          <div key={pnj.id} className="bg-gray-800 p-6 rounded-xl flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-lg">{pnj.nom}</h3>
              <p className="text-gray-400 text-sm mt-1">HP : {pnj.hp_actuel} / {pnj.hp_max}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => gererPnj(pnj)}
                className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm transition"
              >
                Gérer
              </button>
              <button
                onClick={() => supprimerPnj(pnj.id)}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm transition"
              >
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}