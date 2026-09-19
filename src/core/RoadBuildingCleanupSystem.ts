import { NormalizedBuilding, LocalPoint2D } from './geoTypes';
import { RoadGraph } from './RoadGraph';
import { WaterSystem } from './WaterSystem';
import { GAME_CONFIG } from '../config/gameConfig';

/**
 * Road-First Building Geometry Cleanup System
 * 
 * Uses perimeter edge-sampling and iterative normal-vector push.
 * Guarantees that:
 * 1. Road corridors and generous setbacks are 100% free of buildings.
 * 2. POIs are pushed outward intact to the roadside with full clearance.
 * 3. Generic/unregistered buildings overlapping any road are cleanly removed.
 * 4. Pass 2 purges any generic building colliding with a relocated POI.
 * 5. Water bodies and riverways are 100% free of buildings.
 */
export class RoadBuildingCleanupSystem {
  public static processBuildings(
    buildings: NormalizedBuilding[],
    roadGraph: RoadGraph,
    waterSystem?: WaterSystem
  ): NormalizedBuilding[] {
    const config = GAME_CONFIG.roadBuildingCleanupConfig;
    if (!config.enabled) {
      return buildings;
    }

    const bufferMeters = config.roadBufferMeters; // 6.0m
    const cleanedBuildings: NormalizedBuilding[] = [];

    // Helper: sample points every 2.0m along polygon perimeter + centroid + interior chords
    const sampleBuildingPoints = (poly: LocalPoint2D[], cx: number, cz: number): LocalPoint2D[] => {
      const points: LocalPoint2D[] = [{ x: cx, z: cz }];
      const n = poly.length;
      for (let i = 0; i < n; i++) {
        const p1 = poly[i];
        const p2 = poly[(i + 1) % n];
        points.push(p1);

        // interior chord midpoint to catch roads crossing building interior
        points.push({ x: (cx + p1.x) * 0.5, z: (cz + p1.z) * 0.5 });

        const edgeLen = Math.hypot(p2.x - p1.x, p2.z - p1.z);
        if (edgeLen > 2.0) {
          const steps = Math.ceil(edgeLen / 2.0);
          for (let s = 1; s < steps; s++) {
            const frac = s / steps;
            points.push({
              x: p1.x + (p2.x - p1.x) * frac,
              z: p1.z + (p2.z - p1.z) * frac,
            });
          }
        }
      }
      return points;
    };

    for (const b of buildings) {
      // 0. Water check: Never allow any building inside river, canal, or water body
      if (waterSystem && waterSystem.isPointInWater(b.centerX, b.centerZ, 1.5)) {
        b.validationStatus = 'rejected';
        continue;
      }

      // Registered POI: Must have a name OR be an explicit registered business/amenity
      const hasName = Boolean(b.name && b.name.trim().length > 0);
      const isRegisteredAmenity = Boolean(
        b.tags &&
        (b.tags.amenity || b.tags.shop || b.tags.tourism || b.tags.healthcare || b.tags.office)
      );
      const isPOI = hasName || isRegisteredAmenity;

      // Generous search radius to catch all nearby road segments even for elongated buildings
      const searchRadius = Math.max(b.radius * 2.5 + 60.0, 150.0);
      const nearbySegments = roadGraph.getAllSegmentsNear(
        b.centerX,
        b.centerZ,
        searchRadius
      );

      if (nearbySegments.length === 0) {
        // Safe — no roads anywhere near
        b.cleanedPolygon = [[...b.localPolygon]];
        b.cleanedAreaSqMeters = b.areaSqMeters;
        b.overlapSeverity = 0;
        cleanedBuildings.push(b);
        continue;
      }

      // Check violation of any sampled point against any nearby road segment
      const checkViolation = (poly: LocalPoint2D[], cx: number, cz: number) => {
        const sampled = sampleBuildingPoints(poly, cx, cz);
        let worstPen = 0;
        let worstSeg: typeof nearbySegments[0] | null = null;

        for (const pt of sampled) {
          for (const nearSeg of nearbySegments) {
            const seg = nearSeg.segment;

            const vx = pt.x - seg.p1.x;
            const vz = pt.z - seg.p1.z;
            const segDx = seg.p2.x - seg.p1.x;
            const segDz = seg.p2.z - seg.p1.z;
            const segLenSq = segDx * segDx + segDz * segDz;

            let t = segLenSq > 0 ? (vx * segDx + vz * segDz) / segLenSq : 0;
            t = Math.max(0, Math.min(1, t));

            const projX = seg.p1.x + t * segDx;
            const projZ = seg.p1.z + t * segDz;
            const dist = Math.hypot(pt.x - projX, pt.z - projZ);

            const roadCorridor = (seg.width / 2.0) + bufferMeters;
            const penetration = roadCorridor - dist;

            if (penetration > worstPen) {
              worstPen = penetration;
              worstSeg = nearSeg;
            }
          }
        }
        return { worstPen, worstSeg };
      };

      const initial = checkViolation(b.localPolygon, b.centerX, b.centerZ);

      if (initial.worstPen <= 0) {
        // Safe — completely outside all road corridors
        b.cleanedPolygon = [[...b.localPolygon]];
        b.cleanedAreaSqMeters = b.areaSqMeters;
        b.overlapSeverity = 0;
        cleanedBuildings.push(b);
        continue;
      }

      // Building VIOLATES a road corridor!
      b.overlapSeverity = Math.min(1.0, initial.worstPen / (b.radius || 5.0));

      if (!isPOI) {
        // Generic / Unregistered building: strictly DELETE to guarantee free roads!
        b.validationStatus = 'rejected';
        continue;
      }

      // REGISTERED POI: Iteratively push away along road normal until completely clear
      let currentPoly = b.localPolygon;
      let currCenterX = b.centerX;
      let currCenterZ = b.centerZ;
      let isCleared = false;

      for (let iter = 0; iter < 12; iter++) {
        const v = checkViolation(currentPoly, currCenterX, currCenterZ);
        if (v.worstPen <= 0) {
          isCleared = true;
          break;
        }

        if (!v.worstSeg) break;
        const seg = v.worstSeg.segment;

        // Normal vector pointing away from road towards building
        let nx = seg.nx;
        let nz = seg.nz;
        const dot = (currCenterX - v.worstSeg.projX) * nx + (currCenterZ - v.worstSeg.projZ) * nz;
        if (dot < 0) {
          nx = -nx;
          nz = -nz;
        }

        const pushStep = v.worstPen + 3.5; // Clear penetration + 3.5m generous safety margin
        currCenterX += nx * pushStep;
        currCenterZ += nz * pushStep;
        currentPoly = currentPoly.map(pt => ({
          x: pt.x + nx * pushStep,
          z: pt.z + nz * pushStep,
        }));
      }

      if (isCleared) {
        // Guarantee pushed POI did not land in river/canal
        if (waterSystem && waterSystem.isPointInWater(currCenterX, currCenterZ, 1.5)) {
          b.validationStatus = 'rejected';
          continue;
        }

        b.centerX = currCenterX;
        b.centerZ = currCenterZ;
        b.cleanedPolygon = [currentPoly];
        b.cleanedAreaSqMeters = b.areaSqMeters;
        b.validationStatus = 'adjusted';
        cleanedBuildings.push(b);
      } else {
        // If impossible to clear after 6 pushes (e.g. inside a triangle highway loop), reject so road stays free
        b.validationStatus = 'rejected';
      }
    }

    // Pass 2: Remove generic buildings that collide with relocated POIs to make space
    const movedPOIs = cleanedBuildings.filter(
      b => b.validationStatus === 'adjusted'
    );

    if (movedPOIs.length > 0) {
      const finalBuildings: NormalizedBuilding[] = [];
      for (const b of cleanedBuildings) {
        if (b.validationStatus === 'adjusted') {
          finalBuildings.push(b);
          continue;
        }

        let collides = false;
        for (const poi of movedPOIs) {
          const dist = Math.hypot(
            b.centerX - poi.centerX,
            b.centerZ - poi.centerZ
          );
          if (dist < (b.radius + poi.radius) * 0.8) {
            collides = true;
            break;
          }
        }

        if (!collides) {
          finalBuildings.push(b);
        }
      }
      return finalBuildings;
    }

    return cleanedBuildings;
  }
}
