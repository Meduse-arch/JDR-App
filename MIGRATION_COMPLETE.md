# Migration Supabase → SQLite + WebRTC — Sigil

## Statut : COMPLÈTE ✅

## Architecture finale
- **Authentification** : Supabase Auth (comptes utilisateurs, inscription, connexion)
- **Données de jeu** : SQLite local sur le PC du MJ (via IPC Electron)
- **Temps réel** : WebRTC P2P via PeerJS (signaling : PeerJS Cloud 0.peerjs.com)
- **Topologie** : Étoile — MJ = hôte, Joueurs = clients légers (store Zustand uniquement)

## Prérequis réseau pour les joueurs à distance
- Connexion internet requise pour le signaling PeerJS initial
- Les données de jeu transitent en P2P direct après connexion établie
- En cas d'échec NAT : les serveurs STUN Google configurés comme fallback

## Tests de smoke à valider manuellement
- [ ] Inscription / connexion via Supabase Auth fonctionne
- [ ] MJ crée une session → PeerId affiché, copiable
- [ ] Joueur saisit le code → connexion WebRTC établie (internet)
- [ ] MJ modifie les PV → tous les joueurs voient la mise à jour en temps réel
- [ ] Joueur envoie une action → MJ valide, persiste SQLite, broadcast
- [ ] Joueur se déconnecte et revient → Resync automatique depuis SQLite MJ
- [ ] Chat MJ ↔ Joueurs fonctionne
- [ ] Jets de dés partagés visibles par tous
- [ ] Settings de session synchronisés (request-settings flow)

## Fichiers Supabase conservés intentionnellement
- `src/supabase.ts` — client (utilisé par authService)
- `src/services/authService.ts` — gestion des comptes, intouché

## Points de vigilance post-migration
- **23 vulnérabilités npm PeerJS** : lancer `npm audit` — la plupart sont dans
  des dépendances transitives. Lancer `npm audit fix` si aucun breaking change.
- **PeerJS Cloud** : service gratuit avec limites (50 connexions simultanées max
  sur le tier gratuit). Suffisant pour du JDR en groupe, mais prévoir un
  fallback auto-hébergé (`peer-server`) si la limite est atteinte.
- **NAT traversal** : les joueurs derrière des NAT très stricts (CGNAT) peuvent
  avoir des problèmes de connexion. Solution future : ajouter un serveur TURN.
