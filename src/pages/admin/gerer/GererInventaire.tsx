import { useEffect, useState } from 'react'
import { supabase } from '../../../supabase'
import { useItems } from '../../../hooks/useItems'
import { CATEGORIES, CATEGORIE_EMOJI } from '../../../utils/constants'
import { formatLabelModif } from '../../../utils/formatters'
import { inventaireService } from '../../../services/inventaireService'
import { Personnage, InventaireEntry } from '../../../types'
import { Card } from '../../../components/ui/Card'
import { Input } from '../../../components/ui/Input'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'

type Props = { personnage: Personnage }

export default function GererInventaire({ personnage }: Props) {
  const { stats, itemModifs, items: itemsBibliotheque } = useItems()

  const [inventaire,        setInventaire]        = useState<InventaireEntry[]>([])
  const [onglet,            setOnglet]            = useState<'inventaire' | 'ajouter'>('inventaire')
  const [itemSelectionne,   setItemSelectionne]   = useState('')
  const [quantiteAjout,     setQuantiteAjout]     = useState(1)
  const [filtreCategorie,   setFiltreCategorie]   = useState('Tous')
  const [recherche,         setRecherche]         = useState('')
  const [rechercheAjout,    setRechercheAjout]    = useState('')
  const [message,           setMessage]           = useState('')

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
    const success = await inventaireService.addItem(personnage.id, itemSelectionne, quantiteAjout)
    if (success) {
      afficherMessage('✅ Item ajouté !')
      setItemSelectionne(''); setQuantiteAjout(1); chargerInventaire()
    }
  }

  const retirerItem = async (entry: InventaireEntry) => {
    const success = await inventaireService.consommerItem(entry.id, entry.quantite)
    if (success) chargerInventaire()
  }

  const supprimerItem = async (entryId: string) => {
    const success = await inventaireService.jeterItem(entryId)
    if (success) chargerInventaire()
  }

  const inventaireFiltré = inventaire
    .filter(e => filtreCategorie === 'Tous' || e.items.categorie === filtreCategorie)
    .filter(e => e.items.nom.toLowerCase().includes(recherche.toLowerCase()))
  
  const bibliothequeFiltrée = itemsBibliotheque
    .filter(i => i.nom.toLowerCase().includes(rechercheAjout.toLowerCase()))

  return (
    <div className="flex flex-col gap-5" style={{ color: 'var(--text-primary)' }}>
      {/* Onglets */}
      <div className="flex gap-2 items-center flex-wrap">
        <Button 
          variant={onglet === 'inventaire' ? 'active' : 'secondary'} 
          onClick={() => setOnglet('inventaire')}
        >
          🎒 Inventaire
        </Button>
        <Button 
          variant={onglet === 'ajouter' ? 'active' : 'secondary'} 
          onClick={() => setOnglet('ajouter')}
        >
          ➕ Ajouter
        </Button>
        {message && <span className="ml-auto text-sm font-bold" style={{ color: '#4ade80' }}>{message}</span>}
      </div>

      {/* Inventaire actuel */}
      {onglet === 'inventaire' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input 
              icon="🔍"
              type="text" placeholder="Rechercher..." value={recherche}
              onChange={e => setRecherche(e.target.value)}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['Tous', ...CATEGORIES].map(cat => (
              <Button 
                key={cat} 
                size="sm"
                variant={filtreCategorie === cat ? 'active' : 'secondary'}
                onClick={() => setFiltreCategorie(cat)}
              >
                {cat !== 'Tous' ? CATEGORIE_EMOJI[cat as import('../../../types').CategorieItem] + ' ' : ''}{cat}
              </Button>
            ))}
          </div>

          {inventaireFiltré.length === 0 && (
            <p className="text-sm text-center mt-4" style={{ color: 'var(--text-muted)' }}>Aucun item</p>
          )}

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
                  
                  {itemModifs[entry.items.id]?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {itemModifs[entry.items.id].map((m, i) => (
                        <Badge key={i} variant="default">
                          {formatLabelModif(m, stats)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 shrink-0 ml-3">
                  <Button size="sm" variant="secondary" onClick={() => retirerItem(entry)}>
                    −1
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => supprimerItem(entry.id)}>
                    🗑️
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Ajouter depuis bibliothèque */}
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
                  {itemModifs[item.id]?.length > 0 && (
                    <div className="flex flex-wrap gap-1 ml-auto">
                      {itemModifs[item.id].map((m, i) => (
                        <Badge key={i} variant="default">
                          {formatLabelModif(m, stats)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {itemSelectionne && (
            <Card className="flex-row items-center gap-3 flex-wrap mt-2">
              <label className="text-sm font-bold opacity-70">Quantité :</label>
              <div className="flex items-center gap-3">
                <Button size="sm" variant="secondary" onClick={() => setQuantiteAjout(q => Math.max(1, q - 1))}>
                  −
                </Button>
                <span className="text-xl font-black w-8 text-center" style={{ color: 'var(--color-main)' }}>
                  {quantiteAjout}
                </span>
                <Button size="sm" variant="secondary" onClick={() => setQuantiteAjout(q => q + 1)}>
                  +
                </Button>
              </div>
              <Button className="ml-auto flex-1 sm:flex-none" onClick={ajouterItem}>
                Ajouter à l'inventaire
              </Button>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
