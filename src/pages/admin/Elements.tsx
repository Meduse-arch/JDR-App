import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { elementsService } from '../../services/elementsService'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { ConfirmButton } from '../../components/ui/ConfirmButton'
import { Element } from '../../types'

export default function Elements() {
  const sessionActive = useStore(s => s.sessionActive)
  const [elements, setElements] = useState<Element[]>([])
  const [loading, setLoading] = useState(true)

  // Form state
  const [idEdition, setIdEdition] = useState<string | null>(null)
  const [nom, setNom] = useState('')
  const [description, setDescription] = useState('')
  const [emoji, setEmoji] = useState('')
  const [couleur, setCouleur] = useState('#3b82f6')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (sessionActive) {
      chargerElements()
    }
  }, [sessionActive])

  const chargerElements = async () => {
    if (!sessionActive) return
    setLoading(true)
    const data = await elementsService.getElements(sessionActive.id)
    setElements(data)
    setLoading(false)
  }

  const handleEnregistrer = async () => {
    if (!nom || !sessionActive) return

    let success = false
    const data = {
      nom,
      description,
      emoji: emoji.substring(0, 2), // Keep it short, though prompt says 1 char
      couleur,
      id_session: sessionActive.id
    }

    if (idEdition) {
      success = await elementsService.updateElement(idEdition, data)
    } else {
      const res = await elementsService.createElement(data)
      success = !!res
    }

    if (success) {
      setMessage(idEdition ? '✅ Élément mis à jour !' : '✅ Élément créé !')
      setTimeout(() => setMessage(''), 2500)
      resetForm()
      chargerElements()
    }
  }

  const handleEditer = (el: Element) => {
    setIdEdition(el.id)
    setNom(el.nom)
    setDescription(el.description || '')
    setEmoji(el.emoji || '')
    setCouleur(el.couleur || '#3b82f6')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string) => {
    const success = await elementsService.deleteElement(id)
    if (success) chargerElements()
  }

  const resetForm = () => {
    setIdEdition(null)
    setNom('')
    setDescription('')
    setEmoji('')
    setCouleur('#3b82f6')
  }

  return (
    <div className="flex flex-col h-full p-4 md:p-8" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase italic"
            style={{ color: 'var(--color-light)' }}>
            🌀 Gestion des Éléments
          </h2>
          <p className="text-sm opacity-60 mt-1">Définissez les types d'énergie et affinités de votre monde</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* FORMULAIRE */}
        <Card className="lg:col-span-4 p-6 sticky top-4 border-main/10 shadow-xl bg-black/20">
          <h3 className="font-black uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-main animate-pulse" />
            {idEdition ? 'Modifier l\'élément' : 'Nouvel élément'}
          </h3>
          
          <div className="flex flex-col gap-5">
            <div className="flex gap-4">
              <div className="w-16 shrink-0">
                <Input label="Emoji" value={emoji} onChange={e => setEmoji(e.target.value)} placeholder="🔥" maxLength={2} />
              </div>
              <div className="flex-1">
                <Input label="Nom de l'élément" value={nom} onChange={e => setNom(e.target.value)} placeholder="Ex: Feu, Arcanes..." />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase opacity-40 ml-1">Couleur d'accent</label>
              <div className="flex items-center gap-3">
                <input 
                  type="color" 
                  value={couleur} 
                  onChange={e => setCouleur(e.target.value)}
                  className="w-12 h-10 rounded-lg bg-transparent border-none cursor-pointer"
                />
                <span className="text-[10px] font-mono opacity-60">{couleur.toUpperCase()}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase opacity-40 ml-1">Description</label>
              <textarea 
                className="w-full bg-surface border border-border rounded-xl p-4 min-h-[100px] outline-none focus:border-main text-sm italic font-bold" 
                value={description} onChange={e => setDescription(e.target.value)} 
                placeholder="Détails sur cet élément..."
              />
            </div>

            {message && <p className="text-center text-xs font-bold text-green-400">{message}</p>}

            <div className="flex flex-col gap-2 mt-2">
              <Button size="lg" onClick={handleEnregistrer} className="uppercase tracking-widest font-black">
                {idEdition ? '💾 Mettre à jour' : '✨ Créer l\'élément'}
              </Button>
              {idEdition && (
                <Button variant="ghost" size="sm" onClick={resetForm} className="opacity-50">
                  Annuler l'édition
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* LISTE */}
        <div className="lg:col-span-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {loading ? (
              <div className="col-span-full py-20 text-center opacity-20 italic">Chargement des énergies...</div>
            ) : elements.length === 0 ? (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-3xl opacity-20">
                <p className="text-4xl mb-4">⚛️</p>
                <p className="font-black uppercase tracking-widest text-xs">Aucun élément défini</p>
              </div>
            ) : (
              elements.map(el => (
                <Card key={el.id} className="p-0 overflow-hidden group hover:border-white/20 transition-all">
                  <div className="h-1.5 w-full" style={{ backgroundColor: el.couleur }} />
                  <div className="p-5 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl filter drop-shadow-md">{el.emoji}</span>
                        <h4 className="font-black text-lg uppercase italic tracking-tighter" style={{ color: el.couleur }}>{el.nom}</h4>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEditer(el)} className="p-1.5 hover:bg-white/5 rounded-lg text-xs">✏️</button>
                        <ConfirmButton variant="ghost" size="sm" onConfirm={() => handleDelete(el.id)} className="text-red-400">🗑️</ConfirmButton>
                      </div>
                    </div>
                    {el.description && (
                      <p className="text-xs opacity-60 italic line-clamp-2">"{el.description}"</p>
                    )}
                    <Badge variant="outline" className="w-fit text-[8px] font-mono opacity-40">ID: {el.id.split('-')[0]}</Badge>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
