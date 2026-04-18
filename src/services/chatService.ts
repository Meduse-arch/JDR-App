import { supabase } from '../supabase'

export type ChatCanal = {
  id: string
  id_session: string
  nom: string | null
  type: 'general' | 'groupe' | 'prive'
  created_at: string
  participants?: ChatParticipant[]
  dernierMessage?: ChatMessage | null
}

export type ChatParticipant = {
  id_canal: string
  id_compte: string
  pseudo?: string
}

export type ChatMessage = {
  id: string
  id_canal: string
  id_session: string
  id_compte: string
  nom_affiche: string
  contenu: string | null
  image_url: string | null
  created_at: string
}

export const chatService = {

  // ── Canaux ──────────────────────────────────────────────────────────────────

  async getCanaux(sessionId: string, compteId: string, isMJ: boolean): Promise<ChatCanal[]> {
    const { data: canaux } = await supabase
      .from('chat_canaux')
      .select('*')
      .eq('id_session', sessionId)
      .order('created_at', { ascending: true })

    if (!canaux) return []

    // Join avec comptes pour récupérer les pseudos des participants
    const { data: participations } = await supabase
      .from('chat_participants')
      .select('id_canal, id_compte, comptes(pseudo)')
      .in('id_canal', canaux.map(c => c.id))

    const visibles = canaux.filter(canal => {
      if (canal.type === 'general') return true
      if (isMJ) return true
      return participations?.some(p => p.id_canal === canal.id && p.id_compte === compteId)
    })

    return visibles.map(canal => ({
      ...canal,
      participants: (participations?.filter(p => p.id_canal === canal.id) || []).map((p: any) => ({
        id_canal: p.id_canal,
        id_compte: p.id_compte,
        pseudo: p.comptes?.pseudo ?? undefined,
      }))
    }))
  },

  /**
   * Crée le canal général UNIQUEMENT s'il n'existe pas déjà.
   * À appeler UNE SEULE FOIS à l'init.
   */
  async creerCanalGeneral(sessionId: string): Promise<ChatCanal | null> {
    const { data: existing } = await supabase
      .from('chat_canaux')
      .select('*')
      .eq('id_session', sessionId)
      .eq('type', 'general')
      .maybeSingle()

    if (existing) return existing

    const { data, error } = await supabase
      .from('chat_canaux')
      .insert({ id_session: sessionId, nom: 'Général', type: 'general' })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        const { data: fallback } = await supabase
          .from('chat_canaux')
          .select('*')
          .eq('id_session', sessionId)
          .eq('type', 'general')
          .maybeSingle()
        return fallback ?? null
      }
      console.error('Erreur création canal général:', error)
      return null
    }

    return data
  },

  async creerCanalPrive(sessionId: string, compteIds: string[], nom?: string): Promise<ChatCanal | null> {
    const type = compteIds.length === 2 && !nom ? 'prive' : 'groupe'

    const { data: canal, error } = await supabase
      .from('chat_canaux')
      .insert({ id_session: sessionId, nom: nom || null, type })
      .select()
      .single()

    if (error) { console.error('Erreur création canal:', error); return null }

    await supabase.from('chat_participants').insert(
      compteIds.map(id => ({ id_canal: canal.id, id_compte: id }))
    )

    return canal
  },

  /**
   * Met à jour les participants d'un canal (MJ/admin seulement ou créateur ? Ici MJ/admin pour simplifier)
   */
  async majParticipants(canalId: string, compteIds: string[]): Promise<boolean> {
    // 1. Supprimer tous les anciens participants
    const { error: delError } = await supabase
      .from('chat_participants')
      .delete()
      .eq('id_canal', canalId)

    if (delError) { console.error('Erreur purge participants:', delError); return false }

    // 2. Insérer les nouveaux
    const { error: insError } = await supabase
      .from('chat_participants')
      .insert(compteIds.map(id => ({ id_canal: canalId, id_compte: id })))

    if (insError) { console.error('Erreur insertion participants:', insError); return false }

    return true
  },

  /**
   * Renommer un canal (MJ/admin seulement).
   * On ne peut pas renommer un canal 'general'.
   */
  async renommerCanal(canalId: string, nouveauNom: string): Promise<boolean> {
    const { error } = await supabase
      .from('chat_canaux')
      .update({ nom: nouveauNom.trim() || null })
      .eq('id', canalId)

    if (error) { console.error('Erreur renommage canal:', error); return false }
    return true
  },

  /**
   * Suppression en cascade : messages → participants → canal
   */
  async supprimerCanal(canalId: string): Promise<boolean> {
    const { error: errMsg } = await supabase
      .from('messages')
      .delete()
      .eq('id_canal', canalId)
    if (errMsg) { console.error('Erreur suppression messages:', errMsg); return false }

    const { error: errPart } = await supabase
      .from('chat_participants')
      .delete()
      .eq('id_canal', canalId)
    if (errPart) { console.error('Erreur suppression participants:', errPart); return false }

    const { error: errCanal } = await supabase
      .from('chat_canaux')
      .delete()
      .eq('id', canalId)
    if (errCanal) { console.error('Erreur suppression canal:', errCanal); return false }

    return true
  },

  // ── Messages ────────────────────────────────────────────────────────────────

  async getMessages(canalId: string, limit = 50): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('id_canal', canalId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) { console.error('Erreur chargement messages:', error); return [] }
    return (data || []).reverse()
  },

  async envoyerMessage(msg: {
    id_canal: string
    id_session: string
    id_compte: string
    nom_affiche: string
    contenu?: string
    image_url?: string
  }): Promise<ChatMessage | null> {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        id_canal: msg.id_canal,
        id_session: msg.id_session,
        id_compte: msg.id_compte,
        nom_affiche: msg.nom_affiche,
        contenu: msg.contenu || null,
        image_url: msg.image_url || null,
      })
      .select()
      .single()

    if (error) { console.error('Erreur envoi message:', error); return null }
    return data
  },

  // ── Participants ─────────────────────────────────────────────────────────────

  /**
   * Met à jour les participants d'un canal (ajoute/retire).
   * Conserve toujours le compte courant (owner).
   */
  async mettreAJourParticipants(canalId: string, ancienIds: string[], nouveauxIds: string[]): Promise<boolean> {
    const aAjouter = nouveauxIds.filter(id => !ancienIds.includes(id))
    const aRetirer = ancienIds.filter(id => !nouveauxIds.includes(id))

    if (aRetirer.length > 0) {
      const { error } = await supabase
        .from('chat_participants')
        .delete()
        .eq('id_canal', canalId)
        .in('id_compte', aRetirer)
      if (error) { console.error('Erreur retrait participants:', error); return false }
    }

    if (aAjouter.length > 0) {
      const { error } = await supabase
        .from('chat_participants')
        .insert(aAjouter.map(id => ({ id_canal: canalId, id_compte: id })))
      if (error) { console.error('Erreur ajout participants:', error); return false }
    }

    return true
  },

  // ── Membres disponibles ──────────────────────────────────────────────────────

  async getMembresSession(sessionId: string): Promise<{ id: string; pseudo: string; role: string }[]> {
    const { data: mjs } = await supabase
      .from('session_mj')
      .select('comptes(id, pseudo, role)')
      .eq('id_session', sessionId)

    const { data: persos } = await supabase
      .from('personnages')
      .select('lie_au_compte, comptes:lie_au_compte(id, pseudo, role)')
      .eq('id_session', sessionId)
      .eq('type', 'Joueur')
      .eq('is_template', false)
      .not('lie_au_compte', 'is', null)

    const membres: { id: string; pseudo: string; role: string }[] = []
    const vus = new Set<string>()

    mjs?.forEach((m: any) => {
      const c = m.comptes
      if (c && !vus.has(c.id)) { membres.push({ id: c.id, pseudo: c.pseudo, role: c.role }); vus.add(c.id) }
    })

    persos?.forEach((p: any) => {
      const c = p.comptes
      if (c && !vus.has(c.id)) { membres.push({ id: c.id, pseudo: c.pseudo, role: c.role }); vus.add(c.id) }
    })

    return membres
  }
}