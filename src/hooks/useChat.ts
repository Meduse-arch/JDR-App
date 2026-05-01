import { useState, useCallback, useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'
import { useRealtimeQuery } from './useRealtimeQuery'
import { chatService, ChatCanal, ChatMessage } from '../services/chatService'
import { peerService } from '../services/peerService'

export function useChat() {
  const { compte, sessionActive, roleEffectif, personnageJoueur, pnjControle } = useStore()
  const isMJ = (roleEffectif === 'admin' || roleEffectif === 'mj') && !pnjControle

  const [canaux, setCanaux]               = useState<ChatCanal[]>([])
  const [canalActifId, setCanalActifId]   = useState<string | null>(null)
  const [messages, setMessages]           = useState<ChatMessage[]>([])
  const [chargementCanaux, setChargementCanaux] = useState(false)
  const [chargementMessages, setChargementMessages] = useState(false)
  const [envoi, setEnvoi]                 = useState(false)

  const generalInitDone = useRef<string | null>(null)
  const canalActifRef   = useRef<string | null>(null)
  useEffect(() => { canalActifRef.current = canalActifId }, [canalActifId])

  // ── Écoute des messages en Broadcast (Mode Hybride) ────────────────────────
  // MIGRATION WebRTC
  useEffect(() => {
    if (!compte) return;
    const unsubscribe = peerService.onStateUpdate((msg) => {
      // Pour un seul message
      if (msg.entity === 'chat') {
        const chatMsg = msg.payload as ChatMessage;
        if (canalActifRef.current === chatMsg.id_canal && chatMsg.id_compte !== compte.id) {
          setMessages(prev => {
            if (prev.some(m => m.id === chatMsg.id)) return prev;
            return [...prev, chatMsg];
          });
        }
      }

      // Pour la liste des canaux
      if (msg.entity === 'chat_canaux_update') {
        const canauxData = msg.payload.canaux;
        setCanaux(canauxData);
        if (!canalActifRef.current && canauxData.length > 0) {
          const general = canauxData.find((c: any) => c.type === 'general');
          setCanalActifId(general?.id || canauxData[0].id);
        }
        setChargementCanaux(false);
      }

      // Pour la liste complète des messages d'un canal
      if (msg.entity === 'chat_messages_update') {
        if (msg.payload.canalId === canalActifRef.current) {
          setMessages(msg.payload.messages);
          setChargementMessages(false);
        }
      }

      // Pour les membres
      if (msg.entity === 'chat_membres_update') {
        setMembres(msg.payload.membres);
      }
    });
    return () => unsubscribe();
  }, [compte]);

  // ── Nom affiché selon le mode ──────────────────────────────────────────────
  const nomAffiche = useCallback((modeIC = false): string => {
    if (modeIC) {
      if (pnjControle) return pnjControle.nom
      if (personnageJoueur) return personnageJoueur.nom
    }
    return compte?.pseudo || 'Inconnu'
  }, [compte, personnageJoueur, pnjControle])

  // ── Charger les canaux ────────────────────────────────────────────────────
  const chargerCanaux = useCallback(async () => {
    if (!sessionActive || !compte) return
    setChargementCanaux(true)

    // Si on possède un personnage joueur, on veut voir SES canaux privés
    const targetCompteId = (pnjControle?.type === 'Joueur' && pnjControle.lie_au_compte) 
      ? pnjControle.lie_au_compte 
      : compte.id

    if (peerService.isHost) {
      const data = await chatService.getCanaux(sessionActive.id, targetCompteId, isMJ)

      // ── Filtre : on exclut les canaux réservés aux maps (préfixe "map_") ──
      const canauxVisibles = data.filter(c => !c.nom?.startsWith('map_'))

      setCanaux(canauxVisibles)

      if (!canalActifRef.current && canauxVisibles.length > 0) {
        const general = canauxVisibles.find(c => c.type === 'general')
        setCanalActifId(general?.id || canauxVisibles[0].id)
      }

      setChargementCanaux(false)
    } else {
      peerService.sendToMJ({
        type: 'ACTION',
        kind: 'request_chat_canaux',
        payload: { targetCompteId }
      })
    }
  }, [sessionActive, compte, isMJ, pnjControle])

  // ── Init unique ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionActive || !compte) return
    if (generalInitDone.current === sessionActive.id) {
      chargerCanaux()
      return
    }

    generalInitDone.current = sessionActive.id
    if (peerService.isHost) {
      chatService.creerCanalGeneral(sessionActive.id).then(() => {
        chargerCanaux()
      })
    } else {
      chargerCanaux()
    }
  }, [sessionActive?.id, compte?.id, chargerCanaux])

  // ── Charger les messages du canal actif ───────────────────────────────────
  const chargerMessages = useCallback(async (canalId: string) => {
    setChargementMessages(true)
    if (peerService.isHost) {
      const data = await chatService.getMessages(canalId, 50)
      setMessages(data)
      setChargementMessages(false)
    } else {
      peerService.sendToMJ({
        type: 'ACTION',
        kind: 'request_chat_messages',
        payload: { canalId }
      })
    }
  }, [])

  useEffect(() => {
    if (canalActifId) chargerMessages(canalActifId)
    else setMessages([])
  }, [canalActifId, chargerMessages])

  // ── Realtime : canaux (id_session) ────────────────────────────────────────
  useRealtimeQuery({
    tables: [
      { table: 'chat_canaux' },
      { table: 'chat_participants', filtered: false },
    ],
    sessionId: sessionActive?.id,
    onReload: chargerCanaux,
    enabled: !!sessionActive,
  })

  // ── Envoyer un message ─────────────────────────────────────────────────────
  const envoyerMessage = useCallback(async (
    contenu: string,
    options?: { image_url?: string; modeIC?: boolean }
  ) => {
    if (!sessionActive || !compte || !canalActifRef.current) return
    if (!contenu.trim() && !options?.image_url) return

    setEnvoi(true)

    // Optimistic update
    const tempMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      id_canal: canalActifRef.current,
      id_session: sessionActive.id,
      id_compte: compte.id,
      nom_affiche: nomAffiche(options?.modeIC),
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

    const result = await chatService.envoyerMessage({
      id_canal: canalActifRef.current,
      id_session: sessionActive.id,
      id_compte: compte.id,
      nom_affiche: nomAffiche(options?.modeIC),
      contenu: contenu.trim() || undefined,
      image_url: options?.image_url || undefined,
    })

    if (result) {
      setMessages(prev => prev.map(m => m.id === tempMsg.id ? result : m))
    } else {
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id))
    }

    setEnvoi(false)
  }, [sessionActive, compte, nomAffiche])

  // ── Créer un canal privé ou groupe ────────────────────────────────────────
  const ouvrirConversation = useCallback(async (
    compteIds: string[],
    nom?: string
  ) => {
    if (!sessionActive || !compte) return
    const ids = Array.from(new Set([compte.id, ...compteIds]))
    
    if (peerService.isHost) {
      const canal = await chatService.creerCanalPrive(sessionActive.id, ids, nom)
      if (canal) {
        await chargerCanaux()
        setCanalActifId(canal.id)
      }
    } else {
      peerService.sendToMJ({
        type: 'ACTION',
        kind: 'create_chat_canal',
        payload: { compteIds: ids, nom }
      })
      // Optimistiquement on recharge, mais ça sera forcé par le MJ via STATE_UPDATE
    }
  }, [sessionActive, compte, chargerCanaux])

  // ── Renommer un canal (MJ/admin seulement) ────────────────────────────────
  const renommerCanal = useCallback(async (canalId: string, nouveauNom: string) => {
    if (!isMJ) return
    const ok = await chatService.renommerCanal(canalId, nouveauNom)
    if (ok) await chargerCanaux()
  }, [isMJ, chargerCanaux])

  // ── Supprimer un canal (MJ/admin seulement) ───────────────────────────────
  const supprimerCanal = useCallback(async (canalId: string) => {
    if (!isMJ) return
    const ok = await chatService.supprimerCanal(canalId)
    if (ok) {
      if (canalActifId === canalId) setCanalActifId(null)
      await chargerCanaux()
    }
  }, [isMJ, canalActifId, chargerCanaux])

  // ── Membres disponibles ───────────────────────────────────────────────────
  const [membres, setMembres] = useState<{ id: string; pseudo: string; role: string }[]>([])

  const chargerMembres = useCallback(async () => {
    if (!sessionActive) return
    if (peerService.isHost) {
      const data = await chatService.getMembresSession(sessionActive.id)
      setMembres(data)
    } else {
      peerService.sendToMJ({
        type: 'ACTION',
        kind: 'request_chat_membres',
        payload: {}
      })
    }
  }, [sessionActive])

  const canalActif = canaux.find(c => c.id === canalActifId) || null

  return {
    canaux,
    canalActif,
    canalActifId,
    setCanalActifId,
    messages,
    membres,
    chargementCanaux,
    chargementMessages,
    envoi,
    isMJ,
    compte,
    envoyerMessage,
    ouvrirConversation,
    renommerCanal,
    supprimerCanal,
    chargerMembres,
    nomAffiche,
  }
}
