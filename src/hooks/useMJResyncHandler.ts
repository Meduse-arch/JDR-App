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
          console.log(`[MJ] 🏗️ Création personnage pour ${fromPeerId}:`, payload.nom);
          
          // 1. Créer le personnage (SQLite)
          const res = await db.personnages.create({
            id: payload.id,
            id_session: sessionActive.id, 
            nom: payload.nom,
            type: payload.type || 'Joueur',
            is_template: payload.is_template ? 1 : 0,
            lie_au_compte: payload.lie_au_compte,
            hp: payload.hp || 10,
            mana: payload.mana || 10,
            stam: payload.stam || 10,
            created_at: payload.created_at || new Date().toISOString()
          });

          if (res.success) {
            // 2. Sauvegarde des stats
            if (payload.stats && Array.isArray(payload.stats)) {
              console.log(`[MJ] 📊 Sauvegarde de ${payload.stats.length} statistiques...`);
              for (const s of payload.stats) {
                await db.personnage_stats.create({ 
                  id: crypto.randomUUID(), 
                  id_personnage: payload.id, 
                  id_stat: s.id_stat, 
                  valeur: s.valeur 
                }).catch(err => console.error("[MJ] Erreur stat:", err));
              }
            }

            // 3. Lien session/joueur
            if (payload.type === 'Joueur') {
              await db.session_joueurs.create({ 
                id_session: sessionActive.id, 
                id_personnage: payload.id 
              }).catch(() => {});
            }

            console.log(`✅ [MJ] Personnage '${payload.nom}' créé avec succès.`);
            
            // 4. Recalculer les stats max et renvoyer le perso COMPLET au joueur
            const fullPerso = await personnageService.recalculerStats(payload.id);
            
            peerService.sendToJoueur(fromPeerId, {
              type: 'STATE_UPDATE',
              entity: 'session',
              payload: { type: 'character_created', personnage: fullPerso }
            });
            
            // Re-demander la liste pour rafraîchir l'écran de sélection
            peerService.sendToJoueur(fromPeerId, {
              type: 'LIST_CHARACTERS_RESPONSE',
              personnages: fullPerso ? [fullPerso] : []
            });
          } else {
            console.error("[MJ] ❌ Échec création personnage SQLite:", res.error);
          }
        } catch (e) {
          console.error("[MJ] ❌ Erreur critique création personnage:", e);
        }
      }
    });

    const unsubResync = peerService.onResyncRequest(async (characterId, fromPeerId) => {
      if (characterId) {
        console.log(`[MJ] 🔄 Resync demandée pour le personnage ${characterId} par ${fromPeerId}`);
        const fullPerso = await personnageService.recalculerStats(characterId);
        if (fullPerso) {
          // On envoie via STATE_UPDATE car c'est mieux géré par les hooks des joueurs
          peerService.sendToJoueur(fromPeerId, {
            type: 'STATE_UPDATE',
            entity: 'personnage',
            payload: { id_personnage: characterId, type: 'full', valeur: fullPerso }
          });
          // Fallback compatibilité
          peerService.sendToJoueur(fromPeerId, {
            type: 'RESYNC_RESPONSE',
            payload: fullPerso
          });
        }
      } else {
        // RESYNC GLOBALE (Bibliothèques)
        const sessionActive = useStore.getState().sessionActive;
        if (!sessionActive) return;
        
        console.log(`[MJ] 📚 Envoi des bibliothèques à ${fromPeerId}...`);

        const [items, stats, competences] = await Promise.all([
          itemsService.getItems(sessionActive.id),
          itemsService.getStats(), // Récupère la table 'stats' complète (id, nom, desc)
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
      console.log(`[MJ] 📩 Requête LIST_CHARACTERS de ${fromPeerId} pour ${compteId}`);
      try {
        const sessionActive = useStore.getState().sessionActive;
        if (!sessionActive) return;

        const res = await db.personnages.getAll();
        if (!res.success) {
          peerService.sendToJoueur(fromPeerId, { type: 'LIST_CHARACTERS_RESPONSE', personnages: [] });
          return;
        }

        // Filtrage simple par compte et session
        const myPersosRaw = res.data.filter((p: any) => 
          p.lie_au_compte === compteId && 
          (p.id_session === sessionActive.id || p.id_session === 'remote-session' || !p.id_session) && 
          p.is_template === 0
        );

        // On calcule au moins les ressources de base (HP Max etc.) pour ne pas casser l'UI du joueur
        const basicHydrated = await personnageService.hydraterPersonnages(myPersosRaw);

        console.log(`[MJ] 🔍 Trouvé ${basicHydrated.length} persos. Envoi avec ressources MAX.`);

        // On envoie la version hydratée pour que les barres HP/Mana s'affichent correctement
        peerService.sendToJoueur(fromPeerId, {
          type: 'LIST_CHARACTERS_RESPONSE',
          personnages: basicHydrated
        });

        // Puis on hydrate et on envoie les détails un par un (plus fiable sur réseau instable)
        for (const p of myPersosRaw) {
          const full = await personnageService.recalculerStats(p.id);
          if (full) {
            peerService.sendToJoueur(fromPeerId, {
              type: 'STATE_UPDATE',
              entity: 'personnage',
              payload: { id_personnage: p.id, type: 'full', valeur: full }
            });
          }
        }
      } catch (e) {
        console.error("[MJ] Erreur ListCharactersRequest:", e);
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
