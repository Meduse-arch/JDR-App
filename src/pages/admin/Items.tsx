import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { useItems } from '../../hooks/useItems'
import { Modificateur, CategorieItem } from '../../types'
import { CATEGORIES, CATEGORIE_EMOJI } from '../../utils/constants'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { ConfirmButton } from '../../components/ui/ConfirmButton'
import { Badge } from '../../components/ui/Badge'
import { formatLabelModif } from '../../utils/formatters'

export default function Items() {
  const sessionActive = useStore(s => s.sessionActive)
  const compte = useStore(s => s.compte)

  const { items, stats, itemModifs, creerItem, supprimerItem } = useItems()
  const [vue, setVue] = useState<'liste' | 'creer'>('liste')
  const [enCours, setEnCours] = useState(false)

  const [nom, setNom] = useState('')
  const [description, setDescription] = useState('')
  const [categorie, setCategorie] = useState<CategorieItem>('Divers')
  const [modifs, setModifs] = useState<Partial<Modificateur>[]>([])

  const [recherche, setRecherche] = useState('')
  const [filtreCategorie, setFiltreCategorie] = useState<string>('Tous')

  const handleCreer = async () => {
    if (!sessionActive || !nom || enCours) return
    
    setEnCours(true)
    console.log("Début création item...", { nom, categorie, modifs });
    
    try {
      const success = await creerItem(
        compte?.id,
        { nom, description, categorie },
        modifs
      )
      
      if (success) {
        console.log("Item créé avec succès !");
        setVue('liste'); 
        setNom(''); 
        setDescription(''); 
        setCategorie('Divers'); 
        setModifs([])
      }
    } catch (err) {
      console.error("Erreur fatale lors de la création:", err);
      alert("Une erreur critique est survenue. Vérifie la console.");
    } finally {
      setEnCours(false)
    }
  }

  const toggleModif = (type: string, idStat: string | null = null) => {
    const exists = modifs.find(m => m.type === type && m.id_stat === idStat)
    if (exists) {
      setModifs(modifs.filter(m => !(m.type === type && m.id_stat === idStat)))
    } else {
      setModifs([...modifs, { type, id_stat: idStat, valeur: 1 }])
    }
  }

  const updateValeurModif = (idx: number, val: number) => {
    const newModifs = [...modifs]
    newModifs[idx].valeur = val
    setModifs(newModifs)
  }

  const getLabel = (type: string, idStat: string | null) => {
    if (idStat) return stats.find(s => s.id === idStat)?.nom || 'Stat Inconnue'
    const labels: Record<string, string> = {
      hp_max: 'PV Maximum',
      mana_max: 'Mana Maximum',
      stam_max: 'Endurance Max'
    }
    return labels[type] || type.toUpperCase()
  }

  if (vue === 'creer') return (
    <div className="flex flex-col h-full p-3 md:p-8 overflow-y-auto custom-scrollbar">
      <div className="flex justify-between items-center mb-6 md:mb-8 gap-4">
        <h2 className="text-2xl md:text-3xl font-black uppercase italic">Forger un Objet</h2>
        <Button variant="secondary" size="sm" onClick={() => setVue('liste')}>Retour</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8 max-w-6xl mx-auto w-full pb-20">
        <Card className="p-4 md:p-8 flex flex-col gap-4 md:gap-6 h-fit">
          <Input label="Nom de l'objet" placeholder="Ex: Anneau de Force" value={nom} onChange={e => setNom(e.target.value)} />
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase opacity-40 ml-1">Catégorie</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setCategorie(cat)} className={`px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-[10px] md:text-xs font-bold transition-all border ${categorie === cat ? 'bg-main border-main text-white' : 'bg-white/5 border-white/10 opacity-60'}`}>
                  {CATEGORIE_EMOJI[cat]} {cat}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase opacity-40 ml-1">Description</label>
            <textarea className="w-full bg-surface border border-border rounded-xl p-3 md:p-4 min-h-[80px] md:min-h-[100px] outline-none focus:border-main text-sm" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
        </Card>

        <div className="flex flex-col gap-4 md:gap-6">
          <Card className="p-4 md:p-8 flex flex-col gap-6">
            <h3 className="font-black uppercase tracking-widest text-xs text-main">Propriétés & Effets</h3>
            
            <div className="flex flex-col gap-6 md:gap-8">
              {/* VITALITÉ */}
              <div>
                <p className="text-[9px] font-black uppercase opacity-30 mb-3 tracking-widest">❤️ Vitalité & Ressources</p>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <p className="text-[8px] font-bold opacity-40 uppercase text-center">Bonus Permanent (Max)</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'hp_max', label: 'PV Max', icon: '⬆️❤️' },
                        { id: 'mana_max', label: 'Mana Max', icon: '⬆️💧' },
                        { id: 'stam_max', label: 'Endu. Max', icon: '⬆️⚡' }
                      ].map(res => (
                        <button key={res.id} onClick={() => toggleModif(res.id)} className={`p-2 rounded-xl border transition-all flex flex-col items-center gap-1 ${modifs.find(m => m.type === res.id) ? 'bg-main/20 border-main' : 'bg-white/5 border-white/10 opacity-60'}`}>
                          <span className="text-sm">{res.icon}</span>
                          <span className="text-[7px] font-black uppercase text-center leading-none">{res.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-[8px] font-bold opacity-40 uppercase text-center">Effet Immédiat (Soin/Restaur.)</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'hp', label: 'Soin PV', icon: '❤️' },
                        { id: 'mana', label: 'Restaure Mana', icon: '💧' },
                        { id: 'stam', label: 'Restaure Endu.', icon: '⚡' }
                      ].map(res => (
                        <button key={res.id} onClick={() => toggleModif(res.id)} className={`p-2 rounded-xl border transition-all flex flex-col items-center gap-1 ${modifs.find(m => m.type === res.id) ? 'bg-main/20 border-main' : 'bg-white/5 border-white/10 opacity-60'}`}>
                          <span className="text-sm">{res.icon}</span>
                          <span className="text-[7px] font-black uppercase text-center leading-none">{res.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[9px] font-black uppercase opacity-30 mb-3 tracking-widest">⚔️ Statistiques de Base</p>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {stats.map(s => (
                    <button key={s.id} onClick={() => toggleModif('stat', s.id)} className={`p-2 rounded-xl border transition-all flex flex-col items-center gap-1 ${modifs.find(m => m.id_stat === s.id) ? 'bg-main/20 border-main' : 'bg-white/5 border-white/10 opacity-60'}`}>
                      <span className="text-[8px] font-black uppercase text-center leading-none">{s.nom.slice(0, 4)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {modifs.length > 0 && (
              <div className="mt-4 pt-6 border-t border-white/5 flex flex-col gap-3">
                <p className="text-[9px] font-black uppercase opacity-30">Valeur des effets</p>
                {modifs.map((m, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-black/20 p-2 md:p-3 rounded-xl border border-white/5">
                    <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-main">{getLabel(m.type!, m.id_stat || null)}</span>
                    <div className="flex items-center gap-2 md:gap-3">
                      <button onClick={() => updateValeurModif(idx, m.valeur! - 1)} className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 font-bold text-xs">-</button>
                      <input 
                        type="number"
                        value={m.valeur}
                        onChange={e => updateValeurModif(idx, parseInt(e.target.value) || 0)}
                        className="w-10 bg-transparent text-center font-black text-xs md:text-sm text-white outline-none border-b border-transparent focus:border-main transition-colors"
                      />
                      <button onClick={() => updateValeurModif(idx, m.valeur! + 1)} className="w-6 h-6 rounded-lg bg-main/20 hover:bg-main/40 font-bold text-xs text-main">+</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Button size="lg" className="w-full py-4 md:py-6 text-sm md:text-lg uppercase tracking-widest" onClick={handleCreer} disabled={!nom || enCours}>
            {enCours ? 'Forge en cours...' : "Forger l'objet ✓"}
          </Button>
        </div>
      </div>
    </div>
  )

  const itemsFiltres = items
    .filter(item => filtreCategorie === 'Tous' || item.categorie === filtreCategorie)
    .filter(item => item.nom.toLowerCase().includes(recherche.toLowerCase()))

  return (
    <div className="flex flex-col h-full p-4 md:p-8 overflow-y-auto custom-scrollbar">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 border-b border-white/5 pb-6 gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter">🎒 Bibliothèque d'Items</h2>
          <p className="text-xs md:text-sm opacity-50">Objets magiques et équipements</p>
        </div>
        <Button size="sm" onClick={() => setVue('creer')}>+ Nouvel Item</Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="w-full md:max-w-md">
          <Input 
            icon="🔍" placeholder="Rechercher un objet..." 
            value={recherche} onChange={e => setRecherche(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          {['Tous', ...CATEGORIES].map(cat => (
            <Button
              key={cat}
              variant={filtreCategorie === cat ? 'active' : 'secondary'}
              size="sm"
              onClick={() => setFiltreCategorie(cat)}
              className="whitespace-nowrap"
            >
              {cat === 'Tous' ? 'Tout voir' : `${CATEGORIE_EMOJI[cat]} ${cat}`}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
        {itemsFiltres.map(item => (
          <Card key={item.id} className="flex-col gap-3 group relative overflow-visible h-full min-h-[140px] p-4 md:p-5">
            <div className="flex justify-between items-start w-full">
              <Badge variant="outline" className="text-[7px] md:text-[8px]">{CATEGORIE_EMOJI[item.categorie]} {item.categorie}</Badge>
              <div className="shrink-0 flex gap-1">
                <ConfirmButton 
                  variant="danger" 
                  size="sm" 
                  confirmText="OK?"
                  className="sm:opacity-0 group-hover:opacity-100 transition-opacity" 
                  onConfirm={() => supprimerItem(item.id)}
                >
                  🗑️
                </ConfirmButton>
              </div>
            </div>
            <h3 className="font-black text-xs md:text-sm uppercase truncate pr-2" title={item.nom}>{item.nom}</h3>
            {item.description && <p className="text-[9px] md:text-[10px] opacity-50 line-clamp-2 italic leading-relaxed">"{item.description}"</p>}
            
            <div className="flex flex-wrap gap-1 mt-auto pt-2">
              {itemModifs[item.id]?.length > 0 ? (
                itemModifs[item.id].map((m, i) => (
                  <Badge key={i} variant="default" className="text-[8px] md:text-[9px] py-0.5 px-2">
                    {formatLabelModif(m, stats)}
                  </Badge>
                ))
              ) : (
                <span className="text-[7px] md:text-[8px] opacity-20 uppercase font-black tracking-tighter">Aucun bonus</span>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
