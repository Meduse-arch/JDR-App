import React, { useState, useEffect } from 'react'
import { Personnage } from '../../../store/useStore'
import { Button } from '../Button'
import { ModalContainer } from './ModalContainer'
import { Skull, User, Crown } from 'lucide-react'

interface InvoquerBestiaireModalProps {
  isOpen: boolean
  onClose: () => void
  templates: Personnage[]
  onInstancier: (t: Personnage, count: number, customName?: string, customType?: string) => void
  invoquerTemplate: Personnage | null
  setInvoquerTemplate: (t: Personnage | null) => void
  invoquerCount: number
  setInvoquerCount: (c: number) => void
}

export const InvoquerBestiaireModal: React.FC<InvoquerBestiaireModalProps> = ({
  isOpen,
  onClose,
  templates,
  onInstancier,
  invoquerTemplate,
  setInvoquerTemplate,
  invoquerCount,
  setInvoquerCount
}) => {
  const [customName, setCustomName] = useState('')
  const [customType, setCustomType] = useState<'Monstre' | 'PNJ' | 'Boss'>('Monstre')

  useEffect(() => {
    if (invoquerTemplate) {
      setCustomName(invoquerTemplate.nom || '')
      // Par défaut on propose Monstre, mais l'utilisateur choisira
      setCustomType('Monstre')
    } else {
      setCustomName('')
    }
  }, [invoquerTemplate])

  if (!isOpen) return null

  return (
    <ModalContainer onClose={onClose} className="max-h-[90vh]">
      <div className="flex flex-col gap-1">
        <h3 className="text-xl font-cinzel font-black uppercase tracking-widest text-primary">Invocation</h3>
        <p className="font-garamond italic text-xs opacity-50">Sélectionnez un modèle pour l'incarner dans le monde.</p>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 min-h-[200px] bg-black/20 p-4 border border-theme/10">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {templates.map(t => (
            <div 
              key={t.id} 
              onClick={() => setInvoquerTemplate(t)}
              className={`p-3 cursor-pointer transition-all border flex flex-col gap-1 ${invoquerTemplate?.id === t.id ? 'border-theme-main bg-theme-main/10 shadow-[0_0_15px_rgba(var(--color-main-rgb),0.2)]' : 'border-theme/20 hover:border-theme-main/40 bg-black/20'}`}
            >
              <h4 className="font-cinzel font-black text-sm text-primary uppercase tracking-widest truncate">{t.nom}</h4>
            </div>
          ))}
          {templates.length === 0 && (
            <div className="col-span-full py-10 text-center opacity-30 font-garamond italic text-lg">
              Aucun modèle trouvé dans le grimoire...
            </div>
          )}
        </div>
      </div>

      {invoquerTemplate && (
        <div className="pt-6 border-t border-theme/20 flex flex-col gap-6 animate-in slide-in-from-bottom-2 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Colonne Nom & Quantité */}
            <div className="flex flex-col gap-4">
               <div className="flex flex-col gap-1.5">
                  <label className="font-cinzel text-[10px] text-theme-main uppercase tracking-widest font-black">Nom de l'instance</label>
                  <input 
                    type="text" 
                    value={customName} 
                    onChange={e => setCustomName(e.target.value)} 
                    className="bg-black/40 border border-theme/40 rounded-sm px-3 py-2 font-cinzel text-sm outline-none focus:border-theme-main text-primary w-full"
                    placeholder="Ex: Garde corrompu"
                  />
               </div>
               
               <div className="flex flex-col gap-1.5">
                  <label className="font-cinzel text-[10px] text-theme-main uppercase tracking-widest font-black">Quantité d'entités</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="50" 
                    value={invoquerCount} 
                    onChange={e => setInvoquerCount(parseInt(e.target.value)||1)} 
                    className="bg-black/40 border border-theme/40 rounded-sm px-3 py-2 font-cinzel font-black text-sm outline-none focus:border-theme-main text-primary w-24 text-center" 
                  />
               </div>
            </div>

            {/* Colonne Rôle / Type */}
            <div className="flex flex-col gap-1.5">
              <label className="font-cinzel text-[10px] text-theme-main uppercase tracking-widest font-black">Rôle dans le récit</label>
              <div className="grid grid-cols-1 gap-2">
                <button 
                  onClick={() => setCustomType('Monstre')} 
                  className={`flex items-center gap-3 px-4 py-3 text-[10px] font-cinzel font-black uppercase border rounded-sm transition-all ${customType === 'Monstre' ? 'border-theme-main bg-theme-main/20 text-theme-main shadow-[0_0_10px_rgba(var(--color-main-rgb),0.1)]' : 'border-theme/20 opacity-40 hover:opacity-100 hover:border-theme/40'}`}
                >
                  <Skull size={14} /> Monstre
                </button>
                <button 
                  onClick={() => setCustomType('PNJ')} 
                  className={`flex items-center gap-3 px-4 py-3 text-[10px] font-cinzel font-black uppercase border rounded-sm transition-all ${customType === 'PNJ' ? 'border-theme-main bg-theme-main/20 text-theme-main shadow-[0_0_10px_rgba(var(--color-main-rgb),0.1)]' : 'border-theme/20 opacity-40 hover:opacity-100 hover:border-theme/40'}`}
                >
                  <User size={14} /> Personnage (PNJ)
                </button>
                <button 
                  onClick={() => setCustomType('Boss')} 
                  className={`flex items-center gap-3 px-4 py-3 text-[10px] font-cinzel font-black uppercase border rounded-sm transition-all ${customType === 'Boss' ? 'border-red-500 bg-red-500/20 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.1)]' : 'border-theme/20 opacity-40 hover:opacity-100 hover:border-theme/40'}`}
                >
                  <Crown size={14} /> Boss de zone
                </button>
              </div>
            </div>
          </div>

          <Button 
            className="font-cinzel font-black uppercase tracking-widest py-4 text-xs w-full shadow-xl shadow-theme-main/10" 
            onClick={() => onInstancier(invoquerTemplate, invoquerCount, customName, customType)}
          >
            Invoquer {invoquerCount} {invoquerCount > 1 ? 'entités' : 'entité'}
          </Button>
        </div>
      )}
    </ModalContainer>
  )
}

export default InvoquerBestiaireModal
