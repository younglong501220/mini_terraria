import React from 'react';
import {
  Compass,
  HelpCircle,
  Map as MapIcon,
  Maximize2,
  Package,
  Sparkles,
  Volume2,
  VolumeX,
  ZoomIn,
} from 'lucide-react';
import { ItemDef, Player, WorldData } from '../types/game';
import { TILE_SIZE } from '../utils/physics';

interface HUDProps {
  player: { hp: number; maxHp: number; y: number };
  world: WorldData;
  hotbar: (ItemDef | null)[];
  activeSlot: number;
  onSelectSlot: (slot: number) => void;
  onToggleInventory: () => void;
  onToggleGuide: () => void;
  onToggleMap: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  showLighting: boolean;
  onToggleLighting: () => void;
  zoom: number;
  onCycleZoom: () => void;
  bossHp?: { current: number; max: number; name: string } | null;
  onToggleMobileControls: () => void;
  showMobileControls: boolean;
}

export const HUD: React.FC<HUDProps> = ({
  player,
  world,
  hotbar,
  activeSlot,
  onSelectSlot,
  onToggleInventory,
  onToggleGuide,
  onToggleMap,
  isMuted,
  onToggleMute,
  showLighting,
  onToggleLighting,
  zoom,
  onCycleZoom,
  bossHp,
  onToggleMobileControls,
  showMobileControls,
}) => {
  // Convert 0..24000 ticks to 24hr format
  const hours = Math.floor((world.time / 24000) * 24);
  const minutes = Math.floor(((world.time / 24000) * 24 - hours) * 60);
  const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  const isDay = world.time >= 4500 && world.time < 19500;

  // Depth calculation
  const depthFt = Math.round((world.height * 0.28 * TILE_SIZE - player.y) / 2);
  let depthLayer = '表層 (Surface)';
  if (depthFt < -100) {
    depthLayer = '深層洞穴 (Cavern)';
  } else if (depthFt < 0) {
    depthLayer = '地下層 (Underground)';
  }

  // Hearts calculation (Each heart represents 20 HP, max 10 hearts = 200 HP)
  const totalHearts = Math.ceil(player.maxHp / 20);
  const fullHearts = Math.floor(player.hp / 20);
  const remainder = player.hp % 20;

  return (
    <div className="absolute inset-0 pointer-events-none p-3 flex flex-col justify-between select-none">
      {/* Top Bar Header */}
      <div className="flex items-start justify-between gap-4">
        {/* Left: Hotbar */}
        <div className="flex flex-col gap-1.5 pointer-events-auto">
          <div className="flex items-center gap-1.5 bg-black/60 p-1.5 rounded-lg border-2 border-[#54422e] backdrop-blur-xs">
            {hotbar.slice(0, 8).map((item, idx) => {
              const isActive = idx === activeSlot;
              return (
                <button
                  key={idx}
                  onClick={() => onSelectSlot(idx)}
                  className={`relative w-11 h-11 flex flex-col items-center justify-center rounded transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-400/20 border-2 border-amber-300 shadow-[0_0_8px_rgba(255,215,0,0.6)] scale-105'
                      : 'bg-stone-900/80 border-2 border-stone-700/80 hover:border-stone-500'
                  }`}
                >
                  {/* Slot Number Badge */}
                  <span className="absolute top-0.5 left-1 text-[9px] text-stone-400 font-mono leading-none">
                    {idx + 1}
                  </span>

                  {/* Item Icon */}
                  {item ? (
                    <>
                      <span className="text-xl filter drop-shadow-sm select-none">{item.icon}</span>
                      {item.count > 1 && (
                        <span className="absolute bottom-0.5 right-1 text-[10px] font-bold text-white font-mono leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
                          {item.count}
                        </span>
                      )}
                    </>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Active Item Name Display */}
          {hotbar[activeSlot] && (
            <div className="text-xs text-amber-200 font-retro tracking-wide bg-black/60 px-2 py-0.5 rounded border border-amber-900/50 self-start">
              {hotbar[activeSlot]?.name} {hotbar[activeSlot]?.desc ? `· ${hotbar[activeSlot]?.desc}` : ''}
            </div>
          )}
        </div>

        {/* Center: Environment & Depth Info */}
        <div className="hidden sm:flex flex-col items-center bg-black/60 px-3 py-1.5 rounded-lg border-2 border-[#54422e] text-xs font-retro text-stone-200 backdrop-blur-xs">
          <div className="flex items-center gap-2">
            <span>{isDay ? '☀️ 白天' : '🌙 黑夜'}</span>
            <span className="text-amber-400 font-mono font-bold">{formattedTime}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-stone-400 mt-0.5">
            <Compass className="w-3 h-3 text-emerald-400" />
            <span>{depthLayer}</span>
            <span className="font-mono text-stone-300">({depthFt} ft)</span>
          </div>
        </div>

        {/* Right: Health Hearts & Quick Menu Buttons */}
        <div className="flex flex-col items-end gap-2 pointer-events-auto">
          {/* Hearts Bar */}
          <div className="bg-black/60 px-3 py-2 rounded-lg border-2 border-[#54422e] flex flex-col items-end gap-1 backdrop-blur-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-pixel text-rose-400 mr-1">HP</span>
              <span className="text-xs font-mono font-bold text-white tracking-wider">
                {player.hp} / {player.maxHp}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalHearts }).map((_, i) => {
                const isFull = i < fullHearts;
                const isPartial = i === fullHearts && remainder > 0;
                return (
                  <div
                    key={i}
                    className={`w-4 h-4 transition-transform ${
                      isFull
                        ? 'text-red-500 scale-100'
                        : isPartial
                        ? 'text-red-400 scale-95 opacity-80'
                        : 'text-stone-700 opacity-40'
                    }`}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full drop-shadow">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 1.01 4.5 2.09C13.09 4.01 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Action Utility Buttons */}
          <div className="flex items-center gap-1.5 bg-black/60 p-1.5 rounded-lg border-2 border-[#54422e] backdrop-blur-xs">
            <button
              data-modal-trigger="true"
              onClick={onToggleInventory}
              title="背包與合成 (E 鍵)"
              className="p-1.5 rounded bg-stone-800 text-amber-300 hover:bg-stone-700 active:scale-95 transition cursor-pointer"
            >
              <Package className="w-4 h-4" />
            </button>
            <button
              data-modal-trigger="true"
              onClick={onToggleMap}
              title="地圖預覽 (M 鍵)"
              className="p-1.5 rounded bg-stone-800 text-sky-400 hover:bg-stone-700 active:scale-95 transition cursor-pointer"
            >
              <MapIcon className="w-4 h-4" />
            </button>
            <button
              data-modal-trigger="true"
              onClick={onToggleGuide}
              title="新手嚮導指南 (H 鍵)"
              className="p-1.5 rounded bg-stone-800 text-emerald-400 hover:bg-stone-700 active:scale-95 transition cursor-pointer"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              onClick={onToggleLighting}
              title={showLighting ? '關閉動態光影' : '開啟動態光影'}
              className={`p-1.5 rounded transition cursor-pointer ${
                showLighting ? 'bg-amber-600/60 text-amber-200' : 'bg-stone-800 text-stone-500'
              }`}
            >
              <Sparkles className="w-4 h-4" />
            </button>
            <button
              onClick={onCycleZoom}
              title={`縮放: ${zoom}x`}
              className="p-1.5 rounded bg-stone-800 text-purple-300 hover:bg-stone-700 active:scale-95 transition cursor-pointer text-xs font-mono font-bold"
            >
              {zoom}x
            </button>
            <button
              onClick={onToggleMute}
              title={isMuted ? '開啟音效與音樂' : '靜音'}
              className="p-1.5 rounded bg-stone-800 text-stone-300 hover:bg-stone-700 active:scale-95 transition cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
            <button
              onClick={onToggleMobileControls}
              title="切換螢幕觸控虛擬按鍵"
              className={`p-1.5 rounded transition cursor-pointer text-xs font-bold ${
                showMobileControls ? 'bg-emerald-700 text-white' : 'bg-stone-800 text-stone-400'
              }`}
            >
              📱
            </button>
          </div>
        </div>
      </div>

      {/* Boss Health Bar (When Eye of Cthulhu is summoned) */}
      {bossHp && bossHp.current > 0 && (
        <div className="self-center w-full max-w-md bg-black/80 p-2 rounded-lg border-2 border-red-700 flex flex-col items-center gap-1 shadow-[0_0_20px_rgba(220,38,38,0.5)] animate-pulse">
          <div className="flex items-center justify-between w-full text-xs font-retro text-red-200">
            <span className="font-bold flex items-center gap-1 text-red-400">
              👁️ {bossHp.name}
            </span>
            <span className="font-mono">
              {bossHp.current} / {bossHp.max}
            </span>
          </div>
          <div className="w-full h-3.5 bg-stone-900 rounded border border-red-900 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 transition-all duration-150"
              style={{ width: `${Math.max(0, Math.min(100, (bossHp.current / bossHp.max) * 100))}%` }}
            />
          </div>
        </div>
      )}

      {/* Bottom Controls Helper Guide */}
      <div className="self-center bg-black/65 px-4 py-1.5 rounded-lg border border-stone-800 text-stone-400 text-[11px] flex items-center gap-3 backdrop-blur-xs">
        <span>
          <b className="text-amber-300">A/D</b> 移動
        </span>
        <span>·</span>
        <span>
          <b className="text-amber-300">W/空白鍵</b> 跳躍
        </span>
        <span>·</span>
        <span>
          <b className="text-amber-300">S</b> 穿透木平台
        </span>
        <span>·</span>
        <span>
          <b className="text-amber-300">左鍵</b> 挖掘/攻擊/放置
        </span>
        <span>·</span>
        <span>
          <b className="text-amber-300">右鍵</b> 開門/開箱
        </span>
        <span>·</span>
        <span>
          <b className="text-amber-300">1-8</b> 切換快捷欄
        </span>
        <span>·</span>
        <span>
          <b className="text-amber-300">E</b> 背包合成
        </span>
      </div>
    </div>
  );
};
