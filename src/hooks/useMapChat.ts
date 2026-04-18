import { useState, useCallback, useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'
import { useRealtimeQuery } from './useRealtimeQuery'
import { chatService, ChatMessage } from '../services/chatService'
import { broadcastService } from '../services/broadcastService'
import { supabase } from '../supabase'

/**
 * Hook dédié au chat contextuel d'une map.
 * Charge/écoute le canal nommé "map_<channelId>".
 */
export function useMapChat(channelId: string | null) {
  const { compte, sessionActive, roleEffectif, personnageJoueur } = useStore()
  const isMJ = roleEffectif === 'admin' || roleEffectif === 'mj'

  const [canalId, setCanalId]     = useState<string | null>(null)
  const [messages, setMessages]   = useState<ChatMessage[]>([])
  const [chargement, setChargement] = useState(false)
  const [envoi, setEnvoi]         = useState(false)

  const canalIdRef = useRef<string | null>(null)
  useEffect(() => { canalIdRef.current = canalId }, [canalId])

  // ── Écoute des messages en Broadcast (Mode Hybride) ────────────────────────
  useEffect(() => {
    if (!sessionActive || !compte) return
    const unsubscribe = broadcastService.subscribe(sessionActive.id, 'chat-message', (msg: ChatMessage) => {
      if (canalIdRef.current === msg.id_canal && msg.id_compte !== compte.id) {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev
          return [...prev, msg]
        })
      }
    })
    return () => unsubscribe()
  }, [sessionActive, compte])

  // ── Résoudre l'id du canal chat à partir du channelId map ─────────────────
  const resoudreCanalId = useCallback(async () => {
    if (!channelId || !sessionActive) { setCanalId(null); return }

    const nomCanal = `map_${channelId}`
    const { data } = await supabase
      .from('chat_canaux')
      .select('id')
      .eq('id_session', sessionActive.id)
      .eq('nom', nomCanal)
      .maybeSingle()

    setCanalId(data?.id ?? null)
  }, [channelId, sessionActive])

  useEffect(() => { resoudreCanalId() }, [resoudreCanalId])

  // ── Charger les messages ───────────────────────────────────────────────────
  const chargerMessages = useCallback(async () => {
    if (!canalId) { setMessages([]); return }
    setChargement(true)
    const data = await chatService.getMessages(canalId, 50)
    setMessages(data)
    setChargement(false)
  }, [canalId])

  useEffect(() => { chargerMessages() }, [chargerMessages])

  // ── Realtime ───────────────────────────────────────────────────────────────
  useRealtimeQuery({
    tables: [{ table: 'messages', filterColumn: 'id_canal', filterValue: canalId ?? undefined }],
    onReload: chargerMessages,
    debounce: 150,
    enabled: !!canalId,
  })

  // ── Nom affiché ────────────────────────────────────────────────────────────
  const nomAffiche = useCallback((modeIC = false): string => {
    if (modeIC && personnageJoueur) return personnageJoueur.nom
    return compte?.pseudo || 'Inconnu'
  }, [compte, personnageJoueur])

  // ── Envoyer un message ─────────────────────────────────────────────────────
  const envoyerMessage = useCallback(async (
    contenu: string,
    options?: {
      image_url?: string
      modeIC?: boolean
      /** Permet au MJ de parler sous le nom d'un token/personnage spécifique */
      nomICOverride?: string
    }
  ) => {
    if (!sessionActive || !compte || !canalIdRef.current) return
    if (!contenu.trim() && !options?.image_url) return

    setEnvoi(true)

    // Résolution du nom affiché :
    // 1. Si MJ avec un perso choisi → nomICOverride
    // 2. Si mode IC classique (joueur) → nom du personnageJoueur
    // 3. Sinon → pseudo du compte
    let nomFinal: string
    if (options?.nomICOverride) {
      nomFinal = options.nomICOverride
    } else if (options?.modeIC && personnageJoueur) {
      nomFinal = personnageJoueur.nom
    } else {
      nomFinal = compte.pseudo
    }

    const tempMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      id_canal: canalIdRef.current,
      id_session: sessionActive.id,
      id_compte: compte.id,
      nom_affiche: nomFinal,
      contenu: contenu.trim() || null,
      image_url: options?.image_url || null,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempMsg])
    
    // Broadcast instantané pour le mode Hybride
    broadcastService.send(sessionActive.id, 'chat-message', tempMsg)

    const result = await chatService.envoyerMessage({
      id_canal: canalIdRef.current,
      id_session: sessionActive.id,
      id_compte: compte.id,
      nom_affiche: nomFinal,
      contenu: contenu.trim() || undefined,
      image_url: options?.image_url || undefined,
    })

    if (result) {
      setMessages(prev => prev.map(m => m.id === tempMsg.id ? result : m))
    } else {
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id))
    }

    setEnvoi(false)
  }, [sessionActive, compte, personnageJoueur])

  return {
    canalId,
    messages,
    chargement,
    envoi,
    isMJ,
    compte,
    envoyerMessage,
    nomAffiche,
  }
}