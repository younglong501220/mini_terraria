import React from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Heart, Shield, Sword } from 'lucide-react';

interface TouchControlsProps {
  isVisible: boolean;
  onSimulateKey: (code: string, pressed: boolean) => void;
  onQuickHeal: () => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  isVisible,
  onSimulateKey,
  onQuickHeal,
}) => {
  if (!isVisible) return null;

  return (
    <div className="absolute inset-x-0 bottom-14 pointer-events-none px-6 flex justify-between select-none z-40">
      {/* Left: Direction D-Pad */}
      <div className="flex items-center gap-2 pointer-events-auto">
        <button
          onTouchStart={() => onSimulateKey('KeyA', true)}
          onTouchEnd={() => onSimulateKey('KeyA', false)}
          onMouseDown={() => onSimulateKey('KeyA', true)}
          onMouseUp={() => onSimulateKey('KeyA', false)}
          className="w-14 h-14 bg-black/60 active:bg-amber-600/80 rounded-full border-2 border-stone-600 flex items-center justify-center text-white backdrop-blur-xs transition active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        <div className="flex flex-col gap-2">
          <button
            onTouchStart={() => onSimulateKey('KeyW', true)}
            onTouchEnd={() => onSimulateKey('KeyW', false)}
            onMouseDown={() => onSimulateKey('KeyW', true)}
            onMouseUp={() => onSimulateKey('KeyW', false)}
            className="w-14 h-14 bg-black/60 active:bg-amber-600/80 rounded-full border-2 border-stone-600 flex items-center justify-center text-white backdrop-blur-xs transition active:scale-95 cursor-pointer"
          >
            <ArrowUp className="w-6 h-6" />
          </button>
          <button
            onTouchStart={() => onSimulateKey('KeyS', true)}
            onTouchEnd={() => onSimulateKey('KeyS', false)}
            onMouseDown={() => onSimulateKey('KeyS', true)}
            onMouseUp={() => onSimulateKey('KeyS', false)}
            className="w-14 h-14 bg-black/60 active:bg-amber-600/80 rounded-full border-2 border-stone-600 flex items-center justify-center text-white backdrop-blur-xs transition active:scale-95 cursor-pointer"
          >
            <ArrowDown className="w-6 h-6" />
          </button>
        </div>

        <button
          onTouchStart={() => onSimulateKey('KeyD', true)}
          onTouchEnd={() => onSimulateKey('KeyD', false)}
          onMouseDown={() => onSimulateKey('KeyD', true)}
          onMouseUp={() => onSimulateKey('KeyD', false)}
          className="w-14 h-14 bg-black/60 active:bg-amber-600/80 rounded-full border-2 border-stone-600 flex items-center justify-center text-white backdrop-blur-xs transition active:scale-95 cursor-pointer"
        >
          <ArrowRight className="w-6 h-6" />
        </button>
      </div>

      {/* Right: Action Buttons */}
      <div className="flex items-center gap-3 pointer-events-auto">
        {/* Quick Heal */}
        <button
          onClick={onQuickHeal}
          className="w-13 h-13 bg-red-950/80 active:bg-red-700 rounded-full border-2 border-red-700 flex items-center justify-center text-red-200 backdrop-blur-xs transition active:scale-95 cursor-pointer"
        >
          <Heart className="w-6 h-6" />
        </button>

        {/* Jump Button */}
        <button
          onTouchStart={() => onSimulateKey('Space', true)}
          onTouchEnd={() => onSimulateKey('Space', false)}
          onMouseDown={() => onSimulateKey('Space', true)}
          onMouseUp={() => onSimulateKey('Space', false)}
          className="w-15 h-15 bg-amber-600/80 active:bg-amber-500 rounded-full border-2 border-amber-400 flex items-center justify-center text-stone-950 font-bold backdrop-blur-xs transition active:scale-95 cursor-pointer text-xs"
        >
          跳躍
        </button>
      </div>
    </div>
  );
};
