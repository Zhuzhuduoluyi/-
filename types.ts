export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  LOADING_AI = 'LOADING_AI'
}

export enum ItemType {
  CROISSANT = 'CROISSANT',
  BAGUETTE = 'BAGUETTE',
  TOAST = 'TOAST',
  BURNT_TOAST = 'BURNT_TOAST',
  ROCK = 'ROCK'
}

export interface FallingItemData {
  id: number;
  x: number;
  y: number;
  type: ItemType;
  rotation: number;
  speed: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}
