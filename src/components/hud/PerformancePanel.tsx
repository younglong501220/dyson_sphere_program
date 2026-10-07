import React, { useState } from 'react';
import { DODBeltNetwork } from '../../core/dodBeltNetwork';
import { InterstellarDispatcher } from '../../core/interstellarDispatcher';
import { DysonEngine } from '../../core/dysonEngine';
import { ViewMode } from '../../types/dsp';
import { PowerTelemetryChart, PowerDataPoint } from './PowerTelemetryChart';
import { Cpu, Database, Gauge, Zap, Plus, RotateCcw, Flame, ChevronDown, ChevronUp } from 'lucide-react';

interface PerformancePanelProps {
  fps: number;
  beltNetwork: DODBeltNetwork;
  dispatcher: InterstellarDispatcher;
  dysonEngine: DysonEngine;
  viewMode: ViewMode;
  powerHistory: PowerDataPoint[];
  onAddBelts: (count: number) => void;
  onClearBelts: () => void;
  onStressTest: () => void;
}

export const PerformancePanel: React.FC<PerformancePanelProps> = ({
  fps,
  beltNetwork,
  dispatcher,
  dysonEngine,
  viewMode,
  powerHistory,
  onAddBelts,
  onClearBelts,
  onStressTest,
}) => {
  const [showPowerChart, setShowPowerChart] = useState(true);
  const memStats = beltNetwork.getMemoryStats();

  return (
    <div className="absolute top-4 left-4 w-84 bg-[#0a101e]/90 backdrop-blur-md border border-[#00f0ff]/40 p-3.5 rounded-xl shadow-2xl text-xs space-y-3 pointer-events-auto max-h-[92vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
        <div className="flex items-center gap-2 text-[#00f0ff] font-semibold text-sm">
          <Cpu className="w-4 h-4 text-[#00f0ff]" />
          <span>DSP 核心運算引擎監控</span>
        </div>
        <span
          className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
            fps >= 55 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
          }`}
        >
          {fps} FPS
        </span>
      </div>

      {/* Metrics List */}
      <div className="space-y-1.5 font-mono text-[11px]">
        <div className="flex justify-between items-center text-[#8b949e]">
          <span className="flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-[#58a6ff]" /> 傳送帶運算耗時:
          </span>
          <span className="text-[#58a6ff] font-bold tabular-nums">
            {(beltNetwork.lastTickMicros / 1000).toFixed(3)} ms ({Math.round(beltNetwork.lastTickMicros)} µs)
          </span>
        </div>

        <div className="flex justify-between items-center text-[#8b949e]">
          <span className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-[#7ee787]" /> 在軌貨物總數 (DOD):
          </span>
          <span className="text-[#7ee787] font-bold tabular-nums">
            {beltNetwork.totalCargoCount.toLocaleString()} 顆
          </span>
        </div>

        <div className="flex justify-between items-center text-[#8b949e]">
          <span>連續傳送帶數量:</span>
          <span className="text-[#c9d1d9] font-bold tabular-nums">
            {beltNetwork.activeBelts} / {beltNetwork.maxBelts} 條
          </span>
        </div>

        <div className="flex justify-between items-center text-[#8b949e]">
          <span>每秒貨物吞吐量:</span>
          <span className="text-[#ffa657] font-bold tabular-nums">
            {beltNetwork.itemsMovedPerSec.toLocaleString()} /s
          </span>
        </div>

        <div className="flex justify-between items-center text-[#8b949e]">
          <span>星際曲率飛船調度:</span>
          <span className="text-[#bc8cff] font-bold tabular-nums">
            {dispatcher.vessels.length} 艘在途
          </span>
        </div>

        <div className="flex justify-between items-center text-[#8b949e]">
          <span className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-[#ffe066]" /> 戴森球總發電量:
          </span>
          <span className="text-[#ffe066] font-bold tabular-nums">
            {dysonEngine.totalPowerMW > 1000
              ? `${(dysonEngine.totalPowerMW / 1000).toFixed(2)} GW`
              : `${dysonEngine.totalPowerMW.toFixed(1)} MW`}
          </span>
        </div>
      </div>

      {/* Recharts Power Telemetry Section */}
      <div className="border-t border-[#1e293b]/70 pt-2">
        <button
          onClick={() => setShowPowerChart(!showPowerChart)}
          className="w-full flex items-center justify-between text-[11px] font-mono text-[#58a6ff] hover:text-[#00f0ff] mb-1.5 transition-colors"
        >
          <span className="flex items-center gap-1 font-semibold">
            <Zap className="w-3 h-3 text-[#ffe066]" />
            即時發電功率圖表 (Recharts)
          </span>
          {showPowerChart ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showPowerChart && (
          <PowerTelemetryChart
            history={powerHistory}
            currentPower={dysonEngine.totalPowerMW}
            swarmPower={dysonEngine.swarmPowerMW}
            shellPower={dysonEngine.shellPowerMW}
          />
        )}
      </div>

      {/* DOD Memory Footprint comparison */}
      <div className="bg-[#050914]/80 border border-[#1e293b] p-2 rounded-lg text-[10px] font-mono space-y-1">
        <div className="text-[#58a6ff] font-bold">面向數據記憶體連續排布 (Zero-GC)</div>
        <div className="flex justify-between text-[#8b949e]">
          <span>Uint8Array 實體緩衝:</span>
          <span className="text-white">{(memStats.allocatedBytes / 1024).toFixed(1)} KB</span>
        </div>
        <div className="flex justify-between text-[#8b949e]">
          <span>傳統物件 OOP 預估負載:</span>
          <span className="text-rose-400">{(memStats.theoreticalOOPBytes / 1024).toFixed(1)} KB</span>
        </div>
        <div className="text-emerald-400 font-semibold">
          ⚡ 記憶體開銷降幅 ~{memStats.memoryReductionRatio}x (0 次 GC 停頓)
        </div>
      </div>

      {/* Control Buttons */}
      <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-[#1e293b]">
        <button
          onClick={() => onAddBelts(100)}
          className="flex items-center justify-center gap-1 py-1.5 px-2 bg-[#1f6feb] hover:bg-[#388bfd] text-white rounded text-[11px] font-medium transition-colors"
        >
          <Plus className="w-3 h-3" />
          <span>增加 100 條帶</span>
        </button>

        <button
          onClick={onStressTest}
          className="flex items-center justify-center gap-1 py-1.5 px-2 bg-[#d29922] hover:bg-[#e3b341] text-black font-semibold rounded text-[11px] transition-colors"
        >
          <Flame className="w-3 h-3" />
          <span>萬級壓力測試</span>
        </button>

        <button
          onClick={onClearBelts}
          className="col-span-2 flex items-center justify-center gap-1 py-1 bg-[#161f30] hover:bg-[#212c42] text-[#8b949e] hover:text-white rounded text-[10px] transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>重設所有傳送帶</span>
        </button>
      </div>
    </div>
  );
};

