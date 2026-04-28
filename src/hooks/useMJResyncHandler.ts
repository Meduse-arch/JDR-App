import { useEffect } from 'react';
import { peerService } from '../services/peerService';
import { personnageService } from '../services/personnageService';
import { itemsService } from '../services/itemsService';
import { competenceService } from '../services/competenceService';
import { useStore } from '../store/useStore';

export function useMJResyncHandler() {
  const db = (window as any).db;
  const sessionActive = useStore(s => s.sessionActive);
  const roleEffectif = useStore(s => s.roleEffectif);

  useEffect(() => {
    if (!peerService.isHost || !sessionActive) return;

    console.log("📡 MJ Resync Handler : Activation de l'écoute...");
    const unsubAction = peerService.onAction(async (msg, fromPeerId) => {
      if (msg.kind === 'player_identity') {
        const { id, pseudo } = msg.payload;
        try {
          // 1. Assurer l'existence du compte dans le masterDb
          await db.comptes.create({ id, pseudo, mot_de_passe: 'external', role: 'joueur' }).catch(() => {});
          
          // 2. Lier le compte à la session active (sessionDb)
          if (sessionActive) {
            // Utiliser l'ID REEL de la session du MJ, pas celui envoyé par le joueur si possible
            await db.session_comptes.create({ id_session: sessionActive.id, id_compte: id }).catch(() => {});
          }
          
          console.log(`👤 Joueur '${pseudo}' identifié et lié à la session ${sessionActive?.id}.`);
        } catch (e) {}
      }

      if (msg.kind === 'move_token') {
        const { id, x, y } = msg.payload;
        await db.map_tokens.update(id, { x, y });
        // On rebroadcast pour que tous les autres joueurs voient le mouvement
        peerService.broadcastToAll({
          type: 'STATE_UPDATE',
          entity: 'map_token',
          payload: { id, x, y }
        });
      }

      if (msg.kind === 'add_item') {
        const { personnageId, itemId, quantite } = msg.payload;
        await itemsService.ajouterItem(personnageId, itemId, quantite);
        peerService.broadcastToAll({ type: 'STATE_UPDATE', entity: 'session', payload: { type: 'character_created' } });
      }

      if (msg.kind === 'toggle_equip') {
        const { entryId, equipe } = msg.payload;
        await inventaireService.toggleEquipement(entryId, equipe);
        peerService.broadcastToAll({ type: 'STATE_UPDATE', entity: 'session', payload: { type: 'character_created' } });
      }

      if (msg.kind === 'remove_item') {
        const { entryId, quantite } = msg.payload;
        await inventaireService.retirerItem(entryId, quantite);
        peerService.broadcastToAll({ type: 'STATE_UPDATE', entity: 'session', payload: { type: 'character_created' } });
      }

      if (msg.kind === 'toggle_competence') {
        const { liaisonId, is_active } = msg.payload;
        await db.personnage_competences.update(liaisonId, { is_active: is_active ? 1 : 0 });
        // On broadcast le changement à tout le monde
        peerService.broadcastToAll({
          type: 'STATE_UPDATE',
          entity: 'session',
          payload: { type: 'character_created' } // Force refresh pour tout le monde
        });
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
        if (!sessionActive) return;

        try {
          // FORCE l'ID de session du MJ pour éviter le bug du "remote-session"
          const res = await db.personnages.create({
            id: payload.id,
            id_session: sessionActive.id, 
            nom: payload.nom,
            type: payload.type,
            is_template: payload.is_template,
            lie_au_compte: payload.lie_au_compte,
            hp: payload.hp,
            mana: payload.mana,
            stam: payload.stam,
            created_at: payload.created_at
          });

          if (res.success) {
            // Sauvegarde des stats
            if (payload.stats) {
              for (const s of payload.stats) {
                await db.personnage_stats.create({ 
                  id: crypto.randomUUID(), 
                  id_personnage: payload.id, 
                  id_stat: s.id_stat, 
                  valeur: s.valeur 
                });
              }
            }

            // Lien session/joueur
            if (payload.type === 'Joueur') {
              await db.session_joueurs.create({ 
                id_session: sessionActive.id, // FORCE l'ID du MJ
                id_personnage: payload.id 
              }).catch(() => {});
            }

            console.log(`✅ Personnage '${payload.nom}' créé et lié à la session ${sessionActive.id}`);
            
            // On signale au joueur de se rafraîchir
            peerService.sendToJoueur(fromPeerId, {
              type: 'STATE_UPDATE',
              entity: 'session',
              payload: { type: 'character_created' }
            });
          }
        } catch (e) {
          console.error("Erreur création personnage via WebRTC:", e);
        }
      }
    });

    const unsubResync = peerService.onResyncRequest(async (characterId, fromPeerId) => {
      if (characterId) {
        const fullPerso = await personnageService.recalculerStats(characterId);
        if (fullPerso) {
          peerService.sendToJoueur(fromPeerId, {
            type: 'RESYNC_RESPONSE',
            payload: fullPerso
          });
        }
      } else {
        // RESYNC GLOBALE (Bibliothèques)
        const sessionActive = useStore.getState().sessionActive;
        if (!sessionActive) return;
        
        const [items, stats, competences] = await Promise.all([
          itemsService.getItems(sessionActive.id),
          itemsService.getStats(),
          competenceService.getCompetences(sessionActive.id)
        ]);

        peerService.sendToJoueur(fromPeerId, {
          type: 'STATE_UPDATE',
          entity: 'session',
          payload: { type: 'library_update', items, stats }
        });
        peerService.sendToJoueur(fromPeerId, {
          type: 'STATE_UPDATE',
          entity: 'session',
          payload: { type: 'library_update_competences', competences }
        });
      }
    });

    // Gestion de la demande de liste de personnages d'un compte
    const unsubList = peerService.onListCharactersRequest(async (compteId, fromPeerId) => {
      console.log(`[MJ] 📩 Requête LIST_CHARACTERS de ${fromPeerId} pour le compte ${compteId}`);
      try {
        const sessionActive = useStore.getState().sessionActive;
        if (!sessionActive) {
          console.error("[MJ] ❌ Erreur : aucune session active côté MJ !");
          return;
        }

        const res = await db.personnages.getAll();
        if (!res.success) {
          console.error("[MJ] ❌ Erreur : impossible de lire la table personnages :", res.error);
          return;
        }

        const allPersos = res.data;
        console.log(`[MJ] 📊 Base de données MJ contient ${allPersos.length} personnages au total.`);

        // 1. REPARATION ET SYNCHRO
        const toRepair = allPersos.filter((p: any) => p.lie_au_compte === compteId && (p.id_session !== sessionActive.id));
        if (toRepair.length > 0) {
          console.log(`[MJ] 🔧 Détection de ${toRepair.length} personnages à synchroniser pour ${compteId}`);
          for (const p of toRepair) {
            console.log(`[MJ] 🔧 Synchro session pour ${p.nom} (${p.id_session} -> ${sessionActive.id})`);
            await db.personnages.update(p.id, { id_session: sessionActive.id });
            await db.session_joueurs.create({ id_session: sessionActive.id, id_personnage: p.id }).catch(() => {});
          }
        }

        // 2. RECUPERATION FINALE
        const resUpdated = await db.personnages.getAll();
        const myPersos = resUpdated.success 
          ? resUpdated.data.filter((p: any) => p.lie_au_compte === compteId && p.id_session === sessionActive.id && p.is_template === 0)
          : [];
        
        console.log(`[MJ] 🔍 Filtrage final : ${myPersos.length} personnages trouvés pour le compte ${compteId} dans session ${sessionActive.id}`);

        if (myPersos.length === 0) {
          console.warn(`[MJ] ⚠️ Aucun personnage trouvé pour ${compteId} malgré ${allPersos.length} totaux. Détail des comptes en base :`, allPersos.map((p: any) => ({nom: p.nom, lie: p.lie_au_compte})));
        }

        // 3. HYDRATATION ET ENVOI
        const fullPersos = await Promise.all(myPersos.map(async (p: any) => {
          try {
            console.log(`[MJ] 💧 Hydratation de ${p.nom}...`);
            const full = await personnageService.recalculerStats(p.id);
            if (full) return full;
            
            console.warn(`[MJ] ⚠️ Fallback d'hydratation pour ${p.nom}`);
            const [resStats, resComps, resInv] = await Promise.all([
              db.personnage_stats.getAll(),
              db.personnage_competences.getAll(),
              db.inventaire.getAll()
            ]);

            const stats = resStats.success ? resStats.data.filter((s: any) => s.id_personnage === p.id) : [];
            const comps = resComps.success ? resComps.data.filter((pc: any) => pc.id_personnage === p.id) : [];
            const inv   = resInv.success ? resInv.data.filter((i: any) => i.id_personnage === p.id) : [];

            return { ...p, stats, competences: comps, inventaire: inv, quetes: [] };
          } catch (err) {
            console.error(`[MJ] ❌ Erreur hydratation perso ${p.nom}:`, err);
            return { ...p, stats: [], competences: [], inventaire: [], quetes: [] };
          }
        }));

        console.log(`[MJ] 📤 Envoi de ${fullPersos.length} personnages à ${fromPeerId}`);
        peerService.sendToJoueur(fromPeerId, {
          type: 'LIST_CHARACTERS_RESPONSE',
          personnages: fullPersos
        });

      } catch (e) {
        console.error("[MJ] ❌ Erreur critique ListCharactersRequest:", e);
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
