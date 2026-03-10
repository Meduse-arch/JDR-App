import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useStore, type Personnage } from '../../store/useStore'
import CreerTemplate from './CreerTemplate'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { ConfirmButton } from '../../components/ui/ConfirmButton'

export default function Bestiaire() {
  const [templates, setTemplates] = useState<Personnage[]>([])
  const [vue, setVue] = useState<'liste' | 'creer_template'>('liste')
  
  const setPnjControle  = useStore(s => s.setPnjControle)
  const setPageCourante = useStore(s => s.setPageCourante)
  const sessionActive   = useStore(s => s.sessionActive)

  useEffect(() => { chargerDonnees() }, [sessionActive])

  const chargerDonnees = async () => {
    const { data } = await supabase
      .from('personnages')
      .select('*')
      .eq('est_pnj', true)
      .like('nom', '[Modèle]%')

    if (data) {
      setTemplates(data)
    }
  }

  const supprimerTemplate = async (id: string) => {
    // Il faut supprimer tout ce qui est lié au template
    await supabase.from('personnage_stats').delete().eq('id_personnage', id)
    await supabase.from('inventaire').delete().eq('id_personnage', id)
    await supabase.from('personnage_competences').delete().eq('id_personnage', id)
    await supabase.from('personnages').delete().eq('id', id)
    chargerDonnees()
  }

  if (vue === 'creer_template') return (
    <CreerTemplate 
      retour={() => { setVue('liste'); chargerDonnees() }} 
    />
  )

  return (
    <div className="flex flex-col h-full p-4 md:p-8 overflow-y-auto custom-scrollbar"
      style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight"
            style={{
              background: 'linear-gradient(135deg, var(--color-light), var(--color-accent2))',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
            🐉 Bestiaire
          </h2>
          <p className="text-sm opacity-60 mt-1">Crée des modèles avec stats fixes, puis équipe-les</p>
        </div>
        <Button onClick={() => setVue('creer_template')}>
          + Nouveau Modèle
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        {templates.length === 0 && (
          <div className="text-center py-20 opacity-40">
            <span className="text-6xl mb-4">📖</span>
            <p className="text-lg font-bold">Aucun modèle de monstre.</p>
          </div>
        )}
        {templates.map(t => (
          <Card key={t.id} className="flex-row justify-between items-center gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg leading-tight truncate">
                {t.nom.replace('[Modèle] ', '')}
              </h3>
              <div className="flex gap-3 mt-1 text-xs font-bold opacity-60">
                <span className="text-red-400">❤️ {t.hp_max} PV</span>
                <span className="text-blue-400">💧 {t.mana_max} Mana</span>
                <span className="text-yellow-400">⚡ {t.stam_max} Stam</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => { setPnjControle(t); setPageCourante('mon-personnage') }}>
                ⚙️ Configurer
              </Button>
              <ConfirmButton variant="danger" size="sm" onConfirm={() => supprimerTemplate(t.id)}>
                🗑️
              </ConfirmButton>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
