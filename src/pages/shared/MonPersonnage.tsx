import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useStore } from '../../store/useStore'
import { usePersonnage } from '../../hooks/usePersonnage'
import { useStats } from '../../hooks/useStats'
import { BarreRessource } from '../../components/BarreRessource'
import { personnageService } from '../../services/personnageService'
import { Card } from '../../components/ui/card'
import { Badge } from '../../components/ui/Badge'
import { ConfirmButton } from '../../components/ui/ConfirmButton'
import { useResourceManagement, type RessourceKey } from '../../hooks/useResourceManagement'
import { CONFIG_RESSOURCES } from '../../utils/constants'
import { Swords, Zap, Book, Eye, Shield, Users, UserCircle, Camera, X, Check, AlertCircle } from 'lucide-react'

const STAT_ICONS: Record<string, any> = {
  'Force': Swords,
  'Agilité': Zap,
  'Intelligence': Book,
  'Perception': Eye,
  'Constitution': Shield,
  'Charisme': Users
}

// ─── Modal modification image de profil ─────────────────────────────────────

interface ImageModalProps {
  currentUrl: string | null | undefined
  onClose: () => void
  onSave: (url: string) => Promise<void>
}

function ImageModal({ currentUrl, onClose, onSave }: ImageModalProps) {
  const [url, setUrl] = useState(currentUrl || '')
  const [preview, setPreview] = useState(currentUrl || '')
  const [loading, setLoading] = useState(false)
  const [previewError, setPreviewError] = useState(false)

  const handleUrlChange = (val: string) => {
    setUrl(val)
    setPreviewError(false)
    setPreview(val)
  }

  const handleSave = async () => {
    setLoading(true)
    await onSave(url.trim())
    setLoading(false)
    onClose()
  }

  const handleRemove = async () => {
    setLoading(true)
    await onSave('')
    setLoading(false)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[rgba(10,8,5,0.98)] border border-[rgba(184,142,60,0.25)] rounded-xl shadow-2xl p-6 w-[360px] max-w-[90vw] flex flex-col gap-5"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-cinzel font-black text-sm uppercase tracking-[0.2em] text-[#c8a84b]">
            Image du Personnage
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded flex items-center justify-center text-[rgba(200,168,75,0.4)] hover:text-[#c8a84b] hover:bg-[rgba(200,168,75,0.1)] transition-all"
          >
            <X size={15} />
          </button>
        </div>

        {/* Aperçu */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-28 h-28 rounded-full border-2 border-[rgba(184,142,60,0.3)] overflow-hidden bg-black/30 relative flex items-center justify-center">
            {preview && !previewError ? (
              <img
                src={preview}
                alt="Aperçu"
                className="w-full h-full object-cover"
                onError={() => setPreviewError(true)}
              />
            ) : (
              <UserCircle size={64} className="text-[rgba(200,168,75,0.2)]" />
            )}
          </div>
          {previewError && preview && (
            <div className="flex items-center gap-1.5 text-[10px] text-[rgba(220,100,100,0.8)] font-cinzel">
              <AlertCircle size={11} />
              URL invalide ou image inaccessible
            </div>
          )}
        </div>

        {/* Champ URL */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-cinzel uppercase tracking-widest text-[rgba(200,168,75,0.5)]">
            URL de l'image
          </label>
          <input
            type="text"
            value={url}
            onChange={e => handleUrlChange(e.target.value)}
            placeholder="https://exemple.com/image.png"
            className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(184,142,60,0.2)] rounded-lg px-3 py-2.5
              text-sm text-[rgba(232,217,176,0.9)] placeholder:text-[rgba(200,168,75,0.2)]
              focus:outline-none focus:border-[rgba(184,142,60,0.5)] focus:bg-[rgba(255,255,255,0.06)]
              font-mono transition-all"
            autoFocus
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          {currentUrl && (
            <button
              onClick={handleRemove}
              disabled={loading}
              className="flex-1 py-2 rounded-lg border border-[rgba(180,50,50,0.3)] text-[rgba(220,100,100,0.7)]
                hover:bg-[rgba(180,50,50,0.1)] hover:text-[#e87a7a] hover:border-[rgba(180,50,50,0.5)]
                font-cinzel text-[10px] uppercase tracking-widest transition-all disabled:opacity-40"
            >
              Supprimer
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={loading || (!!url && previewError)}
            className="flex-1 py-2 rounded-lg border border-[rgba(184,142,60,0.4)] bg-[rgba(200,168,75,0.08)]
              text-[rgba(200,168,75,0.9)] hover:bg-[rgba(200,168,75,0.15)] hover:text-[#c8a84b]
              font-cinzel text-[10px] uppercase tracking-widest transition-all disabled:opacity-40
              flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="animate-pulse">Sauvegarde…</span>
            ) : (
              <><Check size={12} /> Valider</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function MonPersonnage() {
  const pnjControle    = useStore(s => s.pnjControle)
  const setPnjControle = useStore(s => s.setPnjControle)

  const { personnage, rechargerPersonnage, mettreAJourLocalement, mettreAJourRessourceHybride } = usePersonnage()
  const { stats } = useStats()

  const { deltas, updateDelta, adjustDelta, appliquerDelta } = useResourceManagement(
    personnage, 
    mettreAJourLocalement, 
    mettreAJourRessourceHybride
  )

  const [pseudoJoueur, setPseudoJoueur] = useState<string | null>(null)
  const [showImageModal, setShowImageModal] = useState(false)

  useEffect(() => {
    if (personnage?.lie_au_compte) {
      supabase.from('comptes').select('pseudo').eq('id', personnage.lie_au_compte).single()  
        .then(({ data }) => { if (data) setPseudoJoueur(data.pseudo) })
    }
  }, [personnage?.lie_au_compte])

  const handleSupprimerPersonnage = async () => {
    if (!personnage) return
    const success = await personnageService.deletePersonnage(personnage.id)
    if (success) {
      if (pnjControle) setPnjControle(null)
      rechargerPersonnage()
    }
  }

  // Sauvegarde de l'image via mettreAJourLocalement (qui appelle updatePersonnage)
  const handleSaveImage = async (url: string) => {
    await mettreAJourLocalement({ image_url: url || null })
  }

  if (!personnage) return null

  const ressources = (Object.keys(CONFIG_RESSOURCES) as RessourceKey[]).map(key => ({        
    ...CONFIG_RESSOURCES[key],
    actuel: personnage[key as keyof typeof personnage] as number,
    max: personnage[`${key}_max` as keyof typeof personnage] as number,
    rKey: key
  }))

  return (
    <div className="flex flex-col relative">
      {/* Modal image de profil */}
      {showImageModal && (
        <ImageModal
          currentUrl={personnage.image_url}
          onClose={() => setShowImageModal(false)}
          onSave={handleSaveImage}
        />
      )}

      {/* BARRE D'INFOS SOBRE DU PERSONNAGE */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 mt-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="font-cinzel text-[10px] tracking-[0.2em] border-theme-main/30 text-theme-main">
              {personnage.type === 'Joueur' ? 'AVENTURIER' : 'ENTITÉ'}
            </Badge>
            <span className="text-xs font-garamond italic opacity-40 uppercase tracking-widest">
              Lié à l'âme de : {pseudoJoueur || '...'}
            </span>
          </div>
        </div>
        <ConfirmButton 
          variant="danger" 
          size="sm" 
          onConfirm={handleSupprimerPersonnage} 
          className="opacity-30 hover:opacity-100 transition-opacity font-cinzel text-[10px] uppercase"
        >
          Effacer du récit
        </ConfirmButton>
      </div>

      {/* 🏛️ IDENTITÉ DU HÉROS */}
      <div className="flex flex-col items-center mb-6">
        <span className="font-cinzel text-[10px] font-black text-theme-main tracking-[0.4em] opacity-40 uppercase">[ HÉROS INCARNÉ ]</span>
        <h2 className="text-xl md:text-2xl font-cinzel font-black text-primary mt-1 uppercase tracking-widest drop-shadow-sm">
          {personnage?.nom}
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* GAUCHE: ÉTAT VITAL & AVATAR */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          <Card className="medieval-border p-8 flex flex-col items-center gap-6 bg-card/20 backdrop-blur-sm">
            {/* Avatar cliquable */}
            <button
              onClick={() => setShowImageModal(true)}
              className="group w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-theme/30 p-1 relative overflow-hidden bg-black/20 hover:border-theme-main/60 transition-all duration-300 focus:outline-none"
              title="Modifier l'image de profil"
            >
              {/* Image ou initiale */}
              {personnage.image_url ? (
                <img
                  src={personnage.image_url}
                  alt={personnage.nom}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <>
                  <UserCircle size="100%" className="text-theme-main opacity-20 absolute inset-0 scale-110" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-cinzel text-4xl font-black text-theme-main opacity-40">
                      {personnage.nom[0]}
                    </span>
                  </div>
                </>
              )}
              {/* Overlay caméra au hover */}
              <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/50 flex items-center justify-center transition-all duration-300">
                <Camera size={22} className="text-[#c8a84b] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            </button>

            <h3 className="font-cinzel font-black uppercase tracking-widest text-xs text-theme-main">État Vital</h3>
            <div className="flex flex-col gap-4 w-full">
              {ressources.map(r => (
                <BarreRessource
                  key={r.rKey}
                  label={r.label}
                  color={r.color}
                  emoji={r.emoji}
                  glow={r.glow}
                  gradient={r.gradient}
                  actuel={r.actuel}
                  max={r.max}
                  delta={deltas[r.rKey]}
                  onDeltaChange={v => updateDelta(r.rKey, v)}
                  onDeltaDecrement={() => adjustDelta(r.rKey, -1)}
                  onDeltaIncrement={() => adjustDelta(r.rKey, 1)}
                  onAppliquer={() => appliquerDelta(r.rKey)}
                />
              ))}
            </div>
          </Card>
        </div>

        {/* CENTRE/DROITE: STATISTIQUES */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          <Card className="medieval-border p-8 bg-card/20 backdrop-blur-sm">
            <h3 className="text-xl font-cinzel font-black uppercase tracking-widest mb-8 flex items-center gap-3 text-theme-main border-b border-theme/20 pb-4">
              <Swords size={24} />
              Attributs & Statistiques
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-3 gap-6">
              {stats.map(stat => {
                const Icon = STAT_ICONS[stat.nom] || Shield;
                return (
                  <Card
                    key={stat.nom}
                    className="bg-card/40 border border-theme/20 p-6 flex flex-col items-center justify-center gap-2 hover:border-theme-main hover:bg-card transition-all duration-300 group rounded-sm"
                  >
                    <Icon size={20} className="text-theme-main opacity-40 group-hover:opacity-100 transition-opacity" />
                    <span className="text-[10px] font-cinzel font-bold uppercase tracking-widest opacity-50 text-primary">
                      {stat.nom}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-4xl font-black font-cinzel text-primary transition-transform group-hover:scale-110 group-hover:text-theme-main duration-300">
                        {stat.valeur}
                      </span>
                      {stat.bonus !== 0 && (
                        <span className={`text-xs font-black font-cinzel animate-pulse ${stat.bonus > 0 ? 'text-theme-main' : 'text-red-500'}`}>
                          {stat.bonus > 0 ? `+${stat.bonus}` : stat.bonus}
                        </span>
                      )}
                    </div>
                    {stat.bonus !== 0 && (
                      <span className="text-[9px] font-garamond font-bold opacity-30 uppercase tracking-widest">  
                        Essence: {stat.base}
                      </span>
                    )}
                  </Card>
                )
              })}
            </div>
          </Card>

          {/* DESCRIPTION / NOTES */}
          <Card className="medieval-border p-8 bg-card/20 backdrop-blur-sm min-h-[200px]">
             <h3 className="font-cinzel font-black uppercase tracking-widest text-xs text-theme-main mb-4">Chronique du Héros</h3>
             <p className="font-garamond text-lg opacity-60 italic leading-relaxed">
               "Les murmures du Sigil révèlent une destinée encore en suspens. Les exploits de {personnage.nom} restent à graver dans le grand Codex de l'univers."
             </p>
          </Card>
        </div>
      </div>
    </div>
  )
}