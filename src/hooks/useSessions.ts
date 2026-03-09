import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export type Session = { id: string; nom: string; description: string; date_creation: string; cree_par: string }

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [comptes, setComptes] = useState<Record<string, string>>({})
  const [chargement, setChargement] = useState(true)

  const chargerSessions = async () => {
    setChargement(true)
    const { data } = await supabase.from('sessions').select('*').order('date_creation', { ascending: false })
    
    if (data) {
      setSessions(data)
      const ids = [...new Set(data.map((s: Session) => s.cree_par))]
      if (ids.length > 0) {
        const { data: comptesData } = await supabase.from('comptes').select('id, pseudo').in('id', ids)
        if (comptesData) {
          const map: Record<string, string> = {}
          comptesData.forEach(c => { map[c.id] = c.pseudo })
          setComptes(map)
        }
      }
    }
    setChargement(false)
  }

  useEffect(() => { chargerSessions() }, [])

  return { sessions, comptes, chargement, rechargerSessions: chargerSessions }
}