import { useEffect, useRef } from 'react'
import { MessageSquare, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { MapToken } from '../../types'
import { useStore } from '../../store/useStore'
import { MapChatPanel } from './MapChatPanel'

interface MapChatPopupProps {
  channelId: string
  channelNom: string
  tokensOnMap: MapToken[]
  onClose: () => void
}

export function MapChatPopup({ channelId, channelNom, tokensOnMap, onClose }: MapChatPopupProps) {
  const { roleEffectif } = useStore()
  const isMJ = roleEffectif === 'admin' || roleEffectif === 'mj'
  const popupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  return (
    <motion.div
      ref={popupRef}
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="absolute bottom-[80px] right-6 w-80 h-96 bg-black/80 backdrop-blur-md border border-[#c8a84b]/30 rounded-xl shadow-2xl flex flex-col overflow-hidden z-40"
      style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.8), 0 0 20px rgba(200,168,75,0.1)' }}
    >
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#c8a84b]/20 bg-gradient-to-r from-black/60 to-black/20">
        <div className="flex items-center gap-2">
          <MessageSquare size={12} className="text-[#c8a84b]/60" />
          <h3 className="font-cinzel text-[11px] font-black tracking-widest text-[#c8a84b] uppercase">
            Chat: {channelNom}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-sm text-white/40 hover:bg-white/10 hover:text-white transition-all"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        <MapChatPanel channelId={channelId} isMJ={isMJ} tokensOnMap={tokensOnMap} />
      </div>
    </motion.div>
  )
}
