import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { MessageSquare, Send, ChevronDown, Image as ImageIcon, X, User } from 'lucide-react'
import { useMapChat } from '../../hooks/useMapChat'
import { MapToken } from '../../types'
import { Input } from '../ui/Input'

interface MapChatPanelProps {
  channelId: string | null
  isMJ: boolean
  tokensOnMap: MapToken[]
}

export function MapChatPanel({ channelId, isMJ, tokensOnMap }: MapChatPanelProps) {
  const { messages, chargement, envoi, envoyerMessage } = useMapChat(channelId)
  const [texte, setTexte] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [showImageInput, setShowImageInput] = useState(false)
  const [modeIC, setModeIC] = useState(false)
  const [personnageICChoisi, setPersonnageICChoisi] = useState<MapToken | null>(null)
  const [showMJSelector, setShowMJSelector] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)

  useEffect(() => {
    if (isMJ && !personnageICChoisi && tokensOnMap.length > 0) {
      setPersonnageICChoisi(tokensOnMap[0])
    }
  }, [isMJ, tokensOnMap, personnageICChoisi])

  const scrollToBottom = () => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }

  useEffect(() => { if (isAtBottom) scrollToBottom() }, [messages, isAtBottom])

  const handleEnvoyer = async () => {
    if (!texte.trim() && !imageUrl.trim()) return
    setIsAtBottom(true)
    const nomIC = modeIC && personnageICChoisi ? personnageICChoisi.nom : undefined
    const success = await envoyerMessage(texte, { modeIC, nomICOverride: nomIC, image_url: imageUrl.trim() || undefined })
    if (success) { setTexte(''); setImageUrl(''); setShowImageInput(false); inputRef.current?.focus() }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEnvoyer() }
  }

  return (
    <div className="flex flex-col h-full bg-[#0c0a07]">
      <div ref={scrollRef} onScroll={() => {
        if (!scrollRef.current) return
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
        setIsAtBottom(scrollHeight - scrollTop - clientHeight < 50)
      }} className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
        {chargement ? (
          <div className="flex items-center justify-center h-full opacity-20"><span className="animate-pulse font-cinzel text-[10px] tracking-widest">Incrustation...</span></div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-20 gap-2"><MessageSquare size={20} /><p className="font-cinzel text-[9px] tracking-widest">Silences éternels</p></div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className="flex flex-col gap-1 group">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[10px] font-cinzel text-[#c8a84b] tracking-wider truncate max-w-[120px]">{msg.nom_affiche}</span>
                <span className="text-[8px] text-[rgba(200,168,75,0.25)] font-mono flex-shrink-0">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              {msg.image_url && <div className="relative rounded-lg overflow-hidden border border-[#c8a84b]/20 bg-black/40 mt-1"><img src={msg.image_url} alt="" className="w-full h-auto object-contain max-h-48" /></div>}
              {msg.contenu && <div className="text-[11px] text-[rgba(220,200,150,0.85)] leading-relaxed bg-white/5 p-2 rounded-md border border-white/5 break-words font-sans">{msg.contenu}</div>}
            </div>
          ))
        )}
      </div>

      <div className="p-3 border-t border-[#c8a84b]/15 bg-black/40 space-y-3 relative">
        {/* POPUP SÉLECTEUR MJ */}
        {isMJ && showMJSelector && (
          <div className="absolute bottom-[100%] left-2 right-2 mb-2 bg-[#0c0a07] border border-[#c8a84b]/30 rounded-lg shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="px-3 py-2 border-b border-[#c8a84b]/10 bg-[#c8a84b]/5 flex items-center justify-between">
              <span className="text-[8px] font-cinzel tracking-widest text-[#c8a84b] uppercase">Parler en tant que...</span>
              <button onClick={() => setShowMJSelector(false)}><X size={10} className="text-[#c8a84b]/40" /></button>
            </div>
            <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
              <button 
                onClick={() => { setPersonnageICChoisi(null); setModeIC(true); setShowMJSelector(false); }} 
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 text-left text-[10px] font-cinzel ${modeIC && !personnageICChoisi ? 'text-[#c8a84b] bg-white/5' : 'text-white/40'}`}
              >
                <User size={12} /> MJ (Pseudo)
              </button>
              {tokensOnMap.map(t => (
                <button 
                  key={t.id} 
                  onClick={() => { setPersonnageICChoisi(t); setModeIC(true); setShowMJSelector(false); }} 
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 text-left text-[10px] font-cinzel ${modeIC && personnageICChoisi?.id === t.id ? 'text-[#c8a84b] bg-white/5' : 'text-white/40'}`}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.couleur }} /> {t.nom}
                </button>
              ))}
            </div>
            {/* ACTION POUR REPASSER EN OOC */}
            <div className="border-t border-[#c8a84b]/10 bg-black/20 p-1">
              <button 
                onClick={() => { setModeIC(false); setShowMJSelector(false); }}
                className="w-full flex items-center justify-center gap-2 px-2 py-1.5 rounded hover:bg-red-500/10 text-red-400/60 hover:text-red-400 text-[9px] font-cinzel transition-all"
              >
                Passer en Hors-Jeu (OOC)
              </button>
            </div>
          </div>
        )}

        {/* LIGNE DES BOUTONS RONDS */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowImageInput(!showImageInput)} 
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all border ${showImageInput ? 'bg-[#c8a84b] text-black border-[#c8a84b]' : 'bg-black/40 text-[#c8a84b]/40 border-[#c8a84b]/20 hover:text-[#c8a84b] hover:border-[#c8a84b]/40'}`}
          >
            <ImageIcon size={14} />
          </button>

          <button
            onClick={() => {
              if (isMJ) setShowMJSelector(!showMJSelector)
              else setModeIC(!modeIC)
            }}
            onContextMenu={(e) => { e.preventDefault(); if(isMJ) setModeIC(!modeIC); }}
            className={`flex-1 h-8 rounded-full flex items-center justify-center gap-2 border transition-all font-cinzel text-[9px] tracking-[.2em] px-4
              ${modeIC 
                ? 'bg-[rgba(93,232,158,0.1)] text-[#5de89e] border-[#5de89e]/30 shadow-[0_0_10px_rgba(93,232,158,0.05)]' 
                : 'bg-white/5 text-white/40 border-white/10'}`}
          >
            {modeIC ? (personnageICChoisi ? personnageICChoisi.nom : 'EN JEU (IC)') : 'HORS JEU (OOC)'}
            {isMJ && <ChevronDown size={10} className="opacity-40" />}
          </button>
        </div>

        {showImageInput && (
          <div className="relative">
            <Input placeholder="URL image..." value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="text-[10px] h-8 bg-black/60 pr-8" />
            <button onClick={() => { setImageUrl(''); setShowImageInput(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/20 hover:text-white"><X size={10} /></button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            rows={1}
            placeholder={modeIC ? "Action ou dialogue..." : "Dire quelque chose..."}
            className="flex-1 bg-black/60 border border-[#c8a84b]/15 rounded-xl px-3 py-2 text-[11px] text-[#e8d9b0] font-sans placeholder:text-white/10 outline-none focus:border-[#c8a84b]/40 transition-all resize-none custom-scrollbar"
            value={texte}
            onChange={e => setTexte(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            onClick={handleEnvoyer}
            disabled={envoi || (!texte.trim() && !imageUrl.trim())}
            className="w-9 h-9 rounded-xl bg-[#c8a84b]/10 border border-[#c8a84b]/20 text-[#c8a84b] hover:bg-[#c8a84b]/20 transition-all disabled:opacity-10 flex items-center justify-center flex-shrink-0"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
