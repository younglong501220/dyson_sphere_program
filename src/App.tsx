import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ViewMode, PlanetId, PlanetData, BuildingType, PlacedBuilding, CARGO_ITEMS } from './types/dsp';
import { SphericalGridSystem } from './core/gridSystem';
import { DODBeltNetwork } from './core/dodBeltNetwork';
import { InterstellarDispatcher } from './core/interstellarDispatcher';
import { DysonEngine } from './core/dysonEngine';
import { sound } from './core/audioSynthesizer';

import { SystemView } from './components/views/SystemView';
import { PlanetView } from './components/views/PlanetView';
import { BlueprintView } from './components/views/BlueprintView';
import { DysonArchitectView } from './components/views/DysonArchitectView';

import { PerformancePanel } from './components/hud/PerformancePanel';
import { ConstructionToolbar } from './components/hud/ConstructionToolbar';
import { LogisticsDispatchModal } from './components/hud/LogisticsDispatchModal';
import { ArchitectureExplanationModal } from './components/hud/ArchitectureExplanationModal';
import { PowerDataPoint } from './components/hud/PowerTelemetryChart';

import { Orbit, Globe, Layers, Sun, Volume2, VolumeX, Radar, BookOpen, Sparkles } from 'lucide-react';

const INITIAL_PLANETS: Record<PlanetId, PlanetData> = {
  'planet-foundry': {
    id: 'planet-foundry',
    name: '鑄造母星 (Polaris I)',
    type: '海洋與地中海型 (Foundry World)',
    color: '#1f6feb',
    orbitRadius: 260,
    orbitSpeed: 0.0014,
    orbitAngle: 0.8,
    radius: 42,
    rotationSpeed: 0.005,
    rotationAngle: 0,
    features: '科技矩陣總裝、星際物流總站、戴森帆組裝',
    ilsStorage: {
      1: { local: 12000, remote: 8000, role: 'STORAGE', max: 10000 },  // 鐵礦
      3: { local: 400, remote: 400, role: 'DEMAND', max: 10000 },      // 鈦礦 (需求!)
      5: { local: 1800, remote: 1800, role: 'DEMAND', max: 5000 },     // 鈦合金 (需求!)
      6: { local: 5000, remote: 5000, role: 'SUPPLY', max: 10000 },    // 電磁矩陣 (供應)
      10: { local: 3200, remote: 3200, role: 'SUPPLY', max: 5000 },    // 太陽帆 (供應)
    },
  },
  'planet-titanium': {
    id: 'planet-titanium',
    name: '鈦礦先鋒星 (Polaris II)',
    type: '荒漠戈壁型 (Titanium Outpost)',
    color: '#f0883e',
    orbitRadius: 390,
    orbitSpeed: 0.0009,
    orbitAngle: 2.4,
    radius: 36,
    rotationSpeed: 0.004,
    rotationAngle: 0,
    features: '海量高純鈦礦脈、初級電弧冶煉陣列',
    ilsStorage: {
      3: { local: 8500, remote: 8500, role: 'SUPPLY', max: 10000 },    // 鈦礦 (遠程供應!)
      5: { local: 4200, remote: 4200, role: 'SUPPLY', max: 10000 },    // 鈦合金 (供應)
      6: { local: 200, remote: 200, role: 'DEMAND', max: 5000 },       // 電磁矩陣 (需求)
    },
  },
  'planet-gas': {
    id: 'planet-gas',
    name: '氣態巨行星 (Boreas III)',
    type: '冰巨星環系 (Ice Giant)',
    color: '#a371f7',
    orbitRadius: 540,
    orbitSpeed: 0.0005,
    orbitAngle: 4.1,
    radius: 54,
    rotationSpeed: 0.008,
    rotationAngle: 0,
    features: '氫氣 / 重氫收集軌道采集器',
    ilsStorage: {
      7: { local: 6000, remote: 6000, role: 'SUPPLY', max: 10000 },
    },
  },
  'planet-vulcan': {
    id: 'planet-vulcan',
    name: '熔岩熾熱星 (Vulcan IV)',
    type: '火山熔岩核心 (Lava World)',
    color: '#ff7b72',
    orbitRadius: 180,
    orbitSpeed: 0.0022,
    orbitAngle: 5.3,
    radius: 32,
    rotationSpeed: 0.003,
    rotationAngle: 0,
    features: '地熱能量充沛、高純矽礦開採',
    ilsStorage: {
      4: { local: 7200, remote: 7200, role: 'SUPPLY', max: 10000 },    // 矽
    },
  },
};

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('PLANET');
  const [currentPlanetId, setCurrentPlanetId] = useState<PlanetId>('planet-foundry');
  const [planets, setPlanets] = useState<Record<PlanetId, PlanetData>>(INITIAL_PLANETS);
  const [selectedTool, setSelectedTool] = useState<BuildingType>('NONE');
  const [showFaultLines, setShowFaultLines] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState<boolean>(false);
  const [isDocsModalOpen, setIsDocsModalOpen] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(60);
  const planetsRef = useRef<Record<PlanetId, PlanetData>>(INITIAL_PLANETS);
  const [powerHistory, setPowerHistory] = useState<PowerDataPoint[]>(() => {
    const initial: PowerDataPoint[] = [];
    const now = Date.now();
    for (let i = 12; i >= 0; i--) {
      const t = new Date(now - i * 1200);
      const timeStr = `${t.getMinutes().toString().padStart(2, '0')}:${t.getSeconds().toString().padStart(2, '0')}`;
      initial.push({
        time: timeStr,
        totalPower: 1045.0 + Math.sin(i * 0.7) * 8,
        swarmPower: 185.0 + Math.sin(i * 0.9) * 3,
        shellPower: 860.0 + Math.cos(i * 0.5) * 6,
      });
    }
    return initial;
  });

  // Core engines singletons
  const gridSystemRef = useRef<SphericalGridSystem>(new SphericalGridSystem(150, 120, 36));
  const beltNetworkRef = useRef<DODBeltNetwork>(new DODBeltNetwork(1500, 48));
  const dispatcherRef = useRef<InterstellarDispatcher>(new InterstellarDispatcher());
  const dysonEngineRef = useRef<DysonEngine>(new DysonEngine());

  const [placedBuildings, setPlacedBuildings] = useState<PlacedBuilding[]>([]);

  // Planet system positions in 3D
  const systemPositionsRef = useRef<Record<PlanetId, { x: number; y: number; z: number }>>({
    'planet-foundry': { x: 0, y: 0, z: 0 },
    'planet-titanium': { x: 0, y: 0, z: 0 },
    'planet-gas': { x: 0, y: 0, z: 0 },
    'planet-vulcan': { x: 0, y: 0, z: 0 },
  });

  // Populate initial factory belts and buildings
  const initDefaultFactory = useCallback(() => {
    const beltNet = beltNetworkRef.current;
    beltNet.clear();

    const buildings: PlacedBuilding[] = [];
    const bandsCount = gridSystemRef.current.bands.length;
    const equatorBand = Math.floor(bandsCount / 2);

    // 1. Central ILS Tower
    buildings.push({
      id: 1,
      type: 'ILS',
      bandIndex: equatorBand,
      segmentIndex: 10,
      planetId: 'planet-foundry',
      status: 'ACTIVE',
      progress: 1,
      productionCount: 0,
    });

    // 2. Iron Miner Array & Conveyor lines (near Band -6)
    for (let i = 0; i < 4; i++) {
      buildings.push({
        id: 10 + i,
        type: 'MINER',
        bandIndex: equatorBand - 4,
        segmentIndex: 14 + i * 4,
        planetId: 'planet-foundry',
        status: 'ACTIVE',
        progress: 1,
        productionCount: 0,
      });

      // Arc Smelter
      buildings.push({
        id: 20 + i,
        type: 'SMELTER',
        bandIndex: equatorBand - 2,
        segmentIndex: 14 + i * 4,
        planetId: 'planet-foundry',
        status: 'ACTIVE',
        progress: 1,
        productionCount: 0,
      });
    }

    // 3. Ray Receiver harvesting photon energy
    buildings.push({
      id: 50,
      type: 'RAY_RECEIVER',
      bandIndex: equatorBand + 8,
      segmentIndex: 25,
      planetId: 'planet-foundry',
      status: 'ACTIVE',
      progress: 1,
      productionCount: 0,
    });

    // 4. EM-Rail Ejector shooting solar sails
    buildings.push({
      id: 60,
      type: 'EM_EJECTOR',
      bandIndex: equatorBand + 6,
      segmentIndex: 40,
      planetId: 'planet-foundry',
      status: 'ACTIVE',
      progress: 1,
      productionCount: 0,
    });

    // 5. Build initial conveyor belt loops
    for (let b = 0; b < 120; b++) {
      const bandOffset = (b % 16) - 8;
      const bIdx = Math.max(2, Math.min(bandsCount - 3, equatorBand + bandOffset));
      const segStart = (b * 6) % 96;
      const segEnd = segStart + 5;
      const itemType = (b % 4) + 1; // Iron, Copper, Titanium, Silicon
      const speed = (b % 3 === 0) ? 2 : 1;

      beltNet.createBelt(bIdx, segStart, bIdx, segEnd, itemType, speed);
    }

    setPlacedBuildings(buildings);
  }, []);

  useEffect(() => {
    initDefaultFactory();
  }, [initDefaultFactory]);

  // Main simulation tick loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let frameCounter = 0;

    const tick = (currentTime: number) => {
      frameCounter++;
      const dt = currentTime - lastTime;

      if (frameCounter % 15 === 0) {
        setFps(Math.round(1000 / (dt || 16.6)));
      }
      lastTime = currentTime;

      // 1. Advance Planetary Orbits & System Positions (zero React state updates during 60 FPS tick)
      const currentPlanets = planetsRef.current;
      for (const pid of Object.keys(currentPlanets) as PlanetId[]) {
        const p = currentPlanets[pid];
        p.orbitAngle += p.orbitSpeed;
        p.rotationAngle += p.rotationSpeed;

        // Compute 3D orbit position
        const x = Math.cos(p.orbitAngle) * p.orbitRadius;
        const z = Math.sin(p.orbitAngle) * p.orbitRadius;
        const y = Math.sin(p.orbitAngle * 2) * 18; // subtle orbital inclination wave
        systemPositionsRef.current[pid] = { x, y, z };
      }

      // 2. DOD Conveyor Belt Tick (Zero GC)
      beltNetworkRef.current.tick();

      // 3. Interstellar Logistics Station Dispatcher Tick
      dispatcherRef.current.tick(currentPlanets, systemPositionsRef.current);

      // 4. Dyson Engine Tick
      dysonEngineRef.current.tick();

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  // Sample Dyson power generation telemetry every second and sync planetary storage
  useEffect(() => {
    const timer = setInterval(() => {
      const eng = dysonEngineRef.current;
      const now = new Date();
      const timeStr = `${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      setPowerHistory((prev) => {
        const next = [
          ...prev.slice(-18),
          {
            time: timeStr,
            totalPower: eng.totalPowerMW,
            swarmPower: eng.swarmPowerMW,
            shellPower: eng.shellPowerMW,
          },
        ];
        return next;
      });

      // Periodic state sync for logistics modals
      setPlanets({ ...planetsRef.current });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Handlers for building
  const handlePlaceBuilding = (bandIndex: number, segmentIndex: number, type: BuildingType) => {
    if (type === 'NONE') return;

    if (type === 'BELT') {
      // Connect new belt segment on this band
      const newBeltId = beltNetworkRef.current.createBelt(
        bandIndex,
        segmentIndex,
        bandIndex,
        segmentIndex + 4,
        (beltNetworkRef.current.activeBelts % 4) + 1,
        2
      );
      if (newBeltId >= 0) {
        sound.playPlace();
      }
    } else {
      const newBld: PlacedBuilding = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        type,
        bandIndex,
        segmentIndex,
        planetId: currentPlanetId,
        status: 'ACTIVE',
        progress: 1,
        productionCount: 0,
      };
      setPlacedBuildings((prev) => [...prev, newBld]);
      sound.playPlace();
    }
  };

  const handleDemolish = (bandIndex: number, segmentIndex: number) => {
    setPlacedBuildings((prev) =>
      prev.filter((b) => !(b.bandIndex === bandIndex && Math.abs(b.segmentIndex - segmentIndex) <= 2))
    );
  };

  const handleAddBelts = (count: number) => {
    const beltNet = beltNetworkRef.current;
    const bandsCount = gridSystemRef.current.bands.length;
    const equatorBand = Math.floor(bandsCount / 2);

    for (let i = 0; i < count; i++) {
      const bIdx = Math.max(2, Math.min(bandsCount - 3, equatorBand + ((i % 24) - 12)));
      const segStart = (i * 7) % 80;
      const itemType = (i % 6) + 1;
      beltNet.createBelt(bIdx, segStart, bIdx, segStart + 5, itemType, 2);
    }
    sound.playPlace();
  };

  const handleStressTest = () => {
    const beltNet = beltNetworkRef.current;
    beltNet.clear();
    const bandsCount = gridSystemRef.current.bands.length;

    // Massively spawn 800 continuous belts with 38,000 cargo cubes
    for (let b = 0; b < 800; b++) {
      const bIdx = Math.max(1, Math.min(bandsCount - 2, 2 + (b % (bandsCount - 4))));
      const seg = (b * 5) % 100;
      const item = (b % 11) + 1;
      beltNet.createBelt(bIdx, seg, bIdx, seg + 4, item, 3);
    }
    sound.playWarp();
  };

  const handleClearBelts = () => {
    beltNetworkRef.current.clear();
    sound.playClick();
  };

  const toggleAudio = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#050811] text-[#c9d1d9] select-none font-sans">
      {/* 1. Strict Top Bar Contract (3 Zones) */}
      <header className="h-14 border-b border-[#1e293b] bg-[#070c17]/95 backdrop-blur-md px-6 flex items-center justify-between shrink-0 z-30">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-2">
          <span className="font-tech text-base md:text-lg font-bold tracking-wider text-white flex items-center gap-2">
            <Orbit className="w-5 h-5 text-[#00f0ff] animate-spin" style={{ animationDuration: '24s' }} />
            <span>DYSON SPHERE PROGRAM</span>
            <span className="text-[11px] font-mono text-[#58a6ff] font-normal hidden sm:inline">
              / 核心架構模擬器
            </span>
          </span>
        </div>

        {/* Zone 2: 4 Clean Text Navigation Links */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => {
              setViewMode('SYSTEM');
              sound.playClick();
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              viewMode === 'SYSTEM'
                ? 'bg-[#1f6feb] text-white shadow-sm'
                : 'text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#161f30]'
            }`}
          >
            <Orbit className="w-3.5 h-3.5" />
            <span>星系全景宏觀</span>
          </button>

          <button
            onClick={() => {
              setViewMode('PLANET');
              sound.playClick();
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              viewMode === 'PLANET'
                ? 'bg-[#1f6feb] text-white shadow-sm'
                : 'text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#161f30]'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>行星球面網格</span>
          </button>

          <button
            onClick={() => {
              setViewMode('BLUEPRINT');
              sound.playClick();
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              viewMode === 'BLUEPRINT'
                ? 'bg-[#1f6feb] text-white shadow-sm'
                : 'text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#161f30]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>緯度展開投影</span>
          </button>

          <button
            onClick={() => {
              setViewMode('DYSON');
              sound.playClick();
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              viewMode === 'DYSON'
                ? 'bg-[#1f6feb] text-white shadow-sm'
                : 'text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#161f30]'
            }`}
          >
            <Sun className="w-3.5 h-3.5 text-[#ffe066]" />
            <span>戴森球總工程</span>
          </button>
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDispatchModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#111827] border border-[#1e293b] hover:border-[#388bfd] text-[#c9d1d9] hover:text-white rounded-lg transition-colors whitespace-nowrap"
            title="查看跨星系物流調度看板"
          >
            <Radar className="w-3.5 h-3.5 text-[#58a6ff]" />
            <span className="hidden md:inline">物流調度雷達</span>
            {dispatcherRef.current.vessels.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-[#00f0ff] animate-ping" />
            )}
          </button>

          <button
            onClick={() => setIsDocsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#111827] border border-[#1e293b] hover:border-[#00f0ff] text-[#00f0ff] rounded-lg transition-colors whitespace-nowrap"
            title="閱讀 DSP 3 大底層架構原理"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden md:inline">演算法解密</span>
          </button>

          <button
            onClick={toggleAudio}
            className="p-2 bg-[#111827] border border-[#1e293b] hover:bg-[#161f30] text-[#8b949e] hover:text-white rounded-lg transition-colors"
            title={isMuted ? '開啟音效' : '靜音'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-[#58a6ff]" />}
          </button>
        </div>
      </header>

      {/* 2. Main Stage Canvas Viewport */}
      <main className="flex-1 relative overflow-hidden">
        {viewMode === 'SYSTEM' && (
          <SystemView
            planets={planets}
            dispatcher={dispatcherRef.current}
            dysonEngine={dysonEngineRef.current}
            onSelectPlanet={(id) => {
              setCurrentPlanetId(id);
              setViewMode('PLANET');
              sound.playClick();
            }}
            systemPositions={systemPositionsRef.current}
          />
        )}

        {viewMode === 'PLANET' && (
          <PlanetView
            planet={planets[currentPlanetId]}
            gridSystem={gridSystemRef.current}
            beltNetwork={beltNetworkRef.current}
            selectedTool={selectedTool}
            placedBuildings={placedBuildings}
            onPlaceBuilding={handlePlaceBuilding}
            onDemolish={handleDemolish}
            showFaultLines={showFaultLines}
            setShowFaultLines={setShowFaultLines}
            powerHistory={powerHistory}
            dysonEngine={dysonEngineRef.current}
          />
        )}

        {viewMode === 'BLUEPRINT' && (
          <BlueprintView
            planet={planets[currentPlanetId]}
            gridSystem={gridSystemRef.current}
            beltNetwork={beltNetworkRef.current}
            placedBuildings={placedBuildings}
          />
        )}

        {viewMode === 'DYSON' && (
          <DysonArchitectView dysonEngine={dysonEngineRef.current} />
        )}

        {/* Performance & Memory HUD (Top-Left) */}
        <PerformancePanel
          fps={fps}
          beltNetwork={beltNetworkRef.current}
          dispatcher={dispatcherRef.current}
          dysonEngine={dysonEngineRef.current}
          viewMode={viewMode}
          powerHistory={powerHistory}
          onAddBelts={handleAddBelts}
          onClearBelts={handleClearBelts}
          onStressTest={handleStressTest}
        />

        {/* Construction Toolbar (Bottom Center, in Planet Mode) */}
        {viewMode === 'PLANET' && (
          <ConstructionToolbar
            selectedTool={selectedTool}
            onSelectTool={(t) => {
              setSelectedTool(t);
              sound.playClick();
            }}
          />
        )}
      </main>

      {/* 3. Modal Overlays */}
      <LogisticsDispatchModal
        isOpen={isDispatchModalOpen}
        onClose={() => setIsDispatchModalOpen(false)}
        dispatcher={dispatcherRef.current}
        planets={planets}
      />

      <ArchitectureExplanationModal
        isOpen={isDocsModalOpen}
        onClose={() => setIsDocsModalOpen(false)}
      />
    </div>
  );
}
