import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Personnage, Competence } from '../../types'
import { useCompetenceForge } from '../../hooks/useCompetenceForge'
import { useCompetenceAttribution } from '../../hooks/useCompetenceAttribution'
import { useCompetenceUsage } from '../../hooks/useCompetenceUsage'
import { useCompetences } from '../../hooks/useCompetences'
import { usePersonnage } from '../../hooks/usePersonnage'
import { useStore } from '../../store/useStore'
import { useStats as useGlobalStats } from '../../hooks/useStats'
import { useItems } from '../../hooks/useItems'
import { filtrerCompetences } from '../../utils/competenceUtils'
import { formatLabelModif, formatLabelEffet } from '../../utils/formatters'
import { competenceService } from '../../services/competenceService'

import CompetenceForgeForm from './CompetenceForgeForm'
import { CompetenceCard } from '../ui/card'
import { CompetenceDetailModal } from '../ui/modal'
import { Button } from '../ui/Button'
import { ConfirmationBar } from '../ui/ConfirmationBar'
import { Search, Wand2, BookOpen, Zap, CircleDot, Trash2 } from 'lucide-react'

interface Props {
  mode: 'forge' | 'attribuer' | 'utiliser'
  personnage?: Personnage | null
}

export default function CompetenceView({ mode, personnage = null }: Props) {
  const { mettreAJourLocalement } = usePersonnage()
  const { stats: statsCalculees, rechargerStats } = useGlobalStats()
  const { stats: allStats } = useItems()
  const { competences: libCompetences } = useCompetences()

  // Logic Hooks
  const forge = useCompetenceForge()
  const attr = useCompetenceAttribution(personnage)
  const usage = useCompetenceUsage(personnage, mettreAJourLocalement, statsCalculees)

  // Local UI State
  const [vue, setVue] = useState<'liste' | 'creer'>('liste')
  const [ongletAttr, setOngletAttr] = useState<'liste' | 'ajouter'>('liste')
  const [recherche, setRecherche] = useState('')
  const [filtreP, setFiltreP] = useState('Tous')
  const [filtreS, setFiltreS] = useState('Tous')
  const [detail, setDetail] = useState<Competence | null>(null)

  const [selectionRetirer, setSelectionRetirer] = useState<string[]>([])
  const [selectionAjouter, setSelectionAjouter] = useState<string[]>([])
  const [enRetrait, setEnRetrait] = useState(false)
  const [enAjout, setEnAjout] = useState(false)

  const { itemDisplayMode } = useStore()
  const isCodex = itemDisplayMode === 'codex'

  const toggleSelectionRetirer = (idComp: string) => {
    setSelectionRetirer(prev =>
      prev.includes(idComp) ? prev.filter(i => i !== idComp) : [...prev, idComp]
    )
  }

  const toggleSelectionAjouter = (idComp: string) => {
    setSelectionAjouter(prev =>
      prev.includes(idComp) ? prev.filter(i => i !== idComp) : [...prev, idComp]
    )
  }

  const retirerSelection = async () => {
    if (!personnage || selectionRetirer.length === 0) return
    setEnRetrait(true)
    try {
      for (const idComp of selectionRetirer) {
        await attr.oublierCompetence(idComp)
      }
      setSelectionRetirer([])
    } catch (e) {
      console.error(e)
    } finally {
      setEnRetrait(false)
    }
  }

  const ajouterSelection = async () => {
    if (!personnage || selectionAjouter.length === 0) return
    setEnAjout(true)
    try {
      for (const idComp of selectionAjouter) {
        await competenceService.apprendreCompetence(personnage.id, idComp)
      }
      setSelectionAjouter([])
      setOngletAttr('liste')
      await attr.chargerCompetencesAcquises(true)
    } catch (e) {
      console.error(e)
    } finally {
      setEnAjout(false)
    }
  }

  // Handlers
  const handleSave = async () => {
    const ok = await forge.sauvegarder()
    if (ok) { setVue('liste') }
    return ok
  }

  // Data Filtering
  const idsAcquises = new Set(
    attr.competencesAcquises.map((ca: any) => ca.id_competence || ca.id)
  )

  const listSource = mode === 'forge'
    ? libCompetences
    : mode === 'utiliser'
      ? libCompetences.filter((c: any) => {
          const comp = c.competence || c
          return idsAcquises.has(comp.id)
        })
      : libCompetences // mode attribuer : toute la lib

  const filteredRaw = listSource.filter((c: any) => {
    const comp = c.competence || c
    if (mode === 'attribuer' && ongletAttr === 'liste') {
      if (!idsAcquises.has(comp.id)) return false
    }
    if (mode === 'attribuer' && ongletAttr === 'ajouter') {
      if (idsAcquises.has(comp.id)) return false
    }
    return true
  })

  const filtered = filtrerCompetences(filteredRaw, recherche, filtreP, filtreS)
    .sort((a: any, b: any) => {
      const ca = a.competence || a
      const cb = b.competence || b
      const selA = selectionRetirer.includes(ca.id) || selectionAjouter.includes(ca.id) ? 1 : 0
      const selB = selectionRetirer.includes(cb.id) || selectionAjouter.includes(cb.id) ? 1 : 0
      return selB - selA
    })

  if (mode === 'forge' && vue === 'creer') {
    return <CompetenceForgeForm {...forge} onSave={handleSave} onCancel={() => { forge.reset(); setVue('liste') }} />
  }

  const renderCodexDetail = () => {
    if (!detail) return (
      <div className="flex flex-col items-center justify-center h-full opacity-20">
        <BookOpen size={64} className="mb-4 text-theme-main" />
        <span className="font-cinzel tracking-widest uppercase text-primary">Sélectionnez une arcane</span>
      </div>
    )

    const comp = detail;
    const acquise = attr.competencesAcquises.find(ca => ca.id_competence === comp.id);
    const isPossede = idsAcquises.has(comp.id);

    return (
      <div className="flex flex-col gap-6 animate-in slide-in-from-right-4 duration-300 h-full p-6">
        <div className="flex gap-4 items-start">
          <div className="flex-1 flex flex-col gap-2">
            <h3 className="text-2xl font-cinzel font-black uppercase tracking-widest text-primary">
              {comp.nom}
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-cinzel text-[9px] tracking-[0.2em] px-2 py-0.5 uppercase bg-black/40 border border-theme/10 rounded-sm flex items-center gap-1">
                {comp.type === 'active' ? (
                  <><Zap size={10} className="text-theme-main" /><span className="text-theme-main font-bold">Actif</span></>
                ) : (
                  <><CircleDot size={10} className="text-blue-400" /><span className="text-blue-400 font-bold">Passif</span></>
                )}
              </div>
              {comp.tags && comp.tags.map((t: any) => (
                <span key={t.id} className="text-[8px] font-cinzel opacity-40 uppercase tracking-widest">
                  #{t.nom}
                </span>
              ))}
              {isPossede && acquise?.is_active && (
                <span className="text-[8px] font-cinzel font-black uppercase px-2 py-0.5 bg-theme-main text-white rounded-sm animate-pulse">
                  Aura Active
                </span>
              )}
            </div>
          </div>

          {comp.image_url ? (
            <div className="w-16 h-16 shrink-0 rounded-sm overflow-hidden border border-theme-main/30 bg-black/40 shadow-xl">
              <img 
                src={comp.image_url} 
                alt={comp.nom} 
                className="w-full h-full object-cover" 
              />
            </div>
          ) : (
             <div className="w-16 h-16 shrink-0 rounded-sm overflow-hidden border border-white/5 bg-black/20 flex items-center justify-center opacity-50">
               {comp.type === 'active' ? <Zap size={24} className="text-theme-main" /> : <CircleDot size={24} className="text-blue-400" />}
             </div>
          )}
        </div>

        <div className="h-px w-full bg-gradient-to-r from-transparent via-theme-main/20 to-transparent shrink-0" />

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-6">
          {comp.description && (
            <div className="bg-black/20 p-4 rounded-sm border-l-2 border-theme-main/40">
              <p className="font-garamond text-base italic text-secondary leading-relaxed">
                "{comp.description}"
              </p>
            </div>
          )}

          {((comp.modificateurs?.length || 0) > 0 || (comp.effets_actifs?.length || 0) > 0) && (
            <div className="flex flex-col gap-2">
              <h4 className="font-cinzel text-[10px] uppercase tracking-[0.2em] text-theme-main opacity-60">
                Mécaniques
              </h4>
              <div className="flex flex-wrap gap-2">
                {comp.modificateurs?.map((m: any, i: number) => (
                  <span key={`m-${i}`} className="text-[9px] font-cinzel font-black uppercase px-2 py-1 bg-theme-main/10 text-theme-main border border-theme-main/20 rounded-sm">
                    {formatLabelModif(m, allStats)}
                  </span>
                ))}
                {comp.effets_actifs?.map((e: any, i: number) => (
                  <span key={`e-${i}`} className={`text-[9px] font-cinzel font-black uppercase px-2 py-1 border rounded-sm ${e.est_jet_de ? 'bg-yellow-900/20 text-yellow-500 border-yellow-900/30' : e.est_cout ? 'bg-red-900/20 text-red-500 border-red-900/30' : 'bg-green-900/20 text-green-500 border-green-900/30'}`}>
                    {formatLabelEffet(e, allStats)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 mt-auto pt-4 border-t border-theme/10 shrink-0">
          {mode === 'forge' ? (
            <div className="flex items-center gap-2 w-full">
              <Button variant="secondary" onClick={() => { forge.chargerPourEdition(comp); setVue('creer'); setDetail(null); }} className="flex-1 gap-2">
                Modifier l'arcane
              </Button>
              <Button
                variant="outline"
                onClick={() => { forge.supprimer(comp.id); setDetail(null); }}
                className="px-3 border-red-500/20 text-red-500 hover:bg-red-500/10 hover:border-red-500 hover:text-red-400"
                title="Supprimer"
              >
                <Trash2 size={16} />
              </Button>
            </div>
          ) : (
            <>
              {comp.type === 'active' && (
                <Button variant="primary" onClick={() => usage.utiliserCompetence(comp)} className="w-full py-3 uppercase text-xs tracking-widest">
                  Lancer l'arcane
                </Button>
              )}
              {comp.type === 'passive_toggle' && acquise && (
                <Button 
                  variant={acquise.is_active ? 'secondary' : 'primary'} 
                  onClick={async () => {
                    // Mise à jour optimiste du detail
                    setDetail({ ...comp }); // Force re-render with current state
                    await usage.toggleCompetence(acquise, rechargerStats, attr.chargerCompetencesAcquises);
                  }} 
                  className="w-full py-3 uppercase text-xs tracking-widest"
                >
                  {acquise.is_active ? 'Désactiver l\'Aura' : 'Activer l\'Aura'}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`relative flex flex-col ${isCodex ? 'h-[calc(100vh-10rem)]' : ''}`}>
      {/* BARRE D'OUTILS */}
      <div className="flex flex-col gap-0 border-b border-theme/10 mb-6 mt-4 shrink-0">
        {/* Ligne 1 : Onglets + Recherche */}
        <div className="flex items-center gap-6 pb-3">
          {['Tous', 'Actif', 'Passif'].map(t => (
            <button key={t} onClick={() => { setFiltreP(t); setFiltreS('Tous'); }}
              className={`font-cinzel text-[11px] uppercase tracking-[0.3em] transition-all relative py-1 ${filtreP === t ? 'text-theme-main' : 'text-primary opacity-30 hover:opacity-70'}`}>
              {t}
              {filtreP === t && <div className="absolute bottom-0 left-0 w-full h-px bg-theme-main shadow-[0_0_8px_var(--color-main)]" />}
            </button>
          ))}
          {mode === 'attribuer' && (
            <>
              <span className="w-px h-4 bg-theme/20 self-center" />
              {(['liste', 'ajouter'] as const).map(o => (
                <button key={o} onClick={() => setOngletAttr(o)}
                  className={`font-cinzel text-[11px] uppercase tracking-[0.3em] transition-all relative py-1 ${ongletAttr === o ? 'text-theme-main' : 'text-primary opacity-30 hover:opacity-70'}`}>
                  {o === 'liste' ? 'Possédées' : 'Bibliothèque'}
                  {ongletAttr === o && <div className="absolute bottom-0 left-0 w-full h-px bg-theme-main shadow-[0_0_8px_var(--color-main)]" />}
                </button>
              ))}
            </>
          )}
          {mode === 'forge' && (
            <Button onClick={() => setVue('creer')} className="ml-auto font-cinzel gap-2 group border-theme-main/30 hover:border-theme-main/60 transition-all text-[10px] uppercase py-2 px-6">
              <Wand2 size={14} className="group-hover:rotate-12 transition-transform" />
              Graver un nouvel art
            </Button>
          )}
          <div className={`relative w-40 group ${mode !== 'forge' ? 'ml-auto' : ''}`}>
            <Search size={13} className="absolute left-0 top-1/2 -translate-y-1/2 text-theme-main opacity-40 group-focus-within:opacity-100 transition-opacity" />
            <input type="text" placeholder="Chercher..." value={recherche} onChange={e => setRecherche(e.target.value)}
              className="w-full pl-5 pr-2 py-1.5 bg-transparent border-b border-theme/10 font-garamond italic text-primary focus:border-theme-main/50 outline-none transition-all placeholder:opacity-20 text-sm" />
          </div>
        </div>
      </div>

      {/* AFFICHAGE DES ARCANES */}
      <div className={`flex-1 min-h-0 ${isCodex ? 'flex flex-col lg:flex-row gap-6 items-start h-full' : 'pb-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'}`}>
        
        {/* LISTE OU GRILLE */}
        <div className={isCodex ? 'flex-1 flex flex-col gap-2 w-full h-full overflow-y-auto custom-scrollbar lg:pr-2' : 'contents'}>
          <AnimatePresence mode="popLayout">
          {filtered.map((rawItem: any) => {
            const comp = rawItem.competence || rawItem
            const acquise = attr.competencesAcquises.find(
              (ca: any) => (ca.id_competence || ca.id) === comp.id
            )
            const isPossede = idsAcquises.has(comp.id)
            const isSelectedRetirer = selectionRetirer.includes(comp.id)
            const isSelectedAjouter = selectionAjouter.includes(comp.id)
            const isSelected = isSelectedRetirer || isSelectedAjouter

            // ─── RENDU LIGNE CODEX ───
            if (isCodex) {
              const isActive = detail?.id === comp.id;
              return (
                <motion.div 
                  layout
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}
                  key={comp.id} 
                  onClick={() => {
                    if (mode === 'attribuer') {
                      if (ongletAttr === 'liste') toggleSelectionRetirer(comp.id);
                      else toggleSelectionAjouter(comp.id);
                    }
                    setDetail(comp);
                  }}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-sm cursor-pointer transition-all ${
                    isActive ? 'bg-theme-main/10 border-theme-main shadow-[0_0_15px_rgba(var(--color-main-rgb),0.2)]' : 
                    isSelected ? 'border-theme-main/50 bg-theme-main/5 scale-[1.01]' :
                    'bg-card/40 border-theme/20 hover:border-theme-main/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 shrink-0 rounded-sm bg-black/40 flex items-center justify-center border border-theme/10 text-theme-main shadow-inner overflow-hidden">
                       {comp.image_url ? (
                         <img src={comp.image_url} alt="" className="w-full h-full object-cover" />
                       ) : (
                         comp.type === 'active' ? <Zap size={18} /> : <CircleDot size={18} className="text-blue-400" />
                       )}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-cinzel font-bold text-sm uppercase tracking-widest text-primary">{comp.nom}</span>
                        {isPossede && acquise?.is_active && <span className="w-2 h-2 rounded-full bg-theme-main animate-pulse shadow-[0_0_8px_var(--color-main)]" title="Aura Active" />}
                      </div>
                      <span className="font-garamond italic text-[11px] text-theme-main/60">{comp.type === 'active' ? 'Compétence Active' : 'Compétence Passive'}</span>
                    </div>
                  </div>
                  
                  {/* Action area */}
                  <div className="flex items-center gap-4 mt-2 sm:mt-0 pl-13 sm:pl-0">
                    {mode === 'utiliser' && comp.type === 'active' && (
                      <Button variant="outline" className="h-8 px-3 py-0 text-[10px]" onClick={(e) => { e.stopPropagation(); usage.utiliserCompetence(comp); }}>
                        Lancer
                      </Button>
                    )}
                  </div>
                </motion.div>
              )
            }

            // ─── RENDU GRILLE ACTUELLE ───
            // Mode forge : garder CompetenceCard existante
            if (mode === 'forge') {
              return (
                <motion.div 
                  layout
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }}
                  key={comp.id} 
                  className="relative group hover:shadow-[0_0_30px_rgba(var(--color-main-rgb),0.15)] transition-shadow duration-500"
                >
                <CompetenceCard
                    competence={comp}
                    stats={allStats}
                    isAdmin={true}
                    onClick={setDetail}
                    onEdit={(c) => { forge.chargerPourEdition(c); setVue('creer') }}
                    onDelete={forge.supprimer}
                  />
                </motion.div>
              )
            }

            // Mode utiliser (joueur) : CompetenceCard avec actions joueur
            if (mode === 'utiliser') {
              return (
                <motion.div 
                  layout
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }}
                  key={comp.id} 
                  className="relative group hover:shadow-[0_0_30px_rgba(var(--color-main-rgb),0.15)] transition-shadow duration-500"
                >
                  <CompetenceCard
                    competence={comp}
                    stats={allStats}
                    isActive={acquise?.is_active}
                    isAdmin={false}
                    onClick={setDetail}
                    onUse={comp.type === 'active' ? usage.utiliserCompetence : undefined}
                    onToggle={comp.type === 'passive_toggle' ? () => usage.toggleCompetence(acquise, rechargerStats, attr.chargerCompetencesAcquises) : undefined}
                  />
                </motion.div>
              )
            }

            // Mode attribuer : nouvelle card unifiée
            return (
              <motion.div
                layout
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }}
                key={comp.id}
                className={`medieval-border bg-card/40 backdrop-blur-md rounded-sm relative overflow-hidden transition-colors duration-300 cursor-pointer ${
                  isSelected
                    ? 'border-theme-main scale-[1.02] shadow-[0_0_20px_rgba(var(--color-main-rgb),0.2)]'
                    : isPossede && ongletAttr === 'liste'
                      ? 'border-theme-main/20 hover:border-theme-main/40'
                      : 'border-white/5 hover:border-theme-main/30'
                }`}
                onClick={() => ongletAttr === 'liste'
                  ? toggleSelectionRetirer(comp.id)
                  : toggleSelectionAjouter(comp.id)
                }
              >
                {/* Checkmark sélection */}
                {isSelected && (
                  <div className={`absolute -top-2 -right-2 text-white p-1.5 rounded-full shadow-lg z-30 animate-in zoom-in-50 ${
                    isSelectedRetirer ? 'bg-red-600' : 'bg-theme-main'
                  }`}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}

                {/* Ligne top dorée */}
                <div className="absolute top-0 left-3.5 right-3.5 h-px bg-gradient-to-r from-transparent via-theme-main/40 to-transparent" />

                {/* CONTENU */}
                <div className="p-5 flex flex-col gap-3">

                  {/* Nom cliquable */}
                  <div className="flex flex-col gap-1">
                    <h3
                      className="font-cinzel font-black uppercase tracking-widest text-lg text-primary hover:text-theme-main transition-colors"
                      onClick={(e) => { e.stopPropagation(); setDetail(comp) }}
                    >
                      {comp.nom}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-black/40 border border-theme/10">
                        {comp.type === 'active'
                          ? <><Zap size={10} className="text-theme-main" /><span className="text-[8px] font-cinzel text-theme-main uppercase tracking-widest font-bold">Actif</span></>
                          : <><CircleDot size={10} className="text-blue-400" /><span className="text-[8px] font-cinzel text-blue-400 uppercase tracking-widest font-bold">Passif</span></>
                        }
                      </div>
                      {comp.tags && comp.tags.map((t: any) => (
                        <span key={t.id} className="text-[8px] font-cinzel opacity-40 uppercase tracking-tighter">#{t.nom}</span>
                      ))}
                      {isPossede && ongletAttr === 'ajouter' && (
                        <span className="text-[8px] font-cinzel font-black uppercase px-2 py-0.5 bg-theme-main/20 text-theme-main border border-theme-main/30">
                          Déjà apprise
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {comp.description && (
                    <p className="text-[11px] font-garamond opacity-60 line-clamp-2 italic leading-relaxed">
                      "{comp.description}"
                    </p>
                  )}

                  {/* Badges effets (max 2) */}
                  <div className="flex flex-wrap gap-1.5">
                    {comp.modificateurs?.slice(0, 2).map((m: any, i: number) => (
                      <span key={`m-${i}`} className="text-[8px] font-cinzel font-black uppercase px-2 py-0.5 border bg-theme-main/10 text-theme-main border-theme-main/20">
                        {formatLabelModif(m, allStats)}
                      </span>
                    ))}
                    {comp.effets_actifs?.slice(0, 2).map((e: any, i: number) => (
                      <span key={`e-${i}`} className="text-[8px] font-cinzel font-black uppercase px-2 py-0.5 border bg-blue-900/20 text-blue-400 border-blue-900/20">
                        {formatLabelEffet(e, allStats)}
                      </span>
                    ))}
                    {((comp.modificateurs?.length || 0) + (comp.effets_actifs?.length || 0) > 2) && (
                      <span className="text-[8px] font-cinzel opacity-30 uppercase px-2 py-0.5 border border-theme/10">
                        +{(comp.modificateurs?.length || 0) + (comp.effets_actifs?.length || 0) - 2} autres
                      </span>
                    )}
                  </div>

                  {/* Statut aura active si possédée */}
                  {isPossede && acquise?.is_active && (
                    <span className="text-[8px] font-cinzel font-black uppercase px-2 py-0.5 bg-theme-main text-white w-fit animate-pulse">
                      AURA ACTIVE
                    </span>
                  )}
                </div>
              </motion.div>
            )
          })}
          </AnimatePresence>
        </div>

        {/* PANNEAU DROIT (VUE CODEX DESKTOP) */}
        {isCodex && (
          <div className="hidden lg:flex flex-col w-[380px] xl:w-[450px] shrink-0 border border-theme/20 bg-card/40 backdrop-blur-md rounded-sm h-full shadow-xl relative overflow-hidden">
             {renderCodexDetail()}
          </div>
        )}
      </div>

      {/* BARRES DE CONFIRMATION */}
      {mode === 'attribuer' && (selectionRetirer.length > 0 || selectionAjouter.length > 0) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4">
          <ConfirmationBar
            label={selectionRetirer.length > 0
              ? `${selectionRetirer.length} compétence(s) à retirer`
              : `${selectionAjouter.length} compétence(s) à enseigner`
            }
            onConfirm={selectionRetirer.length > 0 ? retirerSelection : ajouterSelection}
            onCancel={() => { setSelectionRetirer([]); setSelectionAjouter([]) }}
            confirmText={selectionRetirer.length > 0 ? "Retirer les arcanes" : "Enseigner les arcanes"}
            loading={enRetrait || enAjout}
          />
        </div>
      )}

      {/* DETAIL MODAL */}
      <div className={isCodex ? 'block lg:hidden' : 'block'}>
        {detail && (
          <CompetenceDetailModal 
            competence={detail} 
            stats={allStats} 
            isAdmin={mode === 'forge'} 
            isActive={attr.competencesAcquises.find(ca => ca.id_competence === detail.id)?.is_active}
            onClose={() => setDetail(null)} 
            onEdit={(c) => { forge.chargerPourEdition(c); setVue('creer'); setDetail(null); }} 
            onUse={mode === 'utiliser' ? usage.utiliserCompetence : undefined}
            onToggle={mode === 'utiliser' ? () => usage.toggleCompetence(attr.competencesAcquises.find(ca => ca.id_competence === detail.id), rechargerStats, attr.chargerCompetencesAcquises) : undefined}
          />
        )}
      </div>

      {/* TOASTS D'USAGE */}
      <div className="fixed bottom-10 right-10 flex flex-col gap-3 z-50 pointer-events-none">
        {usage.toasts.map((t: any) => (
          <div key={t.id} className="px-8 py-4 rounded-sm bg-card/90 backdrop-blur-md border-l-4 border-theme-main text-primary font-cinzel font-black shadow-2xl animate-in slide-in-from-right-full duration-500 flex items-center gap-4">
            <BookOpen size={20} className="text-theme-main" />
            <span className="tracking-widest uppercase text-sm">{t.msg}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
