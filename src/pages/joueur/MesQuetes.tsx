import { useEffect, useState } from 'react'
import { queteService, Quete } from '../../services/queteService'
import { usePersonnage } from '../../hooks/usePersonnage'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'

export default function MesQuetes() {
  const { personnage } = usePersonnage()
  const [quetes, setQuetes] = useState<(Quete & { suivie?: boolean })[]>([])
  const [queteDetail, setQueteDetail] = useState<(Quete & { suivie?: boolean }) | null>(null)
  const [filtreSuivies, setFiltreSuivies] = useState(false)

  useEffect(() => {
    if (personnage) chargerQuetes()
  }, [personnage])

  const chargerQuetes = async () => {
    const data = await queteService.getQuetesPersonnage(personnage!.id)
    setQuetes(data)
  }

  const toggleSuivre = async (e: React.MouseEvent, q: Quete & { suivie?: boolean }) => {
    e.stopPropagation()
    if (!personnage) return
    const nouveauStatut = !q.suivie
    const success = await queteService.toggleSuivreQuete(personnage.id, q.id, nouveauStatut)
    if (success) {
      setQuetes(prev => prev.map(item => item.id === q.id ? { ...item, suivie: nouveauStatut } : item))
      if (queteDetail?.id === q.id) setQueteDetail({ ...queteDetail, suivie: nouveauStatut })
    }
  }

  // On retire le blocage visuel du chargement


  const quetesFiltrees = filtreSuivies ? quetes.filter(q => q.suivie) : quetes

  return (
    <div className="flex flex-col h-full p-4 md:p-8 overflow-y-auto custom-scrollbar">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-white/5 pb-6 gap-4">
        <div>
          <h2 className="text-3xl font-black uppercase italic tracking-tighter">📜 Mon Journal de Quêtes</h2>
          <p className="text-sm opacity-50">Tes objectifs et récompenses attendues</p>
        </div>
        <Button variant={filtreSuivies ? 'active' : 'secondary'} size="sm" onClick={() => setFiltreSuivies(!filtreSuivies)}>
          {filtreSuivies ? '⭐ Toutes les quêtes' : '⭐ Quêtes suivies'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-10">
        {quetesFiltrees.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center opacity-30 text-center">
            <span className="text-6xl mb-4">{filtreSuivies ? '📍' : '🕊️'}</span>
            <p className="text-lg font-bold">
              {filtreSuivies ? 'Tu ne suis aucune quête pour le moment.' : 'Aucune quête assignée pour le moment.'}
            </p>
          </div>
        )}
        {quetesFiltrees.map(q => (
          <Card key={q.id} hoverEffect className="flex-col gap-4 cursor-pointer relative" onClick={() => setQueteDetail(q)}>
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2 pr-2 overflow-hidden">
                <button 
                  onClick={(e) => toggleSuivre(e, q)}
                  className={`text-xl transition-all hover:scale-125 ${q.suivie ? 'opacity-100 grayscale-0' : 'opacity-20 grayscale'}`}
                >
                  ⭐
                </button>
                <h3 className="font-black text-lg uppercase leading-tight truncate">{q.titre}</h3>
              </div>
              <Badge variant={q.statut === 'Terminée' ? 'success' : q.statut === 'Échouée' ? 'error' : 'default'}>{q.statut}</Badge>
            </div>
            <p className="text-xs opacity-60 line-clamp-2 italic">"{q.description}"</p>
            <div className="mt-auto pt-4 border-t border-white/5 flex flex-wrap gap-2">
              {q.quete_recompenses?.map((r, i) => (
                <span key={i} className={`text-[9px] font-black uppercase px-2 py-1 rounded-md border ${r.distribution === 'par_personne' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-main/10 text-main border-main/20'}`}>
                  {r.type === 'Item' ? `🎁 ${r.items?.nom} (x${r.valeur})` : `✨ ${r.description}`}
                  {r.distribution === 'par_personne' && ' / pers.'}
                </span>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* MODAL DETAIL */}
      {queteDetail && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4" onClick={() => setQueteDetail(null)}>
          <Card className="max-w-xl w-full p-8 gap-6 animate-in zoom-in duration-200 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start border-b border-white/5 pb-4">
              <div className="flex gap-4">
                <button 
                  onClick={(e) => toggleSuivre(e as any, queteDetail)}
                  className={`text-3xl transition-all hover:scale-110 ${queteDetail.suivie ? 'opacity-100 grayscale-0' : 'opacity-20 grayscale'}`}
                >
                  ⭐
                </button>
                <div>
                  <Badge className="mb-2 uppercase tracking-tighter">{queteDetail.statut}</Badge>
                  <h3 className="text-2xl font-black uppercase tracking-tighter">{queteDetail.titre}</h3>
                </div>
              </div>
              <button className="text-2xl opacity-20 hover:opacity-100 transition-opacity" onClick={() => setQueteDetail(null)}>✕</button>
            </div>

            <div className="flex flex-col gap-6">
              <p className="text-base leading-relaxed opacity-80 whitespace-pre-wrap italic">
                {queteDetail.description || "Le MJ n'a pas laissé d'instructions précises..."}
              </p>
              
              <div className="flex flex-col gap-3">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Récompenses promises :</p>
                <div className="grid grid-cols-1 gap-2">
                  {queteDetail.quete_recompenses?.map((r, i) => (
                    <div key={i} className={`p-4 rounded-2xl bg-white/5 border border-white/10 font-bold text-sm flex items-center justify-between`}>
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{r.type === 'Item' ? '🎁' : '✨'}</span>
                        <div>
                          <p className="text-xs opacity-40 uppercase font-black tracking-tighter">{r.type === 'Item' ? 'Objet de quête' : 'Bonus spécial'}</p>
                          <p className="text-base">{r.type === 'Item' ? `${r.items?.nom} (Quantité: ${r.valeur})` : r.description}</p>
                        </div>
                      </div>
                      <Badge variant={r.distribution === 'par_personne' ? 'default' : 'ghost'} className="text-[8px] uppercase">
                        {r.distribution === 'par_personne' ? '👤 Pour toi' : '👥 À partager'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button className="flex-1" variant={queteDetail.suivie ? 'secondary' : 'primary'} onClick={(e) => toggleSuivre(e as any, queteDetail)}>
                {queteDetail.suivie ? 'Ne plus suivre' : 'Suivre cette quête'}
              </Button>
              <Button className="flex-1" variant="secondary" onClick={() => setQueteDetail(null)}>Fermer</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
