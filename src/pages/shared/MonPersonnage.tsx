import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'
import CreerPersonnage from './CreerPersonnage'

type Personnage = {
  id: string
  nom: string
  est_pnj: boolean
  lie_au_compte: string | null
  hp_actuel: number
  hp_max: number
  mana_actuel: number
  mana_max: number
  stam_actuel: number
  stam_max: number
}

type StatJet = { nom: string; valeur: number; description: string }
type RessourceKey = 'hp' | 'mana' | 'stam'

export default function MonPersonnage() {
  const compte = useStore(s => s.compte)
  const sessionActive = useStore(s => s.sessionActive)
  const pnjControle = useStore(s => s.pnjControle)
  const setPnjControle = useStore(s => s.setPnjControle)
  const [personnage, setPersonnage] = useState<Personnage | null>(null)
  const [stats, setStats] = useState<StatJet[]>([])
  const [chargement, setChargement] = useState(true)
  const [deltas, setDeltas] = useState<Record<RessourceKey, string>>({ hp: '', mana: '', stam: '' })
  const [message, setMessage] = useState('')
  const [pseudoJoueur, setPseudoJoueur] = useState<string | null>(null)

  useEffect(() => {
    if (pnjControle) {
      setPersonnage(pnjControle as any)
      chargerStats(pnjControle.id)
      chargerPseudo((pnjControle as any).lie_au_compte)
      setChargement(false)
    } else if (compte?.role === 'joueur') {
      chargerPersonnage()
    } else {
      setChargement(false)
    }
  }, [pnjControle])

  const chargerPersonnage = async () => {
    setChargement(true)
    if (!sessionActive) { setChargement(false); return }
    const { data } = await supabase
      .from('session_joueurs')
      .select('personnages(*)')
      .eq('id_session', sessionActive.id)
    if (data) {
      const perso = data
        .map((d: any) => d.personnages)
        .find((p: any) => p.lie_au_compte === compte?.id && !p.est_pnj)
      if (perso) {
        setPersonnage(perso)
        chargerStats(perso.id)
        chargerPseudo(perso.lie_au_compte)
      }
    }
    setChargement(false)
  }

  const chargerStats = async (idPersonnage: string) => {
    // 1. Charger les stats de base
    const { data: baseStats } = await supabase
      .from('personnage_stats')
      .select('id_stat, valeur, stats(nom, description)')
      .eq('id_personnage', idPersonnage)

    if (!baseStats) return

    // 2. Charger les items équipés
    const { data: equipements } = await supabase
      .from('inventaire')
      .select('id_item')
      .eq('id_personnage', idPersonnage)
      .eq('equipe', true)

    const statBonus: Record<string, number> = {}

    if (equipements && equipements.length > 0) {
      const itemIds = equipements.map(e => e.id_item)
      // 3. Charger les modificateurs de type "stat" de ces items
      const { data: modifs } = await supabase
        .from('item_modificateurs')
        .select('*')
        .in('id_item', itemIds)
        .eq('type', 'stat')

      if (modifs) {
        modifs.forEach(mod => {
          if (mod.id_stat) {
            statBonus[mod.id_stat] = (statBonus[mod.id_stat] || 0) + mod.valeur
          }
        })
      }
    }

    // 4. Additionner la base et les bonus
    setStats(baseStats.map((d: any) => ({
      nom: d.stats.nom,
      description: d.stats.description,
      valeur: d.valeur + (statBonus[d.id_stat] || 0)
    })))
  }

  const chargerPseudo = async (lieAuCompte: string | null) => {
    if (!lieAuCompte) { setPseudoJoueur(null); return }
    const { data } = await supabase.from('comptes').select('pseudo').eq('id', lieAuCompte).single()
    if (data) setPseudoJoueur(data.pseudo)
  }

  const supprimerPersonnage = async () => {
    if (!personnage) return
    await supabase.from('session_joueurs').delete().eq('id_personnage', personnage.id)
    await supabase.from('personnage_stats').delete().eq('id_personnage', personnage.id)
    await supabase.from('inventaire').delete().eq('id_personnage', personnage.id)
    await supabase.from('personnage_competences').delete().eq('id_personnage', personnage.id)
    await supabase.from('personnages').delete().eq('id', personnage.id)
    if (pnjControle) setPnjControle(null)
    setPersonnage(null)
  }

  const appliquerDelta = async (key: RessourceKey) => {
    if (!personnage) return
    const valStr = deltas[key]
    const delta = parseInt(valStr)
    if (isNaN(delta) || delta === 0) return
    const champActuel = `${key}_actuel` as keyof Personnage
    const champMax = `${key}_max` as keyof Personnage
    const actuel = personnage[champActuel] as number
    const max = personnage[champMax] as number
    const nouveau = Math.max(0, Math.min(max, actuel + delta))
    await supabase.from('personnages').update({ [champActuel]: nouveau }).eq('id', personnage.id)
    const updated = { ...personnage, [champActuel]: nouveau }
    setPersonnage(updated)
    if (pnjControle) setPnjControle(updated as any)
    setDeltas(prev => ({ ...prev, [key]: '' }))
    setMessage(`✅ ${key === 'hp' ? 'PV' : key === 'mana' ? 'Mana' : 'Stamina'} mis à jour !`)
    setTimeout(() => setMessage(''), 2000)
  }

  const AfficherPersonnage = ({ p }: { p: Personnage }) => {
    const ressources: { label: string; emoji: string; actuel: number; max: number; couleur: string; barreColor: string; rKey: RessourceKey }[] = [
      { label: 'Points de vie', emoji: '❤️', actuel: p.hp_actuel, max: p.hp_max, couleur: 'text-red-400', barreColor: 'bg-red-500', rKey: 'hp' },
      { label: 'Mana', emoji: '💧', actuel: p.mana_actuel, max: p.mana_max, couleur: 'text-blue-400', barreColor: 'bg-blue-500', rKey: 'mana' },
      { label: 'Stamina', emoji: '⚡', actuel: p.stam_actuel, max: p.stam_max, couleur: 'text-yellow-400', barreColor: 'bg-yellow-500', rKey: 'stam' },
    ]

    return (
      <div className="flex flex-col h-full text-white p-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-purple-400">
            {p.nom}
            {pnjControle && (
              <span className={`text-sm ml-2 ${p.est_pnj ? 'text-yellow-400' : 'text-blue-400'}`}>
                {p.est_pnj ? 'PNJ' : pseudoJoueur ?? '...'}
              </span>
            )}
          </h2>
          <div className="flex items-center gap-3">
            {message && <span className="text-green-400 text-sm">{message}</span>}
            <button onClick={supprimerPersonnage} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm transition">
              💀 Supprimer
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {ressources.map(r => (
            <div key={r.rKey} className="bg-gray-800 p-4 rounded-xl flex flex-col gap-2">
              <span className="text-gray-400 text-xs">{r.emoji} {r.label}</span>
              <div className="flex items-end gap-1">
                <span className={`text-2xl font-bold ${r.couleur}`}>{r.actuel}</span>
                <span className="text-gray-500 text-sm mb-1">/ {r.max}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className={`${r.barreColor} h-2 rounded-full transition-all`} style={{ width: `${Math.min(100, (r.actuel / r.max) * 100)}%` }} />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={() => setDeltas(prev => ({ ...prev, [r.rKey]: String((parseInt(prev[r.rKey]) || 0) - 1) }))}
                  className="bg-gray-700 hover:bg-red-700 w-8 h-8 rounded-lg font-bold transition text-sm"
                >−</button>
                <input
                  type="number"
                  value={deltas[r.rKey]}
                  placeholder="±0"
                  onChange={e => setDeltas(prev => ({ ...prev, [r.rKey]: e.target.value }))}
                  className="flex-1 bg-gray-700 text-white text-center px-2 py-1 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-400"
                />
                <button
                  onClick={() => setDeltas(prev => ({ ...prev, [r.rKey]: String((parseInt(prev[r.rKey]) || 0) + 1) }))}
                  className="bg-gray-700 hover:bg-green-700 w-8 h-8 rounded-lg font-bold transition text-sm"
                >+</button>
                <button
                  onClick={() => appliquerDelta(r.rKey)}
                  disabled={!deltas[r.rKey] || deltas[r.rKey] === '0'}
                  className={`px-3 py-1 rounded-lg text-sm font-semibold transition
                    ${deltas[r.rKey] && deltas[r.rKey] !== '0' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
                >✓</button>
              </div>
            </div>
          ))}
        </div>

        <h3 className="text-lg font-semibold text-gray-300 mb-4">Stats</h3>
        <div className="grid grid-cols-2 gap-4">
          {stats.map(stat => (
            <div key={stat.nom} className="bg-gray-800 p-4 rounded-xl flex justify-between items-center">
              <div>
                <p className="font-semibold">{stat.nom}</p>
                <p className="text-gray-400 text-xs">{stat.description}</p>
              </div>
              <span className="text-2xl font-bold text-purple-400">{stat.valeur}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (chargement) return (
    <div className="flex items-center justify-center h-full text-gray-400">Chargement...</div>
  )

  if (pnjControle && personnage) return <AfficherPersonnage p={personnage} />

  if (!personnage && compte?.role === 'joueur') return (
    <CreerPersonnage estPnj={false} retour={() => chargerPersonnage()} />
  )

  if (!personnage && compte?.role === 'admin') return (
    <div className="flex items-center justify-center h-full text-gray-400">
      Prends le contrôle d'un PNJ depuis la page PNJ
    </div>
  )

  return <AfficherPersonnage p={personnage!} />
}