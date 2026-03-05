import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'

type Compte = { id: string; pseudo: string; role: string }

export default function GererMJ() {
  const compte = useStore(s => s.compte)
  const sessionActive = useStore(s => s.sessionActive) as any
  const [mjSession, setMjSession] = useState<Compte[]>([])
  const [disponibles, setDisponibles] = useState<Compte[]>([])
  const [recherche, setRecherche] = useState('')

  useEffect(() => { chargerMJs() }, [])

  const chargerMJs = async () => {
    if (!sessionActive) return

    const { data: mjData } = await supabase
      .from('session_mj')
      .select('comptes(*)')
      .eq('id_session', sessionActive.id)

    if (mjData) {
      setMjSession(mjData.map((d: any) => d.comptes))
    }

    const { data: comptesData } = await supabase
      .from('comptes')
      .select('*')
      .in('role', ['joueur', 'mj'])

    if (comptesData && mjData) {
      const idsDeja = mjData.map((d: any) => d.comptes.id)
      setDisponibles(comptesData.filter((c: Compte) => !idsDeja.includes(c.id)))
    }
  }

  const ajouterMJ = async (idCompte: string) => {
    await supabase.from('session_mj').insert({
      id_session: sessionActive?.id,
      id_compte: idCompte
    })
    chargerMJs()
  }

  const retirerMJ = async (idCompte: string) => {
    await supabase.from('session_mj')
      .delete()
      .eq('id_session', sessionActive?.id)
      .eq('id_compte', idCompte)
    chargerMJs()
  }

  // Peut modifier = admin OU créateur de la session
  const peutModifier = compte?.role === 'admin' || sessionActive?.cree_par === compte?.id

  const disponiblesFiltres = disponibles.filter(c =>
    c.pseudo.toLowerCase().includes(recherche.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full text-white p-8">
      <h2 className="text-2xl font-bold text-purple-400 mb-8">
        Gérer les MJ — {sessionActive?.nom}
      </h2>

      <div className="grid grid-cols-2 gap-8">

        {/* MJ actuels */}
        <div className="flex flex-col gap-4">
          <h3 className="font-semibold text-gray-300">MJ de la session</h3>
          {mjSession.length === 0 && (
            <p className="text-gray-500 text-sm">Aucun MJ assigné</p>
          )}
          {mjSession.map(mj => (
            <div key={mj.id} className="bg-gray-800 px-4 py-3 rounded-lg flex justify-between items-center">
              <div>
                <p className="font-semibold">{mj.pseudo}</p>
                <p className="text-gray-400 text-xs">{mj.role}</p>
              </div>
              {peutModifier && (
                <button
                  onClick={() => retirerMJ(mj.id)}
                  className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded-lg text-xs transition"
                >
                  Retirer
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Ajouter un MJ - seulement si peut modifier */}
        {peutModifier && (
          <div className="flex flex-col gap-4">
            <h3 className="font-semibold text-gray-300">Ajouter un MJ</h3>
            <input
              type="text"
              placeholder="🔍 Rechercher un compte..."
              value={recherche}
              onChange={e => setRecherche(e.target.value)}
              className="bg-gray-800 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-purple-400 text-sm"
            />
            {disponiblesFiltres.length === 0 && (
              <p className="text-gray-500 text-sm">Aucun compte disponible</p>
            )}
            {disponiblesFiltres.map(c => (
              <div key={c.id} className="bg-gray-800 px-4 py-3 rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-semibold">{c.pseudo}</p>
                  <p className="text-gray-400 text-xs">{c.role}</p>
                </div>
                <button
                  onClick={() => ajouterMJ(c.id)}
                  className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded-lg text-xs transition"
                >
                  Ajouter
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Si MJ non créateur, message informatif */}
        {!peutModifier && (
          <div className="flex items-start pt-8">
            <p className="text-gray-500 text-sm">Seul le créateur de la session ou un admin peut ajouter ou retirer des MJ.</p>
          </div>
        )}
      </div>
    </div>
  )
}