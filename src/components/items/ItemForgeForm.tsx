import { Stat, Modificateur, EffetActif, Tag, CategorieItem } from '../../types'
import { Card } from '../ui/card'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'
import { CATEGORIES, ORDRE_STATS } from '../../utils/constants'
import { statsEngine } from '../../utils/statsEngine'
import { Sword, Shield, Gem, FlaskConical, Sparkles, Package, Tags, BarChart2, Zap, Check, Plus, Minus, X } from 'lucide-react'

const RESSOURCES_MODIFS = [
  { type: 'hp', label: 'PV Actuel' },
  { type: 'mana', label: 'Mana Actuel' },
  { type: 'stam', label: 'Stam Actuelle' }
]

interface Props {
  stats: Stat[]
  tags: Tag[]
  form: { nom: string; description: string; categorie: CategorieItem; image_url?: string | null }
  setForm: (f: any) => void
  modifs: Partial<Modificateur>[]
  effets: Partial<EffetActif>[]
  tagsChoisis: string[]
  enCours: boolean
  idEdition: string | null
  onSave: () => Promise<boolean>
  onCancel: () => void
  toggleStatModif: (id: string) => void
  toggleResModif: (type: string) => void
  updateModif: (idx: number, updates: Partial<Modificateur>) => void
  updateEffet: (idx: number, updates: Partial<EffetActif>) => void
  toggleTag: (id: string) => void
}

export default function ItemForgeForm(props: Props) {
  const sortedStats = statsEngine.trierStats(props.stats, ORDRE_STATS)

  const getIcon = (cat: CategorieItem) => {
    switch (cat) {
      case 'Arme': return <Sword size={14} />;
      case 'Armure': return <Shield size={14} />;
      case 'Bijou': return <Gem size={14} />;
      case 'Consommable': return <FlaskConical size={14} />;
      case 'Artéfact': return <Sparkles size={14} />;
      default: return <Package size={14} />;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto w-full pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      {/* IDENTITÉ DE LA RELIQUE */}
      <Card className="medieval-border p-8 flex flex-col gap-8 h-fit bg-card/40 backdrop-blur-md">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-cinzel font-black uppercase tracking-[0.2em] text-theme-main ml-1">Appellation</label>
          <Input 
            value={props.form.nom} 
            onChange={e => props.setForm({...props.form, nom: e.target.value})} 
            placeholder="Nom de la relique..." 
            className="font-garamond font-bold text-lg"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-cinzel font-black uppercase tracking-[0.2em] text-theme-main ml-1">URL de l'image (optionnel)</label>
          <Input 
            value={props.form.image_url || ''} 
            onChange={e => props.setForm({...props.form, image_url: e.target.value})} 
            placeholder="https://exemple.com/image.png" 
            className="font-garamond text-sm"
          />
        </div>
        
        <div className="flex flex-col gap-3">
          <label className="text-[10px] font-cinzel font-black uppercase tracking-[0.2em] text-theme-main ml-1">Nature de l'objet</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button 
                key={cat} 
                onClick={() => props.setForm({...props.form, categorie: cat})} 
                className={`px-4 py-2.5 rounded-sm text-[10px] font-cinzel font-black uppercase transition-all border flex items-center gap-2 ${
                  props.form.categorie === cat 
                  ? 'bg-theme-main border-theme-dark text-white shadow-lg' 
                  : 'bg-black/20 border-theme/20 opacity-40 text-primary hover:opacity-100'
                }`}
              >
                {getIcon(cat)} {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-[10px] font-cinzel font-black uppercase tracking-[0.2em] text-theme-main ml-1 flex items-center gap-2">
            <Tags size={14} /> Affinités & Mots-clés
          </label>
          <div className="flex flex-wrap gap-2">
            {props.tags.map(tag => (
              <button 
                key={tag.id} 
                onClick={() => props.toggleTag(tag.id)} 
                className={`px-3 py-1.5 rounded-sm border text-[10px] font-cinzel font-black uppercase transition-all ${
                  props.tagsChoisis.includes(tag.id) 
                  ? 'bg-theme-main/10 border-theme-main text-theme-main shadow-sm' 
                  : 'bg-black/20 border-theme/20 opacity-40 text-primary hover:opacity-100'
                }`}
              >
                {tag.nom}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-cinzel font-black uppercase tracking-[0.2em] text-theme-main ml-1">Description manuscrite</label>
          <textarea 
            className="w-full bg-black/20 border border-theme/30 rounded-sm p-4 min-h-[150px] outline-none focus:border-theme-main text-sm italic font-garamond font-bold text-primary transition-all" 
            value={props.form.description} 
            onChange={e => props.setForm({...props.form, description: e.target.value})} 
            placeholder="Décrivez l'origine et les propriétés de cette relique..." 
          />
        </div>

        <div className="flex gap-4 pt-4">
          <Button variant="secondary" onClick={props.onCancel} className="flex-1 font-cinzel tracking-widest text-[10px]">
            <X size={14} className="mr-2" /> ANNULER
          </Button>
          <Button 
            onClick={props.onSave} 
            className="flex-[2] font-cinzel uppercase tracking-[0.2em] font-black py-4" 
            disabled={!props.form.nom || props.enCours}
          >
             <Check size={18} className="mr-2" /> {props.enCours ? 'GRAVURE...' : 'GRAVER DANS LE CODEX'}
          </Button>
        </div>
      </Card>

      {/* MÉCANIQUES DE LA RELIQUE */}
      <div className="flex flex-col gap-8">
        <Card className="medieval-border p-8 flex flex-col gap-10 bg-card/60 backdrop-blur-md">
          <div className="flex flex-col gap-6">
            <h3 className="font-cinzel font-black uppercase tracking-[0.2em] text-xs text-theme-main flex items-center gap-3 border-b border-theme/20 pb-4">
              <BarChart2 size={18} /> Statistiques & Attributs
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {sortedStats.map(s => (
                <button 
                  key={s.id} 
                  onClick={() => props.toggleStatModif(s.id)} 
                  className={`p-3 rounded-sm border transition-all text-[9px] font-cinzel font-black uppercase ${
                    props.modifs.find(m => m.id_stat === s.id) 
                    ? 'bg-theme-main/20 border-theme-main text-theme-main shadow-sm' 
                    : 'bg-black/20 border-theme/20 opacity-30 text-primary hover:opacity-100'
                  }`}
                >
                  {s.nom}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <h3 className="font-cinzel font-black uppercase tracking-[0.2em] text-xs text-theme-main flex items-center gap-3 border-b border-theme/20 pb-4">
              <Zap size={18} /> Effets de Jauge
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {RESSOURCES_MODIFS.map(r => (
                <button 
                  key={r.type} 
                  onClick={() => props.toggleResModif(r.type)} 
                  className={`p-3 rounded-sm border transition-all text-[9px] font-cinzel font-black uppercase ${
                    props.effets.find(e => e.cible_jauge === r.type) 
                    ? 'bg-theme-main/20 border-theme-main text-theme-main shadow-sm' 
                    : 'bg-black/20 border-theme/20 opacity-30 text-primary hover:opacity-100'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {(props.modifs.length > 0 || props.effets.length > 0) && (
            <div className="mt-4 pt-8 border-t border-theme/20 flex flex-col gap-6 animate-in fade-in duration-500">
              <p className="text-[10px] font-cinzel font-black uppercase tracking-widest text-theme-light opacity-40 text-center">Valeurs des Enchantements</p>
              
              {props.modifs.map((m, idx) => (
                <div key={`m-${idx}`} className="flex flex-col gap-4 bg-black/30 p-5 rounded-sm border border-theme/20 shadow-inner relative group">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-cinzel font-black uppercase text-theme-main tracking-widest">{props.stats.find(s => s.id === m.id_stat)?.nom}</span>
                    <div className="flex items-center gap-3">
                      <button onClick={() => props.updateModif(idx, { valeur: (m.valeur || 0) - 1 })} className="w-8 h-8 rounded-sm bg-black/40 hover:bg-black/60 transition-colors flex items-center justify-center text-primary"><Minus size={14} /></button>
                      <input type="number" value={m.valeur} onChange={(e) => props.updateModif(idx, { valeur: parseInt(e.target.value) || 0 })} className="w-12 bg-transparent text-center font-cinzel font-black text-sm outline-none text-primary" />
                      <button onClick={() => props.updateModif(idx, { valeur: (m.valeur || 0) + 1 })} className="w-8 h-8 rounded-sm bg-theme-main/20 text-theme-main hover:bg-theme-main/30 transition-colors flex items-center justify-center"><Plus size={14} /></button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Select value={m.type_calcul} onChange={e => props.updateModif(idx, { type_calcul: e.target.value as any })} className="text-[9px] h-10 flex-1 font-cinzel">
                      <option value="fixe">VALEUR FIXE</option>
                      <option value="pourcentage">POURCENTAGE (%)</option>
                      <option value="roll_stat">DÉ DE STAT</option>
                      <option value="roll_dice">XdX</option>
                    </Select>
                    <Select value={m.id_tag || ''} onChange={e => props.updateModif(idx, { id_tag: e.target.value || null })} className="text-[9px] h-10 flex-1 font-cinzel">
                      <option value="">AUCUN TAG</option>
                      {props.tags.map(t => <option key={t.id} value={t.id}>{t.nom}</option>)}
                    </Select>
                  </div>
                </div>
              ))}

              {props.effets.map((e, idx) => (
                <div key={`e-${idx}`} className="flex flex-col gap-4 bg-black/30 p-5 rounded-sm border border-theme/20 shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-cinzel font-black uppercase text-blue-400 tracking-widest">{RESSOURCES_MODIFS.find(r => r.type === e.cible_jauge)?.label}</span>
                    <div className="flex items-center gap-3">
                      <button onClick={() => props.updateEffet(idx, { valeur: (e.valeur || 0) - 1 })} className="w-8 h-8 rounded-sm bg-black/40 hover:bg-black/60 transition-colors flex items-center justify-center text-primary"><Minus size={14} /></button>
                      <input type="number" value={e.valeur} onChange={(ev) => props.updateEffet(idx, { valeur: parseInt(ev.target.value) || 0 })} className="w-12 bg-transparent text-center font-cinzel font-black text-sm outline-none text-primary" />
                      <button onClick={() => props.updateEffet(idx, { valeur: (e.valeur || 0) + 1 })} className="w-8 h-8 rounded-sm bg-theme-main/20 text-theme-main hover:bg-theme-main/30 transition-colors flex items-center justify-center"><Plus size={14} /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Input type="number" value={e.des_nb || ''} onChange={val => props.updateEffet(idx, { des_nb: parseInt(val.target.value) || null })} placeholder="Nb" className="h-10 text-[10px] font-cinzel" />
                    <Input type="number" value={e.des_faces || ''} onChange={val => props.updateEffet(idx, { des_faces: parseInt(val.target.value) || null })} placeholder="Faces" className="h-10 text-[10px] font-cinzel" />
                    <Select value={e.des_stat_id || ''} onChange={val => props.updateEffet(idx, { des_stat_id: val.target.value || null })} className="h-10 text-[9px] font-cinzel">
                      <option value="">PAS DE STAT</option>
                      {sortedStats.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
