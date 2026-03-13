import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useStore, type Personnage } from '../../store/useStore'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { sessionService } from '../../services/sessionService'

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

    // 1. Charger les joueurs
    const { data: persos } = await supabase
      .from('v_personnages')
      .select('*')
      .eq('id_session', sessionActive.id)
      .eq('type', 'Joueur')
      .eq('is_template', false)
    
    // 2. Charger les MJs de la session
    const { data: mjs } = await supabase
      .from('session_mj')
      .select('id_compte')
      .eq('id_session', sessionActive.id)

    if (persos) setPersonnages(persos)
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

  // On retire le blocage visuel du chargement


  return (
    <div className="flex flex-col h-full p-4 md:p-8 overflow-y-auto custom-scrollbar"
      style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>

      <div className="mb-8 border-b border-white/5 pb-6">
        <h2 className="text-3xl font-black uppercase italic tracking-tighter"
          style={{ background: 'linear-gradient(135deg, var(--color-light), var(--color-accent2))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          👥 Population de l'Univers
        </h2>
        <p className="text-sm opacity-50 mt-1">Gère les joueurs et les droits de Maître du Jeu</p>
      </div>

      <div className="flex flex-col gap-4">
        {personnages.length === 0 && (
          <div className="text-center py-20 opacity-40 bg-white/5 rounded-3xl border-2 border-dashed border-white/5">
            <span className="text-6xl mb-4 block">🧑</span>
            <p className="text-lg font-bold">Aucun héros n'a encore rejoint cette session.</p>
          </div>
        )}
        {personnages.map(perso => {
          const estMJ = perso.lie_au_compte ? mjsIds.includes(perso.lie_au_compte) : false
          
          return (
            <Card key={perso.id} className="flex-row justify-between items-center gap-4 hover:border-white/10 transition-all">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-lg leading-tight truncate">{perso.nom}</h3>
                  {estMJ && <Badge variant="outline" className="text-[9px] border-main text-main font-black">CO-MJ</Badge>}
                </div>
                <div className="flex gap-3 text-xs mt-1 opacity-50 uppercase font-black tracking-widest">
                  <span>HP : <span className="text-red-400">{perso.hp}</span> / {perso.hp_max}</span>
                  <span>MP : <span className="text-blue-400">{perso.mana}</span> / {perso.mana_max}</span>
                  <span>SP : <span className="text-yellow-400">{perso.stam}</span> / {perso.stam_max}</span>
                </div>
              </div>

              <div className="flex gap-2">
                {/* Seul un ADMIN peut nommer des MJ */}
                {roleEffectif === 'admin' && perso.lie_au_compte && (
                  <Button 
                    variant={estMJ ? 'secondary' : 'primary'} 
                    size="sm" 
                    onClick={() => toggleMJ(perso.lie_au_compte!, estMJ)}
                    className="text-[10px] uppercase font-black px-3"
                  >
                    {estMJ ? 'Retirer MJ' : 'Nommer MJ'}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setPnjControle(perso); setPageCourante('mon-personnage') }}
                  className="border border-white/5 text-[10px] uppercase font-black px-3"
                >
                  Fiche
                </Button>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
