import { useState, useEffect, useCallback } from 'react'
import { logService } from '../services/logService'
import { LogActivite } from '../types'
import { useRealtimeQuery } from './useRealtimeQuery'
import { peerService } from '../services/peerService'

export function useLogs(sessionId: string | undefined, personnageId?: string) {
  const [logs, setLogs] = useState<LogActivite[]>([])
  const [chargement, setChargement] = useState(false)

  const charger = useCallback(async () => {
    if (!sessionId) return
    setChargement(true)
    if (peerService.isHost) {
      const data = await logService.getLogs(sessionId, personnageId)
      setLogs(data)
      setChargement(false)
    } else {
      peerService.sendToMJ({
        type: 'ACTION',
        kind: 'request_logs',
        payload: { sessionId, personnageId }
      })
    }
  }, [sessionId, personnageId])

  useEffect(() => { charger() }, [charger])

  useEffect(() => {
    if (peerService.isHost) return;
    const unsub = peerService.onStateUpdate((msg) => {
      if (msg.entity === 'logs_update') {
        if (msg.payload.sessionId === sessionId && msg.payload.personnageId === personnageId) {
          setLogs(msg.payload.logs)
          setChargement(false)
        }
      }
    });
    return unsub;
  }, [sessionId, personnageId]);

  useRealtimeQuery({
    tables: ['logs_activite'],
    sessionId,
    onReload: charger,
    enabled: !!sessionId
  })

  return { logs, chargement, charger }
}