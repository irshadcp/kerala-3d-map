import * as THREE from 'three';
import { MapPOIEntity } from '../core/SignageTypes';
import { NormalizedBuilding, LocalPoint2D, RoadSegment } from '../core/geoTypes';
import { RoadGraph } from '../core/RoadGraph';
import { PhysicalSignboardSystem } from './PhysicalSignboardSystem';
import { TerrainEngine } from '../core/TerrainEngine';
import { WaterSystem } from '../core/WaterSystem';
import type { RealBuildingManager } from './RealBuildingManager';

/**
 * MapSignageManager orchestrates:
 * 1. Physical building signage (rooftop boards, storefront facade signs).
 * 2. Standalone pole signs for POIs without building footprints (never fake buildings!).
 * 3. Roadside street name signs on aluminum poles along named roadways.
 */
export class MapSignageManager {
  private signboardSystem: PhysicalSignboardSystem;
  private pois: Map<string, MapPOIEntity> = new Map();
  private buildingPOIs: Map<string, MapPOIEntity[]> = new Map();
  private matchedPOIIds: Set<string> = new Set();

  constructor() {
    this.signboardSystem = new PhysicalSignboardSystem();
  }

  /**
   * Registers newly fetched POIs from OSM.
   */
  public addPOIs(newPois: MapPOIEntity[]) {
    for (const poi of newPois) {
      if (!this.pois.has(poi.id)) {
        this.pois.set(poi.id, poi);
      }
    }
  }

  /**
   * Matches POIs to buildings using point-in-polygon and nearest footprint distance.
   */
  public matchPOIsToBuildings(buildings: Iterable<NormalizedBuilding>) {
    for (const b of buildings) {
      const bId = String(b.id);
      if (!this.buildingPOIs.has(bId)) {
        this.buildingPOIs.set(bId, []);
      }
      const assigned = this.buildingPOIs.get(bId)!;

      const bRadius = b.radius || 15.0;
      const bMaxDist = Math.max(bRadius + 6.0, 18.0);

      for (const poi of this.pois.values()) {
        if (this.matchedPOIIds.has(poi.id)) continue;

        // 1. Direct source/way match
        if (poi.matchedBuildingId === bId) {
          const pNameLower = (poi.name || '').trim().toLowerCase();
          if (!assigned.some(p => p.id === poi.id || (pNameLower && (p.name || '').trim().toLowerCase() === pNameLower))) {
            assigned.push(poi);
          }
          this.matchedPOIIds.add(poi.id);
          continue;
        }

        // 2. Spatial proximity match
        const dx = poi.x - b.centerX;
        const dz = poi.z - b.centerZ;
        const dist = Math.hypot(dx, dz);

        if (dist <= bMaxDist) {
          const poly = (b.cleanedPolygon && b.cleanedPolygon[0]) || b.localPolygon;
          const inside = poly ? this.isPointInPolygon(poi.x, poi.z, poly) : false;

          if (inside || dist <= bRadius * 0.85) {
            poi.matchedBuildingId = bId;
            // Upgrade sign type if building is tall/commercial
            if (b.height >= 12 || (b.levels || 1) >= 4) {
              if (assigned.length === 0 && ['COMMERCIAL', 'OFFICE', 'HOTEL', 'HOSPITAL'].includes(b.category)) {
                poi.signType = 'ROOFTOP';
              } else {
                poi.signType = 'FACADE';
              }
            } else {
              poi.signType = 'FACADE';
            }
            const pNameLower = (poi.name || '').trim().toLowerCase();
            if (!assigned.some(p => p.id === poi.id || (pNameLower && (p.name || '').trim().toLowerCase() === pNameLower))) {
              assigned.push(poi);
            }
            this.matchedPOIIds.add(poi.id);
          }
        }
      }
    }
  }

  /**
   * Retrieves all POIs associated with a specific building.
   */
  public getPOIsForBuilding(buildingId: string | number): MapPOIEntity[] {
    return this.buildingPOIs.get(String(buildingId)) || [];
  }

  /**
   * Explicitly assigns a POI to a synthesized or adopted building.
   */
  public addPOIToBuilding(buildingId: string | number, poi: MapPOIEntity) {
    const bId = String(buildingId);
    if (!this.buildingPOIs.has(bId)) {
      this.buildingPOIs.set(bId, []);
    }
    const list = this.buildingPOIs.get(bId)!;
    const pNameLower = (poi.name || '').trim().toLowerCase();
    if (list.some(p => p.id === poi.id || (pNameLower && (p.name || '').trim().toLowerCase() === pNameLower))) {
      return;
    }
    list.push(poi);
    this.matchedPOIIds.add(poi.id);
  }

  /**
   * Transfers all POIs from one building to another (used when merging or de-nesting buildings).
   */
  public transferPOIs(fromBuildingId: string | number, toBuildingId: string | number) {
    const fromList = this.buildingPOIs.get(String(fromBuildingId));
    if (!fromList || fromList.length === 0) return;
    for (const poi of fromList) {
      poi.matchedBuildingId = String(toBuildingId);
      this.addPOIToBuilding(toBuildingId, poi);
    }
    this.buildingPOIs.delete(String(fromBuildingId));
  }

  /**
   * Builds chunk-level physical signs:
   * 1. Junction Direction Boards (NHAI / Kerala PWD retroreflective destination boards with arrows)
   * 2. Junction Location Boards (Authentic Malayalam & English intersection name boards)
   *
   * STRICT SAFETY RULES:
   * 1. ALL arbitrary, random standalone billboards scattered in fields/roads are REMOVED.
   * 2. Billboards are placed EXCLUSIVELY at road junctions / intersections.
   * 3. Boards are placed in the safe open green corner wedges outside road corridors.
   * 4. NEVER placed inside road pavements, never inside water bodies, never colliding with buildings.
   */
  public buildChunkSignage(
    minX: number,
    minZ: number,
    maxX: number,
    maxZ: number,
    roadGraph: RoadGraph,
    terrainEngine?: TerrainEngine,
    waterSystem?: WaterSystem,
    realBuildingManager?: RealBuildingManager
  ): THREE.Group | null {
    const chunkGroup = new THREE.Group();
    chunkGroup.name = `chunk-signage-${minX}-${minZ}`;
    let addedCount = 0;

    const isPositionSafeForSign = (px: number, pz: number, signClearance = 4.0): boolean => {
      // 1. Water check: NEVER inside water bodies (minimum 3.0m buffer from shoreline)
      if (waterSystem && waterSystem.isPointInWater(px, pz, 3.0)) {
        return false;
      }

      // 2. Road corridor check: Check ALL segments within 50m
      const nearby = roadGraph.getAllSegmentsNear(px, pz, 50.0);
      for (const match of nearby) {
        const seg = match.segment;
        const halfRoad = seg.width * 0.5;

        // Highway corridors have wide shoulders, flyover pilings, and lanes
        let minClearanceFromCenter = 8.0;
        if (seg.roadClass === 'motorway' || seg.roadClass === 'trunk') {
          minClearanceFromCenter = 14.0;
        } else if (seg.roadClass === 'primary') {
          minClearanceFromCenter = 10.5;
        } else if (seg.roadClass === 'secondary') {
          minClearanceFromCenter = 8.5;
        } else {
          minClearanceFromCenter = 6.5;
        }

        const safeDist = Math.max(halfRoad + 5.0, minClearanceFromCenter);
        if (match.dist < safeDist) {
          return false; // Inside road corridor or sidewalk, NOT in free space!
        }
      }

      // 3. Building collision check: NEVER inside or clipping any building footprint
      if (realBuildingManager && realBuildingManager.isCollidingWithAnyBuilding(px, pz, signClearance)) {
        return false;
      }

      return true;
    };

    // Query all junction nodes inside this chunk
    const junctionNodes = roadGraph.getJunctionNodesInBounds(minX, minZ, maxX, maxZ);
    const placedBoardPositions: Array<{ x: number; z: number }> = [];

    for (const node of junctionNodes) {
      // Skip if too close to an already placed junction board (minimum 65m spacing!)
      if (placedBoardPositions.some(p => Math.hypot(p.x - node.x, p.z - node.z) < 65.0)) {
        continue;
      }

      // Gather connected road segments
      const connectedSegs: RoadSegment[] = [];
      for (const segId of node.connectedSegmentIds) {
        const seg = roadGraph.segments.get(segId);
        if (seg) connectedSegs.push(seg);
      }
      // Only genuine multi-way intersections with at least 3 connected segments
      if (connectedSegs.length < 3) continue;

      // Calculate outward direction vectors for each branch
      interface JunctionArm {
        segment: RoadSegment;
        ux: number;
        uz: number;
        angle: number;
      }

      const rawArms: JunctionArm[] = [];
      for (const seg of connectedSegs) {
        const dx = (seg.fromNodeId === node.id ? seg.p2.x : seg.p1.x) - node.x;
        const dz = (seg.fromNodeId === node.id ? seg.p2.z : seg.p1.z) - node.z;
        const len = Math.hypot(dx, dz);
        if (len < 0.5) continue;
        const ux = dx / len;
        const uz = dz / len;
        const angle = Math.atan2(uz, ux);
        rawArms.push({ segment: seg, ux, uz, angle });
      }

      if (rawArms.length < 3) continue;

      // Deduplicate arms pointing in almost identical direction (e.g. dual carriageways within 20 deg)
      const arms: JunctionArm[] = [];
      for (const arm of rawArms) {
        const isDuplicate = arms.some(existing => {
          const dot = existing.ux * arm.ux + existing.uz * arm.uz;
          return dot > 0.94; // ~19 degrees
        });
        if (!isDuplicate) {
          arms.push(arm);
        }
      }
      if (arms.length < 3) continue;

      // Must involve at least one major road (motorway, trunk, primary, or secondary)
      const hasMajorRoad = arms.some(
        a =>
          a.segment.roadClass === 'motorway' ||
          a.segment.roadClass === 'trunk' ||
          a.segment.roadClass === 'primary' ||
          a.segment.roadClass === 'secondary'
      );
      if (!hasMajorRoad) continue;

      // Sort arms angularly counter-clockwise
      arms.sort((a, b) => a.angle - b.angle);

      // Identify Junction Name & Subtext
      let junctionName = '';
      let junctionNameMl = '';
      let bestPoiDist = 999;

      // Check nearby POIs within 160m
      for (const poi of this.pois.values()) {
        const d = Math.hypot(poi.x - node.x, poi.z - node.z);
        if (d < 160) {
          const pName = poi.name || '';
          const isExplicitJunction = /junction|jn|jct|kavala|chowk|cross|square|കവല|ജംഗ്ഷൻ/i.test(pName);
          if (isExplicitJunction && d < bestPoiDist) {
            junctionName = pName;
            junctionNameMl = poi.malayalamName || '';
            bestPoiDist = d;
          } else if (!junctionName && d < 75 && d < bestPoiDist && pName.length > 2) {
            junctionName = `${pName} Junction`;
            junctionNameMl = poi.malayalamName ? `${poi.malayalamName} ജംഗ്ഷൻ` : '';
            bestPoiDist = d;
          }
        }
      }

      // If no POI matched, inspect connected road names
      if (!junctionName) {
        for (const arm of arms) {
          if (arm.segment.name) {
            junctionName = `${arm.segment.name} Junction`;
            if (arm.segment.malayalamName) {
              junctionNameMl = `${arm.segment.malayalamName} ജംഗ്ഷൻ`;
            }
            break;
          }
        }
      }

      // Regional default fallbacks
      const isHighway = arms.some(a => a.segment.roadClass === 'motorway' || a.segment.roadClass === 'trunk');
      if (!junctionName) {
        if (isHighway) {
          junctionName = 'National Highway Junction';
          junctionNameMl = 'ദേശീയപാത ജംഗ്ഷൻ';
        } else {
          junctionName = 'Town Junction';
          junctionNameMl = 'ടൗൺ ജംഗ്ഷൻ';
        }
      }

      // Find safe roadside shoulder verge position (NOT deep into open green plots/free space!)
      interface SafeCorner {
        x: number;
        z: number;
        approachArm: JunctionArm;
        bisectorAngle: number;
      }

      const safeCorners: SafeCorner[] = [];
      const numArms = arms.length;

      for (let i = 0; i < numArms; i++) {
        const armA = arms[i];
        const armB = arms[(i + 1) % numArms];

        let span = armB.angle - armA.angle;
        if (span < 0) span += Math.PI * 2;
        if (span < 0.55) continue; // Skip narrow forks

        const midAngle = armA.angle + span * 0.5;
        const bx = Math.cos(midAngle);
        const bz = Math.sin(midAngle);

        const halfRoad = Math.max(armA.segment.width, armB.segment.width) * 0.5;
        // Position snugly along roadside shoulder verge (3.2m to 4.2m from pavement edge)
        // leaving the open free space behind it completely clear for shops and buildings!
        for (const shoulderSetback of [halfRoad + 3.2, halfRoad + 4.2]) {
          const candX = node.x + bx * shoulderSetback;
          const candZ = node.z + bz * shoulderSetback;

          // Check safety: minimum 8.5m clearance from ANY building or shop to keep shops unblocked!
          if (isPositionSafeForSign(candX, candZ, 8.5)) {
            safeCorners.push({
              x: candX,
              z: candZ,
              approachArm: armA,
              bisectorAngle: midAngle,
            });
            break;
          }
        }
      }

      if (safeCorners.length === 0) continue;

      // 1. Build Direction Board destinations
      const primaryArm = arms.find(a => a.segment.roadClass === 'motorway' || a.segment.roadClass === 'trunk' || a.segment.roadClass === 'primary') || arms[0];
      const destinations: Array<{
        arrow: 'left' | 'straight' | 'right';
        nameEn: string;
        nameMl?: string;
        roadCode?: string;
        distanceKm?: number;
      }> = [];

      // Vehicle approaching junction along primaryArm:
      const fwdX = -primaryArm.ux;
      const fwdZ = -primaryArm.uz;

      for (const targetArm of arms) {
        if (targetArm === primaryArm) continue;

        const cosVal = fwdX * targetArm.ux + fwdZ * targetArm.uz;
        const crossVal = fwdX * targetArm.uz - fwdZ * targetArm.ux;

        let arrow: 'left' | 'straight' | 'right' = 'straight';
        if (cosVal > 0.45) {
          arrow = 'straight';
        } else if (crossVal > 0) {
          arrow = 'right';
        } else {
          arrow = 'left';
        }

        let nameEn = targetArm.segment.name || '';
        let nameMl = targetArm.segment.malayalamName || '';
        let roadCode: string | undefined = undefined;
        let distanceKm = 15;

        if (targetArm.segment.roadClass === 'motorway' || targetArm.segment.roadClass === 'trunk') {
          roadCode = 'NH 66';
          distanceKm = arrow === 'straight' ? 38 : 24;
        } else if (targetArm.segment.roadClass === 'primary') {
          roadCode = 'SH 17';
          distanceKm = arrow === 'straight' ? 22 : 12;
        } else {
          distanceKm = Math.floor(4 + Math.random() * 8);
        }

        if (!nameEn) {
          if (targetArm.uz < -0.4) {
            nameEn = 'Thrissur / Kozhikode';
            nameMl = 'തൃശ്ശൂർ / കോഴിക്കോട്';
          } else if (targetArm.uz > 0.4) {
            nameEn = 'Ernakulam / Trivandrum';
            nameMl = 'എറണാകുളം / തിരുവനന്തപുരം';
          } else if (targetArm.ux > 0.4) {
            nameEn = 'Palakkad / Munnar';
            nameMl = 'പാലക്കാട് / മൂന്നാർ';
          } else if (targetArm.ux < -0.4) {
            nameEn = 'Coastal Highway / Beach';
            nameMl = 'തീരദേശ റോഡ് / ബീച്ച്';
          } else {
            nameEn = 'Town Center';
            nameMl = 'ടൗൺ സെന്റർ';
          }
        }

        destinations.push({
          arrow,
          nameEn,
          nameMl: nameMl || undefined,
          roadCode,
          distanceKm,
        });

        if (destinations.length >= 3) break;
      }

      if (destinations.length === 0) {
        destinations.push({
          arrow: 'straight',
          nameEn: isHighway ? 'Thrissur / Kozhikode' : 'Town Center',
          nameMl: isHighway ? 'തൃശ്ശൂർ / കോഴിക്കോട്' : 'ടൗൺ സെന്റർ',
          roadCode: isHighway ? 'NH 66' : undefined,
          distanceKm: 28,
        });
      }

      // Place single sleek Direction Board on the roadside shoulder
      const corner1 = safeCorners[0];
      const dirBoard = this.signboardSystem.createJunctionDirectionBoard({
        junctionName,
        malayalamJunctionName: junctionNameMl,
        isNationalHighway: isHighway,
        destinations,
      });

      const elev1 = terrainEngine ? terrainEngine.getElevation(corner1.x, corner1.z) : 0;
      dirBoard.position.set(corner1.x, elev1, corner1.z);
      // Face oncoming drivers along the approach arm
      dirBoard.rotation.y = Math.atan2(primaryArm.ux, primaryArm.uz);
      chunkGroup.add(dirBoard);
      placedBoardPositions.push({ x: corner1.x, z: corner1.z });
      addedCount++;
    }

    return addedCount > 0 ? chunkGroup : null;
  }

  private isPointInPolygon(px: number, pz: number, polygon: LocalPoint2D[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, zi = polygon[i].z;
      const xj = polygon[j].x, zj = polygon[j].z;
      const intersect = (zi > pz !== zj > pz) && px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }
}

