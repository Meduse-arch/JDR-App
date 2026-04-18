import { useState } from 'react'
import { Personnage, Competence } from '../../types'
import { useCompetenceForge } from '../../hooks/useCompetenceForge'
import { useCompetenceAttribution } from '../../hooks/useCompetenceAttribution'
import { useCompetenceUsage } from '../../hooks/useCompetenceUsage'
import { useCompetences } from '../../hooks/useCompetences'
import { usePersonnage } from '../../hooks/usePersonnage'
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
import { Search, Wand2, BookOpen, Zap, CircleDot } from 'lucide-react'

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

  return (
    <div className="relative flex flex-col gap-8">
      {/* BARRE D'OUTILS */}
      <div className="flex flex-col gap-0 border-b border-theme/10 mb-6 mt-4">
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

      {/* GRILLE DES ARCANES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-24">
        {filtered.map((rawItem: any) => {
          const comp = rawItem.competence || rawItem
          const acquise = attr.competencesAcquises.find(
            (ca: any) => (ca.id_competence || ca.id) === comp.id
          )
          const isPossede = idsAcquises.has(comp.id)
          const isSelectedRetirer = selectionRetirer.includes(comp.id)
          const isSelectedAjouter = selectionAjouter.includes(comp.id)
          const isSelected = isSelectedRetirer || isSelectedAjouter

          // Mode forge : garder CompetenceCard existante
          if (mode === 'forge') {
            return (
              <div key={comp.id} className="relative group hover:shadow-[0_0_30px_rgba(var(--color-main-rgb),0.15)] transition-all duration-500">
              <CompetenceCard
                  competence={comp}
                  stats={allStats}
                  isAdmin={true}
                  onClick={setDetail}
                  onEdit={(c) => { forge.chargerPourEdition(c); setVue('creer') }}
                  onDelete={forge.supprimer}
                />
              </div>
            )
          }

          // Mode utiliser (joueur) : CompetenceCard avec actions joueur
          if (mode === 'utiliser') {
            return (
              <div key={comp.id} className="relative group hover:shadow-[0_0_30px_rgba(var(--color-main-rgb),0.15)] transition-all duration-500">
                <CompetenceCard
                  competence={comp}
                  stats={allStats}
                  isActive={acquise?.is_active}
                  isAdmin={false}
                  onClick={setDetail}
                  onUse={comp.type === 'active' ? usage.utiliserCompetence : undefined}
                  onToggle={comp.type === 'passive_toggle' ? () => usage.toggleCompetence(acquise, rechargerStats, attr.chargerCompetencesAcquises) : undefined}
                />
              </div>
            )
          }

          // Mode attribuer : nouvelle card unifiée
          return (
            <div
              key={comp.id}
              className={`medieval-border bg-card/40 backdrop-blur-md rounded-sm relative overflow-hidden transition-all duration-300 cursor-pointer ${
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
            </div>
          )
        })}
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
