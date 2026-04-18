import { useState } from 'react'
import { ChatCanal } from '../../services/chatService'
import { ModalContainer } from '../ui/modal/ModalContainer'
import { Button } from '../ui/Button'
import { Crown } from 'lucide-react'
import { getInitiales, getCanalLabel } from './ChatUtils'

interface NouvelleConvModalProps {
  membres: { id: string; pseudo: string; role: string }[]
  compteId: string
  onConfirm: (ids: string[], nom?: string) => void
  onClose: () => void
}

export function NouvelleConvModal({ membres, compteId, onConfirm, onClose }: NouvelleConvModalProps) {
  const [selectionnes, setSelectionnes] = useState<string[]>([])
  const [nom, setNom] = useState('')

  const toggleMembre = (id: string) => {
    setSelectionnes(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleConfirm = () => {
    if (selectionnes.length === 0) return
    onConfirm(selectionnes, nom.trim() || undefined)
  }

  const autresMembres = membres.filter(m => m.id !== compteId)

  return (
    <ModalContainer onClose={onClose} className="!w-72 !p-0 !gap-0 overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid rgba(184,142,60,0.12)' }}
      >
        <span className="font-cinzel text-[10px] tracking-[.22em] uppercase" style={{ color: 'rgba(200,168,75,0.55)' }}>
          Nouvelle conversation
        </span>
      </div>

      <div className="px-2.5 pt-2.5">
        <input
          placeholder={selectionnes.length === 1 ? "Nom de la conversation (optionnel)" : "Nom du groupe (optionnel)"}
          value={nom}
          onChange={e => setNom(e.target.value)}
          className="w-full rounded px-3 py-1.5 text-[11px] font-cinzel outline-none transition-colors"
          style={{
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(184,142,60,0.15)',
            color: 'rgba(200,168,75,0.7)',
          }}
        />
      </div>

      <div className="flex flex-col gap-1 p-2.5 overflow-y-auto" style={{ maxHeight: '200px' }}>
        {autresMembres.length === 0 ? (
          <p className="text-center font-cinzel text-[10px] py-6" style={{ color: 'rgba(200,168,75,0.2)' }}>
            Aucun membre disponible
          </p>
        ) : (
          autresMembres.map(m => {
            const sel = selectionnes.includes(m.id)
            return (
              <button
                key={m.id}
                onClick={() => toggleMembre(m.id)}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left transition-all"
                style={{
                  background: sel ? 'rgba(200,168,75,0.09)' : 'transparent',
                  border: sel ? '1px solid rgba(200,168,75,0.25)' : '1px solid transparent',
                }}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 font-cinzel text-[8px] font-bold"
                  style={{
                    background: sel ? 'rgba(200,168,75,0.2)' : 'rgba(200,168,75,0.07)',
                    color: sel ? '#c8a84b' : 'rgba(200,168,75,0.35)',
                  }}
                >
                  {getInitiales(m.pseudo)}
                </div>
                <span className="font-cinzel text-[11px] flex-1 truncate" style={{ color: sel ? 'rgba(220,190,100,0.85)' : 'rgba(200,168,75,0.5)' }}>
                  {m.pseudo}
                </span>
                {(m.role === 'mj' || m.role === 'admin') && (
                  <Crown size={9} style={{ color: 'rgba(200,168,75,0.3)', flexShrink: 0 }} />
                )}
              </button>
            )
          })
        )}
      </div>

      <div className="px-2.5 pb-2.5">
        <Button
          onClick={handleConfirm}
          disabled={selectionnes.length === 0}
          variant="primary"
          size="sm"
          className="w-full justify-center"
        >
          {selectionnes.length > 1 ? 'Créer le groupe' : 'Ouvrir la conversation'}
        </Button>
      </div>
    </ModalContainer>
  )
}

interface ModifierCanalModalProps {
  canal: ChatCanal
  compteId: string
  membres: { id: string; pseudo: string; role: string }[]
  onConfirm: (nouveauNom: string, participantIds: string[]) => void
  onClose: () => void
}

export function ModifierCanalModal({ canal, compteId, membres, onConfirm, onClose }: ModifierCanalModalProps) {
  const labelActuel = getCanalLabel(canal, compteId)
  const [nom, setNom] = useState(canal.nom || (canal.type === 'general' ? 'Général' : ''))

  const [participantIds, setParticipantIds] = useState<string[]>(
    canal.participants?.map(p => p.id_compte) ?? []
  )

  const toggleParticipant = (id: string) => {
    setParticipantIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleConfirm = () => {
    onConfirm(nom.trim(), participantIds)
  }

  const autresMembres = membres.filter(m => m.id !== compteId)

  return (
    <ModalContainer onClose={onClose} className="!w-72 !p-0 !gap-0 overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid rgba(184,142,60,0.12)' }}
      >
        <span className="font-cinzel text-[10px] tracking-[.22em] uppercase" style={{ color: 'rgba(200,168,75,0.55)' }}>
          Modifier le canal
        </span>
      </div>

      <div className="px-3 pt-3 flex flex-col gap-3">
        <div>
          <p className="font-cinzel text-[9px] tracking-widest uppercase mb-1.5" style={{ color: 'rgba(200,168,75,0.35)' }}>
            Nom
          </p>
          <input
            autoFocus
            placeholder={labelActuel}
            value={nom}
            onChange={e => setNom(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); if (e.key === 'Escape') onClose() }}
            className="w-full rounded px-3 py-1.5 text-[11px] font-cinzel outline-none transition-colors"
            style={{
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(184,142,60,0.2)',
              color: 'rgba(200,168,75,0.8)',
            }}
          />
        </div>

        {canal.type !== 'general' && autresMembres.length > 0 && (
          <div>
            <p className="font-cinzel text-[9px] tracking-widest uppercase mb-1.5" style={{ color: 'rgba(200,168,75,0.35)' }}>
              Participants
            </p>
            <div className="flex flex-col gap-1 overflow-y-auto" style={{ maxHeight: '160px' }}>
              {autresMembres.map(m => {
                const actif = participantIds.includes(m.id)
                return (
                  <button
                    key={m.id}
                    onClick={() => toggleParticipant(m.id)}
                    className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-left transition-all"
                    style={{
                      background: actif ? 'rgba(200,168,75,0.09)' : 'transparent',
                      border: actif ? '1px solid rgba(200,168,75,0.25)' : '1px solid transparent',
                    }}
                  >
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 font-cinzel text-[7px] font-bold"
                      style={{
                        background: actif ? 'rgba(200,168,75,0.2)' : 'rgba(200,168,75,0.07)',
                        color: actif ? '#c8a84b' : 'rgba(200,168,75,0.35)',
                      }}
                    >
                      {getInitiales(m.pseudo)}
                    </div>
                    <span className="font-cinzel text-[11px] flex-1 truncate" style={{ color: actif ? 'rgba(220,190,100,0.85)' : 'rgba(200,168,75,0.5)' }}>
                      {m.pseudo}
                    </span>
                    {(m.role === 'mj' || m.role === 'admin') && (
                      <Crown size={8} style={{ color: 'rgba(200,168,75,0.3)', flexShrink: 0 }} />
                    )}
                    <div
                      className="w-3.5 h-3.5 rounded-sm border flex items-center justify-center flex-shrink-0"
                      style={{
                        borderColor: actif ? 'rgba(200,168,75,0.5)' : 'rgba(200,168,75,0.15)',
                        background: actif ? 'rgba(200,168,75,0.2)' : 'transparent',
                      }}
                    >
                      {actif && <div className="w-1.5 h-1.5 rounded-sm bg-[#c8a84b]" />}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="px-3 py-3">
        <Button
          onClick={handleConfirm}
          variant="primary"
          size="sm"
          className="w-full justify-center"
        >
          Enregistrer
        </Button>
      </div>
    </ModalContainer>
  )
}
