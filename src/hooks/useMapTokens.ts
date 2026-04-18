import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { MapToken } from '../types';
import { useRealtimeQuery } from './useRealtimeQuery';

export function useMapTokens(sessionId: string | undefined, channelActif: string | null) {
  const [tokens, setTokens] = useState<MapToken[]>([]);
  const pendingMovesRef = useRef<Set<string>>(new Set());
  const moveVersionRef = useRef<Map<string, number>>(new Map());

  const channelActifRef = useRef(channelActif);
  useEffect(() => { channelActifRef.current = channelActif; }, [channelActif]);

  // ── Enrichit les tokens avec l'image_url du personnage lié ───────────────
  const enrichirTokensAvecImages = useCallback(async (rawTokens: MapToken[]): Promise<MapToken[]> => {
    const idsAFetcher = [...new Set(
      rawTokens
        .filter(t => t.id_personnage)
        .map(t => t.id_personnage as string)
    )];

    if (idsAFetcher.length === 0) return rawTokens;

    const { data, error } = await supabase
      .from('personnages')
      .select('id, image_url')
      .in('id', idsAFetcher);

    if (error || !data) return rawTokens;

    const imageMap = new Map<string, string | null>(
      data.map(p => [p.id, p.image_url ?? null])
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

  // Chargement tokens — merge intelligent + enrichissement images personnages
  const chargerTokens = useCallback(async (channelId: string) => {
    const { data, error } = await supabase
      .from('map_tokens')
      .select('*')
      .eq('id_channel', channelId);
    
    if (error) {
      console.error('Erreur chargement tokens map:', error);
      return;
    }

    const rawTokens = (data || []) as MapToken[];
    const enriched = await enrichirTokensAvecImages(rawTokens);

    setTokens(prev => {
      return enriched.map(t =>
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
    const { error } = await supabase
      .from('map_tokens')
      .insert(token);
      
    if (error) console.error('Erreur ajout token:', error);
    else if (channelActif) chargerTokens(channelActif);
  };

  const updateTokenLocal = useCallback((id: string, x: number, y: number) => {
    setTokens(prev => prev.map(t => t.id === id ? { ...t, x: Math.round(x), y: Math.round(y) } : t));
  }, []);

  const debounceTimerRef = useRef<Record<string, NodeJS.Timeout>>({});

  const persistTokenPosition = useCallback(async (id: string, x: number, y: number) => {
    const rx = Math.round(x);
    const ry = Math.round(y);

    if (debounceTimerRef.current[id]) {
      clearTimeout(debounceTimerRef.current[id]);
    }

    pendingMovesRef.current.add(id);

    debounceTimerRef.current[id] = setTimeout(async () => {
      const version = (moveVersionRef.current.get(id) ?? 0) + 1;
      moveVersionRef.current.set(id, version);

      const { error } = await supabase
        .from('map_tokens')
        .update({ x: rx, y: ry })
        .eq('id', id);

      if (moveVersionRef.current.get(id) !== version) return;

      setTimeout(() => {
        if (moveVersionRef.current.get(id) === version) {
          pendingMovesRef.current.delete(id);
          delete debounceTimerRef.current[id];
        }
      }, 500);

      if (error) {
        console.error('Erreur deplacement token:', error);
        if (channelActifRef.current) chargerTokens(channelActifRef.current);
      }
    }, 300);
  }, [chargerTokens]);

  const deplacerToken = async (id: string, x: number, y: number) => {
    updateTokenLocal(id, x, y);
    broadcastPosition(id, x, y); 
    persistTokenPosition(id, x, y);
  };

  const supprimerToken = async (id: string) => {
    const { error } = await supabase
      .from('map_tokens')
      .delete()
      .eq('id', id);
      
    if (error) console.error('Erreur suppression token:', error);
    else if (channelActif) chargerTokens(channelActif);
  };

  const toggleVisibilite = async (id: string, visible: boolean) => {
    const { error } = await supabase
      .from('map_tokens')
      .update({ visible })
      .eq('id', id);
      
    if (error) console.error('Erreur visibilite token:', error);
    else if (channelActif) chargerTokens(channelActif);
  };

  const channelRef = useRef<any>(null);

  // ── Broadcast (Mouvement ultra-fluide sans DB) ──────────────────────────────

  const broadcastPosition = useCallback((id: string, x: number, y: number) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'token-pos',
        payload: { id, x, y }
      });
    }
  }, []);

  // ── Realtime tokens — gestion chirurgicale pour la performance et le DELETE
  useEffect(() => {
    if (!channelActif) return;

    const channel = supabase
      .channel(`rt-map-tokens-${channelActif}`)
      .on('broadcast', { event: 'token-pos' }, (payload) => {
        const { id, x, y } = payload.payload;
        if (!pendingMovesRef.current.has(id)) {
          setTokens(prev => prev.map(t => t.id === id ? { ...t, x, y } : t));
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'map_tokens',
        filter: `id_channel=eq.${channelActif}`,
      }, async (payload) => {
        const inserted = payload.new as MapToken;
        const [enriched] = await enrichirTokensAvecImages([inserted]);
        setTokens(prev => {
          if (prev.some(t => t.id === enriched.id)) return prev;
          return [...prev, enriched];
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'map_tokens',
        filter: `id_channel=eq.${channelActif}`,
      }, (payload) => {
        const newToken = payload.new as MapToken;
        setTokens(prev => {
          const current = prev.find(t => t.id === newToken.id);
          if (!current) return prev;

          if (current.id_personnage !== newToken.id_personnage) {
            chargerTokens(channelActif);
            return prev;
          }

          return prev.map(t => {
            if (t.id !== newToken.id) return t;

            const isPending = pendingMovesRef.current.has(newToken.id);
            
            return {
              ...t,
              ...newToken,
              x: isPending ? t.x : newToken.x,
              y: isPending ? t.y : newToken.y,
              image_url: t.image_url 
            };
          });
        });
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'map_tokens',
      }, (payload) => {
        setTokens(prev => prev.filter(t => t.id !== payload.old.id));
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [channelActif, chargerTokens, enrichirTokensAvecImages]);

  // Realtime personnages
  useRealtimeQuery({
    tables: [{ table: 'personnages', filtered: false }],
    sessionId,
    onReload: () => {
      if (channelActifRef.current) chargerTokens(channelActifRef.current);
    },
    enabled: !!channelActif,
  });

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
    broadcastPosition,
    setLocalAction
  };
}
