import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'

type Personnage = {
  id: string
  nom: string
  hp_actuel: number
  hp_max: number
  mana_actuel: number
  mana_max: number
  stam_actuel: number
  stam_max: number
}

type Equipement = {
  id: string
  items: { nom: string; categorie: string }
}

const CATEGORIE_EMOJI: Record<string, string> = {
  Arme: '⚔️', Armure: '🛡️', Bijou: '💍', Consommable: '🧪', 'Artéfact': '✨', Divers: '📦'
}

export default function DashboardJoueur() {
  const compte = useStore(s => s.compte)
  const sessionActive = useStore(s => s.sessionActive)
  const setPageCourante = useStore(s => s.setPageCourante)
  
  const [personnage, setPersonnage] = useState<Personnage | null>(null)
  const [equipements, setEquipements] = useState<Equipement[]>([])
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    chargerDonnees()
  }, [sessionActive])

  const chargerDonnees = async () => {
    if (!sessionActive || !compte) { setChargement(false); return }
    
    // 1. Récupérer le perso
    const { data: persoData } = await supabase
      .from('session_joueurs')
      .select('personnages(*)')
      .eq('id_session', sessionActive.id)

    if (persoData) {
      const perso = persoData.map((d: any) => d.personnages).find((p: any) => p.lie_au_compte === compte.id && !p.est_pnj)
      
      if (perso) {
        setPersonnage(perso)
        // 2. Récupérer son équipement
        const { data: eqData } = await supabase
          .from('inventaire')
          .select('id, items(nom, categorie)')
          .eq('id_personnage', perso.id)
          .eq('equipe', true)
        
        if (eqData) setEquipements(eqData as any)
      }
    }
    setChargement(false)
  }

  if (chargement) return <div className="p-8 text-gray-400">Chargement de l'aventure...</div>

  if (!sessionActive) return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
      <span className="text-4xl">🏕️</span>
      <p>Rejoins une session pour commencer l'aventure.</p>
    </div>
  )

  if (!personnage) return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
      <span className="text-4xl">📜</span>
      <p>Tu n'as pas encore de personnage pour cette session.</p>
      <button 
        onClick={() => setPageCourante('mon-personnage')}
        className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-xl font-bold transition mt-2"
      >
        Créer mon personnage
      </button>
    </div>
  )

  const ressources = [
    { label: 'PV', emoji: '❤️', actuel: personnage.hp_actuel, max: personnage.hp_max, color: 'bg-red-500' },
    { label: 'Mana', emoji: '💧', actuel: personnage.mana_actuel, max: personnage.mana_max, color: 'bg-blue-500' },
    { label: 'Stam', emoji: '⚡', actuel: personnage.stam_actuel, max: personnage.stam_max, color: 'bg-yellow-500' },
  ]

  return (
    <div className="flex flex-col h-full text-white p-8 overflow-y-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-1">Bon retour, <span className="text-purple-400">{personnage.nom}</span></h2>
        <p className="text-gray-400">Session : {sessionActive.nom}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Actions Rapides */}
        <button onClick={() => setPageCourante('mon-personnage')} className="bg-gray-800 hover:bg-gray-700 p-6 rounded-2xl flex flex-col items-center justify-center gap-3 transition group border border-gray-700 hover:border-purple-500">
          <span className="text-4xl group-hover:scale-110 transition-transform">🎭</span>
          <span className="font-bold text-lg">Ma Fiche</span>
        </button>
        <button onClick={() => setPageCourante('mon-inventaire')} className="bg-gray-800 hover:bg-gray-700 p-6 rounded-2xl flex flex-col items-center justify-center gap-3 transition group border border-gray-700 hover:border-purple-500">
          <span className="text-4xl group-hover:scale-110 transition-transform">🎒</span>
          <span className="font-bold text-lg">Mon Sac</span>
        </button>
        <button onClick={() => setPageCourante('lancer-des')} className="bg-gray-800 hover:bg-gray-700 p-6 rounded-2xl flex flex-col items-center justify-center gap-3 transition group border border-gray-700 hover:border-purple-500">
          <span className="text-4xl group-hover:scale-110 transition-transform">🎲</span>
          <span className="font-bold text-lg">Lancer les Dés</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* État de santé */}
        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
          <h3 className="text-lg font-bold text-gray-300 mb-4 flex items-center gap-2"><span>🩺</span> État de santé</h3>
          <div className="flex flex-col gap-4">
            {ressources.map(r => (
              <div key={r.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-semibold text-gray-300">{r.emoji} {r.label}</span>
                  <span className="font-bold">{r.actuel} / {r.max}</span>
                </div>
                <div className="w-full bg-gray-900 rounded-full h-3">
                  <div className={`${r.color} h-3 rounded-full transition-all duration-500`} style={{ width: `${Math.min(100, (r.actuel / r.max) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Équipement Actuel */}
        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
          <h3 className="text-lg font-bold text-gray-300 mb-4 flex items-center gap-2"><span>⚔️</span> Actuellement Équipé</h3>
          {equipements.length === 0 ? (
            <p className="text-gray-500 text-sm italic">Aucun équipement porté.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {equipements.map(eq => (
                <div key={eq.id} className="flex items-center gap-3 bg-gray-900 p-3 rounded-xl border border-gray-700">
                  <span className="text-xl">{CATEGORIE_EMOJI[eq.items.categorie] || '📦'}</span>
                  <div>
                    <p className="font-semibold text-sm">{eq.items.nom}</p>
                    <p className="text-xs text-gray-500">{eq.items.categorie}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}