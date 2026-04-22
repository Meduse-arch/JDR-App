import { Trophy, Gift, Sparkles, CheckCircle2, XCircle, RotateCcw } from 'lucide-react'
import { Quete } from '../../../types'
import { Button } from '../Button'
import { ModalContainer } from './ModalContainer'

interface QueteDetailModalProps {
  quete: Quete | null
  mode: 'forge' | 'joueur'
  onClose: () => void
  onTerminer?: (id: string) => void
  onEchouer?: (id: string) => void
  onReouvrir?: (id: string) => void
  onSuivre?: (quete: any) => void
  onEditer?: (quete: Quete) => void
}

export const QueteDetailModal: React.FC<QueteDetailModalProps> = ({
  quete, 
  mode, 
  onClose, 
  onTerminer, 
  onEchouer, 
  onReouvrir, 
  onSuivre, 
  onEditer 
}) => {
  if (!quete) return null

  const isEnCours = quete.statut === 'En cours'
  const isTerminee = quete.statut === 'Terminée'
  const isEchouee = quete.statut === 'Échouée'

  return (
    <ModalContainer onClose={onClose} className="max-w-lg">
      <div className="flex gap-4 items-start">
        <div className="flex-1 flex flex-col gap-2">
          <div className={`w-fit font-cinzel text-[10px] tracking-[0.2em] px-2 py-0.5 uppercase ${
            isTerminee ? 'bg-green-500/20 text-green-500' :
            isEchouee ? 'bg-red-500/20 text-red-500' :
            'bg-theme-main/20 text-theme-main'
          }`}>
            {quete.statut}
          </div>
          <h3 className="text-2xl font-cinzel font-black uppercase tracking-widest text-primary">
            {quete.titre}
          </h3>
        </div>

        {quete.image_url && (
          <div className="w-20 h-20 shrink-0 rounded-sm overflow-hidden border border-theme-main/30 bg-black/40 shadow-xl">
            <img 
              src={quete.image_url} 
              alt={quete.titre} 
              className="w-full h-full object-cover" 
            />
          </div>
        )}
      </div>

      <div className="bg-black/20 p-4 rounded-sm border-l-4 border-theme-main/40 max-h-40 overflow-y-auto custom-scrollbar">
        <p className="font-garamond text-lg italic text-secondary leading-relaxed">
          "{quete.description || "Nul récit ne trouble encore le silence..."}"
        </p>
      </div>

      {quete.quete_recompenses && quete.quete_recompenses.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="font-cinzel text-xs uppercase tracking-[0.2em] text-theme-main flex items-center gap-2">
            <Trophy size={14} /> Récompenses
          </h4>
          <div className="flex flex-wrap gap-2">
            {quete.quete_recompenses.map((r, i) => (
              <div key={i} className="bg-black/40 px-3 py-1 border border-theme-main/20 flex items-center gap-2 rounded-sm">
                {r.type === 'Item' ? (
                  <>
                    <Gift size={12} className="text-theme-main opacity-60" />
                    <span className="font-cinzel text-[10px] font-bold text-theme-main">{r.items?.nom || 'Objet Mystérieux'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={12} className="text-theme-main opacity-60" />
                    <span className="font-garamond italic text-xs text-theme-main">{r.description}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 mt-2">
        {mode === 'forge' && isEnCours && (
          <>
            <Button 
              variant="primary"
              onClick={() => onEditer?.(quete)}
              className="flex-[2] py-3 text-xs uppercase tracking-widest"
            >
              Retoucher le Destin
            </Button>
            <Button 
              variant="success" 
              onClick={() => { onTerminer?.(quete.id); onClose() }}
              className="flex-1 py-3"
              title="Terminer"
            >
              <CheckCircle2 size={16} />
            </Button>
            <Button 
              variant="danger" 
              onClick={() => { onEchouer?.(quete.id); onClose() }}
              className="flex-1 py-3"
              title="Échouer"
            >
              <XCircle size={16} />
            </Button>
          </>
        )}

        {mode === 'forge' && (isTerminee || isEchouee) && (
          <Button 
            variant="secondary"
            onClick={() => { onReouvrir?.(quete.id); onClose() }}
            className="flex-1 py-3 gap-2 uppercase text-xs tracking-widest"
          >
            <RotateCcw size={14} />
            Réouvrir le Récit
          </Button>
        )}

        {mode === 'joueur' && isEnCours && (
          <Button 
            className="w-full py-3 uppercase text-xs tracking-widest"
            variant={(quete as any).suivie ? 'secondary' : 'primary'}
            onClick={() => onSuivre?.(quete)}
          >
            {(quete as any).suivie ? 'Cesser le Suivi' : 'Inscrire au Suivi'}
          </Button>
        )}
      </div>
    </ModalContainer>
  )
}

export default QueteDetailModal
