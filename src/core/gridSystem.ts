export interface LatitudeBand {
  latIndex: number;      // -L to +L
  latAngle: number;      // -PI/2 to +PI/2
  cosLat: number;
  sinLat: number;
  segments: number;      // Count of cells in this ring
  isFaultLineAbove: boolean;
  stepRatio: number;     // Ratio of segments change
}

export class SphericalGridSystem {
  public radius: number;
  public baseSegments: number;
  public latBandsCount: number;
  public bands: LatitudeBand[] = [];
  public faultBandIndices: Set<number> = new Set();

  constructor(radius = 160, baseSegments = 120, latBandsCount = 36) {
    this.radius = radius;
    this.baseSegments = baseSegments;
    this.latBandsCount = latBandsCount;
    this.initGridBands();
  }

  public initGridBands() {
    this.bands = [];
    this.faultBandIndices.clear();

    for (let i = -this.latBandsCount; i <= this.latBandsCount; i++) {
      const latRatio = i / this.latBandsCount;
      const latAngle = (latRatio * Math.PI) / 2;
      const cosLat = Math.cos(latAngle);
      const sinLat = Math.sin(latAngle);

      // DSP Core Algorithm: segments proportional to cos(lat), quantized in multiples of 4
      let segments = Math.max(4, Math.floor((this.baseSegments * cosLat) / 4) * 4);

      const band: LatitudeBand = {
        latIndex: i,
        latAngle,
        cosLat,
        sinLat,
        segments,
        isFaultLineAbove: false,
        stepRatio: 1,
      };

      this.bands.push(band);
    }

    // Identify fault lines
    for (let b = 0; b < this.bands.length - 1; b++) {
      const curr = this.bands[b];
      const next = this.bands[b + 1];
      if (curr.segments !== next.segments) {
        curr.isFaultLineAbove = true;
        curr.stepRatio = next.segments / curr.segments;
        this.faultBandIndices.add(b);
      }
    }
  }

  /**
   * Convert spherical grid indices to 3D Cartesian coordinates with optional globe rotation
   */
  public gridTo3D(
    bandIndex: number,
    segmentIndex: number,
    center = { x: 0, y: 0, z: 0 },
    radiusOffset = 0,
    rotY = 0,
    rotX = 0
  ) {
    const band = this.bands[Math.max(0, Math.min(this.bands.length - 1, bandIndex))];
    const seg = ((segmentIndex % band.segments) + band.segments) % band.segments;
    const lonAngle = (seg / band.segments) * Math.PI * 2;
    const r = this.radius + radiusOffset;

    // Base sphere coordinates (Y-up, Z-forward, X-right)
    const bx = r * band.cosLat * Math.sin(lonAngle);
    const by = r * band.sinLat;
    const bz = r * band.cosLat * Math.cos(lonAngle);

    // Apply Y-axis rotation (planetary self-rotation)
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);
    const x1 = bx * cosY - bz * sinY;
    const z1 = bx * sinY + bz * cosY;

    // Apply X-axis tilt (axial tilt or camera pitch)
    const cosX = Math.cos(rotX);
    const sinX = Math.sin(rotX);
    const y2 = by * cosX - z1 * sinX;
    const z2 = by * sinX + z1 * cosX;

    return {
      x: center.x + x1,
      y: center.y + y2,
      z: center.z + z2,
    };
  }

  /**
   * Get 4 corner coordinates of a single grid cell in 3D
   */
  public getCellCorners3D(
    bandIndex: number,
    segmentIndex: number,
    center = { x: 0, y: 0, z: 0 },
    radiusOffset = 0,
    rotY = 0,
    rotX = 0
  ) {
    if (bandIndex < 0 || bandIndex >= this.bands.length) return null;
    const band = this.bands[bandIndex];
    const nextBandIdx = Math.min(this.bands.length - 1, bandIndex + 1);
    const nextBand = this.bands[nextBandIdx];

    const segRatio = (segmentIndex % band.segments) / band.segments;
    const nextSeg = Math.floor(segRatio * nextBand.segments);

    const c1 = this.gridTo3D(bandIndex, segmentIndex, center, radiusOffset, rotY, rotX);
    const c2 = this.gridTo3D(bandIndex, segmentIndex + 1, center, radiusOffset, rotY, rotX);
    const c3 = this.gridTo3D(nextBandIdx, nextSeg + 1, center, radiusOffset, rotY, rotX);
    const c4 = this.gridTo3D(nextBandIdx, nextSeg, center, radiusOffset, rotY, rotX);

    return [c1, c2, c3, c4];
  }

  /**
   * Raycast 2D screen coordinate against the sphere to find the intersected (bandIndex, segmentIndex)
   */
  public raycast(
    screenX: number,
    screenY: number,
    cx: number,
    cy: number,
    rotY = 0,
    rotX = 0
  ): { bandIndex: number; segmentIndex: number; latDeg: number; lonDeg: number; isFault: boolean } | null {
    const dx = screenX - cx;
    const dy = screenY - cy;
    const distSq = dx * dx + dy * dy;
    const rSq = this.radius * this.radius;

    // If outside the 2D projected sphere disc
    if (distSq > rSq) return null;

    // Compute sphere intersection point (front hemisphere: z > 0)
    const z = Math.sqrt(rSq - distSq);
    const x = dx;
    const y = dy;

    // Inverse rotation: first undo X rotation, then undo Y rotation
    const cosX = Math.cos(-rotX);
    const sinX = Math.sin(-rotX);
    const y1 = y * cosX - z * sinX;
    const z1 = y * sinX + z * cosX;

    const cosY = Math.cos(-rotY);
    const sinY = Math.sin(-rotY);
    const ox = x * cosY - z1 * sinY;
    const oz = x * sinY + z1 * cosY;
    const oy = y1;

    // Convert (ox, oy, oz) back to spherical coordinates
    const latAngle = Math.asin(Math.max(-1, Math.min(1, oy / this.radius)));
    let lonAngle = Math.atan2(ox, oz);
    if (lonAngle < 0) lonAngle += Math.PI * 2;

    // Find closest bandIndex
    const latRatio = latAngle / (Math.PI / 2);
    const rawBand = Math.round(latRatio * this.latBandsCount);
    const bandIndex = Math.max(0, Math.min(this.bands.length - 1, rawBand + this.latBandsCount));

    const band = this.bands[bandIndex];
    const segmentIndex = Math.floor((lonAngle / (Math.PI * 2)) * band.segments) % band.segments;

    const latDeg = Math.round((latAngle * 180) / Math.PI);
    const lonDeg = Math.round((lonAngle * 180) / Math.PI);
    const isFault = band.isFaultLineAbove || this.faultBandIndices.has(bandIndex);

    return { bandIndex, segmentIndex, latDeg, lonDeg, isFault };
  }
}
