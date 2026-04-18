import { supabase } from '../supabase'
import { LogActivite } from '../types'

export const logService = {
  async logAction(entry: Omit<LogActivite, 'id' | 'created_at'>) {
    await supabase.from('logs_activite').insert(entry)
  },
  async getLogs(sessionId: string, personnageId?: string) {
    let query = supabase
      .from('logs_activite')
      .select('*')
      .eq('id_session', sessionId)
      .order('created_at', { ascending: false })
      .limit(200)
    if (personnageId) query = query.eq('id_personnage', personnageId)
    const { data } = await query
    return data || []
  }
}