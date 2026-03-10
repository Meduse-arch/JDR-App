import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useStore, type Personnage } from '../../Store/useStore'
import CreerPersonnage from '../shared/CreerPersonnage'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { ConfirmButton } from '../../components/ui/ConfirmButton'
import { bestiaireService } from '../../services/bestiaireService'

type VueType = 'liste' | 'creer' | 'templates'

export default function PNJ() {
  const [pnjs,  setPnjs]  = useState<Personnage[]>([])
  const [templates, setTemplates] = useState<Personnage[]>([])
  const [vue, setVue] = useState<VueType>('liste')
  const [templateAInstancier, setTemplateAInstancier] = useState<Personnage | null>(null)
  const [nouveauNom, setNouveauNom] = useState('')
  
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
    const instances = await bestiaireService.getInstances(sessionActive.id, 'PNJ')
    setPnjs(instances as Personnage[])
  }

  const chargerTemplates = async () => {
    if (!sessionActive) return
    const tmpls = await bestiaireService.getTemplates(sessionActive.id, 'PNJ')
    setTemplates(tmpls as Personnage[])
  }

  const instancierTemplate = async (template: any, nomChoisi: string) => {
    if (!sessionActive) return
    const success = await bestiaireService.instancier(template, sessionActive.id, 1, { nom: nomChoisi })
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
              <Button size="sm" onClick={() => { setTemplateAInstancier(t); setNouveauNom(t.nom) }}>Invoquer</Button>
            </div>
          </Card>
        ))}
      </div>

      {templateAInstancier && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setTemplateAInstancier(null)}>
          <div className="bg-card border border-border p-6 rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h3 className="text-xl font-black mb-4">Invoquer {templateAInstancier.nom}</h3>
            <p className="text-sm opacity-60 mb-4">Donne un nom à ce PNJ :</p>
            <input
              type="text"
              value={nouveauNom}
              onChange={(e) => setNouveauNom(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl px-4 py-2 mb-6 outline-none focus:border-main font-bold"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              autoFocus
            />
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setTemplateAInstancier(null)}>Annuler</Button>
              <Button className="flex-1" onClick={() => instancierTemplate(templateAInstancier, nouveauNom)}>Invoquer</Button>
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
            👥 PNJ Actifs
          </h2>
          <p className="text-sm opacity-60 mt-1">Instances présentes en jeu</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setVue('templates')}>📋 Modèles</Button>
          <Button onClick={() => setVue('creer')}>+ Nouveau PNJ</Button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {pnjs.map(pnj => (
          <Card key={pnj.id} className="flex-row justify-between items-center gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-lg leading-tight truncate">{pnj.nom}</h3>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                HP : <span className="font-black text-[#ef4444]">{pnj.hp_actuel}</span> / {pnj.hp_max}
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
