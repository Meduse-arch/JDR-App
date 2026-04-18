import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../supabase'
import { useStore, type Personnage } from '../../store/useStore'
import { Search, ClipboardList, User, Skull } from 'lucide-react'

type FiltreType = 'tout' | 'joueur' | 'pnj' | 'monstre' | 'modele'

export default function Possession() {
  const [personnages, setPersonnages] = useState<Personnage[]>([])
  const [filtreType, setFiltreType] = useState<FiltreType>('tout')
  const [recherche, setRecherche] = useState('')

  const sessionActive = useStore(s => s.sessionActive)
  const pnjControle = useStore(s => s.pnjControle)
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

  const posseder = (p: Personnage) => {
    setPnjControle(p)
    setTimeout(() => setPageCourante('mon-personnage'), 50)
  }

  return (
    <div className="flex flex-col h-full p-4 md:p-8 overflow-y-auto custom-scrollbar">
      {/* Toolbar */}
      <div className="flex items-center gap-8 border-b border-theme/10 pb-4 mb-6">
        <div className="flex gap-6">
          {(['tout','joueur','pnj','monstre','modele'] as FiltreType[]).map(f => (
            <button key={f} onClick={() => setFiltreType(f)}
              className={`font-cinzel text-[11px] uppercase tracking-[0.3em] transition-all relative py-1 ${filtreType === f ? 'text-theme-main' : 'text-primary opacity-30 hover:opacity-70'}`}>
              {f}
              {filtreType === f && <div className="absolute bottom-0 left-0 w-full h-px bg-theme-main shadow-[0_0_8px_var(--color-main)]" />}
            </button>
          ))}
        </div>
        <div className="relative w-56 group ml-auto">
          <Search size={14} className="absolute left-0 top-1/2 -translate-y-1/2 text-theme-main opacity-40 group-focus-within:opacity-100 transition-opacity" />
          <input type="text" placeholder="Rechercher une entité..." value={recherche} onChange={e => setRecherche(e.target.value)}
            className="w-full pl-6 pr-2 py-2 bg-transparent border-b border-theme/10 font-garamond italic text-primary focus:border-theme-main/50 outline-none transition-all placeholder:opacity-20 text-sm" />
        </div>
      </div>

      {/* Grille */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pb-10">
        <AnimatePresence mode="popLayout">
          {persosFiltres.map((p, index) => {
            const estPossede = pnjControle?.id === p.id
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, delay: index * 0.04 }}
              >
                <button onClick={() => posseder(p)}
                  className={`group w-full flex flex-col gap-3 p-4 text-left relative transition-all duration-300 ${
                    estPossede
                      ? 'bg-theme-main/5 shadow-[0_0_20px_rgba(var(--color-main-rgb),0.08)]'
                      : 'bg-card hover:bg-theme-main/5'
                  }`}
                  style={{ background: estPossede ? undefined : '#0c0c0c' }}
                >
                  {/* Coins médiévaux */}
                  <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-theme-main/40" />
                  <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t border-r border-theme-main/40" />
                  <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l border-theme-main/40" />
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-theme-main/40" />
                  {/* Ligne top dégradé */}
                  <div className={`absolute top-0 left-2.5 right-2.5 h-px bg-gradient-to-r from-transparent to-transparent ${estPossede ? 'via-theme-main/70' : 'via-theme-main/30'}`} />

                  {/* Header card */}
                  <div className="flex items-center gap-2">
                    <span className="text-theme-main/60">
                      {p.is_template ? <ClipboardList size={16} /> : p.type === 'Joueur' ? <User size={16} /> : p.type === 'PNJ' ? <User size={16} /> : <Skull size={16} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-cinzel font-black uppercase tracking-widest text-[10px] truncate text-primary">{p.nom}</p>
                      <p className="font-cinzel text-[8px] uppercase tracking-widest opacity-35 font-black">{p.is_template ? 'Modèle' : p.type}</p>
                    </div>
                    {estPossede && (
                      <span className="text-[7px] font-cinzel font-black uppercase tracking-widest text-theme-main bg-theme-main/15 border border-theme-main/30 px-1.5 py-0.5">Actif</span>
                    )}
                  </div>

                  {/* Barres */}
                  <div className="flex flex-col gap-1.5">
                    {[
                      { label: 'PV', val: p.hp, max: p.hp_max, color: 'bg-red-900' },
                      { label: 'MP', val: p.mana, max: p.mana_max, color: 'bg-blue-900' },
                      { label: 'ST', val: p.stam, max: p.stam_max, color: 'bg-amber-900' },
                    ].map(b => (
                      <div key={b.label} className="flex flex-col gap-0.5">
                        <div className="flex justify-between text-[7px] font-cinzel font-black uppercase tracking-widest opacity-30">
                          <span>{b.label}</span><span>{b.val}/{b.max}</span>
                        </div>
                        <div className="h-[3px] w-full bg-black/50 border border-white/[0.04]">
                          <div className={`h-full ${b.color} transition-all duration-500`} style={{ width: `${Math.round((b.val / b.max) * 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Hover reveal */}
                  <div className="text-[8px] font-cinzel font-black uppercase tracking-[0.25em] text-theme-main opacity-0 group-hover:opacity-80 transition-all duration-300 text-right">
                    Incarner →
                  </div>
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
