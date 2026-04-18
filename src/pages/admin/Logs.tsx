import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { supabase } from '../../supabase'
import { useLogs } from '../../hooks/useLogs'
import { motion, AnimatePresence } from 'framer-motion'
import { Dices, Zap, Backpack, Heart, Package, ChevronDown } from 'lucide-react'

const TYPE_ICONS: Record<string, any> = {
  des: { Icon: Dices, color: 'text-violet-500', bg: 'bg-violet-500/10' },
  competence: { Icon: Zap, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  item: { Icon: Backpack, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ressource: { Icon: Heart, color: 'text-red-500', bg: 'bg-red-500/10' },
  inventaire: { Icon: Package, color: 'text-gray-400', bg: 'bg-gray-400/10' }
}

function formatRelativeTime(dateString: string) {
  const diffInSeconds = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000)
  if (diffInSeconds < 60) return "à l'instant"
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) return `il y a ${diffInMinutes} min`
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `il y a ${diffInHours} h`
  const diffInDays = Math.floor(diffInHours / 24)
  return `il y a ${diffInDays} j`
}

export default function Logs() {
  const sessionActive = useStore(s => s.sessionActive)
  const [personnages, setPersonnages] = useState<{id: string, nom: string}[]>([])
  const [filtreId, setFiltreId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    async function loadPersos() {
      if (!sessionActive) return
      const { data } = await supabase
        .from('personnages')
        .select('id, nom')
        .eq('id_session', sessionActive.id)
        .eq('is_template', false)
        .eq('type', 'Joueur')
      if (data) setPersonnages(data)
    }
    loadPersos()
  }, [sessionActive])

  const { logs, chargement } = useLogs(sessionActive?.id, filtreId || undefined)

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto pb-20">
      <div className="flex gap-4 pb-3 overflow-x-auto no-scrollbar border-b border-white/5">
        <button
          onClick={() => setFiltreId(null)}
          className={`font-cinzel text-[10px] uppercase tracking-[0.25em] transition-all relative py-1 whitespace-nowrap ${filtreId === null ? 'text-theme-main' : 'text-primary opacity-30 hover:opacity-70'}`}
        >
          Tous
          {filtreId === null && <div className="absolute bottom-0 left-0 w-full h-px bg-theme-main shadow-[0_0_8px_var(--color-main)]" />}
        </button>
        {personnages.map(p => (
          <button
            key={p.id}
            onClick={() => setFiltreId(p.id)}
            className={`font-cinzel text-[10px] uppercase tracking-[0.25em] transition-all relative py-1 whitespace-nowrap ${filtreId === p.id ? 'text-theme-main' : 'text-primary opacity-30 hover:opacity-70'}`}
          >
            {p.nom}
            {filtreId === p.id && <div className="absolute bottom-0 left-0 w-full h-px bg-theme-main shadow-[0_0_8px_var(--color-main)]" />}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {chargement ? (
           <div className="text-center py-20 opacity-30 font-cinzel text-sm animate-pulse">Consultation des annales...</div>
        ) : logs.length === 0 ? (
           <div className="text-center py-20 opacity-30 font-cinzel text-sm">Le silence règne dans les archives.</div>
        ) : (
          <AnimatePresence>
            {logs.map((log, i) => {
              const config = TYPE_ICONS[log.type] || TYPE_ICONS.inventaire
              let iconColor = config.color
              let bgColor = config.bg
              
              if (log.type === 'ressource' && log.action.includes('+')) {
                iconColor = 'text-green-500'
                bgColor = 'bg-green-500/10'
              }

              const Icon = config.Icon

              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.05, 0.5) }}
                  className={`medieval-border bg-card/40 backdrop-blur-sm flex flex-col hover:bg-card/60 transition-colors overflow-hidden ${log.details ? 'cursor-pointer' : ''}`}
                  onClick={() => {
                    if (log.details) {
                      setExpandedId(expandedId === log.id ? null : log.id)
                    }
                  }}
                >
                  <div className="p-4 flex items-center gap-4">
                    <div className={`p-3 rounded-full ${bgColor} border border-white/5`}>
                       <Icon className={iconColor} size={20} />
                    </div>
                    
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                         <span className="font-cinzel text-xs font-black uppercase text-theme-main bg-theme-main/10 px-2 py-0.5 rounded-sm border border-theme-main/20">
                           {log.nom_personnage}
                         </span>
                         <span className="font-garamond italic text-[10px] opacity-40">
                           {formatRelativeTime(log.created_at)}
                         </span>
                      </div>
                      <span className="font-cinzel text-sm text-primary/80 truncate">
                        {log.action}
                      </span>
                    </div>

                    {log.details && (
                      <div className="flex items-center gap-4 text-right">
                        <div>
                          {log.type === 'des' && log.details.total !== undefined && (
                            <div className="font-cinzel text-2xl font-black text-primary/60">{log.details.total}</div>
                          )}
                          {log.type === 'competence' && (
                            <div className="flex gap-2 font-garamond italic">
                              {log.details.cout_mana > 0 && <span className="text-[12px] text-blue-400">-{log.details.cout_mana} MP</span>}
                              {log.details.cout_stam > 0 && <span className="text-[12px] text-amber-400">-{log.details.cout_stam} ST</span>}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <ChevronDown 
                            size={16} 
                            className={`text-primary/40 transition-transform duration-200 ${expandedId === log.id ? 'rotate-180' : ''}`} 
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <AnimatePresence>
                    {expandedId === log.id && log.details && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <div className="px-4 pb-4 pt-2 border-t border-white/5 bg-black/20 font-garamond text-sm text-primary/70 flex flex-col gap-3">
                          {log.details.des && Array.isArray(log.details.des) && log.details.des.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {log.details.des.map((d: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-2 bg-white/5 px-2 py-1 rounded border border-white/10 shadow-inner">
                                  <span className="opacity-60 text-[10px] uppercase font-cinzel tracking-widest">{d.label}</span>
                                  <span className="font-black text-theme-main">{d.total}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {log.type === 'inventaire' && log.details.categorie && (
                            <div className="flex items-center gap-2 text-xs">
                              <span className="opacity-50 uppercase font-cinzel tracking-widest">Catégorie :</span>
                              <span className="text-theme-main capitalize">{log.details.categorie}</span>
                            </div>
                          )}

                          {log.details.total !== undefined && log.type !== 'des' && (
                             <div className="flex items-center gap-3 mt-1 bg-white/5 p-3 rounded-sm border border-white/10 w-fit">
                               <span className="opacity-50 text-[10px] uppercase font-cinzel tracking-widest">Total Jet</span>
                               <span className="font-cinzel font-black text-2xl text-theme-main drop-shadow-[0_0_8px_var(--color-main)]">{log.details.total}</span>
                             </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
