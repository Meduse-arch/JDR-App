import { useState } from 'react'
import { usePersonnage } from '../../hooks/usePersonnage'
import { usePersonnageCompetences } from '../../hooks/usePersonnageCompetences'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { useItems } from '../../hooks/useItems'
import { formatLabelModif, formatLabelEffet } from '../../utils/formatters'
import { useCompetenceUsage } from '../../hooks/useCompetenceUsage'

export default function MesCompetences() {
  const { personnage, mettreAJourLocalement } = usePersonnage()
  const { competencesAcquises } = usePersonnageCompetences()
  const { utiliserCompetence, toasts } = useCompetenceUsage(personnage, mettreAJourLocalement)
  const { stats } = useItems() // For modif formatting

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

  const competencesFiltrees = competencesAcquises
    .filter(c => {
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
          {competencesFiltrees.map(liaison => {
            const comp = liaison.competence
            return (
              <Card key={liaison.id} hoverEffect className="group flex flex-col h-full p-5 relative overflow-hidden">
                {/* Overlay pour le clic sur le détail */}
                <div className="absolute inset-0 z-0 cursor-pointer" onClick={() => setCompetenceDetail(comp)} />
                
                <div className="relative z-10 flex justify-between items-start mb-3">
                  <h3 className="font-bold leading-tight text-lg truncate pr-2 text-white">{comp.nom}</h3>
                  <Badge variant="ghost" className="shrink-0 text-[10px] uppercase">
                    {comp.type === 'active' ? 'Active' : comp.type === 'passive_auto' ? 'Auto' : 'Toggle'}
                  </Badge>
                </div>

                <p className="relative z-10 text-xs opacity-60 line-clamp-2 mb-4 italic">"{comp.description}"</p>

                <div className="relative z-10 mt-auto flex flex-col gap-3">
                  <div className="flex flex-wrap gap-1">
                    {comp.modificateurs?.slice(0, 2).map((m: any, i: number) => (
                      <Badge key={`m-${i}`} variant="default" className="text-[8px] py-0.5 px-1.5 font-black bg-main/10 text-main border-main/10 uppercase truncate max-w-full">
                        {formatLabelModif(m as any, stats)}
                      </Badge>
                    ))}
                    {comp.effets_actifs?.slice(0, 2).map((e: any, i: number) => (
                      <Badge 
                        key={`e-${i}`} 
                        variant={e.est_jet_de ? 'warning' : e.est_cout ? 'error' : 'success'} 
                        className="text-[8px] py-0.5 px-1.5 font-black uppercase truncate max-w-full"
                      >
                        {formatLabelEffet(e, stats)}
                      </Badge>
                    ))}
                  </div>

                  {comp.type === 'active' && (
                    <Button size="sm" className="w-full relative z-20 py-2 text-[10px] font-black uppercase tracking-widest" onClick={(e) => { e.stopPropagation(); utiliserCompetence(comp); }}>
                      ⚡ Utiliser
                    </Button>
                  )}
                  {comp.type === 'passive_toggle' && (
                    <Button size="sm" variant="secondary" className="w-full relative z-20 py-2 text-[10px] font-black uppercase tracking-widest" onClick={(e) => e.stopPropagation()}>
                      🔄 Basculer
                    </Button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
      
      {competencesAcquises.length > 0 && competencesFiltrees.length === 0 && (
        <p className="text-sm italic opacity-50 mb-10 text-center uppercase font-black">Aucune compétence ne correspond à ta recherche.</p>
      )}

      {/* DETAIL MODAL */}
      {competenceDetail && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[100] p-4 cursor-pointer" onClick={() => setCompetenceDetail(null)}>
          <Card className="max-w-xl w-full p-8 gap-6 shadow-2xl border-main/30 animate-in zoom-in duration-200 relative overflow-hidden cursor-default" onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-main" />
            
            <div className="flex justify-between border-b border-white/5 pb-4">
              <div>
                <Badge className="mb-2 uppercase text-[10px]" variant="outline">{competenceDetail.type}</Badge>
                <h3 className="text-2xl font-black uppercase tracking-tighter text-white">{competenceDetail.nom}</h3>
              </div>
              <button className="text-2xl opacity-20 hover:opacity-100 transition-opacity" onClick={() => setCompetenceDetail(null)}>✕</button>
            </div>
            
            <div className="flex flex-col gap-6">
              <p className="text-sm opacity-80 whitespace-pre-wrap italic leading-relaxed bg-white/5 p-4 rounded-xl border border-white/5">
                "{competenceDetail.description}"
              </p>

              {((competenceDetail.modificateurs && competenceDetail.modificateurs.length > 0) || (competenceDetail.effets_actifs && competenceDetail.effets_actifs.length > 0)) && (
                <div className="flex flex-col gap-3">
                  <p className="text-[10px] font-black uppercase opacity-40 tracking-widest">Statistiques & Effets :</p>
                  <div className="flex flex-wrap gap-2">
                    {competenceDetail.modificateurs?.map((m: any, i: number) => (
                      <Badge key={`m-${i}`} variant="default" className="text-xs py-1 px-2 font-black bg-main/10 text-main border-main/20 uppercase">
                        {formatLabelModif(m as any, stats)}
                      </Badge>
                    ))}
                    {competenceDetail.effets_actifs?.map((e: any, i: number) => (
                      <Badge key={`e-${i}`} variant={e.est_jet_de ? 'warning' : e.est_cout ? 'error' : 'success'} className="text-xs py-1 px-2 font-black uppercase">
                        {formatLabelEffet(e, stats)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                {competenceDetail.type === 'active' && (
                  <Button className="flex-1" onClick={() => utiliserCompetence(competenceDetail)}>⚡ Utiliser la compétence</Button>
                )}
                {competenceDetail.type === 'passive_toggle' && (
                  <Button className="flex-1" variant="secondary">🔄 Activer / Désactiver</Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50 pointer-events-none">
        {toasts.map((t, idx) => (
          <div key={idx} className="px-6 py-3 rounded-2xl bg-card border border-main/30 text-main font-black shadow-2xl animate-in slide-in-from-right-full">{t}</div>
        ))}
      </div>

    </div>
  )
}