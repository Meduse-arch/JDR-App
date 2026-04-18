import { useState, useCallback } from 'react'

export function useOptimistic<T>(initialData: T) {
  const [data, setData] = useState<T>(initialData)
  const [pending, setPending] = useState(false)

  // Met à jour immédiatement l'UI (avant la BD)
  const optimisticUpdate = useCallback((updater: (prev: T) => T) => {
    setData(prev => updater(prev))
  }, [])

  // Confirme avec les données réelles de la BD
  const confirm = useCallback((realData: T) => {
    setData(realData)
    setPending(false)
  }, [])

  // Rollback en cas d'erreur
  const rollback = useCallback((previousData: T) => {
    setData(previousData)
    setPending(false)
  }, [])

  return { data, setData, pending, setPending, optimisticUpdate, confirm, rollback }
}
