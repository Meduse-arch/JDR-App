import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { useRealtimeQuery } from './useRealtimeQuery';
import { MapChannel } from '../types';
import { chatService } from '../services/chatService';

export function useMapChannels(sessionId: string | undefined) {
  const [channels, setChannels] = useState<MapChannel[]>([]);
  const [channelActif, setChannelActif] = useState<string | null>(null);

  const channelActifRef = useRef(channelActif);
  useEffect(() => { channelActifRef.current = channelActif; }, [channelActif]);

  // Chargement channels
  const chargerChannels = useCallback(async () => {
    if (!sessionId) return;
    const { data, error } = await supabase
      .from('map_channels')
      .select('*')
      .eq('id_session', sessionId)
      .order('ordre');
    
    if (error) {
      console.error('Erreur chargement channels map:', error);
      return;
    }
    setChannels(data || []);
    
    if (!channelActifRef.current && data && data.length > 0) {
      setChannelActif(data[0].id);
    } else if (data && data.length === 0) {
      setChannelActif(null);
    }
  }, [sessionId]);

  // Init channels
  useEffect(() => {
    chargerChannels();
  }, [chargerChannels]);

  // ── Helpers canal chat map ───────────────────────────────────────────────────

  const creerCanalChatMap = useCallback(async (channelId: string) => {
    if (!sessionId) return;
    const nomCanal = `map_${channelId}`;

    const { data: existing } = await supabase
      .from('chat_canaux')
      .select('id')
      .eq('id_session', sessionId)
      .eq('nom', nomCanal)
      .maybeSingle();

    if (existing) return;

    const membres = await chatService.getMembresSession(sessionId);
    const ids = membres.map(m => m.id);

    const canal = await chatService.creerCanalPrive(sessionId, ids, nomCanal);
    if (!canal) console.error('Erreur création canal chat map:', channelId);
  }, [sessionId]);

  const supprimerCanalChatMap = useCallback(async (channelId: string) => {
    if (!sessionId) return;
    const nomCanal = `map_${channelId}`;

    const { data } = await supabase
      .from('chat_canaux')
      .select('id')
      .eq('id_session', sessionId)
      .eq('nom', nomCanal)
      .maybeSingle();

    if (data?.id) {
      await chatService.supprimerCanal(data.id);
    }
  }, [sessionId]);

  // Actions channels
  const creerChannel = async (nom: string, image_url?: string, largeur: number = 20, hauteur: number = 15, grille_taille: number = 50) => {
    if (!sessionId) return null;
    
    const ordre = channels.length;
    
    const { data, error } = await supabase
      .from('map_channels')
      .insert({
        id_session: sessionId,
        nom,
        image_url,
        largeur,
        hauteur,
        grille_taille,
        ordre,
        active: false
      })
      .select()
      .single();
      
    if (error) {
      console.error('Erreur creation channel:', error);
      return null;
    } else {
      await creerCanalChatMap(data.id);
      chargerChannels();
      return data.id;
    }
  };

  const modifierChannel = async (id: string, updates: Partial<MapChannel>) => {
    const { error } = await supabase
      .from('map_channels')
      .update(updates)
      .eq('id', id);
      
    if (error) console.error('Erreur modification channel:', error);
    else chargerChannels();
  };

  const supprimerChannel = async (id: string) => {
    await supprimerCanalChatMap(id);

    const { error } = await supabase
      .from('map_channels')
      .delete()
      .eq('id', id);
      
    if (error) console.error('Erreur suppression channel:', error);
    else {
      if (channelActif === id) {
        setChannelActif(null);
      }
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
    enabled: !!sessionId,
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
