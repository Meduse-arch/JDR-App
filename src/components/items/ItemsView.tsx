import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Personnage, Item, InventaireEntry } from '../../types'
import { useStore } from '../../store/useStore'
import { useItems } from '../../hooks/useItems'
import { useItemInventaire } from '../../hooks/useItemInventaire'
import { useItemUsage } from '../../hooks/useItemUsage'
import { useItemForge } from '../../hooks/useItemForge'
import { usePersonnage } from '../../hooks/usePersonnage'
import { useStats as useGlobalStats } from '../../hooks/useStats'
import { CATEGORIES } from '../../utils/constants'
import { formatLabelModif, formatLabelEffet } from '../../utils/formatters'
import { inventaireService } from '../../services/inventaireService'

import ItemForgeForm from './ItemForgeForm'
import { ItemCard } from '../ui/card'
import { ItemDetailModal } from '../ui/modal'
import { Button } from '../ui/Button'
import { ConfirmationBar } from '../ui/ConfirmationBar'
import { Search, PenTool, Sword, Shield, Gem, FlaskConical, Sparkles, Package, Trash2 } from 'lucide-react'

interface Props {
  mode: 'forge' | 'gerer' | 'joueur'
  personnage?: Personnage | null
}

export default function ItemsView({ mode, personnage = null }: Props) {
  const { personnage: personnageActif, mettreAJourLocalement, rechargerPersonnage } = usePersonnage()
  const { stats: statsCalculees, rechargerStats } = useGlobalStats()
  const { items: libItems, stats: allStats, charger: reloadLib } = useItems()
  
  // Logic Hooks
  const forge = useItemForge()
  const gerer = useItemInventaire(personnage ?? personnageActif)
  
  const usage = useItemUsage(personnage ?? personnageActif, mettreAJourLocalement, async (id, q) => {
     await inventaireService.retirerItem(id, q)
     await gerer.inventaire // Note: useItemInventaire might need a charger exposed if we want to bypass RT
     // In practice, useRealtimeQuery inside useInventaire (via useItemInventaire) handles reloads, 
     // but we can call gerer's internal charger if needed.
     await rechargerPersonnage()
     await rechargerStats()
  }, statsCalculees)

  // Local UI State
  const [vue, setVue] = useState<'liste' | 'creer'>('liste')
  const [ongletGerer, setOngletGerer] = useState<'inventaire' | 'ajouter'>('inventaire')
  const [filtreCat, setFiltreCat] = useState('Tous')
  const [recherche, setRecherche] = useState('')
  const [detail, setDetail] = useState<Item | InventaireEntry | null>(null)

  const [deltas, setDeltas] = useState<Record<string, number>>({})
  const [inputDeltaValues, setInputDeltaValues] = useState<Record<string, string>>({})
  const [enSauvegarde, setEnSauvegarde] = useState(false)
  const [selectionBib, setSelectionBib] = useState<string[]>([])
  const [selectionPoss, setSelectionPoss] = useState<string[]>([])
  const [enAjout, setEnAjout] = useState(false)
  const hasChanges = Object.values(deltas).some(d => d !== 0)

  const { itemDisplayMode } = useStore()
  const isCodex = itemDisplayMode === 'codex'

  const toggleSelectionPoss = (entryId: string) => {
    setSelectionPoss(prev =>
      prev.includes(entryId)
        ? prev.filter(i => i !== entryId)
        : [...prev, entryId]
    )
  }

  const toggleSelectionBib = (itemId: string) => {
    setSelectionBib(prev =>
      prev.includes(itemId)
        ? prev.filter(i => i !== itemId)
        : [...prev, itemId]
    )
  }

  const appliquerChangements = async () => {
    setEnSauvegarde(true)
    try {
      for (const [entryId, delta] of Object.entries(deltas)) {
        if (delta === 0) continue
        const entry = gerer.inventaire.find((e: any) => e.id === entryId)
        if (!entry) continue
        if (delta > 0) {
          await inventaireService.ajouterItem(personnage!.id, entry.items.id, delta)
        } else {
          await inventaireService.retirerItem(entryId, Math.abs(delta))
        }
      }
      setDeltas({})
      setInputDeltaValues({})
      setSelectionPoss([])
      // gerer.inventaire will be updated by RT
    } catch (e) {
      console.error(e)
    } finally {
      setEnSauvegarde(false)
    }
  }

  const ajouterSelectionBib = async () => {
    if (!personnage || selectionBib.length === 0) return
    setEnAjout(true)
    try {
      for (const itemId of selectionBib) {
        const qte = Math.abs(deltas[itemId] || 1)
        await inventaireService.ajouterItem(personnage.id, itemId, qte)
      }
      setSelectionBib([])
      setDeltas({})
      setInputDeltaValues({})
      setOngletGerer('inventaire')
    } catch (e) {
      console.error(e)
    } finally {
      setEnAjout(false)
    }
  }

  const getIconCategorie = (cat: string) => {
    switch (cat) {
      case 'Arme': return <Sword size={10} />
      case 'Armure': return <Shield size={10} />
      case 'Bijou': return <Gem size={10} />
      case 'Consommable': return <FlaskConical size={10} />
      case 'Artéfact': return <Sparkles size={10} />
      default: return <Package size={10} />
    }
  }

  // Handlers
  const handleSave = async () => {
    const ok = await forge.sauvegarder()
    if (ok) {
      setVue('liste')
      reloadLib()
    }
    return ok
  }

  const handleEquiper = async (entry: InventaireEntry) => {
    // Mise à jour optimiste du detail pour un retour immédiat
    if (detail && (detail as any).id === entry.id) {
      setDetail({ ...entry, equipe: !entry.equipe });
    }
    
    await gerer.toggleEquipement(entry)
    await rechargerStats()
  }

  // En mode gerer, on affiche toujours TOUS les items de la lib
  // "Possédées" est juste un filtre sur ceux dans l'inventaire
  const idsInventaire = new Set(
    gerer.inventaire.map((e: any) => e.items?.id || e.id)
  )

  // Trouver l'entrée d'inventaire pour un item (pour avoir quantite, id entry, equipe)
  const getEntryForItem = (itemId: string) =>
    gerer.inventaire.find((e: any) => (e.items?.id || e.id) === itemId)

  const listSource = mode === 'forge'
    ? libItems
    : mode === 'gerer'
      ? libItems
      : gerer.inventaire

  const filteredRaw = listSource.filter((i: any) => {
    const item = i.items || i
    if (mode === 'gerer' && ongletGerer === 'inventaire') {
      if (!idsInventaire.has(item.id)) return false
    }
    return (filtreCat === 'Tous' || item.categorie === filtreCat) &&
           (item.nom || '').toLowerCase().includes(recherche.toLowerCase())
  })

  const filtered = mode === 'gerer'
    ? [...filteredRaw].sort((a: any, b: any) => {
        const ia = a.items || a
        const ib = b.items || b
        const entryA = getEntryForItem(ia.id)
        const entryB = getEntryForItem(ib.id)
        const selA = (selectionBib.includes(ia.id) || selectionPoss.includes(entryA?.id || '')) ? 1 : 0
        const selB = (selectionBib.includes(ib.id) || selectionPoss.includes(entryB?.id || '')) ? 1 : 0
        return selB - selA
      })
    : filteredRaw

  if (mode === 'forge' && vue === 'creer') {
    return <ItemForgeForm {...forge} stats={forge.stats} onSave={handleSave} onCancel={() => { forge.reset(); setVue('liste') }} />
  }

  const renderCodexDetail = () => {
    if (!detail) return (
      <div className="flex flex-col items-center justify-center h-full opacity-20">
        <Package size={64} className="mb-4 text-theme-main" />
        <span className="font-cinzel tracking-widest uppercase text-primary">Sélectionnez une relique</span>
      </div>
    )

    const isEntry = (detail as any).items !== undefined;
    const actualItem = isEntry ? (detail as InventaireEntry).items : (detail as Item)
    const entry = isEntry ? (detail as InventaireEntry) : null

    const hasMechanics = (actualItem.modificateurs?.length || 0) > 0 || (actualItem.effets_actifs?.length || 0) > 0

    return (
      <div className="flex flex-col gap-6 animate-in slide-in-from-right-4 duration-300 h-full p-6">
        <div className="flex gap-4 items-start shrink-0">
          <div className="flex-1 flex flex-col gap-2">
            <h3 className="text-2xl font-cinzel font-black uppercase tracking-widest text-primary">
              {actualItem.nom}
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-cinzel text-[9px] tracking-[0.2em] px-2 py-0.5 uppercase bg-theme-main/20 text-theme-main rounded-sm flex items-center gap-1">
                {getIconCategorie(actualItem.categorie)} {actualItem.categorie}
              </div>
              
              {actualItem.tags && actualItem.tags.length > 0 && (
                <div className="flex gap-1">
                  {actualItem.tags.map((t: any) => (
                    <span key={t.id} className="text-[8px] font-cinzel opacity-40 uppercase tracking-widest">
                      #{t.nom}
                    </span>
                  ))}
                </div>
              )}

              {entry && entry.quantite > 1 && (
                <div className="font-cinzel text-[10px] px-2 py-0.5 bg-white/5 text-theme-main/50 rounded-sm">
                  ×{entry.quantite}
                </div>
              )}
            </div>
          </div>

          {actualItem.image_url && (
            <div className="w-16 h-16 shrink-0 rounded-sm overflow-hidden border border-theme-main/30 bg-black/40 shadow-xl">
              <img 
                src={actualItem.image_url} 
                alt={actualItem.nom} 
                className="w-full h-full object-cover" 
              />
            </div>
          )}
        </div>

        <div className="h-px w-full bg-gradient-to-r from-transparent via-theme-main/20 to-transparent shrink-0" />

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-6 min-h-0">
          {actualItem.description && (
            <div className="bg-black/20 p-4 rounded-sm border-l-2 border-theme-main/40">
              <p className="font-garamond text-base italic text-secondary leading-relaxed">
                "{actualItem.description}"
              </p>
            </div>
          )}

          {hasMechanics && (
            <div className="flex flex-col gap-2">
              <h4 className="font-cinzel text-[10px] uppercase tracking-[0.2em] text-theme-main opacity-60">
                Mécaniques
              </h4>
              <div className="flex flex-wrap gap-2">
                {actualItem.modificateurs?.map((m: any, i: number) => (
                  <span key={`m-${i}`} className="text-[9px] font-cinzel font-black uppercase px-2 py-1 bg-theme-main/10 text-theme-main border border-theme-main/20 rounded-sm">
                    {formatLabelModif(m, allStats)}
                  </span>
                ))}
                {actualItem.effets_actifs?.map((e: any, i: number) => (
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
              <Button 
                variant="secondary" 
                onClick={() => { forge.chargerPourEdition(actualItem); setVue('creer'); setDetail(null); }} 
                className="flex-1 gap-2"
              >
                <PenTool size={14} /> Modifier dans la Forge
              </Button>
              <Button
                variant="outline"
                onClick={() => { forge.supprimer(actualItem.id).then(reloadLib); setDetail(null); }}
                className="px-3 border-red-500/20 text-red-500 hover:bg-red-500/10 hover:border-red-500 hover:text-red-400"
                title="Supprimer"
              >
                <Trash2 size={16} />
              </Button>
            </div>
          ) : (
            mode === 'joueur' && entry && (
              actualItem.categorie === 'Consommable' ? (
                <Button 
                  variant="primary"
                  className="w-full py-3 uppercase text-xs tracking-widest" 
                  onClick={() => { usage.utiliserItem(entry); }}
                >
                  Utiliser la Relique
                </Button>
              ) : (
                <Button 
                  variant={entry.equipe ? 'secondary' : 'primary'}
                  className="w-full py-3 uppercase text-xs tracking-widest"
                  onClick={() => { handleEquiper(entry); }}
                >
                  {entry.equipe ? 'Déséquiper' : 'S\'équiper'}
                </Button>
              )
            )
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`relative flex flex-col ${isCodex ? 'h-[calc(100vh-10rem)]' : ''}`}>
      {/* BARRE DE RECHERCHE & FILTRES - LIGNE ÉLÉGANTE STYLE CODEX */}
      {mode === 'gerer' ? (
        <div className="flex flex-col gap-0 border-b border-theme/10 mb-6 mt-4 shrink-0">
          {/* Ligne 1 : Onglets + Recherche */}
          <div className="flex items-center gap-6 pb-3">
            {(['inventaire', 'ajouter'] as const).map(o => (
              <button key={o} onClick={() => {
                setOngletGerer(o)
                setSelectionPoss([])
                setDeltas({})
                setInputDeltaValues({})
                setSelectionBib([])
              }}
                className={`font-cinzel text-[11px] uppercase tracking-[0.3em] transition-all relative py-1 ${ongletGerer === o ? 'text-theme-main' : 'text-primary opacity-30 hover:opacity-70'}`}>
                {o === 'inventaire' ? 'Possédées' : 'Bibliothèque'}
                {ongletGerer === o && <div className="absolute bottom-0 left-0 w-full h-px bg-theme-main shadow-[0_0_8px_var(--color-main)]" />}
              </button>
            ))}
            <div className="relative w-40 group ml-auto">
              <Search size={13} className="absolute left-0 top-1/2 -translate-y-1/2 text-theme-main opacity-40 group-focus-within:opacity-100 transition-opacity" />
              <input type="text" placeholder="Rechercher..." value={recherche} onChange={e => setRecherche(e.target.value)}
                className="w-full pl-5 pr-2 py-1.5 bg-transparent border-b border-theme/10 font-garamond italic text-primary focus:border-theme-main/50 outline-none transition-all placeholder:opacity-20 text-sm" />
            </div>
          </div>
          {/* Ligne 2 : Filtres catégories */}
          <div className="flex gap-4 pb-3 overflow-x-auto no-scrollbar">
            {['Tous', ...CATEGORIES].map(cat => (
              <button key={cat} onClick={() => setFiltreCat(cat)}
                className={`font-cinzel text-[10px] uppercase tracking-[0.25em] transition-all relative py-1 whitespace-nowrap ${filtreCat === cat ? 'text-theme-main' : 'text-primary opacity-30 hover:opacity-70'}`}>
                {cat}
                {filtreCat === cat && <div className="absolute bottom-0 left-0 w-full h-px bg-theme-main shadow-[0_0_8px_var(--color-main)]" />}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row justify-between items-center gap-8 border-b border-theme/10 pb-6 mt-4 mb-10 shrink-0">
          <div className="flex flex-col lg:flex-row items-center gap-8 flex-1 w-full">
            {/* Catégories en labels fins */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-2">
              {['Tous', ...CATEGORIES].map(cat => (
                <button
                  key={cat}
                  onClick={() => setFiltreCat(cat)}
                  className={`font-cinzel text-[11px] uppercase tracking-[0.3em] transition-all duration-500 relative py-1 ${
                    filtreCat === cat 
                    ? 'text-theme-main opacity-100' 
                    : 'text-primary opacity-30 hover:opacity-70'
                  }`}
                >
                  {cat}
                  {filtreCat === cat && (
                    <div className="absolute bottom-0 left-0 w-full h-[1px] bg-theme-main shadow-[0_0_8px_var(--color-main)]" />
                  )}
                </button>
              ))}
            </div>

            {/* Recherche Minimaliste */}
            <div className="relative w-full lg:w-64 group lg:ml-auto">
              <Search size={16} className="absolute left-0 top-1/2 -translate-y-1/2 text-theme-main opacity-40 group-focus-within:opacity-100 transition-opacity" />
              <input 
                type="text" 
                placeholder="Interroger les archives..." 
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                className="w-full pl-7 pr-4 py-2 bg-transparent border-b border-theme/10 font-garamond italic text-lg text-primary focus:border-theme-main/50 outline-none transition-all placeholder:opacity-20"
              />
            </div>
          </div>

          {/* Bouton de Création Noble */}
          {mode === 'forge' && (
            <Button onClick={() => setVue('creer')} className="font-cinzel gap-2 group border-theme-main/30 hover:border-theme-main/60 transition-all text-[10px] uppercase py-2 px-6">
              <PenTool size={14} className="group-hover:rotate-12 transition-transform" />
              Forger une relique
            </Button>
          )}
        </div>
      )}

      {/* AFFICHAGE DES OBJETS */}
      <div className={`flex-1 min-h-0 ${isCodex ? 'flex flex-col lg:flex-row gap-6 items-start h-full' : 'pb-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'}`}>
        
        {/* LISTE OU GRILLE */}
        <div className={isCodex ? 'flex-1 flex flex-col gap-2 w-full h-full overflow-y-auto custom-scrollbar lg:pr-2' : 'contents'}>
          <AnimatePresence mode="popLayout">
          {filtered.map((rawEntry: any) => {
            const item = rawEntry.items || rawEntry
            const entry = getEntryForItem(item.id) // entrée inventaire si elle existe
            const entryId = entry?.id || item.id
            const isLibraryMode = mode === 'gerer' && ongletGerer === 'ajouter'
            const isPossede = idsInventaire.has(item.id)
            const delta = deltas[entryId] || 0
            const quantiteActuelle = entry?.quantite || 0
            const quantiteFinale = Math.max(0, quantiteActuelle + delta)
            const isSelected = selectionBib.includes(item.id)
            const isSelectedPoss = selectionPoss.includes(entryId)

            // ─── RENDU LIGNE CODEX ───
            if (isCodex) {
              const isActive = (detail as any)?.id === item.id || (detail as any)?.id === entryId || (detail as any)?.items?.id === item.id;
              return (
                <motion.div 
                  layout
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}
                  key={item.id} 
                  onClick={() => {
                    if (isLibraryMode) { toggleSelectionBib(item.id); setDetail(rawEntry); }
                    else if (mode === 'gerer' && entry) { toggleSelectionPoss(entryId); setDetail(entry); }
                    else setDetail(entry || rawEntry);
                  }}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-sm cursor-pointer transition-all ${
                    isActive ? 'bg-theme-main/10 border-theme-main shadow-[0_0_15px_rgba(var(--color-main-rgb),0.2)]' : 
                    (isSelected || isSelectedPoss) ? 'border-theme-main/50 bg-theme-main/5 scale-[1.01]' :
                    'bg-card/40 border-theme/20 hover:border-theme-main/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 shrink-0 rounded-sm bg-black/40 flex items-center justify-center border border-theme/10 text-theme-main shadow-inner relative overflow-hidden">
                       {item.image_url && <img src={item.image_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />}
                       <div className="relative z-10">{getIconCategorie(item.categorie)}</div>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-cinzel font-bold text-sm uppercase tracking-widest text-primary">{item.nom}</span>
                        {entry?.equipe && <span className="w-2 h-2 rounded-full bg-theme-main animate-pulse shadow-[0_0_8px_var(--color-main)]" title="Équipé" />}
                      </div>
                      <span className="font-garamond italic text-[11px] text-theme-main/60">{item.categorie}</span>
                    </div>
                  </div>
                  
                  {/* Action/Quantity area */}
                  <div className="flex items-center gap-4 mt-2 sm:mt-0 pl-13 sm:pl-0">
                    {(isPossede || isLibraryMode) && mode === 'gerer' && (
                      <div className="flex items-center gap-2 bg-black/40 border border-theme/10 rounded-sm p-1" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            const key = isLibraryMode ? item.id : entryId
                            const newVal = (deltas[key] || 0) - 1
                            setDeltas(prev => ({ ...prev, [key]: newVal }))
                            setInputDeltaValues(prev => ({ ...prev, [key]: newVal === 0 ? '' : newVal > 0 ? `+${newVal}` : `${newVal}` }))
                          }}
                          className="w-6 h-6 flex items-center justify-center hover:text-red-400 hover:bg-white/5"
                        >−</button>
                        <span className={`font-cinzel font-black text-xs w-6 text-center ${delta !== 0 ? (delta > 0 ? 'text-green-400' : 'text-red-400') : 'text-primary'}`}>
                           {mode === 'gerer' && !isLibraryMode ? quantiteFinale : (deltas[item.id] || 0)}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            const key = isLibraryMode ? item.id : entryId
                            const newVal = (deltas[key] || 0) + 1
                            setDeltas(prev => ({ ...prev, [key]: newVal }))
                            setInputDeltaValues(prev => ({ ...prev, [key]: newVal > 0 ? `+${newVal}` : `${newVal}` }))
                          }}
                          className="w-6 h-6 flex items-center justify-center hover:text-green-400 hover:bg-white/5"
                        >+</button>
                      </div>
                    )}
                    {isPossede && mode !== 'gerer' && entry && entry.quantite > 1 && (
                      <div className="font-cinzel font-black text-lg text-primary opacity-40">
                        x{entry.quantite}
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            }

            // ─── RENDU GRILLE ACTUELLE ───
            // Mode joueur/forge : garder l'ancien ItemCard
            if (mode !== 'gerer') {
              const isEntry = !!rawEntry.items
              const itemToRender = isEntry ? rawEntry : {
                id: item.id, id_personnage: '', id_item: item.id,
                quantite: 1, equipe: false, items: item
              }
              return (
                <motion.div 
                  layout
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }}
                  key={item.id} 
                  className="relative group hover:shadow-[0_0_30px_rgba(var(--color-main-rgb),0.15)] transition-shadow duration-500"
                >
                  <ItemCard
                    entry={itemToRender}
                    onUtiliser={mode === 'joueur' ? usage.utiliserItem : undefined}
                    onEquiper={mode === 'joueur' ? handleEquiper : undefined}
                    onClick={(e) => setDetail(e)}
                    onEdit={mode === 'forge' ? (item) => { forge.chargerPourEdition(item); setVue('creer') } : undefined}
                    onDelete={mode === 'forge' ? (id) => forge.supprimer(id).then(reloadLib) : undefined}
                    labelModif={m => formatLabelModif(m, allStats)}
                    labelEffet={e => formatLabelEffet(e, allStats)}
                    modifs={item.modificateurs || []}
                  />
                </motion.div>
              )
            }

            // Mode gerer : rendu unifié pour possédées ET bibliothèque
            return (
              <motion.div
                layout
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }}
                key={item.id}
                className={`medieval-border bg-card/40 backdrop-blur-md rounded-sm relative overflow-hidden transition-colors duration-300 cursor-pointer ${
                  isSelected || isSelectedPoss
                    ? 'border-theme-main scale-[1.02] shadow-[0_0_20px_rgba(var(--color-main-rgb),0.2)]'
                    : isPossede && !isLibraryMode
                      ? 'border-theme-main/20 hover:border-theme-main/40'
                      : 'border-white/5 hover:border-theme-main/30'
                }`}
                onClick={() => isLibraryMode
                  ? toggleSelectionBib(item.id)
                  : entry ? toggleSelectionPoss(entryId) : undefined
                }
              >
                {/* Checkmark sélection */}
                {(isSelected || isSelectedPoss) && (
                  <div className="absolute -top-2 -right-2 bg-theme-main text-white p-1.5 rounded-full shadow-lg z-30 animate-in zoom-in-50">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}

                {/* Ligne top dorée */}
                <div className="absolute top-0 left-3.5 right-3.5 h-px bg-gradient-to-r from-transparent via-theme-main/40 to-transparent" />

                {/* PARTIE HAUTE */}
                <div className="p-5 flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <h3
                      className="font-cinzel font-black uppercase tracking-widest text-lg text-primary hover:text-theme-main transition-colors cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (entry) setDetail(entry)
                        else setDetail(rawEntry)
                      }}
                    >
                      {item.nom}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-black/40 border border-theme/10">
                        <span className="text-[8px] font-cinzel text-theme-main uppercase tracking-widest font-bold flex items-center gap-1">
                          {getIconCategorie(item.categorie)} {item.categorie}
                        </span>
                      </div>
                      {item.tags && item.tags.map((t: any) => (
                        <span key={t.id} className="text-[8px] font-cinzel opacity-40 uppercase tracking-tighter">#{t.nom}</span>
                      ))}
                      {entry?.equipe && (
                        <span className="text-[8px] font-cinzel font-black uppercase tracking-widest px-2 py-0.5 bg-theme-main/20 text-theme-main animate-pulse">ÉQUIPÉ</span>
                      )}
                    </div>
                  </div>

                  {item.description && (
                    <p className="text-[11px] font-garamond opacity-60 line-clamp-2 italic leading-relaxed">
                      "{item.description}"
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    {[...(item.modificateurs || []), ...(item.effets_actifs || [])].slice(0, 2).map((effect: any, i: number) => {
                      const isModif = 'id_stat' in effect
                      return (
                        <span key={i} className={`text-[8px] font-cinzel font-black uppercase px-2 py-0.5 border ${
                          isModif ? 'bg-theme-main/10 text-theme-main border-theme-main/20' : 'bg-blue-900/20 text-blue-400 border-blue-900/20'
                        }`}>
                          {isModif ? formatLabelModif(effect, allStats) : formatLabelEffet(effect, allStats)}
                        </span>
                      )
                    })}
                    {([...(item.modificateurs || []), ...(item.effets_actifs || [])].length > 2) && (
                      <span className="text-[8px] font-cinzel opacity-30 uppercase px-2 py-0.5 border border-theme/10">
                        +{[...(item.modificateurs || []), ...(item.effets_actifs || [])].length - 2} autres
                      </span>
                    )}
                  </div>

                  {/* Quantité — visible si possédé */}
                  {isPossede && (
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="font-cinzel font-black text-2xl text-primary">{quantiteFinale}</span>
                      <span className="font-cinzel text-xs opacity-20">/ {quantiteActuelle} possédé(s)</span>
                      {delta !== 0 && (
                        <span className={`font-cinzel font-black text-[10px] ${delta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          ({delta > 0 ? '+' : ''}{delta})
                        </span>
                      )}
                    </div>
                  )}

                  {isPossede && (
                    <div className="h-[3px] w-full bg-black/50 border border-white/[0.04]">
                      <div
                        className="h-full transition-all duration-500 bg-gradient-to-r from-theme-dark to-theme-main"
                        style={{ width: `${Math.min(100, quantiteActuelle > 0 ? (quantiteFinale / quantiteActuelle) * 100 : 0)}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* PARTIE BASSE : contrôles */}
                {(isSelectedPoss || isSelected || isPossede) && (
                  <div className="border-t border-theme/10 p-3 flex items-center gap-2 w-full min-w-0" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        const key = isLibraryMode ? item.id : entryId
                        const newVal = (deltas[key] || 0) - 1
                        setDeltas(prev => ({ ...prev, [key]: newVal }))
                        setInputDeltaValues(prev => ({ ...prev, [key]: newVal === 0 ? '' : newVal > 0 ? `+${newVal}` : `${newVal}` }))
                      }}
                      className="w-8 h-8 shrink-0 flex items-center justify-center border border-white/[0.08] bg-white/[0.04] text-primary/70 hover:text-red-400 hover:bg-white/10 transition-all font-black text-base"
                    >−</button>
                    <input
                      type="text"
                      value={inputDeltaValues[isLibraryMode ? item.id : entryId] ?? ''}
                      placeholder="±0"
                      onChange={(e) => {
                        e.stopPropagation()
                        const raw = e.target.value
                        const key = isLibraryMode ? item.id : entryId
                        // Autoriser saisie libre (vide, -, +, chiffres avec signe)
                        if (raw === '' || raw === '-' || raw === '+' || /^[+-]?\d+$/.test(raw)) {
                          setInputDeltaValues(prev => ({ ...prev, [key]: raw }))
                          const num = parseInt(raw)
                          if (!isNaN(num)) {
                            setDeltas(prev => ({ ...prev, [key]: num }))
                          } else {
                            setDeltas(prev => ({ ...prev, [key]: 0 }))
                          }
                        }
                      }}
                      onBlur={(e) => {
                        const key = isLibraryMode ? item.id : entryId
                        const raw = e.target.value
                        if (raw === '' || raw === '-' || raw === '+') {
                          setInputDeltaValues(prev => ({ ...prev, [key]: '' }))
                          setDeltas(prev => ({ ...prev, [key]: 0 }))
                        }
                      }}
                      onClick={e => e.stopPropagation()}
                      className={`flex-1 min-w-0 bg-black/40 border border-white/[0.06] text-center font-cinzel font-black text-sm py-1.5 outline-none focus:border-theme-main/40 transition-all ${
                        delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-primary/40'
                      }`}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        const key = isLibraryMode ? item.id : entryId
                        const newVal = (deltas[key] || 0) + 1
                        setDeltas(prev => ({ ...prev, [key]: newVal }))
                        setInputDeltaValues(prev => ({ ...prev, [key]: newVal > 0 ? `+${newVal}` : `${newVal}` }))
                      }}
                      className="w-8 h-8 shrink-0 flex items-center justify-center border border-white/[0.08] bg-white/[0.04] text-primary/70 hover:text-green-400 hover:bg-white/10 transition-all font-black text-base"
                    >+</button>
                  </div>
                )}
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

      {/* BARRE DE CONFIRMATION */}
      {mode === 'gerer' && (hasChanges || selectionBib.length > 0) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4">
          <ConfirmationBar
            label={selectionBib.length > 0
              ? `${selectionBib.length} objet(s) sélectionné(s)`
              : undefined
            }
            onConfirm={selectionBib.length > 0 ? ajouterSelectionBib : appliquerChangements}
            onCancel={() => { setDeltas({}); setSelectionBib([]); setSelectionPoss([]); setInputDeltaValues({}) }}
            confirmText={selectionBib.length > 0 ? "Ajouter à l'inventaire" : "Appliquer les modifications"}
            loading={enSauvegarde || enAjout}
          />
        </div>
      )}

      {/* DETAIL MODAL (Mobile uniquement en mode Codex, ou partout en mode Grille) */}
      <div className={isCodex ? 'block lg:hidden' : 'block'}>
        <ItemDetailModal 
          item={detail} 
          onClose={() => setDetail(null)} 
          mode={mode} 
          stats={allStats}
          isAdmin={mode === 'forge'}
          onEdit={(item) => { forge.chargerPourEdition(item); setVue('creer'); setDetail(null) }}
          onUtiliser={usage.utiliserItem} 
          onEquiper={handleEquiper} 
        />
      </div>
    </div>
  )
}
