import { DysonNode, DysonRing } from '../types/dsp';

export interface SolarSailParticle {
  orbitIndex: number;
  theta: number; // orbital angle
  speed: number;
  radius: number;
  inclination: number;
  color: string;
}

export class DysonEngine {
  public rings: DysonRing[] = [];
  public nodes: DysonNode[] = [];
  public sails: SolarSailParticle[] = [];
  public totalPowerMW: number = 0;
  public swarmPowerMW: number = 0;
  public shellPowerMW: number = 0;
  public shellCoverageRatio: number = 0.35; // 35% geodesic coverage
  public isSwarmActive: boolean = true;
  private timeTick: number = 0;

  constructor() {
    this.initDefaultDysonArchitecture();
  }

  public initDefaultDysonArchitecture() {
    this.rings = [
      { id: 1, radius: 150, inclination: 0.26, rotationSpeed: 0.004, sailCount: 380, color: '#00f0ff' },
      { id: 2, radius: 210, inclination: -0.42, rotationSpeed: -0.0028, sailCount: 520, color: '#ffe066' },
      { id: 3, radius: 280, inclination: 0.65, rotationSpeed: 0.0019, sailCount: 650, color: '#a371f7' },
    ];

    // Build frame nodes along Ring 1 & 2
    this.nodes = [];
    let nodeId = 0;
    for (const ring of this.rings) {
      const nodeCount = 16;
      for (let i = 0; i < nodeCount; i++) {
        const theta = (i / nodeCount) * Math.PI * 2;
        this.nodes.push({
          id: nodeId++,
          ringId: ring.id,
          theta,
          powerMW: 18.5,
        });
      }
    }

    // Populate solar sails in orbits
    this.sails = [];
    this.rings.forEach((ring, idx) => {
      for (let s = 0; s < ring.sailCount; s++) {
        this.sails.push({
          orbitIndex: idx,
          theta: Math.random() * Math.PI * 2,
          speed: (0.004 + Math.random() * 0.002) * (idx % 2 === 0 ? 1 : -1),
          radius: ring.radius + (Math.random() - 0.5) * 16,
          inclination: ring.inclination + (Math.random() - 0.5) * 0.08,
          color: ring.color,
        });
      }
    });
  }

  public tick() {
    // 1. Advance solar sails
    for (let i = 0; i < this.sails.length; i++) {
      const sail = this.sails[i];
      sail.theta += sail.speed;
      if (sail.theta > Math.PI * 2) sail.theta -= Math.PI * 2;
      else if (sail.theta < 0) sail.theta += Math.PI * 2;
    }

    // 2. Rotate rings & frame nodes
    for (const ring of this.rings) {
      for (const node of this.nodes) {
        if (node.ringId === ring.id) {
          node.theta += ring.rotationSpeed;
          if (node.theta > Math.PI * 2) node.theta -= Math.PI * 2;
        }
      }
    }

    // 3. Compute live power generation
    this.timeTick += 0.05;
    // Stellar radiation subtle fluctuation (~0.5%)
    const solarFactor = 1 + Math.sin(this.timeTick * 0.4) * 0.015 + Math.cos(this.timeTick * 1.1) * 0.008;

    this.swarmPowerMW = Math.round(this.sails.length * 0.12 * solarFactor * 10) / 10;
    this.shellPowerMW = Math.round(this.nodes.length * 24.6 * (1 + this.shellCoverageRatio * 2.5) * solarFactor * 10) / 10;
    this.totalPowerMW = Math.round((this.swarmPowerMW + this.shellPowerMW) * 10) / 10;
  }

  public launchSail(orbitIndex = 0) {
    if (this.sails.length > 2500) return;
    const ring = this.rings[orbitIndex % this.rings.length];
    this.sails.push({
      orbitIndex,
      theta: 0,
      speed: (0.004 + Math.random() * 0.002) * (orbitIndex % 2 === 0 ? 1 : -1),
      radius: ring.radius + (Math.random() - 0.5) * 12,
      inclination: ring.inclination + (Math.random() - 0.5) * 0.05,
      color: ring.color,
    });
  }

  public addNodeToRing(ringId: number) {
    const ring = this.rings.find((r) => r.id === ringId);
    if (!ring) return;
    const newId = this.nodes.length;
    this.nodes.push({
      id: newId,
      ringId,
      theta: Math.random() * Math.PI * 2,
      powerMW: 19.2,
    });
    this.shellCoverageRatio = Math.min(1.0, this.shellCoverageRatio + 0.02);
  }
}
