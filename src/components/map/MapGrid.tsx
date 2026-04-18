import { MapChannel } from '../../types';

interface MapGridProps {
  activeChannelData: MapChannel;
  zoom: number;
}

export function MapGrid({ activeChannelData, zoom }: MapGridProps) {
  const { largeur, hauteur, grille_taille } = activeChannelData;
  const gZoom = grille_taille * zoom;

  const verticals = Array.from({ length: largeur + 1 }, (_, x) => (
    <line
      key={`v${x}`}
      x1={x * gZoom} y1={0}
      x2={x * gZoom} y2={hauteur * gZoom}
      stroke="rgba(200,168,75,0.07)"
      strokeWidth="1"
    />
  ));

  const horizontals = Array.from({ length: hauteur + 1 }, (_, y) => (
    <line
      key={`h${y}`}
      x1={0} y1={y * gZoom}
      x2={largeur * gZoom} y2={y * gZoom}
      stroke="rgba(200,168,75,0.07)"
      strokeWidth="1"
    />
  ));

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-0"
      width={largeur * gZoom}
      height={hauteur * gZoom}
    >
      {verticals}
      {horizontals}
    </svg>
  );
}