import { useEffect } from 'react'
import { useStore } from '../store/useStore'
import { broadcastService } from '../services/broadcastService'

export function useSessionSettings() {
  const { sessionActive, roleEffectif } = useStore()

  useEffect(() => {
    if (!sessionActive) return

    // 1. S'abonner aux mises à jour (Tout le monde écoute)
    const unsubUpdate = broadcastService.subscribe(sessionActive.id, 'settings-update', (nouveauxParametres) => {
      const state = useStore.getState();
      if (!state.sessionActive) return;
      
      // Mettre à jour le store local
      state.setSessionActive({
        ...state.sessionActive,
        parametres: nouveauxParametres
      })
      
      // Le MJ sauvegarde dans son localStorage pour garder la persistance
      if (state.roleEffectif === 'mj' || state.roleEffectif === 'admin') {
         localStorage.setItem(`sigil-settings-${state.sessionActive.id}`, JSON.stringify(nouveauxParametres))
      }
    })

    // 2. S'abonner aux requêtes (Seuls les MJ répondent)
    const unsubRequest = broadcastService.subscribe(sessionActive.id, 'request-settings', () => {
      const state = useStore.getState();
      if (state.roleEffectif === 'mj' || state.roleEffectif === 'admin') {
        const localSettings = localStorage.getItem(`sigil-settings-${sessionActive.id}`)
        if (localSettings) {
          try {
            const parsed = JSON.parse(localSettings)
            broadcastService.send(sessionActive.id, 'settings-update', parsed)
          } catch (e) {
            console.error("Invalid local settings", e)
          }
        } else if (state.sessionActive?.parametres) {
          // Si le MJ a des paramètres en mémoire, on les envoie
          broadcastService.send(sessionActive.id, 'settings-update', state.sessionActive.parametres)
        }
      }
    })

    // 3. À la connexion, récupérer ou demander les paramètres
    if (roleEffectif === 'mj' || roleEffectif === 'admin') {
        // Le MJ charge ses propres paramètres depuis le localStorage
        const localSettings = localStorage.getItem(`sigil-settings-${sessionActive.id}`)
        if (localSettings) {
            try {
                const parsed = JSON.parse(localSettings)
                const state = useStore.getState();
                if (state.sessionActive) {
                  state.setSessionActive({
                     ...state.sessionActive,
                     parametres: parsed
                  })
                }
            } catch (e) {}
        }
    } else {
        // Les joueurs demandent les paramètres aux MJ présents
        // Petit délai pour s'assurer que le canal WebSocket est bien connecté (Supabase prend un instant pour SUBSCRIBE)
        setTimeout(() => {
          broadcastService.send(sessionActive.id, 'request-settings', {})
        }, 1500)
    }

    return () => {
      unsubUpdate()
      unsubRequest()
    }
  }, [sessionActive?.id, roleEffectif]) 
}
