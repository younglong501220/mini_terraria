import { TILES, TileId, WorldData } from '../types/game';
import { TILE_PROPERTIES } from './items';

/**
 * Fast 2D dynamic lighting engine for Terraria Web
 * Supports daylight propagation, torch point lights, and cavern pitch blackness
 */
export function calculateLighting(
  world: WorldData,
  startCol: number,
  endCol: number,
  startRow: number,
  endRow: number,
  dayLightRatio: number, // 0 (midnight) to 1 (noon)
  playerX: number,
  playerY: number,
  tileSize: number
): number[][] {
  const pad = 6;
  const minX = Math.max(0, startCol - pad);
  const maxX = Math.min(world.width - 1, endCol + pad);
  const minY = Math.max(0, startRow - pad);
  const maxY = Math.min(world.height - 1, endRow + pad);

  const w = maxX - minX + 1;
  const h = maxY - minY + 1;

  // Light map: 0 (pitch black) to 15 (max light)
  const lightMap: number[][] = [];
  for (let x = 0; x < w; x++) {
    lightMap[x] = new Array(h).fill(0);
  }

  const queue: [number, number][] = [];

  // 1. Trace Sunlight from sky downwards
  const sunBrightness = Math.round(15 * dayLightRatio);
  for (let wx = minX; wx <= maxX; wx++) {
    let currentSun = sunBrightness;
    const lx = wx - minX;

    for (let wy = minY; wy <= maxY; wy++) {
      const ly = wy - minY;
      const tile = world.tiles[wx][wy];
      const props = TILE_PROPERTIES[tile];

      if (props.solid && !props.isTransparent) {
        currentSun = Math.max(0, currentSun - 4);
      } else if (tile === TILES.LEAVES) {
        currentSun = Math.max(0, currentSun - 1);
      }

      if (currentSun > lightMap[lx][ly]) {
        lightMap[lx][ly] = currentSun;
        if (currentSun > 1) {
          queue.push([lx, ly]);
        }
      }

      if (currentSun <= 0) break;
    }
  }

  // 2. Add Point Light Sources (Torches, Crystals, Furnace, Player aura)
  for (let wx = minX; wx <= maxX; wx++) {
    const lx = wx - minX;
    for (let wy = minY; wy <= maxY; wy++) {
      const ly = wy - minY;
      const tile = world.tiles[wx][wy];
      const props = TILE_PROPERTIES[tile];

      if (props.lightEmission && props.lightEmission > lightMap[lx][ly]) {
        lightMap[lx][ly] = props.lightEmission;
        queue.push([lx, ly]);
      }
    }
  }

  // Player ambient glow (holding pickaxe/torch)
  const pTileX = Math.floor(playerX / tileSize);
  const pTileY = Math.floor(playerY / tileSize);
  const pLx = pTileX - minX;
  const pLy = pTileY - minY;
  if (pLx >= 0 && pLx < w && pLy >= 0 && pLy < h) {
    const playerGlow = 7;
    if (playerGlow > lightMap[pLx][pLy]) {
      lightMap[pLx][pLy] = playerGlow;
      queue.push([pLx, pLy]);
    }
  }

  // 3. BFS Light Falloff Propagation
  let head = 0;
  while (head < queue.length) {
    const [lx, ly] = queue[head++];
    const curLight = lightMap[lx][ly];
    if (curLight <= 1) continue;

    const wx = lx + minX;
    const wy = ly + minY;

    // Check 4 cardinal neighbors
    const neighbors: [number, number][] = [
      [lx + 1, ly],
      [lx - 1, ly],
      [lx, ly + 1],
      [lx, ly - 1],
    ];

    for (const [nlx, nly] of neighbors) {
      if (nlx >= 0 && nlx < w && nly >= 0 && nly < h) {
        const nwx = nlx + minX;
        const nwy = nly + minY;
        const nTile = world.tiles[nwx][nwy];
        const nProps = TILE_PROPERTIES[nTile];

        // Dropoff is faster through solid blocks
        const drop = nProps.solid && !nProps.isTransparent ? 3 : 1;
        const nextLight = curLight - drop;

        if (nextLight > lightMap[nlx][nly]) {
          lightMap[nlx][nly] = nextLight;
          queue.push([nlx, nly]);
        }
      }
    }
  }

  // Convert light map to normalized 0..1 floating values indexed by [worldX - minX][worldY - minY]
  // Also attaches minX and minY as metadata
  return lightMap.map(col => col.map(val => Math.min(1, Math.max(0, val / 15))));
}
