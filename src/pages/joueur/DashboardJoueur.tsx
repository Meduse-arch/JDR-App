import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'
import { usePersonnage } from '../../hooks/usePersonnage'
import { Card } from '../../components/ui/card'
import { queteService } from '../../services/queteService'
import { Quete } from '../../types'
import { motion } from 'framer-motion'
import { Package, Scroll, Heart, Zap, Dices, Flame } from 'lucide-react'
import { QueteDetailModal } from '../../components/ui/modal'

export default function DashboardJoueur() {
  const setPageCourante = useStore(s => s.setPageCourante)
  const { personnage, rechargerPersonnage } = usePersonnage()
  const [quetesSuivies, setQuetesSuivies] = useState<Quete[]>([])
  const [queteSelectionnee, setQueteSelectionnee] = useState<Quete | null>(null)
  
  const quetesRef = useRef<HTMLDivElement>(null)
  const [quetePage, setQuetePage] = useState(0)

  const chargerQuete = useCallback(async () => {
    if (!personnage) return
    const data = await queteService.getQuetesPersonnage(personnage.id)
    const suivies = data.filter((q: any) => q.suivie === true)
    setQuetesSuivies(suivies)
  }, [personnage])

  const chargerDonnees = useCallback(async () => {
    await chargerQuete()
  }, [chargerQuete])

  useEffect(() => {
    if (personnage) {
      chargerDonnees()
      const channel = supabase
        .channel('dashboard-joueur-' + personnage.id)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'quetes' }, () => chargerQuete())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'personnage_quetes', filter: `id_personnage=eq.${personnage.id}` }, () => chargerQuete())
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'personnages', filter: `id=eq.${personnage.id}` }, () => rechargerPersonnage())
        .subscribe()
      return () => { supabase.removeChannel(channel) }
    }
  }, [personnage, chargerDonnees, chargerQuete, rechargerPersonnage])

  useEffect(() => {
    const el = quetesRef.current
    if (!el) return
    const onScroll = () => {
      const h = el.clientHeight
      if (h > 0) {
        setQuetePage(Math.round(el.scrollTop / h))
      }
    }
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [quetesSuivies.length])

  const onToggleSuivre = async (q: any) => {
    if (!personnage) return
    const nouveauStatut = !q.suivie
    const ok = await queteService.toggleSuivreQuete(personnage.id, q.id, nouveauStatut)
    if (ok) {
      await chargerQuete()
    }
  }

  if (!personnage) return null

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4 pb-20 max-w-5xl mx-auto"
    >
      {/* 🏛️ IDENTITÉ DU HÉROS */}
      <div className="flex flex-col items-center text-center gap-2 mt-4">
        <h1 className="text-xl md:text-2xl font-cinzel font-black text-theme-main tracking-[0.15em] uppercase drop-shadow-md">
          {personnage.nom}
        </h1>
        <div className="flex items-center gap-3">
          <div className="h-px w-12 bg-theme-main/30" />
          <span className="font-cinzel text-[10px] font-black text-theme-main tracking-[0.4em] opacity-60 uppercase">
            [ INCARNATION ACTIVE ]
          </span>
          <div className="h-px w-12 bg-theme-main/30" />
        </div>
      </div>

      {/* 🩸 RESSOURCES VITALES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
        {/* POINTS DE VIE (HP) */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-red-500/20 rounded-lg blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
          <div className="relative flex items-center justify-between p-8 bg-black/40 border border-white/5 rounded-lg backdrop-blur-sm">
            <div className="flex flex-col gap-1">
              <span className="font-cinzel text-[10px] font-black text-red-500/60 tracking-widest uppercase">Points de Vie</span>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-cinzel font-black text-primary">{personnage.hp}</span>
                <span className="text-xl font-cinzel opacity-20 text-primary">/ {personnage.hp_max}</span>
              </div>
            </div>
            <Heart size={48} className="text-red-500/40 group-hover:scale-110 transition-transform duration-500" strokeWidth={1} />
          </div>
        </div>

        {/* POINTS DE MANA (MANA) */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-blue-500/20 rounded-lg blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
          <div className="relative flex items-center justify-between p-8 bg-black/40 border border-white/5 rounded-lg backdrop-blur-sm">
            <div className="flex flex-col gap-1">
              <span className="font-cinzel text-[10px] font-black text-blue-500/60 tracking-widest uppercase">Points de Mana</span>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-cinzel font-black text-primary">{personnage.mana}</span>
                <span className="text-xl font-cinzel opacity-20 text-primary">/ {personnage.mana_max}</span>
              </div>
            </div>
            <Zap size={48} className="text-blue-500/40 group-hover:scale-110 transition-transform duration-500" strokeWidth={1} />
          </div>
        </div>

        {/* POINTS DE STAMINA (STAMINA) */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-amber-500/20 rounded-lg blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
          <div className="relative flex items-center justify-between p-8 bg-black/40 border border-white/5 rounded-lg backdrop-blur-sm">
            <div className="flex flex-col gap-1">
              <span className="font-cinzel text-[10px] font-black text-amber-500/60 tracking-widest uppercase">Points de Stamina</span>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-cinzel font-black text-primary">{personnage.stam}</span>
                <span className="text-xl font-cinzel opacity-20 text-primary">/ {personnage.stam_max}</span>
              </div>
            </div>
            <Flame size={48} className="text-amber-500/40 group-hover:scale-110 transition-transform duration-500" strokeWidth={1} />
          </div>
        </div>
      </div>

      {/* 📜 ÉCHO DES QUÊTES (CENTRE) */}
      <div className="px-4">
        <Card className="p-6 border-theme-main/20 bg-theme-main/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-theme-main/40 to-transparent" />
          <span className="font-cinzel text-[9px] font-black text-theme-main tracking-[0.5em] opacity-40 uppercase block mb-3">[ OBJECTIFS DE DESTIN ]</span>
          {quetesSuivies.length === 0 ? (
            <div className="py-10 flex flex-col items-center justify-center opacity-30 gap-3 border border-dashed border-white/5 rounded-lg cursor-pointer hover:opacity-50 transition-all" onClick={() => setPageCourante('mes-quetes')}>
              <Scroll size={32} strokeWidth={1} />
              <span className="font-garamond italic text-lg text-primary">Aucune quête ne guide vos pas...</span>
            </div>
          ) : (
            <>
              <div
                ref={quetesRef}
                className="overflow-y-scroll [&::-webkit-scrollbar]:hidden"
                style={{ height: '110px', scrollSnapType: 'y mandatory', scrollbarWidth: 'none' }}
              >
                {quetesSuivies.map(q => (
                  <div key={q.id} style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always', minHeight: '110px' }} className="flex flex-col gap-2 justify-between pb-1">
                    <div>
                      <h2 className="font-cinzel font-bold text-lg text-primary tracking-wide uppercase">{q.titre}</h2>
                      <p className="font-garamond italic text-primary/70 text-sm line-clamp-1">"{q.description || "Votre chemin reste à tracer dans les brumes de l'inconnu..."}"</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-cinzel text-[8px] text-theme-main/40 uppercase tracking-widest flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-theme-main/60 inline-block" /> En cours
                      </span>
                      <button onClick={() => { setQueteSelectionnee(q); }} className="font-cinzel text-[9px] text-theme-main opacity-40 hover:opacity-100 tracking-[0.3em] transition-all uppercase">Détails</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-center gap-1.5 mt-2">
                {quetesSuivies.map((_, i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${quetePage === i ? 'bg-theme-main/60' : 'bg-theme-main/20'}`} />
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* 🏹 RACCOURCIS DE DESTIN */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 px-4">
        <button 
          onClick={() => setPageCourante('mon-inventaire')}
          className="group relative overflow-hidden p-8 rounded-lg border border-white/5 bg-black/20 hover:bg-theme-main/5 transition-all duration-500"
        >
          <div className="flex items-center gap-6">
            <div className="p-4 rounded-full bg-white/5 group-hover:bg-theme-main/10 transition-colors">
              <Package size={24} className="text-theme-main opacity-60 group-hover:opacity-100 transition-all" />
            </div>
            <div className="flex flex-col items-start">
              <span className="font-cinzel text-sm font-black tracking-widest text-primary group-hover:text-theme-main transition-colors uppercase">Consulter la Besace</span>
              <span className="font-garamond text-xs italic text-primary/40 group-hover:text-primary/60 transition-colors tracking-wide">Gérer votre équipement et vos trésors</span>
            </div>
          </div>
        </button>

        <button 
          onClick={() => setPageCourante('lancer-des')}
          className="group relative overflow-hidden p-8 rounded-lg border border-white/5 bg-black/20 hover:bg-theme-main/5 transition-all duration-500"
        >
          <div className="flex items-center gap-6">
            <div className="p-4 rounded-full bg-white/5 group-hover:bg-theme-main/10 transition-colors">
              <Dices size={24} className="text-theme-main opacity-60 group-hover:opacity-100 transition-all" />
            </div>
            <div className="flex flex-col items-start">
              <span className="font-cinzel text-sm font-black tracking-widest text-primary group-hover:text-theme-main transition-colors uppercase">Interroger l'Oracle</span>
              <span className="font-garamond text-xs italic text-primary/40 group-hover:text-primary/60 transition-colors tracking-wide">Remettez votre destin entre les mains du sort</span>
            </div>
          </div>
        </button>
      </div>

      <QueteDetailModal 
        quete={queteSelectionnee} 
        mode="joueur" 
        onClose={() => setQueteSelectionnee(null)}
        onSuivre={onToggleSuivre}
      />

    </motion.div>
  )
}
