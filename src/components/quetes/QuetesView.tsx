import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Personnage, Quete } from '../../types'
import { useStore } from '../../store/useStore'
import { useQueteForge } from '../../hooks/useQueteForge'
import { useQuetePersonnage } from '../../hooks/useQuetePersonnage'
import { useQuetes } from '../../hooks/useQuetes'
import { queteService } from '../../services/queteService'

import QueteForgeForm from './QueteForgeForm'
import { QueteDetailModal } from '../ui/modal'
import { QueteCard } from '../ui/card'
import { Button } from '../ui/Button'
import { ConfirmationBar } from '../ui/ConfirmationBar'
import { PenTool, Search, CheckCircle2, XCircle, Scroll, Trash2 } from 'lucide-react'

interface Props {
  mode: 'forge' | 'joueur' | 'attribuer'
  personnage?: Personnage | null
}

export default function QuetesView({ mode, personnage = null }: Props) {
  const forge = useQueteForge()
  const perso = useQuetePersonnage(personnage)
  const globalQuetes = useQuetes()

  const [vue, setVue] = useState<'liste' | 'form'>('liste')
  const [detail, setDetail] = useState<Quete | null>(null)
  const [recherche, setRecherche] = useState('')
  const [filtreStatut, setFiltreStatut] = useState('Tous')
  const [ongletAttr, setOngletAttr] = useState<'liste' | 'ajouter'>('liste')
  const [ongletJoueur, setOngletJoueur] = useState<'actuel' | 'chroniques'>('actuel')
  const [ongletForge, setOngletForge] = useState<'encours' | 'terminees' | 'echouees'>('encours')
  const [selectionRetirer, setSelectionRetirer] = useState<string[]>([])
  const [selectionAjouter, setSelectionAjouter] = useState<string[]>([])
  const [enRetrait, setEnRetrait] = useState(false)
  const [enAjout, setEnAjout] = useState(false)

  const { itemDisplayMode } = useStore()
  const isCodex = itemDisplayMode === 'codex'

  const handleSave = async () => {
    const ok = await forge.sauvegarder()
    if (ok) setVue('liste')
    return ok
  }

  const handleReouvrirQuete = async (id: string) => {
    const success = await queteService.modifierStatut(id, 'En cours')
    if (success) {
      if (mode === 'joueur') {
        perso.chargerQuetes?.()
      } else {
        globalQuetes.charger()
      }
      setDetail(null)
    }
  }

  const toggleSelectionRetirer = (id: string) => {
    setSelectionRetirer(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const toggleSelectionAjouter = (id: string) => {
    setSelectionAjouter(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const retirerSelection = async () => {
    if (!personnage || selectionRetirer.length === 0) return
    setEnRetrait(true)
    try {
      for (const idQuete of selectionRetirer) {
        await queteService.desassignerQuete(personnage.id, idQuete)
      }
      setSelectionRetirer([])
      perso.chargerQuetes?.()
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
      for (const idQuete of selectionAjouter) {
        await queteService.assignerQuete(personnage.id, idQuete)
      }
      setSelectionAjouter([])
      setOngletAttr('liste')
      perso.chargerQuetes?.()
    } catch (e) {
      console.error(e)
    } finally {
      setEnAjout(false)
    }
  }

  const idsAssignees = new Set(
    perso.toutesQuetes.map((q: any) => q.id)
  )

  const listSource = mode === 'forge'
    ? globalQuetes.quetes.filter(q => {
        if (ongletForge === 'encours') return q.statut === 'En cours'
        if (ongletForge === 'terminees') return q.statut === 'Terminée'
        if (ongletForge === 'echouees') return q.statut === 'Échouée'
        return true
      })
    : mode === 'joueur'
      ? perso.toutesQuetes
      : globalQuetes.quetes // mode attribuer : toujours toute la lib

  const filteredRaw = listSource.filter((q: any) => {
    if (mode === 'attribuer' && ongletAttr === 'liste') {
      if (!idsAssignees.has(q.id)) return false
    }
    if (mode === 'attribuer' && ongletAttr === 'ajouter') {
      if (idsAssignees.has(q.id)) return false
    }
    if (mode === 'joueur') {
      const isFinished = q.statut === 'Terminée' || q.statut === 'Échouée'
      if (ongletJoueur === 'actuel' && isFinished) return false
      if (ongletJoueur === 'chroniques' && !isFinished) return false
      if (filtreStatut === 'Suivie' && !(q as any).suivie) return false
      if (filtreStatut !== 'Tous' && filtreStatut !== 'Suivie' && q.statut !== filtreStatut) return false
    }
    if (mode !== 'joueur' && filtreStatut !== 'Tous' && q.statut !== filtreStatut) return false
    return (q.titre || '').toLowerCase().includes(recherche.toLowerCase())
  })

  const filtered = mode === 'attribuer'
    ? [...filteredRaw].sort((a: any, b: any) => {
        const selA = selectionRetirer.includes(a.id) || selectionAjouter.includes(a.id) ? 1 : 0
        const selB = selectionRetirer.includes(b.id) || selectionAjouter.includes(b.id) ? 1 : 0
        return selB - selA
      })
    : filteredRaw

  const filterOptions = mode === 'joueur' 
    ? (ongletJoueur === 'actuel' ? ['Tous', 'Suivie', 'En cours'] : ['Tous', 'Terminée', 'Échouée'])
    : ['Tous', 'En cours', 'Terminée', 'Échouée'];

  if (mode === 'forge' && vue === 'form') {
    return <QueteForgeForm {...forge} onSave={handleSave} onCancel={() => { forge.reset(); setVue('liste') }} />
  }

  const renderCodexDetail = () => {
    if (!detail) return (
      <div className="flex flex-col items-center justify-center h-full opacity-20">
        <Scroll size={64} className="mb-4 text-theme-main" />
        <span className="font-cinzel tracking-widest uppercase text-primary">Sélectionnez un récit</span>
      </div>
    )

    const q = detail;

    return (
      <div className="flex flex-col gap-6 animate-in slide-in-from-right-4 duration-300 h-full p-6">
        <div className="flex gap-4 items-start">
          <div className="flex-1 flex flex-col gap-2">
            <h3 className="text-2xl font-cinzel font-black uppercase tracking-widest text-primary">
              {q.titre}
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-cinzel text-[9px] tracking-[0.2em] px-2 py-0.5 uppercase bg-black/40 border border-theme/10 rounded-sm flex items-center gap-1">
                {q.statut === 'Terminée' ? <CheckCircle2 size={10} className="text-green-500" /> : q.statut === 'Échouée' ? <XCircle size={10} className="text-red-700" /> : <Scroll size={10} className="text-theme-main" />}
                <span className={q.statut === 'Terminée' ? 'text-green-500' : q.statut === 'Échouée' ? 'text-red-700' : 'text-theme-main'}>{q.statut}</span>
              </div>
            </div>
          </div>

          {q.image_url && (
            <div className="w-16 h-16 shrink-0 rounded-sm overflow-hidden border border-theme-main/30 bg-black/40 shadow-xl">
              <img 
                src={q.image_url} 
                alt={q.titre} 
                className="w-full h-full object-cover" 
              />
            </div>
          )}
        </div>

        <div className="h-px w-full bg-gradient-to-r from-transparent via-theme-main/20 to-transparent shrink-0" />

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-6">
          <div className="bg-black/20 p-4 rounded-sm border-l-2 border-theme-main/40">
            <p className="font-garamond text-base italic text-secondary leading-relaxed">
              "{q.description || 'Les parchemins sont vierges...'}"
            </p>
          </div>

          {(q.quete_recompenses?.length || 0) > 0 && (
            <div className="flex flex-col gap-2 mt-4">
              <h4 className="font-cinzel text-[10px] uppercase tracking-[0.2em] text-theme-main opacity-60">
                Récompenses
              </h4>
              <div className="flex flex-wrap gap-2">
                {q.quete_recompenses?.map((r: any, i: number) => (
                  <span key={i} className="text-[9px] font-cinzel uppercase px-2 py-1 border bg-theme-main/5 text-theme-main/80 border-theme-main/20 rounded-sm flex items-center gap-1">
                    🏆 {r.type === 'Item' ? (r.items?.nom || 'Objet') : r.description}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 mt-auto pt-4 border-t border-theme/10 shrink-0">
          {mode === 'forge' ? (
            <>
              <div className="flex items-center gap-2 w-full">
                <Button variant="secondary" onClick={() => { forge.chargerPourEdition(q); setVue('form'); setDetail(null); }} className="flex-1 gap-2">
                  <PenTool size={14} /> Modifier le Récit
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { forge.supprimer(q.id); setDetail(null); }}
                  className="px-3 border-red-500/20 text-red-500 hover:bg-red-500/10 hover:border-red-500 hover:text-red-400"
                  title="Supprimer"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
              {q.statut !== 'En cours' && (
                <Button variant="outline" onClick={() => handleReouvrirQuete(q.id)} className="w-full py-3 uppercase text-xs tracking-widest text-primary/60 hover:text-theme-main border-theme/20 hover:border-theme-main/40">
                  Rouvrir la quête
                </Button>
              )}
            </>
          ) : (
            mode === 'joueur' && (
              <>
                <Button variant={(q as any).suivie ? 'secondary' : 'primary'} onClick={() => perso.toggleSuivre(q as any)} className="w-full py-3 uppercase text-xs tracking-widest">
                  {(q as any).suivie ? 'Ne plus suivre le récit' : 'Suivre ce récit'}
                </Button>
                {q.statut !== 'En cours' && (
                  <Button variant="outline" onClick={() => handleReouvrirQuete(q.id)} className="w-full mt-2 py-2 uppercase text-[10px] tracking-widest text-primary/40 hover:text-theme-main border-theme/10 hover:border-theme-main/40">
                    Rouvrir la quête
                  </Button>
                )}
              </>
            )
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`relative flex flex-col ${isCodex ? 'h-[calc(100vh-10rem)]' : ''}`}>
      {/* BARRE D'OUTILS */}
      <div className="flex flex-col gap-0 border-b border-theme/10 mb-6 mt-4 shrink-0">
        {/* Ligne 1 : Onglets principaux + Recherche */}
        <div className="flex items-center gap-6 pb-3 flex-wrap">

          {/* Onglets mode joueur */}
          {mode === 'joueur' && [
            { id: 'actuel', label: 'Destin Actuel' },
            { id: 'chroniques', label: 'Chroniques' }
          ].map(tab => (
            <button key={tab.id}
              onClick={() => { setOngletJoueur(tab.id as any); setFiltreStatut('Tous'); }}
              className={`font-cinzel text-[11px] uppercase tracking-[0.3em] transition-all relative py-1 ${ongletJoueur === tab.id ? 'text-theme-main' : 'text-primary opacity-30 hover:opacity-70'}`}>
              {tab.label}
              {ongletJoueur === tab.id && <div className="absolute bottom-0 left-0 w-full h-px bg-theme-main shadow-[0_0_8px_var(--color-main)]" />}
            </button>
          ))}

          {/* Onglets mode forge */}
          {mode === 'forge' && [
            { id: 'encours', label: 'En Cours' },
            { id: 'terminees', label: 'Chroniques' },
            { id: 'echouees', label: 'Échouées' }
          ].map(tab => (
            <button key={tab.id}
              onClick={() => { setOngletForge(tab.id as any); setFiltreStatut('Tous'); }}
              className={`font-cinzel text-[11px] uppercase tracking-[0.3em] transition-all relative py-1 ${ongletForge === tab.id ? 'text-theme-main' : 'text-primary opacity-30 hover:opacity-70'}`}>
              {tab.label}
              {ongletForge === tab.id && <div className="absolute bottom-0 left-0 w-full h-px bg-theme-main shadow-[0_0_8px_var(--color-main)]" />}
            </button>
          ))}

          {/* Onglets mode attribuer : Possédées / Bibliothèque */}
          {mode === 'attribuer' && (
            <>
              {(['liste', 'ajouter'] as const).map(o => (
                <button key={o} onClick={() => setOngletAttr(o)}
                  className={`font-cinzel text-[11px] uppercase tracking-[0.3em] transition-all relative py-1 ${ongletAttr === o ? 'text-theme-main' : 'text-primary opacity-30 hover:opacity-70'}`}>
                  {o === 'liste' ? 'Assignées' : 'Bibliothèque'}
                  {ongletAttr === o && <div className="absolute bottom-0 left-0 w-full h-px bg-theme-main shadow-[0_0_8px_var(--color-main)]" />}
                </button>
              ))}
            </>
          )}

          {/* Bouton forge */}
          {mode === 'forge' && (
            <Button onClick={() => setVue('form')} className="ml-auto font-cinzel gap-2 group border-theme-main/30 hover:border-theme-main/60 transition-all text-[10px] uppercase py-2 px-6">
              <PenTool size={14} className="group-hover:rotate-12 transition-transform" />
              Inscrire un nouveau récit
            </Button>
          )}

          {/* Recherche */}
          <div className={`relative w-40 group ${mode !== 'forge' ? 'ml-auto' : ''}`}>
            <Search size={13} className="absolute left-0 top-1/2 -translate-y-1/2 text-theme-main opacity-40 group-focus-within:opacity-100 transition-opacity" />
            <input type="text" placeholder="Rechercher..." value={recherche} onChange={e => setRecherche(e.target.value)}
              className="w-full pl-5 pr-2 py-1.5 bg-transparent border-b border-theme/10 font-garamond italic text-primary focus:border-theme-main/50 outline-none transition-all placeholder:opacity-20 text-sm" />
          </div>
        </div>

        {/* Ligne 2 : Filtres statut (sauf mode attribuer) */}
        {mode !== 'attribuer' && (
          <div className="flex gap-4 pb-3 overflow-x-auto no-scrollbar">
            {filterOptions.map(s => (
              <button key={s} onClick={() => setFiltreStatut(s)}
                className={`font-cinzel text-[10px] uppercase tracking-[0.25em] transition-all relative py-1 whitespace-nowrap ${filtreStatut === s ? 'text-theme-main' : 'text-primary opacity-30 hover:opacity-70'}`}>
                {s}
                {filtreStatut === s && <div className="absolute bottom-0 left-0 w-full h-px bg-theme-main shadow-[0_0_8px_var(--color-main)]" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* AFFICHAGE DES RÉCITS */}
      <div className={`flex-1 min-h-0 ${isCodex ? 'flex flex-col lg:flex-row gap-6 items-start h-full' : 'pb-24 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'}`}>
        
        {/* LISTE OU GRILLE */}
        <div className={isCodex ? 'flex-1 flex flex-col gap-2 w-full h-full overflow-y-auto custom-scrollbar lg:pr-2' : 'contents'}>
          <AnimatePresence mode="popLayout">
            {filtered.map((q: any) => {
              const isAssignee = idsAssignees.has(q.id)
              const isSelRetirer = selectionRetirer.includes(q.id)
              const isSelAjouter = selectionAjouter.includes(q.id)
              const isSelected = isSelRetirer || isSelAjouter

              // ─── RENDU LIGNE CODEX ───
              if (isCodex) {
                const isActive = detail?.id === q.id;
                return (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}
                    key={q.id} 
                    onClick={() => {
                      if (mode === 'attribuer') {
                        if (ongletAttr === 'liste') toggleSelectionRetirer(q.id);
                        else toggleSelectionAjouter(q.id);
                      }
                      setDetail(q);
                    }}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-sm cursor-pointer transition-all ${
                      isActive ? 'bg-theme-main/10 border-theme-main shadow-[0_0_15px_rgba(var(--color-main-rgb),0.2)]' : 
                      isSelected ? 'border-theme-main/50 bg-theme-main/5 scale-[1.01]' :
                      'bg-card/40 border-theme/20 hover:border-theme-main/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 shrink-0 rounded-sm bg-black/40 flex items-center justify-center border shadow-inner overflow-hidden ${q.statut === 'Terminée' ? 'text-green-500 border-green-500/20' : q.statut === 'Échouée' ? 'text-red-700 border-red-700/20' : 'text-theme-main border-theme/10'}`}>
                         {q.image_url ? (
                           <img src={q.image_url} alt="" className="w-full h-full object-cover" />
                         ) : (
                           q.statut === 'Terminée' ? <CheckCircle2 size={18} /> : q.statut === 'Échouée' ? <XCircle size={18} /> : <Scroll size={18} />
                         )}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className={`font-cinzel font-bold text-sm uppercase tracking-widest ${q.statut !== 'En cours' ? 'text-primary/50 line-through' : 'text-primary'}`}>{q.titre}</span>
                          {(q as any).suivie && <span className="w-2 h-2 rounded-full bg-theme-main animate-pulse shadow-[0_0_8px_var(--color-main)]" title="Suivie" />}
                        </div>
                        <span className={`font-garamond italic text-[11px] ${q.statut === 'Terminée' ? 'text-green-500/70' : q.statut === 'Échouée' ? 'text-red-700/70' : 'text-theme-main/60'}`}>{q.statut}</span>
                      </div>
                    </div>
                  </motion.div>
                )
              }

              // ─── RENDU GRILLE ACTUELLE ───
              // Mode forge ou joueur : QueteCard normale
              if (mode !== 'attribuer') {
                return (
                    <QueteCard
                    key={q.id}
                    quete={q}
                    onClick={setDetail}
                    onEdit={mode === 'forge' ? (q) => { forge.chargerPourEdition(q); setVue('form') } : undefined}
                    onDelete={mode === 'forge' ? (id) => forge.supprimer(id) : undefined}
                    onSuivre={mode === 'joueur' ? (q) => perso.toggleSuivre(q as any) : undefined}
                    isSuivie={(q as any).suivie}
                    onReouvrir={handleReouvrirQuete}
                  />
                )
              }

              // Mode attribuer : card unifiée
              return (
                <div
                  key={q.id}
                  className={`medieval-border bg-card/40 backdrop-blur-md rounded-sm relative overflow-hidden transition-all duration-300 cursor-pointer ${
                    isSelected
                      ? 'border-theme-main scale-[1.02] shadow-[0_0_20px_rgba(var(--color-main-rgb),0.2)]'
                      : isAssignee && ongletAttr === 'liste'
                        ? 'border-theme-main/20 hover:border-theme-main/40'
                        : 'border-white/5 hover:border-theme-main/30'
                  }`}
                  onClick={() => ongletAttr === 'liste'
                    ? toggleSelectionRetirer(q.id)
                    : toggleSelectionAjouter(q.id)
                  }
                >
                  {/* Checkmark */}
                  {isSelected && (
                    <div className={`absolute -top-2 -right-2 text-white p-1.5 rounded-full shadow-lg z-30 animate-in zoom-in-50 ${
                      isSelRetirer ? 'bg-red-600' : 'bg-theme-main'
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
                    {/* Statut */}
                    <div className="flex items-center gap-2">
                      {q.statut === 'Terminée'
                        ? <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                        : q.statut === 'Échouée'
                          ? <XCircle size={14} className="text-red-700 shrink-0" />
                          : <Scroll size={14} className="text-theme-main shrink-0" />
                      }
                      <span className={`text-[9px] font-cinzel font-black uppercase tracking-widest ${
                        q.statut === 'Terminée' ? 'text-green-500/70' :
                        q.statut === 'Échouée' ? 'text-red-700/70' :
                        'text-theme-main/70'
                      }`}>{q.statut}</span>
                    </div>

                    {/* Titre cliquable */}
                    <h3
                      className={`font-cinzel font-black text-lg uppercase tracking-widest leading-tight hover:text-theme-main transition-colors ${
                        q.statut === 'Terminée' ? 'line-through opacity-50' : 'text-primary'
                      }`}
                      onClick={(e) => { e.stopPropagation(); setDetail(q) }}
                    >
                      {q.titre}
                    </h3>

                    {/* Description */}
                    <p className="font-garamond italic text-secondary text-sm line-clamp-2 leading-relaxed opacity-70">
                      "{q.description || 'Les parchemins sont vierges...'}"
                    </p>

                    {/* Récompenses */}
                    {(q.quete_recompenses?.length || 0) > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {q.quete_recompenses?.slice(0, 2).map((r: any, i: number) => (
                          <span key={i} className="text-[8px] font-cinzel uppercase px-2 py-0.5 border bg-theme-main/5 text-theme-main/60 border-theme-main/10">
                            🏆 {r.type === 'Item' ? (r.items?.nom || 'Objet') : r.description}
                          </span>
                        ))}
                        {(q.quete_recompenses?.length || 0) > 2 && (
                          <span className="text-[8px] font-cinzel opacity-30 uppercase px-2 py-0.5 border border-theme/10">
                            +{q.quete_recompenses!.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
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

      {/* BARRE DE CONFIRMATION */}
      {mode === 'attribuer' && (selectionRetirer.length > 0 || selectionAjouter.length > 0) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4">
          <ConfirmationBar
            label={selectionRetirer.length > 0
              ? `${selectionRetirer.length} récit(s) à retirer`
              : `${selectionAjouter.length} récit(s) à inscrire`
            }
            onConfirm={selectionRetirer.length > 0 ? retirerSelection : ajouterSelection}
            onCancel={() => { setSelectionRetirer([]); setSelectionAjouter([]) }}
            confirmText={selectionRetirer.length > 0 ? "Retirer les récits" : "Inscrire les récits"}
            loading={enRetrait || enAjout}
          />
        </div>
      )}

      {/* DETAIL MODAL (Mobile uniquement en mode Codex, ou partout en mode Grille) */}
      <div className={isCodex ? 'block lg:hidden' : 'block'}>
        <QueteDetailModal 
          quete={detail} 
          mode={mode === 'forge' ? 'forge' : 'joueur'} 
          onClose={() => setDetail(null)}
          onTerminer={(id) => { forge.modifierStatut(id, 'Terminée'); setDetail(null); }}
          onEchouer={(id) => { forge.modifierStatut(id, 'Échouée'); setDetail(null); }}
          onReouvrir={handleReouvrirQuete}
          onSuivre={(q) => perso.toggleSuivre(q)}
          onEditer={(q) => { forge.chargerPourEdition(q); setVue('form'); setDetail(null); }}
        />
      </div>
    </div>
  )
}
