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

  // On retire le blocage visuel du chargement


  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      <div className="p-4 md:p-8 flex flex-col gap-6 shrink-0 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight" style={{ background: 'linear-gradient(135deg, var(--color-light), var(--color-accent2))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              ⚙️ Gestion Globale
            </h2>
            <p className="text-sm opacity-60 mt-1">Configuration des entités de l'univers</p>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40">🔍</span>
            <input 
              type="text" placeholder="Rechercher un héros, un monstre ou un modèle..." value={recherche} onChange={e => setRecherche(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-2xl outline-none transition-all font-bold"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          <div className="flex gap-2 p-1 rounded-xl overflow-x-auto custom-scrollbar" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            {(['tout', 'joueur', 'pnj', 'monstre', 'modele'] as FiltreType[]).map(f => (
              <button
                key={f} onClick={() => setFiltreType(f)}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap ${filtreType === f ? 'bg-main text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}
                style={{ backgroundColor: filtreType === f ? 'var(--color-main)' : 'transparent' }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Liste à gauche */}
        <div className="w-full md:w-80 border-b md:border-b-0 md:border-r overflow-y-auto custom-scrollbar flex flex-col gap-2 p-4 h-48 md:h-auto shrink-0 md:shrink" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}>
          {persosFiltres.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectionne(p)}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left group ${selectionne?.id === p.id ? 'bg-main/10 border-main' : 'bg-surface border-border hover:border-white/20'}`}
            >
              <span className="text-xl">{p.is_template ? '📋' : p.type === 'Joueur' ? '🧑' : p.type === 'PNJ' ? '👤' : '🐉'}</span>
              <div className="flex-1 min-w-0">
                <p className={`font-bold truncate text-sm ${selectionne?.id === p.id ? 'text-main' : ''}`}>{p.nom}</p>
                <p className="text-[10px] uppercase font-black opacity-40">{p.is_template ? 'Modèle' : p.type}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Édition à droite */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8">
          {selectionne ? (
            <div className="max-w-4xl mx-auto flex flex-col gap-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-3xl font-black tracking-tighter">{selectionne.nom}</h3>
                  <div className="flex gap-2 mt-2">
                    <Badge variant={selectionne.is_template ? 'outline' : 'default'}>{selectionne.is_template ? 'MODÈLE' : selectionne.type}</Badge>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-[10px] uppercase font-black border border-white/5"
                      onClick={() => { setPnjControle(selectionne); setPageCourante('mon-personnage') }}
                    >
                      🎭 Posséder
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2 p-1 bg-surface border border-border rounded-xl">
                  {([['stats', '📊'], ['inventaire', '🎒'], ['competences', '✨']] as const).map(([id, icon]) => (
                    <button
                      key={id} onClick={() => setOnglet(id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${onglet === id ? 'bg-main text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}
                    >
                      <span>{icon}</span>
                      <span className="hidden sm:inline uppercase tracking-widest text-[10px]">{id}</span>
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
              <span className="text-8xl mb-4">⚙️</span>
              <p className="text-xl font-black uppercase tracking-widest text-center italic">Sélectionne une entité<br/>pour configurer ses registres</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
