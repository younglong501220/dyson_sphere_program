import React, { useState } from 'react';
import { BuildingType, BUILDING_DEFS } from '../../types/dsp';
import { MousePointer, ArrowRightCircle, Flame, Pickaxe, Cpu, Globe, Radio, Sun, Trash2 } from 'lucide-react';

interface ConstructionToolbarProps {
  selectedTool: BuildingType;
  onSelectTool: (type: BuildingType) => void;
}

export const ConstructionToolbar: React.FC<ConstructionToolbarProps> = ({
  selectedTool,
  onSelectTool,
}) => {
  const [clickedTool, setClickedTool] = useState<BuildingType | null>(null);

  const tools: { type: BuildingType; icon: React.ReactNode; label: string; key: string }[] = [
    { type: 'NONE', icon: <MousePointer className="w-4 h-4" />, label: '選取', key: 'Q' },
    { type: 'BELT', icon: <ArrowRightCircle className="w-4 h-4 text-[#00f0ff]" />, label: '傳送帶', key: '1' },
    { type: 'MINER', icon: <Pickaxe className="w-4 h-4 text-[#3fb950]" />, label: '採礦機', key: '2' },
    { type: 'SMELTER', icon: <Flame className="w-4 h-4 text-[#d29922]" />, label: '熔爐', key: '3' },
    { type: 'ASSEMBLER', icon: <Cpu className="w-4 h-4 text-[#bc8cff]" />, label: '製造台', key: '4' },
    { type: 'ILS', icon: <Globe className="w-4 h-4 text-[#58a6ff]" />, label: '星際物流塔', key: '5' },
    { type: 'RAY_RECEIVER', icon: <Radio className="w-4 h-4 text-[#ff7b72]" />, label: '射線接收', key: '6' },
    { type: 'SOLAR_PANEL', icon: <Sun className="w-4 h-4 text-[#79c0ff]" />, label: '太陽能', key: '7' },
  ];

  const handleToolClick = (type: BuildingType) => {
    setClickedTool(type);
    onSelectTool(type);
    setTimeout(() => {
      setClickedTool(null);
    }, 320);
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const keyMap: Record<string, BuildingType> = {
        q: 'NONE',
        Q: 'NONE',
        '1': 'BELT',
        '2': 'MINER',
        '3': 'SMELTER',
        '4': 'ASSEMBLER',
        '5': 'ILS',
        '6': 'RAY_RECEIVER',
        '7': 'SOLAR_PANEL',
      };
      if (keyMap[e.key]) {
        handleToolClick(keyMap[e.key]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-[#0a101e]/90 backdrop-blur-md border border-[#1e293b] p-1.5 rounded-xl shadow-2xl flex items-center gap-1.5 z-20">
      {tools.map((t) => {
        const isSelected = selectedTool === t.type;
        const isJustClicked = clickedTool === t.type;
        const def = BUILDING_DEFS[t.type];

        return (
          <button
            key={t.type}
            onClick={() => handleToolClick(t.type)}
            className={`relative flex flex-col items-center justify-center w-16 py-1.5 px-1 rounded-lg border transition-all duration-150 active:scale-90 ${
              isJustClicked
                ? 'tool-btn-clicked ring-2 ring-[#00f0ff] ring-offset-2 ring-offset-[#050811] border-[#00f0ff] shadow-lg shadow-[#00f0ff]/50'
                : ''
            } ${
              isSelected
                ? 'bg-[#1f6feb] border-[#388bfd] text-white shadow-lg shadow-[#1f6feb]/35 scale-105'
                : 'bg-[#111827]/80 border-[#1f293d] text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#162035] hover:border-[#388bfd]/50'
            }`}
            title={`${def.name}: ${def.description}`}
          >
            {/* Click Ripple Flash Glow */}
            {isJustClicked && (
              <span className="absolute inset-0 rounded-lg bg-[#00f0ff]/30 animate-ping pointer-events-none" />
            )}
            <div className={`mb-1 transition-transform duration-200 ${isJustClicked ? 'scale-125 -rotate-6' : ''}`}>
              {t.icon}
            </div>
            <span className="text-[11px] font-medium leading-tight whitespace-nowrap">{t.label}</span>
            <span className="text-[9px] font-mono text-[#58a6ff]/70 leading-none mt-0.5">[{t.key}]</span>
          </button>
        );
      })}

      {/* Selected tool info bubble */}
      {selectedTool !== 'NONE' && (
        <div className="hidden lg:flex flex-col justify-center pl-3 pr-2 border-l border-[#1e293b] text-left">
          <div className="text-xs font-semibold text-[#00f0ff] leading-tight">
            {BUILDING_DEFS[selectedTool].name}
          </div>
          <div className="text-[10px] text-[#8b949e] max-w-[160px] truncate">
            {BUILDING_DEFS[selectedTool].description}
          </div>
        </div>
      )}
    </div>
  );
};

