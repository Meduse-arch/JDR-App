import { useEffect, useState } from 'react'
import { useStore } from '../../Store/useStore'
import { queteService, Quete, Recompense } from '../../services/queteService'
import { sessionService } from '../../services/sessionService'
import { itemsService } from '../../services/itemsService'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Badge } from '../../components/ui/Badge'
import { ConfirmButton } from '../../components/ui/ConfirmButton'
import { Item } from '../../types'

export default function GererQuetes() {
  const sessionActive = useStore(s => s.sessionActive)
  const [quetes, setQuetes] = useState<Quete[]>([])
  const [joueurs, setJoueurs] = useState<any[]>([])
  const [itemsDispos, setItemsDispos] = useState<Item[]>([])
  
  const [vue, setVue] = useState<'liste' | 'creer' | 'modifier'>('liste')
  const [queteDetail, setQueteDetail] = useState<Quete | null>(null)

  // Formulaire
  const [idModif, setIdModif] = useState<string | null>(null)
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [statut, setStatut] = useState<'En cours' | 'Terminée' | 'Échouée'>('En cours')
  const [recompenses, setRecompenses] = useState<Partial<Recompense>[]>([])
  const [participants, setParticipants] = useState<string[]>([])

  useEffect(() => {
    if (sessionActive) chargerDonnees()
  }, [sessionActive])

  const chargerDonnees = async () => {
    if (!sessionActive) return
    const [q, j, i] = await Promise.all([
      queteService.getQuetes(sessionActive.id),
      sessionService.getSessionCharacters(sessionActive.id),
      itemsService.getItems(sessionActive.id)
    ])
    setQuetes(q)
    setJoueurs(j.joueurs)
    setItemsDispos(i)
  }

  const handleCreer = async () => {
    if (!sessionActive || !titre) return
    const success = await queteService.creerQuete(sessionActive.id, { titre, description }, participants, recompenses)
    if (success) {
      setVue('liste')
      resetForm()
      chargerDonnees()
    }
  }

  const handleModifier = async () => {
    if (!idModif || !titre) return
    const success = await queteService.modifierQuete(idModif, { titre, description, statut }, participants, recompenses as Recompense[])
    if (success) {
      setVue('liste')
      resetForm()
      chargerDonnees()
    }
  }

  const resetForm = () => {
    setIdModif(null)
    setTitre('')
    setDescription('')
    setStatut('En cours')
    setRecompenses([])
    setParticipants([])
  }

  const ouvrirModifier = (q: Quete) => {
    setIdModif(q.id)
    setTitre(q.titre)
    setDescription(q.description)
    setStatut(q.statut)
    setRecompenses(q.quete_recompenses || [])
    setParticipants(q.personnage_quetes?.map(p => p.id_personnage) || [])
    setVue('modifier')
    setQueteDetail(null)
  }

  const ajouterRecompense = (type: 'Item' | 'Autre') => {
    setRecompenses(prev => [...prev, { type, valeur: 1, description: '', id_item: null }])
  }

  return (
    <div className="flex flex-col h-full p-4 md:p-8 overflow-y-auto custom-scrollbar">
      <div className="flex justify-between items-end mb-8 border-b border-white/5 pb-6">
        <div>
          <h2 className="text-3xl font-black uppercase italic tracking-tighter">📜 Journal des Quêtes</h2>
          <p className="text-sm opacity-50">Gère les objectifs et récompenses de ton univers</p>
        </div>
        <Button onClick={() => { resetForm(); setVue('creer'); }}>+ Forger une Quête</Button>
      </div>

      {(vue === 'creer' || vue === 'modifier') ? (
        <Card className="max-w-3xl mx-auto w-full flex flex-col gap-6 p-8 mb-10">
          <h3 className="text-xl font-black uppercase text-main">
            {vue === 'creer' ? 'Nouvel Objectif' : 'Modifier la Quête'}
          </h3>
          
          <Input label="Titre de la quête" placeholder="Ex: Le Secret du Donjon" value={titre} onChange={e => setTitre(e.target.value)} />
          
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase opacity-40 ml-1">Description</label>
            <textarea 
              className="w-full bg-surface border border-border rounded-xl p-4 min-h-[120px] outline-none focus:border-main text-sm"
              value={description} onChange={e => setDescription(e.target.value)}
            />
          </div>

          {vue === 'modifier' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase opacity-40 ml-1">Statut</label>
              <div className="flex gap-2">
                {(['En cours', 'Terminée', 'Échouée'] as const).map(s => (
                  <button key={s} onClick={() => setStatut(s)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${statut === s ? 'bg-main border-main' : 'bg-white/5 border-white/10 opacity-40'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Récompenses</label>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => ajouterRecompense('Item')}>+ Objet</Button>
                <Button size="sm" variant="secondary" onClick={() => ajouterRecompense('Autre')}>+ Texte</Button>
              </div>
            </div>
            
            {recompenses.map((rec, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-black/20 p-3 rounded-xl border border-white/5">
                {rec.type === 'Item' ? (
                  <>
                    <Select 
                      className="flex-1 !py-2 !px-3 text-sm font-bold"
                      value={rec.id_item || ''}
                      onChange={e => {
                        const newRecs = [...recompenses]
                        newRecs[idx].id_item = e.target.value
                        setRecompenses(newRecs)
                      }}
                    >
                      <option value="" className="bg-surface text-primary">Choisir un objet...</option>
                      {itemsDispos.map(i => <option key={i.id} value={i.id} className="bg-surface text-primary">{i.nom}</option>)}
                    </Select>
                    <input type="number" className="w-12 bg-white/5 text-center rounded-lg py-2 border border-white/10" value={rec.valeur} onChange={e => {
                      const newRecs = [...recompenses]
                      newRecs[idx].valeur = parseInt(e.target.value) || 1
                      setRecompenses(newRecs)
                    }} />
                  </>
                ) : (
                  <input 
                    className="flex-1 bg-transparent text-sm font-bold outline-none border border-white/10 rounded-xl px-3 py-2 bg-white/5"
                    placeholder="Récompense personnalisée..."
                    value={rec.description || ''}
                    onChange={e => {
                      const newRecs = [...recompenses]
                      newRecs[idx].description = e.target.value
                      setRecompenses(newRecs)
                    }}
                  />
                )}
                <button className="text-red-400 opacity-50 hover:opacity-100 p-2" onClick={() => setRecompenses(recompenses.filter((_, i) => i !== idx))}>✕</button>
              </div>
            ))}
          </div>

          <div>
            <label className="text-[10px] font-black uppercase opacity-40 ml-1 mb-2 block">Participants</label>
            <div className="flex flex-wrap gap-2">
              {joueurs.map(j => (
                <button key={j.id} onClick={() => setParticipants(prev => prev.includes(j.id) ? prev.filter(p => p !== j.id) : [...prev, j.id])}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${participants.includes(j.id) ? 'bg-main border-main text-white' : 'bg-white/5 border-white/10 opacity-40'}`}>
                  {j.nom}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <Button variant="secondary" className="flex-1" onClick={() => { resetForm(); setVue('liste'); }}>Annuler</Button>
            <Button className="flex-[2]" onClick={vue === 'creer' ? handleCreer : handleModifier}>
              {vue === 'creer' ? 'Publier la Quête ✓' : 'Enregistrer les modifications'}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-10">
          {quetes.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center opacity-30">
              <span className="text-6xl mb-4">📜</span>
              <p className="text-lg font-bold">Aucune quête dans cet univers.</p>
            </div>
          )}
          {quetes.map(q => (
            <Card key={q.id} hoverEffect className="flex-col gap-4 cursor-pointer" onClick={() => setQueteDetail(q)}>
              <div className="flex justify-between items-start">
                <h3 className="font-black text-lg uppercase tracking-tighter truncate pr-2">{q.titre}</h3>
                <Badge variant={q.statut === 'Terminée' ? 'success' : q.statut === 'Échouée' ? 'error' : 'default'}>{q.statut}</Badge>
              </div>
              <p className="text-xs opacity-60 line-clamp-2 italic">"{q.description}"</p>
              <div className="mt-auto pt-4 border-t border-white/5 flex flex-wrap gap-2">
                {q.quete_recompenses?.map((r, i) => (
                  <span key={i} className="text-[9px] font-black uppercase px-2 py-1 bg-main/10 text-main rounded-md">
                    {r.type === 'Item' ? `🎁 ${r.items?.nom} (x${r.valeur})` : `✨ ${r.description}`}
                  </span>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* MODAL DETAIL */}
      {queteDetail && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4" onClick={() => setQueteDetail(null)}>
          <Card className="max-w-xl w-full p-8 gap-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start border-b border-white/5 pb-4">
              <div>
                <Badge className="mb-2 uppercase">{queteDetail.statut}</Badge>
                <h3 className="text-2xl font-black uppercase tracking-tighter">{queteDetail.titre}</h3>
              </div>
              <button className="text-2xl opacity-20 hover:opacity-100 transition-opacity" onClick={() => setQueteDetail(null)}>✕</button>
            </div>
            <p className="text-sm opacity-80 whitespace-pre-wrap italic leading-relaxed">"{queteDetail.description}"</p>
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-black uppercase opacity-40">Butin à récupérer :</p>
              <div className="grid grid-cols-1 gap-2">
                {queteDetail.quete_recompenses?.map((r, i) => (
                  <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/5 font-bold text-sm flex items-center gap-2">
                    <span>{r.type === 'Item' ? '🎁' : '✨'}</span>
                    <span>{r.type === 'Item' ? `${r.items?.nom} (x${r.valeur})` : r.description}</span>
                  </div>
                ))}
                {(!queteDetail.quete_recompenses || queteDetail.quete_recompenses.length === 0) && (
                  <p className="text-xs italic opacity-30 text-center py-2">Aucune récompense.</p>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button className="flex-1" variant="active" onClick={() => ouvrirModifier(queteDetail)}>Modifier</Button>
              <Button className="flex-1" variant="success" onClick={() => queteService.modifierStatut(queteDetail.id, 'Terminée').then(chargerDonnees).then(() => setQueteDetail(null))}>Terminer</Button>
              <Button className="flex-1" variant="danger" onClick={() => queteService.modifierStatut(queteDetail.id, 'Échouée').then(chargerDonnees).then(() => setQueteDetail(null))}>Échouer</Button>
              <ConfirmButton onConfirm={() => queteService.supprimerQuete(queteDetail.id).then(chargerDonnees).then(() => setQueteDetail(null))}>🗑️</ConfirmButton>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
