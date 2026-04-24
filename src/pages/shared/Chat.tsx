import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { useChat } from '../../hooks/useChat'
import { useStore } from '../../store/useStore'
import { ChatCanal, chatService } from '../../services/chatService'
import {
  MessageSquare, Plus, X, Send, Image as ImageIcon,
  Trash2, ChevronDown, Pencil, ArrowLeft, Scroll, Sparkles
} from 'lucide-react'
import { ConfirmButton } from '../../components/ui/ConfirmButton'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { formatHeure, formatDate, getCanalLabel, getCanalIcon } from '../../components/chat/ChatUtils'
import { NouvelleConvModal, ModifierCanalModal } from '../../components/chat/ChatModals'
import RunicDecoder from '../../components/ui/RunicDecoder'

export default function Chat() {
  const {
    canaux, canalActif, canalActifId, setCanalActifId,
    messages, membres, chargementMessages, envoi,
    isMJ, compte,
    envoyerMessage, ouvrirConversation, renommerCanal, supprimerCanal, chargerMembres,
  } = useChat()

  const { mode } = useStore()
  const [texte, setTexte]                             = useState('')
  const [imageUrl, setImageUrl]                       = useState('')
  const [showImageInput, setShowImageInput]           = useState(false)
  const [modeIC, setModeIC]                           = useState(false)
  const [showNouvelleConv, setShowNouvelleConv]       = useState(false)
  const [canalAModifier, setCanalAModifier]           = useState<ChatCanal | null>(null)
  const [showScrollBtn, setShowScrollBtn]             = useState(false)
  const [isAtBottom, setIsAtBottom]                   = useState(true)
  const [viewedImageUrl, setViewedImageUrl]           = useState<string | null>(null)

  const messagesEndRef  = useRef<HTMLDivElement>(null)
  const messagesAreaRef = useRef<HTMLDivElement>(null)
  const inputRef        = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isAtBottom])

  useEffect(() => {
    setIsAtBottom(true)
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'instant' })
    }, 50)
  }, [canalActifId])

  const handleScroll = () => {
    const el = messagesAreaRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    setIsAtBottom(distanceFromBottom < 100)
    setShowScrollBtn(distanceFromBottom > 300)
  }

  const handleNouvelleConv = async () => {
    await chargerMembres()
    setShowNouvelleConv(true)
  }

  const handleModifierCanal = async (e: React.MouseEvent, canal: ChatCanal) => {
    e.stopPropagation()
    await chargerMembres()
    setCanalAModifier(canal)
  }

  const handleConfirmModification = async (nouveauNom: string, participantIds: string[]) => {
    if (!canalAModifier) return
    const labelActuel = getCanalLabel(canalAModifier, compte?.id || '')
    if (nouveauNom && nouveauNom !== labelActuel) {
      await renommerCanal(canalAModifier.id, nouveauNom)
    }
    if (canalAModifier.type !== 'general') {
      const anciens = canalAModifier.participants?.map(p => p.id_compte) ?? []
      await chatService.mettreAJourParticipants(canalAModifier.id, anciens, participantIds)
    }
    setCanalAModifier(null)
  }

  const handleEnvoyer = async () => {
    if (!texte.trim() && !imageUrl.trim()) return
    setIsAtBottom(true)
    await envoyerMessage(texte, { image_url: imageUrl.trim() || undefined, modeIC })
    setTexte('')
    setImageUrl('')
    setShowImageInput(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEnvoyer()
    }
  }

  type MsgItem =
    | { kind: 'separator'; label: string; key: string }
    | { kind: 'msg'; data: typeof messages[0] & { isFirst: boolean }; key: string }

  const items: MsgItem[] = []
  let lastDate = ''

  messages.forEach((msg, i) => {
    const dateLabel = formatDate(msg.created_at)
    if (dateLabel !== lastDate) {
      items.push({ kind: 'separator', label: dateLabel, key: `sep-${msg.id}` })
      lastDate = dateLabel
    }
    const isFirst =
      i === 0 ||
      messages[i - 1].id_compte !== msg.id_compte ||
      messages[i - 1].nom_affiche !== msg.nom_affiche ||
      new Date(msg.created_at).getTime() - new Date(messages[i - 1].created_at).getTime() > 3 * 60 * 1000
    items.push({ kind: 'msg', data: { ...msg, isFirst }, key: msg.id })
  })

  return (
    <div className={`absolute inset-0 flex overflow-hidden bg-app ${mode}`}>
      
      {/* 1. SIDEBAR : L'INDEX DES ARCHIVES (Cachée sur mobile si canal actif) */}
      <aside className={`${canalActifId ? 'hidden md:flex' : 'flex'} w-full md:w-64 lg:w-72 flex-shrink-0 flex-col bg-black/40 border-r border-white/5 backdrop-blur-2xl relative z-20 transition-all duration-300`}>
        <div className="p-4 md:p-6 border-b border-white/5 flex items-center justify-between bg-black/20">
           <div className="flex items-center gap-3">
             <div className="w-8 h-8 flex items-center justify-center bg-theme-main/10 rounded-sm">
                <span className="font-cinzel text-theme-main font-black text-lg drop-shadow-[0_0_8px_rgba(var(--color-main-rgb),0.5)]">ᛇ</span>
             </div>
             <span className="font-cinzel text-xs font-black tracking-[0.2em] text-primary uppercase">Chroniques</span>
           </div>
           <button 
            onClick={handleNouvelleConv}
            className="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center rounded-sm bg-theme-main/5 border border-theme-main/20 text-theme-main hover:bg-theme-main hover:text-white transition-all duration-300"
            title="Nouveau Récit"
           >
             <Plus size={16} />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 md:p-3 flex flex-col gap-1.5">
          {canaux.map(canal => {
            const isActive = canalActifId === canal.id
            const label = getCanalLabel(canal, compte?.id || '')
            return (
              <button
                key={canal.id}
                onClick={() => setCanalActifId(canal.id)}
                className={`group w-full flex items-center gap-4 p-3 rounded-sm transition-all relative
                  ${isActive 
                    ? 'bg-theme-main/10 text-primary border-r-2 border-theme-main' 
                    : 'text-primary/30 hover:bg-white/5 hover:text-primary/60'}`}
              >
                <div className={`shrink-0 w-10 h-10 md:w-8 md:h-8 flex items-center justify-center rounded-sm border transition-all
                  ${isActive ? 'bg-theme-main/20 border-theme-main/40' : 'bg-black/20 border-white/5'}`}>
                  {getCanalIcon(canal.type, isActive ? 16 : 14)}
                </div>
                <div className="flex flex-col items-start min-w-0">
                  <span className="font-cinzel text-[10px] font-bold tracking-widest uppercase truncate w-full text-left">{label}</span>
                  <span className="text-[7px] font-cinzel tracking-[.2em] text-theme-main/40 uppercase">{canal.type}</span>
                </div>
                {isActive && <motion.div layoutId="active-aura" className="absolute inset-0 bg-theme-main/5 blur-xl -z-10" />}
              </button>
            )
          })}
        </div>
        
        <div className="p-4 border-t border-white/5 bg-black/20 hidden md:block">
           <div className="flex items-center gap-3 opacity-20">
              <Sparkles size={14} className="text-theme-main" />
              <span className="font-cinzel text-[9px] tracking-widest uppercase truncate">Sigil Chronicles v2.4</span>
           </div>
        </div>
      </aside>

      {/* 2. MAIN AREA : LE PARCHEMIN DES MONDES (Cachée sur mobile si pas de canal actif) */}
      <main className={`${!canalActifId ? 'hidden md:flex' : 'flex'} flex-1 flex flex-col min-w-0 relative transition-all duration-300`}>
        
        {/* FILIGRANE RUNIQUE CENTRAL */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden">
          <span className="font-cinzel text-theme-main opacity-[0.015] text-[20rem] md:text-[50rem] blur-[1px]">ᛇ</span>
        </div>

        {/* HEADER DU CANAL */}
        <div className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-white/5 bg-black/20 backdrop-blur-md relative z-10">
          <div className="flex items-center gap-4 min-w-0">
            {canalActifId && (
              <button 
                onClick={() => setCanalActifId(null)} 
                className="flex items-center gap-2 md:gap-3 text-theme-main/40 hover:text-theme-main transition-all group/back shrink-0"
              >
                <ArrowLeft size={18} className="group-hover/back:-translate-x-1 transition-transform" />
                <span className="font-cinzel text-theme-main font-black text-sm">ᛇ</span>
                <span className="font-cinzel text-[10px] tracking-[0.3em] uppercase hidden sm:inline">Chroniques</span>
              </button>
            )}
            <div className="w-px h-6 bg-white/5 mx-1 hidden sm:block shrink-0" />
            <div className="flex flex-col min-w-0">
              <h2 className="font-cinzel text-xs md:text-base font-black tracking-[0.2em] md:tracking-[0.3em] text-primary uppercase leading-tight truncate">
                {canalActif ? <RunicDecoder text={getCanalLabel(canalActif, compte?.id || '')} /> : 'Sélectionnez un récit'}
              </h2>
              {canalActifId && <span className="text-[8px] font-cinzel tracking-[.3em] text-theme-main/40 uppercase mt-0.5 truncate">Chronique Scellée</span>}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
             {canalActifId && isMJ && canalActif!.type !== 'general' && (
               <div className="flex items-center gap-1 md:gap-3">
                 <button onClick={(e) => handleModifierCanal(e, canalActif!)} className="p-2 rounded-full hover:bg-white/5 text-theme-main/30 hover:text-theme-main transition-all"><Pencil size={14} /></button>
                 <ConfirmButton onConfirm={() => { supprimerCanal(canalActif!.id); setCanalActifId(null) }} variant="danger" className="h-8 px-2 md:px-3 border-red-900/20 text-red-500/60 hover:bg-red-900/10"><Trash2 size={14} /></ConfirmButton>
               </div>
             )}
          </div>
        </div>

        {/* ZONE DES MESSAGES */}
        <div className="flex-1 relative overflow-hidden flex flex-col">
          <div 
            ref={messagesAreaRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-16 py-6 md:py-10 flex flex-col gap-5 md:gap-8 relative z-10"
          >
            {chargementMessages ? (
              <div className="flex-1 flex items-center justify-center opacity-10"><span className="font-cinzel text-sm tracking-[0.6em] animate-pulse uppercase">Invoquation...</span></div>
            ) : !canalActifId ? (
              <div className="flex-1 flex flex-col items-center justify-center opacity-10 gap-6">
                <Scroll size={80} strokeWidth={0.5} className="text-theme-main" />
                <p className="font-cinzel text-lg font-bold tracking-[0.4em] uppercase text-center max-w-xs leading-relaxed">
                  Éveillez la mémoire du monde.
                </p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center opacity-5 gap-4">
                 <MessageSquare size={60} strokeWidth={0.5} />
                 <span className="font-cinzel text-xs tracking-[0.4em] uppercase text-center">Le grimoire est vierge</span>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto w-full flex flex-col">
                {items.map(item => {
                  if (item.kind === 'separator') {
                    return (
                      <div key={item.key} className="flex items-center gap-4 md:gap-6 my-8 md:my-12 opacity-30 px-4">
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-theme-main/30 to-transparent" />
                        <span className="font-cinzel text-[9px] md:text-[10px] tracking-[0.4em] md:tracking-[0.5em] text-theme-main uppercase whitespace-nowrap">{item.label}</span>
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-theme-main/30 to-transparent" />
                      </div>
                    )
                  }

                  const msg = item.data
                  const estMoi = msg.id_compte === compte?.id
                  const isOOC = msg.nom_affiche === (compte?.id === msg.id_compte ? compte?.pseudo : msg.nom_affiche) && !msg.nom_affiche.includes('(')

                  return (
                    <motion.div 
                      key={item.key} 
                      initial={{ opacity: 0, x: estMoi ? 10 : -10 }} 
                      animate={{ opacity: 1, x: 0 }} 
                      className={`flex flex-col ${msg.isFirst ? 'mt-8 md:mt-10' : 'mt-1'} ${estMoi ? 'items-end' : 'items-start'}`}
                    >
                      {msg.isFirst && (
                        <div className={`flex items-baseline gap-3 md:gap-4 mb-2 md:mb-3 px-2 ${estMoi ? 'flex-row-reverse' : 'flex-row'}`}>
                          <div className="flex items-center gap-2">
                             <div className={`w-1.5 h-1.5 rounded-full ${isOOC ? 'bg-white/20' : 'bg-theme-main/40'}`} />
                             <span className={`font-cinzel text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] md:tracking-[0.25em] ${isOOC ? 'text-primary/40' : 'text-theme-main/70'}`}>
                               {msg.nom_affiche}
                               {isOOC && <span className="ml-2 text-[8px] opacity-40 font-garamond italic lowercase tracking-normal">(hrp)</span>}
                             </span>
                          </div>
                          <span className="font-mono text-[8px] md:text-[9px] opacity-10 tracking-widest">{formatHeure(msg.created_at)}</span>
                        </div>
                      )}
                      <div className={`group/msg flex flex-col gap-2 ${estMoi ? 'items-end' : 'items-start'}`} style={{ maxWidth: '90%' }}>
                        {msg.contenu && (
                          <div className={`px-4 md:px-6 py-3 md:py-4 text-[13px] md:text-[15px] leading-relaxed transition-all border shadow-2xl relative
                            ${estMoi 
                              ? `${isOOC ? 'bg-white/5 border-white/10' : 'bg-theme-main/5 border-theme-main/30'} text-primary rounded-l-2xl rounded-tr-sm rounded-br-2xl` 
                              : 'bg-black/40 border-white/10 text-primary/80 rounded-r-2xl rounded-tl-sm rounded-bl-2xl hover:border-white/20'}`}
                            style={{ fontFamily: 'var(--font-garamond, serif)', fontStyle: isOOC ? 'italic' : 'normal' }}
                          >
                            {msg.contenu}
                            {!isOOC && <div className={`absolute top-0 w-8 h-px bg-theme-main/40 ${estMoi ? 'right-4' : 'left-4'}`} />}
                          </div>
                        )}
                        {msg.image_url && (
                          <motion.div 
                            whileHover={{ scale: 1.02 }}
                            className="overflow-hidden rounded-sm border border-white/10 shadow-2xl max-w-full md:max-w-[450px] hover:border-theme-main/40 transition-all mt-2"
                          >
                            <img 
                              src={msg.image_url} 
                              alt="" 
                              className="w-full h-auto object-cover cursor-pointer" 
                              onClick={() => setViewedImageUrl(msg.image_url!)} 
                            />
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <AnimatePresence>
            {showScrollBtn && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => { setIsAtBottom(true); messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }}
                className="absolute bottom-28 md:bottom-32 right-6 md:right-10 w-10 md:w-12 h-10 md:h-12 rounded-full bg-theme-main text-white shadow-2xl flex items-center justify-center transition-all z-30 shadow-[0_0_20px_rgba(var(--color-main-rgb),0.4)]"
              >
                <ChevronDown size={20} />
              </motion.button>
            )}
          </AnimatePresence>

          {/* ZONE DE SAISIE : L'ENCRIER DU DESTIN */}
          {canalActifId && (
            <div className="flex-shrink-0 px-4 md:px-6 py-4 md:py-6 border-t border-white/5 bg-black/60 backdrop-blur-3xl relative z-20">
              <div className="max-w-4xl mx-auto flex flex-col gap-3 md:gap-4">
                <AnimatePresence>
                  {showImageInput && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }} 
                      animate={{ height: 'auto', opacity: 1 }} 
                      exit={{ height: 0, opacity: 0 }} 
                      className="overflow-hidden bg-black/40 rounded-sm border border-theme-main/10 p-2 md:p-3 mb-1"
                    >
                      <div className="flex items-center gap-3 md:gap-4">
                         <ImageIcon size={14} className="text-theme-main opacity-40 shrink-0" />
                         <input 
                           placeholder="Lien d'image (URL)..." 
                           value={imageUrl} 
                           onChange={e => setImageUrl(e.target.value)} 
                           className="flex-1 bg-transparent text-[11px] font-garamond italic text-theme-main outline-none placeholder:text-theme-main/20" 
                         />
                         <button onClick={() => { setImageUrl(''); setShowImageInput(false) }} className="text-white/20 hover:text-white shrink-0"><X size={14} /></button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-end gap-2 md:gap-4">
                  <button 
                    onClick={() => setShowImageInput(!showImageInput)} 
                    className={`w-10 md:w-12 h-10 md:h-12 flex items-center justify-center rounded-full border transition-all shrink-0 
                      ${showImageInput ? 'bg-theme-main/20 border-theme-main/40 text-theme-main' : 'bg-white/5 border-white/10 text-white/20 hover:text-theme-main'}`}
                  >
                    <ImageIcon size={18} />
                  </button>

                  <div className="flex-1 relative group">
                    <textarea 
                      ref={inputRef} 
                      value={texte} 
                      onChange={e => setTexte(e.target.value)} 
                      onKeyDown={handleKeyDown} 
                      placeholder="Votre récit..." 
                      rows={1} 
                      className="w-full bg-black/60 border border-white/10 rounded-2xl px-4 md:px-6 py-2.5 md:py-4 text-[13px] md:text-[15px] text-primary outline-none focus:border-theme-main/40 transition-all resize-none min-h-[42px] md:min-h-[56px] max-h-[120px] md:max-h-[180px] custom-scrollbar shadow-inner" 
                      style={{ fontFamily: 'var(--font-garamond, serif)' }} 
                    />
                  </div>

                  {!isMJ && (
                    <button
                      onClick={() => setModeIC(v => !v)}
                      className={`w-10 md:w-12 h-10 md:h-12 rounded-full font-cinzel text-[10px] md:text-[11px] font-black border transition-all flex items-center justify-center shrink-0
                        ${modeIC
                          ? 'bg-theme-main/20 border-theme-main/40 text-theme-main shadow-[0_0_15px_rgba(var(--color-main-rgb),0.3)]'
                          : 'bg-white/5 border-white/10 text-white/20 hover:text-theme-main'}`}
                    >
                      {modeIC ? 'IC' : 'OOC'}
                    </button>
                  )}

                  <button 
                    onClick={handleEnvoyer} 
                    disabled={envoi || (!texte.trim() && !imageUrl.trim())} 
                    className="w-12 h-12 flex items-center justify-center rounded-full bg-theme-main text-white shadow-xl hover:scale-110 active:scale-95 transition-all disabled:opacity-10 disabled:grayscale shrink-0 shadow-[0_0_25px_rgba(var(--color-main-rgb),0.4)]"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODALS */}
      {showNouvelleConv && (
        <NouvelleConvModal membres={membres} compteId={compte?.id || ''} onConfirm={async (ids, nom) => { await ouvrirConversation(ids, nom); setShowNouvelleConv(false) }} onClose={() => setShowNouvelleConv(false)} />
      )}
      {canalAModifier && (
        <ModifierCanalModal canal={canalAModifier} compteId={compte?.id || ''} membres={membres} onConfirm={handleConfirmModification} onClose={() => setCanalAModifier(null)} />
      )}

      {/* 3. VISIONNEUSE D'ARCHIVES (IMAGE VIEWER) */}
      {viewedImageUrl && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setViewedImageUrl(null)}
            className={`fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 md:p-10 cursor-zoom-out ${mode}`}
          >
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-4 md:p-6 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent z-10">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-theme-main/10 rounded-sm">
                    <ImageIcon className="text-theme-main" size={20} />
                  </div>
                  <span className="font-cinzel text-xs font-black tracking-[0.2em] text-primary uppercase">Vision d'Archive</span>
               </div>
               <button 
                onClick={() => setViewedImageUrl(null)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all"
               >
                 <X size={24} />
               </button>
            </div>

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative max-w-full max-h-full flex items-center justify-center"
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute inset-0 bg-theme-main/5 blur-[120px] -z-10" />
              <img 
                src={viewedImageUrl} 
                alt="Archive" 
                className="max-w-full max-h-[80vh] md:max-h-[85vh] object-contain rounded-sm border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.9)]"
              />
              <div className="absolute -bottom-12 md:-bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40 pointer-events-none w-full text-center">
                <div className="h-px w-24 md:w-32 bg-gradient-to-r from-transparent via-theme-main to-transparent" />
                <span className="font-garamond italic text-[10px] md:text-sm text-primary/80">Fragment scellé dans les annales du Sigil</span>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}
