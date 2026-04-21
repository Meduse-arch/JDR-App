import { ModalContainer } from './ModalContainer'
import { useStore } from '../../../store/useStore'
import { Button } from '../Button'
import { Settings, Layout, Zap } from 'lucide-react'

interface AppSettingsModalProps {
  onClose: () => void
}

export function AppSettingsModal({ onClose }: AppSettingsModalProps) {
  const { navigationMode, setNavigationMode } = useStore()

  return (
    <ModalContainer onClose={onClose} className="max-w-md">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="text-theme-main" size={24} />
        <h2 className="text-xl font-cinzel font-bold text-primary tracking-widest uppercase">
          Paramètres App
        </h2>
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-cinzel text-theme-main border-b border-theme-main/20 pb-2 mb-4 flex items-center gap-2">
          <Layout size={18} /> Style de Navigation
        </h3>
        
        <div className="grid grid-cols-1 gap-3">
          <label 
            className={`flex items-center justify-between p-4 rounded border cursor-pointer transition-all ${navigationMode === 'immersive' ? 'bg-theme-main/10 border-theme-main shadow-inner' : 'bg-black/20 border-theme/10 hover:border-theme/30'}`}
            onClick={() => setNavigationMode('immersive')}
          >
            <div className="flex items-center gap-3">
              <Zap size={20} className={navigationMode === 'immersive' ? 'text-theme-main' : 'text-primary/40'} />
              <div className="flex flex-col">
                <span className="font-cinzel text-sm font-bold text-primary uppercase tracking-widest">Immersif</span>
                <span className="font-garamond italic text-xs text-primary/60">Le Grand Portail (Échap)</span>
              </div>
            </div>
            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${navigationMode === 'immersive' ? 'border-theme-main bg-theme-main' : 'border-theme/30'}`}>
              {navigationMode === 'immersive' && <div className="w-1.5 h-1.5 rounded-full bg-app" />}
            </div>
          </label>

          <label 
            className={`flex items-center justify-between p-4 rounded border cursor-pointer transition-all ${navigationMode === 'basic' ? 'bg-theme-main/10 border-theme-main' : 'bg-black/20 border-theme/10 hover:border-theme/30'}`}
            onClick={() => setNavigationMode('basic')}
          >
            <div className="flex items-center gap-3">
              <Layout size={20} className={navigationMode === 'basic' ? 'text-theme-main' : 'text-primary/40'} />
              <div className="flex flex-col">
                <span className="font-cinzel text-sm font-bold text-primary uppercase tracking-widest">Basique</span>
                <span className="font-garamond italic text-xs text-primary/60">Sidebar & Header classiques</span>
              </div>
            </div>
            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${navigationMode === 'basic' ? 'border-theme-main bg-theme-main' : 'border-theme/30'}`}>
              {navigationMode === 'basic' && <div className="w-1.5 h-1.5 rounded-full bg-app" />}
            </div>
          </label>
        </div>
      </div>

      <div className="flex justify-end mt-8">
        <Button onClick={onClose} className="w-full">
          Fermer
        </Button>
      </div>
    </ModalContainer>
  )
}
