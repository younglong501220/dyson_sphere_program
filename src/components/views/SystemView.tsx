import React, { useEffect, useRef, useState } from 'react';
import { InterstellarDispatcher } from '../../core/interstellarDispatcher';
import { DysonEngine } from '../../core/dysonEngine';
import { PlanetData, PlanetId } from '../../types/dsp';
import { ZoomIn, ZoomOut, Compass, Sparkles } from 'lucide-react';

interface SystemViewProps {
  planets: Record<PlanetId, PlanetData>;
  dispatcher: InterstellarDispatcher;
  dysonEngine: DysonEngine;
  onSelectPlanet: (id: PlanetId) => void;
  systemPositions: Record<PlanetId, { x: number; y: number; z: number }>;
}

export const SystemView: React.FC<SystemViewProps> = ({
  planets,
  dispatcher,
  dysonEngine,
  onSelectPlanet,
  systemPositions,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = useState(0.85);
  const [camAngle, setCamAngle] = useState(0.2);
  const [pitch, setPitch] = useState(0.45);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState<{ x: number; y: number } | null>(null);
  const [hoveredPlanet, setHoveredPlanet] = useState<PlanetId | null>(null);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) {
      setIsDragging(true);
      setLastMouse({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging && lastMouse) {
      const dx = e.clientX - lastMouse.x;
      const dy = e.clientY - lastMouse.y;
      setCamAngle((prev) => prev + dx * 0.005);
      setPitch((prev) => Math.max(0.1, Math.min(1.2, prev + dy * 0.005)));
      setLastMouse({ x: e.clientX, y: e.clientY });
    }

    // Hover detection for planets
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    let found: PlanetId | null = null;
    for (const [id, planet] of Object.entries(planets)) {
      const p = systemPositions[id as PlanetId];
      if (!p) continue;
      // 3D projection
      const cosA = Math.cos(camAngle);
      const sinA = Math.sin(camAngle);
      const rx = p.x * cosA - p.z * sinA;
      const rz = p.x * sinA + p.z * cosA;
      const ry = p.y * Math.cos(pitch) - rz * Math.sin(pitch);
      const fov = 900;
      const depth = fov / (fov + (rz * Math.cos(pitch) + p.y * Math.sin(pitch)));

      const sx = cx + rx * depth * zoom;
      const sy = cy + ry * depth * zoom;
      const dist = Math.hypot(mx - sx, my - sy);

      if (dist < (planet.radius * zoom + 12)) {
        found = id as PlanetId;
        break;
      }
    }
    setHoveredPlanet(found);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setLastMouse(null);
  };

  const handleClick = () => {
    if (hoveredPlanet) {
      onSelectPlanet(hoveredPlanet);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.4, Math.min(1.8, z - e.deltaY * 0.001)));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let localTime = 0;

    const render = () => {
      localTime += 0.01;
      const w = (canvas.width = canvas.parentElement?.clientWidth || 800);
      const h = (canvas.height = canvas.parentElement?.clientHeight || 600);
      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);

      // Deep Space background
      ctx.fillStyle = '#040711';
      ctx.fillRect(0, 0, w, h);

      // Distant background starfield
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      const starSeed = 42;
      for (let s = 0; s < 70; s++) {
        const sx = ((s * 137.5 + starSeed) % w);
        const sy = ((s * 223.7 + starSeed) % h);
        const sz = (s % 3 === 0) ? 1.5 : 0.8;
        ctx.fillRect(sx, sy, sz, sz);
      }

      // 3D projection function
      const project = (x: number, y: number, z: number) => {
        const cosA = Math.cos(camAngle);
        const sinA = Math.sin(camAngle);
        const rx = x * cosA - z * sinA;
        const rz = x * sinA + z * cosA;

        const cosP = Math.cos(pitch);
        const sinP = Math.sin(pitch);
        const ry = y * cosP - rz * sinP;
        const finalZ = y * sinP + rz * cosP;

        const fov = 1000;
        const depth = fov / (fov + finalZ);
        return {
          x: cx + rx * depth * zoom,
          y: cy + ry * depth * zoom,
          depth,
          rawZ: finalZ,
        };
      };

      // 1. Central Star Corona & Photosphere
      const starP = project(0, 0, 0);
      const starRadius = 55 * zoom;
      const coronaRadius = 140 * zoom;

      const coronaGrad = ctx.createRadialGradient(
        starP.x,
        starP.y,
        starRadius * 0.4,
        starP.x,
        starP.y,
        coronaRadius
      );
      coronaGrad.addColorStop(0, '#ffffff');
      coronaGrad.addColorStop(0.2, '#ffe066');
      coronaGrad.addColorStop(0.5, 'rgba(255, 120, 20, 0.4)');
      coronaGrad.addColorStop(1, 'rgba(255, 60, 0, 0)');

      ctx.fillStyle = coronaGrad;
      ctx.beginPath();
      ctx.arc(starP.x, starP.y, coronaRadius, 0, Math.PI * 2);
      ctx.fill();

      // Star Core
      ctx.fillStyle = '#fff9e6';
      ctx.beginPath();
      ctx.arc(starP.x, starP.y, starRadius * 0.7, 0, Math.PI * 2);
      ctx.fill();

      // 2. Dyson Sphere / Swarm Orbit Rings
      for (const ring of dysonEngine.rings) {
        ctx.strokeStyle = ring.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        const steps = 64;
        for (let i = 0; i <= steps; i++) {
          const theta = (i / steps) * Math.PI * 2;
          const rx = Math.cos(theta) * ring.radius;
          const ry = Math.sin(theta) * ring.radius * Math.sin(ring.inclination);
          const rz = Math.sin(theta) * ring.radius * Math.cos(ring.inclination);
          const p = project(rx, ry, rz);
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }

      // Dyson Swarm Solar Sails
      for (const sail of dysonEngine.sails) {
        const ring = dysonEngine.rings[sail.orbitIndex] || dysonEngine.rings[0];
        const rx = Math.cos(sail.theta) * sail.radius;
        const ry = Math.sin(sail.theta) * sail.radius * Math.sin(sail.inclination);
        const rz = Math.sin(sail.theta) * sail.radius * Math.cos(sail.inclination);
        const p = project(rx, ry, rz);

        if (p.depth > 0) {
          ctx.fillStyle = sail.color;
          ctx.fillRect(p.x - 1.2, p.y - 1.2, 2.4, 2.4);
        }
      }

      // Dyson Shell Frame Nodes & Structural Struts
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
      ctx.lineWidth = 0.8;
      const renderedNodes = dysonEngine.nodes.map((node) => {
        const ring = dysonEngine.rings.find((r) => r.id === node.ringId) || dysonEngine.rings[0];
        const rx = Math.cos(node.theta) * ring.radius;
        const ry = Math.sin(node.theta) * ring.radius * Math.sin(ring.inclination);
        const rz = Math.sin(node.theta) * ring.radius * Math.cos(ring.inclination);
        return project(rx, ry, rz);
      });

      for (let i = 0; i < renderedNodes.length; i++) {
        const n1 = renderedNodes[i];
        const n2 = renderedNodes[(i + 1) % renderedNodes.length];
        ctx.beginPath();
        ctx.moveTo(n1.x, n1.y);
        ctx.lineTo(n2.x, n2.y);
        ctx.stroke();

        // Node bead
        ctx.fillStyle = '#00f0ff';
        ctx.beginPath();
        ctx.arc(n1.x, n1.y, 2.5 * zoom, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Planetary Orbits & Planets
      for (const [id, planet] of Object.entries(planets)) {
        const p3 = systemPositions[id as PlanetId];
        if (!p3) continue;

        // Orbit trail
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const oSteps = 48;
        for (let i = 0; i <= oSteps; i++) {
          const th = (i / oSteps) * Math.PI * 2;
          const ox = Math.cos(th) * planet.orbitRadius;
          const oz = Math.sin(th) * planet.orbitRadius;
          const op = project(ox, 0, oz);
          if (i === 0) ctx.moveTo(op.x, op.y);
          else ctx.lineTo(op.x, op.y);
        }
        ctx.stroke();

        // Projected planet position
        const p = project(p3.x, p3.y, p3.z);
        const pr = planet.radius * zoom * p.depth;
        const isHovered = hoveredPlanet === id;

        // Gas giant ring if planet is gas
        if (planet.id === 'planet-gas') {
          ctx.strokeStyle = 'rgba(163, 113, 247, 0.4)';
          ctx.lineWidth = 4 * zoom;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, pr * 2.2, pr * 0.7, 0.4, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Planet body
        ctx.save();
        ctx.fillStyle = planet.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, pr, 0, Math.PI * 2);
        ctx.fill();

        // Atmospheric halo
        ctx.strokeStyle = isHovered ? '#00f0ff' : 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = isHovered ? 2.5 : 1.2;
        ctx.stroke();

        // Planet Name Label
        ctx.fillStyle = isHovered ? '#00f0ff' : '#c9d1d9';
        ctx.font = '11px Plus Jakarta Sans, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(planet.name, p.x, p.y + pr + 16);
        ctx.restore();
      }

      // 4. Warp Logistics Vessels
      for (const vessel of dispatcher.vessels) {
        const vp = project(vessel.currPos.x, vessel.currPos.y, vessel.currPos.z);
        if (vp.depth <= 0) continue;

        // Warp distortion bubble
        ctx.strokeStyle = vessel.state === 'OUTBOUND' ? 'rgba(0, 240, 255, 0.7)' : 'rgba(88, 166, 255, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(vp.x, vp.y, 6 * zoom, 0, Math.PI * 2);
        ctx.stroke();

        // Warp Ion trail
        const trailOffset = vessel.state === 'OUTBOUND' ? -22 : 22;
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(vp.x, vp.y);
        ctx.lineTo(vp.x + trailOffset * zoom, vp.y + (trailOffset * 0.3) * zoom);
        ctx.stroke();

        // Ship core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(vp.x, vp.y, 2.5 * zoom, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [
    planets,
    dispatcher,
    dysonEngine,
    systemPositions,
    camAngle,
    pitch,
    zoom,
    hoveredPlanet,
  ]);

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onWheel={handleWheel}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
      />

      {/* Orbit Controls Overlay */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 bg-[#0a101e]/85 backdrop-blur-md border border-[#1e293b] p-2 rounded-lg shadow-xl text-xs">
        <div className="text-[11px] font-mono text-[#8b949e] px-1">星系視角控制</div>
        <div className="flex items-center justify-between gap-1">
          <button
            onClick={() => setZoom((z) => Math.min(1.8, z + 0.15))}
            className="p-1.5 hover:bg-[#161f30] rounded text-[#8b949e] hover:text-white"
            title="放大"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <span className="font-mono text-[11px] text-[#58a6ff] tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}
            className="p-1.5 hover:bg-[#161f30] rounded text-[#8b949e] hover:text-white"
            title="縮小"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hovered Planet Quick Action Banner */}
      {hoveredPlanet && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#0a101e]/90 backdrop-blur-md border border-[#00f0ff]/50 px-4 py-2 rounded-lg shadow-2xl flex items-center gap-3">
          <span className="text-sm font-semibold text-white">
            {planets[hoveredPlanet].name}
          </span>
          <span className="text-xs text-[#8b949e]">
            {planets[hoveredPlanet].features}
          </span>
          <button
            onClick={() => onSelectPlanet(hoveredPlanet)}
            className="px-3 py-1 bg-[#1f6feb] hover:bg-[#388bfd] text-white text-xs font-medium rounded transition-colors"
          >
            降落星球表面
          </button>
        </div>
      )}

      {/* Instructions footer */}
      <div className="absolute bottom-4 left-4 bg-[#0a101e]/80 border border-[#1e293b] px-3 py-1.5 rounded text-xs text-[#8b949e] font-mono">
        滑鼠拖曳旋轉星系 / 滾輪縮放 / 點擊行星進入地面建造
      </div>
    </div>
  );
};
