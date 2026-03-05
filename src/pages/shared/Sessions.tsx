import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'

type Session = { id: string; nom: string; description: string; date_creation: string; cree_par: string }
type Compte = { id: string; pseudo: string }

export default function Sessions() {
  const compte = useStore(s => s.compte)
  const setSessionActive = useStore(s => s.setSessionActive)
  const setPageCourante = useStore(s => s.setPageCourante)
  const setRoleEffectif = useStore(s => s.setRoleEffectif)
  const [sessions, setSessions] = useState<Session[]>([])
  const [sessionsFiltrees, setSessionsFiltrees] = useState<Session[]>([])
  const [comptes, setComptes] = useState<Record<string, string>>({})
  const [nom, setNom] = useState('')
  const [description, setDescription] = useState('')
  const [afficherFormulaire, setAfficherFormulaire] = useState(false)
  const [recherche, setRecherche] = useState('')
  const [filtreMJ, setFiltreMJ] = useState('')
  const [filtreDate, setFiltreDate] = useState('')
  const [mjDisponibles, setMjDisponibles] = useState<Compte[]>([])

  useEffect(() => { chargerSessions(); chargerMJs() }, [])
  useEffect(() => { filtrer() }, [recherche, filtreMJ, filtreDate, sessions])

  const chargerMJs = async () => {
    const { data } = await supabase
      .from('comptes')
      .select('id, pseudo')
      .in('role', ['mj', 'admin'])
    if (data) setMjDisponibles(data)
  }

  const chargerSessions = async () => {
    const { data } = await supabase
      .from('sessions')
      .select('*')
      .order('date_creation', { ascending: false })

    if (data) {
      setSessions(data)
      // Charge les pseudos des créateurs
      const ids = [...new Set(data.map((s: Session) => s.cree_par))]
      const { data: comptesData } = await supabase
        .from('comptes')
        .select('id, pseudo')
        .in('id', ids)
      if (comptesData) {
        const map: Record<string, string> = {}
        comptesData.forEach((c: Compte) => { map[c.id] = c.pseudo })
        setComptes(map)
      }
    }
  }

  const filtrer = () => {
    let result = [...sessions]

    if (recherche) {
      result = result.filter(s => s.nom.toLowerCase().includes(recherche.toLowerCase()))
    }

    if (filtreMJ) {
      result = result.filter(s => comptes[s.cree_par]?.toLowerCase().includes(filtreMJ.toLowerCase()))
    }

    if (filtreDate) {
      result = result.filter(s => s.date_creation.startsWith(filtreDate))
    }

    setSessionsFiltrees(result)
  }

  const creerSession = async () => {
    if (!nom) return
    const { error } = await supabase
      .from('sessions')
      .insert({ nom, description, cree_par: compte?.id })
    if (!error) {
      // Si MJ, s'ajoute automatiquement comme MJ de la session
      if (compte?.role === 'mj') {
        const { data: session } = await supabase
          .from('sessions')
          .select('id')
          .eq('nom', nom)
          .eq('cree_par', compte.id)
          .single()
        if (session) {
          await supabase.from('session_mj').insert({
            id_session: session.id,
            id_compte: compte.id
          })
        }
      }
      setNom('')
      setDescription('')
      setAfficherFormulaire(false)
      chargerSessions()
    }
  }

  const supprimerSession = async (id: string) => {
    await supabase.from('session_mj').delete().eq('id_session', id)
    await supabase.from('sessions').delete().eq('id', id)
    chargerSessions()
  }

  const rejoindreSession = async (session: Session) => {
  let role: 'admin' | 'mj' | 'joueur' = 'joueur'

  if (compte?.role === 'admin') {
    role = 'admin'
  } else {
    // Vérifie si le compte est MJ de cette session peu importe son rôle
    const { data } = await supabase
      .from('session_mj')
      .select('*')
      .eq('id_session', session.id)
      .eq('id_compte', compte?.id)
      .single()

    if (data) role = 'mj'
  }

  setRoleEffectif(role)
  setSessionActive(session)
  setPageCourante('dashboard')
}
  const sessionsAffichees = sessionsFiltrees.length > 0 || recherche || filtreMJ || filtreDate
    ? sessionsFiltrees
    : sessions

  return (
    <div className="flex flex-col h-full text-white p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-purple-400">Sessions</h2>
        {(compte?.role === 'admin' || compte?.role === 'mj') && (
          <button
            onClick={() => setAfficherFormulaire(!afficherFormulaire)}
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm font-semibold transition"
          >
            + Nouvelle session
          </button>
        )}
      </div>

      {/* Barre de recherche */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <input
          type="text"
          placeholder="🔍 Rechercher par nom..."
          value={recherche}
          onChange={e => setRecherche(e.target.value)}
          className="bg-gray-800 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-purple-400 text-sm"
        />
        <input
          type="text"
          placeholder="👤 Filtrer par MJ..."
          value={filtreMJ}
          onChange={e => setFiltreMJ(e.target.value)}
          className="bg-gray-800 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-purple-400 text-sm"
        />
        <input
          type="date"
          value={filtreDate}
          onChange={e => setFiltreDate(e.target.value)}
          className="bg-gray-800 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-purple-400 text-sm"
        />
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
        {sessionsAffichees.length === 0 && (
          <p className="text-gray-400 text-center mt-16">Aucune session trouvée</p>
        )}
        {sessionsAffichees.map(session => (
          <div key={session.id} className="bg-gray-800 p-6 rounded-xl flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-lg">{session.nom}</h3>
              {session.description && <p className="text-gray-400 text-sm mt-1">{session.description}</p>}
              <div className="flex gap-3 mt-2">
                <p className="text-gray-500 text-xs">👤 {comptes[session.cree_par] || '...'}</p>
                <p className="text-gray-500 text-xs">📅 {new Date(session.date_creation).toLocaleDateString('fr-FR')}</p>
              </div>
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