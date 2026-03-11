import { useEffect, useState } from 'react'
import { useStore, type Personnage } from '../../store/useStore'
import CreerTemplate from './CreerTemplate'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { ConfirmButton } from '../../components/ui/ConfirmButton'
import { bestiaireService } from '../../services/bestiaireService'

type VueType = 'modeles' | 'actifs'

export default function Bestiaire() {
  const [templates, setTemplates] = useState<Personnage[]>([])
  const [monstres,  setMonstres]  = useState<Personnage[]>([])
  const [vue,       setVue]       = useState<VueType>('modeles')
  const [creer,     setCreer]     = useState(false)
  const [recherche, setRecherche] = useState('')
  const [quantites, setQuantites] = useState<Record<string, number>>({})
  
  const pnjControle     = useStore(s => s.pnjControle)
  const setPnjControle  = useStore(s => s.setPnjControle)
  const setPageCourante = useStore(s => s.setPageCourante)
  const sessionActive   = useStore(s => s.sessionActive)

  useEffect(() => { 
    if (sessionActive) chargerDonnees() 
  }, [sessionActive])

  const chargerDonnees = async () => {
    if (!sessionActive) return
    const tmpls = await bestiaireService.getTemplates(sessionActive.id, 'Monstre')
    setTemplates(tmpls as Personnage[])
    
    const newQuantites: Record<string, number> = {}
    tmpls.forEach(t => { newQuantites[t.id] = 1 })
    setQuantites(newQuantites)

    const instances = await bestiaireService.getInstances(sessionActive.id, 'Monstre')
    setMonstres(instances as Personnage[])
  }

  const templatesFiltres = (templates || []).filter(t => t.nom?.toLowerCase().includes(recherche.toLowerCase()))
  const monstresFiltres = (monstres || []).filter(m => m.nom?.toLowerCase().includes(recherche.toLowerCase()))

  const instancierMonstre = async (template: any) => {
    if (!sessionActive) return
    const nb = quantites[template.id] || 1
    const success = await bestiaireService.instancier(template, sessionActive.id, nb)
    if (success) {
      setVue('actifs')
      chargerDonnees()
    }
  }

  const supprimerMonstre = async (id: string) => {
    setMonstres(prev => prev.filter(m => m.id !== id))
    const success = await bestiaireService.supprimerInstance(id)
    if (!success) chargerDonnees()
  }

  const supprimerTemplate = async (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id))
    const success = await bestiaireService.supprimerTemplate(id)
    if (!success) chargerDonnees()
  }

  if (creer) return <CreerTemplate type="Monstre" retour={() => { setCreer(false); chargerDonnees() }} />

  const btnFiltre = (id: VueType, label: string, count: number) => (
    <button
      onClick={() => setVue(id)}
      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
      style={{
        backgroundColor: vue === id ? 'var(--color-main)' : 'var(--bg-surface)',
        color: vue === id ? '#fff' : 'var(--text-secondary)',
        border: `1px solid ${vue === id ? 'var(--color-main)' : 'var(--border)'}`,
      }}
    >
      {label}
      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black" style={{ backgroundColor: vue === id ? 'rgba(255,255,255,0.2)' : 'var(--bg-app)', color: vue === id ? '#fff' : 'var(--text-muted)' }}>
        {count}
      </span>
    </button>
  )

  return (
    <div className="flex flex-col h-full p-4 md:p-8 overflow-y-auto custom-scrollbar" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight" style={{ background: 'linear-gradient(135deg, var(--color-light), var(--color-accent2))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            🐉 Bestiaire & Monstres
          </h2>
          <p className="text-sm opacity-60 mt-1">Modèles et monstres invoqués</p>
        </div>
        {vue === 'modeles' && <Button onClick={() => setCreer(true)}>+ Nouveau Modèle</Button>}
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex flex-1 gap-2 p-1 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {btnFiltre('modeles', '📖 Catalogue', templates.length)}
          {btnFiltre('actifs',  '⚔️ En Jeu',  monstres.length)}
        </div>
        <div className="relative flex-[1.5]">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40">🔍</span>
          <input type="text" placeholder="Rechercher..." value={recherche} onChange={e => setRecherche(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-2xl text-sm font-semibold outline-none border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {vue === 'modeles' ? (
          <div className="flex flex-col gap-4">
            {templatesFiltres.length === 0 && <p className="text-center opacity-30 mt-10 italic">Aucun modèle disponible...</p>}
            {templatesFiltres.map(t => (
              <Card key={t.id} className="flex-row justify-between items-center gap-4 hover:border-white/10 transition-all">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg leading-tight truncate">{t.nom}</h3>
                  <div className="flex gap-3 mt-1 text-[10px] font-bold opacity-60">
                    <span className="text-red-400">❤️ {t.hp_max} PV</span>
                    <span className="text-blue-400">💧 {t.mana_max} Mana</span>
                    <span className="text-yellow-400">⚡ {t.stam_max} Stam</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" min="1" max="20" value={quantites[t.id] || 1} onChange={(e) => setQuantites({ ...quantites, [t.id]: parseInt(e.target.value) || 1 })} className="w-12 bg-[var(--bg-app)] border border-[var(--border)] rounded-lg text-center font-bold text-sm p-1" />
                  <Button variant="secondary" size="sm" onClick={() => { setPnjControle(t); setPageCourante('mon-personnage') }}>⚙️</Button>
                  <Button variant="primary" size="sm" onClick={() => instancierMonstre(t)}>Invoquer</Button>
                  <ConfirmButton variant="danger" size="sm" onConfirm={() => supprimerTemplate(t.id)}>🗑️</ConfirmButton>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {monstresFiltres.length === 0 && <p className="col-span-full text-center opacity-30 mt-10 italic">Aucun monstre en jeu...</p>}
            {monstresFiltres.map(m => (
              <Card key={m.id} className="flex-row justify-between items-center gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg leading-tight truncate">{m.nom}</h3>
                  <div className="flex flex-col gap-1 mt-1">
                    <p className="text-xs sm:text-sm">HP : <span className="text-red-400 font-bold">{m.hp_actuel}/{m.hp_max}</span></p>
                    <div className="flex gap-3 text-[10px] font-bold opacity-50">
                       <span>💧 {m.mana_actuel}/{m.mana_max}</span>
                       <span>⚡ {m.stam_actuel}/{m.stam_max}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant={pnjControle?.id === m.id ? 'primary' : 'secondary'} 
                    size="sm" 
                    onClick={() => { setPnjControle(m); setPageCourante('mon-personnage') }}
                    className="font-black uppercase text-[10px]"
                  >
                    {pnjControle?.id === m.id ? '🎭 Incarné' : '⚙️ Configurer'}
                  </Button>
                  <ConfirmButton variant="danger" size="sm" onConfirm={() => supprimerMonstre(m.id)}>🗑️</ConfirmButton>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
