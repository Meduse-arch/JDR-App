import { useEffect, useState } from 'react'
import { supabase } from '../../../supabase'
import { useCompetences } from '../../../hooks/useCompetences'
import { competenceService } from '../../../services/competenceService'
import { Personnage, PersonnageCompetence } from '../../../types'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'
import { Input } from '../../../components/ui/Input'

type Props = { personnage: Personnage }

export default function GererCompetences({ personnage }: Props) {
  const { competences: toutesCompetences } = useCompetences()

  const [competencesAcquises, setCompetencesAcquises] = useState<PersonnageCompetence[]>([])
  const [onglet,            setOnglet]            = useState<'liste' | 'ajouter'>('liste')
  const [compSelectionnee,  setCompSelectionnee]  = useState('')
  const [recherche,         setRecherche]         = useState('')
  const [rechercheAjout,    setRechercheAjout]    = useState('')
  const [message,           setMessage]           = useState('')

  useEffect(() => {
    chargerCompetences()
  }, [personnage])

  const chargerCompetences = async () => {
    // Étape 1: Récupérer les liaisons
    const { data: liaisons } = await supabase
      .from('personnage_competences')
      .select('*')
      .eq('id_personnage', personnage.id)

    if (liaisons && liaisons.length > 0) {
      // Étape 2: Récupérer les données des compétences
      const idsCompetences = liaisons.map(l => l.id_competences || l.id_competence || l.competence_id)
      const { data: competencesData } = await supabase
        .from('competences')
        .select('*')
        .in('id', idsCompetences)

      if (competencesData) {
        const formated = liaisons.map(liaison => {
          const l_id = liaison.id_competences || liaison.id_competence || liaison.competence_id;
          const compInfo = competencesData.find(c => c.id === l_id)
          if (!compInfo) return null
          return {
            id: liaison.id,
            id_personnage: liaison.id_personnage,
            id_competence: l_id,
            competence: compInfo
          }
        }).filter(item => item !== null)
        
        setCompetencesAcquises(formated as PersonnageCompetence[])
      }
    } else {
      setCompetencesAcquises([])
    }
  }

  const afficherMessage = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(''), 2500) }

  const ajouterCompetence = async () => {
    if (!compSelectionnee) return
    const success = await competenceService.apprendreCompetence(personnage.id, compSelectionnee)
    if (success) {
      afficherMessage('✅ Compétence apprise !')
      setCompSelectionnee('')
      chargerCompetences()
    }
  }

  const oublierCompetence = async (idPersonnage: string, idCompetence: string) => {
    const success = await competenceService.oublierCompetence(idPersonnage, idCompetence)
    if (success) chargerCompetences()
  }

  const competencesFiltrees = competencesAcquises
    .filter(c => c.competence.nom.toLowerCase().includes(recherche.toLowerCase()))
  
  // Compétences disponibles (non acquises)
  const competencesDisponibles = toutesCompetences
    .filter(tc => !competencesAcquises.some(ca => ca.competence.id === tc.id))
    .filter(tc => tc.nom.toLowerCase().includes(rechercheAjout.toLowerCase()))

  return (
    <div className="flex flex-col gap-5" style={{ color: 'var(--text-primary)' }}>
      {/* Onglets */}
      <div className="flex gap-2 items-center flex-wrap">
        <Button 
          variant={onglet === 'liste' ? 'active' : 'secondary'} 
          onClick={() => setOnglet('liste')}
        >
          📖 Compétences
        </Button>
        <Button 
          variant={onglet === 'ajouter' ? 'active' : 'secondary'} 
          onClick={() => setOnglet('ajouter')}
        >
          ➕ Ajouter
        </Button>
        {message && <span className="ml-auto text-sm font-bold" style={{ color: '#4ade80' }}>{message}</span>}
      </div>

      {/* Compétences acquises */}
      {onglet === 'liste' && (
        <div className="flex flex-col gap-4">
          <Input 
            icon="🔍"
            type="text" placeholder="Rechercher..." value={recherche}
            onChange={e => setRecherche(e.target.value)}
          />

          {competencesAcquises.length === 0 && (
            <p className="text-sm text-center mt-4" style={{ color: 'var(--text-muted)' }}>
              Aucune compétence possédée.
            </p>
          )}

          <div className="grid grid-cols-1 gap-3">
            {competencesFiltrees.map(liaison => (
              <Card key={liaison.id} className="flex-row justify-between items-start p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-bold truncate text-base">{liaison.competence.nom}</p>
                    <Badge variant="ghost">{liaison.competence.type}</Badge>
                  </div>
                  <p className="text-xs opacity-70 line-clamp-2">{liaison.competence.description}</p>
                </div>
                <div className="flex flex-col gap-2 shrink-0 ml-3">
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    onClick={() => oublierCompetence(liaison.id_personnage, liaison.id_competence)}
                  >
                    Retirer
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Ajouter nouvelle compétence */}
      {onglet === 'ajouter' && (
        <div className="flex flex-col gap-4">
          <Input 
            icon="🔍"
            type="text" placeholder="Rechercher une compétence..." value={rechercheAjout}
            onChange={e => setRechercheAjout(e.target.value)}
          />

          {competencesDisponibles.length === 0 && (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Aucune compétence disponible. Soit le personnage les possède toutes, soit il n'y en a pas dans la bibliothèque.
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto custom-scrollbar pr-2">
            {competencesDisponibles.map(comp => (
              <button key={comp.id} onClick={() => setCompSelectionnee(comp.id)}
                className="p-3 rounded-2xl text-left transition-all border outline-none"
                style={{
                  backgroundColor: compSelectionnee === comp.id
                    ? 'color-mix(in srgb, var(--color-main) 15%, var(--bg-card))'
                    : 'var(--bg-card)',
                  borderColor: compSelectionnee === comp.id ? 'var(--color-main)' : 'var(--border)',
                  transform: compSelectionnee === comp.id ? 'scale(0.98)' : 'scale(1)',
                }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-sm truncate">{comp.nom}</span>
                </div>
                <Badge variant="ghost" className="mb-2">{comp.type}</Badge>
                <p className="text-[10px] opacity-60 line-clamp-2">{comp.description}</p>
              </button>
            ))}
          </div>

          {compSelectionnee && (
            <Card className="flex-row items-center justify-between gap-3 flex-wrap mt-2">
              <span className="text-sm font-bold opacity-70">
                Donner cette compétence ?
              </span>
              <Button className="flex-1 sm:flex-none" onClick={ajouterCompetence}>
                Ajouter aux compétences
              </Button>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
