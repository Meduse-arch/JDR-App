import { Personnage } from '../../../types'
import QuetesView from '../../../components/quetes/QuetesView'

interface Props { personnage: Personnage }

export default function GererQuetes({ personnage }: Props) {
  return <QuetesView mode="attribuer" personnage={personnage} />
}
