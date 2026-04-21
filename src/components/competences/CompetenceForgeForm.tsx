import { Stat, Modificateur, EffetActif, Tag } from '../../types'
import { Button } from '../ui/Button'
import { useState } from 'react'
import { Zap, Backpack, Sparkles, Shuffle, BarChart2, Droplets, Swords, Dices, X, Save } from 'lucide-react'
import { statsEngine } from '../../utils/statsEngine'
import { ORDRE_STATS } from '../../utils/constants'

interface Props {
  stats: Stat[]
  tags: Tag[]
  nom: string; setNom: (v: string) => void
  description: string; setDescription: (v: string) => void
  typeComp: string; setTypeComp: (v: string) => void
  tagsChoisis: string[]
  modifs: Partial<Modificateur>[]
  effets: Partial<EffetActif>[]
  couts: Partial<EffetActif>[]
  jetsDes: Partial<EffetActif>[]
  idEdition: string | null
  conditionTags: string[]
  toggleConditionTag: (id: string) => void
  conditionType: 'item' | 'skill' | 'les_deux' | null
  setConditionType: (v: 'item' | 'skill' | 'les_deux' | null) => void
  onSave: () => Promise<boolean>
  onCancel: () => void
  addModif: () => void
  removeModif: (idx: number) => void
  updateModif: (idx: number, updates: Partial<Modificateur>) => void
  addEffet: (type: 'ressources' | 'couts' | 'dés') => void
  removeEffet: (idx: number, type: 'ressources' | 'couts' | 'dés') => void
  updateEffet: (idx: number, updates: Partial<EffetActif>, type: 'ressources' | 'couts' | 'dés') => void
  toggleTag: (id: string) => void
}

const JAUGES = [
  { value: 'hp', label: 'HP', color: '#ef4444' },
  { value: 'mana', label: 'Mana', color: '#3b82f6' },
  { value: 'stam', label: 'Stamina', color: '#eab308' },
  { value: 'hp_max', label: 'HP Max', color: '#dc2626' },
  { value: 'mana_max', label: 'Mana Max', color: '#2563eb' },
  { value: 'stam_max', label: 'Stam Max', color: '#ca8a04' }
]

export default function CompetenceForgeForm(props: Props) {
  const [onglet, setOnglet] = useState<'stats' | 'ressources' | 'couts' | 'dés'>('stats')

  const sortedStats = statsEngine.trierStats(props.stats, ORDRE_STATS)

  const inputClass = "w-full bg-transparent border-b border-theme/20 py-2 outline-none focus:border-theme-main transition-all font-garamond italic text-lg text-primary placeholder:opacity-20 shadow-none";
  const labelClass = "text-[10px] font-cinzel font-black uppercase tracking-[0.2em] text-theme-main/60 mb-1 block";

  return (
    <div className="flex flex-col gap-12 max-w-7xl mx-auto w-full pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      
      <div className="flex flex-col lg:flex-row gap-12 items-start">
        {/* SECTION : IDENTITÉ */}
        <div className="flex-1 flex flex-col gap-10 w-full">
          <div className="flex flex-col gap-6">
            <span className="text-[11px] font-cinzel font-black text-theme-main tracking-[0.4em] opacity-40">[ IDENTITÉ ]</span>
            
            <div className="flex flex-col">
              <label className={labelClass}>Appellation de l'Art</label>
              <input 
                className={inputClass}
                value={props.nom} 
                onChange={e => props.setNom(e.target.value)} 
                placeholder="Inscrivez le nom du sort..." 
              />
            </div>

            <div className="flex flex-col">
              <label className={labelClass}>Nature de la Technique</label>
              <select 
                className={inputClass}
                value={props.typeComp} 
                onChange={e => props.setTypeComp(e.target.value)}
              >
                <option value="active">Active (Au clic)</option>
                <option value="passive_auto">Passive (Automatique)</option>
                <option value="passive_toggle">Passive (Bascule ON/OFF)</option>
              </select>
            </div>

            <div className="flex flex-col">
              <label className={labelClass}>Récit & Description</label>
              <textarea 
                className={`${inputClass} min-h-[120px] resize-none overflow-hidden`}
                value={props.description} 
                onChange={e => props.setDescription(e.target.value)} 
                placeholder="Décrivez les effets, la portée et l'histoire de cet art..." 
              />
            </div>
          </div>

          {/* Affinités & Tags */}
          <div className="flex flex-col gap-4">
            <label className={labelClass}>Affinités & Signes</label>
            <div className="flex flex-wrap gap-2">
              {props.tags.map(t => {
                const isSelected = props.tagsChoisis.includes(t.id);
                return (
                  <button 
                    key={t.id} 
                    onClick={() => props.toggleTag(t.id)} 
                    className={`px-3 py-1.5 rounded-sm border text-[9px] font-cinzel font-black uppercase transition-all ${
                      isSelected 
                      ? 'bg-theme-main/10 border-theme-main text-theme-main shadow-lg' 
                      : 'bg-black/20 border-theme/10 opacity-30 text-primary hover:opacity-100 hover:border-theme/30'
                    }`}
                  >
                    {t.nom}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conditions Speciales (Passive Auto) */}
          {props.typeComp === 'passive_auto' && (
            <div className="flex flex-col gap-6 p-6 rounded-sm bg-black/20 border border-white/5 backdrop-blur-sm animate-in zoom-in-95 duration-300">
              <span className="text-[10px] font-cinzel font-black uppercase text-theme-main/60 flex items-center gap-2">
                <Zap size={14} /> Condition de Manifestation
              </span>
              
              <div className="flex flex-col gap-3">
                <label className="text-[9px] font-cinzel font-black uppercase opacity-40">Déclencheur (Tag présent)</label>
                <div className="flex flex-wrap gap-2">
                  {props.tags.map(t => (
                    <button 
                      key={t.id} 
                      onClick={() => props.toggleConditionTag(t.id)} 
                      className={`px-3 py-1 rounded-sm border text-[9px] font-cinzel font-black uppercase transition-all ${
                        props.conditionTags.includes(t.id) 
                        ? 'bg-theme-main border-theme-dark text-white' 
                        : 'bg-black/20 border-theme/10 opacity-30'
                      }`}
                    >
                      {t.nom}
                    </button>
                  ))}
                </div>
              </div>

              {props.conditionTags.length > 0 && (
                <div className="flex flex-col gap-3">
                  <label className="text-[9px] font-cinzel font-black uppercase opacity-40">Cible de la vérification</label>
                  <div className="flex gap-2">
                    {[
                      { id: 'item', label: 'Objet', icon: <Backpack size={12} /> },
                      { id: 'skill', label: 'Art', icon: <Sparkles size={12} /> },
                      { id: 'les_deux', label: 'Les deux', icon: <Shuffle size={12} /> }
                    ].map(type => (
                      <button
                        key={type.id}
                        onClick={() => props.setConditionType(type.id as any)}
                        className={`flex-1 py-2 rounded-sm text-[9px] font-cinzel font-black uppercase transition-all border flex items-center justify-center gap-2 ${
                          props.conditionType === type.id 
                          ? 'bg-theme-main border-theme-dark text-white shadow-lg shadow-theme-main/20' 
                          : 'bg-black/20 border-theme/10 opacity-30'
                        }`}
                      >
                        {type.icon} {type.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SECTION : MÉCANIQUES */}
        <div className="flex-[1.5] flex flex-col gap-10 w-full">
          <div className="flex flex-col gap-6 h-full">
            <span className="text-[11px] font-cinzel font-black text-theme-main tracking-[0.4em] opacity-40">[ PUISSANCE & EFFETS ]</span>
            
            <div className="flex gap-8 border-b border-theme/10 mb-2">
              {[
                { id: 'stats', label: 'Stats', icon: <BarChart2 size={14} /> },
                { id: 'ressources', label: 'Ressources', icon: <Droplets size={14} /> },
                { id: 'couts', label: 'Coûts', icon: <Swords size={14} /> },
                { id: 'dés', label: 'Dés', icon: <Dices size={14} /> }
              ].map(tab => (
                <button 
                  key={tab.id} 
                  onClick={() => setOnglet(tab.id as any)} 
                  className={`font-cinzel text-[11px] uppercase tracking-[0.3em] transition-all duration-500 relative py-2 flex items-center gap-2 ${
                    onglet === tab.id 
                    ? 'text-theme-main opacity-100' 
                    : 'text-primary opacity-30 hover:opacity-70'
                  }`}
                >
                  {tab.icon} {tab.label}
                  {onglet === tab.id && (
                    <div className="absolute bottom-0 left-0 w-full h-[1px] bg-theme-main shadow-[0_0_8px_var(--color-main)]" />
                  )}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-6">
              {onglet === 'stats' && (
                <div className="flex flex-col gap-6 animate-in fade-in duration-500">
                  {props.modifs.map((m, idx) => (
                    <div key={`m-${idx}`} className="flex flex-col gap-6 bg-black/20 p-6 rounded-sm border border-white/5 relative group backdrop-blur-sm">
                      <button onClick={() => props.removeModif(idx)} className="absolute top-2 right-2 opacity-20 hover:opacity-100 hover:text-red-500 transition-all p-2"><X size={16} /></button>
                      
                      <div className="flex flex-col sm:flex-row gap-6">
                        <div className="flex-1 flex flex-col">
                          <label className={labelClass}>Statistique</label>
                          <select 
                            className={inputClass}
                            value={m.id_stat} 
                            onChange={e => props.updateModif(idx, { id_stat: e.target.value })}
                          >
                            {sortedStats.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                          </select>
                        </div>
                        <div className="w-full sm:w-48 flex flex-col">
                          <label className={labelClass}>Type de Calcul</label>
                          <select 
                            className={inputClass}
                            value={m.type_calcul} 
                            onChange={e => props.updateModif(idx, { type_calcul: e.target.value as any, des_nb: e.target.value==='roll_dice'?1:null, des_faces: e.target.value==='roll_dice'?6:null, des_stat_id: e.target.value==='roll_stat'?sortedStats[0]?.id:null })}
                          >
                            <option value="fixe">Fixe</option>
                            <option value="pourcentage">Pourcentage</option>
                            <option value="roll_stat">Dé de Stat</option>
                            <option value="roll_dice">XdX</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-6">
                        {m.type_calcul === 'fixe' || m.type_calcul === 'pourcentage' ? (
                          <div className="col-span-full">
                            <label className={labelClass}>{m.type_calcul === 'pourcentage' ? "Valeur (%)" : "Valeur brute"}</label>
                            <input type="number" className={inputClass} value={m.valeur || 0} onChange={e => props.updateModif(idx, { valeur: parseInt(e.target.value) || 0 })} />
                          </div>
                        ) : m.type_calcul === 'roll_stat' ? (
                          <>
                            <div className="col-span-2">
                              <label className={labelClass}>Basé sur</label>
                              <select className={inputClass} value={m.des_stat_id || ''} onChange={e => props.updateModif(idx, { des_stat_id: e.target.value || null })}>{sortedStats.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}</select>
                            </div>
                            <div className="col-span-1">
                              <label className={labelClass}>Bonus</label>
                              <input type="number" className={inputClass} value={m.valeur || 0} onChange={e => props.updateModif(idx, { valeur: parseInt(e.target.value) || 0 })} />
                            </div>
                          </>
                        ) : (
                          <>
                            <div><label className={labelClass}>Nb Dés</label><input type="number" className={inputClass} value={m.des_nb || 1} onChange={e => props.updateModif(idx, { des_nb: parseInt(e.target.value) || 0 })} /></div>
                            <div><label className={labelClass}>Faces</label><input type="number" className={inputClass} value={m.des_faces || 6} onChange={e => props.updateModif(idx, { des_faces: parseInt(e.target.value) || 0 })} /></div>
                            <div><label className={labelClass}>Bonus</label><input type="number" className={inputClass} value={m.valeur || 0} onChange={e => props.updateModif(idx, { valeur: parseInt(e.target.value) || 0 })} /></div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  <button className="py-4 border-2 border-dashed border-theme/10 rounded-sm font-cinzel text-[10px] tracking-widest text-primary opacity-30 hover:opacity-100 hover:border-theme-main/30 transition-all" onClick={props.addModif}>+ AJOUTER UN MODIFICATEUR</button>
                </div>
              )}

              {['ressources', 'couts', 'dés'].includes(onglet) && (
                <div className="flex flex-col gap-6 animate-in fade-in duration-500">
                  {(onglet === 'ressources' ? props.effets : (onglet === 'couts' ? props.couts : props.jetsDes)).map((e, idx) => (
                    <div key={`${onglet}-${idx}`} className="flex flex-col gap-6 bg-black/20 p-6 rounded-sm border border-white/5 relative group backdrop-blur-sm">
                      <button onClick={() => props.removeEffet(idx, onglet as any)} className="absolute top-2 right-2 opacity-20 hover:opacity-100 hover:text-red-500 transition-all p-2"><X size={16} /></button>
                      
                      {onglet !== 'dés' && (
                        <div className="flex flex-col">
                          <label className={labelClass}>Jauge Affectée</label>
                          <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
                            {JAUGES.map(j => (
                              <button 
                                key={j.value} 
                                onClick={() => props.updateEffet(idx, { cible_jauge: j.value as any }, onglet as any)} 
                                className={`font-cinzel text-[10px] uppercase tracking-widest transition-all relative py-1 ${
                                  e.cible_jauge === j.value 
                                  ? 'text-white opacity-100' 
                                  : 'text-primary opacity-20 hover:opacity-60'
                                }`}
                                style={{ color: e.cible_jauge === j.value ? j.color : 'inherit' }}
                              >
                                {j.label}
                                {e.cible_jauge === j.value && (
                                  <div className="absolute bottom-0 left-0 w-full h-[1px]" style={{ backgroundColor: j.color, boxShadow: `0 0 8px ${j.color}` }} />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col gap-6">
                        <div className="flex gap-8 border-b border-white/5 pb-2">
                          {['fixe', 'roll_stat', 'roll_dice'].map(type => (
                            <button 
                              key={type} 
                              onClick={() => props.updateEffet(idx, { des_nb: type==='roll_dice'?1:null, des_faces: type==='roll_dice'?6:null, des_stat_id: type==='roll_stat'?sortedStats[0]?.id:null }, onglet as any)} 
                              className={`font-cinzel text-[9px] uppercase tracking-widest transition-all relative py-1 ${
                                (!e.des_nb && !e.des_stat_id && type === 'fixe') || (e.des_stat_id && type === 'roll_stat') || (e.des_nb && type === 'roll_dice') 
                                ? 'text-theme-main opacity-100' 
                                : 'text-primary opacity-20 hover:opacity-60'
                              }`}
                            >
                              {type === 'fixe' ? 'Valeur Fixe' : type === 'roll_stat' ? 'Jet de Stat' : 'Jet de Dés'}
                              {((!e.des_nb && !e.des_stat_id && type === 'fixe') || (e.des_stat_id && type === 'roll_stat') || (e.des_nb && type === 'roll_dice')) && (
                                <div className="absolute bottom-0 left-0 w-full h-[1px] bg-theme-main shadow-[0_0_8px_var(--color-main)]" />
                              )}
                            </button>
                          ))}
                        </div>

                        <div className="grid grid-cols-3 gap-6">
                          {!e.des_nb && !e.des_stat_id ? (
                            <div className="col-span-full">
                              <label className={labelClass}>{onglet === 'couts' ? "Coût spirituel" : "Amplitude de l'effet"}</label>
                              <input type="number" className={inputClass} value={Math.abs(e.valeur || 0)} onChange={ev => props.updateEffet(idx, { valeur: parseInt(ev.target.value) || 0 }, onglet as any)} />
                            </div>
                          ) : e.des_stat_id ? (
                            <>
                              <div className="col-span-2">
                                <label className={labelClass}>Basé sur</label>
                                <select className={inputClass} value={e.des_stat_id || ''} onChange={ev => props.updateEffet(idx, { des_stat_id: ev.target.value || null }, onglet as any)}>{sortedStats.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}</select>
                              </div>
                              <div className="col-span-1">
                                <label className={labelClass}>Bonus</label>
                                <input type="number" className={inputClass} value={e.valeur} onChange={ev => props.updateEffet(idx, { valeur: parseInt(ev.target.value) || 0 }, onglet as any)} />
                              </div>
                            </>
                          ) : (
                            <>
                              <div><label className={labelClass}>Nb Dés</label><input type="number" className={inputClass} value={e.des_nb || ''} onChange={ev => props.updateEffet(idx, { des_nb: parseInt(ev.target.value) || 0 }, onglet as any)} /></div>
                              <div><label className={labelClass}>Faces</label><input type="number" className={inputClass} value={e.des_faces || ''} onChange={ev => props.updateEffet(idx, { des_faces: parseInt(ev.target.value) || 0 }, onglet as any)} /></div>
                              <div><label className={labelClass}>Bonus</label><input type="number" className={inputClass} value={e.valeur} onChange={ev => props.updateEffet(idx, { valeur: parseInt(ev.target.value) || 0 }, onglet as any)} /></div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <button className="py-4 border-2 border-dashed border-theme/10 rounded-sm font-cinzel text-[10px] tracking-widest text-primary opacity-30 hover:opacity-100 hover:border-theme-main/30 transition-all" onClick={() => props.addEffet(onglet as any)}>+ AJOUTER UN EFFET</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ACTIONS FINALES */}
      <div className="flex gap-4 max-w-md mx-auto w-full pb-10">
        <Button variant="secondary" onClick={props.onCancel} 
          className="flex-1 font-cinzel tracking-widest text-[10px]">
          <X size={14} className="mr-2" /> RETOUR
        </Button>
        <Button 
          onClick={props.onSave}
          disabled={!props.nom}
          className="flex-[2] font-cinzel uppercase tracking-[0.2em] font-black py-4">
          <Save size={16} className="mr-2" />
          {props.idEdition ? "CONSOLIDER L'ART" : 'GRAVER DANS LE CODEX'}
        </Button>
      </div>
    </div>
  )
}
