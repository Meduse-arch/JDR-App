import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useStore, type Personnage, type PersonnageType } from '../../Store/useStore'
import CreerPersonnage from '../shared/CreerPersonnage'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { ConfirmButton } from '../../components/ui/ConfirmButton'
import { bestiaireService } from '../../services/bestiaireService'

type VueType = 'liste' | 'creer' | 'templates'
type FiltreType = 'Tous' | 'PNJ' | 'Boss'

export default function PNJ() {
  const [pnjs,  setPnjs]  = useState<Personnage[]>([])
  const [templates, setTemplates] = useState<Personnage[]>([])
  const [vue, setVue] = useState<VueType>('liste')
  const [templateAInstancier, setTemplateAInstancier] = useState<Personnage | null>(null)
  const [nouveauNom, setNouveauNom] = useState('')
  const [typeChoisi, setTypeChoisi] = useState<PersonnageType>('PNJ')
  
  const [recherche, setRecherche] = useState('')
  const [filtreType, setFiltreType] = useState<FiltreType>('Tous')

  const pnjControle     = useStore(s => s.pnjControle)
  const setPnjControle  = useStore(s => s.setPnjControle)
  const setPageCourante = useStore(s => s.setPageCourante)
  const sessionActive   = useStore(s => s.sessionActive)

  useEffect(() => { 
    if (sessionActive) {
      chargerPnjs()
      if (vue === 'templates') chargerTemplates()
    }
  }, [vue, sessionActive])

  const chargerPnjs = async () => {
    if (!sessionActive) return
    const instances = await bestiaireService.getInstances(sessionActive.id, ['PNJ', 'Boss'])
    setPnjs(instances as Personnage[])
  }

  const chargerTemplates = async () => {
    if (!sessionActive) return
    const { data } = await supabase
      .from('personnages')
      .select('*')
      .eq('id_session', sessionActive.id)
      .eq('is_template', true)
      .in('type', ['PNJ', 'Monstre'])
    setTemplates(data as Personnage[])
  }

  const instancierTemplate = async (template: any, nomChoisi: string, type: PersonnageType) => {
    if (!sessionActive) return
    const success = await bestiaireService.instancier(template, sessionActive.id, 1, { nom: nomChoisi, type })
    if (success) {
      setTemplateAInstancier(null)
      setVue('liste')
      chargerPnjs()
    }
  }

  const supprimerPnj = async (id: string) => {
    const success = await bestiaireService.supprimerInstance(id)
    if (success) chargerPnjs()
  }

  const pnjsFiltres = pnjs.filter(p => {
    const matchNom = p.nom.toLowerCase().includes(recherche.toLowerCase())
    const matchType = filtreType === 'Tous' || p.type === filtreType
    return matchNom && matchType
  })

  if (vue === 'creer') return (
    <CreerPersonnage type="PNJ" retour={() => { setVue('liste'); chargerPnjs() }} />
  )

  if (vue === 'templates') return (
    <div className="flex flex-col h-full p-4 md:p-8 overflow-y-auto custom-scrollbar" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      <div className="flex justify-between items-center mb-8 gap-4">
        <h2 className="text-2xl md:text-3xl font-black tracking-tight" style={{ background: 'linear-gradient(135deg, var(--color-light), var(--color-accent2))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          👤 Modèles PNJ
        </h2>
        <Button variant="secondary" onClick={() => setVue('liste')}>Retour</Button>
      </div>
      <div className="flex flex-col gap-4 max-w-3xl">
        {templates.map(t => (
          <Card key={t.id} className="flex-row justify-between items-center gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg leading-tight truncate">{t.nom}</h3>
              <div className="flex gap-3 mt-1 text-[10px] font-bold opacity-60">
                <span className="text-red-400">❤️ {t.hp_max} PV</span>
                <span className="text-blue-400">💧 {t.mana_max} Mana</span>
                <span className="text-yellow-400">⚡ {t.stam_max} Stam</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => { setPnjControle(t); setPageCourante('mon-personnage') }}>⚙️ Configurer</Button>
              <Button size="sm" onClick={() => { setTemplateAInstancier(t); setNouveauNom(t.nom); setTypeChoisi('PNJ'); }}>Invoquer</Button>
            </div>
          </Card>
        ))}
      </div>

      {templateAInstancier && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setTemplateAInstancier(null)}>
          <div className="bg-card border border-border p-6 rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h3 className="text-xl font-black mb-4 uppercase italic tracking-tighter">Invoquer l'Entité</h3>
            
            <div className="flex flex-col gap-4 mb-6">
              <div>
                <label className="text-[10px] font-black uppercase opacity-40 ml-1 mb-1.5 block">Identité</label>
                <input
                  type="text" value={nouveauNom} onChange={(e) => setNouveauNom(e.target.value)}
                  className="w-full bg-surface border border-border rounded-xl px-4 py-2 outline-none focus:border-main font-bold"
                  style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase opacity-40 ml-1 mb-1.5 block">Catégorie</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setTypeChoisi('PNJ')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${typeChoisi === 'PNJ' ? 'bg-main border-main text-white' : 'bg-white/5 border-white/10 opacity-40'}`}
                  >
                    👤 PNJ
                  </button>
                  <button 
                    onClick={() => setTypeChoisi('Boss')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${typeChoisi === 'Boss' ? 'bg-[#ef4444] border-[#ef4444] text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-white/5 border-white/10 opacity-40'}`}
                  >
                    👑 BOSS
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setTemplateAInstancier(null)}>Annuler</Button>
              <Button className="flex-1" onClick={() => instancierTemplate(templateAInstancier, nouveauNom, typeChoisi)}>Confirmer</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="flex flex-col h-full p-4 md:p-8 overflow-y-auto custom-scrollbar" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight" style={{ background: 'linear-gradient(135deg, var(--color-light), var(--color-accent2))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            👥 Population Active
          </h2>
          <p className="text-sm opacity-60 mt-1">PNJ et Boss présents en jeu</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setVue('templates')}>📋 Modèles</Button>
          <Button onClick={() => setVue('creer')}>+ Nouveau PNJ</Button>
        </div>
      </div>

      {/* RECHERCHE ET FILTRES */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40">🔍</span>
          <input 
            type="text" placeholder="Rechercher par nom..." value={recherche} onChange={e => setRecherche(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-surface border border-border outline-none focus:border-main transition-all font-bold"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
        </div>
        <div className="flex gap-2 p-1 bg-surface border border-border rounded-xl" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          {(['Tous', 'PNJ', 'Boss'] as FiltreType[]).map(f => (
            <button
              key={f} onClick={() => setFiltreType(f)}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${filtreType === f ? 'bg-main text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}
              style={{ backgroundColor: filtreType === f ? 'var(--color-main)' : 'transparent' }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {pnjsFiltres.length === 0 && <p className="text-center opacity-30 mt-10 italic">Aucune entité trouvée...</p>}
        {pnjsFiltres.map(pnj => (
          <Card key={pnj.id} className="flex-row justify-between items-center gap-4 group">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg leading-tight truncate">{pnj.nom}</h3>
                {pnj.type === 'Boss' && <span className="text-[8px] font-black bg-[#ef4444] text-white px-1.5 py-0.5 rounded uppercase shadow-[0_0_10px_rgba(239,68,68,0.4)]">BOSS</span>}
              </div>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                HP : <span className={`font-black ${pnj.type === 'Boss' ? 'text-red-500' : 'text-[#ef4444]'}`}>{pnj.hp_actuel}</span> / {pnj.hp_max}
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant={pnjControle?.id === pnj.id ? 'primary' : 'ghost'} 
                size="sm" 
                onClick={() => { setPnjControle(pnj); setPageCourante('mon-personnage') }}
                className="border border-white/5"
              >
                🎭 {pnjControle?.id === pnj.id ? 'Incarné' : 'Posséder'}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => { setPnjControle(pnj); setPageCourante('mon-personnage') }}>Gérer</Button>
              <ConfirmButton variant="danger" size="sm" onConfirm={() => supprimerPnj(pnj.id)}>🗑️</ConfirmButton>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
