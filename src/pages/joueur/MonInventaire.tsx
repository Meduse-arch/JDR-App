import { usePersonnage } from '../../hooks/usePersonnage'
import ItemsView from '../../components/items/ItemsView'

export default function MonInventaire() {
  const { personnage } = usePersonnage()

  return (
    <div className="h-full">
      {personnage && <ItemsView mode="joueur" personnage={personnage} />}
    </div>
  )
}
