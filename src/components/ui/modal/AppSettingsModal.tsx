import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ModalContainer } from './ModalContainer'
import { useStore } from '../../../store/useStore'
import { Button } from '../Button'
import { 
  Settings, 
  Layout, 
  Zap, 
  MousePointer2, 
  Grid, 
  BookOpen, 
  Monitor, 
  Compass,
  Info,
  ChevronRight,
  UserCircle
} from 'lucide-react'

interface AppSettingsModalProps {
  onClose: () => void
}

type TabId = 'general' | 'navigation' | 'display'

export function AppSettingsModal({ onClose }: AppSettingsModalProps) {
  const { 
    navigationMode, setNavigationMode, 
    showImmersiveNavButton, setShowImmersiveNavButton,
    itemDisplayMode, setItemDisplayMode,
    characterSheetMode, setCharacterSheetMode,
    sessionListViewMode, setSessionListViewMode
  } = useStore()

  const [activeTab, setActiveTab] = useState<TabId>('navigation')

  const tabs = [
    { id: 'navigation' as TabId, label: 'Navigation', icon: Compass, desc: 'Interface et menus' },
    { id: 'display' as TabId, label: 'Affichage', icon: Monitor, desc: 'Rendus et Codex' },
    { id: 'general' as TabId, label: 'Général', icon: Info, desc: 'À propos de Sigil' },
  ]

  const ControlGroup = ({ label, children }: { label: string, children: React.ReactNode }) => (
    <div className="flex flex-col gap-4 mb-8 last:mb-0">
      <h4 className="font-cinzel text-[10px] uppercase tracking-[0.3em] text-theme-main/50 font-bold border-b border-theme-main/10 pb-2">
        {label}
      </h4>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  )

  const SettingRow = ({ label, desc, active, onClick, icon: Icon }: { label: string, desc: string, active: boolean, onClick: () => void, icon?: any }) => (
    <div 
      onClick={onClick}
      className={`group flex items-center justify-between p-4 rounded-sm border cursor-pointer transition-all duration-300 ${
        active 
          ? 'bg-theme-main/10 border-theme-main/40 shadow-[inset_0_0_20px_rgba(var(--color-main-rgb),0.05)]' 
          : 'bg-black/20 border-white/5 hover:border-white/10 hover:bg-black/30'
      }`}
    >
      <div className="flex items-center gap-4">
        {Icon && (
          <div className={`p-2 rounded-sm ${active ? 'text-theme-main bg-theme-main/10' : 'text-primary/20 bg-white/5 group-hover:text-primary/40'}`}>
            <Icon size={18} />
          </div>
        )}
        <div className="flex flex-col">
          <span className={`font-cinzel text-sm font-bold tracking-widest uppercase transition-colors ${active ? 'text-primary' : 'text-primary/60'}`}>
            {label}
          </span>
          <span className="font-garamond italic text-xs text-primary/40 leading-tight">
            {desc}
          </span>
        </div>
      </div>
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${active ? 'border-theme-main bg-theme-main' : 'border-white/10'}`}>
        {active && <div className="w-2 h-2 rounded-full bg-app" />}
      </div>
    </div>
  )

  const SwitchRow = ({ label, desc, active, onToggle }: { label: string, desc: string, active: boolean, onToggle: () => void }) => (
    <div 
      onClick={onToggle}
      className="flex items-center justify-between p-4 rounded-sm bg-black/10 border border-white/5 hover:border-white/10 transition-all cursor-pointer group"
    >
      <div className="flex flex-col">
        <span className="font-cinzel text-sm font-bold text-primary/80 group-hover:text-primary transition-colors uppercase tracking-widest">{label}</span>
        <span className="font-garamond italic text-xs text-primary/40 leading-tight">{desc}</span>
      </div>
      <div className={`w-12 h-6 rounded-full relative transition-all duration-300 ${active ? 'bg-theme-main' : 'bg-black/40 border border-white/10'}`}>
        <motion.div 
          animate={{ x: active ? 24 : 4 }}
          className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-lg"
        />
      </div>
    </div>
  )

  return (
    <ModalContainer onClose={onClose} className="!max-w-[95%] lg:!max-w-7xl w-full !p-0 overflow-hidden">
      <div className="flex flex-col lg:flex-row h-[85vh] lg:h-[750px] max-h-[90vh]">
        {/* SIDEBAR NAVIGATION */}
        <aside className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-theme-main/10 bg-black/20 flex flex-col shrink-0">
          <div className="p-4 lg:p-8 border-b border-theme-main/10 bg-theme-main/5 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-theme-main/10 rounded-sm">
                <Settings className="text-theme-main" size={18} lg:size={20} />
              </div>
              <h2 className="text-base lg:text-lg font-cinzel font-black text-primary tracking-[0.2em] uppercase">
                Paramètres
              </h2>
            </div>
          </div>

          <nav className="flex lg:flex-col p-2 lg:p-4 gap-1 lg:gap-2 overflow-x-auto lg:overflow-y-auto no-scrollbar lg:custom-scrollbar shrink-0 lg:flex-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 lg:flex-none group flex items-center justify-center lg:justify-between p-3 lg:p-4 rounded-sm transition-all duration-300 relative whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-theme-main/10 text-primary shadow-[inset_0_0_15px_rgba(var(--color-main-rgb),0.05)]' 
                    : 'text-primary/40 hover:text-primary/70 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2 lg:gap-4">
                  <tab.icon size={16} lg:size={18} className={activeTab === tab.id ? 'text-theme-main' : 'opacity-40 group-hover:opacity-100'} />
                  <div className="flex flex-col items-start hidden sm:flex">
                    <span className="font-cinzel text-[10px] lg:text-xs font-bold uppercase tracking-[0.15em]">{tab.label}</span>
                    <span className="text-[8px] lg:text-[9px] font-garamond italic opacity-50 lowercase hidden lg:block">{tab.desc}</span>
                  </div>
                  <span className="font-cinzel text-[10px] font-bold uppercase sm:hidden">{tab.label}</span>
                </div>
                {activeTab === tab.id && (
                  <>
                    <motion.div layoutId="active-tab-indicator-v" className="absolute left-0 w-1 h-8 bg-theme-main rounded-r-full hidden lg:block" />
                    <motion.div layoutId="active-tab-indicator-h" className="absolute bottom-0 left-2 right-2 h-0.5 bg-theme-main rounded-t-full lg:hidden" />
                  </>
                )}
                <ChevronRight size={14} className={`hidden lg:block transition-transform duration-300 ${activeTab === tab.id ? 'opacity-40 translate-x-0' : 'opacity-0 -translate-x-2'}`} />
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-white/5 text-center hidden lg:block">
            <span className="text-[10px] font-cinzel tracking-widest text-primary/20 uppercase">Version 2.4.0 Alpha</span>
          </div>
        </aside>

        {/* CONTENT AREA */}
        <main className="flex-1 flex flex-col bg-app/50 backdrop-blur-xl relative min-h-0">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-[0.02] lg:opacity-[0.03] pointer-events-none select-none flex items-center justify-center text-[15rem] lg:text-[25rem] font-cinzel overflow-hidden">
            {tabs.find(t => t.id === activeTab)?.label[0]}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10 relative z-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-10">
                  <h3 className="text-3xl font-cinzel font-black text-primary tracking-widest uppercase mb-2">
                    {tabs.find(t => t.id === activeTab)?.label}
                  </h3>
                  <p className="font-garamond italic text-primary/50 text-lg">
                    Personnalisez votre expérience dans le Codex de Sigil.
                  </p>
                </div>

                {/* TAB CONTENT: NAVIGATION */}
                {activeTab === 'navigation' && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <ControlGroup label="Style de l'interface">
                      <SettingRow 
                        icon={Zap}
                        label="Immersif" 
                        desc="Le Grand Portail runique (Échap). Idéal pour le RP et l'immersion totale."
                        active={navigationMode === 'immersive'}
                        onClick={() => setNavigationMode('immersive')}
                      />
                      <SettingRow 
                        icon={Layout}
                        label="Basique" 
                        desc="Barre latérale et en-tête classiques. Navigation rapide et efficace."
                        active={navigationMode === 'basic'}
                        onClick={() => setNavigationMode('basic')}
                      />
                    </ControlGroup>

                    {navigationMode === 'immersive' && (
                      <ControlGroup label="Options Immersives">
                        <SwitchRow 
                          label="Bouton de secours"
                          desc="Affiche un sceau de navigation discret en bas à gauche pour ne jamais se perdre."
                          active={showImmersiveNavButton}
                          onToggle={() => setShowImmersiveNavButton(!showImmersiveNavButton)}
                        />
                      </ControlGroup>
                    )}
                  </div>
                )}

                {/* TAB CONTENT: DISPLAY */}
                {activeTab === 'display' && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <ControlGroup label="Vue des Grimoires">
                      <SettingRow 
                        icon={Grid}
                        label="Grille Classique" 
                        desc="Grandes cartes détaillées. Idéal pour admirer vos reliques et arcanes."
                        active={itemDisplayMode === 'grid'}
                        onClick={() => setItemDisplayMode('grid')}
                      />
                      <SettingRow 
                        icon={BookOpen}
                        label="Mode Codex" 
                        desc="Liste scindée interactive. Parfait pour une gestion rapide à l'écran."
                        active={itemDisplayMode === 'codex'}
                        onClick={() => setItemDisplayMode('codex')}
                      />
                    </ControlGroup>

                    <ControlGroup label="Immersion du Personnage">
                      <SwitchRow 
                        label="Mode Héros Immersif"
                        desc="Active le portrait central et les jauges circulaires sur votre fiche."
                        active={characterSheetMode === 'hero'}
                        onToggle={() => setCharacterSheetMode(characterSheetMode === 'hero' ? 'classic' : 'hero')}
                      />
                    </ControlGroup>

                    <ControlGroup label="Hall des Sessions">
                      <SwitchRow 
                        label="Mode Tarot"
                        desc="Affiche vos sessions sous forme de cartes d'arcanes mystiques."
                        active={sessionListViewMode === 'tarot'}
                        onToggle={() => setSessionListViewMode(sessionListViewMode === 'tarot' ? 'list' : 'tarot')}
                      />
                    </ControlGroup>
                  </div>
                )}

                {/* TAB CONTENT: GENERAL */}
                {activeTab === 'general' && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                    <div className="bg-theme-main/5 border border-theme-main/20 p-8 rounded-sm">
                      <div className="flex flex-col items-center text-center gap-4">
                        <div className="w-20 h-20 bg-theme-main/10 border-2 border-theme-main/30 rounded-full flex items-center justify-center">
                          <Settings className="text-theme-main animate-spin-slow" size={40} />
                        </div>
                        <div>
                          <h4 className="font-cinzel text-xl font-black text-primary tracking-widest uppercase">Sigil Project</h4>
                          <p className="font-garamond italic text-primary/60 mt-1">L'application de gestion de JDR immersive.</p>
                        </div>
                        <div className="h-px w-32 bg-theme-main/20 my-2" />
                        <div className="grid grid-cols-2 gap-8 text-left">
                          <div className="flex flex-col">
                            <span className="font-cinzel text-[10px] text-theme-main/50 uppercase tracking-widest">Créateur</span>
                            <span className="font-cinzel text-sm text-primary/80">L'Oracle du Code</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-cinzel text-[10px] text-theme-main/50 uppercase tracking-widest">Session</span>
                            <span className="font-cinzel text-sm text-primary/80 uppercase">Stable v2.4</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* FOOTER ACTIONS */}
          <div className="p-8 border-t border-white/5 bg-black/10 flex justify-end gap-4">
            <Button 
              variant="outline"
              onClick={onClose} 
              className="px-10 py-3 font-cinzel text-xs tracking-[0.2em] uppercase border-theme-main/30 hover:border-theme-main transition-all"
            >
              Fermer le menu
            </Button>
          </div>
        </main>
      </div>
    </ModalContainer>
  )
}
