import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useStore, type Personnage } from '../../store/useStore'
import CreerPersonnage from '../shared/CreerPersonnage'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { ConfirmButton } from '../../components/ui/ConfirmButton'

type VueType = 'liste' | 'creer' | 'templates'

export default function PNJ() {
  const [pnjs,  setPnjs]  = useState<Personnage[]>([])
  const [templates, setTemplates] = useState<Personnage[]>([])
  const [vue, setVue] = useState<VueType>('liste')
  const [templateAInstancier, setTemplateAInstancier] = useState<Personnage | null>(null)
  const [nouveauNom, setNouveauNom] = useState('')
  
  const setPnjControle  = useStore(s => s.setPnjControle)
  const setPageCourante = useStore(s => s.setPageCourante)
  const sessionActive   = useStore(s => s.sessionActive)

  useEffect(() => { 
    chargerPnjs()
    if (vue === 'templates') chargerTemplates()
  }, [vue, sessionActive])

  const chargerPnjs = async () => {
    if (!sessionActive) return
    const { data } = await supabase
      .from('session_joueurs').select('personnages(*)').eq('id_session', sessionActive.id)
    if (data)
      setPnjs(data.map((d: any) => d.personnages).filter((p: any) => 
        p?.est_pnj === true && 
        !p?.nom?.startsWith('[Modèle]') &&
        (p?.categorie_pnj === 'PNJ' || !p?.categorie_pnj)
      ))
  }

  const chargerTemplates = async () => {
    const { data } = await supabase
      .from('personnages')
      .select('*')
      .eq('est_pnj', true)
      .like('nom', '[Modèle]%')
    if (data) setTemplates(data)
  }

  const instancierTemplate = async (template: Personnage, nomChoisi?: string) => {
    if (!sessionActive) return
    try {
      const templateNomNettoye = nomChoisi || template.nom.replace('[Modèle] ', '').replace('[Modèle]', '').trim()
      
      const { data: nouveauPnj, error: errPerso } = await supabase
        .from('personnages')
        .insert({
          nom: templateNomNettoye,
          est_pnj: true,
          categorie_pnj: 'PNJ',
          hp_max: template.hp_max, hp_actuel: template.hp_max,
          mana_max: template.mana_max, mana_actuel: template.mana_max,
          stam_max: template.stam_max, stam_actuel: template.stam_max,
        })
        .select().single()

      if (errPerso || !nouveauPnj) return

      // Copier Stats
      const { data: stats } = await supabase.from('personnage_stats').select('id_stat, valeur').eq('id_personnage', template.id)
      if (stats) await supabase.from('personnage_stats').insert(stats.map(s => ({ id_personnage: nouveauPnj.id, id_stat: s.id_stat, valeur: s.valeur })))

      // Copier Inventaire
      const { data: inv } = await supabase.from('inventaire').select('id_item, quantite, equipe').eq('id_personnage', template.id)
      if (inv) await supabase.from('inventaire').insert(inv.map(i => ({ id_personnage: nouveauPnj.id, id_item: i.id_item, quantite: i.quantite, equipe: i.equipe })))

      // Copier Compétences
      const { data: comp } = await supabase.from('personnage_competences').select('id_competence').eq('id_personnage', template.id)
      if (comp) await supabase.from('personnage_competences').insert(comp.map(c => ({ id_personnage: nouveauPnj.id, id_competence: c.id_competence })))

      // Lier à la session
      await supabase.from('session_joueurs').insert({ id_session: sessionActive.id, id_personnage: nouveauPnj.id })

      setTemplateAInstancier(null)
      setVue('liste')
      chargerPnjs()
    } catch (e) { console.error(e) }
  }

  const supprimerPnj = async (id: string) => {
    await supabase.from('session_joueurs').delete().eq('id_personnage', id)
    await supabase.from('personnage_stats').delete().eq('id_personnage', id)
    await supabase.from('inventaire').delete().eq('id_personnage', id)
    await supabase.from('personnage_competences').delete().eq('id_personnage', id)
    await supabase.from('personnages').delete().eq('id', id)
    chargerPnjs()
  }

  if (vue === 'creer') return (
    <CreerPersonnage estPnj={true} retour={() => { setVue('liste'); chargerPnjs() }} />
  )

  if (vue === 'templates') return (
    <div className="flex flex-col h-full p-4 md:p-8 overflow-y-auto custom-scrollbar" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      <div className="flex justify-between items-center mb-8 gap-4">
        <h2 className="text-2xl md:text-3xl font-black tracking-tight" style={{ background: 'linear-gradient(135deg, var(--color-light), var(--color-accent2))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          👤 Invoquer un PNJ depuis un Modèle
        </h2>
        <Button variant="secondary" onClick={() => setVue('liste')}>Retour</Button>
      </div>
      <div className="flex flex-col gap-4 max-w-3xl">
        {templates.length === 0 && <p className="text-center py-20 opacity-40">Aucun modèle disponible.</p>}
        {templates.map(t => (
          <Card key={t.id} className="flex-row justify-between items-center gap-4 cursor-pointer hover:border-white/20 transition-all border border-transparent" 
            onClick={() => {
              setTemplateAInstancier(t)
              setNouveauNom(t.nom.replace('[Modèle] ', '').replace('[Modèle]', '').trim())
            }}
          >
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg leading-tight truncate">{t.nom.replace('[Modèle] ', '')}</h3>
              <div className="flex gap-3 mt-1 text-xs font-bold opacity-60">
                <span className="text-red-400">❤️ {t.hp_max} PV</span>
                <span className="text-blue-400">💧 {t.mana_max} Mana</span>
              </div>
            </div>
            <Button size="sm">Utiliser</Button>
          </Card>
        ))}
      </div>

      {templateAInstancier && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setTemplateAInstancier(null)}>
          <div className="bg-card border border-border p-6 rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h3 className="text-xl font-black mb-4">Invoquer {templateAInstancier.nom.replace('[Modèle] ', '')}</h3>
            <p className="text-sm opacity-60 mb-4">Donne un nom à ce PNJ :</p>
            <input
              type="text"
              value={nouveauNom}
              onChange={(e) => setNouveauNom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && nouveauNom.trim()) instancierTemplate(templateAInstancier, nouveauNom)
                if (e.key === 'Escape') setTemplateAInstancier(null)
              }}
              className="w-full bg-surface border border-border rounded-xl px-4 py-2 mb-6 outline-none focus:border-main font-bold"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              autoFocus
            />
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setTemplateAInstancier(null)}>Annuler</Button>
              <Button className="flex-1" onClick={() => instancierTemplate(templateAInstancier, nouveauNom)} disabled={!nouveauNom.trim()}>Invoquer</Button>
            </div>
          </div>
        </div>
      )}
    </div>
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
            👥 PNJ
          </h2>
          <p className="text-sm opacity-60 mt-1">Gère les personnages non-joueurs de l'histoire</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setVue('templates')}>
            📋 Depuis Modèle
          </Button>
          <Button onClick={() => setVue('creer')}>
            + Nouveau PNJ
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {pnjs.length === 0 && (
          <div className="text-center py-20 opacity-40">
            <span className="text-6xl mb-4">👥</span>
            <p className="text-lg font-bold" style={{ color: 'var(--text-secondary)' }}>
              Aucun PNJ dans cette session.
            </p>
          </div>
        )}
        {pnjs.map(pnj => (
          <Card key={pnj.id} className="flex-row justify-between items-center gap-2 sm:gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-base sm:text-lg leading-tight truncate">{pnj.nom}</h3>
              <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                HP : <span className="font-black text-[#ef4444]">{pnj.hp_actuel}</span> / {pnj.hp_max}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { setPnjControle(pnj); setPageCourante('mon-personnage') }}
              >
                Gérer
              </Button>
              <ConfirmButton
                variant="danger"
                size="sm"
                onConfirm={() => supprimerPnj(pnj.id)}
                className="w-full sm:w-10 px-0"
              >
                🗑️
              </ConfirmButton>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
