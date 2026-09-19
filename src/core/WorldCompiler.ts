import {
  NormalizedBuilding,
  WorldCompileReport,
  BuildingCategory,
  BuildingImportanceLevel,
} from './geoTypes';
import { RoadGraph } from './RoadGraph';
import { RoadCorridorSystem } from './RoadCorridorSystem';
import { WaterSystem } from './WaterSystem';
import { RailwayGraph } from './RailwayGraph';
import { TerrainEngine } from './TerrainEngine';

export class WorldCompiler {
  public static compileWorld(
    rawBuildings: NormalizedBuilding[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _roadGraph: RoadGraph,
    roadCorridors: RoadCorridorSystem,
    waterSystem: WaterSystem,
    railwayGraph: RailwayGraph,
    terrainEngine: TerrainEngine
  ): { compiledBuildings: NormalizedBuilding[]; report: WorldCompileReport } {
    const compiledBuildings: NormalizedBuilding[] = [];
    const preFiltered: NormalizedBuilding[] = [];

    // Metrics Tracking
    let buildingsScanned = rawBuildings.length;
    let overlapsDetected = 0;
    let overlapsCorrected = 0;
    let buildingsRejected = 0;
    let roadConflicts = 0;
    let waterConflicts = 0;
    let railwayConflicts = 0;
    let terrainConflicts = 0;
    let treeConflicts = 0;
    const categoriesCount: Record<BuildingCategory, number> = {} as any;

    // Helper: log corrections
    const logCorrection = (id: string | number, issue: string, correction: string, status: string) => {
      console.log(`BUILDING ${id}\nIssue: ${issue}\nCorrection: ${correction}\nStatus: ${status}\n`);
    };

    // Step 1: Geometry integrity filtering
    for (const b of rawBuildings) {
      if (b.localPolygon.length < 3) {
        buildingsRejected++;
        continue;
      }
      
      let signedArea = 0;
      for (let i = 0; i < b.localPolygon.length; i++) {
        const j = (i + 1) % b.localPolygon.length;
        signedArea += b.localPolygon[i].x * b.localPolygon[j].z - b.localPolygon[j].x * b.localPolygon[i].z;
      }
      signedArea *= 0.5;
      const absArea = Math.abs(signedArea);

      if (absArea < 4.0) {
        buildingsRejected++;
        continue;
      }

      if (signedArea < 0) {
        b.localPolygon.reverse();
      }

      b.areaSqMeters = absArea;
      preFiltered.push(b);
    }

    // Step 2: Spatial Validation (BUILDING-BUILDING OVERLAP)
    for (const b of preFiltered) {
      categoriesCount[b.category] = (categoriesCount[b.category] || 0) + 1;
      let isDuplicate = false;
      let conflictType: NormalizedBuilding['conflictType'] = 'none';
      let debugColor = '#22c55e'; // GREEN = validated

      for (const existing of compiledBuildings) {
        const dx = b.centerX - existing.centerX;
        const dz = b.centerZ - existing.centerZ;
        const distCenter = Math.hypot(dx, dz);

        // Approximate collision radius based on area (A = pi*r^2 -> r = sqrt(A/pi))
        const r1 = Math.sqrt(b.areaSqMeters / Math.PI) || 4;
        const r2 = Math.sqrt(existing.areaSqMeters / Math.PI) || 4;
        const collisionThreshold = r1 + r2;

        if (distCenter < collisionThreshold) {
          overlapsDetected++;
          conflictType = 'overlap';
          debugColor = '#f97316'; // ORANGE = building-building conflict
          
          const overlapDist = collisionThreshold - distCenter;
          const severityRatio = overlapDist / collisionThreshold;

          // Check if building:part
          const isPartTag = b.tags['building:part'] != null || existing.tags['building:part'] != null;
          if (isPartTag && Math.abs(existing.height - b.height) > 2.0) {
            b.isPart = true;
            overlapsCorrected++;
            continue;
          }

          if (severityRatio > 0.6) {
            // HIGH severity: Major overlap (Duplicate or Malformed)
            isDuplicate = true;
            buildingsRejected++;
            logCorrection(b.id, 'High building overlap (Duplicate)', 'Discarded footprint', 'rejected');
            if (b.name && !existing.name) existing.name = b.name;
            existing.tags = { ...existing.tags, ...b.tags };
            break;
          } else {
            // LOW/MEDIUM severity: Minimal displacement
            const pushX = (dx / distCenter) * (overlapDist * 0.5);
            const pushZ = (dz / distCenter) * (overlapDist * 0.5);

            for (let i = 0; i < b.localPolygon.length; i++) {
              b.localPolygon[i].x += pushX;
              b.localPolygon[i].z += pushZ;
            }
            b.centerX += pushX;
            b.centerZ += pushZ;
            overlapsCorrected++;
            b.validationStatus = 'adjusted';
            b.conflictDetails = `Displaced +${Math.hypot(pushX, pushZ).toFixed(1)}m for building clearance`;
            logCorrection(b.id, 'Minor/Medium building overlap', `translated +${Math.hypot(pushX, pushZ).toFixed(1)}m away from neighbor`, 'corrected');
          }
        }
      }

      if (isDuplicate) continue;

      // Step 3: BUILDING-ROAD
      const roadEncroachment = roadCorridors.resolveBuildingEncroachment(
        b.localPolygon,
        b.centerX,
        b.centerZ
      );

      if (roadEncroachment.encroached) {
        roadConflicts++;
        conflictType = 'road';
        debugColor = '#ef4444'; // RED = building-road conflict

        for (let i = 0; i < b.localPolygon.length; i++) {
          b.localPolygon[i].x += roadEncroachment.shiftX;
          b.localPolygon[i].z += roadEncroachment.shiftZ;
        }
        b.centerX += roadEncroachment.shiftX;
        b.centerZ += roadEncroachment.shiftZ;
        b.validationStatus = 'adjusted';
        const shiftDist = Math.hypot(roadEncroachment.shiftX, roadEncroachment.shiftZ).toFixed(1);
        b.conflictDetails = `Road setback applied: +${shiftDist}m`;
        logCorrection(b.id, 'Road intersection', `translated +${shiftDist}m perpendicular to road`, 'corrected');
      }

      // Step 4: BUILDING-WATER
      const isCentroidInWater = waterSystem.isPointInWater(b.centerX, b.centerZ);
      const isMarineFacility =
        b.tags.man_made === 'pier' ||
        b.tags.amenity === 'ferry_terminal' ||
        b.tags.building === 'houseboat' ||
        b.category === 'OTHER';

      if (isCentroidInWater && !isMarineFacility) {
        const waterDist = waterSystem.getDistanceToWater(b.centerX, b.centerZ);
        if (waterDist && waterDist.distance < 15.0) {
          const pushDirX = (b.centerX - waterDist.nearestX) || 1.0;
          const pushDirZ = (b.centerZ - waterDist.nearestZ) || 0.0;
          const pushLen = Math.hypot(pushDirX, pushDirZ) || 1.0;
          const pushAmount = 15.0 - waterDist.distance;

          const shiftX = (pushDirX / pushLen) * pushAmount;
          const shiftZ = (pushDirZ / pushLen) * pushAmount;

          for (let i = 0; i < b.localPolygon.length; i++) {
            b.localPolygon[i].x += shiftX;
            b.localPolygon[i].z += shiftZ;
          }
          b.centerX += shiftX;
          b.centerZ += shiftZ;

          waterConflicts++;
          conflictType = 'water';
          debugColor = '#3b82f6'; // BLUE = water conflict
          b.validationStatus = 'adjusted';
          logCorrection(b.id, 'Submerged inside water', `translated +${pushAmount.toFixed(1)}m ashore`, 'corrected');
        } else {
          buildingsRejected++;
          logCorrection(b.id, 'Fully submerged deep water', 'Discarded footprint', 'rejected');
          continue;
        }
      }

      // Step 5: BUILDING-RAILWAY
      const centerRailCheck = railwayGraph.getDistanceToRailway(b.centerX, b.centerZ);
      if (centerRailCheck && centerRailCheck.distance < 8.0) {
        const pushDist = 8.0 - centerRailCheck.distance + 2.0;
        const pushX = (b.centerX - centerRailCheck.nearestX) || 1.0;
        const pushZ = (b.centerZ - centerRailCheck.nearestZ) || 0.0;
        const len = Math.hypot(pushX, pushZ) || 1.0;

        const shiftX = (pushX / len) * pushDist;
        const shiftZ = (pushZ / len) * pushDist;

        for (let i = 0; i < b.localPolygon.length; i++) {
          b.localPolygon[i].x += shiftX;
          b.localPolygon[i].z += shiftZ;
        }
        b.centerX += shiftX;
        b.centerZ += shiftZ;

        railwayConflicts++;
        conflictType = 'railway';
        debugColor = '#a855f7'; // PURPLE = railway conflict
        b.validationStatus = 'adjusted';
        logCorrection(b.id, 'Railway intersection', `translated +${pushDist.toFixed(1)}m from tracks`, 'corrected');
      }

      // Step 6: TERRAIN GROUNDING
      const baseElev = terrainEngine.getElevation(b.centerX, b.centerZ);
      let minVertElev = baseElev;
      let maxVertElev = baseElev;

      for (const v of b.localPolygon) {
        const ve = terrainEngine.getElevation(v.x, v.z);
        if (ve < minVertElev) minVertElev = ve;
        if (ve > maxVertElev) maxVertElev = ve;
      }

      const slopeVariance = maxVertElev - minVertElev;
      if (slopeVariance > 5.0) {
        terrainConflicts++;
        if (debugColor === '#22c55e') {
          debugColor = '#eab308'; // YELLOW = terrain problem
          conflictType = 'geometry';
        }
        logCorrection(b.id, 'Extreme terrain slope', `Foundation plinth deepened to ${slopeVariance.toFixed(1)}m`, 'corrected');
      }

      // Foundation plinth ensures no floating buildings
      const foundationDepth = Math.max(0.6, slopeVariance + 0.8);

      b.elevation = minVertElev;
      b.foundationDepth = foundationDepth;
      b.conflictType = conflictType;
      b.debugColor = debugColor;

      // Step 7: IMPORTANCE SCORING
      // Determines LOD priority and streaming weight of this building.
      b.importanceLevel = WorldCompiler.computeImportance(b);

      compiledBuildings.push(b);
    }

    const importanceLevelCount = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<BuildingImportanceLevel, number>;
    for (const b of compiledBuildings) {
      importanceLevelCount[b.importanceLevel]++;
    }

    const report: WorldCompileReport = {
      timestamp: new Date().toISOString(),
      buildingsScanned,
      buildingsNormalized: buildingsScanned,
      buildingsValidated: buildingsScanned - buildingsRejected,
      buildingsGenerated: compiledBuildings.length,
      overlapsDetected,
      overlapsCorrected,
      buildingsRejected,
      roadConflicts,
      waterConflicts,
      railwayConflicts,
      treeConflicts,
      terrainConflicts,
      importanceLevelCount,
      categoriesCount,
    };

    return { compiledBuildings, report };
  }

  /**
   * TREE VALIDATION
   * Prevents trees from spawning inside roads, buildings, railway, water, parking.
   */
  public static compileVegetation(
    candidatePoints: { x: number; z: number }[],
    waterSystem: WaterSystem,
    roadCorridors: RoadCorridorSystem,
    railwayGraph: RailwayGraph,
    buildings: NormalizedBuilding[]
  ): { validPoints: { x: number; z: number }[]; filteredCount: number } {
    const validPoints: { x: number; z: number }[] = [];
    let treeConflicts = 0;

    for (const pt of candidatePoints) {
      if (waterSystem.isPointInWater(pt.x, pt.z)) {
        treeConflicts++; continue;
      }
      if (roadCorridors.isPointInRoadCorridor(pt.x, pt.z)) {
        treeConflicts++; continue;
      }
      if (railwayGraph.isPointInRailwayCorridor(pt.x, pt.z, 5.0)) {
        treeConflicts++; continue;
      }
      let insideBuilding = false;
      for (const b of buildings) {
        if (Math.hypot(b.centerX - pt.x, b.centerZ - pt.z) < 6.0) {
          insideBuilding = true;
          break;
        }
      }
      if (insideBuilding) {
        treeConflicts++; continue;
      }
      
      validPoints.push(pt);
    }

    return { validPoints, filteredCount: treeConflicts };
  }

  /**
   * Computes an importance level (0–5) for a building based on its category,
   * presence of a name, and size. Used to drive LOD distances and streaming priority.
   *
   * 5 = landmark (iconic, well-known)
   * 4 = major POI (hospital, school, railway station)
   * 3 = named commercial / public building
   * 2 = unnamed commercial or road-facing
   * 1 = generic residential
   * 0 = background / tiny shed
   */
  public static computeImportance(b: NormalizedBuilding): BuildingImportanceLevel {
    const cat = b.category;

    // Landmarks always get max importance
    if (cat === 'LANDMARK') return 5;

    // Major civic POIs
    if (cat === 'HOSPITAL' || cat === 'RAILWAY_STATION') return 4;
    if (cat === 'SCHOOL' || cat === 'COLLEGE' || cat === 'GOVERNMENT' || cat === 'PUBLIC') return 4;

    // Named commercial / religious / hotel
    if (cat === 'RELIGIOUS') return b.name ? 4 : 3;
    if (cat === 'HOTEL' || cat === 'OFFICE') return b.name ? 3 : 2;
    if (
      cat === 'SHOP' || cat === 'RESTAURANT' || cat === 'CAFE' ||
      cat === 'SUPERMARKET' || cat === 'INDUSTRIAL' || cat === 'WAREHOUSE'
    ) {
      return b.name ? 3 : 2;
    }

    // Apartments / multi-storey residential
    if (cat === 'APARTMENT') {
      return b.areaSqMeters > 300 ? 2 : 1;
    }

    // Small background structures
    if (b.areaSqMeters < 15) return 0;

    // Default residential
    return 1;
  }
}
