import { useState, useCallback, useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'
import { chatService, ChatMessage } from '../services/chatService'
import { peerService } from '../services/peerService'

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
      if (msg.entity === 'chat') {
        const chatMsg = msg.payload as ChatMessage;
        if (canalIdRef.current === chatMsg.id_canal && chatMsg.id_compte !== compte.id) {
          setMessages(prev => {
            if (prev.some(m => m.id === chatMsg.id)) return prev;
            return [...prev, chatMsg];
          });
        }
      }

      if ((msg.entity as string) === 'map_chat_canal_update' && msg.payload.channelId === channelId) {
         setCanalId(msg.payload.canalId);
      }

      if ((msg.entity as string) === 'chat_messages_update' && msg.payload.canalId === canalIdRef.current) {
         setMessages(msg.payload.messages);
         setChargement(false);
      }
    });
    return () => unsubscribe();
  }, [compte, channelId]);

  // ── Résoudre l'id du canal chat à partir du channelId map ─────────────────
  const resoudreCanalId = useCallback(async () => {
    if (!channelId || !sessionActive) { setCanalId(null); return }

    if (peerService.isHost) {
      const nomCanal = `map_${channelId}`;
      const db = (window as any).db;
      if (!db) return;
      const resCanaux = await db.chat_canaux.getAll();
      let exist = resCanaux.data?.find((c: any) => c.id_session === sessionActive.id && c.nom === nomCanal);
      
      if (!exist) {
        try {
          const membres = await chatService.getMembresSession(sessionActive.id);
          const ids = membres.map(m => m.id);
          exist = await chatService.creerCanalPrive(sessionActive.id, ids, nomCanal);
        } catch (err) {
          console.error('Erreur lors de la résolution/création du canal chat map:', err);
        }
      }
      
      if (exist) {
        setCanalId(exist.id);
      } else {
        setCanalId(null);
      }
    } else {
      peerService.sendToMJ({
         type: 'ACTION',
         kind: 'request_map_chat_canal',
         payload: { channelId }
      });
    }
  }, [channelId, sessionActive])

  useEffect(() => { resoudreCanalId() }, [resoudreCanalId])

  // ── Charger les messages ───────────────────────────────────────────────────
  const chargerMessages = useCallback(async () => {
    if (!canalId) { setMessages([]); return }
    setChargement(true)
    if (peerService.isHost) {
      const data = await chatService.getMessages(canalId, 50)
      setMessages(data)
      setChargement(false)
    } else {
      peerService.sendToMJ({
         type: 'ACTION',
         kind: 'request_chat_messages',
         payload: { canalId }
      })
    }
  }, [canalId])

  useEffect(() => { chargerMessages() }, [chargerMessages])

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
