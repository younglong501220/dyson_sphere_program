import React from 'react';
import { InterstellarDispatcher } from '../../core/interstellarDispatcher';
import { CARGO_ITEMS, PlanetData, PlanetId } from '../../types/dsp';
import { X, Globe, Plane, Package, ArrowRight, Zap, RefreshCw } from 'lucide-react';

interface LogisticsDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  dispatcher: InterstellarDispatcher;
  planets: Record<PlanetId, PlanetData>;
}

export const LogisticsDispatchModal: React.FC<LogisticsDispatchModalProps> = ({
  isOpen,
  onClose,
  dispatcher,
  planets,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0a101e] border border-[#1e293b] w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e293b] bg-[#070c17]">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-[#58a6ff]" />
            <div>
              <h2 className="text-base font-semibold text-white">跨星系物流總調度指揮中心 (ILS Dispatcher)</h2>
              <p className="text-xs text-[#8b949e]">全星系星際物流運輸站狀態機與曲率巡航矩陣</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[#161f30] rounded-lg text-[#8b949e] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Planetary Storage Matrices */}
          <div>
            <h3 className="text-xs font-semibold text-[#58a6ff] uppercase tracking-wider mb-3">
              各行星 ILS 物流塔儲備與供需協議
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(Object.keys(planets) as PlanetId[]).map((pid) => {
                const planet = planets[pid];
                return (
                  <div key={pid} className="bg-[#0f172a]/70 border border-[#1e293b] rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: planet.color }} />
                        <span className="font-semibold text-sm text-white">{planet.name}</span>
                      </div>
                      <span className="text-[11px] font-mono text-[#8b949e]">{planet.type}</span>
                    </div>

                    <div className="space-y-2">
                      {Object.entries(planet.ilsStorage).map(([rawItemId, slot]) => {
                        const item = CARGO_ITEMS[Number(rawItemId)] || CARGO_ITEMS[1];
                        return (
                          <div key={rawItemId} className="flex items-center justify-between text-xs font-mono bg-[#070c17]/60 p-2 rounded-lg border border-[#1e293b]/50">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2.5 h-2.5 rounded-sm"
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="text-[#c9d1d9]">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                  slot.role === 'SUPPLY'
                                    ? 'bg-amber-500/10 text-[#f0883e] border border-amber-500/30'
                                    : 'bg-blue-500/10 text-[#58a6ff] border border-blue-500/30'
                                }`}
                              >
                                {slot.role === 'SUPPLY' ? '遠程供應' : '遠程需求'}
                              </span>
                              <span className="text-white font-bold tabular-nums">
                                {slot.remote.toLocaleString()} / {slot.max.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Vessels In Flight */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-[#58a6ff] uppercase tracking-wider">
                在途星際曲率運輸船監控 ({dispatcher.vessels.length} 艘)
              </h3>
              <span className="text-xs font-mono text-[#8b949e]">
                累計調度架次: {dispatcher.totalDispatchedTrips} | 累計運力: {dispatcher.totalCargoTransported.toLocaleString()} 件
              </span>
            </div>

            {dispatcher.vessels.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#8b949e] bg-[#070c17]/50 rounded-xl border border-dashed border-[#1e293b]">
                所有運輸船均在港待命。當供給星庫存 ≥ 1000 且需求星存量不足時，將自動激發曲率起飛。
              </div>
            ) : (
              <div className="space-y-2">
                {dispatcher.vessels.map((ship) => {
                  const cargo = CARGO_ITEMS[ship.itemId] || CARGO_ITEMS[1];
                  const progressPct = Math.round(ship.progress * 100);

                  return (
                    <div
                      key={ship.id}
                      className="bg-[#0f172a]/70 border border-[#1e293b] p-3 rounded-xl flex items-center justify-between gap-4 text-xs font-mono"
                    >
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <Plane className="w-4 h-4 text-[#00f0ff] animate-pulse" />
                        <span className="font-bold text-white">{ship.id}</span>
                      </div>

                      <div className="flex items-center gap-2 flex-1 max-w-sm">
                        <span className="text-[#8b949e]">{planets[ship.sourcePlanet]?.name || ship.sourcePlanet}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-[#58a6ff]" />
                        <span className="text-white">{planets[ship.targetPlanet]?.name || ship.targetPlanet}</span>
                      </div>

                      <div className="flex items-center gap-2 min-w-[150px]">
                        <Package className="w-3.5 h-3.5 text-[#ffa657]" />
                        <span>{cargo.name}</span>
                        <span className="text-[#ffa657] font-bold">x{ship.amount}</span>
                      </div>

                      <div className="flex items-center gap-2 w-32">
                        <div className="w-full bg-[#161f30] h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-[#00f0ff] h-full transition-all"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-[#8b949e] w-8 text-right tabular-nums">
                          {progressPct}%
                        </span>
                      </div>

                      <span className="text-xs text-[#00f0ff] font-semibold min-w-[70px] text-right">
                        {ship.state === 'OUTBOUND' ? '曲率巡航' : '返航中'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Dispatch Event Logs */}
          <div>
            <h3 className="text-xs font-semibold text-[#58a6ff] uppercase tracking-wider mb-2">
              星系調度即時通訊日誌 (Dispatch Telemetry Log)
            </h3>
            <div className="bg-[#070c17] border border-[#1e293b] p-3 rounded-xl font-mono text-[11px] h-36 overflow-y-auto space-y-1">
              {dispatcher.dispatchLogs.length === 0 ? (
                <div className="text-[#8b949e]">正在監聽跨星調度廣播...</div>
              ) : (
                dispatcher.dispatchLogs.map((log) => (
                  <div key={log.id} className="flex items-center gap-3 text-[#8b949e]">
                    <span className="text-[#58a6ff]/70">{log.timestamp}</span>
                    <span
                      className={`font-semibold ${
                        log.type === 'DISPATCH'
                          ? 'text-[#00f0ff]'
                          : log.type === 'ARRIVAL'
                          ? 'text-emerald-400'
                          : 'text-[#bc8cff]'
                      }`}
                    >
                      [{log.type}]
                    </span>
                    <span className="text-[#c9d1d9]">
                      {log.shipId}: {log.source} ➔ {log.target} ({log.cargo} x{log.amount})
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
