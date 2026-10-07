import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { Zap, Activity, TrendingUp } from 'lucide-react';

export interface PowerDataPoint {
  time: string;
  totalPower: number;
  swarmPower: number;
  shellPower: number;
}

interface PowerTelemetryChartProps {
  history: PowerDataPoint[];
  currentPower: number;
  swarmPower: number;
  shellPower: number;
}

export const PowerTelemetryChart: React.FC<PowerTelemetryChartProps> = ({
  history,
  currentPower,
  swarmPower,
  shellPower,
}) => {
  const latest = history[history.length - 1];
  const previous = history[history.length - 2];
  const delta = latest && previous ? (latest.totalPower - previous.totalPower).toFixed(1) : '0.0';
  const isPositiveDelta = Number(delta) >= 0;

  return (
    <div className="bg-[#050914]/90 border border-[#1e293b] p-2.5 rounded-lg text-xs space-y-2">
      {/* Header telemetry row */}
      <div className="flex items-center justify-between border-b border-[#1e293b]/60 pb-1.5">
        <div className="flex items-center gap-1.5 text-[#00f0ff] font-semibold text-[11px] font-tech">
          <Activity className="w-3.5 h-3.5 text-[#00f0ff] animate-pulse" />
          <span>戴森球發電功率實時曲線 (Power Generation)</span>
        </div>
        <div className="flex items-center gap-1 font-mono text-[10px]">
          <span className="text-[#8b949e]">趨勢:</span>
          <span className={`font-bold tabular-nums flex items-center ${isPositiveDelta ? 'text-emerald-400' : 'text-amber-400'}`}>
            <TrendingUp className={`w-3 h-3 mr-0.5 ${!isPositiveDelta && 'rotate-180'}`} />
            {isPositiveDelta ? `+${delta}` : delta} MW
          </span>
        </div>
      </div>

      {/* Sub-breakdown badges */}
      <div className="flex items-center justify-between text-[10px] font-mono text-[#8b949e] px-1">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#00f0ff]" />
          <span>總發電:</span>
          <span className="text-white font-bold tabular-nums">{currentPower.toFixed(1)} MW</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#ffe066]" />
          <span>構架:</span>
          <span className="text-[#ffe066] font-bold tabular-nums">{shellPower.toFixed(1)} MW</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#388bfd]" />
          <span>戴森雲:</span>
          <span className="text-[#58a6ff] font-bold tabular-nums">{swarmPower.toFixed(1)} MW</span>
        </div>
      </div>

      {/* Recharts Area Container */}
      <div className="h-28 w-full pt-1 min-w-[180px]">
        <ResponsiveContainer width="100%" height={105}>
          <AreaChart data={history} margin={{ top: 2, right: 4, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="powerGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#00f0ff" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="shellGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ffe066" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#ffe066" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              tick={{ fontSize: 9, fill: '#6e7681', fontFamily: 'JetBrains Mono' }}
              tickLine={false}
              axisLine={{ stroke: '#1e293b' }}
            />
            <YAxis
              domain={['auto', 'auto']}
              tick={{ fontSize: 9, fill: '#6e7681', fontFamily: 'JetBrains Mono' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${Math.round(v)}`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload as PowerDataPoint;
                  return (
                    <div className="bg-[#0a101e]/95 border border-[#00f0ff]/50 p-1.5 rounded shadow-xl text-[10px] font-mono space-y-0.5">
                      <div className="text-[#8b949e]">{d.time}</div>
                      <div className="text-[#00f0ff] font-bold">總發電: {d.totalPower.toFixed(1)} MW</div>
                      <div className="text-[#ffe066]">構架功率: {d.shellPower.toFixed(1)} MW</div>
                      <div className="text-[#58a6ff]">戴森雲帆: {d.swarmPower.toFixed(1)} MW</div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="totalPower"
              stroke="#00f0ff"
              strokeWidth={1.5}
              fill="url(#powerGradient)"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="shellPower"
              stroke="#ffe066"
              strokeWidth={1}
              strokeDasharray="2 2"
              fill="url(#shellGradient)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
