import { useStore } from '../../store/useStore';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import RunicDecoder from './RunicDecoder';
import { getPageLabel } from '../../config/menus';

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const { pageCourante } = useStore();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayPage, setDisplayPage] = useState(pageCourante);

  useEffect(() => {
    if (pageCourante !== displayPage) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setDisplayPage(pageCourante);
        setIsTransitioning(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [pageCourante, displayPage]);

  return (
    <>
      <AnimatePresence mode="wait">
        {isTransitioning && (
          <motion.div
            key="transition-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-50 bg-app flex items-center justify-center pointer-events-none"
          >
            <div className="text-center">
              <RunicDecoder 
                text={getPageLabel(pageCourante)} 
                speed={40} 
                revealSpeed={120} 
                className="text-4xl font-cinzel font-black text-theme-main tracking-widest drop-shadow-lg" 
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {!isTransitioning && (
          <motion.div
            key={displayPage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="h-full w-full"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
