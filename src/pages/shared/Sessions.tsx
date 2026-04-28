import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { ConfirmButton } from '../../components/ui/ConfirmButton'
import RunicDecoder from '../../components/ui/RunicDecoder'
import { Globe, X, Search, User, Calendar, Crown, Trash2, PlusCircle, MoveRight, Map, Compass } from 'lucide-react'

type Session = { id: string; nom: string; description: string; created_at?: string; cree_par: string; folder_path?: string }
type Compte  = { id: string; pseudo: string }

export default function Sessions() {
  const compte = useStore(s => s.compte)
  const sessionListViewMode = useStore(s => s.sessionListViewMode)
  const setEnteringSession = useStore(s => s.setEnteringSession)
  const enteringSession = useStore(s => s.enteringSession)

  const [sessions, setSessions] = useState<Session[]>([])
  const [comptes, setComptes] = useState<Record<string, string>>({})
  const [nom, setNom] = useState('')
  const [description, setDescription] = useState('')
  const [afficherFormulaire, setAfficherFormulaire] = useState(false)
  const [recherche, setRecherche] = useState('')
  const [filtreMJ, setFiltreMJ] = useState('')
  const [filtreDate, setFiltreDate] = useState('')

  const [peerIdInput, setPeerIdInput] = useState('')
  const [isJoining, setIsJoining] = useState(false)

  useEffect(() => { chargerSessions() }, [])

  const chargerSessions = async () => {
    // MIGRATION Supabase -> La liste des sessions reste sur Supabase pour être visible sur internet
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
    const { sessionService } = await import('../../services/sessionService')
    const success = await sessionService.creerSession(nom, description, compte.id, compte.role)
    if (success) {
      setNom(''); setDescription(''); setAfficherFormulaire(false); chargerSessions()
    } else {
      alert("Erreur lors de la création de la session.")
    }
  }

  const supprimerSession = async (id: string) => {
    const { sessionService } = await import('../../services/sessionService')
    await sessionService.supprimerSession(id)
    chargerSessions()
  }

  const rejoindreSession = async (session: Session) => {
    // Si c'est le MJ, on doit dire à Electron de charger la base de données SQLite de la campagne !
    if (compte?.role === 'mj' || compte?.role === 'admin') {
      const db = (window as any).db;
      try {
        await db.system.loadSession(session.folder_path || session.id);
      } catch (e) {
        console.error("Failed to load session DB", e);
      }
    }
    setEnteringSession({ id: session.id, nom: session.nom })
  }

  const handleRejoindreDistante = async () => {
    if (!peerIdInput || !compte) return
    setIsJoining(true)
    try {
      const { peerService } = await import('../../services/peerService')
      const monPeerId = `joueur-${compte.id}-${Date.now().toString().slice(-4)}`
      
      await peerService.initAsJoueur(peerIdInput, monPeerId)
      
      // SE PRÉSENTER AU MJ IMMÉDIATEMENT
      peerService.sendToMJ({
        type: 'ACTION',
        kind: 'player_identity',
        payload: { id: compte.id, pseudo: compte.pseudo }
      });

      // On simule une entrée en session
      setEnteringSession({ id: 'remote-session', nom: 'Session Distante' })
    } catch (e) {
      console.error("Erreur de connexion P2P:", e)
      alert("Impossible de rejoindre le MJ. Vérifiez le code de connexion.")
    } finally {
      setIsJoining(false)
    }
  }

  // ─── RENDU MODE TAROT ──────────────────────────────────────────────────────
  const TarotLayout = () => (
    <div className="flex flex-wrap justify-center gap-12 py-10">
      {sessionsFiltrees.map((session, idx) => (
        <motion.div
          key={session.id}
          initial={{ opacity: 0, y: 50, rotateY: -30 }}
          animate={{ opacity: 1, y: 0, rotateY: 0 }}
          transition={{ delay: idx * 0.1, duration: 0.8, ease: "easeOut" }}
          whileHover={{ y: -20, rotateY: 5, scale: 1.02 }}
          className="relative w-72 h-[500px] perspective-1000 group cursor-pointer"
          onClick={() => rejoindreSession(session)}
        >
          {/* Main Card Body */}
          <div className="absolute inset-0 bg-card border-2 border-theme-main/30 rounded-lg overflow-hidden shadow-2xl transition-all duration-500 group-hover:border-theme-main group-hover:shadow-[0_0_40px_rgba(var(--color-main-rgb),0.3)]">
            
            {/* Background Texture/Pattern */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, var(--color-main) 1px, transparent 0)', backgroundSize: '24px 24px' }} />
            
            {/* Session Info (Top) */}
            <div className="p-6 text-center h-1/2 flex flex-col items-center justify-center bg-gradient-to-b from-theme-main/10 to-transparent">
              <div className="w-16 h-16 rounded-full border border-theme-main/40 flex items-center justify-center mb-6 bg-black/40 group-hover:scale-110 transition-transform">
                <Compass className="text-theme-main" size={24} />
              </div>
              <h3 className="font-cinzel font-black text-2xl uppercase tracking-[0.2em] text-primary leading-tight group-hover:text-theme-main transition-colors mb-2">
                {session.nom}
              </h3>
              <div className="h-px w-12 bg-theme-main/30 my-2" />
              <p className="text-[10px] font-cinzel font-bold text-theme-main/60 uppercase tracking-widest">Arcane de Réalité</p>
            </div>

            {/* Illustration Placeholder/Visual (Middle) */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-theme-main/20 to-transparent" />
            
            {/* Description & Footer (Bottom) */}
            <div className="p-6 h-1/2 flex flex-col justify-between bg-black/20">
              <p className="font-garamond italic text-primary/60 text-center text-base leading-relaxed line-clamp-4 mt-2">
                "{session.description || "Un royaume dont les secrets restent à découvrir par les voyageurs du Sigil."}"
              </p>

              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 text-[9px] font-cinzel font-black uppercase tracking-tighter opacity-40">
                  <Crown size={12} className="text-theme-main" /> {comptes[session.cree_par] || 'Inconnu'}
                </div>
                
                <div className="w-full flex items-center justify-between pt-4 border-t border-white/5">
                  {compte?.role === 'admin' ? (
                    <ConfirmButton
                      size="sm"
                      variant="danger"
                      onConfirm={() => supprimerSession(session.id)}
                      className="w-8 h-8 p-0 rounded-full opacity-20 hover:opacity-100 transition-all border-none bg-red-900/10"
                    >
                      <Trash2 size={14} />
                    </ConfirmButton>
                  ) : <div className="w-8" />}

                  <div className="text-[10px] font-cinzel font-black text-theme-main group-hover:animate-pulse tracking-[0.3em] uppercase">
                    Entrer
                  </div>

                  <div className="w-8 flex justify-end">
                    <MoveRight size={16} className="text-theme-main opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all" />
                  </div>
                </div>
              </div>
            </div>

            {/* Corner Ornaments */}
            <div className="absolute top-2 left-2 w-4 h-4 border-t border-l border-theme-main/20" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t border-r border-theme-main/20" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b border-l border-theme-main/20" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b border-r border-theme-main/20" />
          </div>

          {/* Decorative Halo (behind) */}
          <div className="absolute -inset-4 bg-theme-main/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity rounded-full -z-10" />
        </motion.div>
      ))}
    </div>
  )

  if (enteringSession) return <div className="h-full bg-black" />

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
            <h2 className="font-cinzel text-4xl md:text-6xl font-black tracking-[0.3em] text-theme-main mb-2 uppercase">
              <RunicDecoder text="LA PORTE DES MONDES" />
            </h2>
            <p className="font-garamond italic text-secondary opacity-60 text-lg">
              "Choisissez la réalité où votre légende doit s'écrire."
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            {(compte?.role === 'admin' || compte?.role === 'mj') && (
              <>
                <Button
                  variant="ghost"
                  onClick={async () => {
                    const { generateMJPeerId } = await import('../../services/sessionService');
                    // On prend une session au hasard ou on demande à l'utilisateur d'entrer dans une session d'abord ?
                    // Plus simple : si on clique ici, on affiche le code de la dernière session créée ou on explique.
                    alert("Entrez dans une session pour que votre code soit actif. Le code sera : sigil-[ID_DE_SESSION]");
                  }}
                  className="font-cinzel text-[10px] opacity-60 hover:opacity-100"
                >
                  MON CODE DE CONNEXION
                </Button>
                <Button
                  variant={afficherFormulaire ? 'secondary' : 'primary'}
                  onClick={() => setAfficherFormulaire(v => !v)}
                  className="w-full sm:w-auto font-cinzel font-black tracking-widest px-8 py-4 shadow-xl shadow-theme-main/10"
                >
                  {afficherFormulaire ? <><X size={18} className="mr-2" /> ANNULER</> : <><PlusCircle size={18} className="mr-2" /> FORGER UN HORIZON</>}
                </Button>
              </>
            )}
          </div>
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

        {/* Formulaire création */}
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

        {/* Rejoindre P2P */}
        <div className="flex flex-col md:flex-row gap-4 bg-theme-main/5 border border-theme-main/20 p-6 rounded-sm mb-12 medieval-border items-end shadow-xl">
          <div className="flex-1 w-full">
            <label className="text-[10px] font-cinzel font-black uppercase tracking-widest opacity-60 ml-1 mb-2 block">
              Rejoindre une aventure à distance
            </label>
            <Input
              type="text"
              placeholder="Code de connexion du MJ (ex: sigil-mj123)"
              value={peerIdInput}
              onChange={e => setPeerIdInput(e.target.value)}
              className="font-mono bg-black/40 font-bold"
            />
          </div>
          <Button 
            onClick={handleRejoindreDistante} 
            disabled={!peerIdInput || isJoining}
            className="w-full md:w-auto font-cinzel font-black tracking-widest px-8 shadow-theme-main/10 whitespace-nowrap"
          >
            {isJoining ? 'Connexion...' : 'REJOINDRE (P2P)'}
          </Button>
        </div>

        {/* Liste des sessions */}
        {sessionsFiltrees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 opacity-20 border-2 border-dashed border-theme/10 rounded-sm">
            <Map size={80} className="mb-6 opacity-5" />
            <p className="text-xl font-cinzel font-bold uppercase tracking-[0.3em] text-center max-w-md">
              Les brumes du néant persistent. Aucun monde n'a encore été forgé.
            </p>
          </div>
        ) : (
          sessionListViewMode === 'tarot' ? (
            <TarotLayout />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 pb-10">
              {sessionsFiltrees.map(session => (
                <Card
                  key={session.id}
                  className="bg-card/40 backdrop-blur-md border border-theme/20 rounded-sm p-8 hover:border-theme-main transition-all group relative overflow-hidden flex flex-col justify-between h-full shadow-lg hover:shadow-theme-main/10"
                >
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
          )
        )}
      </div>
    </div>
  )
}
