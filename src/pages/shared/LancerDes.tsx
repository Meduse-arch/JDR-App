import { useState, useEffect } from 'react'
import { useStats } from '../../hooks/useStats'
import { usePersonnage } from '../../hooks/usePersonnage'
import { useStore } from '../../store/useStore'
import { lancerDes } from '../../utils/des'
import { logService } from '../../services/logService'
import { useLogs } from '../../hooks/useLogs'
import { Button } from '../../components/ui/Button'
import { History, Share2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { broadcastService } from '../../services/broadcastService'
import { DiceSharingModal } from '../../components/ui/modal/DiceSharingModal'

const DIE_TYPES = [4, 6, 8, 10, 12, 20, 100];

export default function LancerDes() {
  const { stats } = useStats()
  const { personnage } = usePersonnage()
  const { 
    setDiceResult, 
    sessionActive, 
    roleEffectif, 
    diceSharingEnabled, 
    setDiceSharingEnabled 
  } = useStore()
  const isMJ = roleEffectif === 'admin' || roleEffectif === 'mj'

  const [nbDesInput,   setNbDesInput]   = useState<string | number>(1)
  const [facesDeInput, setFacesDeInput] = useState<string | number>(20)
  const [modInput,     setModInput]     = useState<string | number>(0)
  
  const [showSharingModal, setShowSharingModal] = useState(false)

  // Historique local pour les jets privés du MJ (non loggés en BDD)
  const [historiqueMJ, setHistoriqueMJ] = useState<any[]>(() => {
    const saved = localStorage.getItem(`sigil-history-mj-${sessionActive?.id}`)
    return saved ? JSON.parse(saved) : []
  })

  // Écouter le changement de mode spectateur diffusé par le MJ
  useEffect(() => {
    if (!sessionActive) return
    const unsubscribe = broadcastService.subscribe(sessionActive.id, 'toggle-spectateur', (val: boolean) => {
      setDiceSharingEnabled(val)
    })
    return () => unsubscribe()
  }, [sessionActive, setDiceSharingEnabled])

  const toggleSpectateur = () => {
    if (!isMJ || !sessionActive) return
    const nouveauStatut = !diceSharingEnabled
    setDiceSharingEnabled(nouveauStatut)
    broadcastService.send(sessionActive.id, 'toggle-spectateur', nouveauStatut)
  }

  // Historique = logs Supabase filtrés sur ce personnage, type 'des'
  const { logs: logsActivite } = useLogs(sessionActive?.id, personnage?.id)
  
  const historique = (isMJ && !personnage) 
    ? historiqueMJ 
    : logsActivite.filter(l => l.type === 'des').slice(0, 20)

  const getNum = (v: any, def: number) => {
    if (v === '' || v === null || v === undefined || v === '-') return def
    const n = Number(v)
    return isNaN(n) ? def : n
  }

  const executerLancer = (labelPerso: string, facesForcees?: number) => {
    const nb    = Math.max(1, getNum(nbDesInput, 1))
    const mod   = getNum(modInput, 0)
    const faces = Math.max(2, getNum(facesForcees, 0) || getNum(facesDeInput, 20))
    const res   = lancerDes(nb, faces, mod)
    const label = labelPerso || `${nb}d${faces}${mod !== 0 ? (mod > 0 ? '+' : '') + mod : ''}`

    const results = [{
      rolls: res.des,
      total: res.total,
      bonus: mod,
      diceString: `${nb}d${faces}`,
      label: labelPerso || 'Jet Manuel',
      color: 'var(--color-main)',
      secret: false // Géré par setDiceResult
    }]

    setDiceResult(results)

    const currentRoleEffectif = useStore.getState().roleEffectif;
    const currentSessionActive = useStore.getState().sessionActive;
    const currentPnjControle = useStore.getState().pnjControle;

    if (currentSessionActive) {
      if (personnage) {
        const shouldLog = currentRoleEffectif === 'joueur' ? !currentPnjControle : true;
        if (shouldLog) {
          logService.logAction({
            id_session: currentSessionActive.id,
            id_personnage: personnage.id,
            nom_personnage: personnage.nom,
            type: 'des',
            action: `Lance ${label}`,
            details: { resultat: res.des, total: res.total }
          }).catch(console.error);
        }
      } else if (isMJ) {
        // Log local privé pour le MJ sans personnage
        const newLog = {
          id: Date.now().toString(),
          type: 'des',
          action: `Lance ${label}`,
          details: { resultat: res.des, total: res.total }
        }
        const newHistory = [newLog, ...historiqueMJ].slice(0, 20)
        setHistoriqueMJ(newHistory)
        localStorage.setItem(`sigil-history-mj-${currentSessionActive.id}`, JSON.stringify(newHistory))
      }
    }
  }

  const modAffichage = getNum(modInput, 0)

  return (
    <div className="flex flex-col gap-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* COLONNE GAUCHE : INVOCATIONS */}
        <div className="lg:col-span-8 flex flex-col gap-12">
          
          {/* SCEAUX DE DESTIN (Dés rapides) */}
          <div className="flex flex-col gap-6 relative z-10">
            <h3 className="text-[10px] font-cinzel font-black uppercase tracking-[0.4em] text-theme-main opacity-60">[ SCEAUX DE DESTIN ]</h3>
            <div className="flex flex-wrap gap-4">
              {DIE_TYPES.map(faces => (
                <button
                  key={faces}
                  onClick={() => { setFacesDeInput(faces); executerLancer('', faces); }}
                  className="w-14 h-14 md:w-16 md:h-14 rounded-full border border-theme-main/30 bg-black/20 flex items-center justify-center font-cinzel font-black text-lg transition-all hover:scale-110 hover:border-theme-main hover:shadow-[0_0_15px_rgba(var(--color-main-rgb),0.3)] group"
                >
                  <span className="group-hover:text-theme-main transition-colors opacity-60 group-hover:opacity-100">D{faces}</span>
                </button>
              ))}
            </div>
          </div>

          {/* INVOCATION MANUELLE */}
          <div className="flex flex-col gap-6 relative z-10">
            <h3 className="text-[10px] font-cinzel font-black uppercase tracking-[0.4em] text-theme-main opacity-60">[ INVOCATION MANUELLE ]</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 bg-black/20 p-8 rounded-sm backdrop-blur-sm border border-white/5 items-end">
              <div className="md:col-span-2 flex items-center gap-8 justify-between md:justify-start">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-cinzel font-black uppercase opacity-30 text-center">Qté</label>
                  <input 
                    type="number" 
                    value={nbDesInput} 
                    onChange={e => setNbDesInput(e.target.value)}
                    className="bg-transparent border-b border-theme/20 focus:border-theme-main outline-none font-garamond italic text-3xl w-14 text-center transition-all text-primary placeholder:opacity-20 shadow-none"
                  />
                </div>
                <span className="font-cinzel font-black text-xl text-theme-main pb-1">D</span>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-cinzel font-black uppercase opacity-30 text-center">Faces</label>
                  <input 
                    type="number" 
                    value={facesDeInput} 
                    onChange={e => setFacesDeInput(e.target.value)}
                    className="bg-transparent border-b border-theme/20 focus:border-theme-main outline-none font-garamond italic text-3xl w-16 text-center transition-all text-primary placeholder:opacity-20 shadow-none"
                  />
                </div>
                <div className="flex flex-col gap-1 ml-4">
                  <label className="text-[9px] font-cinzel font-black uppercase opacity-30 text-center">Mod.</label>
                  <div className="flex items-center">
                    <span className="text-xl opacity-30 mr-1 pb-1">+</span>
                    <input 
                      type="number" 
                      value={modInput} 
                      onChange={e => setModInput(e.target.value)}
                      className="bg-transparent border-b border-theme/20 focus:border-theme-main outline-none font-garamond italic text-3xl w-16 text-center transition-all text-primary placeholder:opacity-20 shadow-none"
                    />
                  </div>
                </div>
              </div>

              <div className="md:col-span-1 flex flex-col items-end gap-3">
                <button 
                  onClick={() => setDiceSharingEnabled(!diceSharingEnabled)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 ${
                    diceSharingEnabled 
                    ? 'bg-theme-main/20 border-theme-main text-theme-main shadow-[0_0_10px_rgba(var(--color-main-rgb),0.2)]' 
                    : 'bg-black/40 border-white/10 text-white/40 hover:border-white/20'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${diceSharingEnabled ? 'bg-theme-main animate-pulse' : 'bg-white/20'}`} />
                  <span className="font-cinzel text-[9px] font-black uppercase tracking-widest">
                    {diceSharingEnabled ? 'Diffusé à la session' : 'Jet Secret (Caché)'}
                  </span>
                </button>

                <Button 
                  onClick={() => executerLancer('')} 
                  className="w-full xl:w-64 px-8 font-cinzel font-black tracking-[0.2em] uppercase py-3 text-[11px] shadow-xl shadow-theme-main/10 min-h-[50px] leading-tight"
                >
                  Interroger l'Oracle
                </Button>
              </div>
            </div>
          </div>

          {/* JETS D'ATTRIBUTS */}
          {stats.length > 0 && (
            <div className="flex flex-col gap-6 relative z-10">
              <h3 className="text-[10px] font-cinzel font-black uppercase tracking-[0.4em] text-theme-main opacity-60">[ JETS D'ATTRIBUTS ]</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-6">
                {stats.map(stat => (
                  <button 
                    key={stat.nom} 
                    onClick={() => executerLancer(stat.nom, stat.valeur)} 
                    className="p-6 rounded-sm transition-all duration-500 flex flex-col items-center justify-center gap-4 hover:scale-105 group bg-card/20 border border-theme/20 hover:border-theme-main hover:bg-theme-main/5 shadow-sm"
                  >
                    <span className="text-[10px] font-cinzel font-black uppercase tracking-widest text-primary opacity-40 group-hover:text-theme-main group-hover:opacity-100 transition-all">{stat.nom}</span>
                    <div className="flex items-center gap-3">
                      <div className="text-2xl font-cinzel font-black text-primary group-hover:text-theme-main transition-colors">D{stat.valeur}</div>
                      {modAffichage !== 0 && (
                        <span className={`text-sm font-black font-cinzel ${modAffichage > 0 ? 'text-theme-main' : 'text-red-700'}`}>
                          {modAffichage > 0 ? `+${modAffichage}` : modAffichage}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* COLONNE DROITE : ANNALES */}
        <div className="lg:col-span-4 flex flex-col gap-6 w-full relative z-10">
          <h3 className="text-[10px] font-cinzel font-black uppercase tracking-[0.4em] opacity-60">ANNALES DU DESTIN</h3>
          
          <div className="flex flex-col bg-black/20 backdrop-blur-sm border border-white/5 rounded-sm overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-theme/10 bg-black/20">
              <div className="flex items-center gap-2 text-theme-main">
                <History size={16} className="opacity-40" />
                <span className="font-cinzel text-xs uppercase tracking-widest opacity-50">Historique</span>
              </div>

              {/* Boutons MJ */}
              {isMJ && (
                <div className="flex flex-col gap-2 items-end">
                  <button 
                    onClick={toggleSpectateur}
                    className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-all duration-300 ${
                      diceSharingEnabled 
                      ? 'bg-theme-main/20 border-theme-main text-theme-main shadow-[0_0_10px_rgba(var(--color-main-rgb),0.2)]' 
                      : 'bg-black/40 border-white/10 text-white/20 hover:border-white/30'
                    }`}
                    title={diceSharingEnabled ? "Désactiver le partage des jets" : "Activer le partage des jets"}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${diceSharingEnabled ? 'bg-theme-main animate-pulse' : 'bg-white/20'}`} />
                    <span className="font-cinzel text-[8px] font-black uppercase tracking-widest">
                      {diceSharingEnabled ? 'Mode Spectateur' : 'Jets Privés'}
                    </span>
                  </button>

                  <button 
                    onClick={() => setShowSharingModal(true)}
                    className="flex items-center gap-2 px-3 py-1 rounded-full border bg-black/40 border-white/10 text-white/40 hover:border-theme-main/50 hover:text-theme-main transition-all duration-300"
                    title="Configurer les règles de partage des jets secrets"
                  >
                    <Share2 size={10} />
                    <span className="font-cinzel text-[8px] font-black uppercase tracking-widest">
                      Jet Partagé
                    </span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-col max-h-[500px] overflow-y-auto custom-scrollbar pr-3 pt-4 p-4">
              {historique.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-10 gap-4">
                  <History size={48} strokeWidth={1} />
                  <p className="text-center font-garamond italic text-lg tracking-widest">Les pages sont vierges...</p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {historique.map((log, i) => {
                    const estDernier = i === 0
                    const des: number[] = log.details?.resultat || []
                    const total: number = log.details?.total ?? 0
                    // Extraire le label depuis l'action "Lance 2d6+1" → "2d6+1"
                    const label = log.action.replace(/^Lance\s+/, '')

                    return (
                      <motion.div 
                        key={log.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`flex justify-between items-center w-full min-h-[70px] px-6 py-4 border-b border-white/5 bg-black/10 mb-2 rounded-lg flex-shrink-0 transition-colors hover:bg-white/5 ${
                          estDernier ? 'bg-theme-main/5 border-l-2 border-l-theme-main shadow-[0_0_15px_rgba(var(--color-main-rgb),0.1)]' : 'opacity-60'
                        }`}
                      >
                        {/* Gauche : Le Récit */}
                        <div className="flex-1 flex flex-col gap-1 overflow-hidden min-w-0 pr-4">
                          <span className={`font-cinzel text-xs font-black uppercase tracking-widest truncate ${estDernier ? 'text-theme-main' : 'text-primary'}`}>
                            {label}
                          </span>
                          {des.length > 0 && (
                            <span className="font-garamond text-[10px] opacity-40 italic truncate">
                              {des.join(' + ')}
                            </span>
                          )}
                        </div>

                        {/* Droite : Le Résultat Sacré */}
                        <div className="w-16 flex-shrink-0 text-right">
                          <span className={`font-cinzel text-4xl font-black ${estDernier ? 'text-theme-main drop-shadow-[0_0_15px_rgba(var(--color-main-rgb),0.4)]' : 'text-primary opacity-60'}`}>
                            {total}
                          </span>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {showSharingModal && <DiceSharingModal onClose={() => setShowSharingModal(false)} />}
    </div>
  )
}