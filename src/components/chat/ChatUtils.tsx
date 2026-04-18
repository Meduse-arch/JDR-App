import { ChatCanal } from '../../services/chatService'
import { Hash, Lock, Users } from 'lucide-react'

export function formatHeure(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()
  if (isToday) return "Aujourd'hui"
  if (isYesterday) return 'Hier'
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

export function getCanalLabel(canal: ChatCanal, compteId: string): string {
  if (canal.nom) return canal.nom
  if (canal.type === 'prive' && canal.participants) {
    const autre = canal.participants.find(p => p.id_compte !== compteId)
    return autre?.pseudo || 'Conversation privée'
  }
  return 'Groupe'
}

export function getCanalIcon(type: ChatCanal['type'], size = 11) {
  if (type === 'general') return <Hash size={size} />
  if (type === 'prive') return <Lock size={size} />
  return <Users size={size} />
}

export function getInitiales(nom: string) {
  return nom.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}
