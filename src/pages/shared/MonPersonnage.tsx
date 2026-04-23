import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'
import { usePersonnage } from '../../hooks/usePersonnage'
import { useStats } from '../../hooks/useStats'
import { BarreRessource } from '../../components/BarreRessource'
import { personnageService } from '../../services/personnageService'
import { Card } from '../../components/ui/card'
import { Badge } from '../../components/ui/Badge'
import { ConfirmButton } from '../../components/ui/ConfirmButton'
import { useResourceManagement, type RessourceKey } from '../../hooks/useResourceManagement'
import { CONFIG_RESSOURCES } from '../../utils/constants'
import { Swords, Zap, Book, Eye, Shield, Users, UserCircle, Camera, X, Check, AlertCircle, Plus, Minus } from 'lucide-react'

const STAT_ICONS: Record<string, any> = {
  'Force': Swords,
  'Agilité': Zap,
  'Intelligence': Book,
  'Perception': Eye,
  'Constitution': Shield,
  'Charisme': Users
}

// ─── Composants Utilitaires ──────────────────────────────────────────────────

function RadialGauge({ actuel, max, color, size = 200, stroke = 8, offset = 0 }: any) {
  const radius = (size / 2) - stroke
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(100, Math.max(0, (actuel / max) * 100))
  const dashOffset = circumference - (progress / 100) * circumference

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ transform: `rotate(${offset}deg)` }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-white/5"
        />
        <motion.circle
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
    </div>
  )
}

// ─── Modal modification image de profil ─────────────────────────────────────

interface ImageModalProps {
  currentUrl: string | null | undefined
  onClose: () => void
  onSave: (url: string) => Promise<void>
}

function ImageModal({ currentUrl, onClose, onSave }: ImageModalProps) {
  const [url, setUrl] = useState(currentUrl || '')
  const [preview, setPreview] = useState(currentUrl || '')
  const [loading, setLoading] = useState(false)
  const [previewError, setPreviewError] = useState(false)

  const handleUrlChange = (val: string) => {
    setUrl(val)
    setPreviewError(false)
    setPreview(val)
  }

  const handleSave = async () => {
    setLoading(true)
    await onSave(url.trim())
    setLoading(false)
    onClose()
  }

  const handleRemove = async () => {
    setLoading(true)
    await onSave('')
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-card border border-theme-main/30 rounded-sm shadow-2xl w-full max-w-md relative overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-theme-main to-transparent" />
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-theme-main/10 rounded-sm">
              <Camera className="text-theme-main" size={18} />
            </div>
            <h3 className="font-cinzel font-black text-sm uppercase tracking-[0.2em] text-primary">
              Vision du Héros
            </h3>
          </div>
          <button onClick={onClose} className="text-primary/40 hover:text-theme-main transition-colors p-2 hover:bg-white/5 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 flex flex-col gap-8">
          {/* Aperçu */}
          <div className="flex flex-col items-center gap-4">
            <div className="w-40 h-40 rounded-full border-2 border-theme-main/20 overflow-hidden bg-black/40 relative flex items-center justify-center shadow-2xl group">
              {preview && !previewError ? (
                <img src={preview} alt="Aperçu" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" onError={() => setPreviewError(true)} />
              ) : (
                <UserCircle size={100} className="text-theme-main/10" />
              )}
            </div>
            {previewError && preview && (
              <div className="flex items-center gap-2 text-[10px] text-red-500 font-cinzel font-black uppercase tracking-widest animate-pulse">
                <AlertCircle size={14} />
                Lien corrompu
              </div>
            )}
          </div>

          {/* Champ URL */}
          <div className="space-y-2">
            <label className="text-[10px] font-cinzel uppercase tracking-[0.3em] text-theme-main/60 font-black px-1">
              Parchemin d'image (URL)
            </label>
            <input 
              type="text" 
              value={url} 
              onChange={e => handleUrlChange(e.target.value)} 
              placeholder="https://..." 
              className="w-full bg-black/40 border border-white/10 rounded-sm px-4 py-4 text-sm text-primary placeholder:opacity-20 focus:outline-none focus:border-theme-main/50 transition-all font-mono" 
              autoFocus 
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-black/20 border-t border-white/5 flex gap-3">
          {currentUrl && (
            <button onClick={handleRemove} disabled={loading} className="flex-1 py-3 rounded-sm border border-red-900/30 text-red-500/70 hover:bg-red-950/20 hover:text-red-400 hover:border-red-900/50 font-cinzel text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40">
              Effacer
            </button>
          )}
          <button 
            onClick={handleSave} 
            disabled={loading || (!!url && previewError)} 
            className="flex-1 py-3 rounded-sm bg-theme-main text-white font-cinzel text-[10px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(var(--color-main-rgb),0.2)] transition-all hover:bg-theme-main/80 disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? <span className="animate-pulse">Incantation…</span> : <><Check size={16} /> Sceller l'image</>}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function MonPersonnage() {
  const pnjControle = useStore(s => s.pnjControle)
  const setPnjControle = useStore(s => s.setPnjControle)
  const characterSheetMode = useStore(s => s.characterSheetMode)
  const { personnage, rechargerPersonnage, mettreAJourLocalement, mettreAJourRessourceHybride } = usePersonnage()
  const { stats } = useStats()
  const { deltas, updateDelta, adjustDelta, appliquerDelta } = useResourceManagement(personnage, mettreAJourLocalement, mettreAJourRessourceHybride)
  const [pseudoJoueur, setPseudoJoueur] = useState<string | null>(null)
  const [showImageModal, setShowImageModal] = useState(false)
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (personnage?.lie_au_compte) {
      supabase.from('comptes').select('pseudo').eq('id', personnage.lie_au_compte).single().then(({ data }) => { if (data) setPseudoJoueur(data.pseudo) })
    }
  }, [personnage?.lie_au_compte])

  const handleSupprimerPersonnage = async () => {
    if (!personnage) return
    const success = await personnageService.deletePersonnage(personnage.id)
    if (success) {
      if (pnjControle) setPnjControle(null)
      rechargerPersonnage()
    }
  }

  const handleSaveImage = async (url: string) => { await mettreAJourLocalement({ image_url: url || null }) }

  if (!personnage) return null

  const ressources = (Object.keys(CONFIG_RESSOURCES) as RessourceKey[]).map(key => ({        
    ...CONFIG_RESSOURCES[key],
    actuel: personnage[key as keyof typeof personnage] as number,
    max: personnage[`${key}_max` as keyof typeof personnage] as number,
    rKey: key
  }))

  const hp = ressources.find(r => r.rKey === 'hp')!
  const mana = ressources.find(r => r.rKey === 'mana')!
  const stam = ressources.find(r => r.rKey === 'stam')!

  const isMobile = windowWidth < 1024
  const gaugeSizeBase = isMobile ? (windowWidth < 640 ? 240 : 320) : 420

  return (
    <div className="relative w-full">
      <AnimatePresence>
        {showImageModal && <ImageModal currentUrl={personnage.image_url} onClose={() => setShowImageModal(false)} onSave={handleSaveImage} />}
      </AnimatePresence>

      {characterSheetMode === 'hero' ? (
        <motion.div key="hero-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative h-[calc(100vh-10rem)] lg:h-[calc(100vh-8rem)] flex flex-col items-center justify-center overflow-hidden py-4">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-theme-main/5 rounded-full blur-[120px] animate-pulse" />
          </div>
          <div className="absolute top-0 left-0 right-0 flex justify-between items-start z-10 px-4 pt-2">
            <div className="flex flex-col gap-1">
              <Badge variant="outline" className="font-cinzel text-[9px] md:text-[10px] tracking-[0.3em] border-theme-main/30 text-theme-main bg-black/40">{personnage.type === 'Joueur' ? 'HÉROS INCARNÉ' : 'ENTITÉ ANCIENNE'}</Badge>
              <span className="text-[9px] md:text-[10px] font-garamond italic opacity-40 uppercase tracking-widest ml-1">Âme liée: {pseudoJoueur || '...'}</span>
            </div>
            <ConfirmButton variant="danger" size="sm" onConfirm={handleSupprimerPersonnage} className="opacity-20 hover:opacity-100 transition-all font-cinzel text-[8px] md:text-[9px] uppercase tracking-tighter">Délier l'existence</ConfirmButton>
          </div>

          <div className="relative w-full max-w-7xl flex flex-col items-center gap-6 md:gap-10 lg:gap-16 flex-1 justify-center">
            <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-20 w-full">
              <div className={`grid ${isMobile ? 'grid-cols-3' : 'grid-cols-1'} gap-4 md:gap-6 order-2 lg:order-1 w-full lg:w-48`}>
                {stats.slice(0, 3).map(stat => {
                  const Icon = STAT_ICONS[stat.nom] || Shield
                  return (
                    <motion.div whileHover={{ x: isMobile ? 0 : 10, y: isMobile ? -5 : 0 }} key={stat.nom} className={`flex flex-col ${isMobile ? 'items-center text-center' : 'items-end text-right'} gap-0.5 md:gap-1 group cursor-default`}>
                      <div className="flex items-center gap-2">
                        {!isMobile && <span className="font-cinzel text-[10px] font-bold tracking-widest text-primary/40 group-hover:text-theme-main transition-colors uppercase">{stat.nom}</span>}
                        <Icon size={isMobile ? 14 : 16} className="text-theme-main opacity-20 group-hover:opacity-100 transition-opacity" />
                        {isMobile && <span className="font-cinzel text-[8px] font-bold tracking-widest text-primary/40 group-hover:text-theme-main transition-colors uppercase">{stat.nom}</span>}
                      </div>
                      <div className="flex items-baseline gap-1 md:gap-2">
                        {stat.bonus !== 0 && <span className={`text-[9px] md:text-[10px] font-black font-cinzel ${stat.bonus > 0 ? 'text-theme-main' : 'text-red-500'}`}>{stat.bonus > 0 ? `+${stat.bonus}` : stat.bonus}</span>}
                        <span className="text-2xl md:text-4xl font-cinzel font-black text-primary drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">{stat.valeur}</span>
                      </div>
                    </motion.div>
                  )
                })}
              </div>

              <div className="relative order-1 lg:order-2 flex flex-col items-center shrink-0">
                <div className="relative flex items-center justify-center transition-all duration-500" style={{ width: gaugeSizeBase, height: gaugeSizeBase }}>
                  <RadialGauge actuel={hp.actuel} max={hp.max} color="#dc2626" size={gaugeSizeBase} stroke={isMobile ? 4 : 6} offset={0} />
                  <RadialGauge actuel={mana.actuel} max={mana.max} color="#2563eb" size={gaugeSizeBase * 0.85} stroke={isMobile ? 3 : 5} offset={0} />
                  <RadialGauge actuel={stam.actuel} max={stam.max} color="#f59e0b" size={gaugeSizeBase * 0.7} stroke={isMobile ? 3 : 4} offset={0} />
                  <motion.button onClick={() => setShowImageModal(true)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="relative rounded-full overflow-hidden border-2 border-theme-main/20 bg-black/40 z-20 group shadow-[0_0_50px_rgba(0,0,0,0.5)]" style={{ width: gaugeSizeBase * 0.55, height: gaugeSizeBase * 0.55 }}>
                    {personnage.image_url ? <img src={personnage.image_url} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" /> : <UserCircle size="100%" className="text-theme-main/10 p-4 md:p-8" />}
                    <div className="absolute inset-0 bg-theme-main/20 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center">
                      <Camera size={isMobile ? 20 : 32} className="text-white drop-shadow-lg" />
                      <span className="font-cinzel text-[8px] font-bold text-white tracking-widest mt-1 hidden sm:block">Méditer l'image</span>
                    </div>
                  </motion.button>
                  <div className="absolute -bottom-4 md:-bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center z-30">
                    <h2 className="text-lg md:text-3xl font-cinzel font-black text-primary tracking-widest uppercase drop-shadow-[0_0_15px_rgba(var(--color-main-rgb),0.5)] whitespace-nowrap">{personnage.nom}</h2>
                    <div className="h-0.5 w-16 md:w-20 bg-gradient-to-r from-transparent via-theme-main to-transparent mt-0.5 md:mt-1" />
                  </div>
                </div>
              </div>

              <div className={`grid ${isMobile ? 'grid-cols-3' : 'grid-cols-1'} gap-4 md:gap-6 order-3 w-full lg:w-48`}>
                {stats.slice(3, 6).map(stat => {
                  const Icon = STAT_ICONS[stat.nom] || Shield
                  return (
                    <motion.div whileHover={{ x: isMobile ? 0 : -10, y: isMobile ? -5 : 0 }} key={stat.nom} className={`flex flex-col ${isMobile ? 'items-center text-center' : 'items-start text-left'} gap-0.5 md:gap-1 group cursor-default`}>
                      <div className="flex items-center gap-2">
                        {isMobile && <span className="font-cinzel text-[8px] font-bold tracking-widest text-primary/40 group-hover:text-theme-main transition-colors uppercase">{stat.nom}</span>}
                        <Icon size={isMobile ? 14 : 16} className="text-theme-main opacity-20 group-hover:opacity-100 transition-opacity" />
                        {!isMobile && <span className="font-cinzel text-[10px] font-bold tracking-widest text-primary/40 group-hover:text-theme-main transition-colors uppercase">{stat.nom}</span>}
                      </div>
                      <div className="flex items-baseline gap-1 md:gap-2">
                        <span className="text-2xl md:text-4xl font-cinzel font-black text-primary drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">{stat.valeur}</span>
                        {stat.bonus !== 0 && <span className={`text-[9px] md:text-[10px] font-black font-cinzel ${stat.bonus > 0 ? 'text-theme-main' : 'text-red-500'}`}>{stat.bonus > 0 ? `+${stat.bonus}` : stat.bonus}</span>}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>

            {/* Quick Resource Controls - ULTRA COMPACT & RESPONSIVE */}
            <div className="flex flex-row items-center justify-center gap-1.5 sm:gap-4 md:gap-8 z-30 bg-black/60 backdrop-blur-xl px-3 sm:px-6 py-2 rounded-full border border-theme-main/20 shadow-[0_0_30px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-4 duration-1000 shrink-0 max-w-full">
              <ResourceQuickControl r={hp} delta={deltas.hp} onAdjust={(v: any) => adjustDelta('hp', v)} onApply={() => appliquerDelta('hp')} onManual={(v: any) => updateDelta('hp', v)} />
              <div className="w-px h-6 bg-white/10 self-center shrink-0 mx-0.5 sm:mx-1" />
              <ResourceQuickControl r={mana} delta={deltas.mana} onAdjust={(v: any) => adjustDelta('mana', v)} onApply={() => appliquerDelta('mana')} onManual={(v: any) => updateDelta('mana', v)} />
              <div className="w-px h-6 bg-white/10 self-center shrink-0 mx-0.5 sm:mx-1" />
              <ResourceQuickControl r={stam} delta={deltas.stam} onAdjust={(v: any) => adjustDelta('stam', v)} onApply={() => appliquerDelta('stam')} onManual={(v: any) => updateDelta('stam', v)} />
            </div>
          </div>

          <div className="mt-6 md:mt-10 w-full max-w-2xl px-6 relative shrink-0 hidden sm:block">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-6 md:h-8 bg-gradient-to-b from-theme-main/40 to-transparent" />
            <p className="font-garamond text-base md:text-lg text-primary/30 italic text-center leading-relaxed mt-8 md:mt-10">"Les fils de l'existence se tissent autour de {personnage.nom}."</p>
          </div>
        </motion.div>
      ) : (
        <motion.div key="classic-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col relative">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 mt-2">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="font-cinzel text-[10px] tracking-[0.2em] border-theme-main/30 text-theme-main">{personnage.type === 'Joueur' ? 'AVENTURIER' : 'ENTITÉ'}</Badge>
                <span className="text-xs font-garamond italic opacity-40 uppercase tracking-widest">Lié à l'âme de : {pseudoJoueur || '...'}</span>
              </div>
            </div>
            <ConfirmButton variant="danger" size="sm" onConfirm={handleSupprimerPersonnage} className="opacity-30 hover:opacity-100 transition-opacity font-cinzel text-[10px] uppercase">Effacer du récit</ConfirmButton>
          </div>
          <div className="flex flex-col items-center mb-6">
            <span className="font-cinzel text-[10px] font-black text-theme-main tracking-[0.4em] opacity-40 uppercase">[ HÉROS INCARNÉ ]</span>
            <h2 className="text-xl md:text-2xl font-cinzel font-black text-primary mt-1 uppercase tracking-widest drop-shadow-sm">{personnage?.nom}</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-4 flex flex-col gap-8">
              <Card className="medieval-border p-8 flex flex-col items-center gap-6 bg-card/20 backdrop-blur-sm">
                <button onClick={() => setShowImageModal(true)} className="group w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-theme/30 p-1 relative overflow-hidden bg-black/20 hover:border-theme-main/60 transition-all duration-300 focus:outline-none" title="Modifier l'image de profil">
                  {personnage.image_url ? <img src={personnage.image_url} alt={personnage.nom} className="w-full h-full object-cover rounded-full" /> : <><UserCircle size="100%" className="text-theme-main opacity-20 absolute inset-0 scale-110" /><div className="absolute inset-0 flex items-center justify-center"><span className="font-cinzel text-4xl font-black text-theme-main opacity-40">{personnage.nom[0]}</span></div></>}
                  <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/50 flex items-center justify-center transition-all duration-300"><Camera size={22} className="text-[#c8a84b] opacity-0 group-hover:opacity-100 transition-opacity duration-300" /></div>
                </button>
                <h3 className="font-cinzel font-black uppercase tracking-widest text-xs text-theme-main">État Vital</h3>
                <div className="flex flex-col gap-4 w-full">
                  {ressources.map(r => <BarreRessource key={r.rKey} label={r.label} color={r.color} emoji={r.emoji} glow={r.glow} gradient={r.gradient} actuel={r.actuel} max={r.max} delta={deltas[r.rKey]} onDeltaChange={v => updateDelta(r.rKey, v)} onDeltaDecrement={() => adjustDelta(r.rKey, -1)} onDeltaIncrement={() => adjustDelta(r.rKey, 1)} onAppliquer={() => appliquerDelta(r.rKey)} />)}
                </div>
              </Card>
            </div>
            <div className="lg:col-span-8 flex flex-col gap-8">
              <Card className="medieval-border p-8 bg-card/20 backdrop-blur-sm">
                <h3 className="text-xl font-cinzel font-black uppercase tracking-widest mb-8 flex items-center gap-3 text-theme-main border-b border-theme/20 pb-4"><Swords size={24} />Attributs & Statistiques</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-3 gap-6">
                  {stats.map(stat => {
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
      )}
    </div>
  )
}

// ─── Mini-composant pour les contrôles rapides de ressources en Vue Héros ───
function ResourceQuickControl({ r, delta, onAdjust, onApply, onManual }: any) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-3 group/res">
       <div className="flex flex-col items-center">
          <button onClick={() => onAdjust(1)} className="text-theme-main hover:scale-125 transition-transform"><Plus size={10} /></button>
          <input type="text" value={delta} onChange={(e) => onManual(e.target.value)} className="w-6 sm:w-8 bg-transparent text-center font-cinzel font-black text-[10px] sm:text-xs text-primary border-b border-white/10 focus:border-theme-main outline-none" placeholder="0" />
          <button onClick={() => onAdjust(-1)} className="text-theme-main hover:scale-125 transition-transform"><Minus size={10} /></button>
       </div>
       <button onClick={onApply} disabled={!delta || delta === '0'} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-white/10 flex items-center justify-center transition-all hover:border-theme-main hover:shadow-[0_0_10px_rgba(var(--color-main-rgb),0.3)] group-hover/res:border-theme-main/50 disabled:opacity-20 bg-black/20 shrink-0" style={{ color: r.color }}>
         <span className="font-cinzel text-[9px] sm:text-[10px] font-black uppercase tracking-tighter">{r.label[0]}</span>
       </button>
       <div className="flex flex-col min-w-[30px] sm:min-w-[40px]">
          <div className="flex items-baseline gap-0.5">
            <span className="text-sm sm:text-lg font-cinzel font-black text-primary">{r.actuel}</span>
            <span className="text-[8px] sm:text-[9px] opacity-20">/{r.max}</span>
          </div>
          <span className="text-[7px] sm:text-[8px] font-cinzel font-bold text-theme-main uppercase tracking-widest opacity-0 group-hover/res:opacity-100 transition-opacity leading-none hidden sm:block">{r.label}</span>
       </div>
    </div>
  )
}
