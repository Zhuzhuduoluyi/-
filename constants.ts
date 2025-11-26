import { ItemType } from './types';

export const GAME_WIDTH = 800; // internal resolution width
export const GAME_HEIGHT = 600; // internal resolution height
export const PLAYER_WIDTH = 100;
export const PLAYER_HEIGHT = 120;
export const ITEM_SIZE = 50;

export const SPAWN_RATE_MS = 800;
export const GRAVITY_BASE = 3;

export const ITEM_CONFIG: Record<ItemType, { score: number; color: string; label: string }> = {
  [ItemType.CROISSANT]: { score: 10, color: '#eebb4d', label: '🥐' },
  [ItemType.BAGUETTE]: { score: 15, color: '#d4a248', label: '🥖' },
  [ItemType.TOAST]: { score: 5, color: '#f5dfa2', label: '🍞' },
  [ItemType.BURNT_TOAST]: { score: -10, color: '#5c4033', label: '🍘' }, // Lose points
  [ItemType.ROCK]: { score: 0, color: '#888888', label: '🪨' }, // Lose Life
};

export const EGG_COLOR = '#F4A486'; // Salmon/Peach color from image
