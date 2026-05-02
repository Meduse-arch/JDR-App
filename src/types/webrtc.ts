export type ActionKind = 
  | 'use_item' 
  | 'update_resource' 
  | 'move_token' 
  | 'chat_message' 
  | 'request_settings' 
  | 'dice_roll' 
  | 'toggle_spectateur' 
  | 'settings_update' 
  | 'create_character' 
  | 'player_identity' 
  | 'log_action' 
  | 'toggle_competence'
  | 'add_token'
  | 'request_map_channels'
  | 'request_map_tokens'
  | 'add_item'
  | 'toggle_equip'
  | 'remove_item'
  | 'request_chat_canaux'
  | 'request_chat_messages'
  | 'request_chat_membres'
  | 'request_map_chat_canal'
  | 'create_chat_canal';

export interface ActionMessage {
  type: 'ACTION';
  kind: ActionKind;
  payload: any; // Type specifically based on the action kind later
  timestamp?: number;
  senderId?: string; // The player ID
}

export type StateUpdateEntity = 
  | 'personnage' 
  | 'map_token' 
  | 'inventaire' 
  | 'chat' 
  | 'dice' 
  | 'session'
  | 'chat_canaux_update'
  | 'chat_messages_update'
  | 'chat_membres_update'
  | 'map_chat_canal_update';

export interface StateUpdateMessage {
  type: 'STATE_UPDATE';
  entity: StateUpdateEntity;
  payload: any; // The updated data (e.g., Personnage object, Token state)
  timestamp?: number;
}

export type ResyncDataType = 'inventaire' | 'competences' | 'quetes' | 'full';

export interface ResyncRequestMessage {
  type: 'RESYNC_REQUEST';
  characterId?: string; // Optional character ID
  senderId?: string;
  dataType?: ResyncDataType;
}

export interface ResyncResponseMessage {
  type: 'RESYNC_RESPONSE';
  payload: any; // The full state requested
  dataType?: ResyncDataType;
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
