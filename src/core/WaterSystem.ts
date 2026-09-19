import * as THREE from 'three';
import { GeoCoords } from './geoCoords';
import { disposeHierarchy } from '../graphics/disposeUtils';

export interface WaterPolygon {
  id: string;
  points: { x: number; z: number }[];
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  type: 'river' | 'lake' | 'pond' | 'canal' | 'sea';
}

/**
 * WaterSystem: Authoritative manager for water bodies and exclusion masks.
 * Prevents trees, buildings, roads (unless on bridge), and ground objects
 * from ever spawning inside water bodies.
 */
export class WaterSystem {
  public group: THREE.Group;
  public polygons: WaterPolygon[] = [];
  private spatialGrid: Map<string, WaterPolygon[]> = new Map();
  private readonly GRID_SIZE = 500;
  private originLat: number;
  private originLng: number;

  constructor(originLat: number, originLng: number) {
    this.originLat = originLat;
    this.originLng = originLng;

    this.group = new THREE.Group();
    this.group.name = 'water-system';
  }

  public setOrigin(lat: number, lng: number) {
    this.originLat = lat;
    this.originLng = lng;
    this.clear();
  }

  /**
   * Registers a water polygon or waterway corridor.
   */
  public addWaterBody(
    id: string,
    coords: [number, number][], // [lng, lat][]
    type: 'river' | 'lake' | 'pond' | 'canal' | 'sea' = 'river'
  ) {
    if (coords.length < 3) return;
    if (this.polygons.some((p) => p.id === id)) return;

    const points = coords.map((c) => {
      const { x, z } = GeoCoords.toLocalMeters(c[1], c[0], this.originLat, this.originLng);
      return { x, z };
    });

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    }

    const poly: WaterPolygon = {
      id,
      points,
      minX,
      maxX,
      minZ,
      maxZ,
      type,
    };

    this.polygons.push(poly);
    this.registerPolygonGrid(poly);
  }

  /**
   * Buffers a linear waterway (river/canal/stream) into a 2D water polygon.
   */
  public addWaterway(
    id: string,
    coords: [number, number][], // [lng, lat][]
    widthMeters = 18
  ) {
    if (coords.length < 2) return;
    if (this.polygons.some((p) => p.id === id)) return;

    const halfW = widthMeters * 0.5;
    const localPts = coords.map((c) =>
      GeoCoords.toLocalMeters(c[1], c[0], this.originLat, this.originLng)
    );

    const leftEdge: { x: number; z: number }[] = [];
    const rightEdge: { x: number; z: number }[] = [];

    for (let i = 0; i < localPts.length; i++) {
      const p = localPts[i];
      let dx = 0;
      let dz = 0;

      if (i === 0) {
        dx = localPts[1].x - p.x;
        dz = localPts[1].z - p.z;
      } else if (i === localPts.length - 1) {
        dx = p.x - localPts[i - 1].x;
        dz = p.z - localPts[i - 1].z;
      } else {
        dx = localPts[i + 1].x - localPts[i - 1].x;
        dz = localPts[i + 1].z - localPts[i - 1].z;
      }

      const len = Math.hypot(dx, dz) || 1;
      const nx = -dz / len;
      const nz = dx / len;

      leftEdge.push({ x: p.x + nx * halfW, z: p.z + nz * halfW });
      rightEdge.push({ x: p.x - nx * halfW, z: p.z - nz * halfW });
    }

    const polyPoints = [...leftEdge, ...rightEdge.reverse()];
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const p of polyPoints) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    }

    const poly: WaterPolygon = {
      id,
      points: polyPoints,
      minX,
      maxX,
      minZ,
      maxZ,
      type: 'canal',
    };
    this.polygons.push(poly);
    this.registerPolygonGrid(poly);
  }

  private registerPolygonGrid(poly: WaterPolygon) {
    const minCol = Math.floor(poly.minX / this.GRID_SIZE);
    const maxCol = Math.floor(poly.maxX / this.GRID_SIZE);
    const minRow = Math.floor(poly.minZ / this.GRID_SIZE);
    const maxRow = Math.floor(poly.maxZ / this.GRID_SIZE);

    for (let c = minCol; c <= maxCol; c++) {
      for (let r = minRow; r <= maxRow; r++) {
        const key = `${c},${r}`;
        if (!this.spatialGrid.has(key)) this.spatialGrid.set(key, []);
        this.spatialGrid.get(key)!.push(poly);
      }
    }
  }

  /**
   * Tests whether a local meter coordinate (x, z) falls inside any water body.
   * margin > 0 adds an exclusion shoreline buffer.
   */
  public isPointInWater(x: number, z: number, margin = 0): boolean {
    const minCol = Math.floor((x - margin) / this.GRID_SIZE);
    const maxCol = Math.floor((x + margin) / this.GRID_SIZE);
    const minRow = Math.floor((z - margin) / this.GRID_SIZE);
    const maxRow = Math.floor((z + margin) / this.GRID_SIZE);

    const checked = new Set<string>();

    for (let c = minCol; c <= maxCol; c++) {
      for (let r = minRow; r <= maxRow; r++) {
        const key = `${c},${r}`;
        const polys = this.spatialGrid.get(key);
        if (!polys) continue;

        for (const poly of polys) {
          if (checked.has(poly.id)) continue;
          checked.add(poly.id);

          // 1. Fast AABB Bounding Box Rejection
          if (
            x < poly.minX - margin ||
            x > poly.maxX + margin ||
            z < poly.minZ - margin ||
            z > poly.maxZ + margin
          ) {
            continue;
          }

          // 2. Exact Ray-Casting Point-in-Polygon Algorithm
          if (this.pointInPolygon(x, z, poly.points)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * Computes shortest distance from (x, z) to nearest water edge.
   */
  public distanceToWater(x: number, z: number): number {
    const res = this.getDistanceToWater(x, z);
    return res ? res.distance : Infinity;
  }

  public getDistanceToWater(
    x: number,
    z: number
  ): { distance: number; nearestX: number; nearestZ: number } | null {
    let minDistance = Infinity;
    let nearestX = x;
    let nearestZ = z;

    const col = Math.floor(x / this.GRID_SIZE);
    const row = Math.floor(z / this.GRID_SIZE);
    const checked = new Set<string>();

    // Check 3x3 neighborhood (covers up to 500m search distance)
    for (let c = col - 1; c <= col + 1; c++) {
      for (let r = row - 1; r <= row + 1; r++) {
        const key = `${c},${r}`;
        const polys = this.spatialGrid.get(key);
        if (!polys) continue;

        for (const poly of polys) {
          if (checked.has(poly.id)) continue;
          checked.add(poly.id);

          for (let i = 0; i < poly.points.length; i++) {
            const p1 = poly.points[i];
            const p2 = poly.points[(i + 1) % poly.points.length];
            const dist = this.distToSegment(x, z, p1.x, p1.z, p2.x, p2.z);
            if (dist < minDistance) {
              minDistance = dist;
              nearestX = (p1.x + p2.x) * 0.5;
              nearestZ = (p1.z + p2.z) * 0.5;
            }
          }
        }
      }
    }

    if (minDistance === Infinity) return null;
    return { distance: minDistance, nearestX, nearestZ };
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

  private distToSegment(
    px: number,
    pz: number,
    x1: number,
    z1: number,
    x2: number,
    z2: number
  ): number {
    const l2 = (x2 - x1) ** 2 + (z2 - z1) ** 2;
    if (l2 === 0) return Math.hypot(px - x1, pz - z1);
    let t = ((px - x1) * (x2 - x1) + (pz - z1) * (z2 - z1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), pz - (z1 + t * (z2 - z1)));
  }

  public buildWaterMeshes(terrainEngine?: any) {
    // Clear existing meshes
    for (let i = this.group.children.length - 1; i >= 0; i--) {
      const child = this.group.children[i];
      this.group.remove(child);
      disposeHierarchy(child);
    }

    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6, // bright blue
      transparent: true,
      opacity: 0.85,
      roughness: 0.1,
      metalness: 0.8,
      polygonOffset: true,
      polygonOffsetFactor: -1, // Pull water slightly above terrain to avoid z-fighting
    });

    for (const poly of this.polygons) {
      if (poly.points.length < 3) continue;

      const shape = new THREE.Shape();
      shape.moveTo(poly.points[0].x, poly.points[0].z);
      for (let i = 1; i < poly.points.length; i++) {
        shape.lineTo(poly.points[i].x, poly.points[i].z);
      }
      shape.closePath();

      const geo = new THREE.ShapeGeometry(shape);
      
      // We must rotate it to lay flat on XZ plane
      geo.rotateX(-Math.PI / 2);

      // Now sample terrain for elevation, if terrainEngine is provided
      if (terrainEngine) {
        const posAttr = geo.attributes.position;
        let avgElev = 0;
        
        // Find average elevation for the polygon
        for (let i = 0; i < posAttr.count; i++) {
          const vx = posAttr.getX(i);
          const vz = posAttr.getZ(i);
          avgElev += terrainEngine.getElevation(vx, vz);
        }
        avgElev /= posAttr.count;

        // Apply a slightly lowered average elevation to make it act like a water body (flat)
        // Water shouldn't conform to hills, it should be flat, so we use average or lowest point.
        // Actually, we use the average elevation - 0.2m to nestle it in.
        const waterLevel = avgElev - 0.2;
        
        for (let i = 0; i < posAttr.count; i++) {
          posAttr.setY(i, waterLevel);
        }
        geo.computeVertexNormals();
      }

      const mesh = new THREE.Mesh(geo, waterMat);
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }
  }

  public clear() {
    for (let i = this.group.children.length - 1; i >= 0; i--) {
      const child = this.group.children[i];
      this.group.remove(child);
      disposeHierarchy(child);
    }
    this.polygons = [];
    this.spatialGrid.clear();
  }

  public destroy() {
    this.clear();
    disposeHierarchy(this.group);
  }
}
