import { Personnage } from '../../../types'
import ItemsView from '../../../components/items/ItemsView'

interface Props { personnage: Personnage }

export default function GererInventaire({ personnage }: Props) {
  return <ItemsView mode="gerer" personnage={personnage} key={personnage.id} />
}
