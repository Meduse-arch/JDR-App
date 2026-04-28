import { useState, useEffect, useCallback } from 'react'
import { useStore, type Personnage, type PersonnageType } from '../../store/useStore'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/Button'
import { ConfirmButton } from '../../components/ui/ConfirmButton'
import { Badge } from '../../components/ui/Badge'
import { bestiaireService } from '../../services/bestiaireService'
import { sessionService } from '../../services/sessionService'
import { personnageService } from '../../services/personnageService'
import { InvoquerBestiaireModal } from '../../components/ui/modal'
import CreerPersonnage from '../shared/CreerPersonnage'
import { Users, Ghost, Search, User, Heart, Zap, Flame, Crown, Skull, Plus, Settings, Trash2, Eye, BookOpen, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

// Drawer Imports
import GererStats from './gerer/GererStats'
import GererRessources from './gerer/GererRessources'
import GererInventaire from './gerer/GererInventaire'
import GererCompetences from './gerer/GererCompetences'
import GererQuetes from './gerer/GererQuetes'
import GererProfil from './gerer/GererProfil'

type CompteSimple = { id: string; pseudo: string }

export default function GererPersonnage() {
  const { sessionActive, roleEffectif, setPnjControle, setPageCourante } = useStore()

  const [activeTab, setActiveTab] = useState<'joueurs' | 'pnj' | 'mobs' | 'bestiaire'>('joueurs')

  // Drawer states
  const [gererPersonnage, setGererPersonnage] = useState<Personnage | null>(null)
  const [onglet, setOnglet] = useState<'profil' | 'stats' | 'ressources' | 'inventaire' | 'competences' | 'quetes'>('profil')

  // Data states
  const [comptes, setComptes] = useState<CompteSimple[]>([])
  const [joueursPersos, setJoueursPersos] = useState<Personnage[]>([])
  const [mjsIds, setMjsIds] = useState<string[]>([])
  
  const [pnjs, setPnjs] = useState<Personnage[]>([])
  const [mobs, setMobs] = useState<Personnage[]>([])
  const [templates, setTemplates] = useState<Personnage[]>([])

  // Search & Filters
  const [recherche, setRecherche] = useState('')
  const [filtrePnj, setFiltrePnj] = useState<'Tous' | 'PNJ' | 'Boss'>('Tous')
  const [filtreMob, setFiltreMob] = useState<'Tous' | 'Vivants' | 'Morts'>('Tous')

  // UI States
  const [selectedJoueur, setSelectedJoueur] = useState<CompteSimple | null>(null)
  const [creationParams, setCreationParams] = useState<{type: PersonnageType, isTemplate: boolean, lieAuCompte?: string} | null>(null)
  
  const [showInvoquerModal, setShowInvoquerModal] = useState(false)
  const [invoquerTemplate, setInvoquerTemplate] = useState<Personnage | null>(null)
  const [invoquerCount, setInvoquerCount] = useState(1)

  // Handlers
  const chargerDonnees = useCallback(async () => {
    if (!sessionActive) return

    const db = (window as any).db;

    // Joueurs & Comptes
    const resPersos = await db.personnages.getAll();
    const persosRaw = resPersos.success ? resPersos.data.filter((p: any) => p.id_session === sessionActive.id && p.is_template === 0 && p.type === 'Joueur') : [];
    
    const persosData = [];
    for (const p of persosRaw) {
      const h = await personnageService.recalculerStats(p.id);
      persosData.push(h || p);
    }
    
    const resMj = await db.session_mj.getAll();
    const mjData = resMj.success ? resMj.data.filter((m: any) => m.id_session === sessionActive.id) : [];
    
    const resComptes = await db.comptes.getAll();
    const comptesData = resComptes.success ? resComptes.data : [];
    
    setJoueursPersos(persosData);
    setMjsIds(mjData.map((m: any) => m.id_compte));
    setComptes(comptesData);

    // PNJ & Boss
    const instancesPnj = await bestiaireService.getInstances(sessionActive.id, ['PNJ', 'Boss'])
    setPnjs(instancesPnj as Personnage[])
    
    // Mobs
    const instancesMob = await bestiaireService.getInstances(sessionActive.id, 'Monstre')
    setMobs(instancesMob as Personnage[])

    // Templates
    const templatesRaw = resPersos.success ? resPersos.data.filter((p: any) => p.id_session === sessionActive.id && p.is_template === 1 && ['Monstre', 'PNJ', 'Boss'].includes(p.type)) : [];
    const allTemplates = [];
    for (const t of templatesRaw) {
      const h = await personnageService.recalculerStats(t.id);
      allTemplates.push(h || t);
    }
    setTemplates(allTemplates);
  }, [sessionActive])

  const mettreAJourPersonnageMJ = useCallback(async (updates: Partial<Personnage>) => {
    if (!gererPersonnage || !sessionActive) return

    const db = (window as any).db;

    // 1. Détecter les mises à jour de ressources pour le mode hybride
    const resKeys: ('hp' | 'mana' | 'stam')[] = ['hp', 'mana', 'stam'];

    resKeys.forEach(key => {
      if (updates[key] !== undefined) {
        const val = updates[key] as number;
        const max = (gererPersonnage as any)[`${key}_max`] || 100;
        
        if (key === 'hp') personnageService.updatePVHybride(sessionActive.id, gererPersonnage.id, val, max);
        else if (key === 'mana') personnageService.updateManaHybride(sessionActive.id, gererPersonnage.id, val, max);
        else if (key === 'stam') personnageService.updateStaminaHybride(sessionActive.id, gererPersonnage.id, val, max);
      }
    });

    // 2. Mise à jour classique pour les autres champs ou si pas d'hybride
    const dbUpdates = { ...updates } as any;
    // On retire les champs calculés/virtuels si présents
    delete dbUpdates.hp_max;
    delete dbUpdates.mana_max;
    delete dbUpdates.stam_max;
    delete dbUpdates.stats;

    if (Object.keys(dbUpdates).length > 0) {
      await db.personnages.update(gererPersonnage.id, dbUpdates);
    }

    // 3. Rafraîchissement des données locales
    const resP = await db.personnages.getById(gererPersonnage.id);
    
    if (resP.success && resP.data) {
      // Pour reproduire la vue v_personnages, il faut recalculer les stats max, ou alors utiliser personnageService.recalculerStats mais on n'a pas besoin de full stats ici si juste refresh
      // Utilisons le service pour recalculer
      const updated = await personnageService.recalculerStats(gererPersonnage.id);
      if (updated) {
        setGererPersonnage(updated);
        setJoueursPersos(prev => prev.map(p => p.id === updated.id ? updated : p));
        setPnjs(prev => prev.map(p => p.id === updated.id ? updated : p));
        setMobs(prev => prev.map(p => p.id === updated.id ? updated : p));
        setTemplates(prev => prev.map(p => p.id === updated.id ? updated : p));
      }
    }
  }, [gererPersonnage, sessionActive])

  const toggleMJ = useCallback(async (idCompte: string, estDejaMJ: boolean) => {
    if (!sessionActive) return
    if (estDejaMJ) {
      await sessionService.retirerMJ(sessionActive.id, idCompte)
    } else {
      await sessionService.ajouterMJ(sessionActive.id, idCompte)
    }
    chargerDonnees()
  }, [sessionActive, chargerDonnees])

  const supprimerInstance = useCallback(async (id: string) => {
    await bestiaireService.supprimerInstance(id)
    chargerDonnees()
  }, [chargerDonnees])

  const tuerMob = useCallback(async (mob: Personnage) => {
    await personnageService.updatePV(mob.id, 0, mob.hp_max)
    chargerDonnees()
  }, [chargerDonnees])

  const handleInstancier = useCallback(async (t: Personnage, count: number, customName?: string, customType?: string) => {
    if (!sessionActive) return
    const overrides: any = { type: customType || t.type }
    if (customName) overrides.nom = customName

    await bestiaireService.instancier(t, sessionActive.id, count, overrides)
    await chargerDonnees()
    
    if (overrides.type === 'Monstre') setActiveTab('mobs')
    else setActiveTab('pnj')

    setShowInvoquerModal(false)
    setInvoquerTemplate(null)
    setInvoquerCount(1)
  }, [sessionActive, chargerDonnees])

  useEffect(() => {
    chargerDonnees()
    
    // Lecture de l'onglet suggéré par le dashboard
    const nextTab = localStorage.getItem('sigil-next-tab')
    if (nextTab) {
      setActiveTab(nextTab as any)
      localStorage.removeItem('sigil-next-tab')
    }
  }, [sessionActive, chargerDonnees])

  useEffect(() => {
    setRecherche('')
    setSelectedJoueur(null)
  }, [activeTab])

  // Views
  if (creationParams) {
    return <CreerPersonnage 
      type={creationParams.type} 
      isTemplate={creationParams.isTemplate} 
      lieAuCompte={creationParams.lieAuCompte}
      retour={() => { setCreationParams(null); chargerDonnees() }} 
    />
  }

  const comptesActifs = comptes.filter(c => joueursPersos.some(p => p.lie_au_compte === c.id) || mjsIds.includes(c.id))
  const comptesFiltres = comptesActifs.filter(c => c.pseudo.toLowerCase().includes(recherche.toLowerCase()))

  const pnjsFiltres = pnjs.filter(p => {
    if (recherche && !p.nom.toLowerCase().includes(recherche.toLowerCase())) return false
    if (filtrePnj !== 'Tous' && p.type !== filtrePnj) return false
    return true
  })

  const mobsFiltres = mobs.filter(m => {
    if (recherche && !m.nom.toLowerCase().includes(recherche.toLowerCase())) return false
    if (filtreMob === 'Vivants' && m.hp <= 0) return false
    if (filtreMob === 'Morts' && m.hp > 0) return false
    return true
  })

  const templatesFiltres = templates.filter(t => t.nom.toLowerCase().includes(recherche.toLowerCase()))

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
      {/* HEADER TABS */}
      <div className="flex gap-2 py-2 px-4 md:px-8 border-b border-theme/20 bg-card/20 backdrop-blur-sm shrink-0 overflow-x-auto no-scrollbar">
        {[
          { id: 'joueurs', label: 'Joueurs', icon: Users },
          { id: 'pnj', label: 'PNJ & Boss', icon: Crown },
          { id: 'mobs', label: 'Monstres', icon: Skull },
          { id: 'bestiaire', label: 'Bestiaire', icon: BookOpen }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`flex items-center gap-2 px-6 py-3 font-cinzel font-black uppercase tracking-widest transition-all rounded-sm ${
              activeTab === t.id 
                ? 'bg-theme-main text-white shadow-[0_0_15px_rgba(var(--color-main-rgb),0.3)]' 
                : 'text-primary/40 hover:text-primary hover:bg-white/5 border border-transparent hover:border-theme/20'
            }`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-hidden relative">
        
        {/* ONGLET JOUEURS */}
        {activeTab === 'joueurs' && (
          <div className="flex h-full w-full">
            <div className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto custom-scrollbar">
              <div className="w-full max-w-md relative mb-8">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40 text-theme-main"><Search size={18} /></span>
                <input 
                  type="text" placeholder="Rechercher un joueur..." value={recherche} onChange={e => setRecherche(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-sm outline-none transition-all font-garamond font-bold bg-card border border-theme text-primary"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start pb-20">
                {comptesFiltres.map(c => {
                  const persos = joueursPersos.filter(p => p.lie_au_compte === c.id)
                  const estMJ = mjsIds.includes(c.id)
                  const isSelected = selectedJoueur?.id === c.id

                  return (
                    <Card 
                      key={c.id} 
                      onClick={() => setSelectedJoueur(isSelected ? null : c)}
                      className={`flex flex-row items-center gap-4 cursor-pointer p-4 transition-all medieval-border ${
                        isSelected ? 'border-theme-main bg-theme-main/10 scale-[1.02]' : 'bg-card/40 border-theme/20 hover:border-theme-main/40'
                      }`}
                    >
                      <div className="w-14 h-14 rounded-sm bg-black/40 border border-theme/20 flex items-center justify-center shrink-0">
                        <span className="font-cinzel font-black text-xl text-theme-main opacity-80">{c.pseudo.substring(0, 2).toUpperCase()}</span>
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-cinzel font-black text-lg text-primary uppercase truncate">{c.pseudo}</h3>
                          {estMJ && <Badge variant="outline" className="text-[8px] border-theme-main text-theme-main py-0.5 px-1.5">MJ</Badge>}
                        </div>
                        <span className="text-xs font-garamond italic opacity-60">
                          {persos.length} personnage(s)
                        </span>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>

            {/* SIDE PANEL JOUEUR */}
            <AnimatePresence>
              {selectedJoueur && (
                <motion.div 
                  initial={{ x: '100%', opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: '100%', opacity: 0 }}
                  transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
                  className="w-full md:w-80 bg-black/60 backdrop-blur-xl border-l border-theme/20 flex flex-col h-full shrink-0 shadow-2xl z-10"
                >
                  <div className="p-6 border-b border-theme/20 flex flex-col gap-2 bg-theme-main/5">
                    <h2 className="font-cinzel font-black text-2xl text-theme-main uppercase tracking-widest">{selectedJoueur.pseudo}</h2>
                    <span className="text-xs font-garamond italic opacity-60">Détails du compte et personnages</span>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-6">
                    {joueursPersos.filter(p => p.lie_au_compte === selectedJoueur.id).map(p => (
                      <Card key={p.id} className="p-4 bg-card/40 border-theme/20 medieval-border flex flex-col gap-4 relative group">
                        <h4 className="font-cinzel font-black text-lg text-primary uppercase tracking-widest truncate">{p.nom}</h4>
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-60">
                          <span className="text-red-400">HP {p.hp}/{p.hp_max}</span>
                          <span className="text-blue-400">MP {p.mana}/{p.mana_max}</span>
                          <span className="text-amber-400">SP {p.stam}/{p.stam_max}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="secondary"
                            className="flex-1 text-[10px] uppercase font-cinzel font-black tracking-widest"
                            onClick={() => { setPnjControle(p); setPageCourante('mon-personnage') }}
                          >
                            <Eye size={14} className="mr-2" /> Voir
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="flex-1 text-[10px] uppercase font-cinzel font-black tracking-widest border-theme-main/20 text-theme-main"
                            onClick={() => { setGererPersonnage(p); setOnglet('stats') }}
                          >
                            Gérer
                          </Button>
                        </div>
                      </Card>
                    ))}

                    <Button 
                      variant="ghost" 
                      className="border border-dashed border-theme/30 text-theme-main opacity-60 hover:opacity-100 py-6 font-cinzel"
                      onClick={() => setCreationParams({ type: 'Joueur', isTemplate: false, lieAuCompte: selectedJoueur.id })}
                    >
                      <Plus size={16} className="mr-2" /> Créer un personnage
                    </Button>
                  </div>

                  {roleEffectif === 'admin' && (
                    <div className="p-6 border-t border-theme/20 bg-black/40">
                      <Button 
                        variant={mjsIds.includes(selectedJoueur.id) ? 'danger' : 'primary'}
                        className="w-full font-cinzel font-black tracking-widest uppercase text-xs py-4"
                        onClick={() => toggleMJ(selectedJoueur.id, mjsIds.includes(selectedJoueur.id))}
                      >
                        {mjsIds.includes(selectedJoueur.id) ? 'Retirer les droits MJ' : 'Nommer Maître de Jeu'}
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ONGLET PNJ */}
        {activeTab === 'pnj' && (
          <div className="flex flex-col h-full p-4 md:p-8 overflow-y-auto custom-scrollbar">
            <div className="flex flex-col md:flex-row justify-between gap-4 mb-8">
              <div className="flex-1 max-w-md relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40 text-theme-main"><Search size={18} /></span>
                <input 
                  type="text" placeholder="Rechercher un PNJ..." value={recherche} onChange={e => setRecherche(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-sm outline-none transition-all font-garamond font-bold bg-card border border-theme text-primary"
                />
              </div>
              <div className="flex gap-4 items-center">
                <div className="flex gap-2 p-1 rounded-sm bg-black/20 border border-theme/30 overflow-x-auto no-scrollbar">
                  {(['Tous', 'PNJ', 'Boss'] as const).map(f => (
                    <button
                      key={f} onClick={() => setFiltrePnj(f)}
                      className={`px-4 py-2 rounded-sm text-[10px] font-cinzel font-black uppercase transition-all whitespace-nowrap ${filtrePnj === f ? 'bg-theme-main text-white shadow-lg' : 'opacity-40 hover:opacity-100 text-primary'}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => { setShowInvoquerModal(true); setInvoquerTemplate(null); }} className="font-cinzel whitespace-nowrap">
                    <BookOpen size={16} className="mr-2" /> Depuis un modèle
                  </Button>
                  <Button onClick={() => setCreationParams({ type: 'PNJ', isTemplate: false })} className="font-cinzel whitespace-nowrap">
                    <Plus size={16} className="mr-2" /> Nouveau PNJ
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
              {pnjsFiltres.map(p => (
                <Card key={p.id} className="p-6 bg-card/40 border-theme/20 medieval-border flex flex-col gap-4 group hover:border-theme-main/50 transition-colors relative">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-cinzel font-black text-xl text-primary uppercase tracking-widest">{p.nom}</h3>
                      <Badge variant="outline" className={`w-fit text-[9px] font-cinzel uppercase ${p.type === 'Boss' ? 'border-red-900 text-red-500 bg-red-900/10' : 'border-theme-main/30 text-theme-main bg-theme-main/5'}`}>
                        {p.type}
                      </Badge>
                    </div>
                    <div className="flex gap-2 opacity-10 group-hover:opacity-100 transition-opacity">
                      <ConfirmButton variant="danger" size="sm" onConfirm={() => supprimerInstance(p.id)} className="p-2 h-auto"><Trash2 size={14}/></ConfirmButton>
                    </div>
                  </div>
                  <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest opacity-60">
                    <span className="text-red-400 flex items-center gap-1"><Heart size={12}/> {p.hp}/{p.hp_max}</span>
                    <span className="text-blue-400 flex items-center gap-1"><Zap size={12}/> {p.mana}/{p.mana_max}</span>
                    <span className="text-amber-400 flex items-center gap-1"><Flame size={12}/> {p.stam}/{p.stam_max}</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button 
                      variant="secondary" size="sm" 
                      className="flex-1 font-cinzel text-xs uppercase tracking-widest"
                      onClick={() => { setPnjControle(p); setPageCourante('mon-personnage') }}
                    >
                      <Settings size={14} className="mr-2" /> incarner
                    </Button>
                    <button
                      onClick={e => { e.stopPropagation(); setGererPersonnage(p); setOnglet('stats') }}
                      className="opacity-0 group-hover:opacity-100 transition-all font-cinzel text-[8px] uppercase tracking-widest text-theme-main/60 hover:text-theme-main border border-theme-main/20 hover:border-theme-main/50 px-2 py-1"
                    >
                      Gérer →
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ONGLET MOBS */}
        {activeTab === 'mobs' && (
          <div className="flex flex-col h-full p-4 md:p-8 overflow-y-auto custom-scrollbar">
            <div className="flex flex-col md:flex-row justify-between gap-4 mb-8">
              <div className="flex-1 max-w-md relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40 text-theme-main"><Search size={18} /></span>
                <input 
                  type="text" placeholder="Rechercher un monstre..." value={recherche} onChange={e => setRecherche(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-sm outline-none transition-all font-garamond font-bold bg-card border border-theme text-primary"
                />
              </div>
              <div className="flex gap-4 items-center">
                <div className="flex gap-2 p-1 rounded-sm bg-black/20 border border-theme/30 overflow-x-auto no-scrollbar">
                  {(['Tous', 'Vivants', 'Morts'] as const).map(f => (
                    <button
                      key={f} onClick={() => setFiltreMob(f)}
                      className={`px-4 py-2 rounded-sm text-[10px] font-cinzel font-black uppercase transition-all whitespace-nowrap ${filtreMob === f ? 'bg-theme-main text-white shadow-lg' : 'opacity-40 hover:opacity-100 text-primary'}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <Button onClick={() => { setShowInvoquerModal(true); setInvoquerTemplate(null); }} className="font-cinzel whitespace-nowrap">
                  <Ghost size={16} className="mr-2" /> + Invoquer
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 pb-20">
              {mobsFiltres.map(m => (
                <Card key={m.id} className={`p-5 bg-card/40 border-theme/20 medieval-border flex flex-col gap-4 transition-colors relative group ${m.hp <= 0 ? 'opacity-50 grayscale' : 'hover:border-theme-main/50'}`}>
                  <div className="flex justify-between items-start">
                    <h3 className={`font-cinzel font-black text-lg uppercase tracking-widest truncate ${m.hp <= 0 ? 'text-red-500 line-through' : 'text-primary'}`}>{m.nom}</h3>
                    <ConfirmButton variant="danger" size="sm" onConfirm={() => supprimerInstance(m.id)} className="p-1.5 h-auto bg-transparent hover:bg-red-900/50 text-red-500/50 hover:text-red-500"><Trash2 size={14}/></ConfirmButton>
                  </div>
                  <div className="flex gap-3 text-[10px] font-black uppercase tracking-widest opacity-60">
                    <span className={`${m.hp <= 0 ? 'text-red-700' : 'text-red-400'}`}>HP {m.hp}/{m.hp_max}</span>
                    <span className="text-blue-400">MP {m.mana}/{m.mana_max}</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button 
                      variant="secondary" size="sm" 
                      className="flex-1 font-cinzel text-[10px] uppercase tracking-widest"
                      onClick={() => { setPnjControle(m); setPageCourante('mon-personnage') }}
                    >
                      Incarner
                    </Button>
                    <button
                      onClick={e => { e.stopPropagation(); setGererPersonnage(m); setOnglet('stats') }}
                      className="opacity-0 group-hover:opacity-100 transition-all font-cinzel text-[8px] uppercase tracking-widest text-theme-main/60 hover:text-theme-main border border-theme-main/20 hover:border-theme-main/50 px-2 py-1"
                    >
                      Gérer →
                    </button>
                    {m.hp > 0 && (
                      <Button 
                        variant="danger" size="sm" 
                        className="p-2 h-auto"
                        onClick={() => tuerMob(m)}
                        title="Tuer"
                      >
                        <Skull size={14} />
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ONGLET BESTIAIRE */}
        {activeTab === 'bestiaire' && (
          <div className="flex flex-col h-full p-4 md:p-8 overflow-y-auto custom-scrollbar">
            <div className="flex flex-col md:flex-row justify-between gap-4 mb-8">
              <div className="flex-1 max-w-md relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40 text-theme-main"><Search size={18} /></span>
                <input 
                  type="text" placeholder="Rechercher un modèle..." value={recherche} onChange={e => setRecherche(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-sm outline-none transition-all font-garamond font-bold bg-card border border-theme text-primary"
                />
              </div>
              <Button onClick={() => setCreationParams({type: 'Monstre', isTemplate: true})} className="font-cinzel whitespace-nowrap">
                <Plus size={16} className="mr-2" /> Nouveau modèle
              </Button>
            </div>

            <div className="flex flex-col gap-6 pb-20">
              <h2 className="font-cinzel font-black text-2xl text-theme-main uppercase tracking-widest flex items-center gap-3 border-b border-theme/20 pb-4">
                <BookOpen size={24} /> Archives des Modèles
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {templatesFiltres.map(t => (
                  <Card key={t.id} className="p-5 bg-card/40 border-theme/20 medieval-border flex flex-col gap-4 relative group hover:border-theme-main/40 transition-all">
                    <div className="flex justify-between items-start">
                      <h3 className="font-cinzel font-black text-lg text-primary uppercase tracking-widest truncate">{t.nom}</h3>
                      <ConfirmButton variant="danger" size="sm" onConfirm={() => supprimerInstance(t.id)} className="p-1.5 h-auto bg-transparent text-red-500/50 hover:text-red-500 hover:bg-red-900/20"><Trash2 size={14}/></ConfirmButton>
                    </div>
                    <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest opacity-60">
                      <span className="text-red-400">HP {t.hp_max}</span>
                      <span className="text-blue-400">MP {t.mana_max}</span>
                      <span className="text-theme-main flex-1">STAM {t.stam_max}</span>
                      <button
                        onClick={e => { e.stopPropagation(); setGererPersonnage(t); setOnglet('stats') }}
                        className="opacity-0 group-hover:opacity-100 transition-all font-cinzel text-[8px] uppercase tracking-widest text-theme-main/60 hover:text-theme-main border border-theme-main/20 hover:border-theme-main/50 px-2 py-0.5 rounded-sm"
                      >
                        Gérer →
                      </button>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button 
                        className="flex-1 font-cinzel text-[10px] uppercase tracking-widest"
                        onClick={() => {
                          setInvoquerTemplate(t)
                          setInvoquerCount(1)
                          setShowInvoquerModal(true)
                        }}
                      >
                        Instancier
                      </Button>
                    </div>
                  </Card>
                ))}
                {templatesFiltres.length === 0 && (
                  <div className="col-span-full py-20 text-center opacity-20 font-garamond italic text-xl">
                    Aucun modèle ne repose dans ces archives...
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Modal Invoquer (depuis Mobs tab) */}
      <InvoquerBestiaireModal 
        isOpen={showInvoquerModal}
        onClose={() => setShowInvoquerModal(false)}
        templates={templates}
        onInstancier={handleInstancier}
        invoquerTemplate={invoquerTemplate}
        setInvoquerTemplate={setInvoquerTemplate}
        invoquerCount={invoquerCount}
        setInvoquerCount={setInvoquerCount}
      />

      {/* Overlay */}
      {gererPersonnage && (
        <div
          className="fixed inset-0 bg-black/40 z-[150]"
          onClick={() => setGererPersonnage(null)}
        />
      )}

      {/* Drawer */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-2xl z-[160] flex flex-col transition-transform duration-300 ${gererPersonnage ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ background: 'var(--bg-surface)' }}
      >
        {/* Bordure gauche dégradée */}
        <div className="absolute top-0 left-0 bottom-0 w-px bg-gradient-to-b from-transparent via-theme-main/40 to-transparent" />

        {/* Header drawer */}
        <div className="flex items-center justify-between p-6 border-b border-theme shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-sm border border-theme/20 bg-black/40 overflow-hidden shrink-0">
              {gererPersonnage?.image_url ? (
                <img src={gererPersonnage.image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center opacity-20">
                  <User size={24} />
                </div>
              )}
            </div>
            <div>
              <p className="font-cinzel text-[10px] uppercase tracking-[0.3em] text-theme-main/50">Gestion de</p>
              <h3 className="font-cinzel font-black uppercase tracking-widest text-xl text-primary">{gererPersonnage?.nom}</h3>
            </div>
          </div>
          <button onClick={() => setGererPersonnage(null)} className="text-theme-main/30 hover:text-theme-main transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Onglets fins */}
        <div className="flex gap-6 px-6 border-b border-theme shrink-0 overflow-x-auto no-scrollbar">
          {([
            ['profil', 'Profil'],
            ['stats', 'Stats'],
            ['ressources', 'Ressources'],
            ['inventaire', 'Inventaire'],
            ['competences', 'Compétences'],
            ['quetes', 'Quêtes'],
          ] as const).map(([id, label]) => (
            <button key={id} onClick={() => setOnglet(id)}
              className={`font-cinzel text-[10px] uppercase tracking-[0.25em] py-3 relative transition-all shrink-0 ${onglet === id ? 'text-theme-main' : 'text-primary opacity-30 hover:opacity-70'}`}>
              {label}
              {onglet === id && <div className="absolute bottom-0 left-0 w-full h-px bg-theme-main shadow-[0_0_8px_var(--color-main)]" />}
            </button>
          ))}
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {gererPersonnage && (
            <>
              {onglet === 'profil' && <GererProfil personnage={gererPersonnage} onRecharger={chargerDonnees} />}
              {onglet === 'stats' && <GererStats personnage={gererPersonnage} onRecharger={chargerDonnees} />}
              {onglet === 'ressources' && <GererRessources personnage={gererPersonnage} mettreAJourLocalement={mettreAJourPersonnageMJ} />}
              {onglet === 'inventaire' && <GererInventaire personnage={gererPersonnage} />}
              {onglet === 'competences' && <GererCompetences personnage={gererPersonnage} />}
              {onglet === 'quetes' && <GererQuetes personnage={gererPersonnage} />}
            </>
          )}
        </div>
      </div>

    </div>
  )
}

