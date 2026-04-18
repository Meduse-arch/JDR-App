import { usePersonnage } from '../../hooks/usePersonnage'
import CompetenceView from '../../components/competences/CompetenceView'

export default function MesCompetences() {
  const { personnage } = usePersonnage()
  return (
    <div className="h-full relative">
      {/* RUNE GÉANTE EN FOND */}
      <div className="absolute inset-0 flex items-center justify-center text-[30rem] md:text-[50rem] opacity-[0.02] pointer-events-none select-none font-cinzel z-0">ᚨ</div>
      <div className="relative z-10 h-full">
        {personnage && <CompetenceView mode="utiliser" personnage={personnage} />}
      </div>
    </div>
  )
}
