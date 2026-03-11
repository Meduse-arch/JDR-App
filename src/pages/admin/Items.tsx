import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { useItems } from '../../hooks/useItems'
import { itemsService } from '../../services/itemsService'
import { Modificateur, CategorieItem, Item } from '../../types'
import { CATEGORIES, CATEGORIE_EMOJI } from '../../utils/constants'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { ConfirmButton } from '../../components/ui/ConfirmButton'
import { Badge } from '../../components/ui/Badge'
import { formatLabelModif } from '../../utils/formatters'

const RESSOURCES_MODIFS = [
  { type: 'hp', label: 'PV Actuel' },
  { type: 'hp_max', label: 'PV Max' },
  { type: 'mana', label: 'Mana Actuel' },
  { type: 'mana_max', label: 'Mana Max' },
  { type: 'stam', label: 'Stam Actuelle' },
  { type: 'stam_max', label: 'Stam Max' }
]

export default function Items() {
  const sessionActive = useStore(s => s.sessionActive)
  const compte = useStore(s => s.compte)
  const { items, stats, charger, supprimerItem } = useItems()
  
  const [vue, setVue] = useState<'liste' | 'creer'>('liste')
  const [enCours, setEnCours] = useState(false)
  const [itemDetail, setItemDetail] = useState<Item | null>(null)

  const [form, setForm] = useState({ nom: '', description: '', categorie: 'Divers' as CategorieItem })
  const [modifs, setModifs] = useState<Partial<Modificateur>[]>([])

  const [filtre, setFiltre] = useState('Tous')
  const [recherche, setRecherche] = useState('')

  const handleCreer = async () => {
    if (!sessionActive || !form.nom || enCours) return
    setEnCours(true)
    const success = await itemsService.createItem(sessionActive.id, compte?.id, form, modifs)
    if (success) {
      await charger()
      setVue('liste'); setForm({ nom: '', description: '', categorie: 'Divers' }); setModifs([])
    }
    setEnCours(false)
  }

  const toggleStatModif = (idStat: string) => {
    const exists = modifs.find(m => m.id_stat === idStat)
    if (exists) setModifs(modifs.filter(m => m.id_stat !== idStat))
    else setModifs([...modifs, { id_stat: idStat, type: 'stat', valeur: 1 }])
  }

  const toggleResModif = (type: string) => {
    const exists = modifs.find(m => m.type === type && !m.id_stat)
    if (exists) setModifs(modifs.filter(m => !(m.type === type && !m.id_stat)))
    else setModifs([...modifs, { type, valeur: 1 }])
  }

  const updateValeurModif = (idx: number, val: number) => {
    const newModifs = [...modifs]
    newModifs[idx].valeur = val
    setModifs(newModifs)
  }

  const itemsFiltrés = items.filter(i => (filtre === 'Tous' || i.categorie === filtre) && i.nom.toLowerCase().includes(recherche.toLowerCase()))

  return (
    <div className="flex flex-col h-full p-4 md:p-8 overflow-y-auto custom-scrollbar" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight" style={{ background: 'linear-gradient(135deg, var(--color-light), var(--color-accent2))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            🎒 Forge des Objets
          </h2>
          <p className="text-sm opacity-60 mt-1">Créez les trésors de votre univers</p>
        </div>
        <Button variant={vue === 'liste' ? 'primary' : 'secondary'} onClick={() => setVue(vue === 'liste' ? 'creer' : 'liste')}>
          {vue === 'liste' ? '+ Nouvel Item' : '✕ Fermer'}
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
              <textarea className="w-full bg-surface border border-border rounded-xl p-4 min-h-[100px] outline-none focus:border-main text-sm italic" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </div>
          </Card>

          <div className="flex flex-col gap-6">
            <Card className="p-8 flex flex-col gap-6 bg-black/40 border-white/5">
              <div className="flex flex-col gap-2">
                <h3 className="font-black uppercase tracking-widest text-[10px] text-main">📊 Statistiques</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {stats.map(s => (
                    <button key={s.id} onClick={() => toggleStatModif(s.id)} className={`p-2 rounded-xl border transition-all text-[9px] font-black uppercase ${modifs.find(m => m.id_stat === s.id) ? 'bg-main/20 border-main text-main' : 'bg-white/5 border-white/10 opacity-30'}`}>
                      {s.nom}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="font-black uppercase tracking-widest text-[10px] text-main">❤️ Ressources</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {RESSOURCES_MODIFS.map(r => (
                    <button key={r.type} onClick={() => toggleResModif(r.type)} className={`p-2 rounded-xl border transition-all text-[9px] font-black uppercase ${modifs.find(m => m.type === r.type && !m.id_stat) ? 'bg-main/20 border-main text-main' : 'bg-white/5 border-white/10 opacity-30'}`}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {modifs.length > 0 && (
                <div className="mt-4 pt-6 border-t border-white/5 flex flex-col gap-3">
                  {modifs.map((m, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/5 shadow-inner">
                      <span className="text-[10px] font-black uppercase text-main">
                        {m.id_stat ? stats.find(s => s.id === m.id_stat)?.nom : RESSOURCES_MODIFS.find(r => r.type === m.type)?.label}
                      </span>
                      <div className="flex items-center gap-3">
                        <button onClick={() => updateValeurModif(idx, (m.valeur || 0) - 1)} className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 font-bold">-</button>
                        <input 
                          type="number" 
                          value={m.valeur} 
                          onChange={(e) => updateValeurModif(idx, parseInt(e.target.value) || 0)}
                          className="w-12 bg-transparent text-center font-black text-sm outline-none focus:text-main"
                        />
                        <button onClick={() => updateValeurModif(idx, (m.valeur || 0) + 1)} className="w-6 h-6 rounded-lg bg-main/20 hover:bg-main/40 font-bold text-main">+</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            <Button size="lg" className="w-full py-6 text-lg uppercase tracking-widest shadow-2xl" onClick={handleCreer} disabled={!form.nom || enCours}>
              {enCours ? 'Forge en cours...' : 'Forger le trésor ✓'}
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
                  <div onClick={e => e.stopPropagation()}>
                    <ConfirmButton variant="danger" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity" onConfirm={() => supprimerItem(item.id)}>🗑️</ConfirmButton>
                  </div>
                </div>
                <h3 className="font-black text-sm uppercase truncate pr-4 text-white">{item.nom}</h3>
                <div className="mt-auto flex flex-wrap gap-1 pt-2">
                  {(item as any).item_modificateurs?.slice(0, 2).map((m: any, i: number) => (
                    <Badge key={i} variant="default" className="text-[8px] py-0.5 px-1.5 font-black bg-main/10 text-main border-main/10 uppercase truncate max-w-full">
                      {formatLabelModif(m, stats)}
                    </Badge>
                  ))}
                  {((item as any).item_modificateurs?.length || 0) > 2 && (
                    <Badge variant="default" className="text-[8px] py-0.5 px-1.5 font-black bg-main/10 text-main border-main/10 uppercase">
                      +{((item as any).item_modificateurs.length - 2)}...
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
            
            {(itemDetail as any).item_modificateurs?.length > 0 && (
              <div className="flex flex-col gap-2 mt-4">
                <p className="text-[10px] font-black uppercase opacity-40">Statistiques & Attributs :</p>
                <div className="flex flex-wrap gap-2">
                  {(itemDetail as any).item_modificateurs.map((m: any, i: number) => (
                    <Badge key={i} variant="default" className="text-xs py-1 px-2 font-black bg-main/10 text-main border-main/10 uppercase">
                      {formatLabelModif(m, stats)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex justify-end mt-4">
              <ConfirmButton onConfirm={() => { setItemDetail(null); supprimerItem(itemDetail.id); }}>🗑️ Supprimer l'objet</ConfirmButton>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
