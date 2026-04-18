import { useState, useEffect, useCallback } from 'react'
import { logService } from '../services/logService'
import { LogActivite } from '../types'
import { useRealtimeQuery } from './useRealtimeQuery'

export function useLogs(sessionId: string | undefined, personnageId?: string) {
  const [logs, setLogs] = useState<LogActivite[]>([])
  const [chargement, setChargement] = useState(false)

  const charger = useCallback(async () => {
    if (!sessionId) return
    setChargement(true)
    const data = await logService.getLogs(sessionId, personnageId)
    setLogs(data)
    setChargement(false)
  }, [sessionId, personnageId])

  useEffect(() => { charger() }, [charger])

  useRealtimeQuery({
    tables: ['logs_activite'],
    sessionId,
    onReload: charger,
    enabled: !!sessionId
  })

  return { logs, chargement, charger }
}