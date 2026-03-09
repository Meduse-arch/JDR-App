import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useStore, type Personnage } from '../../store/useStore'

export default function DashboardAdmin() {
  const sessionActive   = useStore(s => s.sessionActive)
  const setPageCourante = useStore(s => s.setPageCourante)
  const setPnjControle  = useStore(s => s.setPnjControle)

  const [joueurs,    setJoueurs]    = useState<Personnage[]>([])
  const [pnjs,       setPnjs]       = useState<Personnage[]>([])
  const [chargement, setChargement] = useState(true)

  useEffect(() => { chargerTable() }, [sessionActive])

  const chargerTable = async () => {
    if (!sessionActive) { setChargement(false); return }
    const { data } = await supabase
      .from('session_joueurs').select('personnages(*, comptes(pseudo))').eq('id_session', sessionActive.id)
    if (data) {
      const persos = data.map((d: any) => d.personnages).filter(Boolean)
      setJoueurs(persos.filter((p: any) => !p.est_pnj))
      setPnjs(persos.filter((p: any) => p.est_pnj).slice(0, 4))
    }
    setChargement(false)
  }

  if (chargement) return (
    <div className="p-8 animate-pulse" style={{ color: 'var(--text-muted)' }}>
      Installation de la table...
    </div>
  )
  if (!sessionActive) return (
    <div className="flex flex-col items-center justify-center h-full gap-4"
      style={{ color: 'var(--text-secondary)' }}>
      <span className="text-4xl">👑</span>
      <p>Sélectionne ou crée une session depuis le menu.</p>
    </div>
  )

  const cardStyle = { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }

  return (
    <div className="flex flex-col h-full p-4 md:p-8 overflow-y-auto custom-scrollbar"
      style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>

      <div className="mb-8">
        <h2 className="text-2xl md:text-3xl font-black mb-1">
          Panneau du{' '}
          <span style={{
            background: 'linear-gradient(135deg, var(--color-light), var(--color-accent2))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>Maître du Jeu</span>
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>Session active : {sessionActive.nom}</p>
      </div>

      {/* Raccourcis */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Bestiaire', emoji: '👹', id: 'pnj' },
          { label: 'Créer un Item', emoji: '📚', id: 'items' },
          { label: 'Dés Cachés', emoji: '🎲', id: 'lancer-des' },
        ].map(btn => (
          <button key={btn.id} onClick={() => setPageCourante(btn.id)}
            className="p-4 rounded-xl flex items-center gap-3 transition-all font-bold hover:-translate-y-0.5"
            style={cardStyle}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-main)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
            <span className="text-2xl">{btn.emoji}</span>
            <span className="text-sm">{btn.label}</span>
          </button>
        ))}
        <button onClick={chargerTable}
          className="p-4 rounded-xl flex items-center justify-center gap-2 transition-all font-bold hover:-translate-y-0.5"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-main) 15%, transparent)',
            color: 'var(--color-light)',
            border: '1px solid color-mix(in srgb, var(--color-main) 35%, transparent)',
          }}>
          <span>🔄</span><span className="text-sm">Rafraîchir</span>
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Aventuriers */}
        <div className="xl:col-span-2 p-6 rounded-2xl" style={cardStyle}>
          <h3 className="text-base font-bold mb-4" style={{ color: 'var(--text-secondary)' }}>
            🛡️ Les Aventuriers
          </h3>
          {joueurs.length === 0 ? (
            <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>
              Aucun joueur n'a créé de personnage.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {joueurs.map(j => (
                <div key={j.id} className="p-4 rounded-xl"
                  style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                  <p className="font-bold text-lg mb-0.5" style={{ color: 'var(--color-light)' }}>{j.nom}</p>
                  <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                    Joué par {j.comptes?.pseudo || '?'}
                  </p>
                  {[
                    { emoji: '❤️', a: j.hp_actuel,   m: j.hp_max,   c: '#ef4444' },
                    { emoji: '💧', a: j.mana_actuel, m: j.mana_max, c: '#3b82f6' },
                    { emoji: '⚡', a: j.stam_actuel, m: j.stam_max, c: '#eab308' },
                  ].map(r => (
                    <div key={r.emoji} className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs w-5">{r.emoji}</span>
                      <div className="flex-1 rounded-full h-2" style={{ backgroundColor: 'var(--bg-app)' }}>
                        <div className="h-2 rounded-full"
                          style={{ width: `${Math.min(100, (r.a / r.m) * 100)}%`, backgroundColor: r.c }} />
                      </div>
                      <span className="text-xs font-mono w-8 text-right" style={{ color: 'var(--text-muted)' }}>
                        {r.a}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PNJ rapide */}
        <div className="p-6 rounded-2xl" style={cardStyle}>
          <h3 className="text-base font-bold mb-4" style={{ color: 'var(--text-secondary)' }}>
            👤 Accès Rapide PNJ
          </h3>
          {pnjs.length === 0 ? (
            <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>Aucun PNJ créé.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {pnjs.map(pnj => (
                <div key={pnj.id} className="flex items-center justify-between p-3 rounded-xl"
                  style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                  <span className="font-semibold text-sm truncate mr-2">{pnj.nom}</span>
                  <button
                    onClick={() => { setPnjControle(pnj); setPageCourante('mon-personnage') }}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg text-white shrink-0"
                    style={{ backgroundColor: 'var(--color-main)' }}>
                    Incarner
                  </button>
                </div>
              ))}
              <button onClick={() => setPageCourante('pnj')} className="mt-1 text-sm text-center"
                style={{ color: 'var(--text-muted)' }}>
                Voir tout le bestiaire →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}