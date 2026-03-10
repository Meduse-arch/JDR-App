import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { useItems } from '../../hooks/useItems'
import { CATEGORIES, CATEGORIE_EMOJI } from '../../utils/constants'
import { formatLabelModif } from '../../utils/formatters'
import { Modificateur, CategorieItem } from '../../types'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { ConfirmButton } from '../../components/ui/ConfirmButton'

export default function Items() {
  const sessionActive = useStore(s => s.sessionActive)
  const compte        = useStore(s => s.compte)

  const { items, stats, itemModifs, supprimerItem, creerItem } = useItems()

  const [filtreCategorie, setFiltreCategorie] = useState('Tous')
  const [recherche, setRecherche] = useState('')
  const [afficherFormulaire, setAfficherFormulaire] = useState(false)
  const [message,   setMessage]   = useState('')

  const [nom,          setNom]          = useState('')
  const [description,  setDescription]  = useState('')
  const [categorie,    setCategorie]    = useState<CategorieItem>('Divers')
  const [modificateurs, setModificateurs] = useState<Modificateur[]>([])

  const ajouterModificateur = () =>
    setModificateurs(prev => [...prev, { type: 'hp', id_stat: null, valeur: 1 }])

  const majModificateur = (index: number, champ: keyof Modificateur, val: any) =>
    setModificateurs(prev => prev.map((m, i) => {
      if (i !== index) return m
      if (champ === 'type') return { ...m, type: val, id_stat: val === 'stat' ? m.id_stat : null }
      return { ...m, [champ]: val }
    }))

  const supprimerModificateur = (index: number) =>
    setModificateurs(prev => prev.filter((_, i) => i !== index))

  const handleCreerItem = async () => {
    if (!nom || !sessionActive) return
    const success = await creerItem(compte?.id, { nom, description, categorie }, modificateurs)
    if (success) {
      setNom(''); setDescription(''); setCategorie('Divers'); setModificateurs([])
      setAfficherFormulaire(false)
      setMessage('✅ Item créé !'); setTimeout(() => setMessage(''), 2500)
    }
  }

  const itemsFiltres = items
    .filter(i => filtreCategorie === 'Tous' || i.categorie === filtreCategorie)
    .filter(i => i.nom.toLowerCase().includes(recherche.toLowerCase()))

  return (
    <div className="flex flex-col h-full p-4 md:p-8 overflow-y-auto custom-scrollbar"
      style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-6"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <h2 className="text-2xl md:text-3xl font-black tracking-tight"
          style={{
            background: 'linear-gradient(135deg, var(--color-light), var(--color-accent2))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
          📚 Bibliothèque d'items
        </h2>
        <div className="flex items-center gap-3 shrink-0">
          {message && (
            <span className="text-sm font-bold" style={{ color: '#4ade80' }}>{message}</span>
          )}
          <Button
            variant={afficherFormulaire ? 'secondary' : 'primary'}
            onClick={() => { setAfficherFormulaire(!afficherFormulaire); setModificateurs([]) }}
          >
            {afficherFormulaire ? '✕ Annuler' : '+ Créer un item'}
          </Button>
        </div>
      </div>

      {!sessionActive && (
        <p className="text-center mt-16" style={{ color: 'var(--text-secondary)' }}>
          Rejoins une session d'abord
        </p>
      )}

      {sessionActive && (
        <div className="flex flex-col gap-6">
          {/* Formulaire de création */}
          {afficherFormulaire && (
            <Card className="animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase mb-1.5 opacity-50 ml-1">Nom de l'item</label>
                    <Input
                      type="text" value={nom} onChange={e => setNom(e.target.value)}
                      placeholder="Ex: Épée en fer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase mb-1.5 opacity-50 ml-1">Catégorie</label>
                    <Select
                      value={categorie} onChange={e => setCategorie(e.target.value as CategorieItem)}
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{CATEGORIE_EMOJI[cat]} {cat}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase mb-1.5 opacity-50 ml-1">Description</label>
                    <textarea
                      value={description} onChange={e => setDescription(e.target.value)}
                      placeholder="Effets, histoire..."
                      className="w-full px-4 py-3 rounded-xl outline-none transition-all focus:ring-2 focus:ring-blue-500/20 min-h-[100px] resize-none"
                      style={{
                        backgroundColor: 'var(--bg-input)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border)',
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-1.5 ml-1">
                    <label className="text-xs font-bold uppercase opacity-50">Modificateurs (Stats/Ressources)</label>
                    <button
                      onClick={ajouterModificateur}
                      className="text-[10px] bg-white/5 hover:bg-white/10 px-2 py-1 rounded-lg transition-colors font-bold uppercase"
                    >
                      + Ajouter
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                    {modificateurs.map((m, i) => (
                      <div key={i} className="flex flex-wrap sm:flex-nowrap gap-2 p-3 rounded-xl bg-black/20 border border-white/5">
                        <select
                          value={m.type === 'stat' ? 'stat' : m.type}
                          onChange={e => majModificateur(i, 'type', e.target.value)}
                          className="flex-1 min-w-[120px] bg-transparent text-sm outline-none cursor-pointer"
                        >
                          <optgroup label="Ressources">
                            <option value="hp">❤️ PV actuel</option>
                            <option value="mana">💧 Mana actuel</option>
                            <option value="stam">⚡ Stamina actuel</option>
                            <option value="hp_max">❤️ PV Max</option>
                            <option value="mana_max">💧 Mana Max</option>
                            <option value="stam_max">⚡ Stamina Max</option>
                          </optgroup>
                          <optgroup label="Statistiques">
                            <option value="stat">📊 Autre Statistique</option>
                          </optgroup>
                        </select>

                        {m.type === 'stat' && (
                          <select
                            value={m.id_stat || ''}
                            onChange={e => majModificateur(i, 'id_stat', e.target.value)}
                            className="flex-1 min-w-[120px] bg-transparent text-sm outline-none cursor-pointer"
                          >
                            <option value="">-- Choisir --</option>
                            {stats.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                          </select>
                        )}

                        <input
                          type="number" value={m.valeur}
                          onChange={e => majModificateur(i, 'valeur', parseInt(e.target.value) || 0)}
                          className="w-20 bg-transparent text-sm font-bold outline-none border-b border-white/10 focus:border-blue-500 transition-colors"
                        />

                        <button
                          onClick={() => supprimerModificateur(i)}
                          className="p-1 hover:text-red-400 transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {modificateurs.length === 0 && (
                      <p className="text-center py-8 text-sm opacity-30 italic">Aucun modificateur</p>
                    )}
                  </div>
                </div>
              </div>

              <Button size="lg" onClick={handleCreerItem} className="mt-8 uppercase tracking-widest">
                💾 Enregistrer l'item
              </Button>
            </Card>
          )}

          {/* Filtres et recherche */}
          <div className="flex flex-col md:flex-row gap-4">
            <Input
              icon="🔍"
              type="text" placeholder="Rechercher un item..."
              value={recherche} onChange={e => setRecherche(e.target.value)}
            />
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
              {['Tous', ...CATEGORIES].map(cat => (
                <Button
                  key={cat}
                  variant={filtreCategorie === cat ? 'active' : 'secondary'}
                  onClick={() => setFiltreCategorie(cat)}
                  className="whitespace-nowrap"
                >
                  {cat !== 'Tous' && <span className="mr-1">{CATEGORIE_EMOJI[cat as CategorieItem]}</span>}{cat}
                </Button>
              ))}
            </div>
          </div>

          {/* Liste des items */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {itemsFiltres.map(item => (
              <Card key={item.id} hoverEffect className="group">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl shrink-0">{CATEGORIE_EMOJI[item.categorie]}</span>
                    <h3 className="font-bold leading-tight group-hover:text-blue-400 transition-colors">{item.nom}</h3>
                  </div>
                  <ConfirmButton
                    variant="ghost"
                    size="sm"
                    onConfirm={() => supprimerItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-400"
                  >
                    🗑️
                  </ConfirmButton>
                </div>

                <p className="text-sm opacity-60 mb-4 line-clamp-2 min-h-[40px] leading-relaxed">
                  {item.description || 'Pas de description'}
                </p>

                <div className="flex flex-wrap gap-1.5 mt-auto">
                  {itemModifs[item.id]?.map((m, i) => (
                    <Badge key={i}>
                      {formatLabelModif(m, stats)}
                    </Badge>
                  ))}
                  {(!itemModifs[item.id] || itemModifs[item.id].length === 0) && (
                    <span className="text-[10px] opacity-20 italic">Aucun effet</span>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {itemsFiltres.length === 0 && (
            <div className="text-center py-20 opacity-30">
              <p className="text-4xl mb-4">📦</p>
              <p>Aucun item trouvé</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
