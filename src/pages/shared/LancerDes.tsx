import { useState } from 'react'
import { useStats } from '../../hooks/useStats'
import { lancerDes } from '../../utils/des'

type Resultat = { label: string; des: number[]; modifier: number; total: number }

export default function LancerDes() {
  const { stats, chargement } = useStats() 
  
  const [nbDesInput, setNbDesInput] = useState<string | number>(1)
  const [facesDeInput, setFacesDeInput] = useState<string | number>(20)
  const [modInput, setModInput] = useState<string | number>(0)
  const [historique, setHistorique] = useState<Resultat[]>([])

  // 🛡️ Le bouclier anti-bugs
  const getNombreSecurise = (valeur: any, defaut: number) => {
    if (valeur === '' || valeur === null || valeur === undefined || valeur === '-') return defaut
    const num = Number(valeur)
    return isNaN(num) ? defaut : num
  }

  const executerLancer = (labelPerso: string, facesForcees?: number) => {
    const nbNum = Math.max(1, getNombreSecurise(nbDesInput, 1))
    const modNum = getNombreSecurise(modInput, 0)
    const facesNum = Math.max(2, getNombreSecurise(facesForcees, 0) || getNombreSecurise(facesDeInput, 20))

    const resultat = lancerDes(nbNum, facesNum, modNum)
    const labelAffichage = labelPerso || `${nbNum}d${facesNum}${modNum !== 0 ? (modNum > 0 ? '+' : '') + modNum : ''}`

    setHistorique(h => [{ label: labelAffichage, ...resultat }, ...h].slice(0, 20))
  }

  if (chargement) return <div className="flex items-center justify-center h-full text-gray-500 animate-pulse">Recherche des dés...</div>

  const modAffichage = getNombreSecurise(modInput, 0)

  return (
    <div className="flex flex-col h-full text-white p-4 md:p-8 lg:p-10 overflow-y-auto custom-scrollbar">
      
      {/* 👑 HEADER */}
      <div className="mb-8 pb-6 border-b border-gray-800">
        <h2 className="text-3xl md:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-rose-500 tracking-tight">
          Lancer de Dés
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
        
        {/* COLONNE GAUCHE (Contrôles + Stats) */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          
          {/* 🎲 JET LIBRE (Glassmorphism) */}
          <div className="bg-gray-800/40 backdrop-blur-md p-6 md:p-8 rounded-3xl border border-gray-700/50 shadow-xl relative overflow-hidden group">
            {/* Brillance */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-700"></div>
            
            <h3 className="text-sm font-black uppercase text-gray-400 tracking-widest mb-6 relative z-10">Jet Manuel</h3>
            
            <div className="flex flex-col sm:flex-row flex-wrap items-center gap-4 md:gap-6 relative z-10">
              
              {/* Groupe d'inputs stylisés */}
              <div className="flex items-center bg-gray-900/50 p-2 rounded-2xl border border-gray-700/50 shadow-inner w-full sm:w-auto">
                <div className="flex flex-col items-center px-2 flex-1 sm:flex-none">
                  <label className="text-gray-500 text-[10px] font-bold uppercase mb-1">Dés</label>
                  <input type="number" value={nbDesInput} onChange={e => setNbDesInput(e.target.value)} className="bg-transparent text-white text-2xl font-black w-16 text-center outline-none" />
                </div>
                <span className="text-rose-500 font-black text-2xl px-2">D</span>
                <div className="flex flex-col items-center px-2 flex-1 sm:flex-none border-l border-gray-700/50">
                  <label className="text-gray-500 text-[10px] font-bold uppercase mb-1">Faces</label>
                  <input type="number" value={facesDeInput} onChange={e => setFacesDeInput(e.target.value)} className="bg-transparent text-white text-2xl font-black w-16 text-center outline-none" />
                </div>
              </div>

              <span className="text-gray-600 font-black text-2xl hidden sm:block">+</span>

              <div className="flex flex-col items-center bg-gray-900/50 p-2 rounded-2xl border border-gray-700/50 shadow-inner w-full sm:w-auto">
                <label className="text-gray-500 text-[10px] font-bold uppercase mb-1">Modificateur</label>
                <input type="number" value={modInput} onChange={e => setModInput(e.target.value)} className="bg-transparent text-white text-2xl font-black w-24 text-center outline-none" />
              </div>

              {/* Bouton Lancer Gradient */}
              <button
                onClick={() => executerLancer("")}
                className="w-full sm:w-auto mt-4 sm:mt-0 sm:ml-auto bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-400 hover:to-rose-500 px-8 py-4 rounded-2xl font-black text-lg transition-all shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:shadow-[0_0_30px_rgba(244,63,94,0.5)] hover:-translate-y-1"
              >
                LANCER {getNombreSecurise(nbDesInput, 1)}d{getNombreSecurise(facesDeInput, 20)} 
                {modAffichage !== 0 && (modAffichage > 0 ? ` + ${modAffichage}` : ` - ${Math.abs(modAffichage)}`)}
              </button>
            </div>
          </div>

          {/* 🛡️ JETS DE STATS RAPIDES */}
          {stats.length > 0 && (
            <div>
              <h3 className="text-sm font-black uppercase text-gray-500 tracking-widest mb-4">Jets de Statistiques</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {stats.map(stat => (
                  <button
                    key={stat.nom}
                    onClick={() => executerLancer(`Test ${stat.nom}`, stat.valeur)}
                    className="bg-gray-800/30 hover:bg-rose-500/10 border border-gray-700/50 hover:border-rose-500/50 p-4 rounded-2xl transition-all duration-300 flex flex-col items-center justify-center gap-2 group shadow-sm hover:shadow-lg hover:-translate-y-1"
                  >
                    <span className="text-xs font-bold text-gray-400 group-hover:text-rose-200 uppercase tracking-wider">{stat.nom}</span>
                    <span className="bg-gray-900/80 text-rose-400 font-black text-lg px-4 py-1 rounded-xl shadow-inner group-hover:bg-rose-500 group-hover:text-white transition-colors">
                      d{stat.valeur}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* COLONNE DROITE (Historique) */}
        <div className="lg:col-span-4 flex flex-col h-full max-h-[600px]">
          <div className="bg-gray-800/40 backdrop-blur-md rounded-3xl border border-gray-700/50 shadow-xl p-6 flex flex-col h-full">
            <div className="flex justify-between items-center mb-6 border-b border-gray-700/50 pb-4">
              <h3 className="text-sm font-black uppercase text-gray-400 tracking-widest">Historique</h3>
              {historique.length > 0 && (
                <button onClick={() => setHistorique([])} className="text-gray-500 hover:text-white bg-gray-900/50 hover:bg-rose-600 px-3 py-1 rounded-lg text-xs font-bold transition-all border border-gray-700/50 hover:border-rose-500">
                  Effacer
                </button>
              )}
            </div>
            
            <div className="flex flex-col gap-3 overflow-y-auto custom-scrollbar flex-1 pr-2">
              {historique.length === 0 ? (
                <p className="text-center text-gray-600 font-bold mt-10 italic text-sm">Aucun lancer récent.</p>
              ) : (
                historique.map((r, i) => {
                  const modPropre = getNombreSecurise(r.modifier, 0)
                  // Le dernier jet (index 0) est mis en surbrillance
                  const estDernier = i === 0
                  
                  return (
                    <div key={i} className={`flex flex-col p-4 rounded-2xl border transition-all ${estDernier ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.1)]' : 'bg-gray-900/40 border-gray-800 opacity-70 hover:opacity-100'}`}>
                      <span className={`text-xs font-bold uppercase tracking-wider mb-2 ${estDernier ? 'text-rose-400' : 'text-gray-500'}`}>{r.label}</span>
                      
                      <div className="flex justify-between items-end">
                        <span className="text-gray-500 text-xs font-mono bg-gray-950/50 px-2 py-1 rounded-md border border-gray-800/50">
                          [{r.des.join(' + ')}]
                          {modPropre !== 0 && (
                            <span className={modPropre > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                               {modPropre > 0 ? ' + ' : ' - '}{Math.abs(modPropre)}
                            </span>
                          )}
                        </span>
                        <span className={`font-black ${estDernier ? 'text-4xl text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]' : 'text-2xl text-gray-400'}`}>
                          {r.total}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}