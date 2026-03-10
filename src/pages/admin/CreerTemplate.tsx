import CreerPersonnage from '../shared/CreerPersonnage'

type Props = { type: 'Monstre' | 'PNJ'; retour: () => void }

export default function CreerTemplate({ type, retour }: Props) {
  // On utilise le composant de création universel en mode Template
  return <CreerPersonnage type={type} isTemplate={true} retour={retour} />
}
