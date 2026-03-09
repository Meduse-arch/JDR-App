import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'
import CreerPersonnage from './CreerPersonnage'
import { usePersonnage } from '../../hooks/usePersonnage'
import { useStats } from '../../hooks/useStats'
import { BarreRessource, RessourceKey } from '../../components/BarreRessource'
import { personnageService } from '../../services/personnageService'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { ConfirmButton } from '../../components/ui/ConfirmButton'

export default function MonPersonnage() {
  const compte         = useStore(s => s.compte)
  const pnjControle    = useStore(s => s.pnjControle)
  const setPnjControle = useStore(s => s.setPnjControle)

  const { personnage, chargement: chargementPerso, rechargerPersonnage, mettreAJourLocalement } = usePersonnage()
  const { stats, chargement: chargementStats } = useStats()

  const [deltas, setDeltas]             = useState<Record<RessourceKey, string>>({ hp: '', mana: '', stam: '' })
  const [pseudoJoueur, setPseudoJoueur] = useState<string | null>(null)

  useEffect(() => {
    if (personnage?.lie_au_compte) {
      supabase.from('comptes').select('pseudo').eq('id', personnage.lie_au_compte).single()
        .then(({ data }) => { if (data) setPseudoJoueur(data.pseudo) })
    }
  }, [personnage?.lie_au_compte])

  const handleSupprimerPersonnage = async () => {
    if (!personnage) return
    const success = await personnageService.deletePersonnage(personnage.id)
    if (success) {
      if (pnjControle) setPnjControle(null)
      rechargerPersonnage()
    }
  }

  const appliquerDelta = async (key: RessourceKey) => {
    if (!personnage) return
    const delta = parseInt(deltas[key])
    if (isNaN(delta) || delta === 0) return

    const champActuel = `${key}_actuel` as keyof typeof personnage
    const champMax    = `${key}_max`    as keyof typeof personnage
    const actuel = personnage[champActuel] as number
    const max    = personnage[champMax]    as number
    const nouveau = Math.max(0, Math.min(max, actuel + delta))

    await mettreAJourLocalement({ [champActuel]: nouveau } as any)

    if (pnjControle && pnjControle.id === personnage.id)
      setPnjControle({ ...pnjControle, [champActuel]: nouveau } as any)

    setDeltas(prev => ({ ...prev, [key]: '' }))
  }

  if ((chargementPerso || chargementStats) && !personnage) return (
    <div className="flex items-center justify-center h-full animate-pulse font-bold"
      style={{ color: 'var(--text-muted)' }}>
      Ouverture du grimoire...
    </div>
  )
  if (!personnage && compte?.role === 'joueur')
    return <CreerPersonnage estPnj={false} retour={() => rechargerPersonnage()} />
  if (!personnage && compte?.role === 'admin')
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6 gap-4"
        style={{ color: 'var(--text-secondary)' }}>
        <span className="text-4xl">🎭</span>
        <p className="font-bold">Prends le contrôle d'un PNJ depuis le Bestiaire</p>
      </div>
    )
  if (!personnage) return null

  const ressources = [
    { label: 'Points de vie', emoji: '❤️', actuel: personnage.hp_actuel,   max: personnage.hp_max,   rKey: 'hp'   as RessourceKey, color: '#ef4444', glow: 'rgba(239,68,68,0.2)',   gradient: 'linear-gradient(90deg,#dc2626,#ef4444)' },
    { label: 'Mana',          emoji: '💧', actuel: personnage.mana_actuel, max: personnage.mana_max, rKey: 'mana' as RessourceKey, color: '#3b82f6', glow: 'rgba(59,130,246,0.2)',  gradient: 'linear-gradient(90deg,#2563eb,#3b82f6)' },
    { label: 'Stamina',       emoji: '⚡', actuel: personnage.stam_actuel, max: personnage.stam_max, rKey: 'stam' as RessourceKey, color: '#eab308', glow: 'rgba(234,179,8,0.2)',   gradient: 'linear-gradient(90deg,#ca8a04,#eab308)' },
  ]

  return (
    <div className="flex flex-col h-full p-4 sm:p-6 md:p-8 lg:p-10 overflow-y-auto custom-scrollbar"
      style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6 pb-5"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight"
            style={{
              background: 'linear-gradient(135deg, var(--color-light), var(--color-accent2))',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
            {personnage.nom}
          </h2>
          {pnjControle && (
            <Badge 
              variant={personnage.est_pnj ? 'warning' : 'default'} 
              className="mt-2"
            >
              {personnage.est_pnj ? 'Personnage Non Joueur' : `Joué par : ${pseudoJoueur ?? '...'}`}
            </Badge>
          )}
        </div>
        <ConfirmButton
          variant="danger"
          onConfirm={handleSupprimerPersonnage}
          className="ml-auto sm:ml-0"
        >
          Supprimer la fiche
        </ConfirmButton>
      </div>

      {/* Barres de ressources */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {ressources.map(r => (
          <BarreRessource
            key={r.rKey}
            {...r}
            delta={deltas[r.rKey]}
            onDeltaChange={v => setDeltas(prev => ({ ...prev, [r.rKey]: v }))}
            onDeltaDecrement={() => setDeltas(prev => ({ ...prev, [r.rKey]: String((parseInt(prev[r.rKey]) || 0) - 1) }))}
            onDeltaIncrement={() => setDeltas(prev => ({ ...prev, [r.rKey]: String((parseInt(prev[r.rKey]) || 0) + 1) }))}
            onAppliquer={() => appliquerDelta(r.rKey)}
          />
        ))}
      </div>

      {/* Statistiques */}
      <h3 className="text-lg font-bold mb-4 flex items-center gap-3"
        style={{ color: 'var(--text-primary)' }}>
        <span className="p-2 rounded-xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          🛡️
        </span>
        Attributs & Statistiques
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pb-8">
        {stats.map(stat => (
          <Card 
            key={stat.nom}
            hoverEffect
            className="flex-col justify-center items-center gap-2 p-5 text-center cursor-default group"
          >
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest opacity-60">
              {stat.nom}
            </span>
            <span className="text-3xl sm:text-4xl font-black transition-transform group-hover:scale-110"
              style={{
                background: 'linear-gradient(180deg, var(--text-primary), var(--color-main))',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
              {stat.valeur}
            </span>
          </Card>
        ))}
      </div>
    </div>
  )
}
