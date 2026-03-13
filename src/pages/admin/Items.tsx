import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { useItems } from '../../hooks/useItems'
import { itemsService } from '../../services/itemsService'
import { elementsService } from '../../services/elementsService'
import { Modificateur, EffetActif, CategorieItem, Item, Element } from '../../types'
import { CATEGORIES, CATEGORIE_EMOJI } from '../../utils/constants'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { ConfirmButton } from '../../components/ui/ConfirmButton'
import { Badge } from '../../components/ui/Badge'
import { formatLabelModif, formatLabelEffet } from '../../utils/formatters'

const RESSOURCES_MODIFS = [
  { type: 'hp', label: 'PV Actuel' },
  { type: 'mana', label: 'Mana Actuel' },
  { type: 'stam', label: 'Stam Actuelle' }
]

export default function Items() {
  const sessionActive = useStore(s => s.sessionActive)
  const compte = useStore(s => s.compte)
  const { items, stats, charger, supprimerItem } = useItems()
  
  const [vue, setVue] = useState<'liste' | 'creer'>('liste')
  const [enCours, setEnCours] = useState(false)
  const [itemDetail, setItemDetail] = useState<Item | null>(null)
  const [elements, setElements] = useState<Element[]>([])

  const [idEdition, setIdEdition] = useState<string | null>(null)
  const [form, setForm] = useState({ nom: '', description: '', categorie: 'Divers' as CategorieItem })
  const [modifs, setModifs] = useState<Partial<Modificateur>[]>([])
  const [effets, setEffets] = useState<Partial<EffetActif>[]>([])

  const [filtre, setFiltre] = useState('Tous')
  const [recherche, setRecherche] = useState('')

  useEffect(() => {
    if (sessionActive) {
      elementsService.getElements(sessionActive.id).then(setElements)
    }
  }, [sessionActive])

  const handleEditer = (item: Item) => {
    setIdEdition(item.id)
    setForm({ nom: item.nom, description: item.description, categorie: item.categorie })
    setModifs(item.modificateurs || [])
    setEffets(item.effets_actifs || [])
    setVue('creer')
  }

  const handleAnnuler = () => {
    setVue('liste')
    setIdEdition(null)
    setForm({ nom: '', description: '', categorie: 'Divers' })
    setModifs([])
    setEffets([])
  }

  const handleEnregistrer = async () => {
    if (!sessionActive || !form.nom || enCours) return
    setEnCours(true)
    
    let success = false
    if (idEdition) {
      success = await itemsService.updateItem(idEdition, form, modifs as Modificateur[], effets as EffetActif[])
    } else {
      const newItem = await itemsService.createItem(sessionActive.id, compte?.id, form, modifs, effets)
      success = !!newItem
    }

    if (success) {
      await charger()
      handleAnnuler()
    }
    setEnCours(false)
  }

  const toggleStatModif = (idStat: string) => {
    const exists = modifs.find(m => m.id_stat === idStat)
    if (exists) setModifs(modifs.filter(m => m.id_stat !== idStat))
    else setModifs([...modifs, { id_stat: idStat, type_calcul: 'fixe', valeur: 1 }])
  }

  const toggleResModif = (type: string) => {
    const exists = effets.find(e => e.cible_jauge === type)
    if (exists) setEffets(effets.filter(e => e.cible_jauge !== type))
    else setEffets([...effets, { cible_jauge: type as any, valeur: 1 }])
  }

  const updateModif = (idx: number, updates: Partial<Modificateur>) => {
    const newModifs = [...modifs]
    newModifs[idx] = { ...newModifs[idx], ...updates }
    setModifs(newModifs)
  }

  const updateEffet = (idx: number, updates: Partial<EffetActif>) => {
    const newEffets = [...effets]
    newEffets[idx] = { ...newEffets[idx], ...updates }
    setEffets(newEffets)
  }

  const itemsFiltrés = items.filter(i => (filtre === 'Tous' || i.categorie === filtre) && (i.nom || '').toLowerCase().includes(recherche.toLowerCase()))

  return (
    <div className="flex flex-col h-full p-4 md:p-8 overflow-y-auto custom-scrollbar" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight" style={{ background: 'linear-gradient(135deg, var(--color-light), var(--color-accent2))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            🎒 Forge des Objets
          </h2>
          <p className="text-sm opacity-60 mt-1">Créez les trésors de votre univers</p>
        </div>
        <Button variant={vue === 'liste' ? 'primary' : 'secondary'} onClick={vue === 'liste' ? () => setVue('creer') : handleAnnuler}>
          {vue === 'liste' ? '+ Nouvel Item' : '✕ Annuler'}
        </Button>
      </div>

      {vue === 'creer' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto w-full pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="p-8 flex flex-col gap-6 h-fit border-main/10 shadow-2xl">
            <Input label="Nom de l'objet" value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} placeholder="Ex: Épée de Cristal..." />
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase opacity-40 ml-1">Catégorie</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setForm({...form, categorie: cat})} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${form.categorie === cat ? 'bg-main border-main text-white shadow-lg shadow-main/20' : 'bg-white/5 border-white/10 opacity-40'}`}>
                    {CATEGORIE_EMOJI[cat]} {cat}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase opacity-40 ml-1">Description</label>
              <textarea className="w-full bg-surface border border-border rounded-xl p-4 min-h-[100px] outline-none focus:border-main text-sm italic font-bold" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </div>
          </Card>

          <div className="flex flex-col gap-6">
            <Card className="p-8 flex flex-col gap-6 bg-black/40 border-white/5">
              <div className="flex flex-col gap-2">
                <h3 className="font-black uppercase tracking-widest text-[10px] text-main">📊 Statistiques & Attributs</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {stats.map(s => (
                    <button key={s.id} onClick={() => toggleStatModif(s.id)} className={`p-2 rounded-xl border transition-all text-[9px] font-black uppercase ${modifs.find(m => m.id_stat === s.id) ? 'bg-main/20 border-main text-main' : 'bg-white/5 border-white/10 opacity-30'}`}>
                      {s.nom}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="font-black uppercase tracking-widest text-[10px] text-main">❤️ Effets Immédiats</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {RESSOURCES_MODIFS.map(r => (
                    <button key={r.type} onClick={() => toggleResModif(r.type)} className={`p-2 rounded-xl border transition-all text-[9px] font-black uppercase ${effets.find(e => e.cible_jauge === r.type) ? 'bg-main/20 border-main text-main' : 'bg-white/5 border-white/10 opacity-30'}`}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {(modifs.length > 0 || effets.length > 0) && (
                <div className="mt-4 pt-6 border-t border-white/5 flex flex-col gap-4">
                  {modifs.map((m, idx) => (
                    <div key={`m-${idx}`} className="flex flex-col gap-2 bg-black/40 p-3 rounded-xl border border-white/5 shadow-inner">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-main">
                          {stats.find(s => s.id === m.id_stat)?.nom}
                        </span>
                        <div className="flex items-center gap-3">
                          <button onClick={() => updateModif(idx, { valeur: (m.valeur || 0) - 1 })} className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 font-bold">-</button>
                          <input 
                            type="number" 
                            value={m.valeur} 
                            onChange={(e) => updateModif(idx, { valeur: parseInt(e.target.value) || 0 })}
                            className="w-12 bg-transparent text-center font-black text-sm outline-none focus:text-main"
                          />
                          <button onClick={() => updateModif(idx, { valeur: (m.valeur || 0) + 1 })} className="w-6 h-6 rounded-lg bg-main/20 hover:bg-main/40 font-bold text-main">+</button>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <Select value={m.type_calcul} onChange={e => {
                            const type = e.target.value as any;
                            const updates: any = { type_calcul: type };
                            if (type === 'roll_stat') {
                              updates.des_stat_id = stats[0]?.id || null;
                              updates.des_nb = null;
                              updates.des_faces = null;
                            } else if (type === 'roll_dice') {
                              updates.des_nb = 1;
                              updates.des_faces = 6;
                              updates.des_stat_id = null;
                            } else {
                              updates.des_nb = null;
                              updates.des_faces = null;
                              updates.des_stat_id = null;
                            }
                            updateModif(idx, updates);
                          }} className="text-[9px] h-8 flex-1">
                            <option value="fixe">Valeur Fixe</option>
                            <option value="pourcentage">Pourcentage (%)</option>
                            <option value="roll_stat">Dé de Stat</option>
                            <option value="roll_dice">Jet de Dés (XdX)</option>
                          </Select>
                          <Select value={m.id_element || ''} onChange={e => updateModif(idx, { id_element: e.target.value || null })} className="text-[9px] h-8 flex-1">
                            <option value="">Aucun Élément</option>
                            {elements.map(el => <option key={el.id} value={el.id}>{el.emoji} {el.nom}</option>)}
                          </Select>
                        </div>

                        {m.type_calcul === 'roll_stat' ? (
                          <div className="flex flex-col gap-1">
                            <label className="text-[8px] uppercase opacity-40 ml-1">Basé sur</label>
                            <Select value={m.des_stat_id || ''} onChange={e => updateModif(idx, { des_stat_id: e.target.value || null })} className="h-8 text-[9px]">
                              {stats.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                            </Select>
                          </div>
                        ) : m.type_calcul === 'roll_dice' ? (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col gap-1">
                              <label className="text-[8px] uppercase opacity-40 ml-1">Nombre</label>
                              <Input type="number" value={m.des_nb || ''} onChange={e => updateModif(idx, { des_nb: parseInt(e.target.value) || 0 })} className="h-8 text-[10px]" />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[8px] uppercase opacity-40 ml-1">Faces</label>
                              <Input type="number" value={m.des_faces || ''} onChange={e => updateModif(idx, { des_faces: parseInt(e.target.value) || 0 })} className="h-8 text-[10px]" />
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  
                  {effets.map((e, idx) => (
                    <div key={`e-${idx}`} className="flex flex-col gap-3 bg-black/40 p-3 rounded-xl border border-white/5 shadow-inner">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-blue-400">
                          {RESSOURCES_MODIFS.find(r => r.type === e.cible_jauge)?.label}
                        </span>
                        <div className="flex items-center gap-3">
                          <button onClick={() => updateEffet(idx, { valeur: (e.valeur || 0) - 1 })} className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 font-bold">-</button>
                          <input 
                            type="number" 
                            value={e.valeur} 
                            onChange={(ev) => updateEffet(idx, { valeur: parseInt(ev.target.value) || 0 })}
                            className="w-12 bg-transparent text-center font-black text-sm outline-none focus:text-main"
                          />
                          <button onClick={() => updateEffet(idx, { valeur: (e.valeur || 0) + 1 })} className="w-6 h-6 rounded-lg bg-main/20 hover:bg-main/40 font-bold text-main">+</button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-[8px] uppercase opacity-40 ml-1">Dés</label>
                          <Input type="number" value={e.des_nb || ''} onChange={val => updateEffet(idx, { des_nb: parseInt(val.target.value) || null })} placeholder="Nb" className="h-8 text-[10px]" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[8px] uppercase opacity-40 ml-1">Faces</label>
                          <Input type="number" value={e.des_faces || ''} onChange={val => updateEffet(idx, { des_faces: parseInt(val.target.value) || null })} placeholder="Faces" className="h-8 text-[10px]" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[8px] uppercase opacity-40 ml-1">Ou Stat</label>
                          <Select value={e.des_stat_id || ''} onChange={val => updateEffet(idx, { des_stat_id: val.target.value || null })} className="h-8 text-[9px]">
                            <option value="">Non</option>
                            {stats.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            <Button size="lg" className="w-full py-6 text-lg uppercase tracking-widest shadow-2xl" onClick={handleEnregistrer} disabled={!form.nom || enCours}>
              {enCours ? 'Forge en cours...' : idEdition ? 'Mettre à jour ✓' : 'Forger le trésor ✓'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 pb-10">
          <div className="flex flex-col xl:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40">🔍</span>
              <input 
                type="text" placeholder="Rechercher un objet..." value={recherche} onChange={e => setRecherche(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl outline-none transition-all font-bold"
                style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
            <div className="flex gap-2 p-1 rounded-xl overflow-x-auto custom-scrollbar shrink-0" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              {['Tous', ...CATEGORIES].map(cat => (
                <button
                  key={cat} onClick={() => setFiltre(cat)}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap flex items-center gap-1 ${filtre === cat ? 'bg-main text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}
                  style={{ backgroundColor: filtre === cat ? 'var(--color-main)' : 'transparent' }}
                >
                  {cat !== 'Tous' && <span className="text-xs">{CATEGORIE_EMOJI[cat as CategorieItem]}</span>}
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {itemsFiltrés.map(item => (
              <Card key={item.id} hoverEffect className="flex-col gap-3 group relative h-full hover:border-main/30 transition-all cursor-pointer" onClick={() => setItemDetail(item as Item)}>
                <div className="flex justify-between items-start">
                  <Badge variant="outline" className="text-[8px] font-black uppercase tracking-tighter shrink-0">{CATEGORIE_EMOJI[item.categorie]} {item.categorie}</Badge>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => handleEditer(item as Item)} className="p-1 hover:bg-white/10 rounded opacity-0 group-hover:opacity-100 transition-opacity">✏️</button>
                    <ConfirmButton variant="danger" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity" onConfirm={() => supprimerItem(item.id)}>🗑️</ConfirmButton>
                  </div>
                </div>
                <h3 className="font-black text-sm uppercase truncate pr-4 text-white">{item.nom}</h3>
                <div className="mt-auto flex flex-wrap gap-1 pt-2">
                  {item.modificateurs?.slice(0, 2)?.map((m, i) => (
                    <Badge key={`m-${i}`} variant="default" className="text-[8px] py-0.5 px-1.5 font-black bg-main/10 text-main border-main/10 uppercase truncate max-w-full">
                      {formatLabelModif(m, stats)}
                    </Badge>
                  ))}
                  {item.effets_actifs?.slice(0, 2)?.map((e, i) => (
                    <Badge key={`e-${i}`} variant="default" className="text-[8px] py-0.5 px-1.5 font-black bg-blue-500/10 text-blue-400 border-blue-500/10 uppercase truncate max-w-full">
                      {formatLabelEffet(e, stats)}
                    </Badge>
                  ))}
                  {((item.modificateurs?.length || 0) + (item.effets_actifs?.length || 0)) > 2 && (
                    <Badge variant="default" className="text-[8px] py-0.5 px-1.5 font-black bg-main/10 text-main border-main/10 uppercase">
                      +{((item.modificateurs?.length || 0) + (item.effets_actifs?.length || 0) - 2)}...
                    </Badge>
                  )}
                </div>
              </Card>
            ))}
            {itemsFiltrés.length === 0 && <div className="col-span-full py-20 text-center opacity-20 font-black uppercase italic">Aucun objet trouvé...</div>}
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {itemDetail && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => setItemDetail(null)}>
          <Card className="max-w-xl w-full p-8 gap-6 shadow-2xl border-main/30" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between border-b border-white/5 pb-4">
              <div>
                <Badge className="mb-2 uppercase" variant="outline">{CATEGORIE_EMOJI[itemDetail.categorie]} {itemDetail.categorie}</Badge>
                <h3 className="text-2xl font-black uppercase tracking-tighter">{itemDetail.nom}</h3>
              </div>
              <button className="text-2xl opacity-20 hover:opacity-100" onClick={() => setItemDetail(null)}>✕</button>
            </div>
            <p className="text-sm opacity-80 whitespace-pre-wrap italic leading-relaxed">"{itemDetail.description}"</p>
            
            {((itemDetail.modificateurs && itemDetail.modificateurs.length > 0) || (itemDetail.effets_actifs && itemDetail.effets_actifs.length > 0)) && (
              <div className="flex flex-col gap-2 mt-4">
                <p className="text-[10px] font-black uppercase opacity-40">Statistiques & Effets :</p>
                <div className="flex flex-wrap gap-2">
                  {itemDetail.modificateurs?.map((m, i) => (
                    <Badge key={`m-${i}`} variant="default" className="text-xs py-1 px-2 font-black bg-main/10 text-main border-main/10 uppercase">
                      {formatLabelModif(m, stats)}
                    </Badge>
                  ))}
                  {itemDetail.effets_actifs?.map((e, i) => (
                    <Badge key={`e-${i}`} variant="default" className="text-xs py-1 px-2 font-black bg-blue-500/10 text-blue-400 border-blue-500/10 uppercase">
                      {formatLabelEffet(e, stats)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="secondary" onClick={() => { handleEditer(itemDetail); setItemDetail(null); }}>✏️ Modifier</Button>
              <ConfirmButton onConfirm={() => { setItemDetail(null); supprimerItem(itemDetail.id); }}>🗑️ Supprimer l'objet</ConfirmButton>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
