import { useState } from 'react'
import { usePersonnage } from '../../hooks/usePersonnage'
import { usePersonnageCompetences } from '../../hooks/usePersonnageCompetences'
import { useItems } from '../../hooks/useItems'
import { useStats } from '../../hooks/useStats'
import { useCompetenceUsage } from '../../hooks/useCompetenceUsage'
import { CompetenceCard } from '../../components/competences/CompetenceCard'
import { CompetenceDetailModal } from '../../components/competences/CompetenceDetailModal'
import { filtrerCompetences } from '../../utils/competenceUtils'

export default function MesCompetences() {
  const { personnage, mettreAJourLocalement } = usePersonnage()
  const { competencesAcquises, chargerCompetencesAcquises } = usePersonnageCompetences()
  const { utiliserCompetence, toggleCompetence, toasts } = useCompetenceUsage(personnage, mettreAJourLocalement)
  const { stats } = useItems()
  const { rechargerStats } = useStats()

  const [recherche, setRecherche] = useState('')
  const [filtrePrincipal, setFiltrePrincipal] = useState('Tous')
  const [filtreSecondaire, setFiltreSecondaire] = useState('Tous')
  const [competenceDetail, setCompetenceDetail] = useState<any | null>(null)

  if (!personnage) return (
    <div className="flex items-center justify-center h-full font-bold"
      style={{ color: 'var(--text-secondary)' }}>
      Aucun personnage sélectionné.
    </div>
  )

  const competencesFiltrees = filtrerCompetences(competencesAcquises, recherche, filtrePrincipal, filtreSecondaire)

  const handleUtiliser = async (comp: any) => {
    try {
      setCompetenceDetail(null)
      await utiliserCompetence(comp)
    } catch (err) {
      console.error('Erreur utiliserCompetence:', err)
    }
  }

  const handleToggle = async (comp: any) => {
    try {
      const liaison = competencesAcquises.find(c => c.id_competence === comp.id)
      if (liaison) {
        await toggleCompetence(liaison, rechargerStats)
        await chargerCompetencesAcquises(true)
      }
    } catch (err) {
      console.error('Erreur toggleCompetence:', err)
    }
  }

  return (
    <div className="flex flex-col h-full p-4 md:p-8 lg:p-10 overflow-y-auto custom-scrollbar"
      style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-6 gap-4"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <h2 className="text-3xl md:text-4xl font-black tracking-tight gradient-title">
          Mes Compétences
        </h2>
      </div>

      {/* Barre de recherche et Filtres */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40">🔍</span>
          <input 
            type="text" placeholder="Rechercher une compétence..." value={recherche} onChange={e => setRecherche(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-2xl outline-none transition-all font-bold"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
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
        <div className="flex flex-col items-center justify-center mt-20 opacity-40">
          <span className="text-6xl mb-4">📖</span>
          <p className="text-lg font-bold uppercase italic" style={{ color: 'var(--text-secondary)' }}>Aucune compétence apprise.</p>
        </div>
      )}

      {competencesFiltrees.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
          {competencesFiltrees.map(liaison => (
            <CompetenceCard 
              key={liaison.id} 
              competence={liaison.competence} 
              stats={stats} 
              isActive={liaison.is_active}
              onClick={setCompetenceDetail}
              onUse={handleUtiliser}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}
      
      {competencesAcquises.length > 0 && competencesFiltrees.length === 0 && (
        <p className="text-sm italic opacity-50 mb-10 text-center uppercase font-black">Aucune compétence ne correspond à ta recherche.</p>
      )}

      {/* DETAIL MODAL */}
      {competenceDetail && (
        <CompetenceDetailModal 
          competence={competenceDetail}
          stats={stats}
          isActive={competencesAcquises.find(c => c.id_competence === competenceDetail.id)?.is_active}
          onClose={() => setCompetenceDetail(null)}
          onUse={handleUtiliser}
          onToggle={handleToggle}
        />
      )}

      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50 pointer-events-none">
        {toasts.map((t: any) => (
          <div key={t.id} className="px-6 py-3 rounded-2xl bg-card border border-main/30 text-main font-black shadow-2xl animate-in slide-in-from-right-full">{t.msg}</div>
        ))}
      </div>

    </div>
  )
}
