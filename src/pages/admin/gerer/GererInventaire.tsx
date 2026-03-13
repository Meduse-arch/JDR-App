import { useEffect, useState } from 'react'
import { supabase } from '../../../supabase'
import { useItems } from '../../../hooks/useItems'
import { CATEGORIES, CATEGORIE_EMOJI } from '../../../utils/constants'
import { formatLabelModif, formatLabelEffet } from '../../../utils/formatters'
import { inventaireService } from '../../../services/inventaireService'
import { Personnage, InventaireEntry, Item } from '../../../types'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'
import { ConfirmButton } from '../../../components/ui/ConfirmButton'
import { ConfirmationBar } from '../../../components/ui/ConfirmationBar'

type Props = { personnage: Personnage }

interface PanierItem {
  item: Item;
  quantite: number;
}

export default function GererInventaire({ personnage }: Props) {
  const { stats, items: itemsBibliotheque } = useItems()

  const [inventaire,        setInventaire]        = useState<InventaireEntry[]>([])
  const [onglet,            setOnglet]            = useState<'inventaire' | 'ajouter'>('inventaire')
  const [panier,            setPanier]            = useState<Map<string, PanierItem>>(new Map())
  const [filtreCategorie,   setFiltreCategorie]   = useState('Tous')
  const [recherche,         setRecherche]         = useState('')
  const [rechercheAjout,    setRechercheAjout]    = useState('')
  const [message,           setMessage]           = useState('')
  const [sauvegardant,      setSauvegardant]      = useState(false)

  useEffect(() => {
    chargerInventaire()
    setPanier(new Map())
  }, [personnage])

  const chargerInventaire = async () => {
    const { data } = await supabase
      .from('inventaire').select('id, quantite, equipe, items(*, modificateurs(*), effets_actifs(*))').eq('id_personnage', personnage.id)
    if (data) setInventaire(data as any)
  }

  const afficherMessage = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(''), 3000) }

  const togglePanier = (item: Item) => {
    setPanier(prev => {
      const next = new Map(prev)
      if (next.has(item.id)) {
        next.delete(item.id)
      } else {
        next.set(item.id, { item, quantite: 1 })
      }
      return next
    })
  }

  const updateQuantitePanier = (id: string, delta: number) => {
    setPanier(prev => {
      const next = new Map(prev)
      const entry = next.get(id)
      if (entry) {
        const nv = Math.max(1, entry.quantite + delta)
        next.set(id, { ...entry, quantite: nv })
      }
      return next
    })
  }

  const confirmerEnvoi = async () => {
    if (panier.size === 0) return
    setSauvegardant(true)
    try {
      let total = 0
      for (const [id, entry] of panier.entries()) {
        const ok = await inventaireService.ajouterItem(personnage.id, id, entry.quantite)
        if (ok) total++
      }
      afficherMessage(`✅ ${total} objet(s) ajouté(s) à l'inventaire !`)
      setPanier(new Map())
      setOnglet('inventaire')
      await chargerInventaire()
    } catch (e) {
      console.error(e)
    } finally {
      setSauvegardant(false)
    }
  }

  const retirerUn = async (entry: InventaireEntry) => {
    const success = await inventaireService.retirerItem(entry.id, 1)
    if (success) chargerInventaire()
  }

  const supprimerItem = async (entryId: string) => {
    const success = await inventaireService.retirerItem(entryId, 99999)
    if (success) chargerInventaire()
  }

  const inventaireFiltré = inventaire
    .filter(e => filtreCategorie === 'Tous' || e.items.categorie === filtreCategorie)
    .filter(e => e.items.nom.toLowerCase().includes(recherche.toLowerCase()))
  
  const bibliothequeFiltrée = itemsBibliotheque
    .filter(i => i.nom.toLowerCase().includes(rechercheAjout.toLowerCase()))

  return (
    <div className="flex flex-col gap-6" style={{ color: 'var(--text-primary)' }}>
      {/* Header Onglets */}
      <div className="flex justify-between items-center bg-black/20 p-1.5 rounded-2xl border border-white/5">
        <div className="flex gap-1 flex-1">
          <button 
            onClick={() => setOnglet('inventaire')}
            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${onglet === 'inventaire' ? 'bg-white/10 shadow-lg text-main' : 'opacity-40 hover:opacity-100'}`}
          >
            🎒 Inventaire ({inventaire.length})
          </button>
          <button 
            onClick={() => setOnglet('ajouter')}
            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${onglet === 'ajouter' ? 'bg-white/10 shadow-lg text-main' : 'opacity-40 hover:opacity-100'}`}
          >
            ➕ Bibliothèque
          </button>
        </div>
        {message && <span className="px-4 text-xs font-bold text-green-400 animate-pulse">{message}</span>}
      </div>

      {/* Vue Inventaire */}
      {onglet === 'inventaire' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40">🔍</span>
              <input 
                type="text" placeholder="Filtrer le sac..." value={recherche} onChange={e => setRecherche(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl outline-none transition-all font-bold text-sm bg-surface border border-border"
              />
            </div>
            <div className="flex gap-1 p-1 rounded-xl bg-surface border border-border overflow-x-auto no-scrollbar">
              {['Tous', ...CATEGORIES].map(cat => (
                <button
                  key={cat} onClick={() => setFiltreCategorie(cat)}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all whitespace-nowrap ${filtreCategorie === cat ? 'bg-main text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}
                  style={{ backgroundColor: filtreCategorie === cat ? 'var(--color-main)' : 'transparent' }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {inventaireFiltré.map(entry => (
              <Card key={entry.id} hoverEffect className={`flex flex-col gap-3 group relative transition-all overflow-hidden ${entry.equipe ? 'border-main/50 bg-main/5' : 'border-white/5 bg-black/20'}`}>
                <div className="flex justify-between items-start">
                  <Badge variant="outline" className="text-[8px] font-black uppercase tracking-tighter bg-white/5 border-white/10">
                    {CATEGORIE_EMOJI[entry.items.categorie]} {entry.items.categorie}
                  </Badge>
                  <span className="font-black text-[10px] px-2 py-0.5 rounded-lg opacity-60 bg-black/40 border border-white/5">
                    x{entry.quantite}
                  </span>
                </div>

                <h3 className="font-black text-sm uppercase text-white leading-tight truncate">
                  {entry.items.nom}
                </h3>

                <div className="flex flex-wrap gap-1">
                  {entry.items.modificateurs?.slice(0, 2).map((m: any, i: number) => (
                    <Badge key={`m-${i}`} variant="default" className="text-[7px] py-0.5 px-1 font-black bg-main/10 text-main border-main/10 uppercase">
                      {formatLabelModif({ id_stat: m.id_stat, valeur: m.valeur } as any, stats)}
                    </Badge>
                  ))}
                  {entry.items.effets_actifs?.slice(0, 2).map((e: any, i: number) => (
                    <Badge key={`e-${i}`} variant="default" className="text-[7px] py-0.5 px-1 font-black bg-blue-500/10 text-blue-400 border-blue-500/10 uppercase">
                      {formatLabelEffet(e as any, stats)}
                    </Badge>
                  ))}
                </div>

                <div className="mt-auto pt-3 flex gap-2 border-t border-white/5">
                  <button 
                    onClick={() => retirerUn(entry)}
                    className="flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                  >
                    Retirer 1
                  </button>
                  <ConfirmButton 
                    variant="ghost" 
                    size="sm" 
                    onConfirm={() => supprimerItem(entry.id)}
                    className="px-3 text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
                  >
                    🗑️
                  </ConfirmButton>
                </div>

                {entry.equipe && (
                  <div className="absolute top-0 right-0 w-8 h-8 bg-main/20 flex items-center justify-center rounded-bl-2xl border-b border-l border-main/30">
                    <span className="text-[10px]">⚔️</span>
                  </div>
                )}
              </Card>
            ))}
            {inventaireFiltré.length === 0 && (
              <div className="col-span-full py-10 text-center opacity-20 font-black uppercase text-xs italic">Aucun objet trouvé</div>
            )}
          </div>
        </div>
      )}

      {/* Vue Ajouter (Panier) */}
      {onglet === 'ajouter' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40">🔍</span>
              <input 
                type="text" placeholder="Rechercher dans la bibliothèque..." value={rechercheAjout} onChange={e => setRechercheAjout(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl outline-none transition-all font-bold text-sm bg-surface border border-border"
              />
            </div>
            {panier.size > 0 && (
              <div className="flex gap-2 animate-in zoom-in duration-300">
                <Button variant="secondary" size="sm" onClick={() => setPanier(new Map())}>Vider</Button>
                <Badge variant="default" className="bg-main text-white px-4 shrink-0">{panier.size} objet(s) prêt(s)</Badge>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-24">
            {bibliothequeFiltrée.map(item => {
              const selectionEntry = panier.get(item.id)
              const isSelected = !!selectionEntry
              
              return (
                <div 
                  key={item.id} 
                  onClick={() => togglePanier(item)}
                  className={`cursor-pointer transition-all duration-300 relative ${isSelected ? 'scale-[0.98]' : 'hover:scale-[1.02]'}`}
                >
                  {isSelected && (
                    <div className="absolute inset-0 rounded-[2rem] z-0 bg-main/20 blur-xl animate-pulse" />
                  )}
                  
                  <Card 
                    hoverEffect={!isSelected}
                    className={`h-full relative z-10 border-2 transition-all duration-300 flex flex-col gap-2 ${isSelected ? 'border-main bg-main/5 shadow-lg shadow-main/10' : 'border-white/5 bg-black/20'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-2xl">{CATEGORIE_EMOJI[item.categorie]}</span>
                        <div className="min-w-0">
                          <h4 className={`font-black text-sm uppercase truncate ${isSelected ? 'text-main' : 'text-white'}`}>{item.nom}</h4>
                          <p className="text-[9px] font-black uppercase opacity-40 leading-none">{item.categorie}</p>
                        </div>
                      </div>
                      {isSelected && <span className="text-main font-bold text-lg">✓</span>}
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {item.modificateurs?.slice(0, 2).map((m: any, i: number) => (
                        <Badge key={`m-${i}`} variant="default" className="text-[7px] py-0 px-1 opacity-70">
                          {formatLabelModif({ id_stat: m.id_stat, valeur: m.valeur } as any, stats)}
                        </Badge>
                      ))}
                    </div>

                    {isSelected && (
                      <div className="mt-auto pt-3 border-t border-main/20 flex flex-col gap-2" onClick={e => e.stopPropagation()}>
                        <span className="text-[8px] font-black uppercase opacity-40 text-center">Quantité à donner</span>
                        <div className="flex items-center gap-2 bg-black/40 rounded-xl p-1 border border-main/20">
                          <button 
                            onClick={() => updateQuantitePanier(item.id, -1)}
                            className="w-8 h-8 rounded-lg hover:bg-main/20 transition-all font-black text-lg text-main"
                          >-</button>
                          <span className="flex-1 text-center font-black text-lg text-main">{selectionEntry.quantite}</span>
                          <button 
                            onClick={() => updateQuantitePanier(item.id, 1)}
                            className="w-8 h-8 rounded-lg hover:bg-main/20 transition-all font-black text-lg text-main"
                          >+</button>
                        </div>
                      </div>
                    )}
                  </Card>
                </div>
              )
            })}
          </div>

          {panier.size > 0 && (
            <ConfirmationBar 
              label={`${panier.size} objet(s) prêt(s)`}
              onConfirm={confirmerEnvoi}
              onCancel={() => setPanier(new Map())}
              confirmText={`Confirmer l'envoi (${panier.size})`}
              loading={sauvegardant}
            />
          )}
        </div>
      )}
    </div>
  )
}
