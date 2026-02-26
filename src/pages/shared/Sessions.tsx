import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'

type Session = { id: string; nom: string; description: string; date_creation: string }

export default function Sessions() {
  const compte = useStore(s => s.compte)
  const setSessionActive = useStore(s => s.setSessionActive)
  const setPageCourante = useStore(s => s.setPageCourante)
  const [sessions, setSessions] = useState<Session[]>([])
  const [nom, setNom] = useState('')
  const [description, setDescription] = useState('')
  const [afficherFormulaire, setAfficherFormulaire] = useState(false)

  useEffect(() => { chargerSessions() }, [])

  const chargerSessions = async () => {
    const { data } = await supabase
      .from('sessions')
      .select('*')
      .order('date_creation', { ascending: false })
    if (data) setSessions(data)
  }

  const creerSession = async () => {
    if (!nom) return
    const { error } = await supabase
      .from('sessions')
      .insert({ nom, description, cree_par: compte?.id })
    if (!error) {
      setNom('')
      setDescription('')
      setAfficherFormulaire(false)
      chargerSessions()
    }
  }

  const supprimerSession = async (id: string) => {
    await supabase.from('sessions').delete().eq('id', id)
    chargerSessions()
  }

  const rejoindreSession = (session: Session) => {
    setSessionActive(session)
    setPageCourante('dashboard')
  }

  return (
    <div className="flex flex-col h-full text-white p-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-purple-400">Sessions</h2>
        {compte?.role === 'admin' && (
          <button
            onClick={() => setAfficherFormulaire(!afficherFormulaire)}
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm font-semibold transition"
          >
            + Nouvelle session
          </button>
        )}
      </div>

      {afficherFormulaire && (
        <div className="bg-gray-800 p-6 rounded-xl mb-6 flex flex-col gap-3">
          <h3 className="font-semibold text-lg">Nouvelle session</h3>
          <input
            type="text"
            placeholder="Nom de la session"
            value={nom}
            onChange={e => setNom(e.target.value)}
            className="bg-gray-700 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-purple-400"
          />
          <textarea
            placeholder="Description (optionnel)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="bg-gray-700 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-purple-400 resize-none h-24"
          />
          <button
            onClick={creerSession}
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-semibold transition"
          >
            Créer
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4 overflow-y-auto">
        {sessions.length === 0 && (
          <p className="text-gray-400 text-center mt-16">Aucune session pour le moment</p>
        )}
        {sessions.map(session => (
          <div key={session.id} className="bg-gray-800 p-6 rounded-xl flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-lg">{session.nom}</h3>
              {session.description && <p className="text-gray-400 text-sm mt-1">{session.description}</p>}
              <p className="text-gray-500 text-xs mt-2">{new Date(session.date_creation).toLocaleDateString('fr-FR')}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => rejoindreSession(session)}
                className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm transition"
              >
                Rejoindre
              </button>
              {compte?.role === 'admin' && (
                <button
                  onClick={() => supprimerSession(session.id)}
                  className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm transition"
                >
                  Supprimer
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}