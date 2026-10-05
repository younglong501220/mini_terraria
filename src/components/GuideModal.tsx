import React, { useState } from 'react';
import { BookOpen, Compass, Flame, Shield, Skull, X } from 'lucide-react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'basics' | 'mining' | 'crafting' | 'boss'>('basics');

  if (!isOpen) return null;

  return (
    <div
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150 cursor-pointer pointer-events-auto"
    >
      <div
        data-modal-content="true"
        onClick={e => e.stopPropagation()}
        className="bg-[#241c15] border-3 border-[#6b533b] rounded-xl shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden text-stone-100 font-sans cursor-default pointer-events-auto"
      >
        {/* Header */}
        <div className="bg-[#362a1e] px-4 py-3 border-b-2 border-[#54422e] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧔</span>
            <div>
              <h2 className="text-sm font-bold font-pixel text-amber-300">嚮導的生存手冊 (Guide's Advice)</h2>
              <p className="text-[11px] text-stone-400">「我是你的嚮導，我會告訴你如何在泰拉瑞亞世界生存！」</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-stone-400 hover:text-white hover:bg-stone-800 transition cursor-pointer"
            aria-label="關閉指南"
          >
            <X className="w-5 h-5 pointer-events-none" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-stone-800 bg-[#1a140f] px-2 pt-2 gap-1 text-xs">
          <button
            onClick={() => setActiveTab('basics')}
            className={`px-3 py-2 rounded-t font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'basics'
                ? 'bg-[#241c15] text-amber-300 border-t-2 border-amber-500'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" /> 第一天生存指南
          </button>
          <button
            onClick={() => setActiveTab('mining')}
            className={`px-3 py-2 rounded-t font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'mining'
                ? 'bg-[#241c15] text-amber-300 border-t-2 border-amber-500'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" /> 地底探勘與火把
          </button>
          <button
            onClick={() => setActiveTab('crafting')}
            className={`px-3 py-2 rounded-t font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'crafting'
                ? 'bg-[#241c15] text-amber-300 border-t-2 border-amber-500'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5" /> 熔爐與金屬鍛造
          </button>
          <button
            onClick={() => setActiveTab('boss')}
            className={`px-3 py-2 rounded-t font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'boss'
                ? 'bg-[#241c15] text-red-400 border-t-2 border-red-500'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Skull className="w-3.5 h-3.5 text-red-400" /> 首領挑戰指南
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 text-xs text-stone-300 space-y-3 leading-relaxed">
          {activeTab === 'basics' && (
            <>
              <div className="p-3 bg-stone-900/60 rounded border border-stone-800">
                <h4 className="font-bold text-amber-400 mb-1 flex items-center gap-1 text-sm font-retro">
                  🪵 步驟一：砍伐樹木與建立工作檯
                </h4>
                <p>
                  使用你的<b>木斧</b>砍倒地表的樹木獲取木材。按 <b>E 鍵</b>開啟背包，收集 10
                  個木材即可徒手製作一個<b>工作檯 (Work Bench)</b>。將工作檯放置在地面上，靠近它可解鎖大量高級合成配方！
                </p>
              </div>

              <div className="p-3 bg-stone-900/60 rounded border border-stone-800">
                <h4 className="font-bold text-amber-400 mb-1 flex items-center gap-1 text-sm font-retro">
                  🏡 步驟二：建造夜晚庇護所
                </h4>
                <p>
                  夜幕降臨時，<b>殭屍</b>與<b>惡魔之眼</b>會群起遊蕩。用泥土或木材為自己蓋一間小屋，並裝上<b>木門</b>
                  與<b>火把</b>。木門可以用右鍵開啟與關閉，能阻絕兇猛的怪物！
                </p>
              </div>

              <div className="p-3 bg-stone-900/60 rounded border border-stone-800">
                <h4 className="font-bold text-amber-400 mb-1 flex items-center gap-1 text-sm font-retro">
                  🟢 步驟三：獵殺史萊姆製作火把
                </h4>
                <p>
                  擊殺跳躍的綠史萊姆與藍史萊姆會掉落<b>凝膠 (Gel)</b>，在背包中用 1 個木材與 1 個凝膠即可製作 3 支<b>火把</b>！
                </p>
              </div>
            </>
          )}

          {activeTab === 'mining' && (
            <>
              <div className="p-3 bg-stone-900/60 rounded border border-stone-800">
                <h4 className="font-bold text-amber-400 mb-1 flex items-center gap-1 text-sm font-retro">
                  ⛏️ 地下層與礦脈分佈
                </h4>
                <p>向下挖掘會進入地下與天然洞穴：</p>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>
                    <b className="text-amber-500">銅礦 (Copper)</b>：常見於地表附近與淺層。
                  </li>
                  <li>
                    <b className="text-stone-300">鐵礦 (Iron)</b>：地下層與深岩層，用於鍛造堅固武器與鎬子。
                  </li>
                  <li>
                    <b className="text-yellow-400">金礦 (Gold)</b>：深層洞穴稀有金屬，能打造頂級防具。
                  </li>
                  <li>
                    <b className="text-purple-400">紫水晶 (Amethyst)</b>：深層岩洞中會發出神秘紫光的寶石。
                  </li>
                </ul>
              </div>

              <div className="p-3 bg-stone-900/60 rounded border border-stone-800">
                <h4 className="font-bold text-amber-400 mb-1 flex items-center gap-1 text-sm font-retro">
                  🔦 火把照明的重要性
                </h4>
                <p>
                  本遊戲擁有<b>動態光影模擬</b>，地底洞穴若無光源將是一片漆黑！將火把放在快捷欄，點擊洞穴背景牆或地面即可插上火把，大幅照亮周遭視野。
                </p>
              </div>

              <div className="p-3 bg-stone-900/60 rounded border border-stone-800">
                <h4 className="font-bold text-amber-400 mb-1 flex items-center gap-1 text-sm font-retro">
                  📦 探索地底神秘寶箱
                </h4>
                <p>
                  地下洞穴有隨機分佈的<b>金黃寶箱</b>！對著寶箱按<b>滑鼠右鍵</b>即可打開，裡面藏有藥水、鐵錠、金礦與箭矢等寶物！
                </p>
              </div>
            </>
          )}

          {activeTab === 'crafting' && (
            <>
              <div className="p-3 bg-stone-900/60 rounded border border-stone-800">
                <h4 className="font-bold text-orange-400 mb-1 flex items-center gap-1 text-sm font-retro">
                  🌋 打造熔爐 (Furnace)
                </h4>
                <p>
                  在工作檯旁，使用 <b>20 石塊 + 4 木材 + 3 火把</b> 可以合成<b>熔爐</b>。
                  放置熔爐後，站在熔爐旁就能將挖掘到的<b>銅礦、鐵礦、金礦</b>熔煉為高純度的<b>金屬錠</b>！
                </p>
              </div>

              <div className="p-3 bg-stone-900/60 rounded border border-stone-800">
                <h4 className="font-bold text-sky-400 mb-1 flex items-center gap-1 text-sm font-retro">
                  ⚔️ 升級鐵質裝備
                </h4>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>
                    <b>鐵闊劍 (Iron Broadsword)</b>：8 塊鐵錠，具有 18 點高額傷害與巨大揮擊擊退範圍。
                  </li>
                  <li>
                    <b>鐵鎬 (Iron Pickaxe)</b>：10 塊鐵錠 + 3 木材，挖掘速度倍增，能輕鬆開採堅硬金礦。
                  </li>
                  <li>
                    <b>木弓與箭矢 (Bow & Arrows)</b>：遠距離蓄力射擊，木箭可用木材與石塊大量製作。
                  </li>
                </ul>
              </div>
            </>
          )}

          {activeTab === 'boss' && (
            <>
              <div className="p-3 bg-red-950/40 rounded border border-red-900/60">
                <h4 className="font-bold text-red-400 mb-1 flex items-center gap-1 text-sm font-retro">
                  🧿 召喚：克蘇魯之眼 (Eye of Cthulhu)
                </h4>
                <p>
                  在黑夜獵殺惡魔之眼收集 <b>4 個晶狀體 + 5 個凝膠</b>，可在工作檯合成<b>「可疑的眼球」</b>。
                  在夜晚將其置於快捷欄點擊使用，夜空中便會降下恐怖的巨型眼球首領！
                </p>
              </div>

              <div className="p-3 bg-stone-900/60 rounded border border-stone-800">
                <h4 className="font-bold text-amber-400 mb-1 flex items-center gap-1 text-sm font-retro">
                  🎯 戰鬥策略
                </h4>
                <p>
                  1. <b>第一階段</b>：眼球會在空中徘徊，並不時召喚小型克蘇魯之僕。使用<b>木弓與木箭</b>
                  保持距離風箏，或用寬劍揮擊打落僕從。
                  <br />
                  2. <b>第二階段 (生命值低於 50%)</b>：眼球會發出震天咆哮，撕裂外層露出<b>尖銳獠牙巨口</b>
                  ！狂暴化的克蘇魯之眼速度劇增，會展開連續極速衝撞！善用跳躍避開直線突進並及時飲用<b>治療藥水</b>。
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#1a140f] px-4 py-2.5 border-t border-stone-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded text-xs transition cursor-pointer"
          >
            關閉手冊 (按 H 鍵可隨時開啟)
          </button>
        </div>
      </div>
    </div>
  );
};
