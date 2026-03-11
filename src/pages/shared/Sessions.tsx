import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'

import { ConfirmButton } from '../../components/ui/ConfirmButton'

type Session = { id: string; nom: string; description: string; created_at?: string; cree_par: string }
type Compte  = { id: string; pseudo: string }

export default function Sessions() {
  const compte           = useStore(s => s.compte)
  const setSessionActive = useStore(s => s.setSessionActive)
  const setPageCourante  = useStore(s => s.setPageCourante)
  const setRoleEffectif  = useStore(s => s.setRoleEffectif)

  const [sessions,   setSessions]   = useState<Session[]>([])
  const [comptes,    setComptes]    = useState<Record<string, string>>({})
  const [nom,        setNom]        = useState('')
  const [description, setDescription] = useState('')
  const [afficherFormulaire, setAfficherFormulaire] = useState(false)
  const [recherche,  setRecherche]  = useState('')
  const [filtreMJ,   setFiltreMJ]   = useState('')
  const [filtreDate, setFiltreDate] = useState('')

  useEffect(() => { chargerSessions() }, [])

  const chargerSessions = async () => {
    const { data } = await supabase.from('sessions').select('*').order('created_at', { ascending: false })
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
  }

  const sessionsFiltrees = useMemo(() => sessions.filter(s => {
    const matchNom  = s.nom?.toLowerCase().includes(recherche.toLowerCase()) ?? false
    const matchMJ   = (comptes[s.cree_par] || '').toLowerCase().includes(filtreMJ.toLowerCase())
    const matchDate = s.created_at && filtreDate ? s.created_at.startsWith(filtreDate) : true
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

  // On retire le blocage visuel du chargement


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
          <Button
            variant={afficherFormulaire ? 'secondary' : 'primary'}
            onClick={() => setAfficherFormulaire(v => !v)}
            className="w-full sm:w-auto"
          >
            {afficherFormulaire ? '✕ Annuler' : '+ Créer un Univers'}
          </Button>
        )}
      </div>

      {/* Filtres */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <Input
          icon="🔍"
          type="text"
          placeholder="Rechercher par nom..."
          value={recherche}
          onChange={e => setRecherche(e.target.value)}
        />
        <Input
          icon="👤"
          type="text"
          placeholder="Filtrer par MJ..."
          value={filtreMJ}
          onChange={e => setFiltreMJ(e.target.value)}
        />
        <Input
          icon="📅"
          type="date"
          value={filtreDate}
          onChange={e => setFiltreDate(e.target.value)}
          className="[&::-webkit-calendar-picker-indicator]:opacity-40"
        />
      </div>

      {/* Formulaire création */}
      {afficherFormulaire && (
        <Card className="mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
          <h3
            className="font-black text-lg uppercase tracking-widest mb-2"
            style={{ color: 'var(--color-light)' }}
          >
            Forger un nouvel univers
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              type="text"
              placeholder="Nom de la session"
              value={nom}
              onChange={e => setNom(e.target.value)}
            />
            <Input
              type="text"
              placeholder="Description courte (optionnelle)"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
          <Button
            onClick={creerSession}
            className="mt-4 sm:ml-auto w-full sm:w-auto uppercase tracking-widest"
            size="lg"
          >
            Générer l'univers
          </Button>
        </Card>
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
          <Card
            key={session.id}
            hoverEffect
            className="flex flex-col justify-between group h-full"
          >
            <div>
              <h3 className="font-black text-xl mb-2 leading-tight group-hover:text-blue-400 transition-colors" style={{ color: 'var(--text-primary)' }}>
                {session.nom}
              </h3>
              {session.description && (
                <p className="text-sm italic line-clamp-3 mb-4 opacity-70">
                  {session.description}
                </p>
              )}
            </div>

            <div
              className="flex items-center justify-between mt-auto pt-4"
              style={{ borderTop: '1px solid var(--border)' }}
            >
              <div className="flex flex-col gap-1.5">
                <Badge variant="ghost" className="flex items-center gap-1 w-fit">
                  👑 {comptes[session.cree_par] || 'Inconnu'}
                </Badge>
                {session.created_at && (
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-50 flex items-center gap-1">
                    📅 {new Date(session.created_at).toLocaleDateString('fr-FR')}
                  </span>
                )}
              </div>

              <div className="flex gap-2 shrink-0">
                {compte?.role === 'admin' && (
                  <ConfirmButton
                    size="sm"
                    variant="danger"
                    onConfirm={() => supprimerSession(session.id)}
                    className="w-auto sm:w-10 px-0"
                  >
                    🗑️
                  </ConfirmButton>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="bg-transparent border border-[var(--color-main)] text-[var(--color-light)] hover:bg-[var(--color-main)] hover:text-white"
                  onClick={() => rejoindreSession(session)}
                >
                  Rejoindre
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
