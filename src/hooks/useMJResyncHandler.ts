import { useEffect } from 'react';
import { peerService } from '../services/peerService';
import { personnageService } from '../services/personnageService';
import { inventaireService } from '../services/inventaireService';
import { competenceService } from '../services/competenceService';
import { queteService } from '../services/queteService';
import { useStore } from '../store/useStore';

/**
 * Hook réservé au MJ (Host).
 * Intercepte les ACTIONs des joueurs, les traite en DB SQLite locale,
 * et rediffuse les STATE_UPDATE ou répond via RESYNC_RESPONSE.
 */
export function useMJResyncHandler() {
  const { sessionActive, roleEffectif } = useStore();

  useEffect(() => {
    if (!sessionActive || (roleEffectif !== 'admin' && roleEffectif !== 'mj')) return;

    const db = (window as any).db;
    if (!db) return;

    // ── 1. GESTION DES ACTIONS (Ordres des joueurs) ───────────────────────────
    const unsubAction = peerService.onAction(async (msg, fromPeerId) => {
      
      if (msg.kind === 'player_identity') {
        const { id, pseudo } = msg.payload;
        try {
          const res = await db.comptes.getById(id);
          if (!res.data) {
            await db.comptes.create({ id, pseudo, mot_de_passe: 'remote_player', role: 'joueur' });
          }
          
          // Lier à la session pour qu'il apparaisse dans l'onglet Gérer (comptes de la session)
          await db.session_comptes.getByIds ? await db.session_comptes.getByIds(sessionActive.id, id) : null;
          // Comme on n'a pas forcément getByIds, on peut try/catch une création directe (la contrainte PRIMARY KEY l'ignorera si existant)
          try {
            await db.session_comptes.create({ id_session: sessionActive.id, id_compte: id });
            peerService.broadcastToAll({
              type: 'STATE_UPDATE',
              entity: 'session',
              payload: { type: 'player_joined' }
            });
          } catch (errSess) {
             // Ignoré si déjà lié
          }

          console.log(`👤 Joueur '${pseudo}' identifié et lié à la session ${sessionActive?.id}.`);
        } catch (e) {
          console.error(`Erreur identification joueur:`, e);
        }
      }

      if ((msg.kind as string) === 'request_map_channels') {
        const { mapService } = await import('../services/mapService');
        const channels = await mapService.getChannels(sessionActive.id);
        peerService.sendToJoueur(fromPeerId, {
          type: 'STATE_UPDATE',
          entity: 'session',
          payload: { type: 'map_update', channels }
        });
      }

      if ((msg.kind as string) === 'request_map_tokens') {
        const { channelId } = msg.payload;
        const { mapService } = await import('../services/mapService');
        const tokens = await mapService.getTokens(channelId);
        
        const resPerso = await db.personnages.getAll();
        const personnages = resPerso.success ? resPerso.data : [];
        
        const imageMap = new Map<string, string | null>(
          (personnages || []).map((p: any) => [p.id, p.image_url ?? null])
        );
        const enrichedTokens = tokens.map(t => ({
          ...t,
          image_url: t.image_url || (t.id_personnage ? imageMap.get(t.id_personnage) : null) || t.image_url,
        }));

        peerService.sendToJoueur(fromPeerId, {
          type: 'STATE_UPDATE',
          entity: 'session',
          payload: { type: 'map_tokens_update', channelId, tokens: enrichedTokens }
        });
      }

      if ((msg.kind as string) === 'add_token') {
        const { token } = msg.payload;
        const { mapService } = await import('../services/mapService');
        const newToken = await mapService.addToken(token);
        if (newToken) {
          const tokens = await mapService.getTokens(token.id_channel);
          const resPerso = await db.personnages.getAll();
          const personnages = resPerso.success ? resPerso.data : [];
          
          const imageMap = new Map<string, string | null>(
            (personnages || []).map((p: any) => [p.id, p.image_url ?? null])
          );
          const enrichedTokens = tokens.map(t => ({
            ...t,
            image_url: t.image_url || (t.id_personnage ? imageMap.get(t.id_personnage) : null) || t.image_url,
          }));

          peerService.broadcastToAll({
            type: 'STATE_UPDATE',
            entity: 'session',
            payload: { type: 'map_tokens_update', channelId: token.id_channel, tokens: enrichedTokens }
          });
        }
      }

      if (msg.kind === 'move_token') {
        const { id, x, y } = msg.payload;
        await db.map_tokens.update(id, { x, y });
        peerService.broadcastToAll({
          type: 'STATE_UPDATE',
          entity: ('map_token' as any),
          payload: { id, x, y }
        });
      }

      if (msg.kind === 'delete_token') {
        const { id, channelId } = msg.payload;
        const { mapService } = await import('../services/mapService');
        const ok = await mapService.deleteToken(id);
        if (ok && channelId) {
          const tokens = await mapService.getTokens(channelId);
          const resPerso = await db.personnages.getAll();
          const personnages = resPerso.success ? resPerso.data : [];
          
          const imageMap = new Map<string, string | null>(
            (personnages || []).map((p: any) => [p.id, p.image_url ?? null])
          );
          const enrichedTokens = tokens.map(t => ({
            ...t,
            image_url: t.image_url || (t.id_personnage ? imageMap.get(t.id_personnage) : null) || t.image_url,
          }));

          peerService.broadcastToAll({
            type: 'STATE_UPDATE',
            entity: 'session',
            payload: { type: 'map_tokens_update', channelId, tokens: enrichedTokens }
          });
        }
      }

      if ((msg.kind as string) === 'add_item') {
        const { personnageId, itemId, quantite } = msg.payload;
        await inventaireService.ajouterItem(personnageId, itemId, quantite);
        peerService.broadcastToAll({ type: 'STATE_UPDATE', entity: 'inventaire', payload: { type: 'item_added' } });
      }

      if ((msg.kind as string) === 'toggle_equip') {
        const { entryId, equipe } = msg.payload;
        await inventaireService.toggleEquipement(entryId, equipe);
        peerService.broadcastToAll({ type: 'STATE_UPDATE', entity: 'inventaire', payload: { type: 'equip_toggled' } });
      }

      if ((msg.kind as string) === 'remove_item') {
        const { entryId, quantite } = msg.payload;
        await inventaireService.retirerItem(entryId, quantite);
        peerService.broadcastToAll({ type: 'STATE_UPDATE', entity: 'inventaire', payload: { type: 'item_removed' } });
      }

      if (msg.kind === 'dice_roll') {
        peerService.broadcastToAll({ type: 'STATE_UPDATE', entity: 'dice', payload: msg.payload });
      }

      if (msg.kind === 'log_action') {
        try {
          const { logService } = await import('../services/logService');
          await logService.logAction(msg.payload);
        } catch (err) {
          console.error("Erreur log_action:", err);
        }
      }

      if ((msg.kind as string) === 'request_logs') {
        const { sessionId, personnageId } = msg.payload;
        try {
          const { logService } = await import('../services/logService');
          const logs = await logService.getLogs(sessionId, personnageId);
          peerService.sendToJoueur(fromPeerId, {
            type: 'STATE_UPDATE',
            entity: 'logs_update' as any,
            payload: { sessionId, personnageId, logs }
          });
        } catch (err) {
          console.error("Erreur request_logs:", err);
        }
      }

      if ((msg.kind as string) === 'request_chat_canaux') {
        const { targetCompteId } = msg.payload;
        const { chatService } = await import('../services/chatService');
        const canaux = await chatService.getCanaux(sessionActive.id, targetCompteId, false);
        peerService.sendToJoueur(fromPeerId, {
          type: 'STATE_UPDATE',
          entity: ('chat_canaux_update' as any),
          payload: { canaux: canaux.filter(c => !c.nom?.startsWith('map_')) }
        });
      }

      if ((msg.kind as string) === 'request_chat_messages') {
        const { canalId } = msg.payload;
        const { chatService } = await import('../services/chatService');
        const messages = await chatService.getMessages(canalId, 50);
        peerService.sendToJoueur(fromPeerId, {
          type: 'STATE_UPDATE',
          entity: ('chat_messages_update' as any),
          payload: { canalId, messages }
        });
      }

      if ((msg.kind as string) === 'request_chat_membres') {
        const { chatService } = await import('../services/chatService');
        const membres = await chatService.getMembresSession(sessionActive.id);
        peerService.sendToJoueur(fromPeerId, {
          type: 'STATE_UPDATE',
          entity: ('chat_membres_update' as any),
          payload: { membres }
        });
      }

      if ((msg.kind as string) === 'request_map_chat_canal') {
        const { channelId } = msg.payload;
        const { chatService } = await import('../services/chatService');
        const nomCanal = `map_${channelId}`;
        const resCanaux = await db.chat_canaux.getAll();
        const rawCanaux = resCanaux.success ? resCanaux.data : [];
        let canal = rawCanaux.find((c: any) => c.id_session === sessionActive.id && c.nom === nomCanal);
        if (!canal) {
           const membres = await chatService.getMembresSession(sessionActive.id)
           const ids = membres.map(m => m.id)
           canal = await chatService.creerCanalPrive(sessionActive.id, ids, nomCanal)
        }
        if (canal) {
           peerService.sendToJoueur(fromPeerId, {
              type: 'STATE_UPDATE',
              entity: ('map_chat_canal_update' as any),
              payload: { channelId, canalId: canal.id }
           });
        }
      }

      if ((msg.kind as string) === 'create_chat_canal') {
        const { compteIds, nom } = msg.payload;
        const { chatService } = await import('../services/chatService');
        await chatService.creerCanalPrive(sessionActive.id, compteIds, nom);
        peerService.broadcastToAll({
          type: 'STATE_UPDATE',
          entity: 'session',
          payload: { type: 'chat_updated' }
        });
      }

      if (msg.kind === 'chat_message') {
        try {
          const { chatService } = await import('../services/chatService');
          const result = await chatService.envoyerMessage(msg.payload);
          if (result) {
            peerService.broadcastToAll({ type: 'STATE_UPDATE', entity: 'chat', payload: result });
          }
        } catch (err) {
          console.error("Erreur chat_message:", err);
        }
      }

      if ((msg.kind as string) === 'learn_competence') {
        const { idPersonnage, idCompetence } = msg.payload;
        const { competenceService } = await import('../services/competenceService');
        await competenceService.apprendreCompetence(idPersonnage, idCompetence);
        
        const fullPerso = await personnageService.recalculerStats(idPersonnage);
        if (fullPerso) {
          peerService.broadcastToAll({
            type: 'STATE_UPDATE',
            entity: 'personnage',
            payload: { id_personnage: idPersonnage, type: 'full', valeur: fullPerso }
          });
        }
      }

      if ((msg.kind as string) === 'forget_competence') {
        const { idPersonnage, idCompetence } = msg.payload;
        const { competenceService } = await import('../services/competenceService');
        await competenceService.oublierCompetence(idPersonnage, idCompetence);
        
        const fullPerso = await personnageService.recalculerStats(idPersonnage);
        if (fullPerso) {
          peerService.broadcastToAll({
            type: 'STATE_UPDATE',
            entity: 'personnage',
            payload: { id_personnage: idPersonnage, type: 'full', valeur: fullPerso }
          });
        }
      }

      if (msg.kind === 'toggle_competence') {
        const { liaisonId, is_active } = msg.payload;
        await db.personnage_competences.update(liaisonId, { is_active: is_active ? 1 : 0 });
        
        const liaisonRes = await db.personnage_competences.getById(liaisonId);
        if (liaisonRes && liaisonRes.success && liaisonRes.data) {
          const charId = (liaisonRes.data as any).id_personnage;
          const fullPerso = await personnageService.recalculerStats(charId);
          if (fullPerso) {
            peerService.broadcastToAll({
              type: 'STATE_UPDATE',
              entity: 'personnage',
              payload: { id_personnage: charId, type: 'full', valeur: fullPerso }
            });
          }
        }
      }

      if (msg.kind === 'update_resource') {
        const { id_personnage, type, valeur } = msg.payload;
        await db.personnages.update(id_personnage, { [type]: valeur });
        peerService.broadcastToAll({
          type: 'STATE_UPDATE',
          entity: 'personnage',
          payload: { id_personnage, type, valeur }
        });
      }

      if (msg.kind === 'create_character') {
        const payload = msg.payload;
        try {
          const { stats, ...dbData } = payload;
          const res = await db.personnages.create(dbData);
          if (res.success) {
            for (const s of (stats || [])) {
              await db.personnage_stats.create({
                id: crypto.randomUUID(),
                id_personnage: payload.id,
                id_stat: s.id_stat,
                valeur: s.valeur
              }).catch((err: any) => console.error("[MJ] Erreur stat:", err));
            }
            if (payload.type === 'Joueur') {
              await db.session_joueurs.create({
                id_session: sessionActive.id,
                id_personnage: payload.id
              });
            }
            const fullPerso = await personnageService.recalculerStats(payload.id);
            if (fullPerso) {
               peerService.sendToJoueur(fromPeerId, {
                 type: 'STATE_UPDATE',
                 entity: 'personnage',
                 payload: { id_personnage: payload.id, type: 'full', valeur: fullPerso }
               });
            }
            peerService.broadcastToAll({
              type: 'STATE_UPDATE',
              entity: 'session',
              payload: { type: 'character_created' }
            });
          }
        } catch (e: any) {
          console.error("❌ [MJ] Erreur création personnage:", e);
        }
      }
    });

    // ── 2. GESTION DES RESYNC (Demandes d'état complet) ────────────────────────
    const unsubResync = peerService.onResyncRequest(async (charId, fromPeerId, dataType) => {
      if (charId) {
        if (!dataType || dataType === 'full') {
          const fullPerso = await personnageService.recalculerStats(charId);
          if (fullPerso) {
            peerService.sendToJoueur(fromPeerId, { type: 'RESYNC_RESPONSE', dataType: 'full', payload: fullPerso });
          }
        }
        
        if (dataType === 'inventaire') {
          const data = await inventaireService.getInventaire(charId);
          peerService.sendToJoueur(fromPeerId, { type: 'RESYNC_RESPONSE', dataType: 'inventaire', payload: data });
        }

        if (dataType === 'competences') {
          const resPC = await db.personnage_competences.getAll();
          const rawPC = resPC.success ? resPC.data : [];
          const persoComps = rawPC.filter((l: any) => l.id_personnage === charId);
          const lib = await competenceService.getCompetences(sessionActive.id);
          peerService.sendToJoueur(fromPeerId, { type: 'RESYNC_RESPONSE', dataType: 'competences', payload: { persoComps, lib } });
        }
      } else if (!dataType) {
        // RESYNC GLOBAL (Demande de bibliothèque)
        console.log(`[MJ] 📚 Resync global demandé par ${fromPeerId}`);
        const { itemsService } = await import('../services/itemsService');
        const items = await itemsService.getItems(sessionActive.id);
        const resStats = await db.stats.getAll();
        const stats = resStats.success ? resStats.data : [];
        
        peerService.sendToJoueur(fromPeerId, {
          type: 'STATE_UPDATE',
          entity: 'session',
          payload: { type: 'library_update', items, stats }
        });

        const libComps = await competenceService.getCompetences(sessionActive.id);
        peerService.sendToJoueur(fromPeerId, {
          type: 'STATE_UPDATE',
          entity: 'session',
          payload: { type: 'library_update_competences', competences: libComps }
        });
      }

      if (dataType === 'quetes') {
        const data = await queteService.getQuetes(sessionActive.id);
        peerService.sendToJoueur(fromPeerId, { type: 'RESYNC_RESPONSE', dataType: 'quetes', payload: data });
      }
    });

    // ── 3. LISTE DES PERSONNAGES DISPONIBLES ─────────────────────────────────
    const unsubList = peerService.onListCharactersRequest(async (compteId, fromPeerId) => {
      try {
        const res = await db.personnages.getAll();
        if (res.success && res.data) {
          const data = res.data.filter((p: any) => 
            p.id_session === sessionActive.id && 
            p.lie_au_compte === compteId &&
            p.is_template === 0
          );
          const hydrated = await personnageService.hydraterPersonnages(data);
          peerService.sendToJoueur(fromPeerId, { type: 'LIST_CHARACTERS_RESPONSE', personnages: hydrated });
        }
      } catch (e) {
        peerService.sendToJoueur(fromPeerId, { type: 'LIST_CHARACTERS_RESPONSE', personnages: [] });
      }
    });

    return () => {
      unsubAction();
      unsubResync();
      unsubList();
    };
  }, [sessionActive, roleEffectif]);
}
