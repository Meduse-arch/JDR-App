import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'

type Compte = { id: string; pseudo: string; role: string }

export default function GererMJ() {
  const compte        = useStore(s => s.compte)
  const sessionActive = useStore(s => s.sessionActive) as any

  const [mjSession,   setMjSession]   = useState<Compte[]>([])
  const [disponibles, setDisponibles] = useState<Compte[]>([])
  const [recherche,   setRecherche]   = useState('')

  useEffect(() => { chargerMJs() }, [])

  const chargerMJs = async () => {
    if (!sessionActive) return
    const { data: mjData } = await supabase
      .from('session_mj').select('comptes(*)').eq('id_session', sessionActive.id)
    if (mjData) setMjSession(mjData.map((d: any) => d.comptes))

    const { data: comptesData } = await supabase.from('comptes').select('*').in('role', ['joueur', 'mj'])
    if (comptesData && mjData) {
      const idsDeja = mjData.map((d: any) => d.comptes.id)
      setDisponibles(comptesData.filter((c: Compte) => !idsDeja.includes(c.id)))
    }
  }

  const ajouterMJ = async (idCompte: string) => {
    await supabase.from('session_mj').insert({ id_session: sessionActive?.id, id_compte: idCompte })
    chargerMJs()
  }
  const retirerMJ = async (idCompte: string) => {
    await supabase.from('session_mj').delete().eq('id_session', sessionActive?.id).eq('id_compte', idCompte)
    chargerMJs()
  }

  const peutModifier = compte?.role === 'admin' || sessionActive?.cree_par === compte?.id
  const disponiblesFiltres = disponibles.filter(c =>
    c.pseudo.toLowerCase().includes(recherche.toLowerCase())
  )

  const cardStyle = { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }
  const inputStyle = { backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)' }

  return (
    <div className="flex flex-col h-full p-4 md:p-8 overflow-y-auto custom-scrollbar"
      style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>

      <h2 className="text-2xl font-black mb-8"
        style={{
          background: 'linear-gradient(135deg, var(--color-light), var(--color-accent2))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>
        Gérer les MJ — {sessionActive?.nom}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* MJ actuels */}
        <div className="flex flex-col gap-4">
          <h3 className="font-bold" style={{ color: 'var(--text-secondary)' }}>MJ de la session</h3>
          {mjSession.length === 0 && (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Aucun MJ assigné</p>
          )}
          {mjSession.map(mj => (
            <div key={mj.id} className="px-4 py-3 rounded-xl flex justify-between items-center" style={cardStyle}>
              <div>
                <p className="font-semibold">{mj.pseudo}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{mj.role}</p>
              </div>
              {peutModifier && (
                <button
                  onClick={() => retirerMJ(mj.id)}
                  className="px-3 py-1 rounded-lg text-xs font-bold transition-all"
                  style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                  Retirer
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Ajouter un MJ */}
        {peutModifier ? (
          <div className="flex flex-col gap-4">
            <h3 className="font-bold" style={{ color: 'var(--text-secondary)' }}>Ajouter un MJ</h3>
            <input
              type="text"
              placeholder="🔍 Rechercher un compte..."
              value={recherche}
              onChange={e => setRecherche(e.target.value)}
              className="px-4 py-2 rounded-xl outline-none text-sm"
              style={inputStyle}
            />
            {disponiblesFiltres.length === 0 && (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Aucun compte disponible</p>
            )}
            {disponiblesFiltres.map(c => (
              <div key={c.id} className="px-4 py-3 rounded-xl flex justify-between items-center" style={cardStyle}>
                <div>
                  <p className="font-semibold">{c.pseudo}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.role}</p>
                </div>
                <button
                  onClick={() => ajouterMJ(c.id)}
                  className="px-3 py-1 rounded-lg text-xs font-bold text-white transition-all"
                  style={{ backgroundColor: 'var(--color-main)' }}>
                  Ajouter
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-start pt-8">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Seul le créateur de la session ou un admin peut ajouter ou retirer des MJ.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
