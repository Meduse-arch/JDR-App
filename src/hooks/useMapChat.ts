import { useState, useCallback, useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'
import { useRealtimeQuery } from './useRealtimeQuery'
import { chatService, ChatMessage } from '../services/chatService'
import { peerService } from '../services/peerService'
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
  // MIGRATION WebRTC
  useEffect(() => {
    if (!compte) return;
    const unsubscribe = peerService.onStateUpdate((msg) => {
      if (msg.entity !== 'chat') return;
      const chatMsg = msg.payload as ChatMessage;
      if (canalIdRef.current === chatMsg.id_canal && chatMsg.id_compte !== compte.id) {
        setMessages(prev => {
          if (prev.some(m => m.id === chatMsg.id)) return prev;
          return [...prev, chatMsg];
        });
      }
    });
    return () => unsubscribe();
  }, [compte]);

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

    if (data?.id) {
      setCanalId(data.id)
    } else {
      // Si le canal n'existe pas, on le crée
      try {
        const membres = await chatService.getMembresSession(sessionActive.id)
        const ids = membres.map(m => m.id)
        const nouveauCanal = await chatService.creerCanalPrive(sessionActive.id, ids, nomCanal)
        
        if (nouveauCanal) {
          setCanalId(nouveauCanal.id)
        } else {
          const { data: retryData } = await supabase
            .from('chat_canaux')
            .select('id')
            .eq('id_session', sessionActive.id)
            .eq('nom', nomCanal)
            .maybeSingle()
          
          if (retryData?.id) {
            setCanalId(retryData.id)
          } else {
            console.warn('Impossible de créer ou trouver le canal chat pour la map:', channelId)
            setCanalId(null)
          }
        }
      } catch (err) {
        console.error('Erreur lors de la résolution/création du canal chat map:', err)
        setCanalId(null)
      }
    }
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
      nomICOverride?: string
    }
  ): Promise<boolean> => {
    if (!sessionActive || !compte) {
      return false
    }
    
    if (!canalIdRef.current) {
      return false
    }

    if (!contenu.trim() && !options?.image_url) return false

    setEnvoi(true)
    let success = false

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
    // MIGRATION WebRTC
    if (peerService.isHost) {
      peerService.broadcastToAll({ type: 'STATE_UPDATE', entity: 'chat', payload: tempMsg });
    } else {
      peerService.sendToMJ({ type: 'ACTION', kind: 'chat_message', payload: tempMsg });
    }

    try {
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
        success = true
      } else {
        console.error('Erreur lors de l\'envoi du message: le service a retourné null')
        setMessages(prev => prev.filter(m => m.id !== tempMsg.id))
      }
    } catch (err) {
      console.error('Erreur lors de l\'envoi du message:', err)
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id))
    }

    setEnvoi(false)
    return success
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
