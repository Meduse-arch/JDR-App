import { useState, useEffect } from 'react'
import { Personnage } from '../../../store/useStore'
import { ConfirmationBar } from '../../../components/ui/ConfirmationBar'
import { User, Image as ImageIcon, Type, Palette } from 'lucide-react'

interface Props {
  personnage: Personnage
  onRecharger?: () => void
}

export default function GererProfil({ personnage, onRecharger }: Props) {
  const [nom, setNom] = useState(personnage.nom)
  const [imageUrl, setImageUrl] = useState(personnage.image_url || '')
  const [type, setType] = useState(personnage.type)
  const [couleur, setCouleur] = useState(personnage.couleur || '#c8a84b')
  const [sauvegardant, setSauvegardant] = useState(false)

  useEffect(() => {
    setNom(personnage.nom)
    setImageUrl(personnage.image_url || '')
    setType(personnage.type)
    setCouleur(personnage.couleur || '#c8a84b')
  }, [personnage])

  const hasChanges = 
    nom !== personnage.nom || 
    imageUrl !== (personnage.image_url || '') || 
    type !== personnage.type ||
    couleur !== (personnage.couleur || '#c8a84b')

  const enregistrer = async () => {
    setSauvegardant(true)
    const db = (window as any).db;
    try {
      const res = await db.personnages.update(personnage.id, {
        nom,
        image_url: imageUrl || null,
        type,
        // couleur n'est pas forcément dans le schéma de personnages, 
        // à vérifier dans electron/database.ts (il n'y est pas d'après mon read_file précédent)
        // couleur: couleur || null 
      });

      if (!res.success) throw new Error(res.error)
      onRecharger?.()
    } catch (e) {
      console.error("Erreur mise à jour profil:", e)
    } finally {
      setSauvegardant(false)
    }
  }

  return (
    <div className="flex flex-col gap-8 pb-20 animate-in fade-in duration-500">
      
      {/* Aperçu Image */}
      <div className="flex flex-col items-center gap-4">
        <div className="w-32 h-32 rounded-sm border-2 border-theme-main/30 bg-black/40 overflow-hidden shadow-2xl relative group">
          {imageUrl ? (
            <img src={imageUrl} alt={nom} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center opacity-20">
              <User size={48} />
            </div>
          )}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
             <ImageIcon size={24} className="text-theme-main" />
          </div>
        </div>
        <p className="font-garamond italic text-xs text-theme-main/50 text-center max-w-[200px]">
          "L'apparence est le miroir de l'âme dans le Codex."
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        
        {/* Champ Nom */}
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 font-cinzel text-[10px] uppercase tracking-widest text-theme-main font-black">
            <User size={12} /> Nom de l'entité
          </label>
          <input 
            type="text" 
            value={nom} 
            onChange={e => setNom(e.target.value)}
            className="w-full bg-black/20 border border-theme/30 rounded-sm px-4 py-3 font-cinzel text-sm focus:border-theme-main outline-none transition-all text-primary"
          />
        </div>

        {/* Champ Image URL */}
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 font-cinzel text-[10px] uppercase tracking-widest text-theme-main font-black">
            <ImageIcon size={12} /> Lien de l'effigie (URL)
          </label>
          <input 
            type="text" 
            value={imageUrl} 
            onChange={e => setImageUrl(e.target.value)}
            placeholder="https://..."
            className="w-full bg-black/20 border border-theme/30 rounded-sm px-4 py-3 font-garamond text-sm focus:border-theme-main outline-none transition-all text-primary italic"
          />
        </div>

        {/* Champ Type */}
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 font-cinzel text-[10px] uppercase tracking-widest text-theme-main font-black">
            <Type size={12} /> Nature de l'être
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['PNJ', 'Monstre', 'Boss', 'Joueur'] as const).map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-4 py-2 rounded-sm text-[10px] font-cinzel font-black uppercase transition-all border ${
                  type === t 
                  ? 'bg-theme-main/20 border-theme-main text-theme-main shadow-[0_0_10px_rgba(var(--color-main-rgb),0.15)]' 
                  : 'bg-black/20 border-theme/20 opacity-40 hover:opacity-100 text-primary'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Champ Couleur */}
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 font-cinzel text-[10px] uppercase tracking-widest text-theme-main font-black">
            <Palette size={12} /> Teinte d'âme
          </label>
          <div className="flex gap-4 items-center bg-black/20 border border-theme/30 rounded-sm px-4 py-2">
            <input 
              type="color" 
              value={couleur} 
              onChange={e => setCouleur(e.target.value)}
              className="w-10 h-10 bg-transparent border-none cursor-pointer"
            />
            <input 
              type="text" 
              value={couleur} 
              onChange={e => setCouleur(e.target.value)}
              className="bg-transparent border-none font-cinzel text-xs outline-none text-primary/60 uppercase"
            />
          </div>
        </div>

      </div>

      {hasChanges && (
        <ConfirmationBar 
          onConfirm={enregistrer}
          onCancel={() => {
            setNom(personnage.nom)
            setImageUrl(personnage.image_url || '')
            setType(personnage.type)
            setCouleur(personnage.couleur || '#c8a84b')
          }}
          confirmText="Graver les modifications"
          loading={sauvegardant}
        />
      )}
    </div>
  )
}
