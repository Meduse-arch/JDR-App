import { useMapChannels } from './useMapChannels';
import { useMapTokens } from './useMapTokens';

export function useMap(sessionId: string | undefined) {
  const {
    channels,
    channelActif,
    setChannelActif,
    creerChannel,
    modifierChannel,
    supprimerChannel,
    toggleChannel,
  } = useMapChannels(sessionId);

  const {
    tokens,
    ajouterToken,
    deplacerToken,
    supprimerToken,
    toggleVisibilite,
    broadcastPosition,
    setLocalAction,
  } = useMapTokens(sessionId, channelActif);

  return {
    channels,
    tokens,
    channelActif,
    setChannelActif,
    creerChannel,
    modifierChannel,
    supprimerChannel,
    toggleChannel,
    ajouterToken,
    deplacerToken,
    supprimerToken,
    toggleVisibilite,
    broadcastPosition,
    setLocalAction,
  };
}
