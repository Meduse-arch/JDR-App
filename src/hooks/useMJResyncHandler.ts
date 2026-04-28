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
      console.log(`Requête LIST_CHARACTERS reçue de ${fromPeerId} pour le compte ${compteId}`);
      try {
        const sessionActive = useStore.getState().sessionActive;
        if (!sessionActive) return;

        const res = await db.personnages.getAll();
        
        if (res.success) {
          // REPARATION AUTO : Si des persos sont en "remote-session", on les remet dans la session active
          // (Seulement s'ils appartiennent au compte qui demande et qu'ils ne sont pas dans une autre session valide)
          const needsRepair = res.data.filter((p: any) => p.id_session === 'remote-session' && p.lie_au_compte === compteId);
          for (const p of needsRepair) {
            console.log(`🔧 Réparation du personnage ${p.nom} (remote-session -> ${sessionActive.id})`);
            await db.personnages.update(p.id, { id_session: sessionActive.id });
            await db.session_joueurs.create({ id_session: sessionActive.id, id_personnage: p.id }).catch(() => {});
          }

          // On rafraîchit les données après réparation potentielle
          const resUpdated = await db.personnages.getAll();
          const allPersos = resUpdated.success ? resUpdated.data : [];

          // Filtrer par compte ET par session active
          const raw = allPersos.filter((p: any) => 
            p.lie_au_compte === compteId && 
            p.id_session === sessionActive.id && 
            p.is_template === 0
          );
          
          const hydrated = await personnageService.hydraterPersonnages(raw);
          
          // Récupérer les données complètes pour chaque personnage pour le joueur
          const fullPersos = await Promise.all(hydrated.map(async (p) => {
            const [resStats, resComps, resInv] = await Promise.all([
              db.personnage_stats.getAll(),
              db.personnage_competences.getAll(),
              db.inventaire.getAll()
            ]);

            const stats = resStats.success ? resStats.data.filter((s: any) => s.id_personnage === p.id) : [];
            
            // On récupère aussi les détails des compétences
            const liaisons = resComps.success ? resComps.data.filter((pc: any) => pc.id_personnage === p.id) : [];
            const resAllComps = await competenceService.getCompetences(sessionActive.id);
            const competences = liaisons.map((l: any) => {
              const info = resAllComps.find(c => c.id === l.id_competence);
              return info ? { ...l, competence: info } : null;
            }).filter(Boolean);

            // On récupère aussi l'inventaire
            const invRaw = resInv.success ? resInv.data.filter((i: any) => i.id_personnage === p.id) : [];
            const resAllItems = await itemsService.getItems(sessionActive.id);
            const inventaire = invRaw.map((i: any) => {
              const item = resAllItems.find(it => it.id === i.id_item);
              return item ? { ...i, items: item } : null;
            }).filter(Boolean);

            // On récupère aussi les quêtes
            const quetes = await queteService.getQuetesPersonnage(p.id);

            return { ...p, stats, competences, inventaire, quetes };
          }));

          console.log(`Envoi de ${fullPersos.length} personnages complets à ${fromPeerId}`);
          
          peerService.sendToJoueur(fromPeerId, {
            type: 'LIST_CHARACTERS_RESPONSE',
            personnages: fullPersos
          });
        } else {
          // Répondre vide plutôt que de ne pas répondre
          peerService.sendToJoueur(fromPeerId, {
            type: 'LIST_CHARACTERS_RESPONSE',
            personnages: []
          });
        }
      } catch (e) {
        console.error("Erreur ListCharactersRequest:", e);
        // Toujours envoyer une réponse pour débloquer le joueur
        peerService.sendToJoueur(fromPeerId, {
          type: 'LIST_CHARACTERS_RESPONSE',
          personnages: []
        });
      }
    });

    return () => {
      unsubAction();
      unsubResync();
      unsubList();
    };
  }, [sessionActive, roleEffectif]);
}
