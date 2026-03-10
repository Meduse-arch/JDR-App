import { useState } from 'react'
import { useStats } from '../../hooks/useStats'
import { lancerDes } from '../../utils/des'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'

type Resultat = { label: string; des: number[]; modifier: number; total: number }

export default function LancerDes() {
  const { stats, chargement } = useStats()

  const [nbDesInput,    setNbDesInput]    = useState<string | number>(1)
  const [facesDeInput,  setFacesDeInput]  = useState<string | number>(20)
  const [modInput,      setModInput]      = useState<string | number>(0)
  const [historique,    setHistorique]    = useState<Resultat[]>([])

  const getNum = (v: any, def: number) => {
    if (v === '' || v === null || v === undefined || v === '-') return def
    const n = Number(v)
    return isNaN(n) ? def : n
  }

  const executerLancer = (labelPerso: string, facesForcees?: number) => {
    const nb    = Math.max(1, getNum(nbDesInput, 1))
    const mod   = getNum(modInput, 0)
    const faces = Math.max(2, getNum(facesForcees, 0) || getNum(facesDeInput, 20))
    
    const res   = lancerDes(nb, faces, mod)
    
    // Si c'est un jet de stat, on construit un label plus explicite
    const label = labelPerso 
      ? `${labelPerso} (d${faces}${mod !== 0 ? (mod > 0 ? '+' : '') + mod : ''})`
      : `${nb}d${faces}${mod !== 0 ? (mod > 0 ? '+' : '') + mod : ''}`
      
    setHistorique(h => [{ label, ...res }, ...h].slice(0, 20))
  }

  // On retire le blocage visuel du chargement


  const modAffichage = getNum(modInput, 0)

  return (
    <div
      className="flex flex-col h-full p-4 md:p-8 lg:p-10 overflow-y-auto custom-scrollbar"
      style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}
    >
      <div className="mb-8 pb-6" style={{ borderBottom: '1px solid var(--border)' }}>
        <h2
          className="text-3xl md:text-4xl font-black tracking-tight"
          style={{
            background: 'linear-gradient(135deg, var(--color-light), var(--color-accent2))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Lancer de Dés
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
        <div className="lg:col-span-8 flex flex-col gap-8">
          <Card className="relative overflow-hidden p-6 md:p-8">
            <div
              className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-30"
              style={{ backgroundColor: 'var(--color-glow)' }}
            />

            <h3 className="text-xs font-black uppercase tracking-widest mb-6 relative z-10"
              style={{ color: 'var(--text-muted)' }}>
              Jet Manuel
            </h3>

            <div className="flex flex-col sm:flex-row flex-wrap items-center gap-4 relative z-10">
              <div className="flex items-center p-2 gap-2 w-full sm:w-auto rounded-2xl" 
                   style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <div className="flex flex-col items-center px-3 flex-1 sm:flex-none">
                  <label className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-50">Dés</label>
                  <input
                    type="number"
                    value={nbDesInput}
                    onChange={e => setNbDesInput(e.target.value)}
                    className="bg-transparent text-2xl font-black w-14 text-center outline-none"
                  />
                </div>
                <span className="font-black text-2xl" style={{ color: 'var(--color-main)' }}>D</span>
                <div
                  className="flex flex-col items-center px-3 flex-1 sm:flex-none"
                  style={{ borderLeft: '1px solid var(--border)' }}
                >
                  <label className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-50">Faces</label>
                  <input
                    type="number"
                    value={facesDeInput}
                    onChange={e => setFacesDeInput(e.target.value)}
                    className="bg-transparent text-2xl font-black w-14 text-center outline-none"
                  />
                </div>
              </div>

              <span className="font-black text-2xl hidden sm:block opacity-30">+</span>

              <div className="flex flex-col items-center p-2 w-full sm:w-auto rounded-2xl" 
                   style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <label className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-50">Modificateur</label>
                <input
                  type="number"
                  value={modInput}
                  onChange={e => setModInput(e.target.value)}
                  className="bg-transparent text-2xl font-black w-24 text-center outline-none"
                />
              </div>

              <Button
                size="lg"
                onClick={() => executerLancer('')}
                className="w-full sm:w-auto sm:ml-auto mt-4 sm:mt-0"
              >
                LANCER {getNum(nbDesInput, 1)}d{getNum(facesDeInput, 20)}
                {modAffichage !== 0 && (modAffichage > 0 ? ` +${modAffichage}` : ` −${Math.abs(modAffichage)}`)}
              </Button>
            </div>
          </Card>

          {stats.length > 0 && (
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest mb-4"
                style={{ color: 'var(--text-muted)' }}>
                Jets de Statistiques (+ Modificateur actuel)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {stats.map(stat => (
                  <button
                    key={stat.nom}
                    onClick={() => executerLancer(stat.nom, stat.valeur)}
                    className="p-4 rounded-2xl transition-all duration-300 flex flex-col items-center justify-center gap-2 hover:-translate-y-1 group"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--color-main) 10%, var(--bg-card))'
                      e.currentTarget.style.borderColor = 'var(--color-main)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-card)'
                      e.currentTarget.style.borderColor = 'var(--border)'
                    }}
                  >
                    <span className="text-xs font-bold uppercase tracking-wider"
                      style={{ color: 'var(--text-secondary)' }}>
                      {stat.nom}
                    </span>
                    <div className="flex items-center gap-1">
                      <Badge variant="ghost" className="text-sm px-3 group-hover:bg-[var(--color-main)] group-hover:text-white transition-colors">
                        d{stat.valeur}
                      </Badge>
                      {modAffichage !== 0 && (
                        <span className={`text-xs font-black ${modAffichage > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {modAffichage > 0 ? `+${modAffichage}` : modAffichage}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 flex flex-col h-[500px] lg:h-[600px]">
          <Card className="flex flex-col h-full p-0 overflow-hidden">
            <div
              className="flex justify-between items-center p-5 border-b"
              style={{ borderColor: 'var(--border)' }}
            >
              <h3 className="text-xs font-black uppercase tracking-widest"
                style={{ color: 'var(--text-muted)' }}>
                Historique
              </h3>
              {historique.length > 0 && (
                <Button size="sm" variant="ghost" onClick={() => setHistorique([])}>
                  Effacer
                </Button>
              )}
            </div>

            <div className="flex flex-col gap-3 overflow-y-auto custom-scrollbar flex-1 p-5">
              {historique.length === 0 ? (
                <p className="text-center font-bold mt-10 italic text-sm"
                  style={{ color: 'var(--text-muted)' }}>
                  Aucun lancer récent.
                </p>
              ) : (
                historique.map((r, i) => {
                  const modPropre  = getNum(r.modifier, 0)
                  const estDernier = i === 0
                  return (
                    <div
                      key={i}
                      className="flex flex-col p-4 rounded-2xl transition-all"
                      style={{
                        backgroundColor: estDernier
                          ? 'color-mix(in srgb, var(--color-main) 10%, var(--bg-surface))'
                          : 'var(--bg-surface)',
                        border: `1px solid ${estDernier ? 'color-mix(in srgb, var(--color-main) 40%, transparent)' : 'var(--border)'}`,
                        opacity: estDernier ? 1 : 0.65,
                        boxShadow: estDernier ? '0 0 15px var(--color-glow)' : 'none',
                      }}
                    >
                      <span
                        className="text-xs font-bold uppercase tracking-wider mb-2"
                        style={{ color: estDernier ? 'var(--color-light)' : 'var(--text-muted)' }}
                      >
                        {r.label}
                      </span>
                      <div className="flex justify-between items-end">
                        <span
                          className="text-xs font-mono px-2 py-1 rounded-md"
                          style={{
                            backgroundColor: 'var(--bg-app)',
                            color: 'var(--text-muted)',
                            border: '1px solid var(--border)',
                          }}
                        >
                          [{r.des.join(' + ')}]
                          {modPropre !== 0 && (
                            <span style={{ color: modPropre > 0 ? '#4ade80' : '#f87171' }}>
                              {modPropre > 0 ? ' + ' : ' − '}{Math.abs(modPropre)}
                            </span>
                          )}
                        </span>
                        <span
                          className={`font-black ${estDernier ? 'text-4xl' : 'text-2xl'}`}
                          style={{
                            color: estDernier ? 'var(--color-main)' : 'var(--text-secondary)',
                            textShadow: estDernier ? '0 0 20px var(--color-glow)' : 'none',
                          }}
                        >
                          {r.total}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
