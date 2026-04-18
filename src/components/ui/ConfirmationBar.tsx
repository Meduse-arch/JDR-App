import React from 'react'
import { Button } from './Button'
import { Badge } from './Badge'
import { Check } from 'lucide-react'

interface ConfirmationBarProps {
  label?: string
  onConfirm: () => void
  onCancel: () => void
  confirmText?: string
  cancelText?: string
  loading?: boolean
  disabled?: boolean
}

export const ConfirmationBar: React.FC<ConfirmationBarProps> = ({
  label,
  onConfirm,
  onCancel,
  confirmText = "Valider",
  cancelText = "Annuler",
  loading = false,
  disabled = false
}) => {
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-50">
      <div className="bg-surface/95 backdrop-blur-xl border border-theme-main/30 p-3 rounded-sm flex items-center gap-4 shadow-2xl animate-in slide-in-from-bottom-8">
        {label && (
          <Badge variant="default" className="bg-theme-main text-white px-3 py-1 hidden sm:block truncate max-w-[120px] font-cinzel text-[10px]">
            {label}
          </Badge>
        )}
        <Button variant="secondary" size="sm" className="flex-1 h-10 font-cinzel" onClick={onCancel}>
          {cancelText}
        </Button>
        <Button 
          size="sm"
          className="flex-[1.5] h-10 font-cinzel" 
          onClick={onConfirm} 
          disabled={loading || disabled}
        >
          {loading ? 'Incantation...' : <><Check size={16} className="mr-2" /> {confirmText}</>}
        </Button>
      </div>
    </div>
  )
}
