import { useState, useCallback } from 'react'

export interface Toast {
  id: string
  msg: string
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const afficherToast = useCallback((msg: string) => {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev, { id, msg }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }, [])

  const retirerToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return {
    toasts,
    afficherToast,
    retirerToast
  }
}
