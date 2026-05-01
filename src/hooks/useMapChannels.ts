import { useState, useCallback, useEffect, useRef } from 'react';
import { useRealtimeQuery } from './useRealtimeQuery';
import { MapChannel } from '../types';
import { chatService } from '../services/chatService';
import { mapService } from '../services/mapService';
import { peerService } from '../services/peerService';

export function useMapChannels(sessionId: string | undefined) {
  const [channels, setChannels] = useState<MapChannel[]>([]);
  const [channelActif, setChannelActif] = useState<string | null>(null);

  const channelActifRef = useRef(channelActif);
  useEffect(() => { channelActifRef.current = channelActif; }, [channelActif]);

  // Chargement channels
  const chargerChannels = useCallback(async () => {
    if (!sessionId) return;
    
    if (peerService.isHost) {
      const data = await mapService.getChannels(sessionId);
      setChannels(data);
      peerService.broadcastToAll({ type: 'STATE_UPDATE', entity: 'session', payload: { type: 'map_update', channels: data } });
      
      if (!channelActifRef.current && data && data.length > 0) {
        setChannelActif(data[0].id);
      } else if (data && data.length === 0) {
        setChannelActif(null);
      }
    }
  }, [sessionId]);

  useEffect(() => {
    if (!peerService.isHost) {
      const unsub = peerService.onStateUpdate((msg) => {
        if (msg.entity === 'session' && msg.payload.type === 'map_update') {
          if (msg.payload.channels) {
            setChannels(msg.payload.channels);
          }
        }
      });
      // Demander les channels à la connexion
      peerService.sendToMJ({ type: 'ACTION', kind: 'request_map_channels', payload: {} });
      return unsub;
    }
  }, []);

  // Init channels
  useEffect(() => {
    chargerChannels();
  }, [chargerChannels]);

  // ── Helpers canal chat map ───────────────────────────────────────────────────

  const creerCanalChatMap = useCallback(async (channelId: string) => {
    if (!sessionId) return;
    const nomCanal = `map_${channelId}`;
    const canal = await chatService.creerCanalPrive(sessionId, [], nomCanal);
    if (!canal) console.error('Erreur création canal chat map:', channelId);
  }, [sessionId]);

  // Actions channels
  const creerChannel = async (nom: string, image_url?: string, largeur: number = 20, hauteur: number = 15, grille_taille: number = 50) => {
    if (!sessionId) return null;
    const ordre = channels.length;
    
    const newChan = await mapService.createChannel(sessionId, {
      nom, image_url, largeur, hauteur, grille_taille, ordre, active: false
    });
      
    if (newChan) {
      await creerCanalChatMap(newChan.id);
      chargerChannels();
      return newChan.id;
    }
    return null;
  };

  const modifierChannel = async (id: string, updates: Partial<MapChannel>) => {
    const ok = await mapService.updateChannel(id, updates);
    if (ok) {
      chargerChannels();
    }
  };

  const supprimerChannel = async (id: string) => {
    const ok = await mapService.deleteChannel(id);
    if (ok) {
      if (channelActif === id) setChannelActif(null);
      chargerChannels();
    }
  };

  const toggleChannel = async (id: string, active: boolean) => {
    await modifierChannel(id, { active });
  };

  // Realtime channels
  useRealtimeQuery({
    tables: ['map_channels'],
    sessionId,
    onReload: chargerChannels,
    enabled: !!sessionId && peerService.isHost,
  });

  return {
    channels,
    channelActif,
    setChannelActif,
    creerChannel,
    modifierChannel,
    supprimerChannel,
    toggleChannel,
  };
}
