import { motion } from 'framer-motion'
import { Plus, Minus } from 'lucide-react'

export function RadialGauge({ actuel, max, color, size, stroke }: any) {
  const radius = (size / 2) - stroke
  const circumference = 2 * Math.PI * radius
  
  // SÉCURITÉ : Pas de division par zéro
  const safeMax = max > 0 ? max : 1
  const progress = Math.min(100, Math.max(0, (actuel / safeMax) * 100))
  const dashOffset = circumference - (progress / 100) * circumference

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="transparent" stroke="currentColor" strokeWidth={stroke} className="text-white/5" />
        <motion.circle
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: isNaN(dashOffset) ? circumference : dashOffset }}
          transition={{ duration: 1.5, ease: "circOut" }}
          cx={size / 2} cy={size / 2} r={radius} fill="transparent"
          stroke={color} strokeWidth={stroke} strokeDasharray={circumference} strokeLinecap="butt"
        />
      </svg>
    </div>
  )
}

export function StatMinimal({ stat, align = 'left', delay = 0 }: any) {
  const alignClass = align === 'right' ? 'items-end text-right' : align === 'center' ? 'items-center text-center' : 'items-start text-left'
  
  // Animation de glissement (vient de la gauche ou de la droite)
  const initialX = align === 'right' ? -20 : align === 'left' ? 20 : 0
  const initialY = align === 'center' ? 20 : 0
  
  const bonusSpan = stat.bonus !== 0 ? (
    <span className={`text-sm lg:text-lg font-cinzel font-black ${stat.bonus > 0 ? 'text-theme-main drop-shadow-[0_0_8px_currentColor]' : 'text-red-500 drop-shadow-[0_0_8px_currentColor]'}`}>
      {stat.bonus > 0 ? `+${stat.bonus}` : stat.bonus}
    </span>
  ) : null

  return (
    <motion.div 
      initial={{ opacity: 0, x: initialX, y: initialY }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.8, delay, ease: "easeOut" }}
      className={`flex flex-col ${alignClass} min-w-[140px] group cursor-default`}
    >
       <div className="flex items-center gap-3 mb-1 opacity-30 group-hover:opacity-100 transition-opacity duration-500">
          {align === 'right' && <span className="font-cinzel text-[9px] lg:text-[10px] font-bold tracking-[0.4em] text-theme-main uppercase">{stat.nom}</span>}
          
          {/* Point d'énergie */}
          <div className="relative flex items-center justify-center">
             <div className="w-1.5 h-1.5 rounded-full bg-theme-main shadow-[0_0_10px_currentColor]" />
             <div className="absolute w-4 h-4 rounded-full border border-theme-main/30 scale-0 group-hover:scale-100 transition-transform duration-500" />
          </div>

          {(align === 'left' || align === 'center') && <span className="font-cinzel text-[9px] lg:text-[10px] font-bold tracking-[0.4em] text-theme-main uppercase">{stat.nom}</span>}
       </div>
       <div className="flex items-baseline gap-3">
          {align === 'right' && bonusSpan}
          <span className="text-6xl lg:text-8xl font-cinzel font-black text-primary leading-none tracking-tighter drop-shadow-xl transition-transform group-hover:scale-105 duration-500">{stat.valeur}</span>
          {(align === 'left' || align === 'center') && bonusSpan}
       </div>
    </motion.div>
  )
}

export function ResourceStrip({ r, delta, onAdjust, onApply, onManual }: any) {
    const isReady = delta && delta !== '0'
    return (
      <div className="flex flex-col items-center gap-2 group/res">
         <div className="relative">
            <button 
                onClick={onApply} 
                disabled={!isReady}
                className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center bg-black/40 hover:border-theme-main transition-all relative overflow-hidden shadow-xl"
                style={{ color: isReady ? 'var(--color-main)' : r.color }}
            >
                <span className="font-cinzel text-xl font-black z-10">{r.label[0]}</span>
                <div className="absolute bottom-0 left-0 right-0 bg-current opacity-15 transition-all" style={{ height: `${(r.actuel / r.max) * 100}%` }} />
            </button>
            {isReady && <div className="absolute -top-1 -right-1 w-6 h-6 bg-theme-main text-white rounded-full flex items-center justify-center text-[10px] font-black border-2 border-black animate-in zoom-in shadow-lg">{delta}</div>}
         </div>
         <div className="flex items-center gap-1 opacity-0 group-hover/res:opacity-100 transition-opacity">
            <button onClick={() => onAdjust(-1)} className="p-1 hover:text-theme-main"><Minus size={14} /></button>
            <input type="text" value={delta} onChange={(e) => onManual(e.target.value)} className="w-8 bg-transparent text-center font-mono text-xs outline-none" placeholder="0" />
            <button onClick={() => onAdjust(1)} className="p-1 hover:text-theme-main"><Plus size={14} /></button>
         </div>
      </div>
    )
}

export function ResourceHero({ r, delta, onAdjust, onApply, onManual }: any) {
    const isReady = delta && delta !== '0'
    return (
      <div className="flex flex-col items-center gap-1 group/res">
         <div className="relative">
            <button 
                onClick={onApply} 
                disabled={!isReady}
                className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center bg-black/40 hover:border-theme-main transition-all relative overflow-hidden shadow-xl"
                style={{ color: isReady ? 'var(--color-main)' : r.color }}
            >
                <span className="font-cinzel text-xl font-black z-10">{r.label[0]}</span>
                <div className="absolute bottom-0 left-0 right-0 bg-current opacity-15 transition-all" style={{ height: `${(r.actuel / r.max) * 100}%` }} />
            </button>
            {isReady && <div className="absolute -top-1 -right-1 w-6 h-6 bg-theme-main text-white rounded-full flex items-center justify-center text-[10px] font-black border-2 border-black animate-in zoom-in shadow-lg">{delta}</div>}
         </div>
         
         {/* Valeurs Actuel / Max (Spécifique Hero) */}
         <div className="flex flex-col items-center py-1">
            <div className="flex items-center gap-1">
               <span className="font-cinzel text-xs font-black text-primary drop-shadow-sm">{r.actuel}</span>
               <span className="text-[9px] opacity-20 text-primary font-bold">/ {r.max}</span>
            </div>
         </div>

         <div className={`flex items-center gap-1 transition-all ${isReady ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none group-hover/res:opacity-100 group-hover/res:translate-y-0 group-hover/res:pointer-events-auto'}`}>
            <button onClick={() => onAdjust(-1)} className="p-1 hover:text-theme-main transition-colors"><Minus size={14} /></button>
            <input 
              type="text" 
              value={delta} 
              onChange={(e) => onManual(e.target.value)} 
              className="w-10 bg-black/40 rounded-sm text-center font-mono text-[10px] outline-none border border-white/10 focus:border-theme-main/50 text-primary" 
              placeholder="0" 
            />
            <button onClick={() => onAdjust(1)} className="p-1 hover:text-theme-main transition-colors"><Plus size={14} /></button>
         </div>
      </div>
    )
}