import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'

type Session = { id: string; nom: string; description: string; date_creation?: string; cree_par: string }
type Compte  = { id: string; pseudo: string }

export default function Sessions() {
  const compte           = useStore(s => s.compte)
  const setSessionActive = useStore(s => s.setSessionActive)
  const setPageCourante  = useStore(s => s.setPageCourante)
  const setRoleEffectif  = useStore(s => s.setRoleEffectif)

  const [sessions,   setSessions]   = useState<Session[]>([])
  const [comptes,    setComptes]    = useState<Record<string, string>>({})
  const [chargement, setChargement] = useState(true)
  const [nom,        setNom]        = useState('')
  const [description, setDescription] = useState('')
  const [afficherFormulaire, setAfficherFormulaire] = useState(false)
  const [recherche,  setRecherche]  = useState('')
  const [filtreMJ,   setFiltreMJ]   = useState('')
  const [filtreDate, setFiltreDate] = useState('')

  useEffect(() => { chargerSessions() }, [])

  const chargerSessions = async () => {
    setChargement(true)
    const { data } = await supabase.from('sessions').select('*').order('date_creation', { ascending: false })
    if (data) {
      setSessions(data)
      const ids = [...new Set(data.map((s: Session) => s.cree_par))]
      if (ids.length > 0) {
        const { data: comptesData } = await supabase.from('comptes').select('id, pseudo').in('id', ids)
        if (comptesData) {
          const map: Record<string, string> = {}
          comptesData.forEach((c: Compte) => { map[c.id] = c.pseudo })
          setComptes(map)
        }
      }
    }
    setChargement(false)
  }

  const sessionsFiltrees = useMemo(() => sessions.filter(s => {
    const matchNom  = s.nom?.toLowerCase().includes(recherche.toLowerCase()) ?? false
    const matchMJ   = (comptes[s.cree_par] || '').toLowerCase().includes(filtreMJ.toLowerCase())
    const matchDate = s.date_creation && filtreDate ? s.date_creation.startsWith(filtreDate) : true
    return matchNom && matchMJ && matchDate
  }), [sessions, recherche, filtreMJ, filtreDate, comptes])

  const creerSession = async () => {
    if (!nom || !compte) return
    const { error, data: newSession } = await supabase
      .from('sessions').insert({ nom, description, cree_par: compte.id }).select('id').single()
    if (!error && newSession) {
      if (compte.role === 'mj')
        await supabase.from('session_mj').insert({ id_session: newSession.id, id_compte: compte.id })
      setNom(''); setDescription(''); setAfficherFormulaire(false); chargerSessions()
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
      const { data } = await supabase.from('session_mj').select('*')
        .eq('id_session', session.id).eq('id_compte', compte?.id).single()
      if (data) role = 'mj'
    }
    setRoleEffectif(role)
    setSessionActive(session)
    setPageCourante('accueil')
  }

  const inputStyle = {
    backgroundColor: 'var(--bg-input)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
  }

  if (chargement) return (
    <div className="flex items-center justify-center h-full animate-pulse font-bold text-lg"
      style={{ color: 'var(--text-muted)' }}>
      Recherche des univers...
    </div>
  )

  return (
    <div
      className="flex flex-col h-full p-4 md:p-8 lg:p-10 overflow-y-auto custom-scrollbar"
      style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}
    >
      {/* Header */}
      <div
        className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 pb-6 gap-4"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <h2
          className="text-3xl md:text-4xl font-black tracking-tight"
          style={{
            background: 'linear-gradient(135deg, var(--color-light), var(--color-accent2))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          🌌 Multivers
        </h2>
        {(compte?.role === 'admin' || compte?.role === 'mj') && (
          <button
            onClick={() => setAfficherFormulaire(v => !v)}
            className="px-6 py-2.5 rounded-xl font-bold transition-all hover:-translate-y-0.5 text-white shrink-0"
            style={{
              background: 'linear-gradient(135deg, var(--color-main), var(--color-accent2))',
              boxShadow: '0 0 15px var(--color-glow)',
            }}
          >
            {afficherFormulaire ? 'Annuler' : '+ Créer un Univers'}
          </button>
        )}
      </div>

      {/* Filtres */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { icon: '🔍', val: recherche, set: setRecherche, ph: 'Rechercher par nom...' },
          { icon: '👤', val: filtreMJ,  set: setFiltreMJ,  ph: 'Filtrer par MJ...' },
        ].map(({ icon, val, set, ph }) => (
          <div key={ph} className="relative">
            <span className="absolute left-4 top-3.5 text-sm" style={{ color: 'var(--text-muted)' }}>
              {icon}
            </span>
            <input
              type="text"
              placeholder={ph}
              value={val}
              onChange={e => set(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-2xl outline-none text-sm transition-all"
              style={inputStyle}
            />
          </div>
        ))}
        <div className="relative">
          <span className="absolute left-4 top-3.5 text-sm" style={{ color: 'var(--text-muted)' }}>📅</span>
          <input
            type="date"
            value={filtreDate}
            onChange={e => setFiltreDate(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-2xl outline-none text-sm transition-all [&::-webkit-calendar-picker-indicator]:opacity-40"
            style={inputStyle}
          />
        </div>
      </div>

      {/* Formulaire création */}
      {afficherFormulaire && (
        <div
          className="p-6 rounded-3xl mb-8 flex flex-col gap-4"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid color-mix(in srgb, var(--color-main) 40%, var(--border))',
            boxShadow: '0 0 30px var(--color-glow)',
          }}
        >
          <h3
            className="font-black text-lg uppercase tracking-widest"
            style={{ color: 'var(--color-light)' }}
          >
            Forger un nouvel univers
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Nom de la session"
              value={nom}
              onChange={e => setNom(e.target.value)}
              className="px-4 py-3 rounded-xl outline-none text-sm"
              style={inputStyle}
            />
            <input
              type="text"
              placeholder="Description courte (optionnelle)"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="px-4 py-3 rounded-xl outline-none text-sm"
              style={inputStyle}
            />
          </div>
          <button
            onClick={creerSession}
            className="px-6 py-3 rounded-xl font-bold text-white transition-all hover:-translate-y-0.5 self-end"
            style={{
              background: 'linear-gradient(135deg, var(--color-main), var(--color-accent2))',
              boxShadow: '0 0 15px var(--color-glow)',
            }}
          >
            Générer l'univers
          </button>
        </div>
      )}

      {/* Liste des sessions */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-10">
        {sessionsFiltrees.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 opacity-40">
            <span className="text-6xl mb-4">🌌</span>
            <p className="text-lg font-bold" style={{ color: 'var(--text-secondary)' }}>
              Aucune session trouvée.
            </p>
          </div>
        )}
        {sessionsFiltrees.map(session => (
          <div
            key={session.id}
            className="group relative p-6 rounded-3xl flex flex-col transition-all duration-300 hover:-translate-y-1"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--color-main)'
              e.currentTarget.style.boxShadow = '0 10px 30px var(--color-glow)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div className="flex-1">
              <h3 className="font-black text-xl mb-2 leading-tight" style={{ color: 'var(--text-primary)' }}>
                {session.nom}
              </h3>
              {session.description && (
                <p className="text-sm italic line-clamp-3 mb-4" style={{ color: 'var(--text-secondary)' }}>
                  {session.description}
                </p>
              )}
            </div>

            <div
              className="flex items-center justify-between mt-4 pt-4"
              style={{ borderTop: '1px solid var(--border)' }}
            >
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1"
                  style={{ color: 'var(--text-muted)' }}>
                  👑 {comptes[session.cree_par] || 'Inconnu'}
                </span>
                {session.date_creation && (
                  <span className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)' }}>
                    📅 {new Date(session.date_creation).toLocaleDateString('fr-FR')}
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                {compte?.role === 'admin' && (
                  <button
                    onClick={() => supprimerSession(session.id)}
                    className="w-10 h-10 flex items-center justify-center rounded-xl transition-all text-sm"
                    style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.2)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)')}
                  >
                    🗑️
                  </button>
                )}
                <button
                  onClick={() => rejoindreSession(session)}
                  className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-main) 15%, transparent)',
                    color: 'var(--color-light)',
                    border: '1px solid color-mix(in srgb, var(--color-main) 40%, transparent)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = 'var(--color-main)'
                    e.currentTarget.style.color = '#fff'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--color-main) 15%, transparent)'
                    e.currentTarget.style.color = 'var(--color-light)'
                  }}
                >
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