import { ChestData, TILES, TileId, WALLS, WallId, WorldData } from '../types/game';
import { createItem } from './items';

// Pseudo-random generator with seed
class PRNG {
  private s: number;
  constructor(seed: number) {
    this.s = seed % 2147483647;
    if (this.s <= 0) this.s += 2147483646;
  }
  public next(): number {
    this.s = (this.s * 16807) % 2147483647;
    return (this.s - 1) / 2147483646;
  }
}

// 1D Perlin-like smoothed noise
function makeNoise1D(size: number, prng: PRNG, octaves: number = 3): number[] {
  const result = new Array(size).fill(0);
  let scale = 1;
  let weight = 1;
  let totalWeight = 0;

  for (let o = 0; o < octaves; o++) {
    const step = Math.max(2, Math.floor(size / (4 * Math.pow(2, o))));
    const points: number[] = [];
    for (let i = 0; i <= Math.ceil(size / step) + 1; i++) {
      points.push(prng.next() * 2 - 1);
    }

    for (let x = 0; x < size; x++) {
      const idx = Math.floor(x / step);
      const frac = (x % step) / step;
      // Smooth cosine interpolation
      const t = (1 - Math.cos(frac * Math.PI)) / 2;
      const val = (points[idx] || 0) * (1 - t) + (points[idx + 1] || 0) * t;
      result[x] += val * weight;
    }

    totalWeight += weight;
    weight *= 0.5;
    scale *= 2;
  }

  return result.map(v => v / totalWeight);
}

export function generateWorld(
  width: number = 180,
  height: number = 90,
  seed: number = Math.floor(Math.random() * 1000000)
): WorldData {
  const prng = new PRNG(seed);
  const tiles: TileId[][] = [];
  const walls: WallId[][] = [];
  const revealed: boolean[][] = [];
  const chests: ChestData[] = [];

  for (let x = 0; x < width; x++) {
    tiles[x] = new Array(height).fill(TILES.AIR);
    walls[x] = new Array(height).fill(WALLS.NONE);
    revealed[x] = new Array(height).fill(false);
  }

  // 1. Generate surface height line
  const noise = makeNoise1D(width, prng, 3);
  const surfaceBase = Math.floor(height * 0.28);
  const surfaceHeights: number[] = [];

  for (let x = 0; x < width; x++) {
    const hOffset = Math.round(noise[x] * 9);
    surfaceHeights[x] = surfaceBase + hOffset;
  }

  // 2. Fill basic layers: Air, Grass, Dirt, Stone
  const rockLayerBase = Math.floor(height * 0.48);

  for (let x = 0; x < width; x++) {
    const sH = surfaceHeights[x];
    for (let y = 0; y < height; y++) {
      if (y < sH) {
        tiles[x][y] = TILES.AIR;
        walls[x][y] = WALLS.NONE;
      } else if (y === sH) {
        tiles[x][y] = TILES.GRASS;
        walls[x][y] = WALLS.DIRT;
      } else if (y < rockLayerBase + Math.floor(noise[x] * 5)) {
        tiles[x][y] = TILES.DIRT;
        walls[x][y] = WALLS.DIRT;
      } else {
        tiles[x][y] = TILES.STONE;
        walls[x][y] = WALLS.STONE;
      }
    }
  }

  // 3. Carve Natural Caves (Random Walkers / Worms)
  const numCaves = Math.floor((width * height) / 380);
  for (let c = 0; c < numCaves; c++) {
    let cx = Math.floor(prng.next() * (width - 20)) + 10;
    let cy = Math.floor(surfaceBase + 8 + prng.next() * (height - surfaceBase - 15));
    let length = Math.floor(30 + prng.next() * 50);
    let radius = 2.2 + prng.next() * 1.5;

    for (let step = 0; step < length; step++) {
      const r = Math.round(radius);
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (dx * dx + dy * dy <= radius * radius) {
            const tx = Math.floor(cx + dx);
            const ty = Math.floor(cy + dy);
            if (tx > 2 && tx < width - 2 && ty > surfaceHeights[tx] + 3 && ty < height - 2) {
              tiles[tx][ty] = TILES.AIR;
            }
          }
        }
      }
      cx += (prng.next() - 0.5) * 2.8;
      cy += (prng.next() - 0.4) * 2.4;
      radius = Math.max(1.8, Math.min(3.8, radius + (prng.next() - 0.5) * 0.4));
    }
  }

  // 4. Generate Ore Veins
  const placeVein = (tileType: TileId, count: number, minDepth: number, maxDepth: number, veinSize: number) => {
    for (let i = 0; i < count; i++) {
      const vx = Math.floor(prng.next() * (width - 10)) + 5;
      const vy = Math.floor(minDepth + prng.next() * (maxDepth - minDepth));
      const size = Math.floor(veinSize * 0.7 + prng.next() * veinSize * 0.6);

      let curX = vx;
      let curY = vy;
      for (let s = 0; s < size; s++) {
        if (
          curX > 0 &&
          curX < width &&
          curY > surfaceHeights[curX] &&
          curY < height &&
          (tiles[curX][curY] === TILES.DIRT || tiles[curX][curY] === TILES.STONE)
        ) {
          tiles[curX][curY] = tileType;
        }
        curX += Math.floor(prng.next() * 3) - 1;
        curY += Math.floor(prng.next() * 3) - 1;
      }
    }
  };

  // Copper: surface to underground
  placeVein(TILES.COPPER, Math.floor(width * 0.35), surfaceBase + 2, rockLayerBase + 10, 6);
  // Iron: underground to deep
  placeVein(TILES.IRON, Math.floor(width * 0.3), rockLayerBase - 5, height - 5, 7);
  // Gold: deep caverns
  placeVein(TILES.GOLD, Math.floor(width * 0.18), rockLayerBase + 10, height - 4, 5);
  // Amethyst: cavern jewels that glow
  placeVein(TILES.AMETHYST, Math.floor(width * 0.12), rockLayerBase + 12, height - 3, 4);

  // 5. Place Underground Treasure Chests
  let chestsPlaced = 0;
  const targetChests = Math.min(10, Math.floor(width / 20));
  for (let attempt = 0; attempt < 400 && chestsPlaced < targetChests; attempt++) {
    const cx = Math.floor(10 + prng.next() * (width - 20));
    const cy = Math.floor(surfaceHeights[cx] + 12 + prng.next() * (height - surfaceHeights[cx] - 18));

    // Check if flat air block right above solid stone/dirt
    if (
      tiles[cx][cy] === TILES.AIR &&
      tiles[cx][cy + 1] !== TILES.AIR &&
      tiles[cx][cy + 1] !== TILES.CHEST &&
      tiles[cx + 1]?.[cy] === TILES.AIR &&
      tiles[cx + 1]?.[cy + 1] !== TILES.AIR
    ) {
      tiles[cx][cy] = TILES.CHEST;
      // Populate chest with useful treasures!
      const items = [
        createItem('healing_potion', 3),
        createItem('torch', 15),
        createItem('iron_bar', 4),
        createItem('arrow', 40),
        prng.next() > 0.5 ? createItem('gold_ore', 8) : createItem('amethyst', 3),
      ];
      chests.push({ x: cx, y: cy, items });
      chestsPlaced++;
    }
  }

  // 6. Surface Trees Generation
  for (let x = 4; x < width - 4; x += Math.floor(3 + prng.next() * 5)) {
    const sH = surfaceHeights[x];
    // Check if grass tile and space above
    if (tiles[x][sH] === TILES.GRASS && tiles[x][sH - 1] === TILES.AIR) {
      const treeHeight = Math.floor(4 + prng.next() * 4); // 4-7 trunk tiles
      // Trunk
      for (let th = 1; th <= treeHeight; th++) {
        if (sH - th >= 0) {
          tiles[x][sH - th] = TILES.WOOD;
        }
      }
      // Leaf canopy
      const topY = sH - treeHeight;
      for (let lx = -2; lx <= 2; lx++) {
        for (let ly = -2; ly <= 1; ly++) {
          const tX = x + lx;
          const tY = topY + ly;
          if (tX >= 0 && tX < width && tY >= 0 && tY < height) {
            // Leaf cluster with rounded corners
            if (Math.abs(lx) + Math.abs(ly) <= 3) {
              if (tiles[tX][tY] === TILES.AIR) {
                tiles[tX][tY] = TILES.LEAVES;
              }
            }
          }
        }
      }
    }
  }

  // 7. Find safe spawn point near center
  const spawnX = Math.floor(width / 2);
  let spawnY = surfaceHeights[spawnX] - 2;
  // Ensure player isn't stuck inside a tree trunk
  while (tiles[spawnX][spawnY] !== TILES.AIR || tiles[spawnX][spawnY - 1] !== TILES.AIR) {
    spawnY--;
  }

  return {
    width,
    height,
    tiles,
    walls,
    revealed,
    chests,
    spawnX,
    spawnY,
    time: 6000, // 06:00 AM morning
    seed,
  };
}
