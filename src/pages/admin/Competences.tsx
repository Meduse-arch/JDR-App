import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { useCompetences } from '../../hooks/useCompetences'
import { itemsService } from '../../services/itemsService'
import { elementsService } from '../../services/elementsService'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Stat, Modificateur, EffetActif, Element, Competence } from '../../types'
import { formatLabelModif, formatLabelEffet } from '../../utils/formatters'
import { CompetenceCard } from '../../components/competences/CompetenceCard'
import { CompetenceDetailModal } from '../../components/competences/CompetenceDetailModal'
import { filtrerCompetences } from '../../utils/competenceUtils'

const JAUGES = [
  { value: 'hp', label: 'HP', color: '#ef4444' },
  { value: 'mana', label: 'Mana', color: '#3b82f6' },
  { value: 'stam', label: 'Stamina', color: '#eab308' }
]

export default function Competences() {
  const sessionActive = useStore(s => s.sessionActive)
  const { competences, supprimerCompetence, creerCompetence, modifierCompetence } = useCompetences()

  const [recherche, setRecherche] = useState('')
  const [vue, setVue] = useState<'liste' | 'creer'>('liste')
  const [message, setMessage] = useState('')
  const [competenceDetail, setCompetenceDetail] = useState<Competence | null>(null)

  // Form state
  const [idEdition, setIdEdition] = useState<string | null>(null)
  const [nom, setNom] = useState('')
  const [description, setDescription] = useState('')
  const [typeComp, setTypeComp] = useState('active')
  const [elementsChoisis, setElementsChoisis] = useState<string[]>([])

  const [stats, setStats] = useState<Stat[]>([])
  const [elements, setElements] = useState<Element[]>([])
  const [modifs, setModifs] = useState<Partial<Modificateur>[]>([])
  const [effets, setEffets] = useState<Partial<EffetActif>[]>([])
  const [couts, setCouts] = useState<Partial<EffetActif>[]>([])
  const [jetsDes, setJetsDes] = useState<Partial<EffetActif>[]>([])

  const [ongletActif, setOngletActif] = useState<'stats' | 'ressources' | 'couts' | 'dés'>('stats')
  const [filtrePrincipal, setFiltrePrincipal] = useState('Tous')
  const [filtreSecondaire, setFiltreSecondaire] = useState('Tous')

  useEffect(() => {
    itemsService.getStats().then(s => setStats((s || []).filter(st => !['PV Max', 'Mana Max', 'Stamina Max'].includes(st.nom))))
    if (sessionActive) {
      elementsService.getElements(sessionActive.id).then(setElements)
    }
  }, [sessionActive])

  const TYPES_CREATION = [
    { value: 'active', label: 'Active' },
    { value: 'passive_auto', label: 'Passive (Auto)' },
    { value: 'passive_toggle', label: 'Passive (ON/OFF)' },
  ]

  const handleEditer = (comp: Competence) => {
    setIdEdition(comp.id)
    setNom(comp.nom)
    setDescription(comp.description)
    setTypeComp(comp.type)
    setModifs(comp.modificateurs || [])
    
    const tousEffets = comp.effets_actifs || [];
    
    setJetsDes(tousEffets.filter(e => e.est_jet_de === true))
    setEffets(tousEffets.filter(e => !e.est_jet_de && !e.est_cout))
    setCouts(tousEffets.filter(e => !e.est_jet_de && e.est_cout === true))
    
    const els = comp.modificateurs?.map(m => m.id_element).filter(id => !!id) as string[]
    setElementsChoisis(Array.from(new Set(els)))
    
    setVue('creer')
  }

  const handleAnnuler = () => {
    setVue('liste')
    setIdEdition(null)
    setNom(''); setDescription(''); setTypeComp('active')
    setModifs([]); setEffets([]); setCouts([]); setJetsDes([]); setElementsChoisis([])
  }

  const handleEnregistrer = async () => {
    if (!nom || !sessionActive) return
    
    const finalModifs = modifs.map(m => ({
      ...m,
      id_element: m.id_element || (elementsChoisis.length > 0 ? elementsChoisis[0] : null)
    }))

    const finalEffets = [
      ...effets.map(e => ({ ...e, est_cout: false, est_jet_de: false })),
      ...couts.map(e => ({ ...e, est_cout: true, est_jet_de: false })),
      ...jetsDes.map(e => ({ ...e, est_cout: false, est_jet_de: true, cible_jauge: e.cible_jauge || 'hp' }))
    ].filter(e => !!e.cible_jauge)

    let success = false
    if (idEdition) {
      success = await modifierCompetence(idEdition, { nom, description, type: typeComp }, finalModifs as any[], finalEffets as any[])
    } else {
      const newComp = await creerCompetence(
        { nom, description, type: typeComp, id_session: sessionActive.id },
        finalModifs as any[],
        finalEffets as any[]
      )
      success = !!newComp
    }

    if (success) {
      handleAnnuler()
      setMessage(idEdition ? '✅ Compétence modifiée !' : '✅ Compétence créée !')
      setTimeout(() => setMessage(''), 2500)
    }
  }

  const addModif = () => setModifs(prev => [...prev, { id_stat: stats[0]?.id, type_calcul: 'fixe', valeur: 0 }])
  const removeModif = (idx: number) => setModifs(prev => prev.filter((_, i) => i !== idx))
  const updateModif = (idx: number, updates: Partial<Modificateur>) => {
    setModifs(prev => {
      const newList = [...prev]
      newList[idx] = { ...newList[idx], ...updates }
      return newList
    })
  }

  const addEffet = (type?: string) => {
    const defaultJauge = 'hp' as const;
    const newEffet: Partial<EffetActif> = { 
      cible_jauge: defaultJauge, 
      valeur: type === 'dice' ? 0 : 10, 
      des_nb: type === 'dice' ? 1 : null,
      des_faces: type === 'dice' ? 6 : null,
      des_stat_id: null,
      est_cout: ongletActif === 'couts',
      est_jet_de: ongletActif === 'dés'
    }
    
    if (ongletActif === 'couts') {
      setCouts(prev => [...prev, newEffet])
    } else if (ongletActif === 'dés') {
      setJetsDes(prev => [...prev, newEffet])
    } else {
      setEffets(prev => [...prev, newEffet])
    }
  }
  const removeEffet = (idx: number, type: 'ressources' | 'couts' | 'dés') => {
    if (type === 'dés') setJetsDes(prev => prev.filter((_, i) => i !== idx))
    else if (type === 'couts') setCouts(prev => prev.filter((_, i) => i !== idx))
    else setEffets(prev => prev.filter((_, i) => i !== idx))
  }
  const updateEffet = (idx: number, updates: Partial<EffetActif>, type: 'ressources' | 'couts' | 'dés') => {
    const setter = type === 'dés' ? setJetsDes : (type === 'couts' ? setCouts : setEffets);
    setter(prev => {
      const newList = [...prev];
      newList[idx] = { ...newList[idx], ...updates };
      return newList;
    });
  }

  const toggleElement = (idEl: string) => {
    if (elementsChoisis.includes(idEl)) setElementsChoisis(elementsChoisis.filter(id => id !== idEl))
    else setElementsChoisis([...elementsChoisis, idEl])
  }

  const competencesFiltrees = filtrerCompetences(competences, recherche, filtrePrincipal, filtreSecondaire)

  return (
    <div className="flex flex-col h-full p-4 md:p-8 overflow-y-auto custom-scrollbar" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      <div className="flex justify-between items-center mb-8 pb-6 border-b border-white/5">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase italic gradient-title">📖 Bibliothèque de Compétences</h2>
          <p className="text-sm opacity-60">Gérez les pouvoirs de votre univers</p>
        </div>
        <div className="flex items-center gap-3">
          {message && <span className="text-sm font-bold text-green-400">{message}</span>}
          <Button variant={vue === 'liste' ? 'primary' : 'secondary'} onClick={vue === 'liste' ? () => setVue('creer') : handleAnnuler}>
            {vue === 'creer' ? '✕ Annuler' : '+ Créer une compétence'}
          </Button>
        </div>
      </div>

      {vue === 'creer' && sessionActive ? (
        <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto w-full pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* COLONNE GAUCHE - IDENTITÉ */}
          <Card className="flex-1 p-6 flex flex-col gap-6 h-fit bg-black/20 border-white/5">
            <h3 className="font-black uppercase tracking-widest text-xs text-main">🆔 Identité</h3>
            <Input label="Nom de la compétence" value={nom} onChange={e => setNom(e.target.value)} placeholder="Ex: Souffle du Dragon..." />
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase opacity-40 ml-1">Type</label>
              <Select value={typeComp} onChange={e => setTypeComp(e.target.value)}>
                {TYPES_CREATION.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase opacity-40 ml-1">🌀 Éléments</label>
              <div className="flex flex-wrap gap-2">
                {elements.map(el => {
                  const isSelected = elementsChoisis.includes(el.id);
                  return (
                    <button key={el.id} onClick={() => toggleElement(el.id)} className={`px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase transition-all flex items-center gap-2 ${isSelected ? 'bg-white/10 border-white/40 shadow-lg' : 'bg-black/20 border-white/5 opacity-40 grayscale'}`} style={{ borderColor: isSelected ? el.couleur : undefined, color: isSelected ? el.couleur : undefined }}>
                      <span>{el.emoji}</span> {el.nom}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase opacity-40 ml-1">Description</label>
              <textarea className="w-full bg-surface border border-border rounded-xl p-4 min-h-[150px] outline-none focus:border-main text-sm italic font-bold" value={description} onChange={e => setDescription(e.target.value)} placeholder="Effets, coût, portée..." />
            </div>

            <Button size="lg" onClick={handleEnregistrer} className="mt-4 uppercase tracking-widest font-black">
              💾 {idEdition ? 'Mettre à jour' : 'Enregistrer la compétence'}
            </Button>
          </Card>

          {/* COLONNE DROITE - MÉCANIQUES */}
          <Card className="flex-[1.5] p-6 flex flex-col gap-6 bg-black/40 border-white/5 min-h-[600px]">
            {/* DEBUG STATE */}
            <div className="text-[8px] font-mono opacity-20 overflow-hidden h-4 hover:h-auto bg-black/40 p-1 rounded cursor-help">
              DEBUG: {JSON.stringify({ modifs: modifs.length, effets: effets.length, couts: couts.length, jetsDes: jetsDes.length })}
            </div>

            <div className="flex gap-2 p-1 bg-black/20 rounded-2xl border border-white/5">
              {[
                { id: 'stats', label: '📊 Stats', color: 'var(--color-main)' },
                { id: 'ressources', label: '💧 Ressources', color: '#3b82f6' },
                { id: 'couts', label: '⚔️ Coûts', color: '#ef4444' },
                { id: 'dés', label: '🎲 Dés', color: '#a855f7' }
              ].map(tab => (
                <button key={tab.id} onClick={() => setOngletActif(tab.id as any)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${ongletActif === tab.id ? 'bg-white/10 shadow-lg' : 'opacity-30 hover:opacity-100'}`} style={{ color: ongletActif === tab.id ? tab.color : 'inherit' }}>
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              {ongletActif === 'stats' && (
                <div className="flex flex-col gap-4">
                  {modifs.map((m, idx) => (
                    <Card key={`m-${idx}`} className="p-4 bg-white/5 border-white/5 flex flex-col gap-4 relative group">
                      <button onClick={() => removeModif(idx)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-40 hover:opacity-100 transition-opacity">✕</button>
                      <div className="grid grid-cols-2 gap-4">
                        <Select label="Statistique" value={m.id_stat} onChange={e => updateModif(idx, { id_stat: e.target.value })}>
                          {stats.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                        </Select>
                        <Select label="Élément" value={m.id_element || ''} onChange={e => updateModif(idx, { id_element: e.target.value || null })}>
                          <option value="">Aucun</option>
                          {elements.map(el => <option key={el.id} value={el.id}>{el.emoji} {el.nom}</option>)}
                        </Select>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2 p-1 bg-black/20 rounded-lg">
                          {['fixe', 'pourcentage', 'roll_stat', 'roll_dice'].map(type => (
                            <button key={type} onClick={() => updateModif(idx, { type_calcul: type as any, des_nb: type==='roll_dice'?1:null, des_faces: type==='roll_dice'?6:null, des_stat_id: type==='roll_stat'?stats[0]?.id:null })} className={`flex-1 py-1.5 rounded-md text-[8px] font-black uppercase transition-all ${m.type_calcul === type ? 'bg-main text-white' : 'opacity-40'}`}>
                              {type === 'fixe' ? 'Fixe' : type === 'pourcentage' ? '%' : type === 'roll_stat' ? 'Roll Stat' : 'XdX'}
                            </button>
                          ))}
                        </div>
                        <div className="grid grid-cols-3 gap-3 mt-1">
                          {m.type_calcul === 'fixe' || m.type_calcul === 'pourcentage' ? (
                            <div className="col-span-full"><Input type="number" label={m.type_calcul === 'pourcentage' ? "Valeur (%)" : "Valeur"} value={m.valeur} onChange={e => updateModif(idx, { valeur: parseInt(e.target.value) || 0 })} /></div>
                          ) : m.type_calcul === 'roll_stat' ? (
                            <div className="col-span-full"><Select label="Basé sur" value={m.des_stat_id || ''} onChange={e => updateModif(idx, { des_stat_id: e.target.value || null })}>{stats.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}</Select></div>
                          ) : (
                            <>
                              <Input type="number" label="Nb" value={m.des_nb || ''} onChange={e => updateModif(idx, { des_nb: parseInt(e.target.value) || 0 })} />
                              <Input type="number" label="Faces" value={m.des_faces || ''} onChange={e => updateModif(idx, { des_faces: parseInt(e.target.value) || 0 })} />
                              <Input type="number" label="Bonus" value={m.valeur} onChange={e => updateModif(idx, { valeur: parseInt(e.target.value) || 0 })} />
                            </>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                  <Button variant="ghost" className="border-dashed border-white/10 opacity-40 hover:opacity-100" onClick={addModif}>+ Ajouter une stat</Button>
                </div>
              )}

              {['ressources', 'couts', 'dés'].includes(ongletActif) && (
                <div className="flex flex-col gap-4">
                  {(ongletActif === 'ressources' ? effets : (ongletActif === 'couts' ? couts : jetsDes)).map((e, idx) => (
                    <Card key={`${ongletActif}-${idx}`} className="p-4 bg-white/5 border-white/5 flex flex-col gap-4 relative group">
                      <button onClick={() => removeEffet(idx, ongletActif as any)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-40 hover:opacity-100 transition-opacity">✕</button>
                      
                      {ongletActif !== 'dés' && (
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-black uppercase opacity-40 ml-1">Jauge cible</label>
                          <div className="flex gap-2">
                            {JAUGES.map(j => (
                              <button key={j.value} onClick={() => updateEffet(idx, { cible_jauge: j.value as any }, ongletActif as any)} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${e.cible_jauge === j.value ? 'bg-white/10' : 'opacity-20 grayscale'}`} style={{ borderColor: e.cible_jauge === j.value ? j.color : 'transparent', color: e.cible_jauge === j.value ? j.color : 'inherit' }}>
                                {j.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2 p-1 bg-black/20 rounded-lg">
                          {['fixe', 'roll_stat', 'roll_dice'].map(type => (
                            <button key={type} onClick={() => updateEffet(idx, { des_nb: type==='roll_dice'?1:null, des_faces: type==='roll_dice'?6:null, des_stat_id: type==='roll_stat'?stats[0]?.id:null }, ongletActif as any)} className={`flex-1 py-1.5 rounded-md text-[8px] font-black uppercase transition-all ${(!e.des_nb && !e.des_stat_id && type === 'fixe') || (e.des_stat_id && type === 'roll_stat') || (e.des_nb && type === 'roll_dice') ? 'bg-main text-white' : 'opacity-40'}`}>
                              {type === 'fixe' ? 'Fixe' : type === 'roll_stat' ? 'Stat' : 'XdX'}
                            </button>
                          ))}
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          {!e.des_nb && !e.des_stat_id ? (
                            <div className="col-span-full"><Input type="number" label={ongletActif === 'couts' ? "Perte" : "Valeur"} value={Math.abs(e.valeur || 0)} onChange={ev => updateEffet(idx, { valeur: parseInt(ev.target.value) || 0 }, ongletActif as any)} /></div>
                          ) : e.des_stat_id ? (
                            <div className="col-span-full"><Select label="Basé sur" value={e.des_stat_id || ''} onChange={ev => updateEffet(idx, { des_stat_id: ev.target.value || null }, ongletActif as any)}>{stats.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}</Select></div>
                          ) : (
                            <>
                              <Input type="number" label="Nb" value={e.des_nb || ''} onChange={ev => updateEffet(idx, { des_nb: parseInt(ev.target.value) || 0 }, ongletActif as any)} />
                              <Input type="number" label="Faces" value={e.des_faces || ''} onChange={ev => updateEffet(idx, { des_faces: parseInt(ev.target.value) || 0 }, ongletActif as any)} />
                              <Input type="number" label="Bonus" value={e.valeur} onChange={ev => updateEffet(idx, { valeur: parseInt(ev.target.value) || 0 }, ongletActif as any)} />
                            </>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                  <Button variant="ghost" className="border-dashed border-white/10 opacity-40 hover:opacity-100" onClick={() => addEffet(ongletActif as any)}>+ Ajouter</Button>
                </div>
              )}

              {/* RÉCAPITULATIF GLOBAL (DEBUG) */}
              {(effets.length > 0 || couts.length > 0 || jetsDes.length > 0 || modifs.length > 0) && (
                <div className="mt-8 pt-8 border-t border-white/10 bg-white/5 rounded-2xl p-4 flex flex-wrap gap-2 justify-center">
                  <p className="w-full text-[10px] font-black uppercase opacity-20 mb-2 tracking-widest text-center">Debug Recap</p>
                  {modifs.map((m, i) => <Badge key={`dm-${i}`} variant="default">{formatLabelModif(m as any, stats)}</Badge>)}
                  {effets.map((e, i) => <Badge key={`de-${i}`} variant="success">{formatLabelEffet(e as any, stats)}</Badge>)}
                  {couts.map((e, i) => <Badge key={`dc-${i}`} variant="error">{formatLabelEffet(e as any, stats)}</Badge>)}
                  {jetsDes.map((e, i) => <Badge key={`dd-${i}`} variant="warning">{formatLabelEffet(e as any, stats)}</Badge>)}
                </div>
              )}
            </div>
          </Card>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40">🔍</span>
              <input type="text" placeholder="Rechercher..." value={recherche} onChange={e => setRecherche(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-2xl outline-none font-bold bg-surface border border-border" />
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <div className="flex gap-2 p-1 rounded-xl bg-surface border border-border">
                {['Tous', 'Actif', 'Passif'].map(t => (
                  <button key={t} onClick={() => { setFiltrePrincipal(t); setFiltreSecondaire('Tous'); }} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${filtrePrincipal === t ? 'bg-main text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`} style={{ backgroundColor: filtrePrincipal === t ? 'var(--color-main)' : 'transparent' }}>{t}</button>
                ))}
              </div>
              {filtrePrincipal === 'Passif' && (
                <div className="flex gap-2 p-1 rounded-xl bg-surface border border-border">
                  {['Tous', 'Auto', 'Toggle'].map(t => (
                    <button key={t} onClick={() => setFiltreSecondaire(t)} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${filtreSecondaire === t ? 'bg-main/20 text-main border border-main/30' : 'opacity-40 hover:opacity-100 border border-transparent'}`}>{t}</button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
            {competencesFiltrees.map(comp => (
              <CompetenceCard key={comp.id} competence={comp} stats={stats} isAdmin onClick={setCompetenceDetail} onEdit={handleEditer} onDelete={supprimerCompetence} />
            ))}
          </div>
        </div>
      )}

      {competenceDetail && (
        <CompetenceDetailModal competence={competenceDetail} stats={stats} isAdmin onClose={() => setCompetenceDetail(null)} onEdit={handleEditer} />
      )}
    </div>
  )
}
