import { useEffect, useRef } from 'react'
import { peerService } from '../services/peerService'

export interface TableConfig {
  table: string
  /** Colonne de filtre. Défaut : 'id_session' */
  filterColumn?: string
  /** Valeur de filtre explicite. Défaut : sessionId du hook */
  filterValue?: string
  /** Mettre false pour écouter sans filtre (ex: chat_participants) */
  filtered?: boolean
}

interface UseRealtimeQueryOptions {
  tables: (string | TableConfig)[]
  sessionId?: string
  onReload: () => void | Promise<void>
  debounce?: number
  enabled?: boolean
}

export function useRealtimeQuery({
  onReload,
  debounce = 400,
  enabled = true,
}: UseRealtimeQueryOptions) {
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onReloadRef = useRef(onReload)

  // Toujours garder la ref à jour sans re-souscrire
  useEffect(() => { onReloadRef.current = onReload })

  // MIGRATION WebRTC — remplacé par peerService.onStateUpdate
  useEffect(() => {
    if (!enabled) return

    const unsubscribe = peerService.onStateUpdate(() => {
      // Pour l'instant, on déclenche onReload sur tous les state updates pertinents.
      // Le composant vérifiera la DB locale (si MJ) ou recevra les données directement (si Joueur, via Zustand à l'avenir).
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        onReloadRef.current()
      }, debounce)
    })

    // On écoute aussi les ACTIONs côté MJ pour rafraîchir l'interface locale quand un joueur interagit
    const unsubAction = peerService.onAction(() => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        onReloadRef.current()
      }, debounce)
    })

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      unsubscribe()
      unsubAction()
    }
  }, [enabled, debounce])
}