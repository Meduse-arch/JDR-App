import { useEffect, useState, useRef, useCallback } from 'react'
import { useStore, type Personnage } from '../../store/useStore'
import { motion } from 'framer-motion'
import { 
  ClipboardList, ScrollText, Package, Sparkles, BookOpen, Users, Copy
} from 'lucide-react'
import { Card } from '../../components/ui/card'
import { QueteDetailModal } from '../../components/ui/modal'
import { DashboardJoueurs } from './dashboard/DashboardJoueurs'
import { DashboardEntites } from './dashboard/DashboardEntites'
import { generateMJPeerId } from '../../services/sessionService'

type Quete = {
  id: string
  titre: string
  description: string
  statut: string
}

export default function DashboardAdmin() {
  const sessionActive = useStore(s => s.sessionActive)
  const setPageCourante = useStore(s => s.setPageCourante)
  const setPnjControle = useStore(s => s.setPnjControle)

  const [joueurs, setJoueurs] = useState<Personnage[]>([])
  const [entites, setEntites] = useState<Personnage[]>([])
  const [quetesEnCours, setQuetesEnCours] = useState<Quete[]>([])
  const [filtreEntites, setFiltreEntites] = useState<'Tous' | 'PNJ' | 'Monstre' | 'Boss'>('Tous')
  const [stats, setStats] = useState({ items: 0, competences: 0, templates: 0, quetes: 0 })
  const [selectedQuete, setSelectedQuete] = useState<Quete | null>(null)

  const scrollRefJoueurs = useRef<HTMLDivElement>(null)
  const scrollRefEntites = useRef<HTMLDivElement>(null)
  const scrollRefQuetes = useRef<HTMLDivElement>(null)
  
  const [pageJoueurs, setPageJoueurs] = useState(0)
  const [pageEntites, setPageEntites] = useState(0)
  const [pageQuetes, setPageQuetes] = useState(0)

  const chargerDonnees = useCallback(async () => {
    if (!sessionActive) return
    const db = (window as any).db;

    const [
      resPersos, resItems, resComps, resQuetes
    ] = await Promise.all([
      db.personnages.getAll(),
      db.items.getAll(),
      db.competences.getAll(),
      db.quetes.getAll()
    ]);

    const persosRaw = resPersos.success ? resPersos.data.filter((p: any) => p.id_session === sessionActive.id) : [];
    
    const persos = [];
    for (const p of persosRaw) {
      const h = await personnageService.recalculerStats(p.id);
      persos.push(h || p);
    }
    
    const countItems = resItems.success ? resItems.data.filter((i: any) => i.id_session === sessionActive.id).length : 0;
    const countComps = resComps.success ? resComps.data.filter((c: any) => c.id_session === sessionActive.id).length : 0;
    const countTemplates = persos.filter((p: any) => p.is_template === 1).length;
    
    const sessionQuetes = resQuetes.success ? resQuetes.data.filter((q: any) => q.id_session === sessionActive.id) : [];
    const countQuetes = sessionQuetes.length;
    const enCours = sessionQuetes.filter((q: any) => q.statut === 'En cours');

    const persosActifs = persos.filter((p: any) => p.is_template === 0);

    setJoueurs(persosActifs.filter((p: any) => p.type === 'Joueur'))
    setEntites(persosActifs.filter((p: any) => p.type !== 'Joueur'))
    setQuetesEnCours(enCours as Quete[])
    
    setStats({ 
      items: countItems, competences: countComps, 
      templates: countTemplates, quetes: countQuetes 
    })
  }, [sessionActive])

  // MIGRATION WebRTC — remplacé par peerService.onStateUpdate
  useEffect(() => {
    if (sessionActive) {
      chargerDonnees()
      import('../../services/peerService').then(({ peerService }) => {
        peerService.onStateUpdate(() => {
          chargerDonnees();
        });
        peerService.onAction(() => {
          chargerDonnees();
        });
      });
    }
  }, [sessionActive, chargerDonnees])

  useEffect(() => {
    const handleScroll = (ref: React.RefObject<HTMLDivElement>, setPage: (p: number) => void) => {
      const el = ref.current
      if (!el) return
      const onScroll = () => {
        const h = el.clientHeight
        if (h > 0) setPage(Math.round(el.scrollTop / h))
      }
      el.addEventListener('scroll', onScroll)
      return () => el.removeEventListener('scroll', onScroll)
    }
    const c1 = handleScroll(scrollRefJoueurs, setPageJoueurs)
    const c2 = handleScroll(scrollRefEntites, setPageEntites)
    const c3 = handleScroll(scrollRefQuetes, setPageQuetes)
    return () => { c1?.(); c2?.(); c3?.(); }
  }, [joueurs.length, entites.length, quetesEnCours.length, filtreEntites])

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 pb-20 max-w-5xl mx-auto w-full px-4">
      <div className="flex flex-col items-center text-center gap-2 mt-4">
        <h1 className="text-xl md:text-2xl font-cinzel font-black text-theme-main tracking-[0.15em] uppercase drop-shadow-md">{sessionActive?.nom}</h1>
        <div className="flex items-center gap-3">
          <div className="h-px w-12 bg-theme-main/30" />
          <span className="font-cinzel text-[10px] font-black text-theme-main tracking-[0.4em] opacity-60 uppercase">[ MAÎTRE DU JEU ]</span>
          <div className="h-px w-12 bg-theme-main/30" />
        </div>

        {/* MJ Connection Code */}
        {sessionActive && (
          <div className="mt-2 flex flex-col items-center gap-2 bg-black/40 border border-theme-main/20 p-4 rounded-lg backdrop-blur-sm">
            <span className="font-cinzel text-xs text-primary/60 uppercase tracking-widest">Code de connexion (Joueurs)</span>
            <div className="flex items-center gap-4">
              <code className="font-mono text-lg text-theme-main font-bold px-3 py-1 bg-black/50 rounded">{sessionActive.id}</code>
              <button 
                onClick={() => navigator.clipboard.writeText(generateMJPeerId(sessionActive.id))}
                className="flex items-center gap-2 text-xs font-cinzel tracking-widest uppercase bg-theme-main/10 hover:bg-theme-main/20 text-theme-main px-3 py-2 rounded transition-all"
                title="Copier le Peer ID de connexion"
              >
                <Copy size={14} /> Copier
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4">
        {[
          { label: 'Modèles', value: stats.templates, icon: <ClipboardList size={36} strokeWidth={1} /> },
          { label: 'Quêtes', value: stats.quetes, icon: <ScrollText size={36} strokeWidth={1} /> },
          { label: 'Objets', value: stats.items, icon: <Package size={36} strokeWidth={1} /> },
          { label: 'Sorts', value: stats.competences, icon: <Sparkles size={36} strokeWidth={1} /> }
        ].map((s, i) => (
          <div key={i} className="relative group">
            <div className="absolute -inset-0.5 bg-theme-main/10 rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
            <div className="relative flex items-center justify-between p-6 bg-black/40 border border-white/5 rounded-lg backdrop-blur-sm">
              <div className="flex flex-col gap-1">
                <span className="font-cinzel text-[10px] font-black tracking-widest uppercase text-theme-main/60">{s.label}</span>
                <span className="text-3xl font-cinzel font-black text-primary">{s.value}</span>
              </div>
              <div className="text-theme-main/40 group-hover:scale-110 transition-transform duration-500">{s.icon}</div>
            </div>
          </div>
        ))}
      </div>

      <DashboardJoueurs joueurs={joueurs} scrollRef={scrollRefJoueurs} page={pageJoueurs} setPnjControle={setPnjControle} setPageCourante={setPageCourante} />
      <DashboardEntites entites={entites} filtreEntites={filtreEntites} setFiltreEntites={setFiltreEntites} scrollRef={scrollRefEntites} page={pageEntites} setPnjControle={setPnjControle} setPageCourante={setPageCourante} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-4">
        {[
          { label: 'Bestiaire', id: 'selection-personnage', tab: 'bestiaire', icon: <BookOpen size={24} />, desc: 'Gérer les monstres et leurs modèles' },
          { label: 'PNJ', id: 'selection-personnage', tab: 'pnj', icon: <Users size={24} />, desc: 'Incarner les habitants du monde' },
          { label: 'Objets', id: 'items', icon: <Package size={24} />, desc: 'Registres des trésors et artefacts' },
          { label: 'Sorts', id: 'competences', icon: <Sparkles size={24} />, desc: 'Bibliothèque des arcanes et talents' }
        ].map(btn => (
          <button key={btn.label} onClick={() => { if (btn.tab) localStorage.setItem('sigil-next-tab', btn.tab); setPageCourante(btn.id) }} className="group relative overflow-hidden p-8 rounded-lg border border-white/5 bg-black/20 hover:bg-theme-main/5 transition-all duration-500">
            <div className="flex items-center gap-6 text-left">
              <div className="p-4 rounded-full bg-white/5 group-hover:bg-theme-main/10 transition-colors">
                <div className="text-theme-main opacity-60 group-hover:opacity-100 transition-all">{btn.icon}</div>
              </div>
              <div className="flex flex-col">
                <span className="font-cinzel text-sm font-black tracking-widest text-primary group-hover:text-theme-main transition-colors uppercase">{btn.label}</span>
                <span className="font-garamond text-xs italic text-primary/40 group-hover:text-primary/60 transition-colors tracking-wide">{btn.desc}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="px-4">
        <Card className="p-6 border-theme-main/20 bg-theme-main/5 relative overflow-hidden flex flex-col gap-4">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-theme-main/40 to-transparent" />
          <span className="font-cinzel text-[9px] font-black text-theme-main tracking-[0.5em] opacity-40 uppercase">[ RÉCITS EN COURS ]</span>
          <div ref={scrollRefQuetes} className="h-[110px] overflow-y-scroll snap-y snap-mandatory scrollbar-none" style={{ scrollbarWidth: 'none' }}>
            {quetesEnCours.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-30 gap-4 grayscale">
                <ScrollText size={40} strokeWidth={1} />
                <span className="font-garamond italic text-lg">Les parchemins sont vierges...</span>
              </div>
            ) : (
              quetesEnCours.map(q => (
                <div key={q.id} className="snap-start snap-always min-h-full flex flex-col items-center justify-center text-center gap-2 px-4">
                  <h4 className="font-cinzel text-lg font-bold tracking-wide uppercase text-primary line-clamp-1">{q.titre}</h4>
                  <p className="font-garamond italic text-primary/70 line-clamp-1 text-sm">"{q.description || "Votre chemin reste à tracer dans les brumes de l'inconnu..."}"</p>
                  <button onClick={() => setSelectedQuete(q)} className="mt-1 font-cinzel text-[9px] text-theme-main opacity-40 hover:opacity-100 tracking-[0.3em] transition-all uppercase">Détails</button>
                </div>
              ))
            )}
          </div>
          {quetesEnCours.length > 0 && (
            <div className="flex justify-center gap-1 mt-1">
              {quetesEnCours.map((_, i) => (<div key={i} className={`w-1 h-1 rounded-full transition-all ${pageQuetes === i ? 'bg-theme-main w-3' : 'bg-theme-main/20'}`} />))}
            </div>
          )}
        </Card>
      </div>

      <QueteDetailModal quete={selectedQuete as any} mode="forge" onClose={() => setSelectedQuete(null)} onReouvrir={() => { setPageCourante('quetes'); setSelectedQuete(null); }} />

      <style>{`
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </motion.div>
  )
}
