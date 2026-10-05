import React, { useState } from 'react';
import { Anvil, ChevronRight, Flame, Hammer, Package, Sparkles, X } from 'lucide-react';
import { ChestData, CraftingRecipe, ItemDef, Player, TILES, WorldData } from '../types/game';
import { soundManager } from '../utils/audio';
import { RECIPES } from '../utils/crafting';
import { TILE_SIZE } from '../utils/physics';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: (ItemDef | null)[];
  onUpdateInventory: (updater: (prev: (ItemDef | null)[]) => (ItemDef | null)[]) => void;
  player: { x: number; y: number };
  world: WorldData;
  activeChestIndex?: number | null;
  onCloseChest?: () => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  onClose,
  inventory,
  onUpdateInventory,
  player,
  world,
  activeChestIndex,
  onCloseChest,
}) => {
  const [selectedRecipe, setSelectedRecipe] = useState<CraftingRecipe | null>(RECIPES[0]);

  const isVisible = isOpen || (activeChestIndex !== null && activeChestIndex !== undefined);
  if (!isVisible) return null;

  const handleClose = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (activeChestIndex !== null && activeChestIndex !== undefined && onCloseChest) {
      onCloseChest();
    }
    onClose();
  };

  // Determine nearby crafting stations
  const pTileX = Math.floor(player.x / TILE_SIZE);
  const pTileY = Math.floor(player.y / TILE_SIZE);
  let hasWorkbench = false;
  let hasFurnace = false;

  const stationRange = 5;
  for (let dx = -stationRange; dx <= stationRange; dx++) {
    for (let dy = -stationRange; dy <= stationRange; dy++) {
      const tx = pTileX + dx;
      const ty = pTileY + dy;
      if (tx >= 0 && tx < world.width && ty >= 0 && ty < world.height) {
        if (world.tiles[tx][ty] === TILES.WORKBENCH) hasWorkbench = true;
        if (world.tiles[tx][ty] === TILES.FURNACE) hasFurnace = true;
      }
    }
  }

  // Helper to count items in player inventory
  const countItem = (itemId: string): number => {
    return inventory.reduce((sum, item) => (item && item.id === itemId ? sum + item.count : sum), 0);
  };

  // Check if player can craft a recipe
  const canCraft = (recipe: CraftingRecipe): boolean => {
    if (recipe.requiredStation === 'workbench' && !hasWorkbench) return false;
    if (recipe.requiredStation === 'furnace' && !hasFurnace) return false;

    return recipe.ingredients.every(ing => countItem(ing.itemId) >= ing.count);
  };

  // Perform craft action
  const handleCraft = (recipe: CraftingRecipe) => {
    if (!canCraft(recipe)) return;

    onUpdateInventory(prev => {
      const next = [...prev];

      // Deduct ingredients
      recipe.ingredients.forEach(ing => {
        let remaining = ing.count;
        for (let i = 0; i < next.length && remaining > 0; i++) {
          const slot = next[i];
          if (slot && slot.id === ing.itemId) {
            const take = Math.min(remaining, slot.count);
            slot.count -= take;
            remaining -= take;
            if (slot.count <= 0) next[i] = null;
          }
        }
      });

      // Add crafted item
      const newItem = { ...recipe.result };
      // Try stack
      for (let i = 0; i < next.length; i++) {
        const slot = next[i];
        if (slot && slot.id === newItem.id && slot.count < slot.maxStack) {
          const add = Math.min(newItem.count, slot.maxStack - slot.count);
          slot.count += add;
          newItem.count -= add;
          if (newItem.count <= 0) break;
        }
      }
      // Try empty
      if (newItem.count > 0) {
        for (let i = 0; i < next.length; i++) {
          if (!next[i]) {
            next[i] = newItem;
            break;
          }
        }
      }

      return next;
    });

    soundManager.playCraft();
  };

  // Chest items
  const activeChest: ChestData | null =
    activeChestIndex !== null && activeChestIndex !== undefined && world.chests[activeChestIndex]
      ? world.chests[activeChestIndex]
      : null;

  const handleLootChest = () => {
    if (!activeChest) return;
    onUpdateInventory(prev => {
      const next = [...prev];
      activeChest.items.forEach((cItem, idx) => {
        if (cItem) {
          for (let i = 0; i < next.length; i++) {
            if (!next[i]) {
              next[i] = cItem;
              activeChest.items[idx] = null;
              break;
            }
          }
        }
      });
      return next;
    });
    soundManager.playPickup();
  };

  return (
    <div
      onClick={handleClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150 cursor-pointer pointer-events-auto"
    >
      <div
        data-modal-content="true"
        onClick={e => e.stopPropagation()}
        className="bg-[#241c15] border-3 border-[#6b533b] rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden text-stone-100 font-sans cursor-default pointer-events-auto"
      >
        {/* Header */}
        <div className="bg-[#362a1e] px-4 py-3 border-b-2 border-[#54422e] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold tracking-wide font-pixel text-amber-200">
              {activeChest ? '地底寶箱 & 隨身背包' : '隨身背包 & 製作檯'}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded text-stone-400 hover:text-white hover:bg-stone-800 transition cursor-pointer"
            aria-label="關閉視窗"
          >
            <X className="w-5 h-5 pointer-events-none" />
          </button>
        </div>

        {/* Content Body */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 overflow-y-auto">
          {/* Left / Top: Player Inventory */}
          <div className="md:col-span-6 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-300 font-retro tracking-wide">
                快捷欄 (1 - 8) 與 擴充儲存格 (共 20 格)
              </span>
            </div>

            {/* 20 Inventory Slots Grid */}
            <div className="grid grid-cols-5 gap-1.5 p-2 bg-[#1a140f] rounded-lg border-2 border-[#423324]">
              {inventory.map((item, idx) => (
                <div
                  key={idx}
                  className={`relative w-12 h-12 flex flex-col items-center justify-center rounded border-2 transition ${
                    idx < 8
                      ? 'bg-amber-950/30 border-amber-800/80 hover:border-amber-600'
                      : 'bg-stone-900 border-stone-800 hover:border-stone-600'
                  }`}
                >
                  <span className="absolute top-0.5 left-1 text-[9px] text-stone-500 font-mono">
                    {idx < 8 ? idx + 1 : ''}
                  </span>
                  {item ? (
                    <>
                      <span className="text-2xl filter drop-shadow">{item.icon}</span>
                      {item.count > 1 && (
                        <span className="absolute bottom-0.5 right-1 text-[10px] font-bold text-white font-mono drop-shadow">
                          {item.count}
                        </span>
                      )}
                    </>
                  ) : null}
                </div>
              ))}
            </div>

            {/* Active Chest View (if opened) */}
            {activeChest && (
              <div className="flex flex-col gap-2 mt-2 p-3 bg-amber-950/20 border-2 border-amber-900/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 font-retro">地底寶箱內容</span>
                  <button
                    type="button"
                    onClick={handleLootChest}
                    className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs rounded transition cursor-pointer"
                  >
                    全部拾取
                  </button>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {activeChest.items.map((cItem, cIdx) => (
                    <div
                      key={cIdx}
                      className="relative w-12 h-12 flex flex-col items-center justify-center rounded bg-stone-900 border-2 border-amber-800/60"
                    >
                      {cItem ? (
                        <>
                          <span className="text-2xl">{cItem.icon}</span>
                          {cItem.count > 1 && (
                            <span className="absolute bottom-0.5 right-1 text-[10px] font-bold text-white font-mono">
                              {cItem.count}
                            </span>
                          )}
                        </>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Crafting Station & Recipe Catalog */}
          <div className="md:col-span-6 flex flex-col gap-3 bg-[#1c1611] p-3 rounded-lg border-2 border-[#423324]">
            {/* Crafting Stations status */}
            <div className="flex items-center gap-2 pb-2 border-b border-stone-800 text-xs">
              <span className="text-stone-400">目前鄰近設施:</span>
              <span className="px-2 py-0.5 bg-stone-800 text-stone-300 rounded text-[11px] flex items-center gap-1">
                <Hammer className="w-3 h-3 text-amber-400" /> 徒手
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[11px] flex items-center gap-1 ${
                  hasWorkbench ? 'bg-amber-900/60 text-amber-300 border border-amber-700' : 'bg-stone-900 text-stone-600'
                }`}
              >
                <Anvil className="w-3 h-3" /> 工作檯 {hasWorkbench ? '✓' : '✗'}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[11px] flex items-center gap-1 ${
                  hasFurnace ? 'bg-orange-900/60 text-orange-300 border border-orange-700' : 'bg-stone-900 text-stone-600'
                }`}
              >
                <Flame className="w-3 h-3" /> 熔爐 {hasFurnace ? '✓' : '✗'}
              </span>
            </div>

            {/* Recipes List & Preview */}
            <div className="grid grid-cols-2 gap-3 h-64">
              {/* Recipe Selector */}
              <div className="flex flex-col gap-1 overflow-y-auto pr-1">
                {RECIPES.map(recipe => {
                  const available = canCraft(recipe);
                  const isSelected = selectedRecipe?.id === recipe.id;

                  return (
                    <button
                      key={recipe.id}
                      type="button"
                      onClick={() => setSelectedRecipe(recipe)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded text-left transition cursor-pointer ${
                        isSelected
                          ? 'bg-amber-600 text-stone-900 font-bold'
                          : available
                          ? 'bg-stone-800/80 hover:bg-stone-700 text-stone-200'
                          : 'bg-stone-900/40 text-stone-500 hover:text-stone-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{recipe.result.icon}</span>
                        <div className="flex flex-col leading-tight">
                          <span className="text-xs font-semibold">{recipe.result.name}</span>
                          <span className="text-[10px] opacity-75">
                            {recipe.requiredStation === 'hand'
                              ? '徒手製作'
                              : recipe.requiredStation === 'workbench'
                              ? '工作檯'
                              : '熔爐'}
                          </span>
                        </div>
                      </div>
                      {available && <span className="text-[10px] text-emerald-400 font-bold">可製作</span>}
                    </button>
                  );
                })}
              </div>

              {/* Recipe Details & Craft Button */}
              {selectedRecipe && (
                <div className="flex flex-col justify-between p-3 bg-[#15100c] rounded border border-stone-800">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">{selectedRecipe.result.icon}</span>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-amber-300 font-retro">
                          {selectedRecipe.result.name} x{selectedRecipe.result.count}
                        </span>
                        <span className="text-[11px] text-stone-400">{selectedRecipe.result.desc}</span>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-col gap-1">
                      <span className="text-[11px] text-stone-400 font-bold">所需材料:</span>
                      {selectedRecipe.ingredients.map((ing, iIdx) => {
                        const current = countItem(ing.itemId);
                        const hasEnough = current >= ing.count;

                        return (
                          <div
                            key={iIdx}
                            className={`flex items-center justify-between text-xs px-2 py-1 rounded ${
                              hasEnough ? 'bg-stone-900/80 text-emerald-300' : 'bg-red-950/40 text-rose-400'
                            }`}
                          >
                            <span>{ing.name}</span>
                            <span className="font-mono">
                              {current} / {ing.count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!canCraft(selectedRecipe)}
                    onClick={() => handleCraft(selectedRecipe)}
                    className={`w-full py-2 rounded font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      canCraft(selectedRecipe)
                        ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 active:scale-95 shadow-md'
                        : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" /> 製作物品
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#1a140f] px-4 py-2 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
          <span className="font-retro">快捷鍵：按 <b className="text-amber-300">E</b> 或 <b className="text-amber-300">ESC</b> 鍵也可快速關閉背包</span>
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded text-xs transition cursor-pointer"
          >
            關閉背包 (E / ESC)
          </button>
        </div>
      </div>
    </div>
  );
};
