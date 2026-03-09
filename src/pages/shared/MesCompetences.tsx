import { useState } from 'react'
import { usePersonnage } from '../../hooks/usePersonnage'
import { usePersonnageCompetences } from '../../hooks/usePersonnageCompetences'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'

export default function MesCompetences() {
  const { personnage } = usePersonnage()
  const { competencesAcquises } = usePersonnageCompetences()

  const [recherche, setRecherche] = useState('')
  const [filtreType, setFiltreType] = useState('Tous')

  if (!personnage) return (
    <div className="flex items-center justify-center h-full font-bold"
      style={{ color: 'var(--text-secondary)' }}>
      Aucun personnage sélectionné.
    </div>
  )

  const competencesFiltrees = competencesAcquises
    .filter(c => filtreType === 'Tous' || c.competence.type === filtreType)
    .filter(c => c.competence.nom.toLowerCase().includes(recherche.toLowerCase()))

  return (
    <div className="flex flex-col h-full p-4 md:p-8 lg:p-10 overflow-y-auto custom-scrollbar"
      style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-6 gap-4"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <h2 className="text-3xl md:text-4xl font-black tracking-tight"
          style={{
            background: 'linear-gradient(135deg, var(--color-light), var(--color-accent2))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
          Mes Compétences
        </h2>
      </div>

      {/* Barre de recherche et Filtres */}
      <div className="flex flex-col gap-4 mb-8">
        <Input
          icon="🔍"
          type="text" placeholder="Rechercher une compétence..." value={recherche}
          onChange={e => setRecherche(e.target.value)}
          className="md:max-w-md"
        />
        <div className="flex gap-2 flex-wrap">
          {['Tous', 'Actif', 'Passif'].map(type => (
            <Button 
              key={type} 
              variant={filtreType === type ? 'active' : 'secondary'}
              onClick={() => setFiltreType(type)}
              className="text-xs"
              size="sm"
            >
              {type}
            </Button>
          ))}
        </div>
      </div>

      {competencesAcquises.length === 0 && (
        <div className="flex flex-col items-center justify-center mt-20 opacity-40">
          <span className="text-6xl mb-4">📖</span>
          <p className="text-lg font-bold" style={{ color: 'var(--text-secondary)' }}>Aucune compétence apprise.</p>
        </div>
      )}

      {competencesFiltrees.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
          {competencesFiltrees.map(liaison => (
            <Card key={liaison.id} className="flex flex-col group relative overflow-hidden h-full">
              {/* Effet lumineux type élémentaire en haut */}
              <div 
                className="absolute top-0 left-0 right-0 h-1" 
                style={{ backgroundColor: 'var(--color-main)', opacity: 0.5 }} 
              />
              
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-lg leading-tight pr-2" style={{ color: 'var(--text-primary)' }}>
                  {liaison.competence.nom}
                </h4>
              </div>
              <Badge variant="ghost" className="w-fit mb-3">{liaison.competence.type}</Badge>
              <p className="text-sm opacity-70 leading-relaxed flex-1">
                {liaison.competence.description || 'Aucune description.'}
              </p>
            </Card>
          ))}
        </div>
      )}
      
      {competencesAcquises.length > 0 && competencesFiltrees.length === 0 && (
        <p className="text-sm italic opacity-50 mb-10 text-center">Aucune compétence ne correspond à ta recherche.</p>
      )}

    </div>
  )
}
