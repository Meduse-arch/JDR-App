import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../Store/useStore'
import CreerPersonnage from './CreerPersonnage'
import { usePersonnage } from '../../hooks/usePersonnage'
import { useStats } from '../../hooks/useStats'
import { BarreRessource } from '../../components/BarreRessource'
import { personnageService } from '../../services/personnageService'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { ConfirmButton } from '../../components/ui/ConfirmButton'
import { useResourceManagement, type RessourceKey } from '../../hooks/useResourceManagement'
import { CONFIG_RESSOURCES } from '../../utils/constants'

export default function MonPersonnage() {
  const compte         = useStore(s => s.compte)
  const pnjControle    = useStore(s => s.pnjControle)
  const setPnjControle = useStore(s => s.setPnjControle)

  const { personnage, chargement: chargementPerso, rechargerPersonnage, mettreAJourLocalement } = usePersonnage()
  const { stats, chargement: chargementStats } = useStats()
  
  const { deltas, updateDelta, adjustDelta, appliquerDelta } = useResourceManagement(personnage, mettreAJourLocalement)

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

  // On retire le blocage visuel du chargement

  if (!personnage && compte?.role === 'joueur')
    return <CreerPersonnage type="Joueur" retour={() => rechargerPersonnage()} />
  if (!personnage && compte?.role === 'admin')
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6 gap-4"
        style={{ color: 'var(--text-secondary)' }}>
        <span className="text-4xl">🎭</span>
        <p className="font-bold">Prends le contrôle d'un personnage depuis le menu MJ</p>
      </div>
    )
  if (!personnage) return null

  const ressources = (Object.keys(CONFIG_RESSOURCES) as RessourceKey[]).map(key => ({
    ...CONFIG_RESSOURCES[key],
    actuel: personnage[`${key}_actuel` as keyof typeof personnage] as number,
    max: personnage[`${key}_max` as keyof typeof personnage] as number,
    rKey: key
  }))

  return (
    <div className="flex flex-col h-full p-4 sm:p-6 md:p-8 lg:p-10 overflow-y-auto custom-scrollbar"
      style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6 pb-5"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight"
            style={{
              background: 'linear-gradient(135deg, var(--color-light), var(--color-accent2))',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
            {personnage.nom} {personnage.is_template && '(MODÈLE)'}
          </h2>
          <Badge 
            variant={personnage.type === 'Joueur' ? 'default' : 'warning'} 
            className="mt-2"
          >
            {personnage.type === 'Joueur' ? `Joué par : ${pseudoJoueur ?? '...'}` : personnage.type}
          </Badge>
        </div>
        <ConfirmButton
          variant="danger"
          onConfirm={handleSupprimerPersonnage}
          className="ml-auto sm:ml-0"
        >
          Supprimer
        </ConfirmButton>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {ressources.map(r => (
          <BarreRessource
            key={r.rKey}
            label={r.label}
            color={r.color}
            icon={r.icon}
            emoji={r.emoji}
            glow={r.glow}
            gradient={r.gradient}
            actuel={r.actuel}
            max={r.max}
            delta={deltas[r.rKey]}
            onDeltaChange={v => updateDelta(r.rKey, v)}
            onDeltaDecrement={() => adjustDelta(r.rKey, -1)}
            onDeltaIncrement={() => adjustDelta(r.rKey, 1)}
            onAppliquer={() => appliquerDelta(r.rKey)}
          />
        ))}
      </div>

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
            className="flex-col justify-center items-center gap-1 p-5 text-center cursor-default group"
          >
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest opacity-60">
              {stat.nom}
            </span>
            <div className="flex items-center gap-1">
              <span className="text-3xl sm:text-4xl font-black transition-transform group-hover:scale-110"
                style={{
                  background: 'linear-gradient(180deg, var(--text-primary), var(--color-main))',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}>
                {stat.valeur}
              </span>
              {stat.bonus > 0 && (
                <span className="text-xs font-black text-main animate-pulse">
                  +{stat.bonus}
                </span>
              )}
            </div>
            {stat.bonus > 0 && (
              <span className="text-[8px] font-bold opacity-30 uppercase tracking-tighter">
                Base: {stat.base}
              </span>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
