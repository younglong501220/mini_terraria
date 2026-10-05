import React, { useEffect, useRef } from 'react';
import { Map, X } from 'lucide-react';
import { Player, TILES, WorldData } from '../types/game';
import { TILE_PROPERTIES } from '../utils/items';
import { TILE_SIZE } from '../utils/physics';

interface MiniMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  world: WorldData;
  player: { x: number; y: number };
}

export const MiniMapModal: React.FC<MiniMapModalProps> = ({ isOpen, onClose, world, player }) => {
  const mapCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const canvas = mapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw full world mini-map
    canvas.width = world.width;
    canvas.height = world.height;

    // Clear
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, world.width, world.height);

    // Draw tiles
    for (let x = 0; x < world.width; x++) {
      for (let y = 0; y < world.height; y++) {
        const tile = world.tiles[x][y];
        if (tile !== TILES.AIR) {
          const props = TILE_PROPERTIES[tile];
          ctx.fillStyle = props.accentColor || props.color;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }

    // Highlight Chests
    world.chests.forEach(chest => {
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(chest.x, chest.y, 2, 2);
    });

    // Player position blinking dot
    const pTileX = Math.floor(player.x / TILE_SIZE);
    const pTileY = Math.floor(player.y / TILE_SIZE);

    ctx.fillStyle = '#ef4444';
    ctx.fillRect(pTileX - 1, pTileY - 1, 3, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(pTileX, pTileY, 1, 1);
  }, [isOpen, player.x, player.y, world]);

  if (!isOpen) return null;

  const pTileX = Math.floor(player.x / TILE_SIZE);
  const pTileY = Math.floor(player.y / TILE_SIZE);

  return (
    <div
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150 cursor-pointer pointer-events-auto"
    >
      <div
        data-modal-content="true"
        onClick={e => e.stopPropagation()}
        className="bg-[#241c15] border-3 border-[#6b533b] rounded-xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden text-stone-100 cursor-default pointer-events-auto"
      >
        {/* Header */}
        <div className="bg-[#362a1e] px-4 py-3 border-b-2 border-[#54422e] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Map className="w-5 h-5 text-sky-400" />
            <h2 className="text-sm font-bold font-pixel text-amber-200">世界全景地圖 (World Map)</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-stone-400 hover:text-white hover:bg-stone-800 transition cursor-pointer"
            aria-label="關閉地圖"
          >
            <X className="w-5 h-5 pointer-events-none" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col items-center gap-3">
          <div className="relative border-2 border-stone-700 bg-stone-950 p-1 rounded overflow-hidden shadow-inner">
            <canvas
              ref={mapCanvasRef}
              style={{
                width: `${world.width * 2.5}px`,
                height: `${world.height * 2.5}px`,
                imageRendering: 'pixelated',
              }}
              className="block"
            />
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-stone-300 font-retro">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-red-500 rounded-xs inline-block"></span>
              <span>玩家位置 ({pTileX}, {pTileY})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-amber-500 rounded-xs inline-block"></span>
              <span>地下寶箱</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-emerald-600 rounded-xs inline-block"></span>
              <span>地表草地</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-yellow-400 rounded-xs inline-block"></span>
              <span>金礦脈</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-purple-500 rounded-xs inline-block"></span>
              <span>紫水晶洞窟</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#1a140f] px-4 py-2 border-t border-stone-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded text-xs transition cursor-pointer"
          >
            關閉地圖 (M 鍵)
          </button>
        </div>
      </div>
    </div>
  );
};
