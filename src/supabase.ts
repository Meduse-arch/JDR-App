import { createClient } from '@supabase/supabase-js'

// ARCHITECTURE — Rôle de Supabase dans Sigil (post-migration Session 5)
// ✅ Utilisé pour : authentification et gestion des comptes (authService)
// ❌ Ne plus utiliser pour : Realtime, broadcast, lecture/écriture de données de jeu
// Les données de jeu sont dans SQLite (PC du MJ) et synchronisées via WebRTC/PeerJS

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)
