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
  const [boss, setBoss] = useState<Personnage[]>([])
  const [filtreEntites, setFiltreEntites] = useState<'Tous' | 'PNJ' | 'Monstre' | 'Boss'>('Tous')
  const [stats, setStats] = useState({
    items: 0,
    competences: 0,
    templates: 0,
    quetes: 0
  })

  useEffect(() => {
    if (sessionActive) {
      chargerDonnees()
      const channel = supabase
        .channel('dashboard-admin-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'personnages', filter: `id_session=eq.${sessionActive.id}` }, () => chargerDonnees())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'quetes', filter: `id_session=eq.${sessionActive.id}` }, () => chargerDonnees())
        .subscribe()
      return () => { supabase.removeChannel(channel) }
    }
  }, [sessionActive])

  const chargerDonnees = async () => {
    if (!sessionActive) return
    const { data: persos } = await supabase.from('personnages').select('*').eq('id_session', sessionActive.id).eq('is_template', false)
    if (persos) {
      setJoueurs(persos.filter(p => p.type === 'Joueur'))
      setPnjs(persos.filter(p => p.type === 'PNJ'))
      setMobs(persos.filter(p => p.type === 'Monstre'))
      setBoss(persos.filter(p => p.type === 'Boss'))
    }
    const [itemsRes, compRes, tmplRes, queteRes] = await Promise.all([
      supabase.from('items').select('id', { count: 'exact', head: true }).eq('id_session', sessionActive.id),
      supabase.from('competences').select('id', { count: 'exact', head: true }).eq('id_session', sessionActive.id),
      supabase.from('personnages').select('id', { count: 'exact', head: true }).eq('id_session', sessionActive.id).eq('is_template', true),
      supabase.from('quetes').select('id', { count: 'exact', head: true }).eq('id_session', sessionActive.id)
    ])
    setStats({ items: itemsRes.count || 0, competences: compRes.count || 0, templates: tmplRes.count || 0, quetes: queteRes.count || 0 })
  }

  const ResourceBar = ({ current, max, color, label }: { current: number, max: number, color: string, label: string }) => (
    <div className="flex flex-col gap-0.5">
      <div className="flex justify-between items-center text-[9px] font-black uppercase opacity-50">
        <span>{label}</span>
        <span>{current}/{max}</span>
      </div>
      <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
        <div className="h-full transition-all duration-500 ease-out" style={{ width: `${Math.max(0, Math.min(100, (current / max) * 100))}%`, backgroundColor: color }} />
      </div>
    </div>
  )

  const QuickStat = ({ label, value, icon, color }: any) => (
    <div className="flex flex-col p-3 rounded-2xl bg-white/5 border border-white/5 items-center justify-center text-center">
      <span className="text-xl mb-1">{icon}</span>
      <span className="text-lg font-black" style={{ color }}>{value}</span>
      <span className="text-[8px] font-black uppercase tracking-widest opacity-40">{label}</span>
    </div>
  )

  return (
    <div className="flex flex-col h-full p-4 md:p-6 overflow-hidden" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      {/* ── HEADER COMPACT ── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 shrink-0">
        <div>
          <Badge variant="outline" className="mb-1 text-[10px]">ADMINISTRATION MJ</Badge>
          <h2 className="text-2xl font-black tracking-tighter uppercase italic leading-tight">
            Univers : <span style={{ color: 'var(--color-light)' }}>{sessionActive?.nom}</span>
          </h2>
        </div>
        <div className="grid grid-cols-4 gap-2 w-full lg:w-auto">
          <QuickStat label="Modèles" value={stats.templates} icon="📋" color="var(--color-main)" />
          <QuickStat label="Quêtes" value={stats.quetes} icon="📜" color="#f59e0b" />
          <QuickStat label="Objets" value={stats.items} icon="🎒" color="#10b981" />
          <QuickStat label="Sorts" value={stats.competences} icon="✨" color="#a855f7" />
          <QuickStat label="Quêtes" value={stats.quetes} icon="📜" color="#f59e0b" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 flex-1 min-h-0 items-stretch">
        {/* ── COLONNE GAUCHE ── */}
        <div className="xl:col-span-5 flex flex-col gap-4 min-h-0">
          <Card className="flex-1 flex flex-col gap-4 border-l-4 border-l-green-500 min-h-0">
            <div className="flex justify-between items-center border-b border-white/5 pb-2 shrink-0">
              <h3 className="font-black uppercase tracking-widest text-[10px] opacity-50 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Joueurs
              </h3>
              <Badge className="text-[10px]">{joueurs.length}</Badge>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-2">
              {joueurs.length === 0 && <p className="text-[10px] italic opacity-30 py-6 text-center">Aucun joueur en ligne...</p>}
              {joueurs.map(j => (
                <button key={j.id} onClick={() => { setPnjControle(j); setPageCourante('mon-personnage') }} className="flex flex-col gap-2 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-main/50 hover:bg-main/5 transition-all text-left group shrink-0">
                  <div className="flex justify-between items-center">
                    <p className="font-black text-xs uppercase" style={{ color: 'var(--color-light)' }}>{j.nom}</p>
                    <span className="text-[8px] font-black opacity-0 group-hover:opacity-40 transition-opacity uppercase">Fiche →</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <ResourceBar current={j.hp_actuel} max={j.hp_max} color="#ef4444" label="PV" />
                    <div className="grid grid-cols-2 gap-3">
                      <ResourceBar current={j.mana_actuel} max={j.mana_max} color="#3b82f6" label="Mana" />
                      <ResourceBar current={j.stam_actuel} max={j.stam_max} color="#eab308" label="Stam" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setPageCourante('joueurs')} className="mt-auto text-[10px] py-1 h-auto">Gérer tous les joueurs</Button>
          </Card>

          <Card className="bg-gradient-to-br from-main/10 to-transparent border-main/20 shrink-0 p-4">
            <h3 className="font-black uppercase tracking-widest text-[9px] opacity-50 mb-3">Accès Rapide MJ</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="secondary" onClick={() => setPageCourante('bestiaire')} className="text-[10px] py-1.5">🐉 Bestiaire</Button>
              <Button size="sm" variant="secondary" onClick={() => setPageCourante('pnj')} className="text-[10px] py-1.5">👤 PNJ</Button>
              <Button size="sm" variant="secondary" onClick={() => setPageCourante('items')} className="text-[10px] py-1.5">🎒 Items</Button>
              <Button size="sm" variant="secondary" onClick={() => setPageCourante('competences')} className="text-[10px] py-1.5">✨ Sorts</Button>
            </div>
          </Card>
        </div>

        {/* ── COLONNE DROITE : ENTITÉS (Alignée sur le bas de l'Accès Rapide) ── */}
        <div className="xl:col-span-7 flex flex-col min-h-0">
          <Card className="h-full flex flex-col min-h-0 border-main/10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 border-b border-white/5 pb-3 gap-3 shrink-0">
              <h3 className="font-black uppercase tracking-widest text-[10px] opacity-50">Entités en Session</h3>
              <div className="flex gap-1 p-0.5 bg-black/20 rounded-lg shrink-0 overflow-x-auto max-w-full">
                {(['Tous', 'PNJ', 'Monstre', 'Boss'] as const).map(f => (
                  <button key={f} onClick={() => setFiltreEntites(f)} className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase transition-all whitespace-nowrap ${filtreEntites === f ? 'bg-main text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}>
                    {f === 'Monstre' ? 'Mobs' : f}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto custom-scrollbar pr-1 flex-1 min-h-0">
              {(() => {
                const filtered = [...pnjs, ...mobs, ...boss].filter(p => filtreEntites === 'Tous' || p.type === filtreEntites)
                if (filtered.length === 0) return (
                  <div className="col-span-full py-12 flex flex-col items-center justify-center opacity-10 border border-dashed border-white/10 rounded-2xl">
                    <span className="text-4xl mb-2">🎭</span>
                    <p className="text-[10px] font-black uppercase">Aucune entité trouvée</p>
                  </div>
                )
                return filtered.map(p => (
                  <Card key={p.id} className="flex-col gap-2 p-2.5 bg-white/5 border-white/5 hover:border-main/30 transition-all shrink-0">
                    <div className="flex justify-between items-center">
                      <p className="font-bold text-[11px] truncate flex items-center gap-1.5">
                        <span className="opacity-50 text-[12px]">{p.type === 'PNJ' ? '👤' : p.type === 'Boss' ? '💀' : '🐉'}</span>
                        {p.nom}
                        {p.type === 'Boss' && <span className="text-[7px] bg-red-500/20 text-red-400 px-1 rounded border border-red-500/20">BOSS</span>}
                      </p>
                      <button onClick={() => { setPnjControle(p); setPageCourante('mon-personnage') }} className="text-[8px] font-black opacity-20 hover:opacity-100 hover:text-main uppercase transition-colors">Gérer</button>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[8px] font-black opacity-40 uppercase">
                        <span>HP</span>
                        <span>{p.hp_actuel}/{p.hp_max}</span>
                      </div>
                      <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500/60 transition-all duration-300" style={{ width: `${(p.hp_actuel / p.hp_max) * 100}%` }} />
                      </div>
                    </div>
                  </Card>
                ))
              })()}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
