import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { ConfirmButton } from '../../components/ui/ConfirmButton'
import RunicDecoder from '../../components/ui/RunicDecoder'
import { Globe, X, Search, User, Calendar, Crown, Trash2, PlusCircle, MoveRight, Map } from 'lucide-react'

type Session = { id: string; nom: string; description: string; created_at?: string; cree_par: string }
type Compte  = { id: string; pseudo: string }

export default function Sessions() {
  const compte           = useStore(s => s.compte)
  const setEnteringSession = useStore(s => s.setEnteringSession)

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
    setEnteringSession({ id: session.id, nom: session.nom })
  }

  return (
    <div className="flex flex-col h-full p-4 md:p-8 lg:p-10 overflow-y-auto custom-scrollbar relative">
      {/* Fond : Rune Ehwaz (ᛖ) */}
      <div className="absolute inset-0 flex items-center justify-center text-[40rem] opacity-[0.02] pointer-events-none select-none font-cinzel z-0">
        ᛖ
      </div>

      <div className="relative z-10">
        {/* Header : LA PORTE DES MONDES */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 pb-8 gap-6 border-b border-theme/20">
          <div className="flex flex-col">
            <h2 className="font-cinzel text-4xl md:text-6xl font-black tracking-[0.3em] text-theme-main mb-2">
              <RunicDecoder text="LA PORTE DES MONDES" />
            </h2>
            <p className="font-garamond italic text-secondary opacity-60 text-lg">
              "Choisissez la réalité où votre légende doit s'écrire."
            </p>
          </div>
          {(compte?.role === 'admin' || compte?.role === 'mj') && (
            <Button
              variant={afficherFormulaire ? 'secondary' : 'primary'}
              onClick={() => setAfficherFormulaire(v => !v)}
              className="w-full sm:w-auto font-cinzel font-black tracking-widest px-8 py-4 shadow-xl shadow-theme-main/10"
            >
              {afficherFormulaire ? <><X size={18} className="mr-2" /> ANNULER</> : <><PlusCircle size={18} className="mr-2" /> FORGER UN HORIZON</>}
            </Button>
          )}
        </div>

        {/* Filtres */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-12">
          <Input
            icon={<Search size={18} />}
            type="text"
            placeholder="Explorer les noms..."
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            className="font-garamond font-bold bg-black/20"
          />
          <Input
            icon={<User size={18} />}
            type="text"
            placeholder="Chercher un Gardien..."
            value={filtreMJ}
            onChange={e => setFiltreMJ(e.target.value)}
            className="font-garamond font-bold bg-black/20"
          />
          <Input
            icon={<Calendar size={18} />}
            type="date"
            value={filtreDate}
            onChange={e => setFiltreDate(e.target.value)}
            className="[&::-webkit-calendar-picker-indicator]:opacity-40 font-garamond font-bold bg-black/20"
          />
        </div>

        {/* Formulaire création : LE FORMULAIRE DE FORGE */}
        {afficherFormulaire && (
          <Card className="mb-12 animate-in fade-in slide-in-from-top-4 duration-500 bg-card/60 p-10 rounded-sm medieval-border shadow-2xl">
            <h3 className="font-cinzel font-black text-2xl uppercase tracking-[0.2em] mb-8 text-theme-main text-center">
              DÉFINIR LES LOIS DU MONDE
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-cinzel font-black uppercase tracking-widest opacity-40 ml-1">Nom du Royaume</label>
                <Input
                  type="text"
                  placeholder="Ex: Les Plaines d'Eldoria"
                  value={nom}
                  onChange={e => setNom(e.target.value)}
                  className="font-garamond font-bold text-lg"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-cinzel font-black uppercase tracking-widest opacity-40 ml-1">Description de la Réalité</label>
                <Input
                  type="text"
                  placeholder="Une terre de brumes et de magie..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="font-garamond font-bold text-lg"
                />
              </div>
            </div>
            <div className="flex justify-center mt-10">
              <Button
                onClick={creerSession}
                className="w-full sm:w-auto px-12 py-4 uppercase tracking-[0.2em] font-cinzel font-black text-lg shadow-lg shadow-theme-main/20"
                size="lg"
              >
                <Globe size={18} className="mr-3" /> OUVRIR LE PASSAGE
              </Button>
            </div>
          </Card>
        )}

        {/* Liste des sessions : LES STÈLES DE RÉALITÉ */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 pb-10">
          {sessionsFiltrees.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-32 opacity-20 border-2 border-dashed border-theme/10 rounded-sm">
              <Map size={80} className="mb-6 opacity-5" />
              <p className="text-xl font-cinzel font-bold uppercase tracking-[0.3em] text-center max-w-md">
                Les brumes du néant persistent. Aucun monde n'a encore été forgé.
              </p>
            </div>
          )}
          {sessionsFiltrees.map(session => (
            <Card
              key={session.id}
              className="bg-card/40 backdrop-blur-md border border-theme/20 rounded-sm p-8 hover:border-theme-main transition-all group relative overflow-hidden flex flex-col justify-between h-full shadow-lg hover:shadow-theme-main/10"
            >
              {/* Effet de lueur interne au survol via un élément absolu */}
              <div className="absolute inset-0 bg-gradient-to-br from-theme-main/0 to-theme-main/0 group-hover:from-theme-main/5 group-hover:to-transparent transition-all pointer-events-none" />
              
              <div className="relative z-10">
                <h3 className="font-cinzel font-black text-2xl mb-4 leading-tight text-primary group-hover:text-theme-main transition-colors uppercase tracking-widest">
                  {session.nom}
                </h3>
                {session.description && (
                  <p className="font-garamond italic text-secondary text-base leading-relaxed line-clamp-2 mb-8 opacity-80">
                    "{session.description}"
                  </p>
                )}
              </div>

              <div className="relative z-10 flex flex-col gap-6 mt-auto">
                <div className="flex items-center justify-between pt-6 border-t border-theme/10">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center text-[10px] font-cinzel font-black uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity">
                      <Crown size={12} className="mr-2 text-theme-main" /> Gardien : {comptes[session.cree_par] || 'Inconnu'}
                    </div>
                    {session.created_at && (
                      <span className="text-[9px] font-cinzel font-bold uppercase tracking-wider opacity-20 flex items-center gap-2">
                        <Calendar size={10} /> {new Date(session.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-3 shrink-0">
                    {compte?.role === 'admin' && (
                      <ConfirmButton
                        size="sm"
                        variant="danger"
                        onConfirm={() => supprimerSession(session.id)}
                        className="w-10 h-10 p-0 rounded-sm border-theme/20 opacity-40 hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={16} />
                      </ConfirmButton>
                    )}
                    <Button
                      size="md"
                      variant="ghost"
                      className="font-cinzel font-black text-xs uppercase tracking-[0.2em] border border-theme-main/50 text-theme-main hover:bg-theme-main hover:text-white transition-all rounded-sm px-6 py-2 flex items-center gap-3"
                      onClick={() => rejoindreSession(session)}
                    >
                      S'INCARNER <MoveRight size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
