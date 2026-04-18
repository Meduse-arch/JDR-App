import { Personnage } from '../../../store/useStore'
import { Card } from '../../../components/ui/card'
import { User } from 'lucide-react'

interface Props {
  joueurs: Personnage[]
  scrollRef: React.RefObject<HTMLDivElement>
  page: number
  setPnjControle: (p: Personnage) => void
  setPageCourante: (p: string) => void
}

export function DashboardJoueurs({ joueurs, scrollRef, page, setPnjControle, setPageCourante }: Props) {
  return (
    <div className="px-4">
      <Card className="p-6 border-theme-main/20 bg-theme-main/5 relative overflow-hidden flex flex-col gap-4">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-theme-main/40 to-transparent" />
        <span className="font-cinzel text-[9px] font-black text-theme-main tracking-[0.5em] opacity-40 uppercase">[ COMPAGNONS DE RÉCIT ]</span>
        
        <div 
          ref={scrollRef}
          className="h-[260px] overflow-y-scroll snap-y snap-mandatory scrollbar-none"
          style={{ scrollbarWidth: 'none' }}
        >
          {joueurs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-20 gap-2">
              <User size={24} strokeWidth={1} />
              <span className="font-garamond italic text-sm">Les terres sont désertes...</span>
            </div>
          ) : (
            Array.from({ length: Math.ceil(joueurs.length / 2) }).map((_, pageIdx) => (
              <div key={pageIdx} className="snap-start snap-always min-h-full flex flex-col gap-3">
                {joueurs.slice(pageIdx * 2, pageIdx * 2 + 2).map(j => (
                  <button 
                    key={j.id} 
                    onClick={() => { setPnjControle(j); setPageCourante('mon-personnage') }}
                    className="group relative overflow-hidden p-4 rounded-lg border border-white/5 bg-black/20 hover:bg-theme-main/5 transition-all duration-500 flex-1 text-left w-full"
                  >
                    <span className="font-cinzel text-sm font-black tracking-widest text-primary group-hover:text-theme-main uppercase transition-colors block mb-3">
                      {j.nom}
                    </span>

                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-cinzel text-[8px] text-red-400/70 uppercase w-6 shrink-0">PV</span>
                      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full bg-gradient-to-r from-red-900/80 to-red-500/80 transition-all duration-500 ${j.hp/j.hp_max < 0.2 ? 'animate-pulse' : ''}`}
                          style={{ width: `${Math.min((j.hp / (j.hp_max || 1)) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="font-cinzel text-[9px] text-red-400/70 shrink-0 tabular-nums">
                        {j.hp}<span className="opacity-40 text-[8px]">/{j.hp_max}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-cinzel text-[8px] text-blue-400/70 uppercase w-6 shrink-0">MP</span>
                      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-gradient-to-r from-blue-900/80 to-blue-500/80 transition-all duration-500"
                          style={{ width: `${Math.min((j.mana / (j.mana_max || 1)) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="font-cinzel text-[9px] text-blue-400/70 shrink-0 tabular-nums">
                        {j.mana}<span className="opacity-40 text-[8px]">/{j.mana_max}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-cinzel text-[8px] text-amber-400/70 uppercase w-6 shrink-0">ST</span>
                      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-gradient-to-r from-amber-900/80 to-amber-500/80 transition-all duration-500"
                          style={{ width: `${Math.min((j.stam / (j.stam_max || 1)) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="font-cinzel text-[9px] text-amber-400/70 shrink-0 tabular-nums">
                        {j.stam}<span className="opacity-40 text-[8px]">/{j.stam_max}</span>
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
        
        <div className="flex justify-center gap-1 mt-1">
          {Array.from({ length: Math.ceil(joueurs.length / 2) }).map((_, i) => (
            <div key={i} className={`w-1 h-1 rounded-full transition-all ${page === i ? 'bg-theme-main w-3' : 'bg-theme-main/20'}`} />
          ))}
        </div>
      </Card>
    </div>
  )
}
