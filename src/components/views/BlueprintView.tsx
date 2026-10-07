import React, { useRef, useEffect, useState } from 'react';
import { SphericalGridSystem } from '../../core/gridSystem';
import { DODBeltNetwork } from '../../core/dodBeltNetwork';
import { CARGO_ITEMS, PlacedBuilding, PlanetData } from '../../types/dsp';
import { ZoomIn, ZoomOut, Info } from 'lucide-react';

interface BlueprintViewProps {
  planet: PlanetData;
  gridSystem: SphericalGridSystem;
  beltNetwork: DODBeltNetwork;
  placedBuildings: PlacedBuilding[];
}

export const BlueprintView: React.FC<BlueprintViewProps> = ({
  planet,
  gridSystem,
  beltNetwork,
  placedBuildings,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const [zoom, setZoom] = useState(1.0);
  const [hoveredCell, setHoveredCell] = useState<{ band: number; seg: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const w = (canvas.width = canvas.parentElement?.clientWidth || 800);
      const h = (canvas.height = canvas.parentElement?.clientHeight || 600);

      ctx.fillStyle = '#050a14';
      ctx.fillRect(0, 0, w, h);

      const bands = gridSystem.bands;
      const bandHeight = 16 * zoom;
      const totalHeight = bands.length * bandHeight;
      const startY = (h - totalHeight) / 2 + scrollY;

      // Draw each latitude band horizontally
      for (let b = 0; b < bands.length; b++) {
        const band = bands[b];
        const y = startY + b * bandHeight;
        if (y + bandHeight < 0 || y > h) continue;

        const isEquator = band.latIndex === 0;
        const isFault = band.isFaultLineAbove;

        // Band background
        ctx.fillStyle = isEquator ? 'rgba(56, 139, 253, 0.15)' : (b % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.2)');
        ctx.fillRect(80, y, w - 160, bandHeight);

        // Latitude label on left margin
        const latDeg = Math.round((band.latAngle * 180) / Math.PI);
        ctx.fillStyle = isEquator ? '#58a6ff' : isFault ? '#f0883e' : '#8b949e';
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`${latDeg > 0 ? '+' : ''}${latDeg}° (${band.segments})`, 72, y + bandHeight * 0.75);

        // Segment grid lines
        const segWidth = (w - 160) / band.segments;
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.1)';
        ctx.lineWidth = 0.5;

        for (let s = 0; s <= band.segments; s++) {
          const x = 80 + s * segWidth;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + bandHeight);
          ctx.stroke();
        }

        // Fault line border
        if (isFault) {
          ctx.strokeStyle = 'rgba(240, 136, 62, 0.8)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(80, y + bandHeight);
          ctx.lineTo(w - 80, y + bandHeight);
          ctx.stroke();
        }
      }

      // Draw placed buildings on blueprint
      for (const bld of placedBuildings) {
        const band = bands[bld.bandIndex];
        if (!band) continue;
        const y = startY + bld.bandIndex * bandHeight;
        const segWidth = (w - 160) / band.segments;
        const x = 80 + bld.segmentIndex * segWidth;

        ctx.fillStyle = '#00f0ff';
        ctx.fillRect(x + 1, y + 1, segWidth - 2, bandHeight - 2);
      }

      // Draw conveyor belt cargo dots
      const activeBelts = beltNetwork.activeBelts;
      const slots = beltNetwork.slotsPerBelt;
      for (let b = 0; b < Math.min(activeBelts, 150); b++) {
        const conn = beltNetwork.beltConnections[b];
        if (!conn) continue;
        const offset = b * slots;

        for (let s = 0; s < slots; s += 3) {
          const item = beltNetwork.beltItemBuffer[offset + s];
          if (item === 0) continue;

          const t = s / slots;
          const currentBand = Math.round(conn.fromBand + (conn.toBand - conn.fromBand) * t);
          const currentSeg = Math.round(conn.fromSeg + (conn.toSeg - conn.fromSeg) * t);
          const band = bands[currentBand];
          if (!band) continue;

          const y = startY + currentBand * bandHeight;
          const segWidth = (w - 160) / band.segments;
          const x = 80 + currentSeg * segWidth;

          const cargoDef = CARGO_ITEMS[item];
          ctx.fillStyle = cargoDef ? cargoDef.color : '#fff';
          ctx.fillRect(x + segWidth * 0.3, y + bandHeight * 0.3, segWidth * 0.4, bandHeight * 0.4);
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [gridSystem, beltNetwork, placedBuildings, zoom, scrollY]);

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        onWheel={(e) => {
          e.preventDefault();
          setScrollY((prev) => prev - e.deltaY * 0.5);
        }}
        className="w-full h-full block cursor-default"
      />

      {/* Blueprint Legend Header */}
      <div className="absolute top-4 left-4 bg-[#0a101e]/90 backdrop-blur-md border border-[#1e293b] p-3 rounded-lg shadow-xl text-xs space-y-1">
        <div className="text-sm font-semibold text-[#00f0ff] flex items-center gap-2">
          <span>緯度帶平面展開投影圖</span>
          <span className="text-[11px] font-mono text-[#8b949e]">({planet.name})</span>
        </div>
        <p className="text-[11px] text-[#8b949e] max-w-sm">
          展示 DSP 經典「階梯縮減」演算法：越靠近極地，環上格子數量呈階梯跳躍遞減。
          橘色橫線即為<strong>斷層線（Fault Line）</strong>，跨越時經度網格會產生微小錯位。
        </p>
      </div>

      {/* Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-1 bg-[#0a101e]/85 border border-[#1e293b] p-1.5 rounded-lg text-xs">
        <button
          onClick={() => setZoom((z) => Math.min(2.0, z + 0.2))}
          className="p-1 hover:bg-[#161f30] rounded text-[#8b949e] hover:text-white"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <span className="font-mono text-[11px] text-[#58a6ff] px-1">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
          className="p-1 hover:bg-[#161f30] rounded text-[#8b949e] hover:text-white"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
