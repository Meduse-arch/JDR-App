import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../supabase'
import { useStore, type Personnage } from '../../store/useStore'
import { Card } from '../../components/ui/card'
import { User, Plus } from 'lucide-react'
import CreerPersonnage from '../shared/CreerPersonnage'

export default function SelectionJoueur() {
  const { compte, sessionActive, setPersonnageJoueur, setPageCourante } = useStore()
  const [mesPersonnages, setMesPersonnages] = useState<Personnage[]>([])
  const [isForging, setIsForging] = useState(false)

  const chargerPersonnages = useCallback(async () => {
    if (!compte || !sessionActive) return
    const { data } = await supabase.from('v_personnages').select('*')
      .eq('id_session', sessionActive.id).eq('lie_au_compte', compte.id).eq('is_template', false)
    if (data) {
      const persos = data as Personnage[]
      setMesPersonnages(persos)
      
      // Auto-connexion UNIQUEMENT si on arrive depuis 
      // la session (pas depuis la sidebar)
      // On vérifie via sessionStorage pour ne faire ça qu'une fois
      const dejaVisite = sessionStorage.getItem('sigil-selection-visitee')
      if (persos.length === 1 && !dejaVisite) {
        sessionStorage.setItem('sigil-selection-visitee', '1')
        setPersonnageJoueur(persos[0])
        setPageCourante('dashboard')
        return
      }
      // Marquer comme visité pour les prochaines fois
      sessionStorage.setItem('sigil-selection-visitee', '1')
    }
  }, [compte, sessionActive, setPersonnageJoueur, setPageCourante])

  useEffect(() => {
    chargerPersonnages()
  }, [chargerPersonnages])

  const choisirInspiration = (p: Personnage) => {
    setPersonnageJoueur(p)
    setPageCourante('dashboard')
  }

  if (isForging) return <CreerPersonnage type="Joueur" retour={() => { setIsForging(false); chargerPersonnages(); }} />

  // Cas joueur sans personnage : écran d'accueil immersif
  if (mesPersonnages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-10 px-6 text-center">
        
        {/* Rune géante seule, sans icône par dessus */}
        <span className="font-cinzel text-[8rem] text-theme-main opacity-10 select-none leading-none">
          ᛉ
        </span>

        {/* Texte d'accueil */}
        <div className="flex flex-col gap-4 max-w-md -mt-6">
          <h2 className="font-cinzel font-black text-2xl uppercase tracking-[0.2em] text-primary">
            Votre légende commence ici
          </h2>
          <p className="font-garamond italic text-primary/70 text-lg leading-relaxed">
            Aucune âme n'a encore été inscrite dans le Codex pour cette session. 
            Forgez votre premier destin.
          </p>
        </div>

        {/* Bouton de création */}
        <button
          onClick={() => setIsForging(true)}
          className="group relative flex items-center gap-4 px-10 py-5 border border-theme-main/40 hover:border-theme-main bg-theme-main/5 hover:bg-theme-main/15 transition-all duration-500"
        >
          <Plus 
            size={18} 
            className="text-theme-main group-hover:rotate-90 transition-transform duration-500" 
          />
          <span className="font-cinzel font-black uppercase tracking-[0.3em] text-theme-main text-sm">
            Invoquer un nouveau destin
          </span>
        </button>

        {/* Runes décoratives */}
        <div className="flex gap-6">
          {['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ'].map((r, i) => (
            <span key={i} className="font-cinzel text-theme-main/30 text-lg">{r}</span>
          ))}
        </div>
      </div>
    )
  }

  // Cas joueur avec personnages : grille normale
  return (
    <div className="flex flex-col items-center w-full pt-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 w-full max-w-6xl mx-auto px-6 pb-20">
        {mesPersonnages.map(p => (
          <Card 
            key={p.id} 
            onClick={() => choisirInspiration(p)}
            className="flex flex-row p-0 overflow-hidden cursor-pointer medieval-border bg-card/20 hover:bg-card/40 hover:shadow-[0_0_30px_rgba(var(--color-main-rgb),0.2)] hover:border-theme-main/50 transition-all group h-44"
          >
            <div className="w-44 bg-black/40 flex items-center justify-center border-r border-theme-main/10 relative shrink-0">
              <User size={64} className="text-theme-main opacity-10 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700" />
              <div className="absolute inset-0 bg-theme-main/5 group-hover:bg-transparent transition-colors" />
            </div>
            <div className="flex-1 p-8 flex flex-col justify-center">
              <h3 className="text-3xl font-cinzel font-black text-primary uppercase tracking-widest group-hover:text-theme-main transition-colors">
                {p.nom}
              </h3>
              <div className="flex gap-4 mt-4 opacity-40 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] font-black text-red-500/70">{p.hp} SANG</span>
                <span className="text-[10px] font-black text-blue-500/70">{p.mana} SOUFFLE</span>
                <span className="text-[10px] font-black text-amber-500/70">{p.stam} VIGUEUR</span>
              </div>
            </div>
          </Card>
        ))}

        {/* Carte création toujours présente */}
        <Card 
          onClick={() => setIsForging(true)}
          className="flex flex-row p-0 overflow-hidden cursor-pointer border-dashed border-2 border-theme-main/20 hover:border-theme-main/60 bg-black/10 hover:bg-theme-main/5 transition-all group h-44"
        >
          <div className="w-44 flex items-center justify-center border-r border-theme-main/10 border-dashed relative shrink-0">
            <Plus size={64} className="text-theme-main opacity-10 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700" />
          </div>
          <div className="flex-1 p-8 flex flex-col justify-center">
            <h3 className="text-2xl font-cinzel font-black text-theme-main opacity-40 uppercase tracking-widest group-hover:opacity-100 transition-colors">
              Invoquer un nouveau destin
            </h3>
          </div>
        </Card>
      </div>
    </div>
  )
}