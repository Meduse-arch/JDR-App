import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'

type Stat = { nom: string; valeur: number }
type Resultat = { label: string; des: number[]; modifier: number; total: number }

export default function LancerDes() {
  const compte = useStore(s => s.compte)
  const [stats, setStats] = useState<Stat[]>([])
  const [nbDes, setNbDes] = useState(1)
  const [facesDe, setFacesDe] = useState(6)
  const [modificateur, setModificateur] = useState(0) // 👈 La case pour le bonus manuel
  const [historique, setHistorique] = useState<Resultat[]>([])
  const pnjControle = useStore(s => s.pnjControle)

  useEffect(() => { chargerStats() }, [pnjControle])

  const chargerStats = async () => {
    let idPersonnage = pnjControle?.id

    // 1. Identifier le personnage
    if (!idPersonnage) {
      const { data: personnage } = await supabase
        .from('personnages')
        .select('id')
        .eq('lie_au_compte', compte?.id)
        .eq('est_pnj', false)
        .single()
      
      if (!personnage) return
      idPersonnage = personnage.id
    }

    // 2. Charger ses stats de base
    const { data: baseStats } = await supabase
      .from('personnage_stats')
      .select('id_stat, valeur, stats(nom)')
      .eq('id_personnage', idPersonnage)

    if (!baseStats) return

    // 3. Charger ses items équipés
    const { data: equipements } = await supabase
      .from('inventaire')
      .select('id_item')
      .eq('id_personnage', idPersonnage)
      .eq('equipe', true)

    const statBonus: Record<string, number> = {}

    if (equipements && equipements.length > 0) {
      const itemIds = equipements.map(e => e.id_item)
      // 4. Charger les modificateurs de type "stat" de ces items
      const { data: modifs } = await supabase
        .from('item_modificateurs')
        .select('*')
        .in('id_item', itemIds)
        .eq('type', 'stat')

      if (modifs) {
        modifs.forEach(mod => {
          if (mod.id_stat) {
            statBonus[mod.id_stat] = (statBonus[mod.id_stat] || 0) + mod.valeur
          }
        })
      }
    }

    // 5. Additionner et mettre à jour l'interface (Base + Équipement)
    setStats(baseStats.map((d: any) => ({
      nom: d.stats.nom,
      valeur: d.valeur + (statBonus[d.id_stat] || 0)
    })))
  }

  const lancer = (label: string, nb: number, faces: number, mod: number = 0) => {
    const des = Array.from({ length: nb }, () => Math.floor(Math.random() * faces) + 1)
    const total = des.reduce((a, b) => a + b, 0) + mod
    setHistorique(h => [{ label, des, modifier: mod, total }, ...h].slice(0, 20))
  }

  return (
    <div className="flex flex-col h-full text-white p-8 gap-6 overflow-y-auto">
      <h2 className="text-2xl font-bold text-purple-400">🎲 Lancer des dés</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Jet libre */}
        <div className="bg-gray-800 p-6 rounded-xl flex flex-col gap-4">
          <h3 className="font-semibold text-lg">Jet libre</h3>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-gray-400 text-xs">Dés</label>
              <input
                type="number"
                min={1}
                max={20}
                value={nbDes}
                onChange={e => setNbDes(Number(e.target.value))}
                className="bg-gray-700 text-white px-3 py-2 rounded-lg w-16 outline-none focus:ring-2 focus:ring-purple-400 text-center"
              />
            </div>
            <span className="text-gray-400 mt-4 font-bold">d</span>
            <div className="flex flex-col gap-1">
              <label className="text-gray-400 text-xs">Faces</label>
              <input
                type="number"
                min={2}
                max={100}
                value={facesDe}
                onChange={e => setFacesDe(Number(e.target.value))}
                className="bg-gray-700 text-white px-3 py-2 rounded-lg w-16 outline-none focus:ring-2 focus:ring-purple-400 text-center"
              />
            </div>
            <span className="text-gray-400 mt-4 font-bold">+</span>
            <div className="flex flex-col gap-1">
              <label className="text-gray-400 text-xs">Modif.</label>
              <input
                type="number"
                value={modificateur}
                onChange={e => setModificateur(Number(e.target.value))}
                className="bg-gray-700 text-white px-3 py-2 rounded-lg w-20 outline-none focus:ring-2 focus:ring-purple-400 text-center"
              />
            </div>
          </div>
          <button
            onClick={() => lancer(
              `${nbDes}d${facesDe}${modificateur !== 0 ? (modificateur > 0 ? '+' : '') + modificateur : ''}`,
              nbDes,
              facesDe,
              modificateur
            )}
            className="bg-purple-600 hover:bg-purple-700 px-4 py-3 rounded-lg font-bold transition mt-2 shadow-lg shadow-purple-900/50"
          >
            Lancer {nbDes}d{facesDe} {modificateur !== 0 && (modificateur > 0 ? `+ ${modificateur}` : `- ${Math.abs(modificateur)}`)}
          </button>
        </div>

        {/* Jets de stats */}
        {stats.length > 0 && (
          <div className="bg-gray-800 p-6 rounded-xl flex flex-col gap-4">
            <h3 className="font-semibold text-lg flex justify-between items-center">
              Jets de stats
              <span className="text-xs text-gray-400 font-normal">1d(Stat) + Modif</span>
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {stats.map(stat => (
                <button
                  key={stat.nom}
                  // 👇 On utilise stat.valeur (qui contient Base + Équipement) comme nombre de faces !
                  onClick={() => lancer(`Test ${stat.nom}`, 1, stat.valeur, modificateur)}
                  className="bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-lg text-sm transition flex justify-between items-center group border border-gray-600 hover:border-purple-400"
                >
                  <span className="font-medium">{stat.nom}</span>
                  <span className="text-purple-400 font-bold bg-gray-900 px-2 py-0.5 rounded-md group-hover:scale-110 transition-transform">
                    d{stat.valeur}
                  </span>
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
            <h3 className="font-semibold text-lg">Historique récent</h3>
            <button
              onClick={() => setHistorique([])}
              className="text-gray-400 hover:text-white text-xs transition px-2 py-1 bg-gray-700 rounded hover:bg-red-600"
            >
              Effacer
            </button>
          </div>
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
            {historique.map((r, i) => (
              <div key={i} className="flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-700 px-4 py-3 rounded-lg border border-gray-600">
                <span className="text-gray-300 font-semibold">{r.label}</span>
                <div className="flex items-center gap-3 mt-1 md:mt-0">
                  <span className="text-gray-400 text-sm font-mono">
                    [{r.des.join(' + ')}]
                    {r.modifier !== 0 && (
                      <span className={r.modifier > 0 ? 'text-green-400' : 'text-red-400'}>
                         {r.modifier > 0 ? ' + ' : ' - '}{Math.abs(r.modifier)}
                      </span>
                    )}
                  </span>
                  <span className="text-purple-400 font-black text-2xl w-12 text-right">
                    {r.total}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}