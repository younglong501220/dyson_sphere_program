import React, { useRef, useEffect, useState } from 'react';
import { DysonEngine } from '../../core/dysonEngine';
import { sound } from '../../core/audioSynthesizer';
import { Zap, Sun, Plus, Send, Activity, ShieldCheck } from 'lucide-react';

interface DysonArchitectViewProps {
  dysonEngine: DysonEngine;
}

export const DysonArchitectView: React.FC<DysonArchitectViewProps> = ({ dysonEngine }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rotYRef = useRef(0.3);
  const rotXRef = useRef(0.2);
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef<{ x: number; y: number } | null>(null);
  const [selectedRingId, setSelectedRingId] = useState<number>(1);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current && lastMouseRef.current) {
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      rotYRef.current += dx * 0.006;
      rotXRef.current = Math.max(-1.2, Math.min(1.2, rotXRef.current - dy * 0.006));
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    lastMouseRef.current = null;
  };

  const handleLaunchSail = () => {
    dysonEngine.launchSail(selectedRingId - 1);
    sound.playLaunchSail();
  };

  const handleAddNode = () => {
    dysonEngine.addNodeToRing(selectedRingId);
    sound.playPlace();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      rotYRef.current += 0.002;
      const rotY = rotYRef.current;
      const rotX = rotXRef.current;

      const w = (canvas.width = canvas.parentElement?.clientWidth || 800);
      const h = (canvas.height = canvas.parentElement?.clientHeight || 600);
      const cx = w / 2;
      const cy = h / 2;

      ctx.fillStyle = '#040711';
      ctx.fillRect(0, 0, w, h);

      // Central star glow
      const starGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 90);
      starGrad.addColorStop(0, '#ffffff');
      starGrad.addColorStop(0.3, '#ffcc00');
      starGrad.addColorStop(1, 'rgba(255, 68, 0, 0)');
      ctx.fillStyle = starGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 90, 0, Math.PI * 2);
      ctx.fill();

      // 3D Projection helper
      const project = (x: number, y: number, z: number) => {
        const cosY = Math.cos(rotY);
        const sinY = Math.sin(rotY);
        const rx = x * cosY - z * sinY;
        const rz = x * sinY + z * cosY;

        const cosX = Math.cos(rotX);
        const sinX = Math.sin(rotX);
        const ry = y * cosX - rz * sinX;
        const fz = y * sinX + rz * cosX;

        const fov = 700;
        const depth = fov / (fov + fz);
        return {
          x: cx + rx * depth,
          y: cy + ry * depth,
          depth,
        };
      };

      // 1. Draw Dyson Rings & Geodesic Lattice
      for (const ring of dysonEngine.rings) {
        ctx.strokeStyle = ring.id === selectedRingId ? '#00f0ff' : 'rgba(0, 240, 255, 0.25)';
        ctx.lineWidth = ring.id === selectedRingId ? 2 : 1;

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

      // 2. Draw Geodesic Struts & Shell Panels
      const nodes = dysonEngine.nodes;
      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];
        const r1 = dysonEngine.rings.find((r) => r.id === n1.ringId) || dysonEngine.rings[0];
        const p1 = project(
          Math.cos(n1.theta) * r1.radius,
          Math.sin(n1.theta) * r1.radius * Math.sin(r1.inclination),
          Math.sin(n1.theta) * r1.radius * Math.cos(r1.inclination)
        );

        // Frame Node
        ctx.fillStyle = '#00f0ff';
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Connect to next node
        const n2 = nodes[(i + 1) % nodes.length];
        const r2 = dysonEngine.rings.find((r) => r.id === n2.ringId) || dysonEngine.rings[0];
        const p2 = project(
          Math.cos(n2.theta) * r2.radius,
          Math.sin(n2.theta) * r2.radius * Math.sin(r2.inclination),
          Math.sin(n2.theta) * r2.radius * Math.cos(r2.inclination)
        );

        ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }

      // 3. Draw Orbiting Solar Sails
      for (const sail of dysonEngine.sails) {
        const ring = dysonEngine.rings[sail.orbitIndex] || dysonEngine.rings[0];
        const rx = Math.cos(sail.theta) * sail.radius;
        const ry = Math.sin(sail.theta) * sail.radius * Math.sin(sail.inclination);
        const rz = Math.sin(sail.theta) * sail.radius * Math.cos(sail.inclination);
        const p = project(rx, ry, rz);

        if (p.depth > 0) {
          ctx.fillStyle = sail.color;
          ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [dysonEngine, selectedRingId]);

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
      />

      {/* Dyson Control & Telemetry Panel */}
      <div className="absolute top-4 left-4 w-80 bg-[#0a101e]/90 backdrop-blur-md border border-[#1e293b] p-4 rounded-xl shadow-2xl text-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
          <div className="flex items-center gap-2 text-[#00f0ff] font-semibold text-sm">
            <Sun className="w-4 h-4 text-[#ffe066]" />
            <span>戴森球工程總控</span>
          </div>
          <span className="font-mono text-emerald-400 font-bold text-xs flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> 正常運轉中
          </span>
        </div>

        {/* Power Telemetry Gauge */}
        <div className="space-y-1">
          <div className="flex justify-between text-[#8b949e] font-mono text-[11px]">
            <span>當前發電總功率</span>
            <span className="text-[#00f0ff] font-bold text-sm">
              {dysonEngine.totalPowerMW > 1000
                ? `${(dysonEngine.totalPowerMW / 1000).toFixed(2)} GW`
                : `${dysonEngine.totalPowerMW.toFixed(1)} MW`}
            </span>
          </div>
          <div className="w-full bg-[#161f30] h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#00f0ff] to-[#ffe066] h-full transition-all duration-300"
              style={{ width: `${Math.min(100, (dysonEngine.totalPowerMW / 3000) * 100)}%` }}
            />
          </div>
        </div>

        {/* Orbit Rings Selection */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-mono text-[#8b949e]">戴森環軌道切換</div>
          <div className="grid grid-cols-3 gap-1.5">
            {dysonEngine.rings.map((ring) => (
              <button
                key={ring.id}
                onClick={() => setSelectedRingId(ring.id)}
                className={`py-1.5 px-2 rounded font-mono text-[11px] border transition-colors ${
                  selectedRingId === ring.id
                    ? 'bg-[#1f6feb] border-[#388bfd] text-white'
                    : 'bg-[#161f30] border-[#1e293b] text-[#8b949e] hover:text-[#c9d1d9]'
                }`}
              >
                軌道 #{ring.id}
              </button>
            ))}
          </div>
        </div>

        {/* Project Actions */}
        <div className="space-y-2 pt-1 border-t border-[#1e293b]">
          <button
            onClick={handleLaunchSail}
            className="w-full flex items-center justify-center gap-2 py-2 bg-[#238636] hover:bg-[#2ea043] text-white rounded font-medium transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>彈射 10 枚太陽帆 (EM-Rail)</span>
          </button>

          <button
            onClick={handleAddNode}
            className="w-full flex items-center justify-center gap-2 py-2 bg-[#1f6feb] hover:bg-[#388bfd] text-white rounded font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>建造戴森球構架節點</span>
          </button>
        </div>

        {/* Real-time stats */}
        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-[#8b949e] pt-2 border-t border-[#1e293b]">
          <div>在軌太陽帆: <span className="text-white font-bold">{dysonEngine.sails.length}</span></div>
          <div>構架節點: <span className="text-white font-bold">{dysonEngine.nodes.length}</span></div>
          <div>殼面覆蓋率: <span className="text-[#ffe066] font-bold">{Math.round(dysonEngine.shellCoverageRatio * 100)}%</span></div>
          <div>射線效率: <span className="text-emerald-400 font-bold">100%</span></div>
        </div>
      </div>
    </div>
  );
};
