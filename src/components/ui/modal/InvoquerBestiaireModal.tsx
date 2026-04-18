import React, { useState, useEffect } from 'react'
import { Personnage } from '../../../store/useStore'
import { Button } from '../Button'
import { Badge } from '../Badge'
import { ModalContainer } from './ModalContainer'

interface InvoquerBestiaireModalProps {
  isOpen: boolean
  onClose: () => void
  templates: Personnage[]
  onInstancier: (t: Personnage, count: number, customName?: string, customType?: string) => void
  selectedBestiaireFilter: 'Tous' | 'Monstres' | 'PNJ'
  setSelectedBestiaireFilter: (f: 'Tous' | 'Monstres' | 'PNJ') => void
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
  selectedBestiaireFilter,
  setSelectedBestiaireFilter,
  invoquerTemplate,
  setInvoquerTemplate,
  invoquerCount,
  setInvoquerCount
}) => {
  const [customName, setCustomName] = useState('')
  const [customType, setCustomType] = useState<'Monstre' | 'PNJ' | 'Boss'>('PNJ')

  useEffect(() => {
    if (invoquerTemplate) {
      setCustomName(invoquerTemplate.nom || '')
      setCustomType((invoquerTemplate.type as any) || 'PNJ')
    } else {
      setCustomName('')
    }
  }, [invoquerTemplate])

  if (!isOpen) return null

  return (
    <ModalContainer onClose={onClose} className="max-h-[90vh]">
      <h3 className="text-xl font-cinzel font-black uppercase tracking-widest text-primary">Invocation</h3>

      <div className="flex gap-2 p-1 rounded-sm bg-black/40 border border-theme/30 w-fit">
        {(['Tous', 'Monstres', 'PNJ'] as const).map(f => (
          <button key={f} onClick={() => setSelectedBestiaireFilter(f)} className={`px-3 py-1 rounded-sm text-[10px] font-cinzel font-black uppercase transition-all ${selectedBestiaireFilter === f ? 'bg-theme-main text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 min-h-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {templates.filter(t => {
            if (selectedBestiaireFilter === 'Monstres') return t.type === 'Monstre'
            if (selectedBestiaireFilter === 'PNJ') return t.type === 'PNJ' || t.type === 'Boss'
            return true
          }).map(t => (
            <div 
              key={t.id} 
              onClick={() => setInvoquerTemplate(t)}
              className={`p-3 cursor-pointer transition-all border flex flex-col gap-1 ${invoquerTemplate?.id === t.id ? 'border-theme-main bg-theme-main/10' : 'border-theme/20 hover:border-theme-main/40 bg-black/20'}`}
            >
              <h4 className="font-cinzel font-black text-sm text-primary uppercase tracking-widest truncate">{t.nom}</h4>
              <Badge variant="outline" className="text-[8px] opacity-60 font-cinzel w-fit">{t.type}</Badge>
            </div>
          ))}
        </div>
      </div>

      {invoquerTemplate && (
        <div className="pt-4 border-t border-theme/20 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="font-cinzel text-[10px] text-theme-main uppercase tracking-widest">Nom de l'instance (optionnel)</label>
            <input 
              type="text" 
              value={customName} 
              onChange={e => setCustomName(e.target.value)} 
              className="bg-black/40 border border-theme/40 rounded-sm px-2 py-1 font-cinzel text-sm outline-none focus:border-theme-main text-primary"
            />
            <div className="flex gap-2 mt-1">
              <button onClick={() => setCustomType('Monstre')} className={`px-2 py-1 text-[10px] font-cinzel uppercase border rounded-sm transition-all ${customType === 'Monstre' ? 'border-theme-main bg-theme-main/20 text-theme-main' : 'border-theme/30 opacity-50 hover:opacity-100'}`}>Monstre</button>
              <button onClick={() => setCustomType('PNJ')} className={`px-2 py-1 text-[10px] font-cinzel uppercase border rounded-sm transition-all ${customType === 'PNJ' ? 'border-theme-main bg-theme-main/20 text-theme-main' : 'border-theme/30 opacity-50 hover:opacity-100'}`}>PNJ</button>
              <button onClick={() => setCustomType('Boss')} className={`px-2 py-1 text-[10px] font-cinzel uppercase border rounded-sm transition-all ${customType === 'Boss' ? 'border-red-500 bg-red-500/20 text-red-500' : 'border-theme/30 opacity-50 hover:opacity-100'}`}>Boss</button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="font-cinzel font-black text-[10px] text-theme-main uppercase tracking-widest">Quantité :</span>
              <input type="number" min="1" max="50" value={invoquerCount} onChange={e => setInvoquerCount(parseInt(e.target.value)||1)} className="w-16 bg-black/40 border border-theme/40 rounded-sm px-2 py-1 text-center font-cinzel font-black text-sm outline-none focus:border-theme-main text-primary" />
            </div>
            <Button className="font-cinzel font-black uppercase tracking-widest px-8 text-xs h-10 w-full sm:w-auto" onClick={() => onInstancier(invoquerTemplate, invoquerCount, customName, customType)}>
              Invoquer {invoquerCount}
            </Button>
          </div>
        </div>
      )}
    </ModalContainer>
  )
}

export default InvoquerBestiaireModal
