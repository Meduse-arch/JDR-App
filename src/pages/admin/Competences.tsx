import { useState } from 'react'
import { useStore } from '../../Store/useStore'
import { useCompetences } from '../../hooks/useCompetences'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { ConfirmButton } from '../../components/ui/ConfirmButton'

export default function Competences() {
  const sessionActive = useStore(s => s.sessionActive)

  const { competences, supprimerCompetence, creerCompetence } = useCompetences()

  const [filtreType, setFiltreType] = useState('Tous')
  const [recherche, setRecherche] = useState('')
  const [afficherFormulaire, setAfficherFormulaire] = useState(false)
  const [message,   setMessage]   = useState('')

  const [nom,          setNom]          = useState('')
  const [description,  setDescription]  = useState('')
  const [typeComp,     setTypeComp]     = useState('Actif')

  const TYPES = ['Actif', 'Passif']

  const handleCreerCompetence = async () => {
    if (!nom || !sessionActive) return
    const success = await creerCompetence({ nom, description, type: typeComp })
    if (success) {
      setNom(''); setDescription(''); setTypeComp('Actif')
      setAfficherFormulaire(false)
      setMessage('✅ Compétence créée !'); setTimeout(() => setMessage(''), 2500)
    }
  }

  const competencesFiltrees = competences
    .filter(c => filtreType === 'Tous' || c.type === filtreType)
    .filter(c => c.nom.toLowerCase().includes(recherche.toLowerCase()))

  return (
    <div className="flex flex-col h-full p-4 md:p-8 overflow-y-auto custom-scrollbar"
      style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-6"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <h2 className="text-2xl md:text-3xl font-black tracking-tight"
          style={{
            background: 'linear-gradient(135deg, var(--color-light), var(--color-accent2))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
          📖 Bibliothèque de Compétences
        </h2>
        <div className="flex items-center gap-3 shrink-0">
          {message && (
            <span className="text-sm font-bold" style={{ color: '#4ade80' }}>{message}</span>
          )}
          <Button
            variant={afficherFormulaire ? 'secondary' : 'primary'}
            onClick={() => setAfficherFormulaire(!afficherFormulaire)}
          >
            {afficherFormulaire ? '✕ Annuler' : '+ Créer une compétence'}
          </Button>
        </div>
      </div>

      {!sessionActive && (
        <p className="text-center mt-16" style={{ color: 'var(--text-secondary)' }}>
          Rejoins une session d'abord
        </p>
      )}

      {sessionActive && (
        <div className="flex flex-col gap-6">
          {/* Formulaire de création */}
          {afficherFormulaire && (
            <Card className="animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase mb-1.5 opacity-50 ml-1">Nom</label>
                    <Input
                      type="text" value={nom} onChange={e => setNom(e.target.value)}
                      placeholder="Ex: Boule de feu"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase mb-1.5 opacity-50 ml-1">Type</label>
                    <Select
                      value={typeComp} onChange={e => setTypeComp(e.target.value)}
                    >
                      {TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase mb-1.5 opacity-50 ml-1">Description</label>
                  <textarea
                    value={description} onChange={e => setDescription(e.target.value)}
                    placeholder="Effets, coût, détails..."
                    className="w-full px-4 py-3 rounded-xl outline-none transition-all focus:ring-2 focus:ring-blue-500/20 min-h-[125px] resize-none"
                    style={{
                      backgroundColor: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border)',
                    }}
                  />
                </div>
              </div>

              <Button size="lg" onClick={handleCreerCompetence} className="mt-6 uppercase tracking-widest">
                💾 Enregistrer la compétence
              </Button>
            </Card>
          )}

          {/* Filtres et recherche */}
          <div className="flex flex-col md:flex-row gap-4">
            <Input
              icon="🔍"
              type="text" placeholder="Rechercher une compétence..."
              value={recherche} onChange={e => setRecherche(e.target.value)}
            />
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
              {['Tous', ...TYPES].map(type => (
                <Button
                  key={type}
                  variant={filtreType === type ? 'active' : 'secondary'}
                  onClick={() => setFiltreType(type)}
                  className="whitespace-nowrap"
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>

          {/* Liste des compétences */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {competencesFiltrees.map(comp => (
              <Card key={comp.id} hoverEffect className="group flex flex-col h-full">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold leading-tight text-lg">{comp.nom}</h3>
                  </div>
                  <ConfirmButton
                    variant="ghost"
                    size="sm"
                    onConfirm={() => supprimerCompetence(comp.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-400"
                  >
                    🗑️
                  </ConfirmButton>
                </div>
                
                <Badge variant="ghost" className="w-fit mb-3">{comp.type}</Badge>

                <p className="text-sm opacity-70 mb-4 line-clamp-4 min-h-[40px] leading-relaxed flex-1">
                  {comp.description || 'Pas de description'}
                </p>
              </Card>
            ))}
          </div>

          {competencesFiltrees.length === 0 && (
            <div className="text-center py-20 opacity-30">
              <p className="text-4xl mb-4">📖</p>
              <p>Aucune compétence trouvée</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
