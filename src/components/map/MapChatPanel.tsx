import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { MessageSquare, Send, ChevronDown, Image as ImageIcon, X } from 'lucide-react'
import { useMapChat } from '../../hooks/useMapChat'
import { MapToken } from '../../types'

function formatHeure(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return "Aujourd'hui"
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Hier'
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

interface MapChatPanelProps {
  channelId: string | null
  isMJ: boolean
  tokensOnMap: MapToken[]
}

export function MapChatPanel({ channelId, isMJ, tokensOnMap }: MapChatPanelProps) {
  const { messages, chargement, envoi, compte, envoyerMessage } = useMapChat(channelId)

  const [texte, setTexte] = useState('')
  const [modeIC, setModeIC] = useState(false)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [showScrollBtn, setShowScrollBtn] = useState(false)

  const [showImageInput, setShowImageInput] = useState(false)
  const [imageUrl, setImageUrl] = useState('')

  const [showPersonnageMenu, setShowPersonnageMenu] = useState(false)
  const [personnageICChoisi, setPersonnageICChoisi] = useState<MapToken | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isAtBottom) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isAtBottom])

  useEffect(() => {
    if (!modeIC) {
      setPersonnageICChoisi(null)
      setShowPersonnageMenu(false)
    }
  }, [modeIC])

  const handleScroll = () => {
    const el = messagesAreaRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    setIsAtBottom(atBottom)
    setShowScrollBtn(!atBottom)
  }

  const handleEnvoyer = async () => {
    if (!texte.trim() && !imageUrl.trim()) return
    setIsAtBottom(true)

    const nomIC = modeIC && personnageICChoisi ? personnageICChoisi.nom : undefined

    await envoyerMessage(texte, {
      modeIC,
      nomICOverride: nomIC,
      image_url: imageUrl.trim() || undefined,
    })
    setTexte('')
    setImageUrl('')
    setShowImageInput(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEnvoyer() }
  }

  const tokensAvecPerso = tokensOnMap.filter(t => !!t.id_personnage)

  type Item =
    | { kind: 'separator'; label: string; key: string }
    | { kind: 'msg'; data: typeof messages[0] & { isFirst: boolean }; key: string }

  const items: Item[] = []
  let lastDate = ''
  messages.forEach((msg, i) => {
    const dateLabel = formatDate(msg.created_at)
    if (dateLabel !== lastDate) {
      items.push({ kind: 'separator', label: dateLabel, key: `sep-${msg.id}` })
      lastDate = dateLabel
    }
    const prev = messages[i - 1]
    const isFirst =
      i === 0 ||
      prev.id_compte !== msg.id_compte ||
      prev.nom_affiche !== msg.nom_affiche ||
      new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() > 5 * 60 * 1000
    items.push({ kind: 'msg', data: { ...msg, isFirst }, key: msg.id })
  })

  return (
    <div className="flex flex-col h-full bg-black/10">
      <div className="flex-1 relative overflow-hidden">
        <div
          ref={messagesAreaRef}
          onScroll={handleScroll}
          className="absolute inset-0 overflow-y-auto px-3 py-3 flex flex-col gap-0.5 custom-scrollbar"
        >
          {chargement ? (
            <div className="flex items-center justify-center h-full opacity-20">
              <span className="font-cinzel text-[9px] tracking-widest animate-pulse uppercase">Chargement…</span>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 opacity-15">
              <MessageSquare size={24} strokeWidth={1} className="text-[#c8a84b]" />
              <p className="font-cinzel text-[9px] tracking-widest text-[#c8a84b] italic">Aucun message…</p>
            </div>
          ) : (
            <>
              {items.map(item => {
                if (item.kind === 'separator') {
                  return (
                    <div key={item.key} className="flex items-center gap-2 my-2 opacity-20">
                      <div className="flex-1 h-px bg-white/10" />
                      <span className="font-cinzel text-[7px] tracking-[0.2em] uppercase text-[#c8a84b]">{item.label}</span>
                      <div className="flex-1 h-px bg-white/10" />
                    </div>
                  )
                }
                const msg = item.data
                const estMoi = msg.id_compte === compte?.id
                return (
                  <div
                    key={item.key}
                    className={`flex flex-col ${msg.isFirst ? 'mt-2.5' : 'mt-0.5'} ${estMoi ? 'items-end' : 'items-start'}`}
                  >
                    {msg.isFirst && (
                      <div className={`flex items-baseline gap-1.5 mb-0.5 px-1 ${estMoi ? 'flex-row-reverse' : 'flex-row'}`}>
                        <span className="font-cinzel text-[8px] font-black uppercase tracking-wider text-[#c8a84b]/55">
                          {msg.nom_affiche}
                        </span>
                        <span className="font-mono text-[7px] opacity-20">{formatHeure(msg.created_at)}</span>
                      </div>
                    )}
                    {msg.contenu && (
                      <div
                        className={`px-2.5 py-1.5 text-[11px] leading-relaxed border max-w-[85%]
                          ${estMoi
                            ? 'bg-[#c8a84b]/10 border-[#c8a84b]/20 text-[#e8d9b0] rounded-l-lg rounded-tr-sm rounded-br-lg'
                            : 'bg-white/5 border-white/8 text-[rgba(215,195,160,0.82)] rounded-r-lg rounded-tl-sm rounded-bl-lg'
                          }`}
                        style={{ fontFamily: 'var(--font-garamond, Georgia, serif)' }}
                      >
                        {msg.contenu}
                      </div>
                    )}
                    {msg.image_url && (
                      <div className="mt-1 max-w-[85%] overflow-hidden rounded-lg border border-white/10">
                        <img
                          src={msg.image_url}
                          alt="image"
                          className="w-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
                          style={{ maxHeight: '140px' }}
                          onClick={() => window.open(msg.image_url!, '_blank')}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {showScrollBtn && (
          <button
            onClick={() => { setIsAtBottom(true); messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }}
            className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-black/80 border border-[#c8a84b]/20 text-[#c8a84b]/40 hover:text-[#c8a84b] flex items-center justify-center transition-all z-10"
          >
            <ChevronDown size={10} />
          </button>
        )}
      </div>

      {isMJ && showPersonnageMenu && (
        <div className="flex-shrink-0 mx-2.5 mb-1 rounded-lg border border-[#c8a84b]/20 bg-black/80 overflow-hidden">
          <p className="text-[8px] font-cinzel tracking-widest text-[#c8a84b]/40 uppercase px-2.5 pt-2 pb-1">
            Parler en tant que…
          </p>
          <div className="max-h-28 overflow-y-auto custom-scrollbar pb-1">
            {tokensAvecPerso.length === 0 ? (
              <p className="text-[9px] text-white/20 italic px-2.5 py-2 font-cinzel">Aucun token lié à un personnage</p>
            ) : (
              tokensAvecPerso.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setPersonnageICChoisi(t); setShowPersonnageMenu(false) }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-[rgba(200,168,75,0.07)] transition-colors
                    ${personnageICChoisi?.id === t.id ? 'bg-[rgba(200,168,75,0.1)]' : ''}`}
                >
                  {t.image_url ? (
                    <img src={t.image_url} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0 border border-[#c8a84b]/20" />
                  ) : (
                    <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[8px] font-bold text-white/60"
                      style={{ backgroundColor: t.couleur }}>
                      {t.nom.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className="font-cinzel text-[10px] text-[rgba(200,168,75,0.7)] truncate">{t.nom}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {showImageInput && (
        <div className="flex-shrink-0 px-2.5 pt-1.5 pb-0 flex items-center gap-1.5">
          <ImageIcon size={10} className="text-[#c8a84b]/40 shrink-0" />
          <input
            placeholder="URL de l'image…"
            value={imageUrl}
            onChange={e => setImageUrl(e.target.value)}
            className="flex-1 bg-black/40 border-b border-[#c8a84b]/20 px-1.5 py-0.5 text-[10px] italic text-[#c8a84b]/80 outline-none focus:border-[#c8a84b]/50 transition-colors"
            style={{ fontFamily: 'var(--font-garamond, Georgia, serif)' }}
          />
          <button
            onClick={() => { setImageUrl(''); setShowImageInput(false) }}
            className="p-0.5 hover:bg-white/5 rounded text-white/20 hover:text-white/40"
          >
            <X size={9} />
          </button>
        </div>
      )}

      <div className="flex-shrink-0 px-2.5 py-2 flex items-end gap-1.5 border-t border-[rgba(200,168,75,0.08)]">
        <div className="relative flex-shrink-0">
          <button
            onClick={() => {
              if (!modeIC) {
                setModeIC(true)
                if (isMJ) setShowPersonnageMenu(true)
              } else {
                setModeIC(false)
              }
            }}
            className={`w-6 h-6 rounded-full font-cinzel text-[8px] font-black border transition-all flex items-center justify-center
              ${modeIC
                ? 'bg-[#c8a84b]/20 border-[#c8a84b]/40 text-[#c8a84b]'
                : 'bg-white/5 border-white/10 text-white/20 hover:text-[#c8a84b] hover:border-[#c8a84b]/30'
              }`}
            title={modeIC ? `IC : ${personnageICChoisi?.nom || 'Mon perso'}` : 'Mode Hors-Jeu (OOC)'}
          >
            IC
          </button>
          {modeIC && personnageICChoisi && (
            <button
              onClick={() => setShowPersonnageMenu(v => !v)}
              className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border border-[#c8a84b]/40 overflow-hidden bg-[#1a150a]"
              title="Changer de personnage"
            >
              {personnageICChoisi.image_url ? (
                <img src={personnageICChoisi.image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[5px] font-bold text-white"
                  style={{ backgroundColor: personnageICChoisi.couleur }}>
                  {personnageICChoisi.nom.substring(0, 1)}
                </div>
              )}
            </button>
          )}
          {isMJ && modeIC && !personnageICChoisi && (
            <button
              onClick={() => setShowPersonnageMenu(v => !v)}
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#c8a84b]/60 border border-[#c8a84b]"
              title="Choisir personnage"
            />
          )}
        </div>

        <button
          onClick={() => setShowImageInput(v => !v)}
          className={`w-6 h-6 flex items-center justify-center rounded-full border transition-all flex-shrink-0
            ${showImageInput || imageUrl
              ? 'bg-[#c8a84b]/20 border-[#c8a84b]/40 text-[#c8a84b]'
              : 'bg-white/5 border-white/10 text-white/20 hover:text-[#c8a84b] hover:border-[#c8a84b]/30'
            }`}
          title="Joindre une image via URL"
        >
          <ImageIcon size={10} />
        </button>

        <textarea
          ref={inputRef}
          value={texte}
          onChange={e => setTexte(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message…"
          rows={1}
          className="flex-1 bg-black/40 border border-white/5 rounded-lg px-2.5 py-1.5 text-[11px] text-primary outline-none focus:border-[#c8a84b]/25 transition-all resize-none min-h-[30px] max-h-[72px] custom-scrollbar"
          style={{ fontFamily: 'var(--font-garamond, Georgia, serif)' }}
        />
        <button
          onClick={handleEnvoyer}
          disabled={envoi || (!texte.trim() && !imageUrl.trim())}
          className="w-6 h-6 flex items-center justify-center rounded-full bg-[#c8a84b]/10 border border-[#c8a84b]/20 text-[#c8a84b]/60 hover:bg-[#c8a84b]/20 hover:text-[#c8a84b] transition-all disabled:opacity-10 flex-shrink-0"
        >
          <Send size={11} />
        </button>
      </div>
    </div>
  )
}