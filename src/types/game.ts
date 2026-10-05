// Tile type IDs
export const TILES = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  COPPER: 4,
  IRON: 5,
  GOLD: 6,
  WOOD: 7,
  LEAVES: 8,
  WORKBENCH: 9,
  FURNACE: 10,
  TORCH: 11,
  PLATFORM: 12,
  AMETHYST: 13,
  DOOR_CLOSED: 14,
  DOOR_OPEN: 15,
  BRICK: 16,
  CHEST: 17,
} as const;

export type TileId = (typeof TILES)[keyof typeof TILES];

// Wall IDs (Background)
export const WALLS = {
  NONE: 0,
  DIRT: 1,
  STONE: 2,
  WOOD: 3,
  BRICK: 4,
} as const;

export type WallId = (typeof WALLS)[keyof typeof WALLS];

// Item Categories
export type ItemType =
  | 'pickaxe'
  | 'axe'
  | 'sword'
  | 'bow'
  | 'arrow'
  | 'block'
  | 'wall'
  | 'placeable'
  | 'consumable'
  | 'material';

export interface ItemDef {
  id: string;
  name: string;
  type: ItemType;
  icon: string;
  desc: string;
  count: number;
  maxStack: number;
  damage?: number;
  minePower?: number; // 1 = copper, 2 = iron, etc.
  axePower?: number;
  tileId?: TileId;
  wallId?: WallId;
  healAmount?: number;
  rarity?: 'white' | 'blue' | 'green' | 'orange' | 'light_red';
}

export interface Player {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  speed: number;
  jumpPower: number;
  grounded: boolean;
  facing: 1 | -1;
  hp: number;
  maxHp: number;
  invincibleTimer: number;
  swingTimer: number;
  swingMax: number;
  bowCharging: boolean;
  bowChargeTime: number;
  respawnTimer: number;
  isDead: boolean;
  spawnX: number;
  spawnY: number;
}

export type EnemyType =
  | 'slime_green'
  | 'slime_blue'
  | 'slime_purple'
  | 'zombie'
  | 'demon_eye'
  | 'eye_of_cthulhu'
  | 'servant_of_cthulhu';

export interface Enemy {
  id: string;
  type: EnemyType;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  damage: number;
  grounded: boolean;
  facing: 1 | -1;
  jumpCooldown: number;
  color: string;
  behaviorTimer: number;
  phase?: number; // For boss
  targetX?: number;
  targetY?: number;
  isBoss?: boolean;
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  life: number;
  isPlayer: boolean;
  type: 'arrow' | 'boss_spit';
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  gravity?: number;
}

export interface DamageNumber {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

export interface DroppedItem {
  id: string;
  item: ItemDef;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export interface CraftingRecipe {
  id: string;
  result: ItemDef;
  requiredStation: 'hand' | 'workbench' | 'furnace';
  ingredients: { itemId: string; name: string; count: number }[];
}

export interface ChestData {
  x: number;
  y: number;
  items: (ItemDef | null)[];
}

export interface WorldData {
  width: number;
  height: number;
  tiles: TileId[][];
  walls: WallId[][];
  revealed: boolean[][];
  chests: ChestData[];
  spawnX: number;
  spawnY: number;
  time: number; // 0 to 24000
  seed: number;
}
