import { useEffect, useState } from 'react'
import { useStore } from '../../Store/useStore'
import { useQuetes } from '../../hooks/useQuetes'
import { queteService } from '../../services/queteService'
import { sessionService } from '../../services/sessionService'
import { itemsService } from '../../services/itemsService'
import { Quete, Recompense, Item } from '../../types'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Badge } from '../../components/ui/Badge'
import { ConfirmButton } from '../../components/ui/ConfirmButton'

export default function GererQuetes() {
  const sessionActive = useStore(s => s.sessionActive)
  const { quetes, supprimerQuete } = useQuetes()
  
  const [joueurs, setJoueurs] = useState<any[]>([])
  const [itemsDispos, setItemsDispos] = useState<Item[]>([])
  const [vue, setVue] = useState<'liste' | 'form'>('liste')
  const [queteDetail, setQueteDetail] = useState<Quete | null>(null)

  // État du formulaire unique
  const [form, setForm] = useState<Partial<Quete>>({ titre: '', description: '', statut: 'En cours' })
  const [recompenses, setRecompenses] = useState<Partial<Recompense>[]>([])
  const [participants, setParticipants] = useState<string[]>([])

  const [filtreStatut, setFiltreStatut] = useState('Tous')
  const [recherche, setRecherche] = useState('')

  useEffect(() => {
    if (sessionActive) {
      sessionService.getSessionCharacters(sessionActive.id).then(j => setJoueurs(j.joueurs))
      itemsService.getItems(sessionActive.id).then(setItemsDispos)
    }
  }, [sessionActive])

  const ouvrirForm = (q?: Quete) => {
    if (q) {
      setForm(q)
      setRecompenses(q.quete_recompenses ? JSON.parse(JSON.stringify(q.quete_recompenses)) : [])
      setParticipants(q.personnage_quetes?.map(p => p.id_personnage) || [])
    } else {
      setForm({ titre: '', description: '', statut: 'En cours' })
      setRecompenses([])
      setParticipants([])
    }
    setVue('form')
    setQueteDetail(null)
  }

  const handleSauvegarder = async () => {
    if (!sessionActive || !form.titre) return
    const success = await queteService.upsertQuete(sessionActive.id, form, participants, recompenses)
    if (success) setVue('liste')
  }

  const quetesFiltrees = quetes.filter(q => (filtreStatut === 'Tous' || q.statut === filtreStatut) && q.titre.toLowerCase().includes(recherche.toLowerCase()))

  return (
    <div className="flex flex-col h-full p-4 md:p-8 overflow-y-auto custom-scrollbar" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight" style={{ background: 'linear-gradient(135deg, var(--color-light), var(--color-accent2))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            📜 Journal des Quêtes
          </h2>
          <p className="text-sm opacity-60 mt-1">Maître du Jeu : Forge les destins de tes héros</p>
        </div>
        <Button variant={vue === 'liste' ? 'primary' : 'secondary'} onClick={() => ouvrirForm()}>{vue === 'liste' ? '+ Nouvelle Quête' : '✕ Fermer'}</Button>
      </div>

      {vue === 'form' ? (
        <Card className="max-w-3xl mx-auto w-full flex flex-col gap-6 p-8 mb-10 border-main/20 shadow-2xl">
          <Input label="Titre" value={form.titre} onChange={e => setForm({...form, titre: e.target.value})} placeholder="Nom de l'aventure..." />
          
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase opacity-40 ml-1">Récit & Instructions</label>
            <textarea className="w-full bg-surface border border-border rounded-xl p-4 min-h-[120px] outline-none focus:border-main text-sm italic" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
          </div>

          <div className="flex flex-col gap-4 p-5 rounded-2xl bg-black/40 border border-white/5">
            <div className="flex justify-between items-center mb-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-main">Butin du destin</label>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setRecompenses([...recompenses, { type: 'Item', valeur: 1 }])}>+ Objet</Button>
                <Button size="sm" variant="secondary" onClick={() => setRecompenses([...recompenses, { type: 'Autre' }])}>+ Autre</Button>
              </div>
            </div>
            {recompenses.map((rec, idx) => (
              <div className="flex flex-col gap-3 bg-white/5 p-4 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  {rec.type === 'Item' ? (
                    <>
                      <Select className="flex-1 !py-2" value={rec.id_item || ''} onChange={e => { const r = [...recompenses]; r[idx].id_item = e.target.value; setRecompenses(r); }}>
                        <option value="">Choisir...</option>
                        {itemsDispos.map(i => <option key={i.id} value={i.id}>{i.nom}</option>)}
                      </Select>
                      <input type="number" className="w-12 bg-black/20 text-center rounded-lg py-2" value={rec.valeur} onChange={e => { const r = [...recompenses]; r[idx].valeur = parseInt(e.target.value) || 1; setRecompenses(r); }} />
                    </>
                  ) : (
                    <input className="flex-1 bg-black/20 text-sm font-bold border border-white/10 rounded-lg px-3 py-2" placeholder="Ex: 500 Pièces d'or..." value={rec.description || ''} onChange={e => { const r = [...recompenses]; r[idx].description = e.target.value; setRecompenses(r); }} />
                  )}
                  <button className="text-red-400 opacity-50 hover:opacity-100" onClick={() => setRecompenses(recompenses.filter((_, i) => i !== idx))}>✕</button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase opacity-40 ml-1">Participants assignés</label>
            <div className="flex flex-wrap gap-2">
              {joueurs.map(j => {
                const estAssigné = participants.includes(j.id)
                return (
                  <button 
                    key={j.id} 
                    onClick={() => {
                      if (estAssigné) {
                        setParticipants(participants.filter(p => p !== j.id))
                      } else {
                        setParticipants([...participants, j.id])
                      }
                    }} 
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${estAssigné ? 'bg-main border-main text-white shadow-lg shadow-main/20' : 'bg-white/5 border-white/10 opacity-40'}`}
                  >
                    {j.nom}
                  </button>
                )
              })}
            </div>
          </div>

          <Button size="lg" className="w-full mt-4" onClick={handleSauvegarder}>Enregistrer la Quête ✓</Button>
        </Card>
      ) : (
        <div className="flex flex-col gap-4 pb-10">
          <div className="flex flex-col xl:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40">🔍</span>
              <input 
                type="text" placeholder="Rechercher une quête..." value={recherche} onChange={e => setRecherche(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl outline-none transition-all font-bold"
                style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
            <div className="flex gap-2 p-1 rounded-xl overflow-x-auto custom-scrollbar shrink-0" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              {['Tous', 'En cours', 'Terminée', 'Échouée'].map(statut => (
                <button
                  key={statut} onClick={() => setFiltreStatut(statut)}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap ${filtreStatut === statut ? 'bg-main text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}
                  style={{ backgroundColor: filtreStatut === statut ? 'var(--color-main)' : 'transparent' }}
                >
                  {statut}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {quetesFiltrees.map(q => (
              <Card key={q.id} hoverEffect className="flex-col gap-4 cursor-pointer relative group" onClick={() => setQueteDetail(q)}>
                <div className="flex justify-between items-start">
                  <h3 className="font-black text-lg uppercase tracking-tight truncate pr-4">{q.titre}</h3>
                  <div onClick={e => e.stopPropagation()}>
                    <ConfirmButton variant="danger" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity" onConfirm={() => supprimerQuete(q.id)}>🗑️</ConfirmButton>
                  </div>
                </div>
                <div className="mt-auto flex flex-col gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {q.quete_recompenses?.slice(0, 2).map((r, i) => (
                      <span key={i} className="text-[8px] font-black px-2 py-0.5 rounded border bg-main/10 text-main border-main/20 truncate max-w-[120px]">
                        {r.type === 'Item' ? `🎁 ${r.items?.nom}` : `✨ ${r.description}`}
                      </span>
                    ))}
                    {(q.quete_recompenses?.length || 0) > 2 && (
                      <span className="text-[8px] font-black px-2 py-0.5 rounded border bg-main/10 text-main border-main/20">
                        +{q.quete_recompenses!.length - 2} autres...
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
            {quetesFiltrees.length === 0 && <div className="col-span-full py-20 text-center opacity-20 font-black uppercase italic">Aucune quête trouvée...</div>}
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {queteDetail && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => setQueteDetail(null)}>
          <Card className="max-w-xl w-full p-8 gap-6 shadow-2xl border-main/30" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between border-b border-white/5 pb-4">
              <div>
                <Badge className="mb-2 uppercase">{queteDetail.statut}</Badge>
                <h3 className="text-2xl font-black uppercase tracking-tighter">{queteDetail.titre}</h3>
              </div>
              <button className="text-2xl opacity-20 hover:opacity-100" onClick={() => setQueteDetail(null)}>✕</button>
            </div>
            <p className="text-sm opacity-80 whitespace-pre-wrap italic leading-relaxed">"{queteDetail.description}"</p>
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-black uppercase opacity-40">Butin espéré :</p>
              {queteDetail.quete_recompenses?.map((r, i) => (
                <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/10 flex justify-between items-center text-sm font-bold">
                  <span>{r.type === 'Item' ? `🎁 ${r.items?.nom || 'Objet inconnu'} (x${r.valeur})` : `✨ ${r.description}`}</span>
                </div>
              ))}
              {(!queteDetail.quete_recompenses || queteDetail.quete_recompenses.length === 0) && (
                <span className="text-xs opacity-50 italic">Aucune récompense</span>
              )}
            </div>
            
            <div className="flex flex-col gap-2 mt-2">
              <p className="text-[10px] font-black uppercase opacity-40">Participants sur cette quête :</p>
              <div className="flex flex-wrap gap-2">
                {queteDetail.personnage_quetes?.length ? (
                  queteDetail.personnage_quetes.map((p, i) => (
                    <Badge key={i} variant="outline" className="opacity-70">{p.personnages?.nom || 'Inconnu'}</Badge>
                  ))
                ) : (
                  <span className="text-xs opacity-50 italic">Aucun participant assigné</span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Button variant="active" onClick={() => ouvrirForm(queteDetail)}>Modifier</Button>
              <div className="flex gap-2">
                <Button className="flex-1" variant="success" onClick={() => queteService.modifierStatut(queteDetail.id, 'Terminée')}>✓</Button>
                <Button className="flex-1" variant="danger" onClick={() => queteService.modifierStatut(queteDetail.id, 'Échouée')}>✕</Button>
                <ConfirmButton onConfirm={() => { setQueteDetail(null); supprimerQuete(queteDetail.id); }}>🗑️</ConfirmButton>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
