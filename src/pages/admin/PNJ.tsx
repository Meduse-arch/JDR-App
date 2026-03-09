import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useStore, type Personnage } from '../../store/useStore'
import CreerPersonnage from '../shared/CreerPersonnage'

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

      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-black"
          style={{
            background: 'linear-gradient(135deg, var(--color-light), var(--color-accent2))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
          Bestiaire & PNJ
        </h2>
        <button
          onClick={() => setCreer(true)}
          className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg, var(--color-main), var(--color-accent2))' }}>
          + Nouveau PNJ
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {pnjs.length === 0 && (
          <p className="text-center mt-16" style={{ color: 'var(--text-secondary)' }}>
            Aucun PNJ pour le moment
          </p>
        )}
        {pnjs.map(pnj => (
          <div key={pnj.id}
            className="p-5 rounded-2xl flex justify-between items-center gap-4"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div>
              <h3 className="font-bold text-lg">{pnj.nom}</h3>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                HP : {pnj.hp_actuel} / {pnj.hp_max}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => { setPnjControle(pnj); setPageCourante('mon-personnage') }}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, var(--color-main), var(--color-accent2))' }}>
                Gérer
              </button>
              <button
                onClick={() => supprimerPnj(pnj.id)}
                className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
                style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.2)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)')}>
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}