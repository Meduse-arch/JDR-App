import { useState, useCallback, useEffect, useRef } from 'react';
import { MapToken } from '../types';
import { useRealtimeQuery } from './useRealtimeQuery';
import { mapService } from '../services/mapService';
import { peerService } from '../services/peerService';

export function useMapTokens(sessionId: string | undefined, channelActif: string | null) {
  const [tokens, setTokens] = useState<MapToken[]>([]);
  const pendingMovesRef = useRef<Set<string>>(new Set());
  const moveVersionRef = useRef<Map<string, number>>(new Map());

  const channelActifRef = useRef(channelActif);
  useEffect(() => { channelActifRef.current = channelActif; }, [channelActif]);

  // ── Enrichit les tokens avec l'image_url du personnage lié ───────────────
  const enrichirTokensAvecImages = useCallback(async (rawTokens: MapToken[]): Promise<MapToken[]> => {
    if (!peerService.isHost) return rawTokens; // Les joueurs reçoivent les tokens déjà enrichis (à implémenter)
    
    const idsAFetcher = [...new Set(
      rawTokens
        .filter(t => t.id_personnage)
        .map(t => t.id_personnage as string)
    )];

    if (idsAFetcher.length === 0) return rawTokens;

    const db = (window as any).db;
    const { data: personnages } = await db.personnages.getAll();
    if (!personnages) return rawTokens;

    const imageMap = new Map<string, string | null>(
      personnages.map((p: any) => [p.id, p.image_url ?? null])
    );

    return rawTokens.map(t => {
      if (!t.id_personnage) return t;
      const persoImage = imageMap.get(t.id_personnage) ?? null;
      return {
        ...t,
        image_url: t.image_url || persoImage || t.image_url,
      };
    });
  }, []);

  // Chargement tokens
  const chargerTokens = useCallback(async (channelId: string) => {
    let data: MapToken[] = [];
    if (peerService.isHost) {
      data = await mapService.getTokens(channelId);
      data = await enrichirTokensAvecImages(data);
    } else {
      // Les joueurs attendent le broadcast ou le state update
    }

    setTokens(prev => {
      return data.map(t =>
        pendingMovesRef.current.has(t.id)
          ? { ...t, x: prev.find(p => p.id === t.id)?.x ?? t.x, y: prev.find(p => p.id === t.id)?.y ?? t.y }
          : t
      );
    });
  }, [enrichirTokensAvecImages]);

  useEffect(() => {
    if (channelActif) {
      chargerTokens(channelActif);
    } else {
      setTokens([]);
    }
  }, [channelActif, chargerTokens]);

  // Actions tokens
  const ajouterToken = async (token: Omit<MapToken, 'id' | 'created_at'>) => {
    const newToken = await mapService.addToken(token);
    if (newToken && channelActif) {
      chargerTokens(channelActif);
      peerService.broadcastToAll({ type: 'STATE_UPDATE', entity: 'session', payload: { type: 'map_update' } });
    }
  };

  const updateTokenLocal = useCallback((id: string, x: number, y: number) => {
    setTokens(prev => prev.map(t => t.id === id ? { ...t, x: Math.round(x), y: Math.round(y) } : t));
  }, []);

  const debounceTimerRef = useRef<Record<string, NodeJS.Timeout>>({});

  const persistTokenPosition = useCallback(async (id: string, x: number, y: number) => {
    const rx = Math.round(x);
    const ry = Math.round(y);

    if (debounceTimerRef.current[id]) clearTimeout(debounceTimerRef.current[id]);

    pendingMovesRef.current.add(id);

    debounceTimerRef.current[id] = setTimeout(async () => {
      const version = (moveVersionRef.current.get(id) ?? 0) + 1;
      moveVersionRef.current.set(id, version);

      const ok = await mapService.updateToken(id, { x: rx, y: ry });

      if (moveVersionRef.current.get(id) !== version) return;

      setTimeout(() => {
        if (moveVersionRef.current.get(id) === version) {
          pendingMovesRef.current.delete(id);
          delete debounceTimerRef.current[id];
        }
      }, 500);

      if (ok) {
        // Optionnel: broadcast state update pour la persistance long terme
      }
    }, 300);
  }, []);

  const deplacerToken = async (id: string, x: number, y: number) => {
    updateTokenLocal(id, x, y);
    // Broadcast via WebRTC pour fluidité
    peerService.broadcastToAll({
      type: 'STATE_UPDATE',
      entity: 'map_token',
      payload: { id, x: Math.round(x), y: Math.round(y) }
    });
    if (peerService.isHost) {
      persistTokenPosition(id, x, y);
    } else {
      // Le joueur envoie une ACTION au MJ pour persister
      peerService.sendToMJ({
        type: 'ACTION',
        kind: 'move_token',
        payload: { id, x: Math.round(x), y: Math.round(y) }
      });
    }
  };

  const supprimerToken = async (id: string) => {
    const ok = await mapService.deleteToken(id);
    if (ok && channelActif) {
      chargerTokens(channelActif);
      peerService.broadcastToAll({ type: 'STATE_UPDATE', entity: 'session', payload: { type: 'map_update' } });
    }
  };

  const toggleVisibilite = async (id: string, visible: boolean) => {
    const ok = await mapService.updateToken(id, { visible: visible ? 1 : 0 });
    if (ok && channelActif) {
      chargerTokens(channelActif);
      peerService.broadcastToAll({ type: 'STATE_UPDATE', entity: 'session', payload: { type: 'map_update' } });
    }
  };

  // ── Realtime tokens via WebRTC
  useEffect(() => {
    const unsub = peerService.onStateUpdate((msg) => {
      if (msg.entity === 'map_token') {
        const { id, x, y } = msg.payload;
        if (!pendingMovesRef.current.has(id)) {
          setTokens(prev => prev.map(t => t.id === id ? { ...t, x, y } : t));
        }
      }
      if (msg.entity === 'session' && msg.payload.type === 'map_update') {
        if (channelActifRef.current) chargerTokens(channelActifRef.current);
      }
    });

    return () => unsub();
  }, [chargerTokens]);

  const setLocalAction = useCallback((id: string | null, active: boolean) => {
    if (id) {
      if (active) pendingMovesRef.current.add(id);
      else pendingMovesRef.current.delete(id);
    } else if (!active) {
      pendingMovesRef.current.clear();
    }
  }, []);

  return {
    tokens,
    ajouterToken,
    deplacerToken,
    supprimerToken,
    toggleVisibilite,
    setLocalAction
  };
}
