import {
  DamageNumber,
  DroppedItem,
  Enemy,
  ItemDef,
  Particle,
  Player,
  Projectile,
  TILES,
  TileId,
  WorldData,
} from '../types/game';
import { soundManager } from './audio';
import { createItem, TILE_PROPERTIES } from './items';

export const TILE_SIZE = 24;
export const GRAVITY = 0.4;
export const TERMINAL_VELOCITY = 12;

export function isSolidTile(tile: TileId): boolean {
  if (tile === TILES.AIR || tile === TILES.LEAVES || tile === TILES.TORCH || tile === TILES.DOOR_OPEN) {
    return false;
  }
  return true;
}

export function isPlatformTile(tile: TileId): boolean {
  return tile === TILES.PLATFORM || tile === TILES.WORKBENCH || tile === TILES.CHEST;
}

// Check player collision with environment
export function updatePlayerPhysics(
  player: Player,
  world: WorldData,
  keys: Record<string, boolean>,
  dropThroughPlatform: boolean
) {
  if (player.isDead) {
    player.respawnTimer--;
    if (player.respawnTimer <= 0) {
      player.isDead = false;
      player.hp = player.maxHp;
      player.x = player.spawnX * TILE_SIZE;
      player.y = player.spawnY * TILE_SIZE;
      player.vx = 0;
      player.vy = 0;
      player.invincibleTimer = 60;
    }
    return;
  }

  // Horizontal input
  if (keys['KeyA'] || keys['ArrowLeft'] || keys['a'] || keys['A']) {
    player.vx = -player.speed;
    player.facing = -1;
  } else if (keys['KeyD'] || keys['ArrowRight'] || keys['d'] || keys['D']) {
    player.vx = player.speed;
    player.facing = 1;
  } else {
    player.vx *= 0.65;
    if (Math.abs(player.vx) < 0.1) player.vx = 0;
  }

  // Jump
  if (
    (keys['KeyW'] || keys['ArrowUp'] || keys['Space'] || keys['w'] || keys['W'] || keys[' ']) &&
    player.grounded
  ) {
    player.vy = player.jumpPower;
    player.grounded = false;
    soundManager.playJump();
  }

  // Gravity
  player.vy = Math.min(TERMINAL_VELOCITY, player.vy + GRAVITY);

  // Vertical Movement & Collision
  player.y += player.vy;
  const pLeft = Math.floor(player.x / TILE_SIZE);
  const pRight = Math.floor((player.x + player.w - 0.01) / TILE_SIZE);
  const pTop = Math.floor(player.y / TILE_SIZE);
  const pBottom = Math.floor((player.y + player.h) / TILE_SIZE);

  if (player.vy > 0) {
    // Falling down
    let hitGround = false;
    for (let tx = pLeft; tx <= pRight; tx++) {
      if (tx >= 0 && tx < world.width && pBottom >= 0 && pBottom < world.height) {
        const tile = world.tiles[tx][pBottom];
        if (isSolidTile(tile)) {
          hitGround = true;
          break;
        } else if (isPlatformTile(tile) && !dropThroughPlatform) {
          // Only land on top of platform if was previously above it
          const prevBottom = player.y - player.vy + player.h;
          if (prevBottom <= pBottom * TILE_SIZE + 4) {
            hitGround = true;
            break;
          }
        }
      }
    }

    if (hitGround) {
      player.y = pBottom * TILE_SIZE - player.h;
      player.vy = 0;
      player.grounded = true;
    } else {
      player.grounded = false;
    }
  } else if (player.vy < 0) {
    // Jumping up
    let hitCeiling = false;
    for (let tx = pLeft; tx <= pRight; tx++) {
      if (tx >= 0 && tx < world.width && pTop >= 0 && pTop < world.height) {
        const tile = world.tiles[tx][pTop];
        if (isSolidTile(tile) && !isPlatformTile(tile)) {
          hitCeiling = true;
          break;
        }
      }
    }
    if (hitCeiling) {
      player.y = (pTop + 1) * TILE_SIZE;
      player.vy = 0;
    }
  }

  // Horizontal Movement & Collision
  player.x += player.vx;
  const curLeft = Math.floor(player.x / TILE_SIZE);
  const curRight = Math.floor((player.x + player.w - 0.01) / TILE_SIZE);
  const curTop = Math.floor(player.y / TILE_SIZE);
  const curBottom = Math.floor((player.y + player.h - 0.1) / TILE_SIZE);

  if (player.vx > 0) {
    let hitWall = false;
    for (let ty = curTop; ty <= curBottom; ty++) {
      if (curRight >= 0 && curRight < world.width && ty >= 0 && ty < world.height) {
        const tile = world.tiles[curRight][ty];
        if (isSolidTile(tile) && !isPlatformTile(tile)) {
          hitWall = true;
          break;
        }
      }
    }
    if (hitWall) {
      player.x = curRight * TILE_SIZE - player.w;
      player.vx = 0;
    }
  } else if (player.vx < 0) {
    let hitWall = false;
    for (let ty = curTop; ty <= curBottom; ty++) {
      if (curLeft >= 0 && curLeft < world.width && ty >= 0 && ty < world.height) {
        const tile = world.tiles[curLeft][ty];
        if (isSolidTile(tile) && !isPlatformTile(tile)) {
          hitWall = true;
          break;
        }
      }
    }
    if (hitWall) {
      player.x = (curLeft + 1) * TILE_SIZE;
      player.vx = 0;
    }
  }

  // World bounds clamp
  player.x = Math.max(TILE_SIZE, Math.min(player.x, (world.width - 2) * TILE_SIZE));
  if (player.y > (world.height - 2) * TILE_SIZE) {
    player.hp = 0;
    player.isDead = true;
    player.respawnTimer = 180;
  }

  // Update timers
  if (player.invincibleTimer > 0) player.invincibleTimer--;
  if (player.swingTimer > 0) player.swingTimer--;
}

// Update enemy AI & collision
export function updateEnemy(
  enemy: Enemy,
  world: WorldData,
  player: Player,
  enemies: Enemy[],
  particles: Particle[],
  damageNumbers: DamageNumber[],
  droppedItems: DroppedItem[]
) {
  const distToPlayer = Math.hypot(
    player.x + player.w / 2 - (enemy.x + enemy.w / 2),
    player.y + player.h / 2 - (enemy.y + enemy.h / 2)
  );

  // Slime AI
  if (enemy.type.startsWith('slime')) {
    enemy.vy = Math.min(TERMINAL_VELOCITY, enemy.vy + GRAVITY);
    enemy.jumpCooldown--;

    if (enemy.jumpCooldown <= 0 && enemy.grounded) {
      // Jump towards player if nearby
      const dir = player.x > enemy.x ? 1 : -1;
      const jumpPower = enemy.type === 'slime_purple' ? -7.5 : -6.2;
      const horizSpeed = enemy.type === 'slime_purple' ? 2.5 : 1.8;

      enemy.vy = jumpPower;
      enemy.vx = dir * horizSpeed;
      enemy.jumpCooldown = 60 + Math.floor(Math.random() * 40);
      enemy.grounded = false;
    }

    if (enemy.grounded) {
      enemy.vx *= 0.75;
    }

    // Physics
    enemy.y += enemy.vy;
    let bLeft = Math.floor(enemy.x / TILE_SIZE);
    let bRight = Math.floor((enemy.x + enemy.w - 0.01) / TILE_SIZE);
    let bBottom = Math.floor((enemy.y + enemy.h) / TILE_SIZE);
    let bTop = Math.floor(enemy.y / TILE_SIZE);

    if (enemy.vy > 0) {
      let landed = false;
      for (let tx = bLeft; tx <= bRight; tx++) {
        if (tx >= 0 && tx < world.width && bBottom >= 0 && bBottom < world.height) {
          if (isSolidTile(world.tiles[tx][bBottom])) {
            landed = true;
            break;
          }
        }
      }
      if (landed) {
        enemy.y = bBottom * TILE_SIZE - enemy.h;
        enemy.vy = 0;
        enemy.grounded = true;
      } else {
        enemy.grounded = false;
      }
    }

    enemy.x += enemy.vx;
    bLeft = Math.floor(enemy.x / TILE_SIZE);
    bRight = Math.floor((enemy.x + enemy.w - 0.01) / TILE_SIZE);
    bTop = Math.floor(enemy.y / TILE_SIZE);
    bBottom = Math.floor((enemy.y + enemy.h - 0.1) / TILE_SIZE);

    if (enemy.vx > 0) {
      if (isSolidTile(world.tiles[bRight]?.[bTop]) || isSolidTile(world.tiles[bRight]?.[bBottom])) {
        enemy.x = bRight * TILE_SIZE - enemy.w;
        enemy.vx = 0;
      }
    } else if (enemy.vx < 0) {
      if (isSolidTile(world.tiles[bLeft]?.[bTop]) || isSolidTile(world.tiles[bLeft]?.[bBottom])) {
        enemy.x = (bLeft + 1) * TILE_SIZE;
        enemy.vx = 0;
      }
    }
  }

  // Zombie AI
  else if (enemy.type === 'zombie') {
    enemy.vy = Math.min(TERMINAL_VELOCITY, enemy.vy + GRAVITY);
    const dir = player.x > enemy.x ? 1 : -1;
    enemy.facing = dir;
    enemy.vx = dir * 1.1;

    // Jump over small obstacles
    enemy.behaviorTimer--;
    if (enemy.grounded && enemy.behaviorTimer <= 0) {
      const frontTileX = Math.floor((enemy.x + (dir === 1 ? enemy.w + 4 : -4)) / TILE_SIZE);
      const feetY = Math.floor((enemy.y + enemy.h - 4) / TILE_SIZE);
      if (frontTileX >= 0 && frontTileX < world.width && isSolidTile(world.tiles[frontTileX]?.[feetY])) {
        enemy.vy = -6.5;
        enemy.grounded = false;
        enemy.behaviorTimer = 45;
      }
    }

    // Apply movement
    enemy.y += enemy.vy;
    let bLeft = Math.floor(enemy.x / TILE_SIZE);
    let bRight = Math.floor((enemy.x + enemy.w - 0.01) / TILE_SIZE);
    let bBottom = Math.floor((enemy.y + enemy.h) / TILE_SIZE);

    if (enemy.vy > 0) {
      let landed = false;
      for (let tx = bLeft; tx <= bRight; tx++) {
        if (isSolidTile(world.tiles[tx]?.[bBottom])) {
          landed = true;
          break;
        }
      }
      if (landed) {
        enemy.y = bBottom * TILE_SIZE - enemy.h;
        enemy.vy = 0;
        enemy.grounded = true;
      } else {
        enemy.grounded = false;
      }
    }

    enemy.x += enemy.vx;
    bLeft = Math.floor(enemy.x / TILE_SIZE);
    bRight = Math.floor((enemy.x + enemy.w - 0.01) / TILE_SIZE);
    let bTop = Math.floor(enemy.y / TILE_SIZE);
    bBottom = Math.floor((enemy.y + enemy.h - 0.1) / TILE_SIZE);

    if (enemy.vx > 0 && (isSolidTile(world.tiles[bRight]?.[bTop]) || isSolidTile(world.tiles[bRight]?.[bBottom]))) {
      enemy.x = bRight * TILE_SIZE - enemy.w;
    } else if (
      enemy.vx < 0 &&
      (isSolidTile(world.tiles[bLeft]?.[bTop]) || isSolidTile(world.tiles[bLeft]?.[bBottom]))
    ) {
      enemy.x = (bLeft + 1) * TILE_SIZE;
    }
  }

  // Demon Eye & Servants AI (Flying)
  else if (enemy.type === 'demon_eye' || enemy.type === 'servant_of_cthulhu') {
    // Swoop towards player with hovering inertia
    const angle = Math.atan2(
      player.y + player.h / 2 - (enemy.y + enemy.h / 2),
      player.x + player.w / 2 - (enemy.x + enemy.w / 2)
    );
    const speed = enemy.type === 'servant_of_cthulhu' ? 2.4 : 1.9;
    enemy.vx += Math.cos(angle) * 0.08;
    enemy.vy += Math.sin(angle) * 0.08;
    enemy.vx = Math.max(-speed, Math.min(speed, enemy.vx));
    enemy.vy = Math.max(-speed, Math.min(speed, enemy.vy));
    enemy.facing = enemy.vx >= 0 ? 1 : -1;

    enemy.x += enemy.vx;
    enemy.y += enemy.vy;
  }

  // Eye of Cthulhu (Boss AI)
  else if (enemy.type === 'eye_of_cthulhu') {
    enemy.behaviorTimer++;
    const isPhase2 = enemy.phase === 2;

    // Check transition to Phase 2
    if (!isPhase2 && enemy.hp <= enemy.maxHp * 0.5) {
      enemy.phase = 2;
      enemy.behaviorTimer = 0;
      soundManager.playBossRoar();
      // Boss roar particles
      for (let i = 0; i < 25; i++) {
        particles.push({
          x: enemy.x + enemy.w / 2,
          y: enemy.y + enemy.h / 2,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8,
          color: '#d62828',
          size: 4 + Math.random() * 4,
          life: 30,
          maxLife: 30,
        });
      }
    }

    if (!isPhase2) {
      // Phase 1: Hover above player, periodically spawn servants, then charge 3 times
      const cycle = enemy.behaviorTimer % 360;
      if (cycle < 180) {
        // Hover above player
        const targetX = player.x + (Math.sin(enemy.behaviorTimer * 0.05) * 120);
        const targetY = player.y - 140;
        enemy.vx += (targetX - enemy.x) * 0.02;
        enemy.vy += (targetY - enemy.y) * 0.02;
        enemy.vx *= 0.94;
        enemy.vy *= 0.94;

        // Spawn a servant every 70 frames
        if (cycle % 70 === 0) {
          soundManager.playHitEnemy();
          enemies.push({
            id: 'servant_' + Date.now() + Math.random(),
            type: 'servant_of_cthulhu',
            name: '克蘇魯之僕',
            x: enemy.x + enemy.w / 2,
            y: enemy.y + enemy.h / 2,
            w: 16,
            h: 16,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            hp: 8,
            maxHp: 8,
            damage: 8,
            grounded: false,
            facing: 1,
            jumpCooldown: 0,
            color: '#c92a2a',
            behaviorTimer: 0,
          });
        }
      } else {
        // Charge towards player
        if (cycle % 60 === 180 % 60) {
          const angle = Math.atan2(
            player.y + player.h / 2 - (enemy.y + enemy.h / 2),
            player.x + player.w / 2 - (enemy.x + enemy.w / 2)
          );
          enemy.vx = Math.cos(angle) * 7.5;
          enemy.vy = Math.sin(angle) * 7.5;
          soundManager.playBossRoar();
        }
        enemy.vx *= 0.97;
        enemy.vy *= 0.97;
      }
    } else {
      // Phase 2: Raging mouth, frequent furious dashes!
      const cycle = enemy.behaviorTimer % 200;
      if (cycle < 60) {
        // Line up
        const targetX = player.x + (enemy.x > player.x ? 180 : -180);
        const targetY = player.y + (Math.sin(enemy.behaviorTimer * 0.1) * 60);
        enemy.vx += (targetX - enemy.x) * 0.04;
        enemy.vy += (targetY - enemy.y) * 0.04;
        enemy.vx *= 0.92;
        enemy.vy *= 0.92;
      } else {
        // Super Dash
        if (cycle === 60 || cycle === 100 || cycle === 140) {
          const angle = Math.atan2(
            player.y + player.h / 2 - (enemy.y + enemy.h / 2),
            player.x + player.w / 2 - (enemy.x + enemy.w / 2)
          );
          enemy.vx = Math.cos(angle) * 10;
          enemy.vy = Math.sin(angle) * 10;
          soundManager.playBossRoar();
        }
        enemy.vx *= 0.96;
        enemy.vy *= 0.96;
      }
    }

    enemy.facing = player.x > enemy.x ? 1 : -1;
    enemy.x += enemy.vx;
    enemy.y += enemy.vy;
  }

  // Check collision with player
  if (!player.isDead && player.invincibleTimer <= 0) {
    if (
      player.x < enemy.x + enemy.w &&
      player.x + player.w > enemy.x &&
      player.y < enemy.y + enemy.h &&
      player.y + player.h > enemy.y
    ) {
      player.hp = Math.max(0, player.hp - enemy.damage);
      player.invincibleTimer = 45;
      player.vy = -5;
      player.vx = (player.x < enemy.x ? -1 : 1) * 6;
      soundManager.playPlayerHurt();

      // Damage number
      damageNumbers.push({
        id: 'dmg_' + Date.now() + Math.random(),
        x: player.x + player.w / 2,
        y: player.y - 10,
        text: `-${enemy.damage}`,
        color: '#ff3344',
        life: 45,
      });

      // Blood particles
      for (let i = 0; i < 8; i++) {
        particles.push({
          x: player.x + player.w / 2,
          y: player.y + player.h / 2,
          vx: (Math.random() - 0.5) * 5,
          vy: -Math.random() * 4,
          color: '#d90429',
          size: 3,
          life: 25,
          maxLife: 25,
          gravity: 0.3,
        });
      }

      if (player.hp <= 0) {
        player.isDead = true;
        player.respawnTimer = 180;
      }
    }
  }
}

// Update projectiles (arrows, etc.)
export function updateProjectiles(
  projectiles: Projectile[],
  world: WorldData,
  enemies: Enemy[],
  particles: Particle[],
  damageNumbers: DamageNumber[],
  droppedItems: DroppedItem[]
) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.life--;
    if (p.life <= 0) {
      projectiles.splice(i, 1);
      continue;
    }

    p.vy += 0.18; // Arrow gravity
    p.x += p.vx;
    p.y += p.vy;

    // Check hit world
    const tx = Math.floor(p.x / TILE_SIZE);
    const ty = Math.floor(p.y / TILE_SIZE);
    if (tx >= 0 && tx < world.width && ty >= 0 && ty < world.height) {
      if (isSolidTile(world.tiles[tx][ty])) {
        // Wood splinter
        for (let s = 0; s < 4; s++) {
          particles.push({
            x: p.x,
            y: p.y,
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() - 0.5) * 3,
            color: '#8b5a2b',
            size: 2,
            life: 15,
            maxLife: 15,
          });
        }
        projectiles.splice(i, 1);
        continue;
      }
    }

    // Check hit enemy
    let hit = false;
    for (let eIdx = enemies.length - 1; eIdx >= 0; eIdx--) {
      const e = enemies[eIdx];
      if (p.x >= e.x && p.x <= e.x + e.w && p.y >= e.y && p.y <= e.y + e.h) {
        hit = true;
        e.hp -= p.damage;
        e.vx += p.vx * 0.4;
        e.vy -= 2;
        soundManager.playHitEnemy();

        damageNumbers.push({
          id: 'dmg_' + Date.now() + Math.random(),
          x: e.x + e.w / 2,
          y: e.y - 10,
          text: `-${p.damage}`,
          color: '#ffaa00',
          life: 40,
        });

        for (let s = 0; s < 6; s++) {
          particles.push({
            x: p.x,
            y: p.y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            color: e.color,
            size: 3,
            life: 20,
            maxLife: 20,
          });
        }

        if (e.hp <= 0) {
          killEnemy(e, enemies, eIdx, droppedItems, particles);
        }
        break;
      }
    }

    if (hit) {
      projectiles.splice(i, 1);
    }
  }
}

// Handle enemy defeat and item drops
export function killEnemy(
  enemy: Enemy,
  enemies: Enemy[],
  enemyIdx: number,
  droppedItems: DroppedItem[],
  particles: Particle[]
) {
  // Blood / gore / sparkle burst
  for (let i = 0; i < (enemy.isBoss ? 40 : 15); i++) {
    particles.push({
      x: enemy.x + enemy.w / 2,
      y: enemy.y + enemy.h / 2,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      color: enemy.color,
      size: enemy.isBoss ? 4 + Math.random() * 4 : 3,
      life: 30,
      maxLife: 30,
      gravity: 0.2,
    });
  }

  // Item drops
  if (enemy.type.startsWith('slime')) {
    droppedItems.push({
      id: 'drop_' + Date.now() + Math.random(),
      item: createItem('gel', Math.floor(1 + Math.random() * 3)),
      x: enemy.x + enemy.w / 2,
      y: enemy.y + enemy.h / 2,
      vx: (Math.random() - 0.5) * 3,
      vy: -3,
      life: 600,
    });
  } else if (enemy.type === 'demon_eye') {
    droppedItems.push({
      id: 'drop_' + Date.now() + Math.random(),
      item: createItem('lens', 1),
      x: enemy.x + enemy.w / 2,
      y: enemy.y + enemy.h / 2,
      vx: (Math.random() - 0.5) * 3,
      vy: -3,
      life: 600,
    });
  } else if (enemy.type === 'eye_of_cthulhu') {
    // Boss victory drops!
    droppedItems.push({
      id: 'drop_' + Date.now() + Math.random(),
      item: createItem('gold_ore', 15),
      x: enemy.x + enemy.w / 2 - 20,
      y: enemy.y + enemy.h / 2,
      vx: -2,
      vy: -4,
      life: 1200,
    });
    droppedItems.push({
      id: 'drop_' + Date.now() + Math.random(),
      item: createItem('iron_bar', 10),
      x: enemy.x + enemy.w / 2 + 20,
      y: enemy.y + enemy.h / 2,
      vx: 2,
      vy: -4,
      life: 1200,
    });
    droppedItems.push({
      id: 'drop_' + Date.now() + Math.random(),
      item: createItem('healing_potion', 5),
      x: enemy.x + enemy.w / 2,
      y: enemy.y + enemy.h / 2,
      vx: 0,
      vy: -5,
      life: 1200,
    });
  }

  enemies.splice(enemyIdx, 1);
}

// Update dropped items
export function updateDroppedItems(
  droppedItems: DroppedItem[],
  world: WorldData,
  player: Player,
  onPickup: (item: ItemDef) => boolean
) {
  for (let i = droppedItems.length - 1; i >= 0; i--) {
    const d = droppedItems[i];
    d.life--;
    if (d.life <= 0) {
      droppedItems.splice(i, 1);
      continue;
    }

    // Magnet to player if within 75px
    const dist = Math.hypot(
      player.x + player.w / 2 - d.x,
      player.y + player.h / 2 - d.y
    );

    if (dist < 75 && !player.isDead) {
      d.vx = (player.x + player.w / 2 - d.x) * 0.15;
      d.vy = (player.y + player.h / 2 - d.y) * 0.15;

      if (dist < 18) {
        if (onPickup(d.item)) {
          soundManager.playPickup();
          droppedItems.splice(i, 1);
          continue;
        }
      }
    } else {
      // Normal physics
      d.vy = Math.min(8, d.vy + GRAVITY * 0.7);
      d.vx *= 0.95;

      const tx = Math.floor(d.x / TILE_SIZE);
      const ty = Math.floor((d.y + 6) / TILE_SIZE);
      if (tx >= 0 && tx < world.width && ty >= 0 && ty < world.height) {
        if (isSolidTile(world.tiles[tx][ty])) {
          d.y = ty * TILE_SIZE - 6;
          d.vy = 0;
          d.vx *= 0.7;
        }
      }
    }

    d.x += d.vx;
    d.y += d.vy;
  }
}
