import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'


type Stat = { nom: string; valeur: number }
type Resultat = { label: string; des: number[]; total: number }

export default function LancerDes() {
  const compte = useStore(s => s.compte)
  const [stats, setStats] = useState<Stat[]>([])
  const [nbDes, setNbDes] = useState(1)
  const [facesDe, setFacesDe] = useState(6)
  const [historique, setHistorique] = useState<Resultat[]>([])
  const pnjControle = useStore(s => s.pnjControle)

useEffect(() => { chargerStats() }, [pnjControle])

const chargerStats = async () => {
  // Si un PNJ est contrôlé on charge ses stats directement
  if (pnjControle) {
    const { data } = await supabase
      .from('personnage_stats')
      .select('valeur, stats(nom)')
      .eq('id_personnage', pnjControle.id)

    if (data) {
      setStats(data.map((d: any) => ({ nom: d.stats.nom, valeur: d.valeur })))
    }
    return
  }

  // Sinon on charge les stats du joueur connecté
  const { data: personnage } = await supabase
    .from('personnages')
    .select('id')
    .eq('lie_au_compte', compte?.id)
    .eq('est_pnj', false)
    .single()

  if (!personnage) return

  const { data } = await supabase
    .from('personnage_stats')
    .select('valeur, stats(nom)')
    .eq('id_personnage', personnage.id)

  if (data) {
    setStats(data.map((d: any) => ({ nom: d.stats.nom, valeur: d.valeur })))
  }
}

  const lancer = (label: string, nb: number, faces: number) => {
    const des = Array.from({ length: nb }, () => Math.floor(Math.random() * faces) + 1)
    const total = des.reduce((a, b) => a + b, 0)
    setHistorique(h => [{ label, des, total }, ...h].slice(0, 20))
  }

  return (
    <div className="flex flex-col h-full text-white p-8 gap-6">
      <h2 className="text-2xl font-bold text-purple-400">🎲 Lancer des dés</h2>

      <div className="grid grid-cols-2 gap-6">

        {/* Jet libre */}
        <div className="bg-gray-800 p-6 rounded-xl flex flex-col gap-4">
          <h3 className="font-semibold text-lg">Jet libre</h3>
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-gray-400 text-xs">Nombre de dés</label>
              <input
                type="number"
                min={1}
                max={20}
                value={nbDes}
                onChange={e => setNbDes(Number(e.target.value))}
                className="bg-gray-700 text-white px-3 py-2 rounded-lg w-20 outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <span className="text-gray-400 mt-4">d</span>
            <div className="flex flex-col gap-1">
              <label className="text-gray-400 text-xs">Faces</label>
              <input
                type="number"
                min={2}
                max={100}
                value={facesDe}
                onChange={e => setFacesDe(Number(e.target.value))}
                className="bg-gray-700 text-white px-3 py-2 rounded-lg w-20 outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
          </div>
          <button
            onClick={() => lancer(`${nbDes}d${facesDe}`, nbDes, facesDe)}
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-semibold transition"
          >
            Lancer {nbDes}d{facesDe}
          </button>
        </div>

        {/* Jets de stats */}
        {stats.length > 0 && (
          <div className="bg-gray-800 p-6 rounded-xl flex flex-col gap-3">
            <h3 className="font-semibold text-lg">Jets de stats</h3>
            <div className="grid grid-cols-2 gap-2">
              {stats.map(stat => (
                <button
                  key={stat.nom}
                  onClick={() => lancer(`Test ${stat.nom} (${stat.valeur})`, 1, 20)}
                  className="bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-lg text-sm transition flex justify-between items-center"
                >
                  <span>{stat.nom}</span>
                  <span className="text-purple-400 font-bold">{stat.valeur}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Historique */}
      {historique.length > 0 && (
        <div className="bg-gray-800 p-6 rounded-xl flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-lg">Historique</h3>
            <button
              onClick={() => setHistorique([])}
              className="text-gray-400 hover:text-white text-xs transition"
            >
              Effacer
            </button>
          </div>
          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
            {historique.map((r, i) => (
              <div key={i} className="flex justify-between items-center bg-gray-700 px-4 py-2 rounded-lg text-sm">
                <span className="text-gray-300">{r.label}</span>
                <span className="text-gray-400 text-xs">[{r.des.join(', ')}]</span>
                <span className="text-purple-400 font-bold text-lg">{r.total}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}