import { useStore } from '../../store/useStore'
import logo from '/logo.png'

type Props = {
  allerVers: (page: 'connexion' | 'inscription') => void
}

export default function Accueil({ allerVers }: Props) {
  const { mode } = useStore()

  return (
    <div className={`flex flex-col items-center justify-center h-screen relative overflow-hidden transition-colors duration-500 ${mode} bg-app text-primary p-6`}>
      {/* LA RUNE GÉANTE EN FOND */}
      <div className="fixed inset-0 flex items-center justify-center text-[30rem] md:text-[50rem] opacity-[0.03] pointer-events-none select-none font-cinzel">ᛟ</div>

      {/* CONTENU CENTRAL (CENTRE VERTICALEMENT) */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-4 sm:gap-8 w-full max-w-2xl">
        {/* LOGO - TAILLE RÉDUITE SUR PETITS ÉCRANS */}
        <img 
          src={logo} 
          alt="Sigil Logo" 
          className="w-24 h-24 sm:w-32 md:w-40 object-contain drop-shadow-[0_0_30px_rgba(212,175,55,0.15)] animate-pulse" 
        />

        {/* TITRES */}
        <div className="text-center">
          <h1 className="font-cinzel text-5xl sm:text-6xl md:text-8xl font-black text-primary tracking-[0.2em] leading-tight">
            SIGIL
          </h1>
          <h2 className="font-garamond italic text-base sm:text-xl md:text-2xl text-theme-main tracking-[0.2em] sm:tracking-[0.3em]">
            Codex & Oracle
          </h2>
        </div>

        {/* TEXTE ÉPURÉ - CACHÉ SUR TRÈS PETITS ÉCRANS SI BESOIN OU RÉDUIT */}
        <div className="flex flex-col items-center gap-2 sm:gap-4 px-4 text-center">
          <span className="text-xl text-theme-main opacity-50">✧</span>
          <p className="font-garamond italic text-base sm:text-lg md:text-xl text-secondary max-w-md leading-relaxed">
            "Forgez votre légende dans le Codex.<br className="hidden sm:block"/>L'Oracle attend votre premier jet."
          </p>
        </div>

        {/* BOUTONS - PLUS PROCHES DU CONTENU */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto px-8 sm:px-0">
          <button
            onClick={() => allerVers('connexion')}
            className="bg-gradient-to-r from-theme-main to-theme-accent2 text-white font-cinzel font-black tracking-widest px-8 py-3 rounded-sm hover:scale-105 transition-all shadow-xl shadow-theme-main/20 min-w-[180px]"
          >
            S'ÉVEILLER
          </button>
          <button
            onClick={() => allerVers('inscription')}
            className="bg-transparent border-2 border-theme-main text-theme-main font-cinzel font-black tracking-widest px-8 py-3 rounded-sm hover:bg-theme-main/10 transition-all min-w-[180px]"
          >
            S'INSCRIRE
          </button>
        </div>
      </div>
    </div>
  )
}
