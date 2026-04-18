import { useStore } from '../../store/useStore'
import GererPersonnage from '../admin/GererPersonnage'
import SelectionJoueur from '../joueur/SelectionJoueur'

export default function SelectionPersonnage() {
  const { roleEffectif } = useStore()
  
  if (roleEffectif === 'admin' || roleEffectif === 'mj') {
    return <GererPersonnage />
  }
  
  return <SelectionJoueur />
}
