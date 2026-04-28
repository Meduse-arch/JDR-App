import { motion } from 'framer-motion'
import { UserCircle, Camera } from 'lucide-react'
import { ConfirmButton } from '../ui/ConfirmButton'
import { StatMinimal, ResourceHero, RadialGauge } from './SharedComponents'

export default function FicheHero({ personnage, ressources, stats, deltas, updateDelta, adjustDelta, appliquerDelta, handleSupprimer, onEditImage, pseudoJoueur, vh }: any) {
  
  const hp = ressources?.find((r:any) => r.rKey === 'hp') || { actuel: 0, max: 10, label: 'Sang', color: '#dc2626' }
  const mana = ressources?.find((r:any) => r.rKey === 'mana') || { actuel: 0, max: 10, label: 'Souffle', color: '#2563eb' }
  const stam = ressources?.find((r:any) => r.rKey === 'stam') || { actuel: 0, max: 10, label: 'Vigueur', color: '#f59e0b' }

  const safeVh = typeof vh === 'number' ? vh : 800
  const gaugeSize = Math.max(200, Math.min(safeVh * 0.50, 520))
  
  const safeStats = Array.isArray(stats) ? stats : []
  const physiqueStats = safeStats.filter((s:any) => ['Force', 'Agilité', 'Constitution'].includes(s.nom))
  const mentalStats = safeStats.filter((s:any) => ['Intelligence', 'Sagesse', 'Perception'].includes(s.nom))
  const charismeStat = safeStats.find((s:any) => s.nom === 'Charisme')

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full min-h-[calc(100vh-5rem)] w-full flex flex-row items-stretch overflow-hidden relative bg-black/10">
        
        {/* NOM & OPTIONS (ABSOLUTE TOP) */}
        <div className="absolute top-6 left-8 right-8 flex justify-between items-start z-50 pointer-events-none pl-20 lg:pl-32">
            <div className="flex flex-col pointer-events-auto">
                <h2 className="text-3xl lg:text-5xl font-cinzel font-black text-primary tracking-tight uppercase leading-none drop-shadow-2xl">
                    <motion.span initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.2 }} className="inline-block">
                        {personnage.nom}
                    </motion.span>
                </h2>
            </div>
            <div className="flex flex-col items-end pointer-events-auto opacity-10 hover:opacity-100 transition-opacity">
                <span className="font-garamond italic text-[10px] uppercase tracking-widest text-primary/40 mb-1">{pseudoJoueur}</span>
                <ConfirmButton variant="danger" size="sm" onConfirm={handleSupprimer} className="font-cinzel text-[7px] uppercase tracking-tighter scale-90">Délier</ConfirmButton>
            </div>
        </div>

        {/* PILIER VITAL (GAUCHE) */}
        <div className="w-16 lg:w-24 border-r border-white/5 flex flex-col items-center justify-center gap-10 bg-black/40 z-50 shrink-0">
           <ResourceHero r={hp} delta={deltas.hp} onAdjust={(v:any) => adjustDelta('hp', v)} onApply={() => appliquerDelta('hp')} onManual={(v:any) => updateDelta('hp', v)} />
           <ResourceHero r={mana} delta={deltas.mana} onAdjust={(v:any) => adjustDelta('mana', v)} onApply={() => appliquerDelta('mana')} onManual={(v:any) => updateDelta('mana', v)} />
           <ResourceHero r={stam} delta={deltas.stam} onAdjust={(v:any) => adjustDelta('stam', v)} onApply={() => appliquerDelta('stam')} onManual={(v:any) => updateDelta('stam', v)} />
        </div>

        {/* COEUR DE LA FICHE */}
        <div className="flex-1 flex flex-row items-center justify-center gap-2 lg:gap-12 xl:gap-20 px-2 pt-12">
            
            {/* AILE GAUCHE (Physique) */}
            <div className="flex flex-col gap-8 lg:gap-14 shrink-0">
                {physiqueStats.map((s: any, index: number) => (
                    <StatMinimal key={s.nom} stat={s} align="right" delay={0.3 + index * 0.15} />
                ))}
            </div>

            {/* TOTEM CENTRAL */}
            <div className="flex flex-col items-center gap-8 shrink-0">
                <div className="relative flex items-center justify-center" style={{ width: gaugeSize, height: gaugeSize }}>
                    {/* Pulsing Aura */}
                    <div className="absolute inset-0 bg-theme-main/10 rounded-full blur-[60px] animate-pulse" />
                    
                    {/* Anneaux Runiques Decoratifs */}
                    <div className="absolute inset-0 border border-theme-main/10 rounded-full animate-[spin_20s_linear_infinite]" />
                    <div className="absolute -inset-4 border border-dashed border-theme-main/20 rounded-full animate-[spin_30s_linear_infinite_reverse]" />

                    <RadialGauge actuel={hp.actuel} max={hp.max} color="#dc2626" size={gaugeSize} stroke={12} />
                    <RadialGauge actuel={mana.actuel} max={mana.max} color="#2563eb" size={gaugeSize * 0.86} stroke={9} />
                    <RadialGauge actuel={stam.actuel} max={stam.max} color="#f59e0b" size={gaugeSize * 0.74} stroke={7} />
                    
                    <motion.button 
                      onClick={onEditImage} 
                      whileHover={{ scale: 1.02 }} 
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="relative rounded-full overflow-hidden border-2 border-white/5 bg-black/80 z-20 shadow-[0_0_60px_rgba(0,0,0,0.6)] flex items-center justify-center" 
                      style={{ width: gaugeSize * 0.64, height: gaugeSize * 0.64 }}
                    >
                        {personnage.image_url ? (
                            <img src={personnage.image_url} alt="" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                        ) : (
                            <UserCircle size={100} className="text-white/5" />
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity"><Camera size={32} className="text-white" /></div>
                    </motion.button>
                </div>

                {/* CHARISME (Central Bottom) */}
                {charismeStat && (
                    <div className="relative">
                       <StatMinimal stat={charismeStat} align="center" delay={0.9} />
                    </div>
                )}
            </div>

            {/* AILE DROITE (Mental) */}
            <div className="flex flex-col gap-8 lg:gap-14 shrink-0">
                {mentalStats.map((s: any, index: number) => (
                    <StatMinimal key={s.nom} stat={s} align="left" delay={0.3 + index * 0.15} />
                ))}
            </div>

        </div>

        {/* Aura de fond */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vh] h-[80vh] bg-theme-main/5 rounded-full blur-[140px] pointer-events-none -z-10" />
    </motion.div>
  )
}