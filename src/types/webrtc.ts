export type ActionKind = 'use_item' | 'update_resource' | 'move_token' | 'chat_message' | 'request_settings' | 'dice_roll' | 'toggle_spectateur' | 'settings_update';

export interface ActionMessage {
  type: 'ACTION';
  kind: ActionKind;
  payload: any; // Type specifically based on the action kind later
  timestamp?: number;
  senderId?: string; // The player ID
}

export type StateUpdateEntity = 'personnage' | 'token' | 'inventaire' | 'chat' | 'dice' | 'session';

export interface StateUpdateMessage {
  type: 'STATE_UPDATE';
  entity: StateUpdateEntity;
  payload: any; // The updated data (e.g., Personnage object, Token state)
  timestamp?: number;
}

export interface ResyncRequestMessage {
  type: 'RESYNC_REQUEST';
  characterId?: string; // Optional character ID
  senderId?: string;
}

export interface ResyncResponseMessage {
  type: 'RESYNC_RESPONSE';
  payload: any; // The full state requested
}

export interface ListCharactersRequestMessage {
  type: 'LIST_CHARACTERS_REQUEST';
  compteId: string;
}

export interface ListCharactersResponseMessage {
  type: 'LIST_CHARACTERS_RESPONSE';
  personnages: any[];
}

export type WebRTCMessage =
  | ActionMessage
  | StateUpdateMessage
  | ResyncRequestMessage
  | ResyncResponseMessage
  | ListCharactersRequestMessage
  | ListCharactersResponseMessage;
