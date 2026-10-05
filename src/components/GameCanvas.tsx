import React, { useCallback, useEffect, useRef } from 'react';
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
  WALLS,
  WorldData,
} from '../types/game';
import { soundManager } from '../utils/audio';
import { createItem, ITEM_CATALOG, TILE_PROPERTIES, WALL_COLORS } from '../utils/items';
import { calculateLighting } from '../utils/lighting';
import {
  GRAVITY,
  isPlatformTile,
  isSolidTile,
  TILE_SIZE,
  updateDroppedItems,
  updateEnemy,
  updatePlayerPhysics,
  updateProjectiles,
} from '../utils/physics';

interface GameCanvasProps {
  world: WorldData;
  initialPlayer: Player;
  activeItem: ItemDef | null;
  onSyncPlayerStats: (hp: number, maxHp: number, depthY: number) => void;
  onUpdateInventory: (updater: (prev: (ItemDef | null)[]) => (ItemDef | null)[]) => void;
  onOpenChest?: (chestIdx: number) => void;
  isPaused: boolean;
  zoom: number;
  showLighting: boolean;
  onBossStateChange?: (boss: { current: number; max: number; name: string } | null) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  world,
  initialPlayer,
  activeItem,
  onSyncPlayerStats,
  onUpdateInventory,
  onOpenChest,
  isPaused,
  zoom,
  showLighting,
  onBossStateChange,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Keep player in ref to avoid re-rendering entire React tree on every frame
  const playerRef = useRef<Player>({ ...initialPlayer });
  const activeItemRef = useRef<ItemDef | null>(activeItem);
  activeItemRef.current = activeItem;

  const worldRef = useRef<WorldData>(world);
  worldRef.current = world;

  // Game internal entities & states
  const enemiesRef = useRef<Enemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const damageNumbersRef = useRef<DamageNumber[]>([]);
  const droppedItemsRef = useRef<DroppedItem[]>([]);
  const cameraRef = useRef({ x: 0, y: 0 });
  const mouseRef = useRef({ x: 0, y: 0, worldX: 0, worldY: 0, down: false });
  const keysRef = useRef<Record<string, boolean>>({});
  const miningProgressRef = useRef<{ x: number; y: number; progress: number } | null>(null);
  const screenShakeRef = useRef(0);
  const starsRef = useRef<{ x: number; y: number; size: number; alpha: number }[]>([]);
  const frameCountRef = useRef(0);

  // Initialize stars once
  useEffect(() => {
    const stars: { x: number; y: number; size: number; alpha: number }[] = [];
    for (let i = 0; i < 150; i++) {
      stars.push({
        x: Math.random() * 1600,
        y: Math.random() * 600,
        size: Math.random() * 2 + 1,
        alpha: Math.random() * 0.8 + 0.2,
      });
    }
    starsRef.current = stars;
  }, []);

  // Spawn initial enemies
  useEffect(() => {
    const player = playerRef.current;
    const spawnX = player.spawnX * TILE_SIZE;
    const spawnY = player.spawnY * TILE_SIZE;

    enemiesRef.current = [
      {
        id: 'slime_g1',
        type: 'slime_green',
        name: '綠史萊姆',
        x: spawnX + 220,
        y: spawnY - 10,
        w: 24,
        h: 18,
        vx: 0,
        vy: 0,
        hp: 14,
        maxHp: 14,
        damage: 6,
        grounded: false,
        facing: -1,
        jumpCooldown: 40,
        color: '#2ec4b6',
        behaviorTimer: 0,
      },
      {
        id: 'slime_b1',
        type: 'slime_blue',
        name: '藍史萊姆',
        x: spawnX - 240,
        y: spawnY - 10,
        w: 26,
        h: 20,
        vx: 0,
        vy: 0,
        hp: 20,
        maxHp: 20,
        damage: 7,
        grounded: false,
        facing: 1,
        jumpCooldown: 70,
        color: '#3a86ff',
        behaviorTimer: 0,
      },
    ];
  }, []);

  // Handle Resize: dynamically set canvas width/height to fill container without distortion
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current && canvasRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          canvasRef.current.width = Math.floor(rect.width);
          canvasRef.current.height = Math.floor(rect.height);
        }
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Inventory pickup callback
  const handleItemPickup = useCallback(
    (item: ItemDef): boolean => {
      let pickedUp = false;
      onUpdateInventory(prev => {
        const next = [...prev];
        // 1. Try to stack into existing slot
        for (let i = 0; i < next.length; i++) {
          const slot = next[i];
          if (slot && slot.id === item.id && slot.count < slot.maxStack) {
            const addCount = Math.min(item.count, slot.maxStack - slot.count);
            slot.count += addCount;
            item.count -= addCount;
            if (item.count <= 0) {
              pickedUp = true;
              return next;
            }
          }
        }
        // 2. Try empty slot
        if (item.count > 0) {
          for (let i = 0; i < next.length; i++) {
            if (!next[i]) {
              next[i] = { ...item };
              pickedUp = true;
              return next;
            }
          }
        }
        return next;
      });
      return pickedUp;
    },
    [onUpdateInventory]
  );

  // Summon Boss Trigger function
  useEffect(() => {
    const handleCustomSummon = (e: CustomEvent) => {
      if (e.detail?.type === 'eye_of_cthulhu') {
        const p = playerRef.current;
        soundManager.playBossRoar();
        soundManager.setTrack('boss');
        enemiesRef.current.push({
          id: 'boss_' + Date.now(),
          type: 'eye_of_cthulhu',
          name: '克蘇魯之眼',
          x: p.x - 200,
          y: p.y - 250,
          w: 56,
          h: 56,
          vx: 0,
          vy: 0,
          hp: 350,
          maxHp: 350,
          damage: 15,
          grounded: false,
          facing: 1,
          jumpCooldown: 0,
          color: '#d90429',
          behaviorTimer: 0,
          phase: 1,
          isBoss: true,
        });
      }
    };
    window.addEventListener('summon_boss' as any, handleCustomSummon as any);
    return () => window.removeEventListener('summon_boss' as any, handleCustomSummon as any);
  }, []);

  // Main Interaction Loop (Mining, Placing, Attacking)
  const handlePlayerInteract = useCallback(() => {
    const player = playerRef.current;
    const world = worldRef.current;
    const currentItem = activeItemRef.current;

    if (player.isDead) return;

    const tileX = Math.floor(mouseRef.current.worldX / TILE_SIZE);
    const tileY = Math.floor(mouseRef.current.worldY / TILE_SIZE);

    const pCenterX = player.x + player.w / 2;
    const pCenterY = player.y + player.h / 2;
    const distToTile = Math.hypot((tileX + 0.5) * TILE_SIZE - pCenterX, (tileY + 0.5) * TILE_SIZE - pCenterY);
    const maxReach = 6.5 * TILE_SIZE;

    // 1. Weapon Attack / Tool Swing
    if (currentItem) {
      if (currentItem.type === 'sword' || currentItem.type === 'pickaxe' || currentItem.type === 'axe') {
        if (player.swingTimer <= 0) {
          player.swingTimer = currentItem.type === 'sword' ? 14 : 12;
          player.swingMax = player.swingTimer;
          soundManager.playSwing();

          // Check melee hit against enemies
          const attackReach = currentItem.type === 'sword' ? 60 : 45;
          enemiesRef.current.forEach(enemy => {
            const eDist = Math.hypot(
              enemy.x + enemy.w / 2 - pCenterX,
              enemy.y + enemy.h / 2 - pCenterY
            );
            const facingMatches =
              player.facing === 1
                ? enemy.x + enemy.w / 2 >= pCenterX - 15
                : enemy.x + enemy.w / 2 <= pCenterX + 15;

            if (eDist < attackReach && facingMatches) {
              const baseDmg = currentItem.damage || 6;
              const dmg = Math.round(baseDmg * (0.85 + Math.random() * 0.3));
              enemy.hp -= dmg;
              enemy.vy = -4.5;
              enemy.vx = player.facing * 5.5;
              soundManager.playHitEnemy();
              screenShakeRef.current = 4;

              damageNumbersRef.current.push({
                id: 'dmg_' + Date.now() + Math.random(),
                x: enemy.x + enemy.w / 2,
                y: enemy.y - 12,
                text: `-${dmg}`,
                color: dmg > baseDmg ? '#ffb703' : '#ff3344',
                life: 40,
              });

              for (let p = 0; p < 7; p++) {
                particlesRef.current.push({
                  x: enemy.x + enemy.w / 2,
                  y: enemy.y + enemy.h / 2,
                  vx: (Math.random() - 0.5) * 5 + player.facing * 2,
                  vy: (Math.random() - 0.5) * 5 - 2,
                  color: enemy.color,
                  size: 3,
                  life: 20,
                  maxLife: 20,
                });
              }
            }
          });
        }
      }

      // 2. Bow Shooting
      else if (currentItem.type === 'bow') {
        if (!player.bowCharging) {
          player.bowCharging = true;
          player.bowChargeTime = 0;
        } else {
          player.bowChargeTime++;
          if (player.bowChargeTime >= 15) {
            let hasArrow = false;
            onUpdateInventory(prev => {
              const next = [...prev];
              const arrowSlot = next.find(s => s && s.type === 'arrow' && s.count > 0);
              if (arrowSlot) {
                arrowSlot.count--;
                if (arrowSlot.count <= 0) {
                  const idx = next.indexOf(arrowSlot);
                  next[idx] = null;
                }
                hasArrow = true;
              }
              return next;
            });

            if (hasArrow) {
              soundManager.playBowShoot();
              const angle = Math.atan2(
                mouseRef.current.worldY - (player.y + 12),
                mouseRef.current.worldX - (player.x + player.w / 2)
              );
              const speed = 12;
              projectilesRef.current.push({
                id: 'arrow_' + Date.now() + Math.random(),
                x: player.x + player.w / 2,
                y: player.y + 12,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                damage: (currentItem.damage || 10) + 6,
                life: 180,
                isPlayer: true,
                type: 'arrow',
              });
            }
            player.bowChargeTime = 0;
          }
        }
      }

      // 3. Consumable (Healing Potion / Boss Summon)
      else if (currentItem.type === 'consumable') {
        if (currentItem.id === 'healing_potion' && player.hp < player.maxHp) {
          player.hp = Math.min(player.maxHp, player.hp + (currentItem.healAmount || 50));
          soundManager.playHeal();
          damageNumbersRef.current.push({
            id: 'heal_' + Date.now(),
            x: player.x + player.w / 2,
            y: player.y - 12,
            text: `+${currentItem.healAmount || 50}`,
            color: '#2ec4b6',
            life: 50,
          });
          onUpdateInventory(prev => {
            const next = [...prev];
            const slot = next.find(s => s && s.id === currentItem.id);
            if (slot) {
              slot.count--;
              if (slot.count <= 0) {
                const idx = next.indexOf(slot);
                next[idx] = null;
              }
            }
            return next;
          });
          mouseRef.current.down = false;
        } else if (currentItem.id === 'suspicious_eye') {
          window.dispatchEvent(new CustomEvent('summon_boss', { detail: { type: 'eye_of_cthulhu' } }));
          onUpdateInventory(prev => {
            const next = [...prev];
            const slot = next.find(s => s && s.id === currentItem.id);
            if (slot) {
              slot.count--;
              if (slot.count <= 0) {
                const idx = next.indexOf(slot);
                next[idx] = null;
              }
            }
            return next;
          });
          mouseRef.current.down = false;
        }
      }
    }

    // 4. Mining Tiles
    if (distToTile <= maxReach && tileX >= 0 && tileX < world.width && tileY >= 0 && tileY < world.height) {
      const curTile = world.tiles[tileX][tileY];

      if (curTile !== TILES.AIR) {
        const props = TILE_PROPERTIES[curTile];
        const isPickaxe = currentItem?.type === 'pickaxe';
        const isAxe = currentItem?.type === 'axe';

        let effective = true;
        if (curTile === TILES.WOOD || curTile === TILES.LEAVES) {
          effective = isAxe || isPickaxe;
        }

        if (effective) {
          if (!miningProgressRef.current || miningProgressRef.current.x !== tileX || miningProgressRef.current.y !== tileY) {
            miningProgressRef.current = { x: tileX, y: tileY, progress: 0 };
          }

          const power = isPickaxe ? (currentItem?.minePower || 1) * 0.45 : isAxe ? (currentItem?.axePower || 1) * 0.45 : 0.25;
          miningProgressRef.current.progress += power;
          soundManager.playMine(props.soundType);

          for (let p = 0; p < 2; p++) {
            particlesRef.current.push({
              x: (tileX + 0.5) * TILE_SIZE,
              y: (tileY + 0.5) * TILE_SIZE,
              vx: (Math.random() - 0.5) * 4,
              vy: -Math.random() * 3,
              color: props.color,
              size: 3,
              life: 18,
              maxLife: 18,
              gravity: 0.25,
            });
          }

          if (miningProgressRef.current.progress >= props.hardness) {
            miningProgressRef.current = null;
            world.tiles[tileX][tileY] = TILES.AIR;

            for (let p = 0; p < 6; p++) {
              particlesRef.current.push({
                x: (tileX + 0.5) * TILE_SIZE,
                y: (tileY + 0.5) * TILE_SIZE,
                vx: (Math.random() - 0.5) * 5,
                vy: -Math.random() * 4,
                color: props.color,
                size: 3.5,
                life: 25,
                maxLife: 25,
                gravity: 0.3,
              });
            }

            if (props.dropItemId) {
              droppedItemsRef.current.push({
                id: 'drop_' + Date.now() + Math.random(),
                item: createItem(props.dropItemId, 1),
                x: (tileX + 0.5) * TILE_SIZE,
                y: (tileY + 0.5) * TILE_SIZE,
                vx: (Math.random() - 0.5) * 3,
                vy: -3.5,
                life: 900,
              });
            }
          }
        }
      }

      // 5. Placing Blocks / Placeables / Walls
      else if (currentItem && currentItem.count > 0) {
        if (currentItem.type === 'block' || currentItem.type === 'placeable') {
          const pLeftTile = Math.floor(player.x / TILE_SIZE);
          const pRightTile = Math.floor((player.x + player.w) / TILE_SIZE);
          const pTopTile = Math.floor(player.y / TILE_SIZE);
          const pBottomTile = Math.floor((player.y + player.h) / TILE_SIZE);

          const intersectsPlayer =
            tileX >= pLeftTile && tileX <= pRightTile && tileY >= pTopTile && tileY <= pBottomTile;

          if (!intersectsPlayer && currentItem.tileId !== undefined) {
            world.tiles[tileX][tileY] = currentItem.tileId;
            soundManager.playPlace();

            onUpdateInventory(prev => {
              const next = [...prev];
              const slot = next.find(s => s && s.id === currentItem.id);
              if (slot) {
                slot.count--;
                if (slot.count <= 0) {
                  const idx = next.indexOf(slot);
                  next[idx] = null;
                }
              }
              return next;
            });

            if (currentItem.tileId === TILES.TORCH) {
              for (let p = 0; p < 4; p++) {
                particlesRef.current.push({
                  x: (tileX + 0.5) * TILE_SIZE,
                  y: (tileY + 0.5) * TILE_SIZE,
                  vx: (Math.random() - 0.5) * 2,
                  vy: -Math.random() * 2,
                  color: '#ffaa00',
                  size: 2,
                  life: 15,
                  maxLife: 15,
                });
              }
            }
          }
        } else if (currentItem.type === 'wall' && currentItem.wallId !== undefined) {
          world.walls[tileX][tileY] = currentItem.wallId;
          soundManager.playPlace();
          onUpdateInventory(prev => {
            const next = [...prev];
            const slot = next.find(s => s && s.id === currentItem.id);
            if (slot) {
              slot.count--;
              if (slot.count <= 0) {
                const idx = next.indexOf(slot);
                next[idx] = null;
              }
            }
            return next;
          });
        }
      }
    }
  }, [onUpdateInventory]);

  // Main 60 FPS Game Loop
  useEffect(() => {
    let animId: number;

    const gameLoop = () => {
      const player = playerRef.current;
      const world = worldRef.current;

      if (!isPaused) {
        frameCountRef.current++;

        // 1. Advance Game Time
        world.time = (world.time + 4) % 24000;

        const isDayTime = world.time >= 4500 && world.time < 19500;
        const boss = enemiesRef.current.find(e => e.isBoss);
        if (boss) {
          soundManager.setTrack('boss');
          if (onBossStateChange) {
            onBossStateChange({ current: boss.hp, max: boss.maxHp, name: boss.name });
          }
        } else {
          soundManager.setTrack(isDayTime ? 'day' : 'night');
          if (onBossStateChange) onBossStateChange(null);
        }

        // Night monster spawner
        if (!isDayTime && Math.random() < 0.008 && enemiesRef.current.length < 8) {
          const spawnDir = Math.random() > 0.5 ? 1 : -1;
          const spawnX = player.x + spawnDir * (400 + Math.random() * 200);
          const isEye = Math.random() > 0.5;

          if (isEye) {
            enemiesRef.current.push({
              id: 'eye_' + Date.now(),
              type: 'demon_eye',
              name: '惡魔之眼',
              x: spawnX,
              y: player.y - 120 - Math.random() * 100,
              w: 22,
              h: 18,
              vx: 0,
              vy: 0,
              hp: 22,
              maxHp: 22,
              damage: 10,
              grounded: false,
              facing: spawnDir === 1 ? -1 : 1,
              jumpCooldown: 0,
              color: '#d62828',
              behaviorTimer: 0,
            });
          } else {
            enemiesRef.current.push({
              id: 'zombie_' + Date.now(),
              type: 'zombie',
              name: '殭屍',
              x: spawnX,
              y: player.y - 40,
              w: 20,
              h: 34,
              vx: 0,
              vy: 0,
              hp: 35,
              maxHp: 35,
              damage: 12,
              grounded: false,
              facing: spawnDir === 1 ? -1 : 1,
              jumpCooldown: 40,
              color: '#40916c',
              behaviorTimer: 0,
            });
          }
        }

        // 2. Player Physics & Input
        const keys = keysRef.current;
        const dropThrough = !!(keys['KeyS'] || keys['s'] || keys['S'] || keys['ArrowDown']);
        updatePlayerPhysics(player, world, keys, dropThrough);

        // Sync stats with HUD periodically (every 10 frames)
        if (frameCountRef.current % 10 === 0) {
          onSyncPlayerStats(player.hp, player.maxHp, player.y);
        }

        // 3. Mouse continuous hold
        if (mouseRef.current.down) {
          handlePlayerInteract();
        } else {
          if (player.bowCharging) {
            player.bowCharging = false;
            player.bowChargeTime = 0;
          }
        }

        // 4. Update Enemies
        for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
          const enemy = enemiesRef.current[i];
          updateEnemy(
            enemy,
            world,
            player,
            enemiesRef.current,
            particlesRef.current,
            damageNumbersRef.current,
            droppedItemsRef.current
          );
        }

        // 5. Update Projectiles
        updateProjectiles(
          projectilesRef.current,
          world,
          enemiesRef.current,
          particlesRef.current,
          damageNumbersRef.current,
          droppedItemsRef.current
        );

        // 6. Update Dropped Items
        updateDroppedItems(droppedItemsRef.current, world, player, handleItemPickup);

        // 7. Update Particles
        for (let i = particlesRef.current.length - 1; i >= 0; i--) {
          const p = particlesRef.current[i];
          p.x += p.vx;
          p.y += p.vy;
          if (p.gravity) p.vy += p.gravity;
          p.life--;
          if (p.life <= 0) particlesRef.current.splice(i, 1);
        }

        // 8. Update Damage Numbers
        for (let i = damageNumbersRef.current.length - 1; i >= 0; i--) {
          const d = damageNumbersRef.current[i];
          d.y -= 0.7;
          d.life--;
          if (d.life <= 0) damageNumbersRef.current.splice(i, 1);
        }

        // 9. Camera Smoothing
        const canvas = canvasRef.current;
        if (canvas) {
          const targetCamX = player.x + player.w / 2 - canvas.width / (2 * zoom);
          const targetCamY = player.y + player.h / 2 - canvas.height / (2 * zoom);

          cameraRef.current.x += (targetCamX - cameraRef.current.x) * 0.12;
          cameraRef.current.y += (targetCamY - cameraRef.current.y) * 0.12;

          cameraRef.current.x = Math.max(0, Math.min(cameraRef.current.x, world.width * TILE_SIZE - canvas.width / zoom));
          cameraRef.current.y = Math.max(0, Math.min(cameraRef.current.y, world.height * TILE_SIZE - canvas.height / zoom));

          mouseRef.current.worldX = mouseRef.current.x / zoom + cameraRef.current.x;
          mouseRef.current.worldY = mouseRef.current.y / zoom + cameraRef.current.y;
        }

        // Screen Shake decay
        if (screenShakeRef.current > 0) {
          screenShakeRef.current *= 0.85;
          if (screenShakeRef.current < 0.2) screenShakeRef.current = 0;
        }
      }

      // Render Everything!
      renderCanvas();
      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [handleItemPickup, handlePlayerInteract, isPaused, onBossStateChange, onSyncPlayerStats, zoom]);

  // Canvas Drawing Routine
  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const player = playerRef.current;
    const world = worldRef.current;
    const currentItem = activeItemRef.current;

    const vw = canvas.width;
    const vh = canvas.height;
    const cam = cameraRef.current;

    const shakeX = (Math.random() - 0.5) * screenShakeRef.current;
    const shakeY = (Math.random() - 0.5) * screenShakeRef.current;

    // Daylight ratio: 0 (midnight) to 1 (noon)
    let dayLightRatio = 0;
    if (world.time >= 4000 && world.time < 8000) {
      dayLightRatio = (world.time - 4000) / 4000;
    } else if (world.time >= 8000 && world.time < 16000) {
      dayLightRatio = 1;
    } else if (world.time >= 16000 && world.time < 20000) {
      dayLightRatio = 1 - (world.time - 16000) / 4000;
    } else {
      dayLightRatio = 0.05;
    }

    // 1. Draw Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, vh);
    if (dayLightRatio > 0.6) {
      skyGrad.addColorStop(0, '#5da4e8');
      skyGrad.addColorStop(1, '#a6d8ff');
    } else if (dayLightRatio > 0.2) {
      skyGrad.addColorStop(0, '#352554');
      skyGrad.addColorStop(0.5, '#c75d4d');
      skyGrad.addColorStop(1, '#ffb057');
    } else {
      skyGrad.addColorStop(0, '#090a14');
      skyGrad.addColorStop(1, '#1b1b2f');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, vw, vh);

    // Stars at night
    if (dayLightRatio < 0.4) {
      const starAlpha = 1 - dayLightRatio / 0.4;
      ctx.save();
      starsRef.current.forEach(star => {
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha * starAlpha})`;
        ctx.fillRect(star.x % vw, star.y % (vh * 0.7), star.size, star.size);
      });
      ctx.restore();
    }

    // Celestial Body: Sun or Moon
    ctx.save();
    const celestialAngle = (world.time / 24000) * Math.PI * 2;
    const celX = vw / 2 + Math.cos(celestialAngle - Math.PI / 2) * (vw * 0.45);
    const celY = vh * 0.55 + Math.sin(celestialAngle - Math.PI / 2) * (vh * 0.4);

    if (dayLightRatio > 0.3) {
      ctx.fillStyle = '#ffec5c';
      ctx.beginPath();
      ctx.arc(celX, celY, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 235, 100, 0.2)';
      ctx.beginPath();
      ctx.arc(celX, celY, 36, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#f0f3f4';
      ctx.beginPath();
      ctx.arc(celX, celY, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(celX - 4, celY - 3, 4, 0, Math.PI * 2);
      ctx.arc(celX + 5, celY + 4, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 2. Parallax Mountains
    ctx.save();
    const mountainOffset = (cam.x * 0.15) % vw;
    ctx.fillStyle = dayLightRatio > 0.4 ? '#47624f' : '#14211a';
    ctx.beginPath();
    ctx.moveTo(0, vh);
    for (let mx = 0; mx <= vw + 100; mx += 100) {
      const peakH = 120 + Math.sin((mx + mountainOffset) * 0.02) * 50;
      ctx.lineTo(mx, vh - peakH);
    }
    ctx.lineTo(vw, vh);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 3. Main World Translation
    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(-Math.floor(cam.x) + shakeX, -Math.floor(cam.y) + shakeY);

    const startCol = Math.max(0, Math.floor(cam.x / TILE_SIZE));
    const endCol = Math.min(world.width - 1, Math.ceil((cam.x + vw / zoom) / TILE_SIZE));
    const startRow = Math.max(0, Math.floor(cam.y / TILE_SIZE));
    const endRow = Math.min(world.height - 1, Math.ceil((cam.y + vh / zoom) / TILE_SIZE));

    // Dynamic Lighting Map Calculation
    const lightMap = showLighting
      ? calculateLighting(
          world,
          startCol,
          endCol,
          startRow,
          endRow,
          dayLightRatio,
          player.x,
          player.y,
          TILE_SIZE
        )
      : null;

    const pad = 6;
    const minX = Math.max(0, startCol - pad);
    const minY = Math.max(0, startRow - pad);

    // Render Background Walls
    for (let x = startCol; x <= endCol; x++) {
      for (let y = startRow; y <= endRow; y++) {
        const wall = world.walls[x][y];
        if (wall !== WALLS.NONE && world.tiles[x][y] === TILES.AIR) {
          ctx.fillStyle = WALL_COLORS[wall];
          ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
          ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }
    }

    // Render Foreground Tiles
    for (let x = startCol; x <= endCol; x++) {
      for (let y = startRow; y <= endRow; y++) {
        const tile = world.tiles[x][y];
        if (tile === TILES.AIR) continue;

        const props = TILE_PROPERTIES[tile];
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        if (tile === TILES.TORCH) {
          ctx.fillStyle = '#6b431e';
          ctx.fillRect(px + 10, py + 8, 4, 14);
          const flameFlicker = Math.sin(Date.now() * 0.02 + x) * 1.5;
          ctx.fillStyle = '#ff7700';
          ctx.fillRect(px + 9, py + 4 + flameFlicker, 6, 7);
          ctx.fillStyle = '#ffea00';
          ctx.fillRect(px + 10, py + 2 + flameFlicker, 4, 5);
        } else if (tile === TILES.PLATFORM) {
          ctx.fillStyle = props.color;
          ctx.fillRect(px, py, TILE_SIZE, 6);
          ctx.fillStyle = '#6e451b';
          ctx.fillRect(px, py + 4, TILE_SIZE, 2);
        } else if (tile === TILES.WORKBENCH) {
          ctx.fillStyle = '#b0793b';
          ctx.fillRect(px + 2, py + 6, TILE_SIZE - 4, 6);
          ctx.fillRect(px + 4, py + 12, 4, 12);
          ctx.fillRect(px + TILE_SIZE - 8, py + 12, 4, 12);
          ctx.fillStyle = '#7a7a85';
          ctx.fillRect(px + 4, py + 2, 5, 4);
        } else if (tile === TILES.FURNACE) {
          ctx.fillStyle = '#55555e';
          ctx.fillRect(px + 2, py + 4, TILE_SIZE - 4, TILE_SIZE - 4);
          ctx.fillStyle = '#222';
          ctx.fillRect(px + 6, py + 10, 12, 10);
          ctx.fillStyle = '#ff4400';
          ctx.fillRect(px + 8, py + 14, 8, 6);
          ctx.fillStyle = '#ffcc00';
          ctx.fillRect(px + 10, py + 16, 4, 3);
        } else if (tile === TILES.CHEST) {
          ctx.fillStyle = '#c9933b';
          ctx.fillRect(px + 2, py + 8, TILE_SIZE - 4, 16);
          ctx.fillStyle = '#54361c';
          ctx.fillRect(px + 4, py + 12, TILE_SIZE - 8, 2);
          ctx.fillStyle = '#ffd700';
          ctx.fillRect(px + 10, py + 13, 4, 4);
        } else if (tile === TILES.DOOR_CLOSED) {
          ctx.fillStyle = '#7a4b22';
          ctx.fillRect(px + 4, py, 16, TILE_SIZE);
          ctx.fillStyle = '#ffd700';
          ctx.fillRect(px + 14, py + 11, 3, 3);
        } else if (tile === TILES.DOOR_OPEN) {
          ctx.fillStyle = '#7a4b22';
          ctx.fillRect(px, py, 6, TILE_SIZE);
        } else {
          ctx.fillStyle = props.color;
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

          if (tile === TILES.GRASS) {
            ctx.fillStyle = '#6bc740';
            ctx.fillRect(px, py, TILE_SIZE, 4);
            for (let g = 0; g < TILE_SIZE; g += 4) {
              if ((x * 7 + g) % 3 === 0) {
                ctx.fillRect(px + g, py - 2, 2, 2);
              }
            }
          }

          if (props.accentColor) {
            ctx.fillStyle = props.accentColor;
            ctx.fillRect(px + 4, py + 5, 4, 4);
            ctx.fillRect(px + 14, py + 12, 3, 3);
            if (tile === TILES.AMETHYST) {
              ctx.fillRect(px + 10, py + 8, 5, 5);
            }
          }

          ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
          ctx.fillRect(px, py + TILE_SIZE - 2, TILE_SIZE, 2);
          ctx.fillRect(px + TILE_SIZE - 2, py, 2, TILE_SIZE);
        }
      }
    }

    // Render Mining Damage Cracks
    if (miningProgressRef.current) {
      const { x: mx, y: my, progress } = miningProgressRef.current;
      const targetTile = world.tiles[mx]?.[my];
      if (targetTile !== undefined && targetTile !== TILES.AIR) {
        const hardness = TILE_PROPERTIES[targetTile].hardness;
        const crackLevel = Math.min(3, Math.floor((progress / hardness) * 4));
        const px = mx * TILE_SIZE;
        const py = my * TILE_SIZE;

        ctx.strokeStyle = '#111';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (crackLevel >= 0) {
          ctx.moveTo(px + 6, py + 4);
          ctx.lineTo(px + 12, py + 12);
        }
        if (crackLevel >= 1) {
          ctx.lineTo(px + 18, py + 8);
        }
        if (crackLevel >= 2) {
          ctx.moveTo(px + 12, py + 12);
          ctx.lineTo(px + 8, py + 20);
        }
        if (crackLevel >= 3) {
          ctx.moveTo(px + 12, py + 12);
          ctx.lineTo(px + 18, py + 18);
        }
        ctx.stroke();
      }
    }

    // Render Hover Tile Target Grid Box
    const hoverTileX = Math.floor(mouseRef.current.worldX / TILE_SIZE);
    const hoverTileY = Math.floor(mouseRef.current.worldY / TILE_SIZE);
    const pDist = Math.hypot(
      (hoverTileX + 0.5) * TILE_SIZE - (player.x + player.w / 2),
      (hoverTileY + 0.5) * TILE_SIZE - (player.y + player.h / 2)
    );
    const inReach = pDist <= 6.5 * TILE_SIZE;

    ctx.strokeStyle = inReach ? 'rgba(255, 230, 80, 0.85)' : 'rgba(255, 80, 80, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(hoverTileX * TILE_SIZE, hoverTileY * TILE_SIZE, TILE_SIZE, TILE_SIZE);

    // Render Dropped Items
    droppedItemsRef.current.forEach(drop => {
      const bob = Math.sin(Date.now() * 0.008 + drop.x) * 3;
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(drop.item.icon, drop.x, drop.y + bob);
    });

    // Render Projectiles
    projectilesRef.current.forEach(proj => {
      ctx.save();
      ctx.translate(proj.x, proj.y);
      ctx.rotate(Math.atan2(proj.vy, proj.vx));

      ctx.fillStyle = '#8b5a2b';
      ctx.fillRect(-8, -1.5, 16, 3);
      ctx.fillStyle = '#c0c0c8';
      ctx.beginPath();
      ctx.moveTo(8, -3);
      ctx.lineTo(13, 0);
      ctx.lineTo(8, 3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ff4444';
      ctx.fillRect(-8, -3, 3, 6);
      ctx.restore();
    });

    // Render Particles
    particlesRef.current.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    });

    // Render Enemies
    enemiesRef.current.forEach(enemy => {
      ctx.save();

      if (enemy.type.startsWith('slime')) {
        const squish = enemy.grounded ? 0.85 : 1.15;
        const sw = enemy.w * (enemy.grounded ? 1.15 : 0.9);
        const sh = enemy.h * squish;

        ctx.fillStyle = enemy.color;
        ctx.beginPath();
        ctx.roundRect(enemy.x, enemy.y + (enemy.h - sh), sw, sh, [10, 10, 3, 3]);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillRect(enemy.x + 5, enemy.y + (enemy.h - sh) + 3, sw - 12, 3);

        ctx.fillStyle = '#fff';
        const eyeOffset = enemy.facing === 1 ? 4 : 0;
        ctx.fillRect(enemy.x + 4 + eyeOffset, enemy.y + 5, 3, 5);
        ctx.fillRect(enemy.x + 12 + eyeOffset, enemy.y + 5, 3, 5);
        ctx.fillStyle = '#111';
        ctx.fillRect(enemy.x + 5 + eyeOffset, enemy.y + 7, 2, 3);
        ctx.fillRect(enemy.x + 13 + eyeOffset, enemy.y + 7, 2, 3);
      } else if (enemy.type === 'zombie') {
        ctx.fillStyle = '#2b580c';
        ctx.fillRect(enemy.x + 3, enemy.y, 14, 10);
        ctx.fillStyle = '#ff3333';
        ctx.fillRect(enemy.x + (enemy.facing === 1 ? 11 : 4), enemy.y + 4, 3, 3);
        ctx.fillStyle = '#3a506b';
        ctx.fillRect(enemy.x + 2, enemy.y + 10, 16, 14);
        ctx.fillStyle = '#1c2541';
        ctx.fillRect(enemy.x + 3, enemy.y + 24, 14, 10);
        ctx.fillStyle = '#2b580c';
        const armX = enemy.facing === 1 ? enemy.x + 14 : enemy.x - 8;
        ctx.fillRect(armX, enemy.y + 12, 10, 4);
      } else if (enemy.type === 'demon_eye' || enemy.type === 'servant_of_cthulhu') {
        const ew = enemy.w;
        const eh = enemy.h;

        ctx.fillStyle = '#f8f9fa';
        ctx.beginPath();
        ctx.arc(enemy.x + ew / 2, enemy.y + eh / 2, ew / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#d90429';
        const veinX = enemy.facing === 1 ? enemy.x + 2 : enemy.x + ew - 6;
        ctx.fillRect(veinX, enemy.y + eh / 2 - 3, 5, 6);

        const irisAngle = Math.atan2(
          player.y + player.h / 2 - (enemy.y + eh / 2),
          player.x + player.w / 2 - (enemy.x + ew / 2)
        );
        const irisX = enemy.x + ew / 2 + Math.cos(irisAngle) * 3;
        const irisY = enemy.y + eh / 2 + Math.sin(irisAngle) * 3;

        ctx.fillStyle = '#3a86ff';
        ctx.beginPath();
        ctx.arc(irisX, irisY, ew / 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(irisX, irisY, ew / 8, 0, Math.PI * 2);
        ctx.fill();
      } else if (enemy.type === 'eye_of_cthulhu') {
        const ew = enemy.w;
        const eh = enemy.h;
        const isPhase2 = enemy.phase === 2;

        ctx.translate(enemy.x + ew / 2, enemy.y + eh / 2);
        ctx.rotate(Math.atan2(enemy.vy, enemy.vx) * 0.4);

        ctx.fillStyle = '#edf2f4';
        ctx.beginPath();
        ctx.arc(0, 0, ew / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#d90429';
        ctx.beginPath();
        ctx.arc(-ew / 2 + 6, 0, 10, 0, Math.PI * 2);
        ctx.fill();

        if (!isPhase2) {
          const irisAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
          const ix = Math.cos(irisAngle) * 10;
          const iy = Math.sin(irisAngle) * 10;

          ctx.fillStyle = '#2b7fff';
          ctx.beginPath();
          ctx.arc(ix, iy, 15, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.arc(ix, iy, 8, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = '#660708';
          ctx.beginPath();
          ctx.arc(4, 0, 18, -Math.PI / 2, Math.PI / 2);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#fff';
          for (let t = -12; t <= 12; t += 6) {
            ctx.beginPath();
            ctx.moveTo(4, t);
            ctx.lineTo(14, t + 3);
            ctx.lineTo(4, t + 6);
            ctx.fill();
          }
        }

        ctx.restore();
      }

      if (enemy.hp < enemy.maxHp && !enemy.isBoss) {
        const barW = enemy.w + 8;
        const barH = 4;
        const barX = enemy.x - 4;
        const barY = enemy.y - 8;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = '#2ec4b6';
        ctx.fillRect(barX, barY, barW * (enemy.hp / enemy.maxHp), barH);
      }

      ctx.restore();
    });

    // Render Player
    if (!player.isDead) {
      const isInvincible = player.invincibleTimer > 0 && Math.floor(player.invincibleTimer / 4) % 2 === 0;

      if (!isInvincible) {
        ctx.save();

        const isRunning = Math.abs(player.vx) > 0.2 && player.grounded;
        const legSwing = isRunning ? Math.sin(Date.now() * 0.02) * 4 : 0;

        ctx.fillStyle = '#1d3557';
        ctx.fillRect(player.x + 2 + legSwing, player.y + 20, 5, 10);
        ctx.fillRect(player.x + 9 - legSwing, player.y + 20, 5, 10);

        ctx.fillStyle = '#3e2723';
        ctx.fillRect(player.x + 1 + legSwing, player.y + 27, 6, 3);
        ctx.fillRect(player.x + 8 - legSwing, player.y + 27, 6, 3);

        ctx.fillStyle = '#e63946';
        ctx.fillRect(player.x + 2, player.y + 10, 12, 10);

        ctx.fillStyle = '#ffcdb2';
        ctx.fillRect(player.x + 3, player.y + 2, 10, 8);

        ctx.fillStyle = '#6d4c41';
        ctx.fillRect(player.x + 2, player.y, 12, 4);
        ctx.fillRect(player.x + (player.facing === 1 ? 1 : 11), player.y + 2, 4, 6);

        ctx.fillStyle = '#111';
        const eyeX = player.facing === 1 ? player.x + 10 : player.x + 4;
        ctx.fillRect(eyeX, player.y + 5, 2, 3);

        if (currentItem) {
          ctx.save();
          ctx.translate(player.x + player.w / 2, player.y + 14);
          if (player.facing === -1) ctx.scale(-1, 1);

          if (player.swingTimer > 0) {
            const progress = 1 - player.swingTimer / (player.swingMax || 12);
            const rot = -1.2 + progress * 2.6;
            ctx.rotate(rot);

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 20, rot - 0.4, rot);
            ctx.stroke();

            ctx.font = '16px sans-serif';
            ctx.fillText(currentItem.icon, 8, 4);
          } else if (player.bowCharging) {
            const aimAngle = Math.atan2(
              mouseRef.current.worldY - (player.y + 14),
              (mouseRef.current.worldX - (player.x + player.w / 2)) * player.facing
            );
            ctx.rotate(aimAngle);
            ctx.font = '16px sans-serif';
            ctx.fillText('🏹', 6, 4);
          } else {
            ctx.font = '14px sans-serif';
            ctx.fillText(currentItem.icon, 6, 4);
          }

          ctx.restore();
        }

        ctx.restore();
      }
    } else {
      ctx.fillStyle = '#7a7a85';
      ctx.fillRect(player.x + 2, player.y + 14, 12, 16);
      ctx.fillRect(player.x - 1, player.y + 18, 18, 4);
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#fff';
      ctx.fillText('RIP', player.x + 3, player.y + 26);
    }

    // Render Floating Damage Numbers
    damageNumbersRef.current.forEach(d => {
      ctx.font = 'bold 13px sans-serif';
      ctx.fillStyle = '#000';
      ctx.fillText(d.text, d.x + 1, d.y + 1);
      ctx.fillStyle = d.color;
      ctx.fillText(d.text, d.x, d.y);
    });

    // 4. Dynamic Lighting Darkness Overlay Pass
    if (showLighting && lightMap) {
      for (let x = startCol; x <= endCol; x++) {
        const lx = x - minX;
        for (let y = startRow; y <= endRow; y++) {
          const ly = y - minY;
          const lightLevel = lightMap[lx]?.[ly] ?? 0;

          if (lightLevel < 0.98) {
            const darkness = 1 - lightLevel;
            ctx.fillStyle = `rgba(5, 5, 8, ${darkness})`;
            ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          }
        }
      }
    }

    ctx.restore();
  };

  // Keyboard events on window (supports both e.code and e.key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      if (e.key) {
        keysRef.current[e.key] = true;
        keysRef.current[e.key.toLowerCase()] = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
      if (e.key) {
        keysRef.current[e.key] = false;
        keysRef.current[e.key.toLowerCase()] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Global mouse handlers to prevent stuck clicks
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    };

    const handleWindowMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        mouseRef.current.down = false;
      }
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) {
      mouseRef.current.down = true;
      handlePlayerInteract();
    } else if (e.button === 2) {
      e.preventDefault();
      const world = worldRef.current;
      const tileX = Math.floor(mouseRef.current.worldX / TILE_SIZE);
      const tileY = Math.floor(mouseRef.current.worldY / TILE_SIZE);

      if (tileX >= 0 && tileX < world.width && tileY >= 0 && tileY < world.height) {
        const tile = world.tiles[tileX][tileY];

        if (tile === TILES.DOOR_CLOSED) {
          world.tiles[tileX][tileY] = TILES.DOOR_OPEN;
          soundManager.playPlace();
        } else if (tile === TILES.DOOR_OPEN) {
          world.tiles[tileX][tileY] = TILES.DOOR_CLOSED;
          soundManager.playPlace();
        } else if (tile === TILES.CHEST && onOpenChest) {
          const chestIdx = world.chests.findIndex(c => c.x === tileX && c.y === tileY);
          if (chestIdx !== -1) {
            onOpenChest(chestIdx);
            soundManager.playCraft();
          }
        }
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden select-none"
    >
      <canvas
        ref={canvasRef}
        tabIndex={0}
        onMouseDown={e => {
          canvasRef.current?.focus();
          handleMouseDown(e);
        }}
        onContextMenu={e => e.preventDefault()}
        className="cursor-crosshair block w-full h-full outline-none focus:outline-none"
      />
    </div>
  );
};
