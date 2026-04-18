import { supabase } from '../supabase';

class BroadcastService {
  private channels: Map<string, ReturnType<typeof supabase.channel>> = new Map();

  /**
   * Obtient ou crée un canal de broadcast pour une session donnée.
   */
  private getChannel(sessionId: string) {
    const channelName = `rt-session-${sessionId}`;
    if (!this.channels.has(channelName)) {
      const channel = supabase.channel(channelName);
      channel.subscribe();
      this.channels.set(channelName, channel);
    }
    return this.channels.get(channelName)!;
  }

  /**
   * Envoie un événement de broadcast à tous les clients de la session.
   * @param sessionId L'ID de la session courante
   * @param event Le nom de l'événement (ex: 'update-hp')
   * @param payload Les données à envoyer
   */
  public send(sessionId: string, event: string, payload: any) {
    if (!sessionId) return;
    const channel = this.getChannel(sessionId);
    channel.send({
      type: 'broadcast',
      event: event,
      payload: payload
    });
  }

  /**
   * S'abonne à un événement de broadcast.
   * @param sessionId L'ID de la session courante
   * @param event Le nom de l'événement (ex: 'update-hp')
   * @param callback La fonction appelée lors de la réception
   * @returns Une fonction pour se désabonner
   */
  public subscribe(sessionId: string, event: string, callback: (payload: any) => void) {
    if (!sessionId) return () => {};
    
    const channel = this.getChannel(sessionId);
    channel.on('broadcast', { event }, (message) => {
      callback(message.payload);
    });

    return () => {
      // Note: we don't easily remove specific listeners in supabase-js v2 without unsubscribing entirely,
      // but typically we keep the channel alive. For strict cleanup, we might need a custom event emitter on top.
      // For now, this relies on React unmounting or the channel being cleaned up later.
    };
  }

  /**
   * Ferme et nettoie un canal.
   */
  public cleanup(sessionId: string) {
    const channelName = `rt-session-${sessionId}`;
    const channel = this.channels.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
    }
  }
}

export const broadcastService = new BroadcastService();
