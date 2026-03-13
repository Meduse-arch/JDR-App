import { useEffect, useState } from 'react'
import { supabase } from '../../../supabase'
import { useStore } from '../../../store/useStore'
import { useCompetences } from '../../../hooks/useCompetences'
import { competenceService } from '../../../services/competenceService'
import { Personnage, PersonnageCompetence } from '../../../types'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'
import { Input } from '../../../components/ui/Input'

type Props = { personnage: Personnage }

export default function GererCompetences({ personnage }: Props) {
  const sessionActive = useStore(s => s.sessionActive)
  const { competences: toutesCompetences } = useCompetences()

  console.log('GererCompetences: personnage=', personnage?.nom, 'sessionActive=', sessionActive?.id);
  console.log('GererCompetences: toutesCompetences count=', toutesCompetences?.length);

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
    if (!personnage?.id) return;
    
    const { data: liaisons, error } = await supabase
      .from('personnage_competences')
      .select('id, id_personnage, id_competence, niveau, competences(*, modificateurs(*, stats:id_stat(nom), elements(*)), effets_actifs(*))')
      .eq('id_personnage', personnage.id)

    if (error) {
      console.error("Erreur chargement compétences personnage:", error);
      return;
    }

    if (liaisons) {
      console.log('Raw liaisons data:', liaisons);
      const formated = (liaisons as any[]).map(l => {
        // Supabase peut renvoyer soit un objet, soit un tableau à un seul élément pour la jointure
        const compData = Array.isArray(l.competences) ? l.competences[0] : l.competences;
        return {
          id: l.id,
          id_personnage: l.id_personnage,
          id_competence: l.id_competence,
          niveau: l.niveau,
          competence: compData
        };
      });
      setCompetencesAcquises(formated.filter(f => !!f.competence) as PersonnageCompetence[]);
    } else {
      setCompetencesAcquises([]);
    }
  }

  const afficherMessage = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(''), 2500) }

  const ajouterCompetence = async () => {
    if (!compSelectionnee) return
    const success = await competenceService.apprendreCompetence(personnage.id, compSelectionnee)
    if (success) {
      afficherMessage('✅ Compétence apprise !')
      setCompSelectionnee('')
      await chargerCompetences()
    }
  }

  const [filtrePrincipal, setFiltrePrincipal] = useState('Tous')
  const [filtreSecondaire, setFiltreSecondaire] = useState('Tous')

  const oublierCompetence = async (idPersonnage: string, idCompetence: string) => {
    const success = await competenceService.oublierCompetence(idPersonnage, idCompetence)
    if (success) await chargerCompetences()
  }

  const competencesFiltrees = competencesAcquises
    .filter(c => {
      if (!c.competence) return false;
      const type = c.competence.type;
      if (filtrePrincipal === 'Tous') return true;
      if (filtrePrincipal === 'Actif') return type === 'active';
      if (filtrePrincipal === 'Passif') {
        if (filtreSecondaire === 'Tous') return type === 'passive_auto' || type === 'passive_toggle';
        if (filtreSecondaire === 'Auto') return type === 'passive_auto';
        if (filtreSecondaire === 'Toggle') return type === 'passive_toggle';
      }
      return true;
    })
    .filter(c => (c.competence?.nom || '').toLowerCase().includes(recherche.toLowerCase()))

  // Compétences disponibles (non acquises)
  const competencesDisponibles = (toutesCompetences || [])
    .filter(tc => !competencesAcquises.some(ca => ca.id_competence === tc.id))
    .filter(tc => (tc.nom || '').toLowerCase().includes(rechercheAjout.toLowerCase()))

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
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Input
                icon="🔍"
                type="text" placeholder="Rechercher..." value={recherche}
                onChange={e => setRecherche(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <div className="flex gap-2 p-1 rounded-xl overflow-x-auto custom-scrollbar" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                {['Tous', 'Actif', 'Passif'].map(type => (
                  <button
                    key={type} onClick={() => { setFiltrePrincipal(type); setFiltreSecondaire('Tous'); }}
                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap ${filtrePrincipal === type ? 'bg-main text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}
                    style={{ backgroundColor: filtrePrincipal === type ? 'var(--color-main)' : 'transparent' }}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {filtrePrincipal === 'Passif' && (
                <div className="flex gap-2 p-1 rounded-xl overflow-x-auto custom-scrollbar" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                  {['Tous', 'Auto', 'Toggle'].map(type => (
                    <button
                      key={type} onClick={() => setFiltreSecondaire(type)}
                      className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all whitespace-nowrap ${filtreSecondaire === type ? 'bg-main/20 text-main border border-main/30' : 'opacity-40 hover:opacity-100 border border-transparent'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
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
