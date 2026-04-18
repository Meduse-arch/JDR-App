import { useEffect, useRef } from 'react'
import { supabase } from '../supabase'

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

let instanceCount = 0

export function useRealtimeQuery({
  tables,
  sessionId,
  onReload,
  debounce = 400,
  enabled = true,
}: UseRealtimeQueryOptions) {
  const instanceId  = useRef(++instanceCount)
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onReloadRef = useRef(onReload)

  // Toujours garder la ref à jour sans re-souscrire
  useEffect(() => { onReloadRef.current = onReload })

  // Normalise string | TableConfig → TableConfig
  const normalized: TableConfig[] = tables.map(t =>
    typeof t === 'string' ? { table: t } : t
  )

  // Clé stable qui détermine quand recréer le channel
  const tablesKey = normalized
    .map(t => `${t.table}|${t.filterColumn ?? ''}|${t.filterValue ?? ''}|${String(t.filtered ?? true)}`)
    .sort()
    .join(',')

  useEffect(() => {
    if (!enabled || normalized.length === 0) return

    const channelName = `rt-${tablesKey}-${sessionId ?? 'g'}-${instanceId.current}`
    let channel = supabase.channel(channelName)

    normalized.forEach(({ table, filterColumn, filterValue, filtered = true }) => {
      const col = filterColumn ?? 'id_session'
      const val = filterValue  ?? sessionId
      const filterStr = filtered && val ? `${col}=eq.${val}` : undefined

      const config = filterStr
        ? { event: '*' as const, schema: 'public', table, filter: filterStr }
        : { event: '*' as const, schema: 'public', table }

      channel = channel.on('postgres_changes' as any, config, () => {
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => {
          onReloadRef.current()
        }, debounce)
      })
    })

    channel.subscribe()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tablesKey, sessionId, enabled])
}