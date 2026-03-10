import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useStore, type Personnage } from '../../Store/useStore'
import { Badge } from '../../components/ui/Badge'

type FiltreType = 'tout' | 'joueur' | 'pnj' | 'monstre' | 'modele'

export default function Possession() {
  const [personnages, setPersonnages] = useState<Personnage[]>([])
  const [filtreType,  setFiltreType]  = useState<FiltreType>('tout')
  const [recherche,   setRecherche]   = useState('')
  const [chargement,  setChargement]  = useState(true)

  const sessionActive = useStore(s => s.sessionActive)
  const pnjControle = useStore(s => s.pnjControle)
  const setPnjControle = useStore(s => s.setPnjControle)
  const setPageCourante = useStore(s => s.setPageCourante)

  useEffect(() => {
    if (sessionActive) chargerPersonnages()
  }, [sessionActive])

  const chargerPersonnages = async () => {
    setChargement(true)
    const { data } = await supabase
      .from('personnages')
      .select('*')
      .eq('id_session', sessionActive?.id)
      .order('nom')
    if (data) setPersonnages(data)
    setChargement(false)
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

  const posseder = (p: Personnage) => {
    setPnjControle(p)
    setPageCourante('mon-personnage')
  }

  // On retire le blocage visuel du chargement


  return (
    <div className="flex flex-col h-full p-4 md:p-8 overflow-y-auto custom-scrollbar">
      <div className="flex flex-col gap-6 mb-10 pb-8 border-b border-white/5">
        <div>
          <h2 className="text-3xl font-black uppercase italic tracking-tighter">🎭 Hub de Possession</h2>
          <p className="text-sm opacity-50 text-main font-bold">Sélectionne l'entité que tu souhaites incarner</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40">🔍</span>
            <input 
              type="text" placeholder="Rechercher une cible..." value={recherche} onChange={e => setRecherche(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-surface border border-border outline-none focus:border-main transition-all font-bold"
            />
          </div>
          <div className="flex gap-2 p-1 bg-surface border border-border rounded-xl">
            {(['tout', 'joueur', 'pnj', 'monstre', 'modele'] as FiltreType[]).map(f => (
              <button
                key={f} onClick={() => setFiltreType(f)}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${filtreType === f ? 'bg-main text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
        {persosFiltres.map(p => {
          const estPossede = pnjControle?.id === p.id
          return (
            <button
              key={p.id}
              onClick={() => posseder(p)}
              className={`flex flex-col gap-4 p-5 rounded-3xl border transition-all text-left group relative overflow-hidden ${estPossede ? 'bg-main/10 border-main ring-2 ring-main/20 shadow-lg shadow-main/10' : 'bg-card border-border hover:border-white/20'}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{p.is_template ? '📋' : p.type === 'Joueur' ? '🧑' : p.type === 'PNJ' ? '👤' : '🐉'}</span>
                <div className="min-w-0">
                  <p className={`font-black uppercase tracking-tighter truncate text-sm ${estPossede ? 'text-main' : ''}`}>{p.nom}</p>
                  <p className="text-[9px] uppercase font-black opacity-40 leading-none mt-0.5">{p.is_template ? 'Modèle' : p.type}</p>
                </div>
              </div>

              <div className="flex flex-col gap-1 mt-auto">
                <div className="flex justify-between text-[8px] font-black uppercase opacity-40">
                  <span>Santé</span>
                  <span>{p.hp_actuel} / {p.hp_max}</span>
                </div>
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500/60 transition-all duration-500" style={{ width: `${(p.hp_actuel / p.hp_max) * 100}%` }} />
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between">
                 <span className="text-[10px] font-black text-main opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest">Incarner →</span>
                 {estPossede && <Badge variant="default" className="text-[7px] py-0">ACTIF</Badge>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
