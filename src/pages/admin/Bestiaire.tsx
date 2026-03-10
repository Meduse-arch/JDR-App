import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useStore, type Personnage } from '../../store/useStore'
import CreerTemplate from './CreerTemplate'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { ConfirmButton } from '../../components/ui/ConfirmButton'

type VueType = 'modeles' | 'actifs'

export default function Bestiaire() {
  const [templates, setTemplates] = useState<Personnage[]>([])
  const [monstres,  setMonstres]  = useState<Personnage[]>([])
  const [vue,       setVue]       = useState<VueType>('modeles')
  const [creer,     setCreer]     = useState(false)
  const [recherche, setRecherche] = useState('')
  const [quantites, setQuantites] = useState<Record<string, number>>({})
  
  const setPnjControle  = useStore(s => s.setPnjControle)
  const setPageCourante = useStore(s => s.setPageCourante)
  const sessionActive   = useStore(s => s.sessionActive)

  useEffect(() => { chargerDonnees() }, [sessionActive])

  const chargerDonnees = async () => {
    // 1. Charger les templates (toujours dispo)
    const { data: tmplData } = await supabase
      .from('personnages')
      .select('*')
      .eq('est_pnj', true)
      .like('nom', '[Modèle]%')
    if (tmplData) {
      setTemplates(tmplData)
      // Initialiser les quantités à 1 pour les nouveaux templates
      const newQuantites = { ...quantites }
      tmplData.forEach(t => { if (!newQuantites[t.id]) newQuantites[t.id] = 1 })
      setQuantites(newQuantites)
    }

    // 2. Charger les monstres actifs (si session)
    if (sessionActive) {
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
  }

  // Filtrage par recherche
  const templatesFiltres = templates.filter(t => 
    t.nom.toLowerCase().includes(recherche.toLowerCase())
  )
  const monstresFiltres = monstres.filter(m => 
    m.nom.toLowerCase().includes(recherche.toLowerCase())
  )

  const instancierMonstre = async (template: Personnage) => {
    if (!sessionActive) return
    const nbAInvoquer = quantites[template.id] || 1
    
    try {
      const templateNomNettoye = template.nom.replace('[Modèle] ', '').replace('[Modèle]', '').trim()
      
      // Récupérer les données une seule fois pour la copie
      const { data: stats } = await supabase.from('personnage_stats').select('id_stat, valeur').eq('id_personnage', template.id)
      const { data: inv } = await supabase.from('inventaire').select('id_item, quantite, equipe').eq('id_personnage', template.id)
      const { data: comp } = await supabase.from('personnage_competences').select('id_competence').eq('id_personnage', template.id)

      for (let i = 0; i < nbAInvoquer; i++) {
        // Recalculer le nom à chaque tour pour avoir Gobelin 1, Gobelin 2, etc.
        // On base le count sur ce qu'il y a actuellement en mémoire + ce qu'on vient d'ajouter
        const currentCount = monstres.filter(m => m.nom.startsWith(templateNomNettoye)).length + i
        const nouveauNom = currentCount === 0 ? templateNomNettoye : `${templateNomNettoye} ${currentCount + 1}`

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

        if (errPerso || !nouveauMonstre) continue

        // Copier Stats
        if (stats) await supabase.from('personnage_stats').insert(stats.map(s => ({ id_personnage: nouveauMonstre.id, id_stat: s.id_stat, valeur: s.valeur })))

        // Copier Inventaire
        if (inv) await supabase.from('inventaire').insert(inv.map(i => ({ id_personnage: nouveauMonstre.id, id_item: i.id_item, quantite: i.quantite, equipe: i.equipe })))

        // Copier Compétences
        if (comp) await supabase.from('personnage_competences').insert(comp.map(c => ({ id_personnage: nouveauMonstre.id, id_competence: c.id_competence })))

        // Lier à la session
        await supabase.from('session_joueurs').insert({ id_session: sessionActive.id, id_personnage: nouveauMonstre.id })
      }

      chargerDonnees()
    } catch (e) { console.error(e) }
  }

  const supprimerMonstre = async (id: string) => {
    await supabase.from('session_joueurs').delete().eq('id_personnage', id)
    await supabase.from('personnage_stats').delete().eq('id_personnage', id)
    await supabase.from('inventaire').delete().eq('id_personnage', id)
    await supabase.from('personnage_competences').delete().eq('id_personnage', id)
    await supabase.from('personnages').delete().eq('id', id)
    chargerDonnees()
  }

  if (creer) return <CreerTemplate retour={() => { setCreer(false); chargerDonnees() }} />

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
            🐉 Bestiaire & Mobs
          </h2>
          <p className="text-sm opacity-60 mt-1">Gère tes modèles et tes monstres en jeu</p>
        </div>
        {vue === 'modeles' && (
          <Button onClick={() => setCreer(true)}>+ Nouveau Modèle</Button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex flex-1 gap-2 p-1 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {btnFiltre('modeles', '📖 Modèles', templates.length)}
          {btnFiltre('actifs',  '⚔️ En Jeu',  monstres.length)}
        </div>
        
        <div className="relative flex-[1.5]">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40">🔍</span>
          <input
            type="text"
            placeholder={`Rechercher un ${vue === 'modeles' ? 'modèle' : 'monstre'}...`}
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-2xl text-sm font-semibold outline-none transition-all border"
            style={{ 
              backgroundColor: 'var(--bg-card)', 
              borderColor: 'var(--border)',
              color: 'var(--text-primary)'
            }}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--color-main)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {vue === 'modeles' ? (
          <>
            {templatesFiltres.length === 0 && <p className="text-center py-20 opacity-40">Aucun modèle correspondant.</p>}
            {templatesFiltres.map(t => (
              <Card key={t.id} className="flex-row justify-between items-center gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg leading-tight truncate">{t.nom.replace('[Modèle] ', '')}</h3>
                  <div className="flex gap-3 mt-1 text-xs font-bold opacity-60">
                    <span className="text-red-400">❤️ {t.hp_max} PV</span>
                    <span className="text-blue-400">💧 {t.mana_max} Mana</span>
                    <span className="text-yellow-400">⚡ {t.stam_max} Stam</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-[var(--bg-app)] rounded-xl border border-[var(--border)] p-1">
                    <input 
                      type="number" 
                      min="1" 
                      max="20"
                      value={quantites[t.id] || 1}
                      onChange={(e) => setQuantites({ ...quantites, [t.id]: parseInt(e.target.value) || 1 })}
                      className="w-10 bg-transparent text-center font-bold text-sm outline-none"
                    />
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => { setPnjControle(t); setPageCourante('mon-personnage') }}>⚙️</Button>
                  <Button variant="primary" size="sm" onClick={() => instancierMonstre(t)}>Invoquer</Button>
                  <ConfirmButton variant="danger" size="sm" onConfirm={() => supprimerMonstre(t.id)}>🗑️</ConfirmButton>
                </div>
              </Card>
            ))}
          </>
        ) : (
          <>
            {monstresFiltres.length === 0 && <p className="text-center py-20 opacity-40">Aucun monstre actif correspondant.</p>}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {monstresFiltres.map(m => (
                <Card key={m.id} className="flex-row justify-between items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg leading-tight truncate">{m.nom}</h3>
                    <div className="flex flex-col gap-1 mt-1">
                      <p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                        HP : <span className="font-black text-[#ef4444]">{m.hp_actuel}</span> / {m.hp_max}
                      </p>
                      <div className="flex gap-3 text-[10px] font-bold opacity-50">
                         <span>💧 {m.mana_actuel}/{m.mana_max}</span>
                         <span>⚡ {m.stam_actuel}/{m.stam_max}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => { setPnjControle(m); setPageCourante('mon-personnage') }}>Gérer</Button>
                    <ConfirmButton variant="danger" size="sm" onConfirm={() => supprimerMonstre(m.id)}>🗑️</ConfirmButton>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
