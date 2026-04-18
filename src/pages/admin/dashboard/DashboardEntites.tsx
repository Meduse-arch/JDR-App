import { Personnage } from '../../../store/useStore'
import { Card } from '../../../components/ui/card'
import { Ghost } from 'lucide-react'

interface Props {
  entites: Personnage[]
  filtreEntites: 'Tous' | 'PNJ' | 'Monstre' | 'Boss'
  setFiltreEntites: (f: 'Tous' | 'PNJ' | 'Monstre' | 'Boss') => void
  scrollRef: React.RefObject<HTMLDivElement>
  page: number
  setPnjControle: (p: Personnage) => void
  setPageCourante: (p: string) => void
}

export function DashboardEntites({ entites, filtreEntites, setFiltreEntites, scrollRef, page, setPnjControle, setPageCourante }: Props) {
  const filteredEntites = entites.filter(p => filtreEntites === 'Tous' || p.type === (filtreEntites === 'Monstre' ? 'Monstre' : filtreEntites))

  return (
    <div className="px-4">
      <Card className="p-6 border-theme-main/20 bg-theme-main/5 relative overflow-hidden flex flex-col gap-4">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-theme-main/40 to-transparent" />
        <div className="flex justify-between items-center">
          <span className="font-cinzel text-[9px] font-black text-theme-main tracking-[0.5em] opacity-40 uppercase">[ ENTITÉS ÉVEILLÉES ]</span>
          <div className="flex gap-2">
            {(['Tous', 'PNJ', 'Monstre', 'Boss'] as const).map(f => (
              <button 
                key={f} 
                onClick={() => setFiltreEntites(f)} 
                className={`font-cinzel text-[9px] uppercase border px-3 py-1 transition-all ${filtreEntites === f ? 'border-theme-main text-theme-main bg-theme-main/5' : 'border-theme-main/20 text-theme-main/40 hover:border-theme-main/40'}`}
              >
                {f === 'Monstre' ? 'Mobs' : f}
              </button>
            ))}
          </div>
        </div>

        <div 
          ref={scrollRef}
          className="h-[280px] overflow-y-scroll snap-y snap-mandatory scrollbar-none"
          style={{ scrollbarWidth: 'none' }}
        >
          {filteredEntites.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-20 gap-3">
              <Ghost size={32} strokeWidth={1} />
              <span className="font-garamond italic text-lg">Le silence est absolu...</span>
            </div>
          ) : (
            Array.from({ length: Math.ceil(filteredEntites.length / 6) }).map((_, pageIdx) => (
              <div key={pageIdx} className="snap-start snap-always min-h-full grid grid-cols-3 grid-rows-2 gap-3">
                {filteredEntites.slice(pageIdx * 6, pageIdx * 6 + 6).map(p => (
                  <button 
                    key={p.id} 
                    onClick={() => { setPnjControle(p); setPageCourante('mon-personnage') }}
                    className="group relative overflow-hidden p-3 rounded-lg border border-white/5 bg-black/20 hover:bg-theme-main/5 transition-all duration-500 flex flex-col gap-2 text-left w-full"
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-cinzel text-[10px] font-black tracking-widest text-primary group-hover:text-theme-main uppercase truncate transition-colors">
                        {p.nom}
                      </span>
                      {p.type === 'Boss' && (
                        <span className="text-[7px] border border-red-900/40 text-red-400/70 px-1 font-cinzel tracking-tighter shrink-0">BOSS</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full bg-gradient-to-r from-red-900/80 to-red-500/80 transition-all ${p.hp/p.hp_max < 0.2 ? 'animate-pulse' : ''}`}
                          style={{ width: `${Math.min((p.hp / (p.hp_max || 1)) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="font-cinzel text-[7px] text-red-400/50 shrink-0 tabular-nums">
                        {p.hp}<span className="opacity-40">/{p.hp_max}</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="flex items-center gap-1">
                        <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
                          <div 
                            className="h-full rounded-full bg-gradient-to-r from-blue-900/80 to-blue-500/80 transition-all"
                            style={{ width: `${Math.min((p.mana / (p.mana_max || 1)) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="font-cinzel text-[7px] text-blue-400/50 shrink-0 tabular-nums">
                          {p.mana}<span className="opacity-40">/{p.mana_max}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
                          <div 
                            className="h-full rounded-full bg-gradient-to-r from-amber-900/80 to-amber-500/80 transition-all"
                            style={{ width: `${Math.min((p.stam / (p.stam_max || 1)) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="font-cinzel text-[7px] text-amber-400/50 shrink-0 tabular-nums">
                          {p.stam}<span className="opacity-40">/{p.stam_max}</span>
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>

        <div className="flex justify-center gap-1 mt-1">
          {Array.from({ length: Math.ceil(filteredEntites.length / 6) }).map((_, i) => (
            <div key={i} className={`w-1 h-1 rounded-full transition-all ${page === i ? 'bg-theme-main w-3' : 'bg-theme-main/20'}`} />
          ))}
        </div>
      </Card>
    </div>
  )
}
