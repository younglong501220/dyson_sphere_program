export interface BeltConnection {
  beltId: number;
  fromBand: number;
  fromSeg: number;
  toBand: number;
  toSeg: number;
  nextBeltId?: number;
  speed: number; // 1 = Mk.I, 2 = Mk.II, 4 = Mk.III
  sourceType: number; // item ID generated if source
  targetFacilityId?: number;
}

export class DODBeltNetwork {
  public maxBelts: number;
  public slotsPerBelt: number;
  public activeBelts: number = 0;

  // DOD Core: Continuous TypedArray memory buffer (zero heap allocation during tick)
  public beltItemBuffer: Uint8Array;
  public beltSpeedBuffer: Uint8Array;
  public beltConnections: BeltConnection[] = [];

  // Telemetry & metrics
  public totalCargoCount: number = 0;
  public itemsMovedPerSec: number = 0;
  public lastTickMicros: number = 0;
  private movedCounter: number = 0;
  private lastSecTimestamp: number = performance.now();

  constructor(maxBelts = 2000, slotsPerBelt = 48) {
    this.maxBelts = maxBelts;
    this.slotsPerBelt = slotsPerBelt;

    // Allocate continuous memory up front
    this.beltItemBuffer = new Uint8Array(maxBelts * slotsPerBelt);
    this.beltSpeedBuffer = new Uint8Array(maxBelts);
  }

  public createBelt(
    fromBand: number,
    fromSeg: number,
    toBand: number,
    toSeg: number,
    itemType = 1,
    speed = 1,
    nextBeltId?: number
  ): number {
    if (this.activeBelts >= this.maxBelts) return -1;
    const beltId = this.activeBelts++;

    this.beltSpeedBuffer[beltId] = speed;
    this.beltConnections.push({
      beltId,
      fromBand,
      fromSeg,
      toBand,
      toSeg,
      nextBeltId,
      speed,
      sourceType: itemType,
    });

    // Populate initial cargo in continuous array
    const offset = beltId * this.slotsPerBelt;
    for (let i = 0; i < this.slotsPerBelt; i += 4) {
      this.beltItemBuffer[offset + i] = itemType;
    }

    return beltId;
  }

  public connectBelts(fromId: number, toId: number) {
    if (this.beltConnections[fromId]) {
      this.beltConnections[fromId].nextBeltId = toId;
    }
  }

  /**
   * High-Performance Simulation Tick:
   * 100% Zero JavaScript Heap Allocation.
   * Scans flat Uint8Array buffer in reverse to shift cargo slots forward.
   */
  public tick() {
    const t0 = performance.now();
    let cargoCount = 0;
    const slots = this.slotsPerBelt;
    const active = this.activeBelts;
    const buf = this.beltItemBuffer;
    const speeds = this.beltSpeedBuffer;

    for (let b = 0; b < active; b++) {
      const offset = b * slots;
      const speedSteps = speeds[b] || 1;
      const conn = this.beltConnections[b];

      // Execute speed steps (Mk.I = 1, Mk.II = 2, Mk.III = 3 or 4)
      for (let step = 0; step < speedSteps; step++) {
        // Reverse linear scan across the continuous slot memory
        for (let i = slots - 1; i > 0; i--) {
          const slotIdx = offset + i;
          const prevIdx = slotIdx - 1;

          if (buf[slotIdx] !== 0) {
            cargoCount++;
          }

          // Move cargo forward if space is free
          if (buf[slotIdx] === 0 && buf[prevIdx] !== 0) {
            buf[slotIdx] = buf[prevIdx];
            buf[prevIdx] = 0;
            this.movedCounter++;
          }
        }

        // Check head of belt
        if (buf[offset] !== 0) {
          cargoCount++;
        }

        // End-of-belt handover logic
        const exitSlot = offset + slots - 1;
        const exitingItem = buf[exitSlot];

        if (exitingItem !== 0) {
          if (conn && conn.nextBeltId !== undefined && conn.nextBeltId >= 0 && conn.nextBeltId < active) {
            const nextOffset = conn.nextBeltId * slots;
            if (buf[nextOffset] === 0) {
              buf[nextOffset] = exitingItem;
              buf[exitSlot] = 0;
            }
          } else {
            // Absorbed into consumer/storage
            buf[exitSlot] = 0;
          }
        }

        // Belt start input injection (e.g. from Miner or Smelter output)
        if (buf[offset] === 0 && conn && conn.sourceType > 0) {
          // Probability based injection simulating machine output rate
          if (Math.random() < 0.6) {
            buf[offset] = conn.sourceType;
            cargoCount++;
          }
        }
      }
    }

    this.totalCargoCount = cargoCount;

    // Calculate throughput per second
    const now = performance.now();
    if (now - this.lastSecTimestamp >= 1000) {
      this.itemsMovedPerSec = this.movedCounter;
      this.movedCounter = 0;
      this.lastSecTimestamp = now;
    }

    this.lastTickMicros = (now - t0) * 1000;
  }

  public clear() {
    this.activeBelts = 0;
    this.beltConnections = [];
    this.beltItemBuffer.fill(0);
    this.beltSpeedBuffer.fill(0);
    this.totalCargoCount = 0;
    this.itemsMovedPerSec = 0;
  }

  /**
   * Diagnostic memory metrics for the DOD inspector panel
   */
  public getMemoryStats() {
    const totalBytes = this.beltItemBuffer.byteLength + this.beltSpeedBuffer.byteLength;
    const theoreticalOOPBytes = this.totalCargoCount * 48 + this.activeBelts * 128; // ~48B per JS item object + GC overhead
    return {
      allocatedBytes: totalBytes,
      theoreticalOOPBytes,
      memoryReductionRatio: (theoreticalOOPBytes / Math.max(1, totalBytes)).toFixed(1),
      slotsPerBelt: this.slotsPerBelt,
      totalSlots: this.activeBelts * this.slotsPerBelt,
    };
  }
}
