import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useStore, type Personnage } from '../../store/useStore'

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

      <h2 className="text-2xl font-black mb-8"
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
          <div key={perso.id}
            className="p-5 rounded-2xl flex justify-between items-center gap-4"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div>
              <h3 className="font-bold text-lg">{perso.nom}</h3>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                HP : {perso.hp_actuel} / {perso.hp_max}
              </p>
            </div>
            <button
              onClick={() => { setPnjControle(perso); setPageCourante('mon-personnage') }}
              className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:-translate-y-0.5 shrink-0"
              style={{ background: 'linear-gradient(135deg, var(--color-main), var(--color-accent2))' }}>
              Gérer
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}