import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SphericalGridSystem } from '../../core/gridSystem';
import { DODBeltNetwork } from '../../core/dodBeltNetwork';
import { BuildingType, BUILDING_DEFS, CARGO_ITEMS, PlacedBuilding, PlanetData } from '../../types/dsp';
import { DysonEngine } from '../../core/dysonEngine';
import { PowerTelemetryChart, PowerDataPoint } from '../hud/PowerTelemetryChart';
import { sound } from '../../core/audioSynthesizer';
import { Compass, RotateCw, ZoomIn, ZoomOut, AlertTriangle, Layers, Zap, ChevronDown, ChevronUp, Activity } from 'lucide-react';

interface SparkParticle {
  angle: number;
  speed: number;
  size: number;
  color: string;
}

interface PlacementEffect {
  id: number;
  bandIndex: number;
  segmentIndex: number;
  createdAt: number;
  duration: number;
  color: string;
  sparks: SparkParticle[];
}

interface PlanetViewProps {
  planet: PlanetData;
  gridSystem: SphericalGridSystem;
  beltNetwork: DODBeltNetwork;
  selectedTool: BuildingType;
  placedBuildings: PlacedBuilding[];
  onPlaceBuilding: (band: number, seg: number, type: BuildingType) => void;
  onDemolish: (band: number, seg: number) => void;
  showFaultLines: boolean;
  setShowFaultLines: (val: boolean) => void;
  powerHistory: PowerDataPoint[];
  dysonEngine: DysonEngine;
}

export const PlanetView: React.FC<PlanetViewProps> = ({
  planet,
  gridSystem,
  beltNetwork,
  selectedTool,
  placedBuildings,
  onPlaceBuilding,
  onDemolish,
  showFaultLines,
  setShowFaultLines,
  powerHistory,
  dysonEngine,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const placementEffectsRef = useRef<PlacementEffect[]>([]);

  // Continuous animation state stored in refs to prevent 60 FPS React re-renders
  const rotYRef = useRef(0.4);
  const rotXRef = useRef(0.25);
  const zoomRef = useRef(1.0);
  const isDraggingRef = useRef(false);
  const autoRotateRef = useRef(true);
  const lastMouseRef = useRef<{ x: number; y: number } | null>(null);

  // UI state for display
  const [zoomDisplay, setZoomDisplay] = useState(1.0);
  const [autoRotateDisplay, setAutoRotateDisplay] = useState(true);
  const [showPowerMonitor, setShowPowerMonitor] = useState(true);
  const [hoveredCell, setHoveredCell] = useState<{
    bandIndex: number;
    segmentIndex: number;
    latDeg: number;
    lonDeg: number;
    isFault: boolean;
  } | null>(null);

  // Trigger placement particle burst
  const triggerPlacementBurst = (bandIndex: number, segmentIndex: number, toolColor: string) => {
    const sparks: SparkParticle[] = [];
    const sparkColors = [toolColor, '#00f0ff', '#ffffff', '#ffe066', '#7ee787'];
    const particleCount = 22;

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.4 + Math.random() * 3.6;
      const size = 2 + Math.random() * 3.5;
      const color = sparkColors[Math.floor(Math.random() * sparkColors.length)];
      sparks.push({ angle, speed, size, color });
    }

    placementEffectsRef.current.push({
      id: Date.now() + Math.random(),
      bandIndex,
      segmentIndex,
      createdAt: performance.now(),
      duration: 650,
      color: toolColor,
      sparks,
    });
  };

  // Mouse drag handling
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) {
      isDraggingRef.current = true;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    if (isDraggingRef.current && lastMouseRef.current) {
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      rotYRef.current += dx * 0.006;
      rotXRef.current = Math.max(-1.4, Math.min(1.4, rotXRef.current - dy * 0.006));
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      autoRotateRef.current = false;
      setAutoRotateDisplay(false);
    }

    // Raycast spherical grid
    const originalRadius = gridSystem.radius;
    gridSystem.radius = gridSystem.radius * zoomRef.current;
    const hit = gridSystem.raycast(mouseX, mouseY, cx, cy, rotYRef.current, rotXRef.current);
    gridSystem.radius = originalRadius;

    setHoveredCell(hit);
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    lastMouseRef.current = null;
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    const originalRadius = gridSystem.radius;
    gridSystem.radius = gridSystem.radius * zoomRef.current;
    const cell = hoveredCell || gridSystem.raycast(mouseX, mouseY, cx, cy, rotYRef.current, rotXRef.current);
    gridSystem.radius = originalRadius;

    if (cell) {
      if (e.button === 0 && selectedTool !== 'NONE') {
        onPlaceBuilding(cell.bandIndex, cell.segmentIndex, selectedTool);
        sound.playPlace();
        triggerPlacementBurst(
          cell.bandIndex,
          cell.segmentIndex,
          BUILDING_DEFS[selectedTool].color
        );
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (hoveredCell) {
      onDemolish(hoveredCell.bandIndex, hoveredCell.segmentIndex);
      sound.playClick();
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const nextZoom = Math.max(0.65, Math.min(2.2, zoomRef.current - e.deltaY * 0.0012));
    zoomRef.current = nextZoom;
    setZoomDisplay(nextZoom);
  };

  const toggleAutoRotate = () => {
    autoRotateRef.current = !autoRotateRef.current;
    setAutoRotateDisplay(autoRotateRef.current);
  };

  const adjustZoom = (delta: number) => {
    const nextZoom = Math.max(0.65, Math.min(2.2, zoomRef.current + delta));
    zoomRef.current = nextZoom;
    setZoomDisplay(nextZoom);
  };

  // Rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      if (autoRotateRef.current && !isDraggingRef.current) {
        rotYRef.current += 0.0015;
      }

      const rotY = rotYRef.current;
      const rotX = rotXRef.current;
      const zoom = zoomRef.current;
      const currentRadius = gridSystem.radius * zoom;

      const w = (canvas.width = canvas.parentElement?.clientWidth || 800);
      const h = (canvas.height = canvas.parentElement?.clientHeight || 600);
      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);

      // Deep space atmospheric background
      const spaceGrad = ctx.createRadialGradient(cx, cy, currentRadius * 0.8, cx, cy, Math.max(w, h));
      spaceGrad.addColorStop(0, '#090f1e');
      spaceGrad.addColorStop(1, '#04070e');
      ctx.fillStyle = spaceGrad;
      ctx.fillRect(0, 0, w, h);

      // Planet sphere body with shading
      const planetGrad = ctx.createRadialGradient(
        cx - currentRadius * 0.35,
        cy - currentRadius * 0.35,
        currentRadius * 0.1,
        cx,
        cy,
        currentRadius
      );
      planetGrad.addColorStop(0, '#1c2e4a');
      planetGrad.addColorStop(0.65, '#0e1829');
      planetGrad.addColorStop(1, '#050a14');

      ctx.beginPath();
      ctx.arc(cx, cy, currentRadius, 0, Math.PI * 2);
      ctx.fillStyle = planetGrad;
      ctx.fill();

      // Atmospheric outer glow
      ctx.strokeStyle = 'rgba(56, 139, 253, 0.3)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Temporarily adjust gridSystem radius for zoom
      const originalRadius = gridSystem.radius;
      gridSystem.radius = currentRadius;

      // 1. Draw Spherical Ring-Banded Grid & Fault Lines
      const bands = gridSystem.bands;
      for (let b = 0; b < bands.length; b += 2) {
        const band = bands[b];
        const isFault = band.isFaultLineAbove;

        // Styling based on whether it is a DSP fault line
        if (isFault && showFaultLines) {
          ctx.strokeStyle = 'rgba(240, 136, 62, 0.8)';
          ctx.lineWidth = 1.6;
        } else {
          ctx.strokeStyle = 'rgba(0, 240, 255, 0.14)';
          ctx.lineWidth = 0.5;
        }

        // Draw latitude circle
        ctx.beginPath();
        let started = false;
        const sampleSegs = band.segments;

        for (let s = 0; s <= sampleSegs; s++) {
          const p = gridSystem.gridTo3D(b, s % sampleSegs, { x: cx, y: cy, z: 0 }, 0, rotY, rotX);
          // Front hemisphere check (z > 0)
          if (p.z > 0) {
            if (!started) {
              ctx.moveTo(p.x, p.y);
              started = true;
            } else {
              ctx.lineTo(p.x, p.y);
            }
          } else {
            started = false;
          }
        }
        ctx.stroke();

        // Draw longitudinal meridian ribs across latitude band
        if (b % 4 === 0) {
          ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
          ctx.lineWidth = 0.4;
          const stride = Math.max(1, Math.floor(sampleSegs / 16));
          for (let s = 0; s < sampleSegs; s += stride) {
            const nextB = Math.min(bands.length - 1, b + 2);
            const p1 = gridSystem.gridTo3D(b, s, { x: cx, y: cy, z: 0 }, 0, rotY, rotX);
            const nextSeg = Math.floor((s / sampleSegs) * bands[nextB].segments);
            const p2 = gridSystem.gridTo3D(nextB, nextSeg, { x: cx, y: cy, z: 0 }, 0, rotY, rotX);

            if (p1.z > 0 && p2.z > 0) {
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
            }
          }
        }
      }

      // 2. Draw Hovered Grid Cell
      if (hoveredCell) {
        const corners = gridSystem.getCellCorners3D(
          hoveredCell.bandIndex,
          hoveredCell.segmentIndex,
          { x: cx, y: cy, z: 0 },
          2,
          rotY,
          rotX
        );
        if (corners && corners.every((c) => c.z > 0)) {
          ctx.fillStyle = hoveredCell.isFault ? 'rgba(240, 136, 62, 0.45)' : 'rgba(0, 240, 255, 0.35)';
          ctx.strokeStyle = hoveredCell.isFault ? '#f0883e' : '#00f0ff';
          ctx.lineWidth = 1.5;

          ctx.beginPath();
          ctx.moveTo(corners[0].x, corners[0].y);
          ctx.lineTo(corners[1].x, corners[1].y);
          ctx.lineTo(corners[2].x, corners[2].y);
          ctx.lineTo(corners[3].x, corners[3].y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }

      // 3. Draw Placed Buildings
      for (const bld of placedBuildings) {
        const p = gridSystem.gridTo3D(bld.bandIndex, bld.segmentIndex, { x: cx, y: cy, z: 0 }, 4, rotY, rotX);
        if (p.z > 5) {
          const def = BUILDING_DEFS[bld.type];
          ctx.save();
          ctx.translate(p.x, p.y);

          // Building footprint circle/square
          ctx.fillStyle = def.color;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;

          if (bld.type === 'ILS' || bld.type === 'PLS') {
            ctx.beginPath();
            ctx.arc(0, 0, 7 * zoom, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Sky beam
            ctx.strokeStyle = 'rgba(88, 166, 255, 0.4)';
            ctx.lineWidth = 2 * zoom;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -32 * zoom);
            ctx.stroke();
          } else if (bld.type === 'SMELTER') {
            ctx.beginPath();
            ctx.arc(0, 0, 5 * zoom, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = 'rgba(255, 140, 0, 0.7)';
            ctx.beginPath();
            ctx.arc(0, 0, 2.5 * zoom, 0, Math.PI * 2);
            ctx.fill();
          } else if (bld.type === 'RAY_RECEIVER') {
            ctx.beginPath();
            ctx.arc(0, 0, 6 * zoom, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 123, 114, 0.7)';
            ctx.lineWidth = 2 * zoom;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(24 * zoom, -40 * zoom);
            ctx.stroke();
          } else if (bld.type === 'EM_EJECTOR') {
            ctx.beginPath();
            ctx.arc(0, 0, 5.5 * zoom, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#2ea043';
            ctx.lineWidth = 2 * zoom;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-15 * zoom, -35 * zoom);
            ctx.stroke();
          } else {
            ctx.beginPath();
            ctx.arc(0, 0, 4.5 * zoom, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }

          ctx.restore();
        }
      }

      // 4. Draw Conveyor Belts & Flowing DOD Cargo Cubes
      const activeBelts = beltNetwork.activeBelts;
      const slots = beltNetwork.slotsPerBelt;
      const maxDrawBelts = Math.min(activeBelts, 250);

      for (let b = 0; b < maxDrawBelts; b++) {
        const conn = beltNetwork.beltConnections[b];
        if (!conn) continue;

        const offset = b * slots;
        const fromBand = conn.fromBand;
        const toBand = conn.toBand;

        for (let s = 0; s < slots; s += 2) {
          const itemType = beltNetwork.beltItemBuffer[offset + s];
          if (itemType === 0) continue;

          const t = s / slots;
          const currentBand = Math.round(fromBand + (toBand - fromBand) * t);
          const currentSeg = Math.round(conn.fromSeg + (conn.toSeg - conn.fromSeg) * t);

          const p = gridSystem.gridTo3D(currentBand, currentSeg, { x: cx, y: cy, z: 0 }, 3, rotY, rotX);
          if (p.z > 0) {
            const itemDef = CARGO_ITEMS[itemType] || CARGO_ITEMS[1];
            ctx.fillStyle = itemDef.color;
            ctx.shadowColor = itemDef.glowColor;
            ctx.shadowBlur = 4;
            ctx.fillRect(p.x - 2 * zoom, p.y - 2 * zoom, 4 * zoom, 4 * zoom);
            ctx.shadowBlur = 0;
          }
        }
      }

      // 5. Draw Placement Particle Burst Effects & Shockwaves
      const now = performance.now();
      const activeEffects: PlacementEffect[] = [];

      for (const effect of placementEffectsRef.current) {
        const elapsed = now - effect.createdAt;
        const t = elapsed / effect.duration;
        if (t >= 1.0) continue;

        const p = gridSystem.gridTo3D(effect.bandIndex, effect.segmentIndex, { x: cx, y: cy, z: 0 }, 5, rotY, rotX);
        if (p.z > 0) {
          activeEffects.push(effect);

          ctx.save();
          // Expanding Shockwave Ring 1
          const waveRadius = t * 44 * zoom;
          ctx.beginPath();
          ctx.arc(p.x, p.y, waveRadius, 0, Math.PI * 2);
          ctx.strokeStyle = effect.color;
          ctx.lineWidth = Math.max(0.8, (1 - t) * 3.5 * zoom);
          ctx.shadowColor = effect.color;
          ctx.shadowBlur = 10;
          ctx.stroke();

          // High-energy inner fast ring
          const innerRadius = t * 22 * zoom;
          ctx.beginPath();
          ctx.arc(p.x, p.y, innerRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 255, 255, ${Math.max(0, (1 - t) * 0.9)})`;
          ctx.lineWidth = 1.8;
          ctx.stroke();

          // Central core glow flash
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(0.5, (1 - t) * 10 * zoom), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, (1 - t) * 0.75)})`;
          ctx.fill();

          // Holographic Grid Footprint Snap Flash
          const cellCorners = gridSystem.getCellCorners3D(effect.bandIndex, effect.segmentIndex, { x: cx, y: cy, z: 0 }, 4, rotY, rotX);
          if (cellCorners && cellCorners.every((c) => c.z > 0)) {
            ctx.fillStyle = `rgba(0, 240, 255, ${Math.max(0, (1 - t) * 0.4)})`;
            ctx.strokeStyle = effect.color;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(cellCorners[0].x, cellCorners[0].y);
            ctx.lineTo(cellCorners[1].x, cellCorners[1].y);
            ctx.lineTo(cellCorners[2].x, cellCorners[2].y);
            ctx.lineTo(cellCorners[3].x, cellCorners[3].y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }

          // Dispersing radial spark particles
          for (const sp of effect.sparks) {
            const dist = sp.speed * (elapsed * 0.08) * zoom;
            const sx = p.x + Math.cos(sp.angle) * dist;
            const sy = p.y + Math.sin(sp.angle) * dist;
            const currentSize = Math.max(1, sp.size * (1 - t * 0.5) * zoom);

            ctx.fillStyle = sp.color;
            ctx.shadowColor = sp.color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(sx, sy, currentSize / 2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }
      placementEffectsRef.current = activeEffects;

      // Restore gridSystem radius
      gridSystem.radius = originalRadius;

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [
    gridSystem,
    beltNetwork,
    placedBuildings,
    hoveredCell,
    selectedTool,
    showFaultLines,
  ]);

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onWheel={handleWheel}
        className="w-full h-full cursor-crosshair block"
      />

      {/* Floating Viewport Overlay Tools */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 bg-[#0a101e]/85 backdrop-blur-md border border-[#1e293b] p-2 rounded-lg shadow-xl text-xs">
        <button
          onClick={toggleAutoRotate}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
            autoRotateDisplay ? 'bg-[#1f6feb] text-white' : 'text-[#8b949e] hover:bg-[#161f30]'
          }`}
          title="自動旋轉"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>自轉: {autoRotateDisplay ? '開啟' : '暫停'}</span>
        </button>

        <button
          onClick={() => setShowFaultLines(!showFaultLines)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
            showFaultLines ? 'bg-[#f0883e]/20 text-[#f0883e] border border-[#f0883e]/50' : 'text-[#8b949e] hover:bg-[#161f30]'
          }`}
          title="切換高亮斷層線"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>斷層線 (Faults): {showFaultLines ? '顯示' : '隱藏'}</span>
        </button>

        <div className="flex items-center justify-between gap-1 pt-1 border-t border-[#1e293b]">
          <button
            onClick={() => adjustZoom(0.2)}
            className="p-1.5 hover:bg-[#161f30] rounded text-[#8b949e] hover:text-white"
            title="放大"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <span className="font-mono text-[11px] text-[#58a6ff] tabular-nums">
            {Math.round(zoomDisplay * 100)}%
          </span>
          <button
            onClick={() => adjustZoom(-0.2)}
            className="p-1.5 hover:bg-[#161f30] rounded text-[#8b949e] hover:text-white"
            title="縮小"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Floating Dyson Power Generation Telemetry Monitor (Recharts) */}
      <div className="absolute top-36 right-4 w-80 bg-[#0a101e]/90 backdrop-blur-md border border-[#1e293b] p-2.5 rounded-xl shadow-2xl text-xs space-y-2 pointer-events-auto">
        <div className="flex items-center justify-between border-b border-[#1e293b] pb-1.5">
          <div className="flex items-center gap-1.5 text-[#00f0ff] font-semibold text-[11px] font-tech">
            <Zap className="w-3.5 h-3.5 text-[#ffe066]" />
            <span>戴森球發電效率監控 (Power Gen)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-emerald-400 font-bold tabular-nums">
              {dysonEngine.totalPowerMW > 1000
                ? `${(dysonEngine.totalPowerMW / 1000).toFixed(2)} GW`
                : `${dysonEngine.totalPowerMW.toFixed(1)} MW`}
            </span>
            <button
              onClick={() => setShowPowerMonitor(!showPowerMonitor)}
              className="p-1 hover:bg-[#161f30] rounded text-[#8b949e] hover:text-white transition-colors"
              title={showPowerMonitor ? '收起圖表' : '展開圖表'}
            >
              {showPowerMonitor ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {showPowerMonitor && (
          <PowerTelemetryChart
            history={powerHistory}
            currentPower={dysonEngine.totalPowerMW}
            swarmPower={dysonEngine.swarmPowerMW}
            shellPower={dysonEngine.shellPowerMW}
          />
        )}
      </div>

      {/* Grid Inspector Monospace Tooltip */}
      {hoveredCell && (
        <div className="absolute bottom-4 left-4 bg-[#0a101e]/90 backdrop-blur-md border border-[#00f0ff]/40 p-3 rounded-lg shadow-2xl pointer-events-none text-xs font-mono space-y-1">
          <div className="flex items-center justify-between gap-4 text-[#00f0ff] font-semibold border-b border-[#1e293b] pb-1">
            <span>球面網格節點探針</span>
            {hoveredCell.isFault && (
              <span className="text-[#f0883e] font-bold animate-pulse">⚠ 斷層階梯</span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-4 text-[11px] text-[#8b949e]">
            <div>緯度環 (Band): <span className="text-[#c9d1d9] font-bold">{hoveredCell.bandIndex}</span></div>
            <div>經度槽 (Segment): <span className="text-[#c9d1d9] font-bold">{hoveredCell.segmentIndex}</span></div>
            <div>赤道夾角 (Lat): <span className="text-[#58a6ff] font-bold">{hoveredCell.latDeg}°</span></div>
            <div>方位角 (Lon): <span className="text-[#58a6ff] font-bold">{hoveredCell.lonDeg}°</span></div>
          </div>
          <div className="text-[10px] text-[#6e7681] pt-1">
            {hoveredCell.isFault
              ? '此緯度網格階梯降階，直向傳送帶在此跨度會有折角（DSP 經典幾何特性）'
              : '標準正方拓撲網格，允許無損建築陣列排列'}
          </div>
        </div>
      )}
    </div>
  );
};
