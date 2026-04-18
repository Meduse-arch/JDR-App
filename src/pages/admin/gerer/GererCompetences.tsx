import { Personnage } from '../../../types'
import CompetenceView from '../../../components/competences/CompetenceView'

interface Props { personnage: Personnage }

export default function GererCompetences({ personnage }: Props) {
  return <CompetenceView mode="attribuer" personnage={personnage} />
}
