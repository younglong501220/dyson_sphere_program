import React, { useState } from 'react';
import { X, BookOpen, Layers, Cpu, Orbit, ArrowRight } from 'lucide-react';

interface ArchitectureExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureExplanationModal: React.FC<ArchitectureExplanationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'GRID' | 'DOD' | 'ILS'>('GRID');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0a101e] border border-[#1e293b] w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e293b] bg-[#070c17]">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-[#00f0ff]" />
            <div>
              <h2 className="text-base font-semibold text-white">《戴森球計劃》底層架構解析文檔</h2>
              <p className="text-xs text-[#8b949e]">3 大計算機科學演算法復刻原理</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[#161f30] rounded-lg text-[#8b949e] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-[#1e293b] bg-[#0c1324] px-6">
          <button
            onClick={() => setActiveTab('GRID')}
            className={`py-3 px-4 text-xs font-medium border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'GRID'
                ? 'border-[#00f0ff] text-[#00f0ff]'
                : 'border-transparent text-[#8b949e] hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>1. 球面網格化 (Banded Grid &amp; Faults)</span>
          </button>
          <button
            onClick={() => setActiveTab('DOD')}
            className={`py-3 px-4 text-xs font-medium border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'DOD'
                ? 'border-[#00f0ff] text-[#00f0ff]'
                : 'border-transparent text-[#8b949e] hover:text-white'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>2. DOD 連續記憶體傳送帶 (Zero-GC)</span>
          </button>
          <button
            onClick={() => setActiveTab('ILS')}
            className={`py-3 px-4 text-xs font-medium border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'ILS'
                ? 'border-[#00f0ff] text-[#00f0ff]'
                : 'border-transparent text-[#8b949e] hover:text-white'
            }`}
          >
            <Orbit className="w-4 h-4" />
            <span>3. 跨星系物流總調度器 (ILS Engine)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-[#c9d1d9] leading-relaxed">
          {activeTab === 'GRID' && (
            <div className="space-y-4">
              <div className="bg-[#0f172a] p-4 rounded-xl border border-[#1e293b]">
                <h3 className="text-sm font-semibold text-white mb-2">難題：球面極地網格無限收縮</h3>
                <p className="text-[#8b949e]">
                  若把星球直接劃分為傳統經緯網格（UV Sphere），經線在南北兩極會聚焦於一點，導致極地附近的格子寬度縮減至 0，工廠建築會產生嚴重的幾何畸變與破面。
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-[#00f0ff] uppercase tracking-wider">
                  DSP 核心解法：緯度環階梯縮減 (Latitude Bands &amp; Fault Lines)
                </h4>
                <p>
                  星球被切分成數十條同心緯度環（Bands）。每一個環的經度細分槽數（Segments）隨緯度 $\phi$ 動態遞減，公式嚴格正比於該緯度截面半徑：
                </p>
                <div className="bg-[#070c17] p-3 rounded-lg border border-[#1e293b] font-mono text-center text-[#58a6ff]">
                  Segments(φ) = max(4, ⌊ (N_base × cos(φ)) / 4 ⌋ × 4)
                </div>
                <p>
                  保持為 4 的倍數以維持四向對稱。當緯度跨過臨界點時，格子數成階梯跳躍遞減。這個跳躍的交界處即為 DSP 玩家熟知的<strong>斷層線（Fault Lines）</strong>。跨越斷層線時建築與傳送帶會產生輕微折線，但確保了球面上 98% 的地塊均維持接近正方形，極地建築完全不變形！
                </p>
              </div>
            </div>
          )}

          {activeTab === 'DOD' && (
            <div className="space-y-4">
              <div className="bg-[#0f172a] p-4 rounded-xl border border-[#1e293b]">
                <h3 className="text-sm font-semibold text-white mb-2">難題：數十萬件貨物的 GC 垃圾回收風暴</h3>
                <p className="text-[#8b949e]">
                  在自動化流水線遊戲中，若每顆鐵礦或電路板都是一個獨立物件（`new Item()`），在擁有 10 萬件貨物的大型工廠中，記憶體指針遍佈記憶體，垃圾回收器（Garbage Collector）會每隔數秒引發卡頓（GC Lag Spike）。
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-[#00f0ff] uppercase tracking-wider">
                  DSP 核心解法：面向數據設計 (Data-Oriented Design)
                </h4>
                <p>
                  完全捨棄物件繼承結構，改用平鋪的連續記憶體緩衝區（連續平鋪 `Uint8Array`）：
                </p>
                <div className="bg-[#070c17] p-3 rounded-lg border border-[#1e293b] font-mono text-xs text-[#7ee787]">
                  const beltItemBuffer = new Uint8Array(maxBelts * slotsPerBelt);
                </div>
                <p>
                  傳送帶每禎更新時，直接對該記憶體進行反向槽位掃描。當前格為 0 且前一格不為 0 時直接賦值：
                </p>
                <div className="bg-[#070c17] p-3 rounded-lg border border-[#1e293b] font-mono text-xs text-[#ffa657]">
                  if (buffer[i] === 0 &amp;&amp; buffer[i - 1] !== 0) &#123;<br />
                  &nbsp;&nbsp;buffer[i] = buffer[i - 1];<br />
                  &nbsp;&nbsp;buffer[i - 1] = 0;<br />
                  &#125;
                </div>
                <p className="text-emerald-400">
                  ✦ 整套迴圈在物理運算時產生 0 次新物件創建，快取命中率高達 99%，運算百萬顆貨物僅需毫秒級 CPU 耗時！
                </p>
              </div>
            </div>
          )}

          {activeTab === 'ILS' && (
            <div className="space-y-4">
              <div className="bg-[#0f172a] p-4 rounded-xl border border-[#1e293b]">
                <h3 className="text-sm font-semibold text-white mb-2">難題：多行星非同步供需匹配與跨星巡航</h3>
                <p className="text-[#8b949e]">
                  星系內擁有數十顆天體，每顆星球有採礦、初級冶煉、最終總裝等不同分工。星際物流塔（ILS）需要實時解決非同步跨星調度。
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-[#00f0ff] uppercase tracking-wider">
                  DSP 核心解法：狀態機集中撮合器 (ILS Dispatcher)
                </h4>
                <p>
                  物流塔只宣告資料層狀態：每個槽位配置 `Remote Supply`（遠程供應）或 `Remote Demand`（遠程需求）。中央調度器進行快速撮合：
                </p>
                <ul className="list-disc list-inside space-y-1 text-[#8b949e]">
                  <li>撮合成功後，供應塔扣除貨物，派遣 Logistics Vessel 裝載 Space Warper（曲率翹曲器）。</li>
                  <li>飛船經歷「起飛加速 ➔ 激活曲率航行（藍色粒子激波）➔ 減速入港」三維弧線插值。</li>
                  <li>到達目標星球後原子化寫入目標庫存，零個別物品物理搬運開銷，完成星際閉環。</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
