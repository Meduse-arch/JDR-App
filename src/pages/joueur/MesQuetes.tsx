import { usePersonnage } from '../../hooks/usePersonnage'
import QuetesView from '../../components/quetes/QuetesView'

export default function MesQuetes() {
  const { personnage } = usePersonnage()
  return (
    <>
      {personnage && <QuetesView mode="joueur" personnage={personnage} />}
    </>
  )
}
