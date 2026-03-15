import { useEffect, useState } from 'react'
import { supabase } from '../../../supabase'
import { useCompetences } from '../../../hooks/useCompetences'
import { competenceService } from '../../../services/competenceService'
import { Personnage, PersonnageCompetence } from '../../../types'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'
import { ConfirmationBar } from '../../../components/ui/ConfirmationBar'

type Props = { personnage: Personnage }

export default function GererCompetences({ personnage }: Props) {
  const { competences: toutesCompetences } = useCompetences()

  const [competencesAcquises, setCompetencesAcquises] = useState<PersonnageCompetence[]>([])
  const [onglet,            setOnglet]            = useState<'liste' | 'ajouter'>('liste')
  const [selection,         setSelection]         = useState<string[]>([])
  const [recherche,         setRecherche]         = useState('')
  const [rechercheAjout,    setRechercheAjout]    = useState('')
  const [message,           setMessage]           = useState('')
  const [chargement,        setChargement]        = useState(false)

  const [filtrePrincipal, setFiltrePrincipal] = useState('Tous')
  const [filtreSecondaire, setFiltreSecondaire] = useState('Tous')

  useEffect(() => {
    chargerCompetences()
    setSelection([])
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
      const formated = (liaisons as any[]).map(l => {
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

  const afficherMessage = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(''), 3000) }

  const toggleSelection = (id: string) => {
    setSelection(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const attribuerSelection = async () => {
    if (selection.length === 0) return
    setChargement(true)
    try {
      let succesCount = 0
      for (const idComp of selection) {
        const ok = await competenceService.apprendreCompetence(personnage.id, idComp)
        if (ok) succesCount++
      }
      afficherMessage(`✅ ${succesCount} compétence(s) attribuée(s) !`)
      setSelection([])
      setOnglet('liste')
      await chargerCompetences()
    } catch (e) {
      console.error(e)
    } finally {
      setChargement(false)
    }
  }

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

  const competencesDisponibles = (toutesCompetences || [])
    .filter(tc => !competencesAcquises.some(ca => ca.id_competence === tc.id))
    .filter(tc => (tc.nom || '').toLowerCase().includes(rechercheAjout.toLowerCase()))

  return (
    <div className="flex flex-col gap-6" style={{ color: 'var(--text-primary)' }}>
      {/* Header Onglets */}
      <div className="flex justify-between items-center bg-black/20 p-1.5 rounded-2xl border border-white/5">
        <div className="flex gap-1 flex-1">
          <button 
            onClick={() => setOnglet('liste')}
            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${onglet === 'liste' ? 'bg-white/10 shadow-lg text-main' : 'opacity-40 hover:opacity-100'}`}
          >
            📖 Possédées ({competencesAcquises.length})
          </button>
          <button 
            onClick={() => setOnglet('ajouter')}
            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${onglet === 'ajouter' ? 'bg-white/10 shadow-lg text-main' : 'opacity-40 hover:opacity-100'}`}
          >
            ➕ Bibliothèque
          </button>
        </div>
        {message && <span className="px-4 text-xs font-bold text-green-400 animate-pulse">{message}</span>}
      </div>

      {/* Vue Liste */}
      {onglet === 'liste' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40">🔍</span>
              <input 
                type="text" placeholder="Filtrer les acquis..." value={recherche} onChange={e => setRecherche(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl outline-none transition-all font-bold text-sm bg-surface border border-border"
              />
            </div>
            <div className="flex gap-1 p-1 rounded-xl bg-surface border border-border">
              {['Tous', 'Actif', 'Passif'].map(t => (
                <button key={t} onClick={() => { setFiltrePrincipal(t); setFiltreSecondaire('Tous'); }} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${filtrePrincipal === t ? 'bg-main text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`} style={{ backgroundColor: filtrePrincipal === t ? 'var(--color-main)' : 'transparent' }}>{t}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {competencesFiltrees.map(liaison => (
              <Card key={liaison.id} className="flex-row justify-between items-center p-4 bg-black/20 border-white/5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold truncate text-sm text-white uppercase">{liaison.competence.nom}</p>
                    <Badge variant="ghost" className="text-[8px]">{liaison.competence.type}</Badge>
                  </div>
                  <p className="text-[10px] opacity-50 line-clamp-1 italic">"{liaison.competence.description}"</p>
                </div>
                <button 
                  onClick={() => oublierCompetence(liaison.id_personnage, liaison.id_competence)}
                  className="ml-4 p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all text-xs"
                  title="Retirer la compétence"
                >
                  ✕
                </button>
              </Card>
            ))}
            {competencesFiltrees.length === 0 && (
              <div className="col-span-full py-10 text-center opacity-20 font-black uppercase text-xs italic">Aucune compétence trouvée</div>
            )}
          </div>
        </div>
      )}

      {/* Vue Ajouter (Sélection Multiple) */}
      {onglet === 'ajouter' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40">🔍</span>
              <input 
                type="text" placeholder="Rechercher dans la bibliothèque..." value={rechercheAjout} onChange={e => setRechercheAjout(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl outline-none transition-all font-bold text-sm bg-surface border border-border"
              />
            </div>
            {selection.length > 0 && (
              <div className="flex gap-2 animate-in zoom-in duration-300">
                <Button variant="secondary" size="sm" onClick={() => setSelection([])}>Vider</Button>
                <Badge variant="default" className="bg-main text-white px-4">{selection.length} sélectionnée(s)</Badge>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-24">
            {competencesDisponibles.map(comp => {
              const isSelected = selection.includes(comp.id)
              return (
                <div 
                  key={comp.id} 
                  onClick={() => toggleSelection(comp.id)}
                  className={`cursor-pointer transition-all duration-300 relative ${isSelected ? 'scale-[0.98]' : 'hover:scale-[1.02]'}`}
                >
                  <div className={`absolute inset-0 rounded-[2rem] z-0 transition-all duration-500 ${isSelected ? 'bg-main/20 blur-xl opacity-100' : 'opacity-0'}`} />
                  <Card 
                    hoverEffect={!isSelected}
                    className={`h-full relative z-10 border-2 transition-all duration-300 ${isSelected ? 'border-main bg-main/5' : 'border-white/5 bg-black/20'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className={`font-black text-sm uppercase truncate ${isSelected ? 'text-main' : 'text-white'}`}>{comp.nom}</h4>
                      {isSelected && <span className="text-main font-bold">✓</span>}
                    </div>
                    <Badge variant="ghost" className="text-[8px] mb-2 uppercase opacity-60">{comp.type}</Badge>
                    <p className="text-[10px] opacity-40 line-clamp-2 italic">"{comp.description}"</p>
                  </Card>
                </div>
              )
            })}
          </div>

          {selection.length > 0 && (
            <ConfirmationBar 
              label={`${selection.length} sélectionnée(s)`}
              onConfirm={attribuerSelection}
              onCancel={() => setSelection([])}
              confirmText={`Attribuer ${selection.length} compétence(s)`}
              loading={chargement}
            />
          )}
        </div>
      )}
    </div>
  )
}
