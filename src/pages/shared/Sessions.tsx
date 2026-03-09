import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'

type Session = { id: string; nom: string; description: string; date_creation?: string; cree_par: string }
type Compte = { id: string; pseudo: string }

export default function Sessions() {
  const compte = useStore(s => s.compte)
  const setSessionActive = useStore(s => s.setSessionActive)
  const setPageCourante = useStore(s => s.setPageCourante)
  
  // ✅ La fonction est bien reconnue désormais !
  const setRoleEffectif = useStore(s => s.setRoleEffectif)
  
  const [sessions, setSessions] = useState<Session[]>([])
  const [comptes, setComptes] = useState<Record<string, string>>({})
  const [chargement, setChargement] = useState(true)

  const [nom, setNom] = useState('')
  const [description, setDescription] = useState('')
  const [afficherFormulaire, setAfficherFormulaire] = useState(false)
  
  const [recherche, setRecherche] = useState('')
  const [filtreMJ, setFiltreMJ] = useState('')
  const [filtreDate, setFiltreDate] = useState('')

  useEffect(() => { chargerSessions() }, [])

  // TON CODE DE CHARGEMENT ORIGINAL
  const chargerSessions = async () => {
    setChargement(true)
    const { data } = await supabase
      .from('sessions')
      .select('*')
      .order('date_creation', { ascending: false })

    if (data) {
      setSessions(data)
      const ids = [...new Set(data.map((s: Session) => s.cree_par))]
      if (ids.length > 0) {
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
    setChargement(false)
  }

  // 🛡️ SÉCURITÉ : Filtrage robuste (empêche les crashs si une date est vide)
  const sessionsFiltrees = useMemo(() => {
    return sessions.filter(s => {
      const matchNom = s.nom?.toLowerCase().includes(recherche.toLowerCase()) ?? false
      const matchMJ = (comptes[s.cree_par] || '').toLowerCase().includes(filtreMJ.toLowerCase())
      const matchDate = s.date_creation && filtreDate ? s.date_creation.startsWith(filtreDate) : true
      return matchNom && matchMJ && matchDate
    })
  }, [sessions, recherche, filtreMJ, filtreDate, comptes])

  // TON CODE DE CRÉATION ORIGINAL
  const creerSession = async () => {
    if (!nom || !compte) return
    const { error, data: newSession } = await supabase
      .from('sessions')
      .insert({ nom, description, cree_par: compte.id })
      .select('id')
      .single()

    if (!error && newSession) {
      if (compte.role === 'mj') {
        await supabase.from('session_mj').insert({
          id_session: newSession.id,
          id_compte: compte.id
        })
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

  // TON CODE DE REJOINDRE ORIGINAL
  const rejoindreSession = async (session: Session) => {
    let role: 'admin' | 'mj' | 'joueur' = 'joueur'

    if (compte?.role === 'admin') {
      role = 'admin'
    } else {
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
    setPageCourante('accueil') // Te renvoie sur ton tableau de bord après avoir rejoint
  }

  if (chargement) return <div className="flex items-center justify-center h-full text-gray-500 animate-pulse font-bold text-lg">Recherche des univers...</div>

  return (
    <div className="flex flex-col h-full text-white p-6 md:p-10 overflow-y-auto custom-scrollbar">
      
      {/* 👑 HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 pb-6 border-b border-gray-800 gap-4">
        <h2 className="text-3xl md:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-theme-main to-theme-light tracking-tight">
          🌌 Multivers
        </h2>
        {(compte?.role === 'admin' || compte?.role === 'mj') && (
          <button
            onClick={() => setAfficherFormulaire(!afficherFormulaire)}
            className="bg-theme-main hover:bg-theme-light text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-[0_0_15px_var(--color-glow)] hover:-translate-y-1"
          >
            {afficherFormulaire ? 'Annuler' : '+ Créer un Univers'}
          </button>
        )}
      </div>

      {/* 🔍 FILTRES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="relative">
          <span className="absolute left-4 top-3 text-gray-500">🔍</span>
          <input type="text" placeholder="Rechercher par nom..." value={recherche} onChange={e => setRecherche(e.target.value)} className="w-full bg-gray-900/50 backdrop-blur-sm text-white pl-10 pr-4 py-3 rounded-2xl outline-none focus:ring-2 focus:ring-theme-main border border-gray-700/50 transition-all" />
        </div>
        <div className="relative">
          <span className="absolute left-4 top-3 text-gray-500">👤</span>
          <input type="text" placeholder="Filtrer par MJ..." value={filtreMJ} onChange={e => setFiltreMJ(e.target.value)} className="w-full bg-gray-900/50 backdrop-blur-sm text-white pl-10 pr-4 py-3 rounded-2xl outline-none focus:ring-2 focus:ring-theme-main border border-gray-700/50 transition-all" />
        </div>
        <div className="relative">
          <span className="absolute left-4 top-3 text-gray-500">📅</span>
          <input type="date" value={filtreDate} onChange={e => setFiltreDate(e.target.value)} className="w-full bg-gray-900/50 backdrop-blur-sm text-gray-400 pl-10 pr-4 py-3 rounded-2xl outline-none focus:ring-2 focus:ring-theme-main border border-gray-700/50 transition-all [&::-webkit-calendar-picker-indicator]:invert" />
        </div>
      </div>

      {/* 📝 FORMULAIRE CRÉATION */}
      {afficherFormulaire && (
        <div className="bg-gray-800/40 backdrop-blur-md p-6 rounded-3xl mb-8 border border-theme-main/30 shadow-[0_0_30px_var(--color-glow)] flex flex-col gap-4">
          <h3 className="font-black text-xl text-theme-light uppercase tracking-widest">Forger un nouvel univers</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder="Nom de la session" value={nom} onChange={e => setNom(e.target.value)} className="bg-gray-900/80 text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-theme-main border border-gray-700" />
            <input type="text" placeholder="Description courte (optionnelle)" value={description} onChange={e => setDescription(e.target.value)} className="bg-gray-900/80 text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-theme-main border border-gray-700" />
          </div>
          <button onClick={creerSession} className="bg-gradient-to-r from-theme-main to-theme-light hover:opacity-90 px-6 py-3 rounded-xl font-bold transition-all mt-2 w-full md:w-auto self-end text-white shadow-lg shadow-theme-main/20 hover:-translate-y-1">
            Générer l'univers
          </button>
        </div>
      )}

      {/* 🎲 LISTE DES SESSIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 pb-10">
        {sessionsFiltrees.length === 0 && (
           <div className="col-span-full flex flex-col items-center justify-center py-20 opacity-50">
             <span className="text-6xl mb-4">🌌</span>
             <p className="text-lg font-bold">Le néant absolu... Aucune session trouvée.</p>
           </div>
        )}
        {sessionsFiltrees.map(session => (
          <div key={session.id} className="group relative bg-gray-800/40 backdrop-blur-md p-6 rounded-3xl border border-gray-700/50 hover:border-theme-main/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_var(--color-glow)] flex flex-col h-full">
            <div className="flex-1">
              <h3 className="font-black text-2xl text-white mb-2 leading-tight group-hover:text-theme-light transition-colors">{session.nom}</h3>
              {session.description && <p className="text-gray-400 text-sm italic line-clamp-3 mb-4">{session.description}</p>}
            </div>

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-700/50">
              <div className="flex flex-col gap-1">
                <span className="text-gray-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1"><span>👑</span> {comptes[session.cree_par] || 'Inconnu'}</span>
                {session.date_creation && (
                  <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <span>📅</span> {new Date(session.date_creation).toLocaleDateString('fr-FR')}
                  </span>
                )}
              </div>
              
              <div className="flex gap-2">
                {compte?.role === 'admin' && (
                  <button onClick={() => supprimerSession(session.id)} title="Détruire la session" className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 hover:border-red-400 w-10 h-10 flex items-center justify-center rounded-xl transition-all">
                    🗑️
                  </button>
                )}
                <button onClick={() => rejoindreSession(session)} className="bg-theme-main/20 hover:bg-theme-main text-theme-light hover:text-white border border-theme-main/50 hover:border-theme-main px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-inner">
                  Rejoindre
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}