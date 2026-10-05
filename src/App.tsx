/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { GuideModal } from './components/GuideModal';
import { HUD } from './components/HUD';
import { InventoryModal } from './components/InventoryModal';
import { MiniMapModal } from './components/MiniMapModal';
import { TouchControls } from './components/TouchControls';
import { ItemDef, Player, WorldData } from './types/game';
import { soundManager } from './utils/audio';
import { getDefaultHotbar } from './utils/items';
import { TILE_SIZE } from './utils/physics';
import { generateWorld } from './utils/worldGen';

const SAVE_KEY = 'mini_terraria_save_v1';

export default function App() {
  // World State
  const [world, setWorld] = useState<WorldData>(() => {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.tiles && parsed.width) return parsed;
      } catch (e) {
        console.error('Failed to load save:', e);
      }
    }
    return generateWorld(180, 90);
  });

  // Player Stats for HUD & Modals (updated without triggering 60 FPS re-renders)
  const [playerStats, setPlayerStats] = useState({
    hp: 100,
    maxHp: 100,
    x: (world.spawnX || 90) * TILE_SIZE,
    y: (world.spawnY || 20) * TILE_SIZE,
    depthY: (world.spawnY || 20) * TILE_SIZE,
  });

  // Initial Player configuration
  const [initialPlayer] = useState<Player>(() => ({
    x: (world.spawnX || 90) * TILE_SIZE,
    y: (world.spawnY || 20) * TILE_SIZE,
    w: 16,
    h: 30,
    vx: 0,
    vy: 0,
    speed: 3.2,
    jumpPower: -8.5,
    grounded: false,
    facing: 1,
    hp: 100,
    maxHp: 100,
    invincibleTimer: 0,
    swingTimer: 0,
    swingMax: 12,
    bowCharging: false,
    bowChargeTime: 0,
    respawnTimer: 0,
    isDead: false,
    spawnX: world.spawnX || 90,
    spawnY: world.spawnY || 20,
  }));

  // 20 Inventory slots (0-7 are hotbar)
  const [inventory, setInventory] = useState<(ItemDef | null)[]>(() => {
    const hotbar = getDefaultHotbar();
    const remaining = new Array(12).fill(null);
    return [...hotbar, ...remaining];
  });

  // Active Hotbar Slot (0 to 7)
  const [activeSlot, setActiveSlot] = useState<number>(0);

  // UI Modals
  const [isInventoryOpen, setIsInventoryOpen] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isMapOpen, setIsMapOpen] = useState<boolean>(false);
  const [activeChestIndex, setActiveChestIndex] = useState<number | null>(null);

  // Settings
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showLighting, setShowLighting] = useState<boolean>(true);
  const [zoom, setZoom] = useState<number>(1);
  const [showMobileControls, setShowMobileControls] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Boss status indicator (if active)
  const [bossHp, setBossHp] = useState<{ current: number; max: number; name: string } | null>(null);

  // Start background music on first interaction
  useEffect(() => {
    const handleFirstClick = () => {
      soundManager.startMusic('day');
      window.removeEventListener('pointerdown', handleFirstClick);
    };
    window.addEventListener('pointerdown', handleFirstClick);
    return () => window.removeEventListener('pointerdown', handleFirstClick);
  }, []);

  // Sync Player Stats callback from GameCanvas
  const handleSyncPlayerStats = useCallback((hp: number, maxHp: number, depthY: number) => {
    setPlayerStats(prev => {
      if (prev.hp === hp && prev.maxHp === maxHp && Math.abs(prev.depthY - depthY) < 5) {
        return prev;
      }
      return {
        ...prev,
        hp,
        maxHp,
        y: depthY,
        depthY,
      };
    });
  }, []);

  // Save Game to localStorage
  const handleSaveGame = useCallback(() => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(world));
      setSaveToast('遊戲世界進度已成功儲存！');
      setTimeout(() => setSaveToast(null), 2500);
    } catch (e) {
      setSaveToast('儲存失敗：瀏覽器空間不足');
      setTimeout(() => setSaveToast(null), 2500);
    }
  }, [world]);

  // Generate New World
  const handleNewWorld = useCallback(() => {
    if (window.confirm('確定要生成一個全新的隨機世界嗎？當前的地圖建築將被重置！')) {
      const newWorld = generateWorld(180, 90);
      setWorld(newWorld);
      setPlayerStats({
        hp: 100,
        maxHp: 100,
        x: newWorld.spawnX * TILE_SIZE,
        y: newWorld.spawnY * TILE_SIZE,
        depthY: newWorld.spawnY * TILE_SIZE,
      });
      setInventory([...getDefaultHotbar(), ...new Array(12).fill(null)]);
      localStorage.removeItem(SAVE_KEY);
      setSaveToast('全新世界生成完成！');
      setTimeout(() => setSaveToast(null), 2500);
    }
  }, []);

  // Close all active modals and refocus game canvas
  const closeAllModals = useCallback(() => {
    setIsInventoryOpen(false);
    setActiveChestIndex(null);
    setIsGuideOpen(false);
    setIsMapOpen(false);

    // Ensure focus returns to canvas so WASD / Space / numbers respond immediately
    window.focus();
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.focus();
    }
  }, []);

  // Global event listener that detects clicks outside of active modals
  useEffect(() => {
    const isAnyModalOpen = isInventoryOpen || isGuideOpen || isMapOpen || activeChestIndex !== null;
    if (!isAnyModalOpen) return;

    const handleGlobalPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // If clicked inside the modal dialog container, do not close
      if (target.closest('[data-modal-content="true"]')) {
        return;
      }

      // If clicked on an interactive modal trigger button (e.g. HUD toggle buttons), let toggle handler handle it
      if (target.closest('[data-modal-trigger="true"]')) {
        return;
      }

      // Click is outside active modal content: close all modals and unpause game loop
      closeAllModals();
    };

    window.addEventListener('pointerdown', handleGlobalPointerDown, true);
    return () => {
      window.removeEventListener('pointerdown', handleGlobalPointerDown, true);
    };
  }, [isInventoryOpen, isGuideOpen, isMapOpen, activeChestIndex, closeAllModals]);

  // Keyboard shortcut listener for hotbar & modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Numbers 1-8 for hotbar
      const num = parseInt(e.key);
      if (num >= 1 && num <= 8) {
        setActiveSlot(num - 1);
      }

      // E or I for Inventory
      if (e.code === 'KeyE' || e.code === 'KeyI' || e.key === 'e' || e.key === 'E') {
        if (!isGuideOpen && !isMapOpen) {
          if (isInventoryOpen || activeChestIndex !== null) {
            closeAllModals();
          } else {
            setIsInventoryOpen(true);
          }
        }
      }

      // H for Guide
      if (e.code === 'KeyH' || e.key === 'h' || e.key === 'H') {
        if (!isInventoryOpen && !isMapOpen) {
          if (isGuideOpen) {
            closeAllModals();
          } else {
            setIsGuideOpen(true);
          }
        }
      }

      // M for Map
      if (e.code === 'KeyM' || e.key === 'm' || e.key === 'M') {
        if (!isInventoryOpen && !isGuideOpen) {
          if (isMapOpen) {
            closeAllModals();
          } else {
            setIsMapOpen(true);
          }
        }
      }

      // Escape to close any modal
      if (e.code === 'Escape' || e.key === 'Escape') {
        closeAllModals();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeChestIndex, closeAllModals, isGuideOpen, isInventoryOpen, isMapOpen]);

  // Mouse wheel to cycle hotbar
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (isInventoryOpen || isGuideOpen || isMapOpen) return;
      if (e.deltaY > 0) {
        setActiveSlot(prev => (prev + 1) % 8);
      } else {
        setActiveSlot(prev => (prev - 1 + 8) % 8);
      }
    };
    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [isGuideOpen, isInventoryOpen, isMapOpen]);

  // Touch virtual key simulator
  const handleSimulateKey = (code: string, pressed: boolean) => {
    window.dispatchEvent(new KeyboardEvent(pressed ? 'keydown' : 'keyup', { code, bubbles: true }));
  };

  // Quick Heal action
  const handleQuickHeal = () => {
    const potionIdx = inventory.findIndex(i => i && i.id === 'healing_potion');
    if (potionIdx !== -1 && playerStats.hp < playerStats.maxHp) {
      setPlayerStats(prev => ({
        ...prev,
        hp: Math.min(prev.maxHp, prev.hp + 50),
      }));
      setInventory(prev => {
        const next = [...prev];
        const slot = next[potionIdx];
        if (slot) {
          slot.count--;
          if (slot.count <= 0) next[potionIdx] = null;
        }
        return next;
      });
      soundManager.playHeal();
    }
  };

  const handleCycleZoom = () => {
    setZoom(prev => (prev === 1 ? 1.25 : prev === 1.25 ? 1.5 : 1));
  };

  const handleToggleMute = () => {
    const nextMuted = soundManager.toggleMute();
    setIsMuted(nextMuted);
  };

  return (
    <div className="relative w-screen h-screen bg-[#111116] overflow-hidden flex flex-col font-sans select-none">
      {/* Top Navbar Header */}
      <header className="h-10 bg-[#1c1815] border-b border-[#3e3223] px-4 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌳</span>
          <h1 className="text-xs font-bold text-amber-300 font-pixel tracking-wider">
            MINI TERRARIA
          </h1>
          <span className="text-[11px] text-stone-400 font-retro hidden md:inline">
            · 2D 像素沙盒冒險
          </span>
        </div>

        {/* Global Action Bar */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={handleSaveGame}
            className="px-2.5 py-1 bg-amber-700/80 hover:bg-amber-600 text-stone-100 rounded text-[11px] font-semibold transition active:scale-95 cursor-pointer"
          >
            💾 儲存世界
          </button>
          <button
            onClick={handleNewWorld}
            className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-[11px] font-semibold transition active:scale-95 cursor-pointer"
          >
            🔄 重置新世界
          </button>
        </div>
      </header>

      {/* Main Game Screen */}
      <div className="relative flex-1 w-full h-[calc(100vh-2.5rem)] overflow-hidden bg-black">
        {/* Canvas World */}
        <GameCanvas
          world={world}
          initialPlayer={initialPlayer}
          activeItem={inventory[activeSlot]}
          onSyncPlayerStats={handleSyncPlayerStats}
          onUpdateInventory={setInventory}
          onOpenChest={idx => {
            setActiveChestIndex(idx);
            setIsInventoryOpen(true);
          }}
          isPaused={isInventoryOpen || isGuideOpen || isMapOpen || activeChestIndex !== null}
          zoom={zoom}
          showLighting={showLighting}
          onBossStateChange={setBossHp}
        />

        {/* Terraria HUD */}
        <HUD
          player={playerStats}
          world={world}
          hotbar={inventory.slice(0, 8)}
          activeSlot={activeSlot}
          onSelectSlot={setActiveSlot}
          onToggleInventory={() => {
            if (isInventoryOpen || activeChestIndex !== null) {
              closeAllModals();
            } else {
              setIsInventoryOpen(true);
            }
          }}
          onToggleGuide={() => {
            if (isGuideOpen) {
              closeAllModals();
            } else {
              setIsGuideOpen(true);
            }
          }}
          onToggleMap={() => {
            if (isMapOpen) {
              closeAllModals();
            } else {
              setIsMapOpen(true);
            }
          }}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          showLighting={showLighting}
          onToggleLighting={() => setShowLighting(prev => !prev)}
          zoom={zoom}
          onCycleZoom={handleCycleZoom}
          bossHp={bossHp}
          onToggleMobileControls={() => setShowMobileControls(prev => !prev)}
          showMobileControls={showMobileControls}
        />

        {/* On-screen touch controls */}
        <TouchControls
          isVisible={showMobileControls}
          onSimulateKey={handleSimulateKey}
          onQuickHeal={handleQuickHeal}
        />

        {/* Save Toast Notification */}
        {saveToast && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-stone-950 font-bold px-4 py-2 rounded-lg shadow-xl text-xs font-retro animate-bounce">
            {saveToast}
          </div>
        )}
      </div>

      {/* Modals */}
      <InventoryModal
        isOpen={isInventoryOpen || activeChestIndex !== null}
        onClose={closeAllModals}
        inventory={inventory}
        onUpdateInventory={setInventory}
        player={playerStats}
        world={world}
        activeChestIndex={activeChestIndex}
        onCloseChest={closeAllModals}
      />

      <GuideModal
        isOpen={isGuideOpen}
        onClose={closeAllModals}
      />

      <MiniMapModal
        isOpen={isMapOpen}
        onClose={closeAllModals}
        world={world}
        player={playerStats}
      />
    </div>
  );
}
