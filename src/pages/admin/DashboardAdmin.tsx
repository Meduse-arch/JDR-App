import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useStore, type Personnage } from '../../store/useStore'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'

export default function DashboardAdmin() {
  const sessionActive = useStore(s => s.sessionActive)
  const setPageCourante = useStore(s => s.setPageCourante)
  const setPnjControle = useStore(s => s.setPnjControle)

  const [joueurs, setJoueurs] = useState<Personnage[]>([])
  const [pnjs, setPnjs] = useState<Personnage[]>([])
  const [mobs, setMobs] = useState<Personnage[]>([])
  const [stats, setStats] = useState({
    items: 0,
    competences: 0,
    templates: 0,
    quetes: 0
  })

  useEffect(() => {
    if (sessionActive) {
      chargerDonnees()
      
      // Realtime subscription to update bars automatically
      const channel = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'personnages', filter: `id_session=eq.${sessionActive.id}` },
          () => chargerDonnees()
        )
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    }
  }, [sessionActive])

  const chargerDonnees = async () => {
    if (!sessionActive) return

    // 1. Personnages
    const { data: persos } = await supabase
      .from('personnages')
      .select('*')
      .eq('id_session', sessionActive.id)
      .eq('is_template', false)

    if (persos) {
      setJoueurs(persos.filter(p => p.type === 'Joueur'))
      setPnjs(persos.filter(p => p.type === 'PNJ'))
      setMobs(persos.filter(p => p.type === 'Monstre'))
    }

    // 2. Statistiques globales
    const [itemsRes, compRes, tmplRes, quetesRes] = await Promise.all([
      supabase.from('items').select('id', { count: 'exact', head: true }).eq('id_session', sessionActive.id),
      supabase.from('competences').select('id', { count: 'exact', head: true }).eq('id_session', sessionActive.id),
      supabase.from('personnages').select('id', { count: 'exact', head: true }).eq('id_session', sessionActive.id).eq('is_template', true),
      supabase.from('quetes').select('id', { count: 'exact', head: true }).eq('id_session', sessionActive.id)
    ])

    setStats({
      items: itemsRes.count || 0,
      competences: compRes.count || 0,
      templates: tmplRes.count || 0,
      quetes: quetesRes.count || 0
    })
  }

  const ResourceBar = ({ current, max, color, label }: { current: number, max: number, color: string, label: string }) => (
    <div className="flex flex-col gap-0.5">
      <div className="flex justify-between items-center text-[9px] font-black uppercase opacity-50">
        <span>{label}</span>
        <span>{current} / {max}</span>
      </div>
      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden border border-white/5">
        <div 
          className="h-full transition-all duration-500 ease-out" 
          style={{ width: `${Math.max(0, Math.min(100, (current / max) * 100))}%`, backgroundColor: color }} 
        />
      </div>
    </div>
  )

  const QuickStat = ({ label, value, icon, color }: any) => (
    <div className="flex flex-col p-4 rounded-2xl bg-white/5 border border-white/5">
      <span className="text-2xl mb-1">{icon}</span>
      <span className="text-xl font-black" style={{ color }}>{value}</span>
      <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{label}</span>
    </div>
  )

  return (
    <div className="flex flex-col h-full p-4 md:p-8 overflow-y-auto custom-scrollbar"
      style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>

      {/* ── HEADER ── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10 pb-8 border-b border-white/5">
        <div className="max-w-2xl">
          <Badge variant="outline" className="mb-3">ADMINISTRATION MJ</Badge>
          <h2 className="text-4xl font-black tracking-tighter uppercase italic">
            Univers : <span style={{ color: 'var(--color-light)' }}>{sessionActive?.nom}</span>
          </h2>
          {sessionActive?.description && (
            <p className="text-sm opacity-60 mt-2 italic leading-relaxed">"{sessionActive.description}"</p>
          )}
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
          <QuickStat label="Modèles" value={stats.templates} icon="📋" color="var(--color-main)" />
          <QuickStat label="Objets" value={stats.items} icon="🎒" color="#10b981" />
          <QuickStat label="Sorts" value={stats.competences} icon="✨" color="#a855f7" />
          <QuickStat label="Quêtes" value={stats.quetes} icon="📜" color="#f59e0b" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 mb-10">
        
        {/* ── COLONNE GAUCHE : JOUEURS ── */}
        <div className="xl:col-span-5 flex flex-col gap-6">
          <Card className="flex flex-col gap-4 border-l-4 border-l-green-500">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="font-black uppercase tracking-widest text-xs opacity-50 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Joueurs
              </h3>
              <Badge>{joueurs.length}</Badge>
            </div>
            <div className="flex flex-col gap-4">
              {joueurs.length === 0 && <p className="text-xs italic opacity-30 py-8 text-center bg-black/10 rounded-xl">L'aventure attend ses héros...</p>}
              {joueurs.map(j => (
                <button 
                  key={j.id} 
                  onClick={() => { setPnjControle(j); setPageCourante('mon-personnage') }}
                  className="flex flex-col gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-main/50 hover:bg-main/5 transition-all text-left group"
                >
                  <div className="flex justify-between items-center">
                    <p className="font-black text-sm uppercase tracking-tight" style={{ color: 'var(--color-light)' }}>{j.nom}</p>
                    <span className="text-[9px] font-black opacity-0 group-hover:opacity-40 transition-opacity uppercase">Gérer Fiche →</span>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    <ResourceBar current={j.hp_actuel} max={j.hp_max} color="#ef4444" label="PV" />
                    <div className="grid grid-cols-2 gap-4">
                      <ResourceBar current={j.mana_actuel} max={j.mana_max} color="#3b82f6" label="Mana" />
                      <ResourceBar current={j.stam_actuel} max={j.stam_max} color="#eab308" label="Stam" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setPageCourante('joueurs')}>Gérer tous les joueurs</Button>
          </Card>

          <Card className="bg-gradient-to-br from-main/20 to-transparent border-main/20">
            <h3 className="font-black uppercase tracking-widest text-xs opacity-50 mb-4">Raccourcis MJ</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="secondary" onClick={() => setPageCourante('bestiaire')}>🐉 Bestiaire</Button>
              <Button size="sm" variant="secondary" onClick={() => setPageCourante('pnj')}>👤 PNJ</Button>
              <Button size="sm" variant="secondary" onClick={() => setPageCourante('items')}>🎒 Items</Button>
              <Button size="sm" variant="secondary" onClick={() => setPageCourante('competences')}>✨ Sorts</Button>
            </div>
          </Card>
        </div>

        {/* ── COLONNE CENTRALE : PNJ & MOB ACTIFS ── */}
        <div className="xl:col-span-7 flex flex-col gap-6">
          <Card className="flex-1">
            <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
              <h3 className="font-black uppercase tracking-widest text-xs opacity-50">Entités en Session</h3>
              <div className="flex gap-2">
                <Badge variant="outline">👥 {pnjs.length} PNJ</Badge>
                <Badge variant="outline">⚔️ {mobs.length} Mobs</Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...pnjs, ...mobs].length === 0 && (
                <div className="col-span-full py-20 flex flex-col items-center justify-center opacity-20 border-2 border-dashed border-white/10 rounded-3xl">
                  <span className="text-6xl mb-4">🎭</span>
                  <p className="font-black uppercase tracking-widest">Le plateau est vide</p>
                </div>
              )}
              {[...pnjs, ...mobs].slice(0, 10).map(p => (
                <Card key={p.id} className="flex-col gap-2 p-3 bg-white/5 border-white/5 hover:border-white/20 transition-all">
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-xs truncate flex items-center gap-2">
                      <span className="opacity-50">{p.type === 'PNJ' ? '👤' : '🐉'}</span>
                      {p.nom}
                    </p>
                    <button 
                      onClick={() => { setPnjControle(p); setPageCourante('mon-personnage') }}
                      className="text-[9px] font-black opacity-30 hover:opacity-100 hover:text-main transition-all uppercase"
                    >
                      Gérer
                    </button>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[8px] font-black opacity-40 uppercase">
                      <span>HP</span>
                      <span>{p.hp_actuel} / {p.hp_max}</span>
                    </div>
                    <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500/60" style={{ width: `${(p.hp_actuel / p.hp_max) * 100}%` }} />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            
            {[...pnjs, ...mobs].length > 10 && (
              <p className="text-center text-[10px] font-black opacity-30 mt-4 uppercase">Et {( [...pnjs, ...mobs].length - 10 )} autres entités...</p>
            )}
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <Card className="bg-blue-500/5 border-blue-500/20">
                <h4 className="font-black text-[10px] uppercase opacity-50 mb-2 tracking-tighter">Dernier Événement</h4>
                <p className="text-xs italic opacity-70">"L'univers de {sessionActive?.nom} s'éveille sous vos ordres."</p>
             </Card>
             <Card className="bg-purple-500/5 border-purple-500/20">
                <h4 className="font-black text-[10px] uppercase opacity-50 mb-2 tracking-tighter">Astuce</h4>
                <p className="text-xs italic opacity-70">Utilise les Modèles pour invoquer rapidement des groupes d'ennemis.</p>
             </Card>
          </div>
        </div>

      </div>
    </div>
  )
}
