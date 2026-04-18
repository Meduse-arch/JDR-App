import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { useChat } from '../../hooks/useChat'
import { ChatCanal, chatService } from '../../services/chatService'
import {
  MessageSquare, Plus, X, Send, Image as ImageIcon,
  Trash2, ChevronDown, Pencil, ArrowLeft
} from 'lucide-react'
import { ConfirmButton } from '../../components/ui/ConfirmButton'
import { motion, AnimatePresence } from 'framer-motion'
import { formatHeure, formatDate, getCanalLabel, getCanalIcon, getInitiales } from '../../components/chat/ChatUtils'
import { RuneFond } from '../../components/chat/RuneFond'
import { NouvelleConvModal, ModifierCanalModal } from '../../components/chat/ChatModals'

export default function Chat() {
  const {
    canaux, canalActif, canalActifId, setCanalActifId,
    messages, membres, chargementMessages, envoi,
    isMJ, compte,
    envoyerMessage, ouvrirConversation, renommerCanal, supprimerCanal, chargerMembres,
  } = useChat()

  const [texte, setTexte]                             = useState('')
  const [imageUrl, setImageUrl]                       = useState('')
  const [showImageInput, setShowImageInput]           = useState(false)
  const [modeIC, setModeIC]                           = useState(false)
  const [showNouvelleConv, setShowNouvelleConv]       = useState(false)
  const [canalAModifier, setCanalAModifier]           = useState<ChatCanal | null>(null)
  const [showScrollBtn, setShowScrollBtn]             = useState(false)
  const [isAtBottom, setIsAtBottom]                   = useState(true)

  const messagesEndRef  = useRef<HTMLDivElement>(null)
  const messagesAreaRef = useRef<HTMLDivElement>(null)
  const inputRef        = useRef<HTMLTextAreaElement>(null)

  // Scroll auto bas uniquement si déjà en bas
  useEffect(() => {
    if (isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isAtBottom])

  // Scroll to bottom when switching canal
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
    const atBottom = distanceFromBottom < 80
    setIsAtBottom(atBottom)
    setShowScrollBtn(!atBottom)
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

    // Renommer si le nom a changé
    const labelActuel = getCanalLabel(canalAModifier, compte?.id || '')
    if (nouveauNom && nouveauNom !== labelActuel) {
      await renommerCanal(canalAModifier.id, nouveauNom)
    }

    // Mettre à jour les participants si changement (pour prive/groupe)
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

  // Grouper messages + séparateurs de date
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
      new Date(msg.created_at).getTime() - new Date(messages[i - 1].created_at).getTime() > 5 * 60 * 1000
    items.push({ kind: 'msg', data: { ...msg, isFirst }, key: msg.id })
  })

  // ─── Vue Chat (toujours affichée dans le conteneur) ───
  return (
    <div
      className="flex flex-col bg-black/20 backdrop-blur-sm border border-white/5 rounded-sm overflow-hidden h-[calc(100vh-280px)] min-h-[550px] w-full max-w-6xl mx-auto relative"
      style={{ isolation: 'isolate' }}
    >
      {/* Rune en fond du conteneur */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <RuneFond />
      </div>

      {/* Contenu au-dessus de la rune */}
      <div className="relative flex flex-col h-full" style={{ zIndex: 1 }}>

        {/* HEADER */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-white/10 bg-black/20 shrink-0">
          <div className="flex items-center gap-4">
            {canalActifId && (
              <>
                <button
                  onClick={() => setCanalActifId(null)}
                  className="flex items-center gap-2 text-[rgba(200,168,75,0.4)] hover:text-[#c8a84b] transition-colors group/back"
                >
                  <ArrowLeft size={16} className="group-hover/back:-translate-x-1 transition-transform" />
                  <span className="font-cinzel text-[10px] tracking-widest uppercase">Codex</span>
                </button>
                <div className="w-px h-4 bg-white/10 mx-1" />
                <div className="flex items-center gap-2.5">
                  <span className="text-[#c8a84b] opacity-60">{getCanalIcon(canalActif!.type, 14)}</span>
                  <h3 className="font-cinzel text-xs font-black uppercase tracking-widest text-primary">
                    {getCanalLabel(canalActif!, compte?.id || '')}
                  </h3>
                </div>
              </>
            )}
            {!canalActifId && (
              <div>
                <h2 className="font-cinzel text-[15px] font-semibold tracking-[.2em] text-[#c8a84b]"
                  style={{ textShadow: '0 0 20px rgba(200,168,75,0.25)' }}>
                  Chroniques
                </h2>
                <p className="text-[9px] font-cinzel tracking-[.25em] text-[rgba(200,168,75,0.3)] mt-0.5 uppercase">
                  {canaux.length} conversation{canaux.length > 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {canalActifId && isMJ && canalActif!.type !== 'general' && (
              <button
                onClick={(e) => handleModifierCanal(e, canalActif!)}
                className="p-1.5 rounded hover:bg-white/5 text-[rgba(200,168,75,0.4)] hover:text-[#c8a84b] transition-all"
                title="Modifier le canal"
              >
                <Pencil size={14} />
              </button>
            )}
            {canalActifId && isMJ && canalActif!.type !== 'general' && (
              <ConfirmButton
                onConfirm={() => { supprimerCanal(canalActif!.id); setCanalActifId(null) }}
                variant="danger"
                className="h-7 px-2 border-[rgba(180,50,50,0.3)] text-[#e87a7a] hover:bg-[rgba(180,50,50,0.1)]"
              >
                <Trash2 size={13} />
              </ConfirmButton>
            )}
            {!canalActifId && (
              <button
                onClick={handleNouvelleConv}
                className="flex items-center gap-2 border border-[rgba(200,168,75,0.35)] bg-[rgba(200,168,75,0.06)] text-[rgba(200,168,75,0.8)] px-3 py-1.5 rounded-md font-cinzel text-[10px] tracking-[.12em] hover:bg-[rgba(200,168,75,0.12)] hover:border-[rgba(200,168,75,0.6)] hover:text-[#c8a84b] transition-all duration-150"
              >
                <Plus size={12} />
                Nouveau
              </button>
            )}
            {canalActifId && (
              <span className="font-cinzel text-[9px] tracking-widest opacity-20 uppercase">En cours</span>
            )}
          </div>
        </div>

        {/* CORPS */}
        {!canalActifId ? (
          // ─── Vue liste des canaux (dans le conteneur) ───
          <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4">
            {canaux.length === 0 && (
              <p className="font-cinzel text-[rgba(200,168,75,0.25)] text-sm text-center py-12 tracking-widest italic">
                Aucune chronique en cours...
              </p>
            )}
            <div className="grid gap-2 max-w-2xl mx-auto">
              {canaux.map(canal => {
                const label = getCanalLabel(canal, compte?.id || '')
                const isMJCanal = isMJ && canal.type !== 'general'
                return (
                  <div
                    key={canal.id}
                    onClick={() => setCanalActifId(canal.id)}
                    className="group flex items-center gap-4 px-4 py-3 rounded-lg border bg-[rgba(200,168,75,0.02)] border-[rgba(184,142,60,0.1)] hover:bg-[rgba(200,168,75,0.06)] hover:border-[rgba(184,142,60,0.22)] cursor-pointer transition-all duration-150"
                  >
                    <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center bg-[#1a150a] border border-[rgba(200,168,75,0.15)] text-[rgba(200,168,75,0.4)] group-hover:text-[#c8a84b] group-hover:border-[rgba(200,168,75,0.4)] transition-all overflow-hidden">
                      {canal.type === 'prive' ? (
                        <span className="font-cinzel text-xs font-bold">{getInitiales(label)}</span>
                      ) : (
                        getCanalIcon(canal.type, 18)
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-cinzel text-[13px] tracking-wider text-[rgba(220,200,150,0.8)] group-hover:text-[#e8d9b0] transition-colors truncate">
                          {label}
                        </span>
                        <span className={`text-[8px] font-cinzel tracking-[.1em] px-1.5 py-0.5 rounded-sm border flex-shrink-0 opacity-60
                          ${canal.type === 'general' ? 'bg-[rgba(200,168,75,0.1)] text-[#c8a84b] border-[rgba(200,168,75,0.2)]' : 'bg-[rgba(255,255,255,0.05)] text-white/40 border-white/10'}`}>
                          {canal.type.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[10px] font-garamond italic text-[rgba(200,168,75,0.3)] group-hover:text-[rgba(200,168,75,0.45)] transition-colors truncate">
                        {canal.dernierMessage ? `Dernier message : ${canal.dernierMessage.contenu || 'Image'}` : 'Aucun message dans cette chronique...'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isMJCanal && (
                        <>
                          <button
                            onClick={e => handleModifierCanal(e, canal)}
                            className="w-7 h-7 rounded bg-[rgba(200,168,75,0.06)] border border-[rgba(184,142,60,0.15)] flex items-center justify-center text-[rgba(200,168,75,0.4)] hover:text-[#c8a84b] hover:bg-[rgba(200,168,75,0.12)] transition-all"
                            title="Modifier"
                          >
                            <Pencil size={11} />
                          </button>
                          <ConfirmButton
                            onConfirm={() => supprimerCanal(canal.id)}
                            variant="danger"
                            className="h-7 w-7 border-[rgba(180,50,50,0.3)] text-[#e87a7a] hover:bg-[rgba(180,50,50,0.1)] flex items-center justify-center"
                          >
                            <Trash2 size={11} />
                          </ConfirmButton>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          // ─── Vue Chat Actif ───
          <div className="flex flex-1 overflow-hidden min-h-0">

            {/* SIDEBAR GAUCHE */}
            <div className="w-52 flex-shrink-0 flex flex-col h-full bg-[#09080580] border-r border-[rgba(184,142,60,0.12)]">
              <div className="px-3 pt-3 pb-2.5 border-b border-[rgba(184,142,60,0.1)]">
                <p className="text-[8px] font-cinzel tracking-[.28em] text-[rgba(200,168,75,0.3)] uppercase">Chroniques</p>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar py-1.5 px-2">
                {canaux.map(canal => {
                  const isActive = canalActifId === canal.id
                  const label = getCanalLabel(canal, compte?.id || '')
                  const canDelete = isMJ && canal.type !== 'general'
                  return (
                    <div
                      key={canal.id}
                      className={`group/item w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md mb-0.5 transition-all duration-150 border
                        ${isActive
                          ? 'bg-[rgba(200,168,75,0.11)] border-[rgba(200,168,75,0.22)]'
                          : 'hover:bg-[rgba(200,168,75,0.05)] border-transparent'
                        }`}
                    >
                      <button
                        onClick={() => setCanalActifId(canal.id)}
                        className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                      >
                        <span className={isActive ? 'text-[#c8a84b]' : 'text-[rgba(200,168,75,0.25)]'}>
                          {getCanalIcon(canal.type, 12)}
                        </span>
                        <p className={`text-[11px] font-cinzel truncate tracking-wide
                          ${isActive ? 'text-[#c8a84b]' : 'text-[rgba(220,200,150,0.65)]'}`}>
                          {label}
                        </p>
                      </button>
                      {canDelete && (
                        <ConfirmButton
                          onConfirm={() => { supprimerCanal(canal.id); if (canalActifId === canal.id) setCanalActifId(null) }}
                          variant="danger"
                          className="opacity-0 group-hover/item:opacity-100 transition-opacity h-5 w-5 flex-shrink-0 border-[rgba(180,50,50,0.3)] text-[#e87a7a] hover:bg-[rgba(180,50,50,0.1)] flex items-center justify-center p-0 rounded"
                        >
                          <Trash2 size={9} />
                        </ConfirmButton>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="p-2.5 border-t border-[rgba(184,142,60,0.1)]">
                <button
                  onClick={handleNouvelleConv}
                  className="w-full py-1.5 rounded bg-theme-main/5 border border-theme-main/20 text-theme-main/60 hover:text-theme-main hover:border-theme-main/40 transition-all font-cinzel text-[9px] tracking-widest uppercase flex items-center justify-center gap-2"
                >
                  <Plus size={10} /> Nouveau
                </button>
              </div>
            </div>

            {/* ZONE MESSAGES */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-black/10 relative">

              <div
                ref={messagesAreaRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-2 min-h-0 custom-scrollbar"
              >
                {chargementMessages ? (
                  <div className="flex-1 flex items-center justify-center opacity-20">
                    <span className="font-cinzel text-[10px] tracking-widest animate-pulse uppercase">Consultation des archives…</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-4 opacity-10">
                    <MessageSquare size={48} strokeWidth={1} />
                    <p className="font-garamond italic text-lg tracking-widest">Les pages sont vierges...</p>
                  </div>
                ) : (
                  <>
                    {items.map(item => {
                      if (item.kind === 'separator') {
                        return (
                          <div key={item.key} className="flex items-center gap-4 my-6 opacity-30 px-4">
                            <div className="flex-1 h-px bg-white/5" />
                            <span className="font-cinzel text-[9px] tracking-[0.3em] uppercase">{item.label}</span>
                            <div className="flex-1 h-px bg-white/5" />
                          </div>
                        )
                      }

                      const msg = item.data
                      const estMoi = msg.id_compte === compte?.id

                      return (
                        <motion.div
                          key={item.key}
                          initial={{ opacity: 0, x: estMoi ? 10 : -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`flex flex-col ${msg.isFirst ? 'mt-4' : 'mt-0.5'} ${estMoi ? 'items-end' : 'items-start'}`}
                        >
                          {msg.isFirst && (
                            <div className={`flex items-baseline gap-3 mb-1 px-1 ${estMoi ? 'flex-row-reverse' : 'flex-row'}`}>
                              <span className="font-cinzel text-[10px] font-black uppercase tracking-widest text-[#c8a84b]/60">{msg.nom_affiche}</span>
                              <span className="font-mono text-[9px] opacity-20">{formatHeure(msg.created_at)}</span>
                            </div>
                          )}
                          <div className={`group/msg flex flex-col gap-1 ${estMoi ? 'items-end' : 'items-start'}`} style={{ maxWidth: '80%' }}>
                            {msg.contenu && (
                              <div className={`px-4 py-2.5 text-[13px] leading-relaxed transition-all border
                                ${estMoi
                                  ? 'bg-[#c8a84b]/10 border-[#c8a84b]/20 text-[#e8d9b0] rounded-l-xl rounded-tr-md rounded-br-xl shadow-[0_2px_10px_rgba(0,0,0,0.2)]'
                                  : 'bg-white/5 border-white/10 text-[rgba(215,195,160,0.85)] rounded-r-xl rounded-tl-md rounded-bl-xl hover:bg-white/10'}`}
                                style={{ fontFamily: 'var(--font-garamond, Georgia, serif)' }}
                              >
                                {msg.contenu}
                              </div>
                            )}
                            {msg.image_url && (
                              <div className="overflow-hidden rounded-lg border border-white/5 shadow-xl max-w-[280px] hover:border-[#c8a84b]/30 transition-colors">
                                <img src={msg.image_url} alt="" className="w-full object-cover cursor-pointer hover:scale-105 transition-transform duration-500" style={{ maxHeight: '200px' }} onClick={() => window.open(msg.image_url!, '_blank')} />
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {showScrollBtn && (
                <button
                  onClick={() => { setIsAtBottom(true); messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }}
                  className="absolute bottom-24 right-8 w-8 h-8 rounded-full bg-black/80 border border-[#c8a84b]/20 text-[#c8a84b]/40 hover:text-[#c8a84b] hover:border-[#c8a84b]/50 shadow-2xl flex items-center justify-center transition-all z-20"
                >
                  <ChevronDown size={14} />
                </button>
              )}

              {/* ZONE DE SAISIE */}
              <div className="flex-shrink-0 px-6 py-4 border-t border-white/5 bg-black/20 backdrop-blur-md">
                <AnimatePresence>
                  {showImageInput && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="flex items-center gap-3 mb-3 overflow-hidden"
                    >
                      <ImageIcon size={12} className="text-[#c8a84b]/40 shrink-0" />
                      <input
                        placeholder="Lien de l'image magique…"
                        value={imageUrl}
                        onChange={e => setImageUrl(e.target.value)}
                        className="flex-1 bg-black/40 border-b border-[#c8a84b]/20 px-2 py-1 text-[11px] font-garamond italic text-[#c8a84b]/80 outline-none focus:border-[#c8a84b]/50 transition-colors"
                      />
                      <button onClick={() => { setImageUrl(''); setShowImageInput(false) }} className="p-1 hover:bg-white/5 rounded text-white/20 hover:text-white/40"><X size={12} /></button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-end gap-3">
                  <button
                    onClick={() => setShowImageInput(v => !v)}
                    className={`w-9 h-9 flex items-center justify-center rounded-full border transition-all
                      ${showImageInput
                        ? 'bg-[#c8a84b]/20 border-[#c8a84b]/40 text-[#c8a84b]'
                        : 'bg-white/5 border-white/10 text-white/20 hover:text-[#c8a84b] hover:border-[#c8a84b]/30'}`}
                  >
                    <ImageIcon size={16} />
                  </button>

                  <div className="flex-1 relative">
                    <textarea
                      ref={inputRef}
                      value={texte}
                      onChange={e => setTexte(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Inscrire un message dans la chronique…"
                      rows={1}
                      className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-[13px] text-primary outline-none focus:border-[#c8a84b]/30 transition-all resize-none min-h-[42px] max-h-[120px] custom-scrollbar"
                      style={{ fontFamily: 'var(--font-garamond, Georgia, serif)' }}
                    />
                  </div>

                  {!isMJ && (
                    <button
                      onClick={() => setModeIC(v => !v)}
                      className={`w-9 h-9 rounded-full font-cinzel text-[10px] font-black border transition-all flex items-center justify-center
                        ${modeIC
                          ? 'bg-[#c8a84b]/20 border-[#c8a84b]/40 text-[#c8a84b] shadow-[0_0_10px_rgba(200,168,75,0.2)]'
                          : 'bg-white/5 border-white/10 text-white/20 hover:text-[#c8a84b] hover:border-[#c8a84b]/30'}`}
                      title={modeIC ? "Mode Personnage (IC)" : "Mode Hors-Jeu (OOC)"}
                    >
                      IC
                    </button>
                  )}

                  <button
                    onClick={handleEnvoyer}
                    disabled={envoi || (!texte.trim() && !imageUrl.trim())}
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-[#c8a84b]/10 border border-[#c8a84b]/20 text-[#c8a84b]/60 hover:bg-[#c8a84b]/20 hover:text-[#c8a84b] transition-all disabled:opacity-10 disabled:grayscale"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals en overlay */}
      {showNouvelleConv && (
        <NouvelleConvModal
          membres={membres}
          compteId={compte?.id || ''}
          onConfirm={async (ids, nom) => {
            await ouvrirConversation(ids, nom)
            setShowNouvelleConv(false)
          }}
          onClose={() => setShowNouvelleConv(false)}
        />
      )}
      {canalAModifier && (
        <ModifierCanalModal
          canal={canalAModifier}
          compteId={compte?.id || ''}
          membres={membres}
          onConfirm={handleConfirmModification}
          onClose={() => setCanalAModifier(null)}
        />
      )}
    </div>
  )
}