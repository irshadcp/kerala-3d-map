import { GeoCoords } from './geoCoords';
import { RoadGraph } from './RoadGraph';

export interface RoadCorridorSegment {
  id: string;
  p1: { x: number; z: number };
  p2: { x: number; z: number };
  dx: number;
  dz: number;
  length: number;
  nx: number;
  nz: number;
  roadClass: string;
  asphaltWidth: number;
  sideClearance: number;
  totalCorridorWidth: number;
  polygon: { x: number; z: number }[]; // 4-corner buffered corridor polygon
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * RoadCorridorSystem: Models roads as full 2D geometric corridors:
 * Centerline -> Asphalt Width -> Lanes -> Side Clearance -> Parking & Setback.
 * Ensures zero building encroachment into vehicular road surfaces.
 */
export class RoadCorridorSystem {
  private segments: RoadCorridorSegment[] = [];
  private originLat: number;
  private originLng: number;

  constructor(originLat: number, originLng: number) {
    this.originLat = originLat;
    this.originLng = originLng;
  }

  public setOrigin(lat: number, lng: number) {
    this.originLat = lat;
    this.originLng = lng;
    this.clear();
  }

  public static getWidthForHighwayClass(tags: Record<string, any>): { asphaltWidth: number; sideClearance: number } {
    const { roadClass, width } = RoadGraph.parseRoadProperties(tags);
    
    // Add realistic side clearance (sidewalks + shoulder + parking)
    let sideClearance = 3.0;
    if (roadClass === 'motorway' || roadClass === 'trunk') sideClearance = 4.5;
    if (roadClass === 'service' || roadClass === 'path') sideClearance = 1.5;
    
    return { asphaltWidth: width, sideClearance };
  }

  /**
   * Ingests road coordinates from OSM and constructs full 2D corridor polygons.
   */
  public addRoadFeature(
    points: [number, number][], // [lng, lat][]
    tags: Record<string, string>,
    originLat = this.originLat,
    originLng = this.originLng
  ) {
    if (points.length < 2) return;

    this.originLat = originLat;
    this.originLng = originLng;

    const highway = tags.highway || 'residential';
    const { roadClass } = RoadGraph.parseRoadProperties(tags);
    if (roadClass === 'service' || roadClass === 'path') return; // Exclude all service roads

    const { asphaltWidth, sideClearance } = RoadCorridorSystem.getWidthForHighwayClass(tags);
    const totalHalfWidth = (asphaltWidth / 2.0) + sideClearance;

    const localPoints = points.map((p) => {
      const { x, z } = GeoCoords.toLocalMeters(p[1], p[0], originLat, originLng);
      return { x, z };
    });

    for (let i = 0; i < localPoints.length - 1; i++) {
      const p1 = localPoints[i];
      const p2 = localPoints[i + 1];
      const dx = p2.x - p1.x;
      const dz = p2.z - p1.z;
      const length = Math.hypot(dx, dz);
      if (length < 0.5) continue;

      // Normal vector perpendicular to centerline
      const nx = -dz / length;
      const nz = dx / length;

      // 4 corners of buffered corridor polygon
      const c1 = { x: p1.x + nx * totalHalfWidth, z: p1.z + nz * totalHalfWidth };
      const c2 = { x: p2.x + nx * totalHalfWidth, z: p2.z + nz * totalHalfWidth };
      const c3 = { x: p2.x - nx * totalHalfWidth, z: p2.z - nz * totalHalfWidth };
      const c4 = { x: p1.x - nx * totalHalfWidth, z: p1.z - nz * totalHalfWidth };
      const polygon = [c1, c2, c3, c4];

      const minX = Math.min(c1.x, c2.x, c3.x, c4.x);
      const maxX = Math.max(c1.x, c2.x, c3.x, c4.x);
      const minZ = Math.min(c1.z, c2.z, c3.z, c4.z);
      const maxZ = Math.max(c1.z, c2.z, c3.z, c4.z);

      this.segments.push({
        id: `corridor-${tags.id || Math.random()}-${i}`,
        p1,
        p2,
        dx,
        dz,
        length,
        nx,
        nz,
        roadClass: highway,
        asphaltWidth,
        sideClearance,
        totalCorridorWidth: totalHalfWidth * 2.0,
        polygon,
        minX,
        maxX,
        minZ,
        maxZ,
      });
    }
  }

  /**
   * Tests whether a coordinate (x, z) falls inside any road corridor.
   * Essential for tree and street prop exclusion!
   */
  public isPointInRoadCorridor(x: number, z: number): boolean {
    for (const seg of this.segments) {
      if (x < seg.minX || x > seg.maxX || z < seg.minZ || z > seg.maxZ) {
        continue;
      }
      if (this.pointInPolygon(x, z, seg.polygon)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Resolves building footprint encroachment against the road corridor.
   * If any building vertex penetrates inside the road corridor, calculates
   * the exact push vector along the road normal to seat the building on roadside land.
   */
  public resolveBuildingEncroachment(
    buildingPolygon: { x: number; z: number }[],
    centerX: number,
    centerZ: number
  ): { shiftX: number; shiftZ: number; encroached: boolean } {
    let maxPenetration = 0;
    let bestNormalX = 0;
    let bestNormalZ = 0;

    for (const seg of this.segments) {
      // Fast AABB check against corridor
      const bMinX = centerX - 25, bMaxX = centerX + 25;
      const bMinZ = centerZ - 25, bMaxZ = centerZ + 25;
      if (bMaxX < seg.minX || bMinX > seg.maxX || bMaxZ < seg.minZ || bMinZ > seg.maxZ) {
        continue;
      }

      const totalHalfWidth = seg.totalCorridorWidth / 2.0;

      for (const pt of buildingPolygon) {
        // Distance from vertex to centerline segment
        const vx = pt.x - seg.p1.x;
        const vz = pt.z - seg.p1.z;
        const segLenSq = seg.length * seg.length;

        let t = (vx * seg.dx + vz * seg.dz) / segLenSq;
        t = Math.max(0, Math.min(1, t));

        const projX = seg.p1.x + t * seg.dx;
        const projZ = seg.p1.z + t * seg.dz;
        const dist = Math.hypot(pt.x - projX, pt.z - projZ);

        if (dist < totalHalfWidth) {
          const penetration = totalHalfWidth - dist;
          if (penetration > maxPenetration) {
            maxPenetration = penetration;

            // Determine which side of the centerline the building is on
            const toCenterX = centerX - projX;
            const toCenterZ = centerZ - projZ;
            const dot = toCenterX * seg.nx + toCenterZ * seg.nz;
            const pushSign = dot >= 0 ? 1 : -1;

            bestNormalX = seg.nx * pushSign;
            bestNormalZ = seg.nz * pushSign;
          }
        }
      }
    }

    if (maxPenetration > 0) {
      return {
        shiftX: bestNormalX * (maxPenetration + 0.8), // Add 80cm safety margin
        shiftZ: bestNormalZ * (maxPenetration + 0.8),
        encroached: true,
      };
    }

    return { shiftX: 0, shiftZ: 0, encroached: false };
  }

  private pointInPolygon(x: number, z: number, vs: { x: number; z: number }[]): boolean {
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      const xi = vs[i].x, zi = vs[i].z;
      const xj = vs[j].x, zj = vs[j].z;
      const intersect = zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  public clear() {
    this.segments = [];
  }

  /**
   * Generates formatted geometric polygons for all road corridors, 
   * expanding them by a safety buffer, to be used in Polygon Subtraction.
   * Format matches what polygon-clipping library expects: [[[x,y], [x,y], ...]]
   */
  public getCorridorPolygonsForClipping(bufferMeters: number): { minX: number, maxX: number, minZ: number, maxZ: number, geom: [number, number][][] }[] {
    return this.segments.map(seg => {
      const hw = (seg.totalCorridorWidth / 2.0) + bufferMeters;
      
      const dx = seg.p2.x - seg.p1.x;
      const dz = seg.p2.z - seg.p1.z;
      const len = Math.hypot(dx, dz);
      
      let dirX = 0, dirZ = 0;
      if (len > 0.001) {
         dirX = dx / len;
         dirZ = dz / len;
      }

      // Extend segment longitudinally by hw to close V-gaps at outside corners
      const p1x = seg.p1.x - dirX * hw;
      const p1z = seg.p1.z - dirZ * hw;
      const p2x = seg.p2.x + dirX * hw;
      const p2z = seg.p2.z + dirZ * hw;
      
      const c1 = { x: p1x + seg.nx * hw, z: p1z + seg.nz * hw };
      const c2 = { x: p2x + seg.nx * hw, z: p2z + seg.nz * hw };
      const c3 = { x: p2x - seg.nx * hw, z: p2z - seg.nz * hw };
      const c4 = { x: p1x - seg.nx * hw, z: p1z - seg.nz * hw };

      // Ensure closure for polygon-clipping
      const geom: [number, number][][] = [[
        [c1.x, c1.z],
        [c2.x, c2.z],
        [c3.x, c3.z],
        [c4.x, c4.z],
        [c1.x, c1.z]
      ]];

      const minX = Math.min(c1.x, c2.x, c3.x, c4.x);
      const maxX = Math.max(c1.x, c2.x, c3.x, c4.x);
      const minZ = Math.min(c1.z, c2.z, c3.z, c4.z);
      const maxZ = Math.max(c1.z, c2.z, c3.z, c4.z);

      return { minX, maxX, minZ, maxZ, geom };
    });
  }
}
