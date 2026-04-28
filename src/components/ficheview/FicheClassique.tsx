import { motion } from 'framer-motion'
import { UserCircle, Camera, Swords, Zap, Book, Eye, Shield, Users } from 'lucide-react'
import { BarreRessource } from '../BarreRessource'
import { Card } from '../ui/card'
import { Badge } from '../ui/Badge'
import { ConfirmButton } from '../ui/ConfirmButton'

const STAT_ICONS: Record<string, any> = {
  'Force': Swords,
  'Agilité': Zap,
  'Intelligence': Book,
  'Perception': Eye,
  'Constitution': Shield,
  'Charisme': Users
}

export default function FicheClassique({ personnage, ressources, stats, deltas, updateDelta, adjustDelta, appliquerDelta, handleSupprimer, onEditImage, pseudoJoueur }: any) {
  const safeRessources = Array.isArray(ressources) ? ressources : []
  const safeStats = Array.isArray(stats) ? stats : []

  return (
    <motion.div key="classic-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 mt-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="font-cinzel text-[10px] tracking-[0.2em] border-theme-main/30 text-theme-main bg-black/40">{personnage?.type === 'Joueur' ? 'AVENTURIER' : 'ENTITÉ'}</Badge>
            <span className="text-xs font-garamond italic opacity-40 uppercase tracking-widest">Lié à l'âme de : {pseudoJoueur || '...'}</span>
          </div>
        </div>
        <ConfirmButton variant="danger" size="sm" onConfirm={handleSupprimer} className="opacity-30 hover:opacity-100 transition-opacity font-cinzel text-[10px] uppercase">Effacer du récit</ConfirmButton>
      </div>
      
      <div className="flex flex-col items-center mb-6">
        <span className="font-cinzel text-[10px] font-black text-theme-main tracking-[0.4em] opacity-40 uppercase">[ HÉROS INCARNÉ ]</span>
        <h2 className="text-xl md:text-2xl font-cinzel font-black text-primary mt-1 uppercase tracking-widest drop-shadow-sm">{personnage?.nom || 'Inconnu'}</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 flex flex-col gap-8">
          <Card className="medieval-border p-8 flex flex-col items-center gap-6 bg-card/20 backdrop-blur-sm">
            <button onClick={onEditImage} className="group w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-theme/30 p-1 relative overflow-hidden bg-black/20 hover:border-theme-main/60 transition-all duration-300 focus:outline-none" title="Modifier l'image de profil">
              {personnage?.image_url ? <img src={personnage.image_url} alt={personnage.nom} className="w-full h-full object-cover rounded-full" /> : <><UserCircle size="100%" className="text-theme-main opacity-20 absolute inset-0 scale-110" /><div className="absolute inset-0 flex items-center justify-center"><span className="font-cinzel text-4xl font-black text-theme-main opacity-40">{personnage?.nom?.[0] || '?'}</span></div></>}
              <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/50 flex items-center justify-center transition-all duration-300"><Camera size={22} className="text-[#c8a84b] opacity-0 group-hover:opacity-100 transition-opacity duration-300" /></div>
            </button>
            <h3 className="font-cinzel font-black uppercase tracking-widest text-xs text-theme-main">État Vital</h3>
            <div className="flex flex-col gap-4 w-full">
              {safeRessources.map((r: any) => (
                <BarreRessource 
                  key={r.rKey} 
                  label={r.label} 
                  color={r.color} 
                  emoji={r.emoji} 
                  glow={r.glow} 
                  gradient={r.gradient} 
                  actuel={r.actuel} 
                  max={r.max} 
                  delta={deltas[r.rKey] || ''} 
                  onDeltaChange={(v: string) => updateDelta(r.rKey, v)} 
                  onDeltaDecrement={() => adjustDelta(r.rKey, -1)} 
                  onDeltaIncrement={() => adjustDelta(r.rKey, 1)} 
                  onAppliquer={() => appliquerDelta(r.rKey)} 
                />
              ))}
            </div>
          </Card>
        </div>
        <div className="lg:col-span-8 flex flex-col gap-8">
          <Card className="medieval-border p-8 bg-card/20 backdrop-blur-sm">
            <h3 className="text-xl font-cinzel font-black uppercase tracking-widest mb-8 flex items-center gap-3 text-theme-main border-b border-theme/20 pb-4"><Swords size={24} />Attributs & Statistiques</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-3 gap-6">
              {safeStats.map((stat: any) => {
                const Icon = STAT_ICONS[stat.nom] || Shield;
                return (
                  <Card key={stat.nom} className="bg-card/40 border border-theme/20 p-6 flex flex-col items-center justify-center gap-2 hover:border-theme-main hover:bg-card transition-all duration-300 group rounded-sm">
                    <Icon size={20} className="text-theme-main opacity-40 group-hover:opacity-100 transition-opacity" />
                    <span className="text-[10px] font-cinzel font-bold uppercase tracking-widest opacity-50 text-primary">{stat.nom}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-4xl font-black font-cinzel text-primary transition-transform group-hover:scale-110 group-hover:text-theme-main duration-300">{stat.valeur}</span>
                      {stat.bonus !== 0 && <span className={`text-xs font-black font-cinzel animate-pulse ${stat.bonus > 0 ? 'text-theme-main' : 'text-red-500'}`}>{stat.bonus > 0 ? `+${stat.bonus}` : stat.bonus}</span>}
                    </div>
                    {stat.bonus !== 0 && <span className="text-[9px] font-garamond font-bold opacity-30 uppercase tracking-widest">Essence: {stat.base}</span>}
                  </Card>
                )
              })}
            </div>
          </Card>
          <Card className="medieval-border p-8 bg-card/20 backdrop-blur-sm min-h-[200px]">
            <h3 className="font-cinzel font-black uppercase tracking-widest text-xs text-theme-main mb-4">Chronique du Héros</h3>
            <p className="font-garamond text-lg opacity-60 italic leading-relaxed">"Les murmures du Sigil révèlent une destinée encore en suspens. Les exploits de {personnage.nom} restent à graver dans le grand Codex de l'univers."</p>
          </Card>
        </div>
      </div>
    </motion.div>
  )
}