import maplibregl from 'maplibre-gl';
import { GeoCoords } from '../core/geoCoords';

export interface Point2D {
  x: number;
  z: number;
}

export interface BuildingObstacle {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  rings: Point2D[][]; // outer ring + inner rings
  height: number;
  isCommercial?: boolean;
}

interface RoadObstacle {
  p1: Point2D;
  p2: Point2D;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  buffer: number; // required clearance distance in meters
}

export interface WaterObstacle {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  rings: Point2D[][];
}

export interface ExtractedRoad {
  p1: Point2D;
  p2: Point2D;
  length: number;
  angle: number;
  roadClass: string;
  buffer: number;
}

const BUCKET_SIZE = 50; // 50m spatial hash cells

import { ZoneClassifier, KeralaZoneType, LocalAreaContext, isKeralaOceanCoastline } from '../core/ZoneClassifier';

export class SpatialObstacleMap {
  private buildingBuckets = new Map<string, BuildingObstacle[]>();
  private roadBuckets = new Map<string, RoadObstacle[]>();
  private waterBuckets = new Map<string, WaterObstacle[]>();
  private landcoverBuckets = new Map<string, Set<string>>();
  private commercialBuckets = new Set<string>();
  
  public roads: ExtractedRoad[] = [];
  public waterObstacles: WaterObstacle[] = [];
  public totalBuildings = 0;
  public totalRoads = 0;
  public isReady = false;

  private lastLat = 0;
  private lastLng = 0;

  private getBucketKey(cellX: number, cellZ: number): string {
    return `${cellX},${cellZ}`;
  }

  public update(map: maplibregl.Map, originLat: number, originLng: number): boolean {
    if (!map || !map.isStyleLoaded()) return false;

    // Check if map source is loaded
    try {
      if (!map.isSourceLoaded('openmaptiles')) return false;
    } catch {
      return false;
    }

    const dist = GeoCoords.distanceMeters(originLat, originLng, this.lastLat, this.lastLng);
    // Don't recompute if we haven't moved and we already have obstacles
    if (dist < 80 && this.isReady && (this.totalBuildings > 0 || this.totalRoads > 0)) {
      return false;
    }

    // Query all raw vector tile features from loaded tiles
    let buildingFeatures: maplibregl.MapGeoJSONFeature[] = [];
    let roadFeatures: maplibregl.MapGeoJSONFeature[] = [];
    let waterFeatures: maplibregl.MapGeoJSONFeature[] = [];

    try {
      buildingFeatures = map.querySourceFeatures('openmaptiles', { sourceLayer: 'building' });
      roadFeatures = map.querySourceFeatures('openmaptiles', { sourceLayer: 'transportation' });
      waterFeatures = map.querySourceFeatures('openmaptiles', { sourceLayer: 'water' });
      const landcoverFeatures = map.querySourceFeatures('openmaptiles', { sourceLayer: 'landcover' });
      const landuseFeatures = map.querySourceFeatures('openmaptiles', { sourceLayer: 'landuse' });

      // Process landcover tags into spatial buckets
      for (const feat of landcoverFeatures) {
        const subclass = (feat.properties?.subclass || feat.properties?.class || '') as string;
        if (!subclass || !feat.geometry) continue;
        const coords = (feat.geometry as any).coordinates;
        this.addTagToBuckets(coords, subclass, originLat, originLng);
      }

      // Process landuse tags (commercial, residential, industrial)
      for (const feat of landuseFeatures) {
        const luClass = (feat.properties?.class || '') as string;
        if (luClass === 'commercial' || luClass === 'retail') {
          const coords = (feat.geometry as any).coordinates;
          this.addTagToBuckets(coords, 'commercial', originLat, originLng);
        }
      }
    } catch {
      return false;
    }

    if (buildingFeatures.length === 0 && roadFeatures.length === 0) {
      return false; // Tiles not ready yet
    }

    this.buildingBuckets.clear();
    this.roadBuckets.clear();
    this.waterBuckets.clear();
    this.landcoverBuckets.clear();
    this.commercialBuckets.clear();
    this.roads = [];
    this.waterObstacles = [];
    this.totalBuildings = buildingFeatures.length;
    this.totalRoads = roadFeatures.length;
    this.lastLat = originLat;
    this.lastLng = originLng;

    // 1. Process Buildings (Polygons & MultiPolygons)
    for (const feat of buildingFeatures) {
      if (!feat.geometry) continue;
      const type = feat.geometry.type;
      const coords = (feat.geometry as any).coordinates;
      if (!coords) continue;

      const height = Number(feat.properties?.render_height || feat.properties?.height || 8);
      const isCommercial = feat.properties?.class === 'commercial' || feat.properties?.class === 'retail' || feat.properties?.type === 'commercial' || feat.properties?.type === 'retail';

      if (type === 'Polygon') {
        this.addBuildingPolygon(coords, originLat, originLng, height, isCommercial);
      } else if (type === 'MultiPolygon') {
        for (const poly of coords) {
          this.addBuildingPolygon(poly, originLat, originLng, height, isCommercial);
        }
      }
    }

    // 2. Process Roads (LineStrings & MultiLineStrings)
    for (const feat of roadFeatures) {
      if (!feat.geometry) continue;
      const type = feat.geometry.type;
      const coords = (feat.geometry as any).coordinates;
      if (!coords) continue;

      const roadClass = feat.properties?.class || 'minor';
      // Buffer width in meters from road centerline
      let buffer = 7; // default for minor/residential
      if (roadClass === 'motorway' || roadClass === 'trunk') {
        buffer = 18; // Highway carriageways + green medians/verges
      } else if (roadClass === 'primary') {
        buffer = 14;
      } else if (roadClass === 'secondary' || roadClass === 'tertiary') {
        buffer = 10;
      } else if (roadClass === 'service' || roadClass === 'track' || roadClass === 'path') {
        buffer = 5;
      }

      if (type === 'LineString') {
        this.addRoadLine(coords, buffer, roadClass, originLat, originLng);
      } else if (type === 'MultiLineString') {
        for (const line of coords) {
          this.addRoadLine(line, buffer, roadClass, originLat, originLng);
        }
      }
    }

    // 3. Process Water (Polygons & MultiPolygons)
    for (const feat of waterFeatures) {
      if (!feat.geometry) continue;
      const type = feat.geometry.type;
      const coords = (feat.geometry as any).coordinates;
      if (!coords) continue;

      if (type === 'Polygon') {
        this.addWaterPolygon(coords, originLat, originLng);
      } else if (type === 'MultiPolygon') {
        for (const poly of coords) {
          this.addWaterPolygon(poly, originLat, originLng);
        }
      }
    }

    this.isReady = true;
    return true; // Successfully refreshed
  }

  private addBuildingPolygon(
    ringsGeo: number[][][],
    originLat: number,
    originLng: number,
    height = 8,
    isCommercial = false
  ) {
    if (!ringsGeo || ringsGeo.length === 0) return;

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    const rings: Point2D[][] = [];

    for (const ring of ringsGeo) {
      const convertedRing: Point2D[] = [];
      for (const pt of ring) {
        const p = GeoCoords.toLocalMeters(pt[1], pt[0], originLat, originLng);
        convertedRing.push(p);
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.z < minZ) minZ = p.z;
        if (p.z > maxZ) maxZ = p.z;
      }
      rings.push(convertedRing);
    }

    const bldg: BuildingObstacle = { minX, maxX, minZ, maxZ, rings, height, isCommercial };

    // Register into spatial buckets
    const startCellX = Math.floor((minX - 4) / BUCKET_SIZE);
    const endCellX = Math.floor((maxX + 4) / BUCKET_SIZE);
    const startCellZ = Math.floor((minZ - 4) / BUCKET_SIZE);
    const endCellZ = Math.floor((maxZ + 4) / BUCKET_SIZE);

    for (let cx = startCellX; cx <= endCellX; cx++) {
      for (let cz = startCellZ; cz <= endCellZ; cz++) {
        const key = this.getBucketKey(cx, cz);
        let bucket = this.buildingBuckets.get(key);
        if (!bucket) {
          bucket = [];
          this.buildingBuckets.set(key, bucket);
        }
        bucket.push(bldg);
      }
    }
  }

  private addRoadLine(pointsGeo: number[][], buffer: number, roadClass: string, originLat: number, originLng: number) {
    if (!pointsGeo || pointsGeo.length < 2) return;

    for (let i = 0; i < pointsGeo.length - 1; i++) {
      const p1 = GeoCoords.toLocalMeters(pointsGeo[i][1], pointsGeo[i][0], originLat, originLng);
      const p2 = GeoCoords.toLocalMeters(pointsGeo[i+1][1], pointsGeo[i+1][0], originLat, originLng);

      const dx = p2.x - p1.x;
      const dz = p2.z - p1.z;
      const length = Math.hypot(dx, dz);

      if (length > 4) {
        this.roads.push({
          p1,
          p2,
          length,
          angle: Math.atan2(dx, dz),
          roadClass,
          buffer,
        });
      }

      const minX = Math.min(p1.x, p2.x) - buffer;
      const maxX = Math.max(p1.x, p2.x) + buffer;
      const minZ = Math.min(p1.z, p2.z) - buffer;
      const maxZ = Math.max(p1.z, p2.z) + buffer;

      const road: RoadObstacle = { p1, p2, minX, maxX, minZ, maxZ, buffer };

      const startCellX = Math.floor(minX / BUCKET_SIZE);
      const endCellX = Math.floor(maxX / BUCKET_SIZE);
      const startCellZ = Math.floor(minZ / BUCKET_SIZE);
      const endCellZ = Math.floor(maxZ / BUCKET_SIZE);

      for (let cx = startCellX; cx <= endCellX; cx++) {
        for (let cz = startCellZ; cz <= endCellZ; cz++) {
          const key = this.getBucketKey(cx, cz);
          let bucket = this.roadBuckets.get(key);
          if (!bucket) {
            bucket = [];
            this.roadBuckets.set(key, bucket);
          }
          bucket.push(road);
        }
      }
    }
  }

  /**
   * Registers a custom 3D element (e.g. petrol station) as an obstacle
   * so trees will NEVER spawn on top of or clipping into it.
   */
  public registerCustomObstacle(minX: number, maxX: number, minZ: number, maxZ: number) {
    const rings: Point2D[][] = [[
      { x: minX, z: minZ },
      { x: maxX, z: minZ },
      { x: maxX, z: maxZ },
      { x: minX, z: maxZ },
      { x: minX, z: minZ },
    ]];
    const bldg: BuildingObstacle = { minX, maxX, minZ, maxZ, rings, height: 8 };

    const startCellX = Math.floor((minX - 4) / BUCKET_SIZE);
    const endCellX = Math.floor((maxX + 4) / BUCKET_SIZE);
    const startCellZ = Math.floor((minZ - 4) / BUCKET_SIZE);
    const endCellZ = Math.floor((maxZ + 4) / BUCKET_SIZE);

    for (let cx = startCellX; cx <= endCellX; cx++) {
      for (let cz = startCellZ; cz <= endCellZ; cz++) {
        const key = this.getBucketKey(cx, cz);
        let bucket = this.buildingBuckets.get(key);
        if (!bucket) {
          bucket = [];
          this.buildingBuckets.set(key, bucket);
        }
        bucket.push(bldg);
      }
    }
  }

  /**
   * Checks if an entire rectangular footprint is 100% free of buildings, roads, and water.
   */
  public isFootprintClear(
    centerX: number,
    centerZ: number,
    halfWidth: number,
    halfDepth: number,
    margin = 3
  ): boolean {
    const points: Point2D[] = [
      { x: centerX, z: centerZ },
      { x: centerX - halfWidth - margin, z: centerZ - halfDepth - margin },
      { x: centerX + halfWidth + margin, z: centerZ - halfDepth - margin },
      { x: centerX - halfWidth - margin, z: centerZ + halfDepth + margin },
      { x: centerX + halfWidth + margin, z: centerZ + halfDepth + margin },
      { x: centerX - halfWidth - margin, z: centerZ },
      { x: centerX + halfWidth + margin, z: centerZ },
      { x: centerX, z: centerZ - halfDepth - margin },
      { x: centerX, z: centerZ + halfDepth + margin },
    ];

    for (const pt of points) {
      if (this.isBlocked(pt.x, pt.z, 2)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Specifically tests if a roadside oriented rectangle (e.g. 26x20m petrol station)
   * is 100% free of buildings, other roads, and water.
   */
  public isStationFootprintClear(
    midX: number,
    midZ: number,
    nx: number,
    nz: number,
    tx: number,
    tz: number,
    centerDist: number,
    halfWidth = 13,
    halfDepth = 10,
    currentRoadP1?: Point2D,
    currentRoadP2?: Point2D
  ): boolean {
    if (!this.isReady) return false;

    // Sample an oriented grid across the footprint
    for (let u = -halfWidth; u <= halfWidth; u += 6.5) {
      for (let v = -halfDepth; v <= halfDepth; v += 5) {
        const px = midX + nx * (centerDist + v) + tx * u;
        const pz = midZ + nz * (centerDist + v) + tz * u;

        const cellX = Math.floor(px / BUCKET_SIZE);
        const cellZ = Math.floor(pz / BUCKET_SIZE);
        const key = this.getBucketKey(cellX, cellZ);

        // 1. Check Buildings
        const bldgs = this.buildingBuckets.get(key);
        if (bldgs) {
          for (const b of bldgs) {
            if (px < b.minX - 2.5 || px > b.maxX + 2.5 || pz < b.minZ - 2.5 || pz > b.maxZ + 2.5) continue;
            if (this.pointInPolygon(px, pz, b.rings[0])) return false;
            for (const ring of b.rings) {
              for (let i = 0; i < ring.length - 1; i++) {
                if (this.distToSegment(px, pz, ring[i], ring[i + 1]) < 2.5) return false;
              }
            }
          }
        }

        // 2. Check Water
        const waters = this.waterBuckets.get(key);
        if (waters) {
          for (const w of waters) {
            if (px < w.minX || px > w.maxX || pz < w.minZ || pz > w.maxZ) continue;
            if (this.pointInPolygon(px, pz, w.rings[0])) return false;
          }
        }

        // 3. Check Other Roads (excluding current road segment)
        const roads = this.roadBuckets.get(key);
        if (roads) {
          for (const r of roads) {
            if (currentRoadP1 && Math.hypot(r.p1.x - currentRoadP1.x, r.p1.z - currentRoadP1.z) < 3) continue;
            if (currentRoadP2 && Math.hypot(r.p2.x - currentRoadP2.x, r.p2.z - currentRoadP2.z) < 3) continue;
            const dist = this.distToSegment(px, pz, r.p1, r.p2);
            if (dist < r.buffer + 2) return false;
          }
        }
      }
    }
    return true;
  }

  /**
   * Tests if an oriented rectangular footprint intersects ANY road (or road buffer) in the map.
   * angle is rotation in radians.
   */
  public isRoadCollision(
    px: number,
    pz: number,
    halfLength: number,
    halfWidth: number,
    angle: number,
    ignoreRoadP1?: Point2D,
    ignoreRoadP2?: Point2D
  ): boolean {
    if (!this.isReady) return true;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const stepL = Math.max(3, halfLength / 4);
    const stepW = Math.max(2, halfWidth / 2);

    for (let u = -halfLength; u <= halfLength; u += stepL) {
      for (let v = -halfWidth; v <= halfWidth; v += stepW) {
        const sx = px + cos * u - sin * v;
        const sz = pz + sin * u + cos * v;

        const cellX = Math.floor(sx / BUCKET_SIZE);
        const cellZ = Math.floor(sz / BUCKET_SIZE);
        const roads = this.roadBuckets.get(this.getBucketKey(cellX, cellZ));
        if (roads) {
          for (const r of roads) {
            if (ignoreRoadP1 && Math.hypot(r.p1.x - ignoreRoadP1.x, r.p1.z - ignoreRoadP1.z) < 2) continue;
            if (ignoreRoadP2 && Math.hypot(r.p2.x - ignoreRoadP2.x, r.p2.z - ignoreRoadP2.z) < 2) continue;
            const dist = this.distToSegment(sx, sz, r.p1, r.p2);
            if (dist < r.buffer + 0.5) {
              return true; // Overlaps or clips road!
            }
          }
        }
      }
    }
    return false;
  }

  /**
   * Tests if an oriented rectangular footprint intersects ANY building in the map.
   */
  public isBuildingCollision(
    px: number,
    pz: number,
    halfLength: number,
    halfWidth: number,
    angle: number
  ): boolean {
    if (!this.isReady) return false;

    // Fast precise path for character & small agent footprints
    if (halfLength <= 1.0 && halfWidth <= 1.0) {
      const radius = Math.max(halfLength, halfWidth);
      const cellX = Math.floor(px / BUCKET_SIZE);
      const cellZ = Math.floor(pz / BUCKET_SIZE);
      const bldgs = this.buildingBuckets.get(this.getBucketKey(cellX, cellZ));
      if (!bldgs) return false;

      for (const b of bldgs) {
        if (
          px < b.minX - radius ||
          px > b.maxX + radius ||
          pz < b.minZ - radius ||
          pz > b.maxZ + radius
        ) {
          continue;
        }
        if (this.pointInPolygon(px, pz, b.rings[0])) return true;
        for (const ring of b.rings) {
          for (let i = 0; i < ring.length - 1; i++) {
            if (this.distToSegment(px, pz, ring[i], ring[i + 1]) < radius) {
              return true;
            }
          }
        }
      }
      return false;
    }

    // Footprint check for larger rectangular structures
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const stepL = Math.max(1.5, halfLength / 4);
    const stepW = Math.max(1.5, halfWidth / 3);

    for (let u = -halfLength; u <= halfLength + 0.1; u += stepL) {
      for (let v = -halfWidth; v <= halfWidth + 0.1; v += stepW) {
        const sx = px + cos * u - sin * v;
        const sz = pz + sin * u + cos * v;

        const cellX = Math.floor(sx / BUCKET_SIZE);
        const cellZ = Math.floor(sz / BUCKET_SIZE);
        const bldgs = this.buildingBuckets.get(this.getBucketKey(cellX, cellZ));
        if (bldgs) {
          for (const b of bldgs) {
            if (sx < b.minX - 1 || sx > b.maxX + 1 || sz < b.minZ - 1 || sz > b.maxZ + 1) continue;
            if (this.pointInPolygon(sx, sz, b.rings[0])) return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * Finds the nearest building surface to (px, pz), returning distance, closest surface point (qx, qz),
   * and the outward unit normal (nx, nz) pointing safely away from the building.
   */
  public getNearestBuildingSurface(
    px: number,
    pz: number,
    searchRadius = 3.5
  ): { dist: number; nx: number; nz: number; qx: number; qz: number } | null {
    if (!this.isReady) return null;

    const cellRadius = Math.ceil(searchRadius / BUCKET_SIZE);
    const cellX = Math.floor(px / BUCKET_SIZE);
    const cellZ = Math.floor(pz / BUCKET_SIZE);

    let minDist = Infinity;
    let bestNx = 0;
    let bestNz = 0;
    let bestQx = px;
    let bestQz = pz;

    for (let cx = cellX - cellRadius; cx <= cellX + cellRadius; cx++) {
      for (let cz = cellZ - cellRadius; cz <= cellZ + cellRadius; cz++) {
        const bldgs = this.buildingBuckets.get(this.getBucketKey(cx, cz));
        if (!bldgs) continue;

        for (const b of bldgs) {
          if (
            px < b.minX - searchRadius ||
            px > b.maxX + searchRadius ||
            pz < b.minZ - searchRadius ||
            pz > b.maxZ + searchRadius
          ) {
            continue;
          }

          for (const ring of b.rings) {
            for (let i = 0; i < ring.length - 1; i++) {
              const p1 = ring[i];
              const p2 = ring[i + 1];
              const dx = p2.x - p1.x;
              const dz = p2.z - p1.z;
              const lenSq = dx * dx + dz * dz;
              if (lenSq === 0) continue;

              let t = ((px - p1.x) * dx + (pz - p1.z) * dz) / lenSq;
              t = Math.max(0, Math.min(1, t));
              const qx = p1.x + t * dx;
              const qz = p1.z + t * dz;
              const d = Math.hypot(px - qx, pz - qz);

              if (d < minDist) {
                minDist = d;
                bestQx = qx;
                bestQz = qz;
                if (d > 0.001) {
                  bestNx = (px - qx) / d;
                  bestNz = (pz - qz) / d;
                } else {
                  const len = Math.sqrt(lenSq);
                  bestNx = -dz / len;
                  bestNz = dx / len;
                }
              }
            }
          }
        }
      }
    }

    if (minDist <= searchRadius) {
      return { dist: minDist, nx: bestNx, nz: bestNz, qx: bestQx, qz: bestQz };
    }
    return null;
  }

  /**
   * Returns true ONLY if the given coordinate (px, pz) is actually inside a water polygon.
   */
  public isPointInWater(px: number, pz: number, clearance = 0): boolean {
    if (!this.isReady) return false;
    const cellX = Math.floor(px / BUCKET_SIZE);
    const cellZ = Math.floor(pz / BUCKET_SIZE);
    const waters = this.waterBuckets.get(this.getBucketKey(cellX, cellZ));
    if (!waters) return false;
    for (const w of waters) {
      if (px < w.minX - clearance || px > w.maxX + clearance || pz < w.minZ - clearance || pz > w.maxZ + clearance) {
        continue;
      }
      if (this.pointInPolygon(px, pz, w.rings[0])) {
        return true;
      }
    }
    return false;
  }

  /**
   * Returns distance to the nearest water body in meters.
   */
  public getDistanceToWater(px: number, pz: number, searchRadiusMeters = 80): number {
    if (!this.isReady) return Infinity;
    const cellRadius = Math.ceil(searchRadiusMeters / BUCKET_SIZE);
    const cellX = Math.floor(px / BUCKET_SIZE);
    const cellZ = Math.floor(pz / BUCKET_SIZE);
    let minDist = Infinity;

    for (let cx = cellX - cellRadius; cx <= cellX + cellRadius; cx++) {
      for (let cz = cellZ - cellRadius; cz <= cellZ + cellRadius; cz++) {
        const waters = this.waterBuckets.get(this.getBucketKey(cx, cz));
        if (!waters) continue;
        for (const w of waters) {
          if (
            px < w.minX - searchRadiusMeters ||
            px > w.maxX + searchRadiusMeters ||
            pz < w.minZ - searchRadiusMeters ||
            pz > w.maxZ + searchRadiusMeters
          ) {
            continue;
          }
          if (this.pointInPolygon(px, pz, w.rings[0])) {
            return 0;
          }
          for (const ring of w.rings) {
            for (let i = 0; i < ring.length - 1; i++) {
              const d = this.distToSegment(px, pz, ring[i], ring[i + 1]);
              if (d < minDist) minDist = d;
            }
          }
        }
      }
    }
    return minDist;
  }

  private addWaterPolygon(ringsGeo: number[][][], originLat: number, originLng: number) {
    if (!ringsGeo || ringsGeo.length === 0) return;

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    const rings: Point2D[][] = [];

    for (const ring of ringsGeo) {
      const convertedRing: Point2D[] = [];
      for (const pt of ring) {
        const p = GeoCoords.toLocalMeters(pt[1], pt[0], originLat, originLng);
        convertedRing.push(p);
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.z < minZ) minZ = p.z;
        if (p.z > maxZ) maxZ = p.z;
      }
      rings.push(convertedRing);
    }

    const water: WaterObstacle = { minX, maxX, minZ, maxZ, rings };
    this.waterObstacles.push(water);

    const startCellX = Math.floor(minX / BUCKET_SIZE);
    const endCellX = Math.floor(maxX / BUCKET_SIZE);
    const startCellZ = Math.floor(minZ / BUCKET_SIZE);
    const endCellZ = Math.floor(maxZ / BUCKET_SIZE);

    for (let cx = startCellX; cx <= endCellX; cx++) {
      for (let cz = startCellZ; cz <= endCellZ; cz++) {
        const key = this.getBucketKey(cx, cz);
        let bucket = this.waterBuckets.get(key);
        if (!bucket) {
          bucket = [];
          this.waterBuckets.set(key, bucket);
        }
        bucket.push(water);
      }
    }
  }

  /**
   * Evaluates if a point is blocked by ANY building, road, road boundary, or water body.
   * Tree canopy clearance is taken into account.
   */
  public isBlocked(px: number, pz: number, clearance = 3.5): boolean {
    if (!this.isReady) {
      return true; // Reject trees until obstacle map is fully loaded!
    }

    const cellX = Math.floor(px / BUCKET_SIZE);
    const cellZ = Math.floor(pz / BUCKET_SIZE);
    const key = this.getBucketKey(cellX, cellZ);

    // 1. Check Buildings in this bucket
    const bldgs = this.buildingBuckets.get(key);
    if (bldgs) {
      for (const b of bldgs) {
        // Fast AABB check with clearance margin
        if (px < b.minX - clearance || px > b.maxX + clearance || pz < b.minZ - clearance || pz > b.maxZ + clearance) {
          continue;
        }

        // Check if point is inside the outer ring
        if (this.pointInPolygon(px, pz, b.rings[0])) {
          return true; // Directly inside building!
        }

        // Check if point is too close to any wall segment
        for (const ring of b.rings) {
          for (let i = 0; i < ring.length - 1; i++) {
            if (this.distToSegment(px, pz, ring[i], ring[i+1]) < clearance) {
              return true; // Touching or overlapping building wall!
            }
          }
        }
      }
    }

    // 2. Check Roads in this bucket
    const roads = this.roadBuckets.get(key);
    if (roads) {
      for (const r of roads) {
        if (px < r.minX || px > r.maxX || pz < r.minZ || pz > r.maxZ) {
          continue;
        }
        // Check distance to road centerline against required buffer + tree clearance
        const dist = this.distToSegment(px, pz, r.p1, r.p2);
        if (dist < r.buffer + clearance) {
          return true; // Inside road or road boundary/median!
        }
      }
    }

    // 3. Check Water in this bucket
    const waters = this.waterBuckets.get(key);
    if (waters) {
      for (const w of waters) {
        if (px < w.minX - clearance || px > w.maxX + clearance || pz < w.minZ - clearance || pz > w.maxZ + clearance) {
          continue;
        }
        if (this.pointInPolygon(px, pz, w.rings[0])) {
          return true; // Inside lake, sea, river, pond!
        }
      }
    }

    return false; // Space is completely clear!
  }

  public static pointInPolygon(px: number, pz: number, ring: Point2D[]): boolean {
    if (!ring || ring.length < 3) return false;
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i].x, zi = ring[i].z;
      const xj = ring[j].x, zj = ring[j].z;
      const intersect = ((zi > pz) !== (zj > pz)) && (px < (xj - xi) * (pz - zi) / (zj - zi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  public pointInPolygon(px: number, pz: number, ring: Point2D[]): boolean {
    return SpatialObstacleMap.pointInPolygon(px, pz, ring);
  }

  /**
   * Retrieves all buildings within a given radius (meters) around (centerX, centerZ).
   */
  public getBuildingsInRadius(centerX: number, centerZ: number, radius: number): BuildingObstacle[] {
    if (!this.isReady) return [];
    const cellRadius = Math.ceil(radius / BUCKET_SIZE);
    const cellX = Math.floor(centerX / BUCKET_SIZE);
    const cellZ = Math.floor(centerZ / BUCKET_SIZE);

    const visited = new Set<BuildingObstacle>();
    const result: BuildingObstacle[] = [];
    const radiusSq = radius * radius;

    for (let cx = cellX - cellRadius; cx <= cellX + cellRadius; cx++) {
      for (let cz = cellZ - cellRadius; cz <= cellZ + cellRadius; cz++) {
        const bldgs = this.buildingBuckets.get(this.getBucketKey(cx, cz));
        if (!bldgs) continue;

        for (const b of bldgs) {
          if (visited.has(b)) continue;
          visited.add(b);

          const bMidX = (b.minX + b.maxX) * 0.5;
          const bMidZ = (b.minZ + b.maxZ) * 0.5;
          const dx = bMidX - centerX;
          const dz = bMidZ - centerZ;
          if (dx * dx + dz * dz <= radiusSq) {
            result.push(b);
          }
        }
      }
    }
    return result;
  }

  private distToSegment(px: number, pz: number, p1: Point2D, p2: Point2D): number {
    const dx = p2.x - p1.x;
    const dz = p2.z - p1.z;
    const lenSq = dx * dx + dz * dz;
    if (lenSq === 0) return Math.hypot(px - p1.x, pz - p1.z);
    let t = ((px - p1.x) * dx + (pz - p1.z) * dz) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const projX = p1.x + t * dx;
    const projZ = p1.z + t * dz;
    return Math.hypot(px - projX, pz - projZ);
  }

  private addTagToBuckets(coords: any, tag: string, originLat: number, originLng: number) {
    if (!coords) return;
    const processPt = (lng: number, lat: number) => {
      const p = GeoCoords.toLocalMeters(lat, lng, originLat, originLng);
      const cellX = Math.floor(p.x / BUCKET_SIZE);
      const cellZ = Math.floor(p.z / BUCKET_SIZE);
      const key = this.getBucketKey(cellX, cellZ);
      if (tag === 'commercial') {
        this.commercialBuckets.add(`${cellX},${cellZ}`);
      } else {
        let set = this.landcoverBuckets.get(key);
        if (!set) {
          set = new Set<string>();
          this.landcoverBuckets.set(key, set);
        }
        set.add(tag);
      }
    };

    if (typeof coords[0] === 'number') {
      processPt(coords[0], coords[1]);
    } else {
      for (const item of coords) {
        if (!item) continue;
        if (typeof item[0] === 'number') {
          processPt(item[0], item[1]);
        } else if (Array.isArray(item[0])) {
          for (const sub of item) {
            if (sub && typeof sub[0] === 'number') {
              processPt(sub[0], sub[1]);
            }
          }
        }
      }
    }
  }

  /**
   * Evaluates the active Kerala environmental zone at coordinate (px, pz)
   */
  public getZoneAt(px: number, pz: number, originLat: number, originLng: number): KeralaZoneType {
    const cellRadius = 3; // ~150m-200m radius
    const cellX = Math.floor(px / BUCKET_SIZE);
    const cellZ = Math.floor(pz / BUCKET_SIZE);
    let buildingCount = 0;
    let hasHighway = false;

    for (let cx = cellX - cellRadius; cx <= cellX + cellRadius; cx++) {
      for (let cz = cellZ - cellRadius; cz <= cellZ + cellRadius; cz++) {
        const key = this.getBucketKey(cx, cz);
        const b = this.buildingBuckets.get(key);
        if (b) buildingCount += b.length;
        const r = this.roadBuckets.get(key);
        if (r) {
          for (const road of r) {
            if (road.buffer >= 14) hasHighway = true;
          }
        }
      }
    }

    const coords = GeoCoords.toLatLng(px, pz, originLat, originLng);
    const nearestWaterDist = this.getDistanceToWater(px, pz, 100);
    const isOcean = isKeralaOceanCoastline(coords.lat, coords.lng);

    const localLandcover = this.landcoverBuckets.get(this.getBucketKey(cellX, cellZ)) || new Set<string>();

    const context: LocalAreaContext = {
      buildingCount: Math.round(buildingCount / 3),
      hasHighway,
      hasCommercial: this.commercialBuckets.has(`${cellX},${cellZ}`),
      hasResidential: buildingCount > 6,
      landcoverTypes: localLandcover,
      nearestWaterDistance: nearestWaterDist,
      nearestWaterType: isOcean ? 'ocean' : 'lake',
    };

    return ZoneClassifier.classify(coords.lat, coords.lng, context);
  }

  /**
   * Checks if any building obstacle intersects the line of sight between
   * the player position (p1) and camera position (p2).
   */
  public isLineOfSightOccluded(p1x: number, p1z: number, p2x: number, p2z: number): boolean {
    if (!this.isReady) return false;

    const dx = p2x - p1x;
    const dz = p2z - p1z;
    const dist = Math.hypot(dx, dz);
    if (dist < 1.5) return false;

    // Sample along the ray from player to camera at 2.0m intervals
    const stepCount = Math.min(25, Math.max(3, Math.floor(dist / 2.0)));
    for (let i = 1; i <= stepCount; i++) {
      const t = i / (stepCount + 1);
      const sx = p1x + dx * t;
      const sz = p1z + dz * t;

      const cellX = Math.floor(sx / BUCKET_SIZE);
      const cellZ = Math.floor(sz / BUCKET_SIZE);
      const bldgs = this.buildingBuckets.get(this.getBucketKey(cellX, cellZ));
      if (!bldgs) continue;

      for (const b of bldgs) {
        if (sx >= b.minX - 0.5 && sx <= b.maxX + 0.5 && sz >= b.minZ - 0.5 && sz <= b.maxZ + 0.5) {
          if (this.pointInPolygon(sx, sz, b.rings[0])) {
            return true;
          }
        }
      }
    }
    return false;
  }
}
