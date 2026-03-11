import { useEffect, useState } from 'react'
import { supabase } from '../../../supabase'
import { useItems } from '../../../hooks/useItems'
import { inventaireService } from '../../../services/inventaireService'
import { CATEGORIE_EMOJI } from '../../../utils/constants'
import { Personnage, InventaireEntry } from '../../../types'
import { Card } from '../../../components/ui/Card'
import { Input } from '../../../components/ui/Input'
import { Button } from '../../../components/ui/Button'

type Props = { personnage: Personnage }

export default function GererInventaire({ personnage }: Props) {
  const { stats, items: itemsBibliotheque } = useItems()

  const [inventaire,        setInventaire]        = useState<InventaireEntry[]>([])
  const [onglet,            setOnglet]            = useState<'inventaire' | 'ajouter'>('inventaire')
  const [deltas,            setDeltas]            = useState<Record<string, string>>({})
  const [recherche,         setRecherche]         = useState('')
  const [rechercheAjout,    setRechercheAjout]    = useState('')
  const [chargement,        setChargement]        = useState(false)

  useEffect(() => {
    chargerInventaire()
  }, [personnage])

  const chargerInventaire = async () => {
    const { data } = await supabase
      .from('inventaire').select('id, quantite, equipe, items(id, nom, description, categorie)').eq('id_personnage', personnage.id)
    if (data) setInventaire(data as any)
  }

  const afficherMessage = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(''), 2500) }

  const ajouterItem = async () => {
    if (!itemSelectionne) return
    const success = await inventaireService.ajouterItem(personnage.id, itemSelectionne, quantiteAjout)
    if (success) {
      afficherMessage('✅ Item ajouté !')
      setItemSelectionne(''); setQuantiteAjout(1); chargerInventaire()
    }
  }

  const retirerItem = async (entry: InventaireEntry) => {
    const success = await inventaireService.retirerItem(entry.id, 1)
    if (success) chargerInventaire()
  }

  const supprimerItem = async (entryId: string) => {
    const success = await inventaireService.retirerItem(entryId, 99999)
    if (success) chargerInventaire()
  }

  const aDesChangements = Object.values(deltas).some(v => (parseInt(v) || 0) !== 0)

  const inventaireFiltré = inventaire
    .filter(e => e.items.nom.toLowerCase().includes(recherche.toLowerCase()))
  
  const bibliothequeFiltrée = itemsBibliotheque
    .filter(i => i.nom.toLowerCase().includes(rechercheAjout.toLowerCase()))

  return (
    <div className="flex flex-col gap-5 pb-24 relative" style={{ color: 'var(--text-primary)' }}>
      <div className="flex gap-2 items-center flex-wrap">
        <Button variant={onglet === 'inventaire' ? 'active' : 'secondary'} onClick={() => { setOnglet('inventaire'); setDeltas({}); }}>🎒 Sac ({inventaire.length})</Button>
        <Button variant={onglet === 'ajouter' ? 'active' : 'secondary'} onClick={() => { setOnglet('ajouter'); setDeltas({}); }}>➕ Donner</Button>
      </div>

      {onglet === 'inventaire' && (
        <div className="flex flex-col gap-4">
          <Input icon="🔍" placeholder="Rechercher..." value={recherche} onChange={e => setRecherche(e.target.value)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {inventaireFiltré.map(entry => (
              <Card key={entry.id} className="flex-row justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xl">{CATEGORIE_EMOJI[entry.items.categorie]}</span>
                    <p className="font-bold truncate text-base">{entry.items.nom}</p>
                    <Badge variant="ghost">{entry.items.categorie}</Badge>
                  </div>
                  {entry.items.description && (
                    <p className="text-xs mb-2 opacity-60 line-clamp-2">{entry.items.description}</p>
                  )}
                  <p className="font-black text-sm mb-2" style={{ color: 'var(--color-main)' }}>x{entry.quantite}</p>
                  
                  {entry.items.item_modificateurs && entry.items.item_modificateurs.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {entry.items.item_modificateurs.slice(0, 2).map((m: any, i: number) => (
                        <Badge key={i} variant="default" className="text-[8px] truncate max-w-[80px]">
                          {formatLabelModif(m, stats)}
                        </Badge>
                      ))}
                      {entry.items.item_modificateurs.length > 2 && (
                        <Badge variant="ghost" className="text-[8px] opacity-40">
                          +{entry.items.item_modificateurs.length - 2}...
                        </Badge>
                      )}
                    </div>
                    <ConfirmButton onConfirm={() => inventaireService.jeterItem(entry.id).then(chargerInventaire)}>🗑️</ConfirmButton>
                  </div>
                  <div className="flex bg-black/20 rounded-xl p-1 border border-white/5 w-full">
                    <button onClick={() => adjustDelta(entry.id, -1)} className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors font-bold">-</button>
                    <input type="text" value={deltas[entry.id] || ''} onChange={(e) => handleDeltaChange(entry.id, e.target.value)} placeholder="0" className="w-full bg-transparent text-center font-black text-sm outline-none" />
                    <button onClick={() => adjustDelta(entry.id, 1)} className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors font-bold">+</button>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {onglet === 'ajouter' && (
        <div className="flex flex-col gap-4">
          <Input 
            icon="🔍"
            type="text" placeholder="Rechercher un item..." value={rechercheAjout}
            onChange={e => setRechercheAjout(e.target.value)}
          />

          {bibliothequeFiltrée.length === 0 && (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Aucun item trouvé. Crée des items depuis la page Items !
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto custom-scrollbar pr-2">
            {bibliothequeFiltrée.map(item => (
              <button key={item.id} onClick={() => setItemSelectionne(item.id)}
                className="p-3 rounded-2xl text-left transition-all border outline-none"
                style={{
                  backgroundColor: itemSelectionne === item.id
                    ? 'color-mix(in srgb, var(--color-main) 15%, var(--bg-card))'
                    : 'var(--bg-card)',
                  borderColor: itemSelectionne === item.id ? 'var(--color-main)' : 'var(--border)',
                  transform: itemSelectionne === item.id ? 'scale(0.98)' : 'scale(1)',
                }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{CATEGORIE_EMOJI[item.categorie]}</span>
                  <span className="font-bold text-sm truncate">{item.nom}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-50">{item.categorie}</span>
                  {item.item_modificateurs && item.item_modificateurs.length > 0 && (
                    <div className="flex flex-wrap gap-1 ml-auto">
                      {item.item_modificateurs.map((m: any, i: number) => (
                        <Badge key={i} variant="default">
                          {formatLabelModif(m, stats)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex bg-black/20 rounded-xl p-1 border border-white/5 w-full">
                    <button onClick={() => adjustDelta(item.id, -1)} className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors font-bold">-</button>
                    <input type="text" value={deltas[item.id] || ''} onChange={(e) => handleDeltaChange(item.id, e.target.value)} placeholder="0" className="w-full bg-transparent text-center font-black text-sm outline-none" />
                    <button onClick={() => adjustDelta(item.id, 1)} className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors font-bold">+</button>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* BOUTON FLOTTANT RESPONSIVE */}
      {aDesChangements && (
        <div className="fixed bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-5 duration-500">
          <button 
            onClick={appliquerTout}
            disabled={chargement}
            className="group relative px-6 py-2.5 md:px-12 md:py-4 bg-main/80 backdrop-blur-md border border-white/20 text-white rounded-full shadow-lg shadow-main/20 flex items-center justify-center font-black text-[10px] md:text-sm uppercase italic tracking-tighter active:scale-90 transition-all"
            style={{ backgroundColor: 'color-mix(in srgb, var(--color-main) 85%, transparent)' }}
          >
            <span className="relative flex items-center gap-2">
              {chargement ? '...' : 'Valider les changements ✓'}
            </span>
          </button>
        </div>
      )}
    </div>
  )
}

function ConfirmButton({ onConfirm }: any) {
  const [confirm, setConfirm] = useState(false)
  if (confirm) return <Button variant="danger" size="sm" onClick={onConfirm} onMouseLeave={() => setConfirm(false)}>Sûr ?</Button>
  return <Button variant="ghost" size="sm" onClick={() => setConfirm(true)} className="text-red-400">🗑️</Button>
}
