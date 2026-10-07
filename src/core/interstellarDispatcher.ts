import { LogisticsShip, PlanetData, PlanetId } from '../types/dsp';

export interface DispatchLogEntry {
  id: string;
  timestamp: string;
  shipId: string;
  source: string;
  target: string;
  cargo: string;
  amount: number;
  type: 'DISPATCH' | 'WARP_ENGAGE' | 'ARRIVAL' | 'RETURN';
}

export class InterstellarDispatcher {
  public vessels: LogisticsShip[] = [];
  public dispatchLogs: DispatchLogEntry[] = [];
  public totalDispatchedTrips: number = 0;
  public totalCargoTransported: number = 0;
  public maxVessels: number = 24;

  constructor() {}

  public tick(planets: Record<PlanetId, PlanetData>, systemPositions: Record<PlanetId, { x: number; y: number; z: number }>) {
    // 1. Update existing vessels
    for (let i = this.vessels.length - 1; i >= 0; i--) {
      const ship = this.vessels[i];
      const sourcePos = systemPositions[ship.sourcePlanet] || { x: 0, y: 0, z: 0 };
      const targetPos = systemPositions[ship.targetPlanet] || { x: 0, y: 0, z: 0 };

      if (ship.state === 'OUTBOUND') {
        ship.progress += ship.speed;

        // Curved 3D trajectory with warp apex
        const t = Math.min(1, ship.progress);
        const arcY = Math.sin(t * Math.PI) * 45; // slight arc away from star
        ship.currPos = {
          x: sourcePos.x + (targetPos.x - sourcePos.x) * t,
          y: sourcePos.y + (targetPos.y - sourcePos.y) * t + arcY,
          z: sourcePos.z + (targetPos.z - sourcePos.z) * t,
        };

        if (ship.progress >= 1.0) {
          ship.state = 'UNLOADING';
          ship.progress = 1.0;
          
          // Unload cargo to target planet's ILS storage
          const targetStation = planets[ship.targetPlanet]?.ilsStorage[ship.itemId];
          if (targetStation) {
            targetStation.remote = Math.min(targetStation.max, targetStation.remote + ship.amount);
          }
          this.totalCargoTransported += ship.amount;

          this.addLog({
            shipId: ship.id,
            source: planets[ship.sourcePlanet]?.name || ship.sourcePlanet,
            target: planets[ship.targetPlanet]?.name || ship.targetPlanet,
            cargo: `Item #${ship.itemId}`,
            amount: ship.amount,
            type: 'ARRIVAL',
          });

          // Begin return voyage
          setTimeout(() => {
            ship.state = 'RETURNING';
          }, 600);
        }
      } else if (ship.state === 'RETURNING') {
        ship.progress -= ship.speed;
        const t = Math.max(0, ship.progress);
        const arcY = Math.sin(t * Math.PI) * -35;
        ship.currPos = {
          x: sourcePos.x + (targetPos.x - sourcePos.x) * t,
          y: sourcePos.y + (targetPos.y - sourcePos.y) * t + arcY,
          z: sourcePos.z + (targetPos.z - sourcePos.z) * t,
        };

        if (ship.progress <= 0.0) {
          ship.state = 'DOCKING';
          this.addLog({
            shipId: ship.id,
            source: planets[ship.sourcePlanet]?.name || ship.sourcePlanet,
            target: planets[ship.targetPlanet]?.name || ship.targetPlanet,
            cargo: `Empty Return`,
            amount: 0,
            type: 'RETURN',
          });
          // Remove docked vessel
          this.vessels.splice(i, 1);
        }
      }
    }

    // 2. Dispatch Matcher: Search for supply-demand pairing across all ILS stations
    if (this.vessels.length < this.maxVessels) {
      const planetIds = Object.keys(planets) as PlanetId[];

      for (const demandPlanetId of planetIds) {
        const demandPlanet = planets[demandPlanetId];
        if (!demandPlanet) continue;

        for (const [rawItemId, demandSlot] of Object.entries(demandPlanet.ilsStorage)) {
          const itemId = Number(rawItemId);
          if (demandSlot.role !== 'DEMAND' || demandSlot.remote >= demandSlot.max - 800) continue;

          // Find a supplying station on another planet
          for (const supplyPlanetId of planetIds) {
            if (supplyPlanetId === demandPlanetId) continue;
            const supplyPlanet = planets[supplyPlanetId];
            if (!supplyPlanet) continue;

            const supplySlot = supplyPlanet.ilsStorage[itemId];
            if (supplySlot && supplySlot.role === 'SUPPLY' && supplySlot.remote >= 1000) {
              // Dispatch Warp Vessel!
              const batchAmount = 1000;
              supplySlot.remote -= batchAmount;

              const shipId = `VESSEL-${Math.floor(100 + Math.random() * 900)}`;
              const newShip: LogisticsShip = {
                id: shipId,
                sourcePlanet: supplyPlanetId,
                targetPlanet: demandPlanetId,
                itemId,
                amount: batchAmount,
                progress: 0,
                isWarp: true,
                speed: 0.0035,
                state: 'OUTBOUND',
                currPos: { ...(systemPositions[supplyPlanetId] || { x: 0, y: 0, z: 0 }) },
              };

              this.vessels.push(newShip);
              this.totalDispatchedTrips++;

              this.addLog({
                shipId,
                source: supplyPlanet.name,
                target: demandPlanet.name,
                cargo: `Item #${itemId}`,
                amount: batchAmount,
                type: 'DISPATCH',
              });

              return; // 1 dispatch per tick check to spread out departures
            }
          }
        }
      }
    }
  }

  private addLog(entry: Omit<DispatchLogEntry, 'id' | 'timestamp'>) {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${Math.floor(now.getMilliseconds() / 100)}`;
    this.dispatchLogs.unshift({
      id: Math.random().toString(36).substring(2, 9),
      timestamp: timeStr,
      ...entry,
    });
    if (this.dispatchLogs.length > 25) {
      this.dispatchLogs.pop();
    }
  }
}
