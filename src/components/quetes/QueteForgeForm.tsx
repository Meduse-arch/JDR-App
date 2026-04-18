import { Quete, Recompense, Item, Personnage } from '../../types'
import { Card } from '../ui/card'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'
import { Scroll, Sparkles, Gift, Trash2, Save, X, Target, PenTool } from 'lucide-react'

interface Props {
  joueurs: Personnage[]
  itemsDispos: Item[]
  form: Partial<Quete>
  setForm: (f: any) => void
  recompenses: Partial<Recompense>[]
  participants: string[]
  sauvegardant: boolean
  onSave: () => Promise<boolean>
  onCancel: () => void
  addRecompense: (type: 'Item' | 'Autre') => void
  removeRecompense: (idx: number) => void
  updateRecompense: (idx: number, updates: Partial<Recompense>) => void
  toggleParticipant: (id: string) => void
}

export default function QueteForgeForm(props: Props) {
  return (
    <Card className="max-w-4xl mx-auto w-full flex flex-col gap-8 p-8 md:p-12 mb-10 medieval-border bg-card/40 backdrop-blur-md shadow-2xl border-white/5 relative overflow-hidden">
      {/* Watermark décoratif */}
      <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
        <PenTool size={120} />
      </div>

      <div className="flex flex-col gap-2 border-b border-theme-main/20 pb-6">
        <h3 className="text-2xl font-cinzel font-black uppercase tracking-[0.2em] text-theme-main flex items-center gap-3">
          <Scroll size={24} /> La Forge de Destins
        </h3>
        <p className="font-garamond italic text-secondary text-sm">Préparez un nouveau récit pour vos aventuriers...</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="flex flex-col gap-6">
          <Input 
            label="Intitulé de l'Épopée" 
            value={props.form.titre} 
            onChange={e => props.setForm({...props.form, titre: e.target.value})} 
            placeholder="Nom de l'aventure..." 
            className="font-cinzel font-bold uppercase tracking-widest bg-black/20 border-white/10"
          />
          
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-theme-main opacity-60 ml-1">Récit & Lore</label>
            <textarea 
              className="w-full bg-black/30 border border-white/10 rounded-xl p-4 min-h-[200px] outline-none focus:border-theme-main/50 text-lg font-garamond italic text-secondary leading-relaxed transition-all shadow-inner custom-scrollbar" 
              placeholder="Inscrivez ici le détail de la quête, les secrets et les enjeux..."
              value={props.form.description} 
              onChange={e => props.setForm({...props.form, description: e.target.value})} 
            />
          </div>
        </div>

        <div className="flex flex-col gap-8">
          {/* Récompenses */}
          <div className="flex flex-col gap-4 p-6 rounded-2xl bg-black/40 border border-white/5 shadow-inner">
            <div className="flex justify-between items-center mb-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-theme-main">Butin de Victoire</label>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => props.addRecompense('Item')} className="text-[10px] py-1 font-cinzel">
                  <Gift size={12} className="mr-1.5" /> + Objet
                </Button>
                <Button size="sm" variant="secondary" onClick={() => props.addRecompense('Autre')} className="text-[10px] py-1 font-cinzel">
                  <Sparkles size={12} className="mr-1.5" /> + Prime
                </Button>
              </div>
            </div>
            
            <div className="flex flex-col gap-3 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
              {props.recompenses.length === 0 && (
                <div className="text-center py-6 opacity-20 italic font-garamond border-2 border-dashed border-white/5 rounded-xl">
                  Aucun trésor n'est encore prévu...
                </div>
              )}
              {props.recompenses.map((rec, idx) => (
                <div key={idx} className="flex flex-col gap-3 bg-white/5 p-4 rounded-xl border border-white/5 hover:border-theme-main/20 transition-all">
                  <div className="flex items-center gap-3">
                    {rec.type === 'Item' ? (
                      <>
                        <Select 
                          className="flex-1 !py-2 bg-black/40 border-white/10 font-cinzel text-xs" 
                          value={rec.id_item || ''} 
                          onChange={e => props.updateRecompense(idx, { id_item: e.target.value })}
                        >
                          <option value="">Choisir un objet...</option>
                          {props.itemsDispos.map(i => <option key={i.id} value={i.id}>{i.nom}</option>)}
                        </Select>
                        <input 
                          type="number" 
                          className="w-16 bg-black/40 text-center rounded-lg py-2 border border-white/10 text-theme-main font-bold" 
                          value={rec.valeur} 
                          onChange={e => props.updateRecompense(idx, { valeur: parseInt(e.target.value) || 1 })} 
                        />
                      </>
                    ) : (
                      <input 
                        className="flex-1 bg-black/40 text-sm font-garamond italic border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-theme-main/30" 
                        placeholder="Ex: 500 Pièces d'or, Faveur divine..." 
                        value={rec.description || ''} 
                        onChange={e => props.updateRecompense(idx, { description: e.target.value })} 
                      />
                    )}
                    <button className="text-red-400 opacity-30 hover:opacity-100 transition-opacity p-1" onClick={() => props.removeRecompense(idx)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Participants */}
          <div className="flex flex-col gap-4 p-6 rounded-2xl bg-black/40 border border-white/5 shadow-inner">
            <label className="text-[10px] font-black uppercase tracking-widest text-theme-main flex items-center gap-2">
              <Target size={14} /> Destinataires du Récit
            </label>
            <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-1">
              {props.joueurs.map(j => {
                const estAssigné = props.participants.includes(j.id)
                return (
                  <button 
                    key={j.id} 
                    onClick={() => props.toggleParticipant(j.id)} 
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                      estAssigné 
                        ? 'bg-theme-main border-theme-main text-white shadow-lg shadow-theme-main/20' 
                        : 'bg-black/20 border-white/10 opacity-30 hover:opacity-60'
                    }`}
                  >
                    {j.nom}
                  </button>
                )
              })}
              {props.joueurs.length === 0 && (
                <div className="text-[10px] opacity-20 italic">Aucun voyageur disponible...</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-theme-main/20">
        <Button variant="secondary" onClick={props.onCancel} className="flex-1 font-cinzel py-4 border-white/10 gap-2">
          <X size={18} /> Abandonner
        </Button>
        <Button size="lg" className="flex-[2] font-cinzel py-4 tracking-[0.2em] text-base gap-2" onClick={props.onSave} disabled={props.sauvegardant}>
           {props.sauvegardant ? (
             <><Sparkles size={18} className="animate-spin" /> Inscription...</>
           ) : (
             <><Save size={18} /> Inscrire le Récit dans le Temps</>
           )}
        </Button>
      </div>
    </Card>
  )
}
