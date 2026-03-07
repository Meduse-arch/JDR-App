import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'

type Personnage = {
  id: string
  nom: string
  hp_actuel: number
  hp_max: number
  mana_actuel: number
  mana_max: number
  stam_actuel: number // 👈 Ajout
  stam_max: number    // 👈 Ajout
  est_pnj: boolean
  comptes?: { pseudo: string }
}

export default function DashboardAdmin() {
  const sessionActive = useStore(s => s.sessionActive)
  const setPageCourante = useStore(s => s.setPageCourante)
  const setPnjControle = useStore(s => s.setPnjControle)

  const [joueurs, setJoueurs] = useState<Personnage[]>([])
  const [pnjs, setPnjs] = useState<Personnage[]>([])
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    chargerTable()
  }, [sessionActive])

  const chargerTable = async () => {
    if (!sessionActive) { setChargement(false); return }

    const { data } = await supabase
      .from('session_joueurs')
      .select('personnages(*, comptes(pseudo))')
      .eq('id_session', sessionActive.id)

    if (data) {
      const persos = data.map((d: any) => d.personnages).filter(Boolean)
      setJoueurs(persos.filter((p: any) => !p.est_pnj))
      setPnjs(persos.filter((p: any) => p.est_pnj).slice(0, 4))
    }
    setChargement(false)
  }

  const prendreControle = (pnj: Personnage) => {
    setPnjControle(pnj as any)
    setPageCourante('mon-personnage')
  }

  if (chargement) return <div className="p-8 text-gray-400">Installation de la table...</div>

  if (!sessionActive) return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
      <span className="text-4xl">👑</span>
      <p>Sélectionne ou crée une session depuis le menu pour commencer à masteriser.</p>
    </div>
  )

  return (
    <div className="flex flex-col h-full text-white p-8 overflow-y-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-1">Panneau du <span className="text-purple-400">Maître du Jeu</span></h2>
        <p className="text-gray-400">Session active : {sessionActive.nom}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <button onClick={() => setPageCourante('pnj')} className="bg-gray-800 hover:bg-gray-700 p-4 rounded-xl flex items-center gap-3 transition border border-gray-700 hover:border-purple-500">
          <span className="text-2xl">👹</span> <span className="font-bold">Bestiaire</span>
        </button>
        <button onClick={() => setPageCourante('items')} className="bg-gray-800 hover:bg-gray-700 p-4 rounded-xl flex items-center gap-3 transition border border-gray-700 hover:border-purple-500">
          <span className="text-2xl">📚</span> <span className="font-bold">Créer un Item</span>
        </button>
        <button onClick={() => setPageCourante('lancer-des')} className="bg-gray-800 hover:bg-gray-700 p-4 rounded-xl flex items-center gap-3 transition border border-gray-700 hover:border-purple-500">
          <span className="text-2xl">🎲</span> <span className="font-bold">Dés Cachés</span>
        </button>
        <button onClick={() => chargerTable()} className="bg-purple-900/30 text-purple-400 hover:bg-purple-600 hover:text-white p-4 rounded-xl flex items-center justify-center gap-2 transition border border-purple-800">
          <span className="text-lg">🔄</span> <span className="font-bold">Rafraîchir la table</span>
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Résumé de la Table (Joueurs) */}
        <div className="xl:col-span-2 bg-gray-800 p-6 rounded-2xl border border-gray-700">
          <h3 className="text-lg font-bold text-gray-300 mb-4 flex items-center gap-2"><span>🛡️</span> Les Aventuriers</h3>
          {joueurs.length === 0 ? (
            <p className="text-gray-500 text-sm italic">Aucun joueur n'a créé de personnage.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {joueurs.map(j => (
                <div key={j.id} className="bg-gray-900 p-4 rounded-xl border border-gray-700">
                  <div className="flex justify-between items-end mb-3">
                    <div>
                      <p className="font-bold text-lg text-purple-300">{j.nom}</p>
                      <p className="text-xs text-gray-500">Joué par {j.comptes?.pseudo || '?'}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {/* Barre de Vie */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs w-6">❤️</span>
                      <div className="flex-1 bg-gray-800 rounded-full h-2">
                        <div className="bg-red-500 h-2 rounded-full" style={{ width: `${Math.min(100, (j.hp_actuel / j.hp_max) * 100)}%` }} />
                      </div>
                      <span className="text-xs font-mono text-gray-400 w-8 text-right">{j.hp_actuel}</span>
                    </div>
                    {/* Barre de Mana */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs w-6">💧</span>
                      <div className="flex-1 bg-gray-800 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min(100, (j.mana_actuel / j.mana_max) * 100)}%` }} />
                      </div>
                      <span className="text-xs font-mono text-gray-400 w-8 text-right">{j.mana_actuel}</span>
                    </div>
                    {/* Barre de Stamina (Nouveau) 👇 */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs w-6">⚡</span>
                      <div className="flex-1 bg-gray-800 rounded-full h-2">
                        <div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${Math.min(100, (j.stam_actuel / j.stam_max) * 100)}%` }} />
                      </div>
                      <span className="text-xs font-mono text-gray-400 w-8 text-right">{j.stam_actuel}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Accès rapide PNJ */}
        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
          <h3 className="text-lg font-bold text-gray-300 mb-4 flex items-center gap-2"><span>👤</span> Accès Rapide PNJ</h3>
          {pnjs.length === 0 ? (
            <p className="text-gray-500 text-sm italic">Aucun PNJ créé pour le moment.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {pnjs.map(pnj => (
                <div key={pnj.id} className="flex items-center justify-between bg-gray-900 p-3 rounded-xl border border-gray-700">
                  <span className="font-semibold text-sm">{pnj.nom}</span>
                  <button 
                    onClick={() => prendreControle(pnj)}
                    className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg transition font-semibold"
                  >
                    Incarner
                  </button>
                </div>
              ))}
              <button 
                onClick={() => setPageCourante('pnj')}
                className="mt-2 text-sm text-gray-400 hover:text-white transition text-center"
              >
                Voir tout le bestiaire →
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}