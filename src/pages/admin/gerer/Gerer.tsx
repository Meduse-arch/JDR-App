import { useEffect, useState } from 'react'
import { supabase } from '../../../supabase'
import { useStore, type Personnage } from '../../../store/useStore'
import GererStats from './GererStats'
import GererRessources from './GererRessources'
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
  const [onglet,      setOnglet]      = useState<'stats' | 'ressources' | 'inventaire' | 'competences'>('stats')
  const [showDrawer, setShowDrawer] = useState(true)

  const sessionActive = useStore(s => s.sessionActive)
  const setPnjControle = useStore(s => s.setPnjControle)
  const setPageCourante = useStore(s => s.setPageCourante)

  useEffect(() => {
    if (sessionActive) chargerPersonnages()
  }, [sessionActive])

  const chargerPersonnages = async () => {
    const { data } = await supabase
      .from('v_personnages')
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

  return (
    <div className="flex flex-col h-full overflow-hidden relative" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      {/* HEADER COMPACT */}
      <div className="p-3 px-4 md:px-6 flex flex-col gap-3 shrink-0 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowDrawer(true)}
              className="p-2 hover:bg-white/10 rounded-xl transition-all text-xl active:scale-95"
              title="Liste des entités"
            >
              ☰
            </button>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black uppercase tracking-tight gradient-title hidden sm:block">
                ⚙️ Gestion
              </h2>
              {selectionne && (
                <Badge variant="success" className="text-[10px] py-1 px-3 rounded-full animate-in fade-in slide-in-from-left-2 border-main/20 bg-main/10 text-main">
                  👤 {selectionne.nom}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex gap-2 p-1 rounded-xl bg-surface border border-border overflow-x-auto custom-scrollbar no-scrollbar">
            {(['tout', 'joueur', 'pnj', 'monstre', 'modele'] as FiltreType[]).map(f => (
              <button
                key={f} onClick={() => setFiltreType(f)}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all whitespace-nowrap ${filtreType === f ? 'bg-main text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}
                style={{ backgroundColor: filtreType === f ? 'var(--color-main)' : 'transparent' }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40 text-xs">🔍</span>
          <input 
            type="text" placeholder="Rechercher une entité..." value={recherche} onChange={e => setRecherche(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl outline-none transition-all font-bold text-sm"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* SIDEBAR DRAWER (OVERLAY) */}
        {showDrawer && (
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[60] animate-in fade-in duration-300"
            onClick={() => setShowDrawer(false)}
          />
        )}
        
        <div 
          className={`absolute left-0 top-0 bottom-0 w-80 bg-surface border-r z-[70] transition-transform duration-300 transform shadow-2xl flex flex-col ${showDrawer ? 'translate-x-0' : '-translate-x-full'}`}
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}
        >
          <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: 'var(--border)' }}>
            <span className="font-black uppercase tracking-widest text-xs opacity-40">Entités ({persosFiltres.length})</span>
            <button onClick={() => setShowDrawer(false)} className="opacity-40 hover:opacity-100 transition-opacity">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-2">
            {persosFiltres.map(p => (
              <button
                key={p.id}
                onClick={() => { setSelectionne(p); setShowDrawer(false); }}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left group ${selectionne?.id === p.id ? 'bg-main/10 border-main' : 'bg-black/20 border-white/5 hover:border-main/30'}`}
              >
                <span className="text-xl">{p.is_template ? '📋' : p.type === 'Joueur' ? '🧑' : p.type === 'PNJ' ? '👤' : '🐉'}</span>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold truncate text-sm ${selectionne?.id === p.id ? 'text-main' : ''}`}>{p.nom}</p>
                  <p className="text-[10px] uppercase font-black opacity-40">{p.is_template ? 'Modèle' : p.type}</p>
                </div>
              </button>
            ))}
            {persosFiltres.length === 0 && (
              <div className="py-10 text-center opacity-20 font-black uppercase text-xs italic">Aucun résultat</div>
            )}
          </div>
        </div>

        {/* CONTENU PRINCIPAL (PLEINE LARGEUR) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8">
          {selectionne ? (
            <div className="max-w-5xl mx-auto flex flex-col gap-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-3xl font-black uppercase tracking-tighter">{selectionne.nom}</h3>
                    <Badge variant={selectionne.is_template ? 'outline' : 'default'} className="rounded-lg text-[10px]">
                      {selectionne.is_template ? 'MODÈLE' : selectionne.type}
                    </Badge>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-[10px] uppercase font-black border border-white/5 opacity-60 hover:opacity-100"
                    onClick={() => { setPnjControle(selectionne); setPageCourante('mon-personnage') }}
                  >
                    🎭 Posséder l'entité
                  </Button>
                </div>
                
                <div className="flex gap-2 p-1 bg-surface border border-border rounded-2xl shadow-inner">
                  {([['stats', '📊'], ['ressources', '💧'], ['inventaire', '🎒'], ['competences', '✨']] as const).map(([id, icon]) => (
                    <button
                      key={id} onClick={() => setOnglet(id)}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${onglet === id ? 'bg-main text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}
                      style={{ backgroundColor: onglet === id ? 'var(--color-main)' : 'transparent' }}
                    >
                      <span className="text-lg">{icon}</span>
                      <span className="hidden sm:inline uppercase tracking-widest text-[10px]">{id}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {onglet === 'stats' && <GererStats personnage={selectionne} onRecharger={chargerPersonnages} />}
                {onglet === 'ressources' && <GererRessources personnage={selectionne} />}
                {onglet === 'inventaire' && <GererInventaire personnage={selectionne} />}
                {onglet === 'competences' && <GererCompetences personnage={selectionne} />}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-20 select-none cursor-pointer group" onClick={() => setShowDrawer(true)}>
              <div className="text-8xl mb-6 group-hover:scale-110 transition-transform duration-500">⚙️</div>
              <p className="text-xl font-black uppercase tracking-[0.2em] text-center italic">
                Ouvrez le menu ☰<br/>
                <span className="text-sm opacity-60 tracking-normal">pour sélectionner une entité</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
