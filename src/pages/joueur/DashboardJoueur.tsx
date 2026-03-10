import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useStore, type Personnage } from '../../Store/useStore'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { CONFIG_RESSOURCES } from '../../utils/constants'
import { queteService, Quete } from '../../services/queteService'

export default function DashboardJoueur() {
  const compte = useStore(s => s.compte)
  const sessionActive = useStore(s => s.sessionActive)
  const setPageCourante = useStore(s => s.setPageCourante)
  
  const [personnage, setPersonnage] = useState<Personnage | null>(null)
  const [quetesSuivies, setQuetesSuivies] = useState<Quete[]>([])
  const [indexQuete, setIndexQuete] = useState(0)
  const [queteDetail, setQueteDetail] = useState<Quete | null>(null)
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    if (compte && sessionActive) chargerPersonnage()
  }, [compte, sessionActive])

  useEffect(() => {
    if (personnage) {
      chargerQuetes()
      const channel = supabase
        .channel('dashboard-joueur-' + personnage.id)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'quetes' }, () => chargerQuetes())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'personnage_quetes', filter: `id_personnage=eq.${personnage.id}` }, () => chargerQuetes())
        .subscribe()
      return () => { supabase.removeChannel(channel) }
    }
  }, [personnage])

  const chargerPersonnage = async () => {
    setChargement(true)
    const { data } = await supabase
      .from('personnages').select('*').eq('id_session', sessionActive?.id).eq('lie_au_compte', compte?.id).eq('type', 'Joueur').eq('is_template', false).maybeSingle()
    if (data) setPersonnage(data as Personnage)
    setChargement(false)
  }

  const chargerQuetes = async () => {
    if (!personnage) return
    const data = await queteService.getQuetesPersonnage(personnage.id)
    const suivies = data.filter((q: any) => q.suivie === true)
    setQuetesSuivies(suivies)
    if (indexQuete >= suivies.length) setIndexQuete(0)
  }

  const changerQuete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIndexQuete(prev => (prev + 1) % quetesSuivies.length)
  }

  // On retire le blocage visuel du chargement


  if (!personnage) return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center gap-8">
      <span className="text-8xl">🎭</span>
      <h2 className="text-3xl font-black uppercase">Incarne ton destin</h2>
      <Button size="lg" onClick={() => setPageCourante('mon-personnage')}>✨ Créer ma Fiche</Button>
    </div>
  )

  const queteAffichee = quetesSuivies[indexQuete]

  return (
    <div className="flex flex-col h-full p-4 md:p-8 overflow-y-auto custom-scrollbar" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 pb-8 border-b border-white/5 gap-6">
        <div>
          <Badge variant="outline" className="mb-2">AVENTURIER</Badge>
          <h2 className="text-4xl font-black tracking-tighter uppercase italic">Salutations, <span className="text-white">{personnage.nom}</span></h2>
        </div>
        <Button size="lg" onClick={() => setPageCourante('mon-personnage')}>📖 Ouvrir la Fiche</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* COLONNE GAUCHE */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <Card className="bg-gradient-to-br from-red-500/10 to-transparent">
            <h3 className="font-black uppercase tracking-widest text-[10px] opacity-50 mb-6 flex items-center gap-2">❤️ État Vital</h3>
            <div className="flex flex-col gap-6">
              {[{ k: 'hp', current: personnage.hp_actuel, max: personnage.hp_max, ...CONFIG_RESSOURCES.hp },
                { k: 'mana', current: personnage.mana_actuel, max: personnage.mana_max, ...CONFIG_RESSOURCES.mana },
                { k: 'stam', current: personnage.stam_actuel, max: personnage.stam_max, ...CONFIG_RESSOURCES.stam }
              ].map(res => (
                <div key={res.k} className="flex flex-col gap-2">
                  <div className="flex justify-between items-end"><span className="text-[10px] font-bold uppercase opacity-60">{res.label}</span><span className="text-sm font-black">{res.current}/{res.max}</span></div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div className="h-full transition-all duration-500" style={{ width: `${(res.current / res.max) * 100}%`, backgroundColor: res.color }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="flex flex-col gap-4">
            <h3 className="font-black uppercase tracking-widest text-[10px] opacity-50">Accès Rapide</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPageCourante('mon-inventaire')}>🎒 Sac</Button>
              <Button variant="secondary" size="sm" onClick={() => setPageCourante('mes-competences')}>✨ Sorts</Button>
              <Button variant="secondary" size="sm" onClick={() => setPageCourante('mes-quetes')} className="col-span-2">📜 Journal de Quêtes</Button>
            </div>
          </Card>
        </div>

        {/* COLONNE DROITE */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* L'UNIVERS */}
          <Card className="bg-white/[0.02]">
            <h3 className="font-black uppercase tracking-widest text-[10px] opacity-50 mb-6">L'Univers de la Session</h3>
            <div className="p-6 rounded-2xl bg-black/20 border border-white/5">
              <h4 className="text-xl font-bold mb-2 text-main">{sessionActive?.nom}</h4>
              <p className="text-sm opacity-60 leading-relaxed italic">"{sessionActive?.description || "Aucune description."}"</p>
            </div>
          </Card>

          {/* BOX QUÊTE UNIQUE */}
          <Card className="flex-1 bg-white/[0.02]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black uppercase tracking-widest text-[10px] opacity-50">📍 Objectif Prioritaire</h3>
              {quetesSuivies.length > 1 && (
                <Button size="sm" variant="ghost" onClick={changerQuete} className="text-[10px] uppercase font-black tracking-widest">
                  Changer ({indexQuete + 1}/{quetesSuivies.length}) ↻
                </Button>
              )}
            </div>

            {!queteAffichee ? (
              <div className="p-10 text-center border-2 border-dashed border-white/5 rounded-2xl opacity-30 cursor-pointer hover:opacity-50 transition-all" onClick={() => setPageCourante('mes-quetes')}>
                <span className="text-3xl block mb-2">📜</span>
                <p className="text-xs font-bold uppercase tracking-widest">Aucune quête importée</p>
                <p className="text-[10px] mt-1 opacity-60">Utilise l'étoile dans ton journal pour l'afficher ici</p>
              </div>
            ) : (
              <Card key={queteAffichee.id} hoverEffect className="bg-main/5 border-main/30 flex-col gap-4 p-6 group cursor-pointer" onClick={() => setQueteDetail(queteAffichee)}>
                <div className="flex justify-between items-start">
                  <h4 className="font-black text-xl uppercase tracking-tight text-white group-hover:text-main transition-colors">{queteAffichee.titre}</h4>
                  <Badge variant="success" className="uppercase">SUIVI</Badge>
                </div>
                <p className="text-sm opacity-70 italic line-clamp-3 leading-relaxed">"{queteAffichee.description}"</p>
                
                <div className="mt-auto pt-4 border-t border-white/5 flex justify-between items-center">
                  <div className="flex gap-2">
                    {queteAffichee.quete_recompenses?.map((r, i) => (
                      <span key={i} className="text-[10px] font-black bg-main/10 text-main px-2 py-1 rounded border border-main/10 uppercase">
                        {r.type === 'Item' ? `🎁 ${r.items?.nom}` : `✨ Recompense`}
                      </span>
                    ))}
                  </div>
                  <span className="text-[10px] font-black opacity-30 uppercase tracking-widest group-hover:opacity-100 transition-opacity">Voir détails →</span>
                </div>
              </Card>
            )}
          </Card>
        </div>
      </div>

      {/* MODAL DETAIL (Copie du fonctionnement MesQuetes) */}
      {queteDetail && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4" onClick={() => setQueteDetail(null)}>
          <Card className="max-w-xl w-full p-8 gap-6 animate-in zoom-in duration-200 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start border-b border-white/5 pb-4">
              <div>
                <Badge className="mb-2 uppercase tracking-tighter" variant="success">SUIVI</Badge>
                <h3 className="text-2xl font-black uppercase tracking-tighter">{queteDetail.titre}</h3>
              </div>
              <button className="text-2xl opacity-20 hover:opacity-100 transition-opacity" onClick={() => setQueteDetail(null)}>✕</button>
            </div>

            <div className="flex flex-col gap-6">
              <p className="text-base leading-relaxed opacity-80 whitespace-pre-wrap italic">
                {queteDetail.description || "Aucune instruction supplémentaire."}
              </p>
              
              <div className="flex flex-col gap-3">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Récompenses promises :</p>
                <div className="grid grid-cols-1 gap-2">
                  {queteDetail.quete_recompenses?.map((r, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/10 font-bold text-sm flex items-center gap-3">
                      <span className="text-xl">{r.type === 'Item' ? '🎁' : '✨'}</span>
                      <div>
                        <p className="text-xs opacity-40 uppercase font-black tracking-tighter">{r.type === 'Item' ? 'Objet de quête' : 'Bonus spécial'}</p>
                        <p className="text-base">{r.type === 'Item' ? `${r.items?.nom} (x${r.valeur})` : r.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <Button className="mt-4 w-full" variant="secondary" onClick={() => setQueteDetail(null)}>Fermer</Button>
          </Card>
        </div>
      )}
    </div>
  )
}
