import { NormalizedBuilding, LocalPoint2D } from './geoTypes';
import { BuildingClassifier } from './BuildingClassifier';
import { GeoCoords } from './geoCoords';

export class GeoDataPipeline {
  /**
   * Computes polygon area in square meters using Shoelace formula on local meters.
   */
  public static computePolygonArea(poly: LocalPoint2D[]): number {
    if (poly.length < 3) return 0;
    let area = 0;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      area += (poly[j].x + poly[i].x) * (poly[j].z - poly[i].z);
    }
    return Math.abs(area / 2);
  }

  /**
   * Determines if a polygon is wound clockwise.
   */
  public static isClockwise(poly: LocalPoint2D[]): boolean {
    let sum = 0;
    for (let i = 0; i < poly.length; i++) {
      const p1 = poly[i];
      const p2 = poly[(i + 1) % poly.length];
      sum += (p2.x - p1.x) * (p2.z + p1.z);
    }
    return sum > 0;
  }

  /**
   * Normalizes a raw polygon feature (from vector tiles or Overpass) into a NormalizedBuilding.
   */
  public static normalizeBuilding(
    id: string | number,
    coordinates: [number, number][], // [lng, lat][]
    tags: Record<string, string>,
    originLat: number,
    originLng: number,
    source: 'osm-vector' | 'osm-overpass' | 'overture' | 'custom' = 'osm-vector'
  ): NormalizedBuilding | null {
    if (!coordinates || coordinates.length < 3) return null;

    // Convert to local metric points
    const localPolygon: LocalPoint2D[] = [];
    let sumLat = 0;
    let sumLng = 0;
    let sumX = 0;
    let sumZ = 0;

    for (const [lng, lat] of coordinates) {
      sumLng += lng;
      sumLat += lat;
      const pt = GeoCoords.toLocalMeters(lat, lng, originLat, originLng);
      localPolygon.push(pt);
      sumX += pt.x;
      sumZ += pt.z;
    }

    // Remove closing duplicate vertex if present
    if (localPolygon.length > 3) {
      const first = localPolygon[0];
      const last = localPolygon[localPolygon.length - 1];
      if (Math.hypot(first.x - last.x, first.z - last.z) < 0.1) {
        localPolygon.pop();
      }
    }

    if (localPolygon.length < 3) return null;

    // Check for impossible geometries (collinear points, zero area)
    const area = this.computePolygonArea(localPolygon);
    if (area < 4.0) return null; // Reject tiny artifacts (< 2x2 meters)

    // Normalize winding to Counter-Clockwise (CCW)
    if (this.isClockwise(localPolygon)) {
      localPolygon.reverse();
    }

    const centerX = sumX / coordinates.length;
    const centerZ = sumZ / coordinates.length;
    const centerLat = sumLat / coordinates.length;
    const centerLng = sumLng / coordinates.length;

    const category = BuildingClassifier.classify(tags);
    const modelFamily = BuildingClassifier.getModelFamily(category, tags);
    const height = BuildingClassifier.estimateHeight(category, tags, area);
    const levels = tags['building:levels'] ? parseFloat(tags['building:levels']) : undefined;
    const name = tags['name:en'] || tags.name;

    return {
      id,
      source,
      coordinates,
      localPolygon,
      centerLat,
      centerLng,
      centerX,
      centerZ,
      category,
      modelFamily,
      name,
      height,
      levels,
      tags,
      areaSqMeters: area,
      radius: Math.sqrt(area / Math.PI),
      validationStatus: 'clean',
      importanceLevel: 1,   // will be upgraded by WorldCompiler
      roadFacing: false,    // will be set by WorldCompiler
    };
  }

  /**
   * Conflates multiple building lists, removing spatial duplicates.
   * If two buildings have centroids closer than 3.0m and overlapping areas,
   * the richer one (with more tags or explicit name) is retained.
   */
  public static deduplicateBuildings(buildings: NormalizedBuilding[]): NormalizedBuilding[] {
    const result: NormalizedBuilding[] = [];
    const spatialGrid: Map<string, NormalizedBuilding[]> = new Map();
    const cellSize = 15.0; // 15m grid cells

    for (const b of buildings) {
      const cellKey = `${Math.floor(b.centerX / cellSize)},${Math.floor(b.centerZ / cellSize)}`;
      
      let isDuplicate = false;
      const neighborKeys = [
        cellKey,
        `${Math.floor(b.centerX / cellSize) + 1},${Math.floor(b.centerZ / cellSize)}`,
        `${Math.floor(b.centerX / cellSize) - 1},${Math.floor(b.centerZ / cellSize)}`,
        `${Math.floor(b.centerX / cellSize)},${Math.floor(b.centerZ / cellSize) + 1}`,
        `${Math.floor(b.centerX / cellSize)},${Math.floor(b.centerZ / cellSize) - 1}`,
      ];

      for (const nk of neighborKeys) {
        const neighbors = spatialGrid.get(nk);
        if (!neighbors) continue;
        for (let i = 0; i < neighbors.length; i++) {
          const existing = neighbors[i];
          const dist = Math.hypot(existing.centerX - b.centerX, existing.centerZ - b.centerZ);
          if (dist < 3.5) {
            isDuplicate = true;
            // If new building has richer information, replace existing
            const existingScore = Object.keys(existing.tags).length + (existing.name ? 5 : 0);
            const newScore = Object.keys(b.tags).length + (b.name ? 5 : 0);
            if (newScore > existingScore) {
              neighbors[i] = b;
              const resIdx = result.indexOf(existing);
              if (resIdx !== -1) result[resIdx] = b;
            }
            break;
          } else if (dist < 8.0) {
            // POI / Footprint confluence: If one has a name and the other does not, enrich the footprint
            if (!existing.name && b.name) {
              existing.name = b.name;
              existing.category = b.category;
              existing.modelFamily = b.modelFamily;
              existing.tags = { ...existing.tags, ...b.tags };
              isDuplicate = true;
              break;
            } else if (existing.name && !b.name) {
              isDuplicate = true;
              break;
            }
          }
        }
        if (isDuplicate) break;
      }

      if (!isDuplicate) {
        result.push(b);
        if (!spatialGrid.has(cellKey)) spatialGrid.set(cellKey, []);
        spatialGrid.get(cellKey)!.push(b);
      }
    }

    return result;
  }
}
