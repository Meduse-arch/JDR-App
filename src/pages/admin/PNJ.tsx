import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useStore, type Personnage } from '../../store/useStore'
import CreerPersonnage from '../shared/CreerPersonnage'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { ConfirmButton } from '../../components/ui/ConfirmButton'

export default function PNJ() {
  const [pnjs,  setPnjs]  = useState<Personnage[]>([])
  const [creer, setCreer] = useState(false)
  const setPnjControle  = useStore(s => s.setPnjControle)
  const setPageCourante = useStore(s => s.setPageCourante)
  const sessionActive   = useStore(s => s.sessionActive)

  useEffect(() => { chargerPnjs() }, [])

  const chargerPnjs = async () => {
    if (!sessionActive) return
    const { data } = await supabase
      .from('session_joueurs').select('personnages(*)').eq('id_session', sessionActive.id)
    if (data)
      setPnjs(data.map((d: any) => d.personnages).filter((p: any) => p?.est_pnj === true))
  }

  const supprimerPnj = async (id: string) => {
    await supabase.from('session_joueurs').delete().eq('id_personnage', id)
    await supabase.from('personnage_stats').delete().eq('id_personnage', id)
    await supabase.from('inventaire').delete().eq('id_personnage', id)
    await supabase.from('personnage_competences').delete().eq('id_personnage', id)
    await supabase.from('personnages').delete().eq('id', id)
    chargerPnjs()
  }

  if (creer) return (
    <CreerPersonnage estPnj={true} retour={() => { setCreer(false); chargerPnjs() }} />
  )

  return (
    <div className="flex flex-col h-full p-4 md:p-8 overflow-y-auto custom-scrollbar"
      style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>

      <div className="flex justify-between items-center mb-8 gap-4">
        <h2 className="text-2xl md:text-3xl font-black tracking-tight"
          style={{
            background: 'linear-gradient(135deg, var(--color-light), var(--color-accent2))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
          Bestiaire & PNJ
        </h2>
        <Button onClick={() => setCreer(true)}>
          + Nouveau PNJ
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        {pnjs.length === 0 && (
          <div className="text-center py-20 opacity-40">
            <span className="text-6xl mb-4">👹</span>
            <p className="text-lg font-bold" style={{ color: 'var(--text-secondary)' }}>
              Aucun monstre ou PNJ dans ce bestiaire.
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
