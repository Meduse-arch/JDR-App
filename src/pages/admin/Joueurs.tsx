import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useStore, type Personnage } from '../../store/useStore'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'

export default function Joueurs() {
  const [personnages, setPersonnages] = useState<Personnage[]>([])
  const setPnjControle  = useStore(s => s.setPnjControle)
  const setPageCourante = useStore(s => s.setPageCourante)
  const sessionActive   = useStore(s => s.sessionActive)

  useEffect(() => { chargerJoueurs() }, [])

  const chargerJoueurs = async () => {
    if (!sessionActive) return
    const { data } = await supabase
      .from('session_joueurs').select('personnages(*)').eq('id_session', sessionActive.id)
    if (data) {
      setPersonnages(
        data.map((d: any) => d.personnages).filter((p: any) => p?.est_pnj === false)
      )
    }
  }

  return (
    <div className="flex flex-col h-full p-4 md:p-8 overflow-y-auto custom-scrollbar"
      style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>

      <h2 className="text-2xl md:text-3xl font-black mb-8 tracking-tight"
        style={{
          background: 'linear-gradient(135deg, var(--color-light), var(--color-accent2))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>
        Joueurs
      </h2>

      <div className="flex flex-col gap-4">
        {personnages.length === 0 && (
          <p className="text-center mt-16" style={{ color: 'var(--text-secondary)' }}>
            Aucun joueur dans cette session
          </p>
        )}
        {personnages.map(perso => (
          <Card key={perso.id} className="flex-row justify-between items-center gap-4">
            <div>
              <h3 className="font-bold text-lg leading-tight">{perso.nom}</h3>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                HP : <span className="font-black text-[#ef4444]">{perso.hp_actuel}</span> / {perso.hp_max}
              </p>
            </div>
            <Button
              onClick={() => { setPnjControle(perso); setPageCourante('mon-personnage') }}
              className="shrink-0"
            >
              Gérer la fiche
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
