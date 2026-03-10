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
  const { items: itemsBibliotheque } = useItems()

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

  const handleDeltaChange = (id: string, val: string) => {
    if (/^[+-]?\d*$/.test(val)) setDeltas(prev => ({ ...prev, [id]: val }))
  }

  const adjustDelta = (id: string, amount: number) => {
    const current = parseInt(deltas[id]) || 0
    const next = current + amount
    setDeltas(prev => ({ ...prev, [id]: next === 0 ? '' : (next > 0 ? `+${next}` : next.toString()) }))
  }

  const appliquerTout = async () => {
    const mods = Object.entries(deltas).map(([id, v]) => ({ id, val: parseInt(v) || 0 })).filter(m => m.val !== 0)
    if (mods.length === 0) return
    setChargement(true)
    try {
      for (const m of mods) {
        if (onglet === 'inventaire') {
          const entry = inventaire.find(e => e.id === m.id)
          if (!entry) continue
          if (m.val > 0) await inventaireService.addItem(personnage.id, entry.items.id, m.val)
          else await inventaireService.consommerItem(entry.id, Math.abs(m.val))
        } else {
          await inventaireService.addItem(personnage.id, m.id, m.val)
        }
      }
      setDeltas({})
      chargerInventaire()
      if (onglet === 'ajouter') setOnglet('inventaire')
    } finally { setChargement(false) }
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
            {inventaireFiltré.map(entry => {
              const deltaVal = parseInt(deltas[entry.id]) || 0
              const hasDelta = deltaVal !== 0
              return (
                <Card key={entry.id} className="flex-col gap-3 p-4">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <p className="font-bold truncate text-sm">{CATEGORIE_EMOJI[entry.items.categorie]} {entry.items.nom}</p>
                      <p className="font-black text-[10px] text-main uppercase">x{entry.quantite} {hasDelta && <span className={deltaVal > 0 ? 'text-green-400' : 'text-red-400'}>({deltaVal > 0 ? `+${deltaVal}` : deltaVal} → {Math.max(0, entry.quantite + deltaVal)})</span>}</p>
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
          <Input icon="🔍" placeholder="Rechercher..." value={rechercheAjout} onChange={e => setRechercheAjout(e.target.value)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
            {bibliothequeFiltrée.map(item => {
              const deltaVal = parseInt(deltas[item.id]) || 0
              const hasDelta = deltaVal > 0
              return (
                <Card key={item.id} className={`flex-col gap-3 p-4 transition-all ${hasDelta ? 'border-main bg-main/5' : 'opacity-80'}`}>
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate">{CATEGORIE_EMOJI[item.categorie]} {item.nom}</p>
                      <p className="text-[10px] opacity-40 uppercase font-black">{item.categorie}</p>
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
