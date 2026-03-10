import { useEffect, useState } from 'react'
import { supabase } from '../../../supabase'
import { useStore, type Personnage } from '../../../store/useStore'
import GererStats from './GererStats'
import GererInventaire from './GererInventaire'
import GererCompetences from './GererCompetences'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'

type FiltreType = 'tout' | 'joueur' | 'pnj' | 'monstre' | 'modele'

export default function Gerer() {
  const [personnages, setPersonnages] = useState<Personnage[]>([])
  const [selectionne, setSelectionne] = useState<Personnage | null>(null)
  const [filtreType,  setFiltreType]  = useState<FiltreType>('tout')
  const [recherche,   setRecherche]   = useState('')
  const [onglet,      setOnglet]      = useState<'stats' | 'inventaire' | 'competences'>('stats')
  const [menuOuvert,  setMenuOuvert]  = useState(true) // Pour le responsive

  const sessionActive = useStore(s => s.sessionActive)
  const setPnjControle = useStore(s => s.setPnjControle)
  const setPageCourante = useStore(s => s.setPageCourante)

  useEffect(() => {
    if (sessionActive) chargerPersonnages()
  }, [sessionActive])

  const chargerPersonnages = async () => {
    const { data } = await supabase
      .from('personnages')
      .select('*')
      .eq('id_session', sessionActive?.id)
      .order('nom')
    
    if (data) setPersonnages(data)
  }

  const persosFiltres = personnages.filter(p => {
    const matchRecherche = p.nom.toLowerCase().includes(recherche.toLowerCase())
    if (!matchRecherche) return false

    if (filtreType === 'tout') return true
    if (filtreType === 'modele') return p.is_template
    if (filtreType === 'joueur') return p.type === 'Joueur' && !p.is_template
    if (filtreType === 'pnj')    return p.type === 'PNJ' && !p.is_template
    if (filtreType === 'monstre') return p.type === 'Monstre' && !p.is_template
    return true
  })

  const selectionnerPerso = (p: Personnage) => {
    setSelectionne(p)
    // Sur mobile, on ferme le menu quand on sélectionne
    if (window.innerWidth < 768) {
      setMenuOuvert(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-4 md:p-8 flex flex-col gap-6 shrink-0 border-b border-border bg-surface">
        <div className="flex justify-between items-center">
          <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter italic">Gestion de l'Univers</h2>
          <button 
            onClick={() => setMenuOuvert(!menuOuvert)}
            className="md:hidden px-3 py-1.5 rounded-lg bg-main/10 text-main text-[10px] font-black uppercase border border-main/20"
          >
            {menuOuvert ? 'Voir Édition' : 'Voir Liste'}
          </button>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40">🔍</span>
            <input 
              type="text" placeholder="Rechercher..." value={recherche} onChange={e => setRecherche(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface border border-border outline-none focus:border-main transition-all font-bold text-sm"
            />
          </div>
          <div className="flex gap-1 p-1 bg-surface border border-border rounded-xl overflow-x-auto no-scrollbar">
            {(['tout', 'joueur', 'pnj', 'monstre', 'modele'] as FiltreType[]).map(f => (
              <button
                key={f} onClick={() => setFiltreType(f)}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all whitespace-nowrap ${filtreType === f ? 'bg-main text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Liste à gauche */}
        <div className={`
          absolute inset-0 z-20 bg-app md:relative md:translate-x-0 transition-transform duration-300
          w-full md:w-80 border-r border-border overflow-y-auto custom-scrollbar flex flex-col gap-2 p-4 bg-black/5
          ${menuOuvert ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          {persosFiltres.length === 0 && (
            <p className="text-center py-10 opacity-30 text-xs font-bold uppercase tracking-widest text-primary">Aucun résultat</p>
          )}
          {persosFiltres.map(p => (
            <button
              key={p.id}
              onClick={() => selectionnerPerso(p)}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left group ${selectionne?.id === p.id ? 'bg-main/10 border-main' : 'bg-surface border-border hover:border-white/20'}`}
            >
              <span className="text-xl">{p.is_template ? '📋' : p.type === 'Joueur' ? '🧑' : p.type === 'PNJ' ? '👤' : '🐉'}</span>
              <div className="flex-1 min-w-0">
                <p className={`font-bold truncate text-sm ${selectionne?.id === p.id ? 'text-main' : 'text-primary'}`}>{p.nom}</p>
                <p className="text-[10px] uppercase font-black opacity-40">{p.is_template ? 'Modèle' : p.type}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Édition à droite */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8">
          {selectionne ? (
            <div className="max-w-4xl mx-auto flex flex-col gap-6 md:gap-8">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="flex flex-col gap-2 w-full sm:w-auto">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setMenuOuvert(true)} className="md:hidden text-main">←</button>
                    <h3 className="text-2xl md:text-3xl font-black tracking-tighter text-primary">{selectionne.nom}</h3>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={selectionne.is_template ? 'outline' : 'default'}>{selectionne.is_template ? 'MODÈLE' : selectionne.type}</Badge>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-[10px] uppercase font-black border border-white/5"
                      onClick={() => { setPnjControle(selectionne); setPageCourante('mon-personnage') }}
                    >
                      🎭 Gérer
                    </Button>
                  </div>
                </div>
                <div className="flex gap-1 p-1 bg-surface border border-border rounded-xl w-full sm:w-auto overflow-x-auto no-scrollbar">
                  {([['stats', '📊'], ['inventaire', '🎒'], ['competences', '✨']] as const).map(([id, icon]) => (
                    <button
                      key={id} onClick={() => setOnglet(id)}
                      className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all ${onglet === id ? 'bg-main text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}
                    >
                      <span>{icon}</span>
                      <span className="uppercase tracking-widest text-[9px] md:text-[10px]">{id}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {onglet === 'stats' && <GererStats personnage={selectionne} />}
                {onglet === 'inventaire' && <GererInventaire personnage={selectionne} />}
                {onglet === 'competences' && <GererCompetences personnage={selectionne} />}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-20 select-none">
              <span className="text-6xl md:text-8xl mb-4">⚙️</span>
              <p className="text-sm md:text-xl font-black uppercase tracking-widest text-center italic">Sélectionne une entité<br/>pour configurer ses registres</p>
              <Button variant="secondary" size="sm" className="mt-6 md:hidden" onClick={() => setMenuOuvert(true)}>Ouvrir la liste</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
