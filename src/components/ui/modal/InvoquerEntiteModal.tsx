import React from 'react'
import { PersonnageType } from '../../../store/useStore'
import { Button } from '../Button'
import { User, Crown } from 'lucide-react'
import { ModalContainer } from './ModalContainer'

interface InvoquerEntiteModalProps {
  isOpen: boolean
  onClose: () => void
  nouveauNom: string
  setNouveauNom: (nom: string) => void
  typeChoisi: PersonnageType
  setTypeChoisi: (type: PersonnageType) => void
  onConfirm: () => void
}

export const InvoquerEntiteModal: React.FC<InvoquerEntiteModalProps> = ({
  isOpen,
  onClose,
  nouveauNom,
  setNouveauNom,
  typeChoisi,
  setTypeChoisi,
  onConfirm
}) => {
  if (!isOpen) return null

  return (
    <ModalContainer onClose={onClose} className="max-w-sm">
      <h3 className="text-xl font-cinzel font-black uppercase tracking-widest text-primary">Invocation</h3>
      
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-cinzel font-black uppercase opacity-40 ml-1">Identité</label>
          <input
            type="text" value={nouveauNom} onChange={(e) => setNouveauNom(e.target.value)}
            className="w-full bg-black/20 border border-theme/30 rounded-sm px-3 py-2 outline-none focus:border-theme-main font-garamond font-bold text-primary"
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-cinzel font-black uppercase opacity-40 ml-1">Catégorie</label>
          <div className="flex gap-2">
            <button 
              onClick={() => setTypeChoisi('PNJ')}
              className={`flex-1 py-2 rounded-sm text-[10px] font-cinzel font-bold border transition-all ${typeChoisi === 'PNJ' ? 'bg-theme-main border-theme-dark text-white' : 'bg-black/20 border-theme/20 opacity-40 text-primary'}`}
            >
              <User size={12} className="inline mr-1" /> PNJ
            </button>
            <button 
              onClick={() => setTypeChoisi('Boss')}
              className={`flex-1 py-2 rounded-sm text-[10px] font-cinzel font-bold border transition-all ${typeChoisi === 'Boss' ? 'bg-red-900 border-red-950 text-white' : 'bg-black/20 border-theme/20 opacity-40 text-primary'}`}
            >
              <Crown size={12} className="inline mr-1" /> BOSS
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1 font-cinzel text-xs h-10" onClick={onClose}>Annuler</Button>
        <Button className="flex-1 font-cinzel text-xs h-10" onClick={onConfirm}>Confirmer</Button>
      </div>
    </ModalContainer>
  )
}

export default InvoquerEntiteModal
