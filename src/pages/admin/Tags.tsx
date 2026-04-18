import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { tagsService } from '../../services/tagsService'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { ConfirmButton } from '../../components/ui/ConfirmButton'
import { Tag } from '../../types'
import { Check, Tags as TagsIcon, Save, Sparkles, Edit2, Trash2 } from 'lucide-react'

export default function Tags() {
  const sessionActive = useStore(s => s.sessionActive)
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)

  // Form state
  const [idEdition, setIdEdition] = useState<string | null>(null)
  const [nom, setNom] = useState('')
  const [description, setDescription] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (sessionActive) {
      chargerTags()
    }
  }, [sessionActive])

  const chargerTags = async () => {
    if (!sessionActive) return
    setLoading(true)
    const data = await tagsService.getTags(sessionActive.id)
    setTags(data)
    setLoading(false)
  }

  const handleEnregistrer = async () => {
    if (!nom || !sessionActive) return

    let success = false
    const data = {
      nom,
      description,
      id_session: sessionActive.id
    }

    if (idEdition) {
      success = await tagsService.updateTag(idEdition, data)
    } else {
      const res = await tagsService.createTag(data)
      success = !!res
    }

    if (success) {
      setMessage(idEdition ? 'Tag mis à jour !' : 'Tag créé !')
      setTimeout(() => setMessage(''), 2500)
      resetForm()
      chargerTags()
    }
  }

  const handleEditer = (tag: Tag) => {
    setIdEdition(tag.id)
    setNom(tag.nom)
    setDescription(tag.description || '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string) => {
    const success = await tagsService.deleteTag(id)
    if (success) chargerTags()
  }

  const resetForm = () => {
    setIdEdition(null)
    setNom('')
    setDescription('')
  }

  return (
    <div className="flex flex-col h-full p-4 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-cinzel font-black tracking-widest uppercase italic text-theme-main flex items-center gap-3">
            <TagsIcon size={28} /> Gestion des Tags
          </h2>
          <p className="text-sm font-garamond opacity-60 mt-1">Définissez les tags et catégories de votre monde</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* FORMULAIRE */}
        <Card className="lg:col-span-4 p-8 sticky top-4 border-theme/20 shadow-xl bg-card/40">
          <h3 className="font-cinzel font-black uppercase tracking-widest text-xs mb-8 flex items-center gap-2 text-theme-main">
            <span className="w-2 h-2 rounded-full bg-theme-main animate-pulse" />
            {idEdition ? 'Modifier le tag' : 'Nouveau tag'}
          </h3>
          
          <div className="flex flex-col gap-6">
            <div className="flex-1">
              <Input label="Nom du tag" value={nom} onChange={e => setNom(e.target.value)} placeholder="Ex: Feu, Arcanes..." />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-cinzel font-black uppercase opacity-40 ml-1">Description</label>
              <textarea 
                className="w-full bg-black/20 border border-theme/30 rounded-sm p-4 min-h-[120px] outline-none focus:border-theme-main text-sm italic font-garamond font-bold text-primary" 
                value={description} onChange={e => setDescription(e.target.value)} 
                placeholder="Détails sur ce tag..."
              />
            </div>

            {message && (
              <p className="text-center text-xs font-bold text-green-600 flex items-center justify-center gap-2 animate-in fade-in">
                <Check size={14} /> {message}
              </p>
            )}

            <div className="flex flex-col gap-3 mt-4">
              <Button size="lg" onClick={handleEnregistrer} className="uppercase tracking-widest font-cinzel font-black">
                {idEdition ? <><Save size={18} className="mr-2" /> Mettre à jour</> : <><Sparkles size={18} className="mr-2" /> Créer le tag</>}
              </Button>
              {idEdition && (
                <Button variant="ghost" size="sm" onClick={resetForm} className="opacity-50 font-cinzel">
                  Annuler l'édition
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* LISTE */}
        <div className="lg:col-span-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {loading ? (
              <div className="col-span-full py-20 text-center opacity-20 italic font-garamond">Chargement des tags...</div>
            ) : tags.length === 0 ? (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-theme/20 rounded-sm opacity-20">
                <TagsIcon size={48} className="mx-auto mb-4" />
                <p className="font-cinzel font-black uppercase tracking-widest text-xs">Aucun tag défini</p>
              </div>
            ) : (
              tags.map(tag => (
                <Card key={tag.id} className="p-0 overflow-hidden group hover:border-theme-main/50 transition-all bg-card/40">
                  <div className="h-1 w-full bg-theme-main/20" />
                  <div className="p-6 flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <h4 className="font-cinzel font-black text-lg uppercase italic tracking-widest text-theme-main">{tag.nom}</h4>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEditer(tag)} className="p-2 hover:bg-theme-main/10 rounded-sm text-theme-light transition-colors"><Edit2 size={14} /></button>
                        <ConfirmButton variant="ghost" size="sm" onConfirm={() => handleDelete(tag.id)} className="text-red-700/60 hover:text-red-700"><Trash2 size={14} /></ConfirmButton>
                      </div>
                    </div>
                    {tag.description && (
                      <p className="text-sm font-garamond opacity-70 italic line-clamp-3">"{tag.description}"</p>
                    )}
                    <div className="mt-auto pt-4 flex justify-between items-center border-t border-theme/10">
                      <Badge variant="outline" className="text-[8px] font-mono opacity-30">ID: {tag.id.split('-')[0]}</Badge>
                    </div>
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
