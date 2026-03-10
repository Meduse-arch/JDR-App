import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useStore, type Personnage } from '../../Store/useStore'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { ConfirmButton } from '../../components/ui/ConfirmButton'

export default function Mobs() {
  const [monstres,  setMonstres]  = useState<Personnage[]>([])
  const [templates, setTemplates] = useState<Personnage[]>([])
  const [vue, setVue] = useState<'liste' | 'instancier'>('liste')

  const setPnjControle  = useStore(s => s.setPnjControle)
  const setPageCourante = useStore(s => s.setPageCourante)
  const sessionActive   = useStore(s => s.sessionActive)

  useEffect(() => { chargerDonnees() }, [sessionActive])

  const chargerDonnees = async () => {
    if (!sessionActive) return
    
    // Charger les templates (via le préfixe [Modèle])
    const { data: tmplData } = await supabase
      .from('personnages')
      .select('*')
      .eq('est_pnj', true)
      .like('nom', '[Modèle]%')
      
    if (tmplData) setTemplates(tmplData)

    // Charger les mobs actifs de la session (personnages liés à la session qui n'ont PAS le préfixe [Modèle])
    const { data: sessionData } = await supabase
      .from('session_joueurs')
      .select('personnages(*)')
      .eq('id_session', sessionActive.id)
    
    if (sessionData) {
      setMonstres(sessionData
        .map((d: any) => d.personnages)
        .filter(p => p && p.categorie_pnj === 'Monstre' && !p.nom.startsWith('[Modèle]'))
      )
    }
  }

  const instancierMonstre = async (template: Personnage) => {
    if (!sessionActive) return
    
    try {
      // Nettoyer le nom du template
      const templateNomNettoye = template.nom.replace('[Modèle] ', '').replace('[Modèle]', '').trim()

      // 1. Compter combien il y en a déjà pour le nom
      const count = monstres.filter(m => m.nom.startsWith(templateNomNettoye)).length
      const nouveauNom = count === 0 ? templateNomNettoye : `${templateNomNettoye} ${count + 1}`

      // 2. Créer le monstre
      const { data: nouveauMonstre, error: errPerso } = await supabase
        .from('personnages')
        .insert({
          nom: nouveauNom,
          est_pnj: true,
          categorie_pnj: 'Monstre',
          hp_max: template.hp_max, hp_actuel: template.hp_max,
          mana_max: template.mana_max, mana_actuel: template.mana_max,
          stam_max: template.stam_max, stam_actuel: template.stam_max,
        })
        .select().single()

      if (errPerso || !nouveauMonstre) {
        alert("Erreur lors de la création du monstre dans la base.");
        console.error(errPerso);
        return;
      }

      // 3. Copier les stats
      const { data: templateStats } = await supabase.from('personnage_stats').select('id_stat, valeur').eq('id_personnage', template.id)
      if (templateStats && templateStats.length > 0) {
        await supabase.from('personnage_stats').insert(
          templateStats.map(s => ({ id_personnage: nouveauMonstre.id, id_stat: s.id_stat, valeur: s.valeur }))
        )
      }

      // 4. Copier l'inventaire
      const { data: templateInv } = await supabase.from('inventaire').select('id_item, quantite, equipe').eq('id_personnage', template.id)
      if (templateInv && templateInv.length > 0) {
        await supabase.from('inventaire').insert(
          templateInv.map(i => ({ id_personnage: nouveauMonstre.id, id_item: i.id_item, quantite: i.quantite, equipe: i.equipe }))
        )
      }

      // 5. Copier les compétences
      const { data: templateComp } = await supabase.from('personnage_competences').select('id_competence').eq('id_personnage', template.id)
      if (templateComp && templateComp.length > 0) {
        await supabase.from('personnage_competences').insert(
          templateComp.map(c => ({ id_personnage: nouveauMonstre.id, id_competence: c.id_competence }))
        )
      }

      // 6. Lier à la session
      const { error: errSession } = await supabase.from('session_joueurs').insert({
        id_session: sessionActive.id,
        id_personnage: nouveauMonstre.id,
      })

      if (errSession) {
        alert("Monstre créé mais impossible de le lier à la session active.");
        console.error(errSession);
      }

      setVue('liste')
      await chargerDonnees()
    } catch (e) {
      alert("Une erreur inattendue est survenue.");
      console.error(e);
    }
  }

  const supprimerMonstre = async (id: string) => {
    await supabase.from('session_joueurs').delete().eq('id_personnage', id)
    await supabase.from('personnage_stats').delete().eq('id_personnage', id)
    await supabase.from('inventaire').delete().eq('id_personnage', id)
    await supabase.from('personnage_competences').delete().eq('id_personnage', id)
    await supabase.from('personnages').delete().eq('id', id)
    chargerDonnees()
  }

  if (vue === 'instancier') {
    return (
      <div className="flex flex-col h-full p-4 md:p-8 overflow-y-auto custom-scrollbar" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>
        <div className="flex justify-between items-center mb-8 gap-4">
          <h2 className="text-2xl md:text-3xl font-black tracking-tight" style={{ background: 'linear-gradient(135deg, var(--color-light), var(--color-accent2))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            ⚔️ Invoquer un Mob
          </h2>
          <Button variant="secondary" onClick={() => setVue('liste')}>Retour</Button>
        </div>
        
        <div className="flex flex-col gap-4 max-w-3xl">
          <h3 className="font-bold text-lg mb-2 opacity-80">Choisissez un modèle de mob depuis le bestiaire :</h3>
          {templates.length === 0 && (
            <div className="text-center py-10 opacity-40 border-2 border-dashed border-white/20 rounded-xl">
              <p className="text-lg font-bold">Aucun modèle disponible.</p>
              <p className="text-sm mt-2">Créez des modèles de monstres dans l'onglet "Bestiaire".</p>
            </div>
          )}
          {templates.map(t => (
            <Card key={t.id} className="flex-row justify-between items-center gap-4 cursor-pointer hover:border-white/20 transition-all border border-transparent" onClick={() => instancierMonstre(t)}>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg leading-tight truncate">{t.nom}</h3>
                <div className="flex gap-3 mt-1 text-xs font-bold opacity-60">
                  <span className="text-red-400">❤️ {t.hp_max} PV</span>
                  <span className="text-blue-400">💧 {t.mana_max} Mana</span>
                  <span className="text-yellow-400">⚡ {t.stam_max} Stam</span>
                </div>
              </div>
              <Button size="sm" onClick={(e) => { e.stopPropagation(); instancierMonstre(t); }}>
                Invoquer
              </Button>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full p-4 md:p-8 overflow-y-auto custom-scrollbar" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      <div className="flex justify-between items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight" style={{ background: 'linear-gradient(135deg, var(--color-light), var(--color-accent2))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            ⚔️ Mobs Actifs
          </h2>
          <p className="text-sm opacity-60 mt-1">Gère les monstres actuellement en jeu dans cette session</p>
        </div>
        <Button onClick={() => setVue('instancier')}>
          + Invoquer
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        {monstres.length === 0 && (
          <div className="text-center py-20 opacity-40">
            <span className="text-6xl mb-4">⚔️</span>
            <p className="text-lg font-bold">Aucun monstre actif dans cette session.</p>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {monstres.map(m => (
            <Card key={m.id} className="flex-row justify-between items-center gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg leading-tight truncate">{m.nom}</h3>
                <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  HP : <span className="font-black text-[#ef4444]">{m.hp_actuel}</span> / {m.hp_max}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => { setPnjControle(m); setPageCourante('mon-personnage') }}>
                  Gérer
                </Button>
                <ConfirmButton variant="danger" size="sm" onConfirm={() => supprimerMonstre(m.id)}>
                  🗑️
                </ConfirmButton>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
