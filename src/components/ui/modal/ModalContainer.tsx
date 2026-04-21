import { ReactNode } from 'react'
import { X } from 'lucide-react'
interface ModalContainerProps {
  onClose: () => void
  children: ReactNode
  className?: string
}

export function ModalContainer({ onClose, children, className = '' }: ModalContainerProps) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[1000] p-4 bg-black/70 backdrop-blur-sm"
      style={{ minHeight: '100vh', width: '100vw' }}
      onClick={onClose}
    >

      <div
        className={`relative w-full max-w-xl flex flex-col gap-4 p-6 shadow-2xl ${className}`}
        style={{ background: 'var(--bg-card)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Coins médiévaux */}
        <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t border-l border-theme-main/70" />
        <div className="absolute top-0 right-0 w-3.5 h-3.5 border-t border-r border-theme-main/70" />
        <div className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b border-l border-theme-main/70" />
        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b border-r border-theme-main/70" />
        <div className="absolute -top-[2.5px] -left-[2.5px] w-[5px] h-[5px] rounded-full bg-theme-main/80 shadow-[0_0_6px_rgba(var(--color-main-rgb),0.5)]" />
        <div className="absolute -top-[2.5px] -right-[2.5px] w-[5px] h-[5px] rounded-full bg-theme-main/80 shadow-[0_0_6px_rgba(var(--color-main-rgb),0.5)]" />
        <div className="absolute -bottom-[2.5px] -left-[2.5px] w-[5px] h-[5px] rounded-full bg-theme-main/80 shadow-[0_0_6px_rgba(var(--color-main-rgb),0.5)]" />
        <div className="absolute -bottom-[2.5px] -right-[2.5px] w-[5px] h-[5px] rounded-full bg-theme-main/80 shadow-[0_0_6px_rgba(var(--color-main-rgb),0.5)]" />
        <div className="absolute top-0 left-3.5 right-3.5 h-px bg-linear-to-r from-transparent via-theme-main/80 to-transparent" />
        <div className="absolute bottom-0 left-3.5 right-3.5 h-px bg-linear-to-r from-transparent via-theme-main/80 to-transparent" />
        <div className="absolute top-3.5 bottom-3.5 left-0 w-px bg-linear-to-b from-transparent via-theme-main/25 to-transparent" />
        <div className="absolute top-3.5 bottom-3.5 right-0 w-px bg-linear-to-b from-transparent via-theme-main/25 to-transparent" />
        <button onClick={onClose} className="absolute top-3 right-3 text-theme-main/30 hover:text-theme-main transition-all z-10">
          <X size={18} />
        </button>
        {children}
      </div>
    </div>
  )
}
