import { useState, useCallback } from 'react'

export interface Toast {
  id: number
  msg: string
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const afficherToast = useCallback((msg: string) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, msg }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }, [])

  const retirerToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return {
    toasts,
    afficherToast,
    retirerToast
  }
}
