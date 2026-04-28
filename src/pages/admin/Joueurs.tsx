import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useStore, type Personnage } from '../../store/useStore'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { sessionService } from '../../services/sessionService'
import { peerService } from '../../services/peerService'
import { personnageService } from '../../services/personnageService'
import { Users, User, Heart, Droplets, Zap } from 'lucide-react'

export default function Joueurs() {
  const [personnages, setPersonnages] = useState<Personnage[]>([])
  const [mjsIds, setMjsIds] = useState<string[]>([])

  const setPnjControle  = useStore(s => s.setPnjControle)
  const setPageCourante = useStore(s => s.setPageCourante)
  const sessionActive   = useStore(s => s.sessionActive)
  const roleEffectif    = useStore(s => s.roleEffectif)

  useEffect(() => { 
    if (sessionActive) chargerDonnees() 
  }, [sessionActive])

  const chargerDonnees = async () => {
    if (!sessionActive) return

    // 1. Charger les personnages (Joueur)
    let persos: Personnage[] = []
    if (peerService.isHost) {
      // LOGIQUE MJ : On pioche dans le SQLite local
      const db = (window as any).db;
      const res = await db.personnages.getAll();
      if (res.success) {
        const raw = res.data.filter((p: any) => 
          p.id_session === sessionActive.id && 
          p.type === 'Joueur' && 
          p.is_template === 0
        );
        persos = await personnageService.hydraterPersonnages(raw);
      }
    } else {
      // LOGIQUE JOUEUR : On pioche dans Supabase (Fallback)
      const { data } = await supabase
        .from('v_personnages')
        .select('*')
        .eq('id_session', sessionActive.id)
        .eq('type', 'Joueur')
        .eq('is_template', false)
      if (data) persos = data as any[]
    }
    
    // 2. Charger les MJs de la session (Toujours Supabase car c'est au niveau session)
    const { data: mjs } = await supabase
      .from('session_mj')
      .select('id_compte')
      .eq('id_session', sessionActive.id)

    setPersonnages(persos)
    if (mjs) setMjsIds(mjs.map(m => m.id_compte))
  }

  const toggleMJ = async (idCompte: string, estDejaMJ: boolean) => {
    if (!sessionActive) return
    let success = false
    if (estDejaMJ) {
      success = await sessionService.retirerMJ(sessionActive.id, idCompte)
    } else {
      success = await sessionService.ajouterMJ(sessionActive.id, idCompte)
    }
    if (success) chargerDonnees()
  }

  return (
    <div className="flex flex-col h-full p-4 md:p-8 overflow-y-auto custom-scrollbar">

      <div className="mb-10 border-b border-theme pb-8 flex flex-col gap-2">
        <h2 className="text-3xl font-cinzel font-black uppercase tracking-widest text-theme-main flex items-center gap-4">
          <Users size={32} /> Population de l'Univers
        </h2>
        <p className="text-sm font-garamond opacity-60 italic">Gère les aventuriers et les droits de Maître du Jeu</p>
      </div>

      <div className="flex flex-col gap-6">
        {personnages.length === 0 && (
          <div className="text-center py-24 opacity-20 bg-black/20 rounded-sm border-2 border-dashed border-theme/20">
            <User size={64} className="mx-auto mb-4" />
            <p className="text-xl font-cinzel font-bold uppercase tracking-widest">Aucun héros n'a encore rejoint cette épopée.</p>
          </div>
        )}
        {personnages.map(perso => {
          const estMJ = perso.lie_au_compte ? mjsIds.includes(perso.lie_au_compte) : false
          
          return (
            <Card key={perso.id} className="flex-row justify-between items-center gap-6 group hover:border-theme-main/30 transition-all bg-card/40 p-6 rounded-sm">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-4">
                  <h3 className="font-cinzel font-black text-xl uppercase tracking-widest text-primary">{perso.nom}</h3>
                  {estMJ && <Badge variant="outline" className="text-[9px] border-theme-main text-theme-main font-black font-cinzel shadow-sm bg-theme-main/5">CO-MJ</Badge>}
                </div>
                <div className="flex gap-6 text-[10px] mt-2 opacity-60 uppercase font-cinzel font-black tracking-widest">
                  <span className="flex items-center gap-1.5"><Heart size={12} className="text-red-400" /> {perso.hp} / {perso.hp_max}</span>
                  <span className="flex items-center gap-1.5"><Droplets size={12} className="text-blue-400" /> {perso.mana} / {perso.mana_max}</span>
                  <span className="flex items-center gap-1.5"><Zap size={12} className="text-yellow-400" /> {perso.stam} / {perso.stam_max}</span>
                </div>
              </div>

              <div className="flex gap-3">
                {roleEffectif === 'admin' && perso.lie_au_compte && (
                  <Button 
                    variant={estMJ ? 'secondary' : 'primary'} 
                    size="sm" 
                    onClick={() => toggleMJ(perso.lie_au_compte!, estMJ)}
                    className="text-[10px] uppercase font-black px-6 font-cinzel"
                  >
                    {estMJ ? 'Retirer MJ' : 'Nommer MJ'}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setPnjControle(perso); setPageCourante('mon-personnage') }}
                  className="border border-theme/20 text-[10px] uppercase font-black px-6 font-cinzel hover:bg-black/20"
                >
                  Consulter
                </Button>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
