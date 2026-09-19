import * as THREE from 'three';
import { BuildingGenerator } from './BuildingGenerator';
import { OpenStreetMapFetcher } from '../core/OpenStreetMapFetcher';
import { RoadGraph } from '../core/RoadGraph';
import { NormalizedBuilding } from '../core/geoTypes';
import maplibregl from 'maplibre-gl';
import { TerrainEngine } from '../core/TerrainEngine';
import { GeoCoords } from '../core/geoCoords';
import { TransitSystem } from './TransitSystem';

import { RoadBuildingCleanupSystem } from '../core/RoadBuildingCleanupSystem';
import { MapSignageManager } from './MapSignageManager';
import { PhysicalParkingLotGenerator } from './PhysicalParkingLotGenerator';
import { StreetElementGenerator } from './StreetElementGenerator';
import { BuildingClassifier } from '../core/BuildingClassifier';
import { MapPOIEntity } from '../core/SignageTypes';
import { ParkingSystem } from '../core/ParkingSystem';
import { WaterSystem } from '../core/WaterSystem';

export class RealBuildingManager {
  private generator: BuildingGenerator;
  private parkingLotGenerator: PhysicalParkingLotGenerator;
  private streetElementGenerator: StreetElementGenerator;
  public group: THREE.Group;
  private originLat: number;
  private originLng: number;

  public roadGraph: RoadGraph;
  public normalizedBuildings: Map<string | number, NormalizedBuilding> = new Map();
  public signageManager: MapSignageManager = new MapSignageManager();
  public parkingLots: Map<string, { x: number; z: number; rotationY: number; poi: MapPOIEntity }> = new Map();
  public busStops: Map<string, { x: number; z: number; rotationY: number; poi: MapPOIEntity }> = new Map();
  private fetchedAreas = new Set<string>();
  private syncedPoiKeys = new Set<string>();

  public onDataLoaded?: () => void;
  public latestReport: any;
  public latestCompileReport: any;
  private terrainEngine?: TerrainEngine;
  public parkingSystem?: ParkingSystem;
  public waterSystem?: WaterSystem;

  constructor(originLat: number, originLng: number) {
    this.originLat = originLat;
    this.originLng = originLng;
    this.group = new THREE.Group();
    this.group.name = 'real-buildings-layer';
    this.generator = new BuildingGenerator();
    this.parkingLotGenerator = new PhysicalParkingLotGenerator();
    this.streetElementGenerator = new StreetElementGenerator();
    this.roadGraph = new RoadGraph();
  }

  public setOrigin(lat: number, lng: number) {
    this.originLat = lat;
    this.originLng = lng;
    this.clear();
  }

  public setDependencies(terrainEngine: TerrainEngine, parkingSystem?: ParkingSystem, waterSystem?: WaterSystem) {
    this.terrainEngine = terrainEngine;
    this.parkingSystem = parkingSystem;
    this.waterSystem = waterSystem;
  }

  /**
   * Tests whether point (x, z) is safely away from all road pavements and water bodies.
   * Enforces realistic physical clearance from highways (min 14m) and roads into green free space.
   */
  public isPointSafe(x: number, z: number, minRoadClearance = 3.5, waterMargin = 2.0): boolean {
    if (this.waterSystem && this.waterSystem.isPointInWater(x, z, waterMargin)) {
      return false;
    }
    const allNear = this.roadGraph.getAllSegmentsNear(x, z, 55.0);
    for (const match of allNear) {
      const seg = match.segment;
      const halfRoad = seg.width * 0.5;
      let reqClearance = halfRoad + minRoadClearance;
      if (seg.roadClass === 'motorway' || seg.roadClass === 'trunk') {
        reqClearance = Math.max(reqClearance, 14.0); // NH requires at least 14m from centerline to reach green free space
      } else if (seg.roadClass === 'primary') {
        reqClearance = Math.max(reqClearance, 10.0);
      } else if (seg.roadClass === 'secondary') {
        reqClearance = Math.max(reqClearance, 7.5);
      }
      if (match.dist < reqClearance) {
        return false;
      }
    }
    return true;
  }

  /**
   * Tests whether all vertices, perimeter edges, and interior of a polygon are safely away
   * from any road pavement and outside any water bodies.
   * Uses 2.5m edge-sampling to ensure NO edge spans across or blocks a road.
   */
  public isPolygonSafe(pts: { x: number; z: number }[], minRoadClearance = 3.5, waterMargin = 2.0): boolean {
    if (!pts || pts.length < 3) return false;

    let cx = 0;
    let cz = 0;
    const n = pts.length;

    // 1. Check all vertices and sample along each perimeter edge
    for (let i = 0; i < n; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % n];

      cx += p1.x;
      cz += p1.z;

      if (!this.isPointSafe(p1.x, p1.z, minRoadClearance, waterMargin)) {
        return false;
      }

      // Sample along edge every 2.5m to catch any edge spanning across a road
      const edgeLen = Math.hypot(p2.x - p1.x, p2.z - p1.z);
      if (edgeLen > 2.5) {
        const steps = Math.ceil(edgeLen / 2.5);
        for (let s = 1; s < steps; s++) {
          const frac = s / steps;
          const sx = p1.x + (p2.x - p1.x) * frac;
          const sz = p1.z + (p2.z - p1.z) * frac;
          if (!this.isPointSafe(sx, sz, minRoadClearance, waterMargin)) {
            return false; // Edge crosses a road corridor!
          }
        }
      }
    }

    // 2. Check centroid
    cx /= n;
    cz /= n;
    if (!this.isPointSafe(cx, cz, minRoadClearance, waterMargin)) {
      return false;
    }

    // 3. Sample interior cross chords from centroid to each vertex
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      const midX = (cx + p.x) * 0.5;
      const midZ = (cz + p.z) * 0.5;
      if (!this.isPointSafe(midX, midZ, minRoadClearance, waterMargin)) {
        return false; // Interior of building overlaps a road!
      }
    }

    return true;
  }

  public clear() {
    this.group.clear();
    this.normalizedBuildings.clear();
    this.parkingLots.clear();
    this.busStops.clear();
    this.roadGraph.clear();
    this.fetchedAreas.clear();
    this.syncedPoiKeys.clear();
    this.signageManager = new MapSignageManager();
  }

  public isPointInPolygon(px: number, pz: number, polygon: { x: number; z: number }[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, zi = polygon[i].z;
      const xj = polygon[j].x, zj = polygon[j].z;
      const intersect = (zi > pz !== zj > pz) && px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  public distanceToPolygon(px: number, pz: number, polygon: { x: number; z: number }[]): number {
    let minDist = Infinity;
    const n = polygon.length;
    for (let i = 0; i < n; i++) {
      const p1 = polygon[i];
      const p2 = polygon[(i + 1) % n];
      const dx = p2.x - p1.x;
      const dz = p2.z - p1.z;
      const lenSq = dx * dx + dz * dz;
      let t = lenSq > 0 ? ((px - p1.x) * dx + (pz - p1.z) * dz) / lenSq : 0;
      t = Math.max(0, Math.min(1, t));
      const projX = p1.x + t * dx;
      const projZ = p1.z + t * dz;
      const d = Math.hypot(px - projX, pz - projZ);
      if (d < minDist) minDist = d;
    }
    return minDist;
  }

  /**
   * Identifies and eliminates overlapping and nested buildings across the entire map.
   * - Eliminates buildings nested inside larger buildings (e.g. sub-parts, internal stalls).
   * - Eliminates heavy building overlaps (>30% area collision).
   * - Transfers all tenant POIs, signage, and tags into the surviving host building.
   * - Marks discarded/nested buildings as validationStatus = 'rejected'.
   */
  public resolveBuildingOverlapsAndNesting(buildings: NormalizedBuilding[]): NormalizedBuilding[] {
    if (!buildings || buildings.length <= 1) return buildings;

    // Sort buildings by footprint area descending so larger complexes act as host buildings
    const sorted = [...buildings].sort((a, b) => {
      const areaA = a.areaSqMeters || Math.PI * (a.radius || 8.0) * (a.radius || 8.0);
      const areaB = b.areaSqMeters || Math.PI * (b.radius || 8.0) * (b.radius || 8.0);
      return areaB - areaA;
    });

    for (let i = 0; i < sorted.length; i++) {
      const host = sorted[i];
      if (host.validationStatus === 'rejected') continue;

      const hostPoly = (host.cleanedPolygon && host.cleanedPolygon[0]) || host.localPolygon;
      const hostRad = host.radius || 8.0;

      for (let j = i + 1; j < sorted.length; j++) {
        const candidate = sorted[j];
        if (candidate.validationStatus === 'rejected') continue;

        const candPoly = (candidate.cleanedPolygon && candidate.cleanedPolygon[0]) || candidate.localPolygon;
        const candRad = candidate.radius || 8.0;

        const dist = Math.hypot(host.centerX - candidate.centerX, host.centerZ - candidate.centerZ);
        const maxR = Math.max(hostRad, candRad);
        const minR = Math.min(hostRad, candRad);
        const sumR = hostRad + candRad;

        // Condition 1: Center of smaller building is inside bounding radius of larger building
        const isCenterNested = dist < maxR * 0.82 || dist < minR;
        // Condition 2: Heavy overlap between bounding circles
        const isHeavyOverlap = dist < sumR * 0.65;
        // Condition 3: Center of candidate is inside polygon of host, or host center is inside candidate polygon
        const isPolyNested =
          (hostPoly && hostPoly.length >= 3 && this.isPointInPolygon(candidate.centerX, candidate.centerZ, hostPoly)) ||
          (candPoly && candPoly.length >= 3 && this.isPointInPolygon(host.centerX, host.centerZ, candPoly));

        if (isCenterNested || isHeavyOverlap || isPolyNested) {
          // Overlap or nesting confirmed! Host absorbs candidate.
          const candHasName = Boolean(candidate.name && candidate.name !== 'Building' && candidate.name.trim().length > 0);
          const hostHasName = Boolean(host.name && host.name !== 'Building' && host.name.trim().length > 0);

          if (candHasName && !hostHasName) {
            host.name = candidate.name;
            host.category = candidate.category;
            host.tags = { ...host.tags, ...candidate.tags };
          }

          // Transfer all mapped POIs from candidate to host
          this.signageManager.transferPOIs(candidate.id, host.id);

          // If candidate was a named business itself, attach it as a tenant POI on host
          if (candHasName) {
            this.signageManager.addPOIToBuilding(host.id, {
              id: `absorbed-${candidate.id}`,
              sourceId: String(candidate.id),
              name: candidate.name || 'Store',
              malayalamName: candidate.tags?.['name:ml'],
              category: candidate.category || 'SHOP',
              lat: candidate.centerLat,
              lng: candidate.centerLng,
              x: candidate.centerX,
              z: candidate.centerZ,
              tags: candidate.tags || {},
              signType: 'FACADE',
              priorityTier: 'HIGH',
            });
          }

          // Mark candidate as rejected so it is never rendered
          candidate.validationStatus = 'rejected';
        }
      }
    }

    return sorted.filter((b) => b.validationStatus !== 'rejected');
  }

  public isCollidingWithAnyBuilding(
    x: number,
    z: number,
    clearance = 3.5,
    checkList?: NormalizedBuilding[]
  ): boolean {
    const list = checkList || Array.from(this.normalizedBuildings.values());
    for (const b of list) {
      if (b.validationStatus === 'rejected') continue;
      const bRad = b.radius || 8.0;
      const dist = Math.hypot(x - b.centerX, z - b.centerZ);
      if (dist > bRad + clearance + 6.0) continue;

      if (dist < bRad + clearance) {
        const poly = (b.cleanedPolygon && b.cleanedPolygon[0]) || b.localPolygon;
        if (poly && poly.length >= 3) {
          if (this.isPointInPolygon(x, z, poly)) return true;
          if (this.distanceToPolygon(x, z, poly) < clearance) return true;
        } else {
          return true;
        }
      }
    }
    return false;
  }

  public isBoxCollidingWithAnyBuilding(
    corners: { x: number; z: number }[],
    clearance = 3.0,
    checkList?: NormalizedBuilding[]
  ): boolean {
    if (!corners || corners.length < 3) return false;
    let cx = 0, cz = 0;
    for (const pt of corners) {
      cx += pt.x;
      cz += pt.z;
      if (this.isCollidingWithAnyBuilding(pt.x, pt.z, clearance, checkList)) return true;
    }
    cx /= corners.length;
    cz /= corners.length;
    if (this.isCollidingWithAnyBuilding(cx, cz, clearance, checkList)) return true;

    for (let i = 0; i < corners.length; i++) {
      const p1 = corners[i];
      const p2 = corners[(i + 1) % corners.length];
      const midX = (p1.x + p2.x) * 0.5;
      const midZ = (p1.z + p2.z) * 0.5;
      if (this.isCollidingWithAnyBuilding(midX, midZ, clearance, checkList)) return true;
    }
    return false;
  }

  public isPointInsideBuilding(x: number, z: number): boolean {
    return this.isCollidingWithAnyBuilding(x, z, 1.0);
  }

  public isNearMetroStation(centerX: number, centerZ: number): boolean {
    for (const st of TransitSystem.KOCHI_METRO_STATIONS) {
      const { x, z } = GeoCoords.toLocalMeters(st.lat, st.lng, this.originLat, this.originLng);
      if (Math.hypot(centerX - x, centerZ - z) < 48.0) {
        return true;
      }
    }
    return false;
  }

  public async fetchRealBuildings(lat: number, lng: number, radius = 500) {
    const areaKey = lat.toFixed(3) + '_' + lng.toFixed(3);
    if (this.fetchedAreas.has(areaKey)) return;
    // Mark as in-flight (prevents duplicate concurrent requests)
    this.fetchedAreas.add(areaKey);

    let successfulLoad = false;
    try {
      const data = await OpenStreetMapFetcher.fetchArea(lat, lng, radius, this.originLat, this.originLng);

      // Populate road network for road corridor & facade orientation
      for (const road of data.roads) {
        this.roadGraph.addRoadFeature(road.points, road.tags, this.originLat, this.originLng);
      }
      this.roadGraph.resolveDualCarriageways();

      // Ingest named POI entities (businesses, clinics, shops, restaurants)
      if (data.pois && data.pois.length > 0) {
        this.signageManager.addPOIs(data.pois);
      }

      const buildingsToProcess: NormalizedBuilding[] = [];
      // Populate normalized buildings (excluding any conflicting metro station buildings or water)
      for (const b of data.buildings) {
        // Strict water exclusion: Never place buildings in rivers, canals, or water bodies
        if (this.waterSystem && this.waterSystem.isPointInWater(b.centerX, b.centerZ, 2.0)) {
          continue;
        }

        const bName = (b.name || '').toLowerCase();
        const bType = (b.tags?.building || '').toLowerCase();
        const bSub = (b.tags?.subway || b.tags?.railway || '').toLowerCase();
        const isMetro =
          bName.includes('metro') ||
          bName.includes('subway') ||
          bType === 'train_station' ||
          bType === 'transportation' ||
          bSub === 'station' ||
          bSub === 'yes' ||
          this.isNearMetroStation(b.centerX, b.centerZ);

        if (isMetro) {
          // Exclude this building box so the authentic 3D Metro Station can fit cleanly!
          continue;
        }
        
        buildingsToProcess.push(b);
      }

      // Synthesize authentic roadside buildings, parking lots, and bus stops for remaining POIs!
      const synthesizedBuildings: NormalizedBuilding[] = [];
      if (data.pois && data.pois.length > 0) {
        this.synthesizeRoadsideEntities(data.pois, buildingsToProcess, synthesizedBuildings);
      }

      // RUN ROAD-BUILDING CLEANUP SYSTEM OVER ALL BUILDINGS (OSM + SYNTHESIZED)!
      const allToClean = [...buildingsToProcess, ...synthesizedBuildings];
      const cleanedBuildings = RoadBuildingCleanupSystem.processBuildings(allToClean, this.roadGraph, this.waterSystem);

      // RESOLVE OVERLAPS & NESTING ACROSS ENTIRE MAP
      const deNestedBuildings = this.resolveBuildingOverlapsAndNesting(cleanedBuildings);

      for (const b of deNestedBuildings) {
        if (b.validationStatus === 'rejected') continue;
        this.normalizedBuildings.set(b.id, b);
      }

      // Associate POIs with cleaned buildings for physical signboard placement
      this.signageManager.matchPOIsToBuildings(this.normalizedBuildings.values());

      // Also ensure POIs assigned to synthesized buildings that survived cleanup are registered
      for (const b of synthesizedBuildings) {
        if (b.validationStatus !== 'rejected' && this.normalizedBuildings.has(b.id)) {
          const matchPoi = data.pois.find((p) => p.matchedBuildingId === String(b.id));
          if (matchPoi) {
            this.signageManager.addPOIToBuilding(b.id, matchPoi);
          }
        }
      }

      // Re-run global overlap & nesting de-duplication across all active buildings
      const allActive = Array.from(this.normalizedBuildings.values());
      this.resolveBuildingOverlapsAndNesting(allActive);
      for (const b of allActive) {
        if (b.validationStatus === 'rejected') {
          this.normalizedBuildings.delete(b.id);
        }
      }

      // Mark as successfully loaded only if actual buildings or POIs came back
      if (data.buildings.length > 0 || data.roads.length > 0 || data.pois.length > 0) {
        successfulLoad = true;
      }

      if (this.onDataLoaded) this.onDataLoaded();
    } catch (e) {
      console.error('OSM fetch error', e);
    }

    // If the fetch returned no data at all, remove from fetchedAreas so we can retry
    if (!successfulLoad) {
      this.fetchedAreas.delete(areaKey);
    }
  }

  /**
   * For POIs mapped as point nodes without footprint polygons,
   * synthesizes real physical roadside buildings, parking lots, or bus stops in safe free space!
   */
  private synthesizeRoadsideEntities(
    pois: MapPOIEntity[],
    existingBuildings: NormalizedBuilding[],
    outSynthBuildings: NormalizedBuilding[]
  ) {
    // 0. Deduplicate input POIs by proximity (< 45m) and name matching
    const uniquePOIs: MapPOIEntity[] = [];
    for (const poi of pois) {
      if (poi.matchedBuildingId) {
        uniquePOIs.push(poi);
        continue;
      }
      const pName = (poi.name || '').toLowerCase().trim();
      const duplicate = uniquePOIs.find((u) => {
        const uName = (u.name || '').toLowerCase().trim();
        const dist = Math.hypot(poi.x - u.x, poi.z - u.z);
        if (dist > 45.0) return false;
        return (
          pName === uName ||
          (pName.length > 3 && uName.length > 3 && (pName.includes(uName) || uName.includes(pName)))
        );
      });
      if (!duplicate) {
        uniquePOIs.push(poi);
      } else {
        poi.matchedBuildingId = duplicate.matchedBuildingId || duplicate.id;
      }
    }

    const allKnownBuildings = [...this.normalizedBuildings.values(), ...existingBuildings, ...outSynthBuildings];

    for (const poi of uniquePOIs) {
      if (poi.matchedBuildingId) continue;

      // 1. Physical 3D Parking Lots ("P")
      if (poi.category === 'PARKING') {
        const near = this.roadGraph.getNearestSegment(poi.x, poi.z, 85.0);
        if (near) {
          const halfRoad = near.segment.width * 0.5;
          const toPoiX = poi.x - near.projX;
          const toPoiZ = poi.z - near.projZ;
          const dot = toPoiX * near.segment.nx + toPoiZ * near.segment.nz;
          const initialSide = dot >= 0 ? 1 : -1;

          const lotDepth = 8.4;
          const lotWidth = 16.8;
          const setback = 3.5; // Front entrance is placed 3.5m outside the road boundary in free space!

          let foundSafe = false;
          let posX = 0;
          let posZ = 0;
          let rotY = 0;

          // Try preferred side, then opposite side
          for (const s of [initialSide, -initialSide]) {
            const nx = near.segment.nx * s;
            const nz = near.segment.nz * s;
            const ux = near.segment.ux;
            const uz = near.segment.uz;

            // Try setbacks: normal setback + 0m, +3m, +6m
            for (const extraSetback of [0, 3.0, 6.0]) {
              const testDist = halfRoad + setback + extraSetback + lotDepth * 0.5;
              const testX = near.projX + nx * testDist;
              const testZ = near.projZ + nz * testDist;

              const halfW = lotWidth * 0.5;
              const halfD = lotDepth * 0.5;
              const c_fl = { x: testX - ux * halfW - nx * halfD, z: testZ - uz * halfW - nz * halfD };
              const c_fr = { x: testX + ux * halfW - nx * halfD, z: testZ + uz * halfW - nz * halfD };
              const c_br = { x: testX + ux * halfW + nx * halfD, z: testZ + uz * halfW + nz * halfD };
              const c_bl = { x: testX - ux * halfW + nx * halfD, z: testZ - uz * halfW + nz * halfD };

              if (this.isPolygonSafe([c_fl, c_fr, c_br, c_bl], 2.5, 2.0)) {
                if (!this.isBoxCollidingWithAnyBuilding([c_fl, c_fr, c_br, c_bl], 3.0, allKnownBuildings)) {
                  foundSafe = true;
                  posX = testX;
                  posZ = testZ;
                  rotY = Math.atan2(-nx, -nz);
                  break;
                }
              }
            }
            if (foundSafe) break;
          }

          if (foundSafe) {
            this.parkingLots.set(poi.id, { x: posX, z: posZ, rotationY: rotY, poi });
            poi.matchedBuildingId = `parking-${poi.id}`;
          }
        }
        continue;
      }

      // 2. Physical 3D Roadside Bus Stops
      if (poi.category === 'BUS_STOP') {
        const near = this.roadGraph.getNearestSegment(poi.x, poi.z, 75.0);
        if (near) {
          const halfRoad = near.segment.width * 0.5;
          const toPoiX = poi.x - near.projX;
          const toPoiZ = poi.z - near.projZ;
          const dot = toPoiX * near.segment.nx + toPoiZ * near.segment.nz;
          const initialSide = dot >= 0 ? 1 : -1;

          const pw = 6.2;
          const pd = 3.2;
          const setback = 3.5; // Must be placed at least 3.5m outside road boundary in free space!

          let foundSafe = false;
          let posX = 0;
          let posZ = 0;
          let rotY = 0;

          // Try preferred side, then opposite side
          for (const s of [initialSide, -initialSide]) {
            const nx = near.segment.nx * s;
            const nz = near.segment.nz * s;
            const ux = near.segment.ux;
            const uz = near.segment.uz;

            for (const extraSetback of [0, 2.5, 5.0]) {
              const testDist = halfRoad + setback + extraSetback + pd * 0.5;
              const testX = near.projX + nx * testDist;
              const testZ = near.projZ + nz * testDist;

              const halfW = pw * 0.5;
              const halfD = pd * 0.5;
              const c_fl = { x: testX - ux * halfW - nx * halfD, z: testZ - uz * halfW - nz * halfD };
              const c_fr = { x: testX + ux * halfW - nx * halfD, z: testZ + uz * halfW - nz * halfD };
              const c_br = { x: testX + ux * halfW + nx * halfD, z: testZ + uz * halfW + nz * halfD };
              const c_bl = { x: testX - ux * halfW + nx * halfD, z: testZ - uz * halfW + nz * halfD };

              // Strict safety: clearance from ANY road segment, water bodies, and ALL buildings!
              if (this.isPolygonSafe([c_fl, c_fr, c_br, c_bl], 3.0, 2.0)) {
                if (!this.isBoxCollidingWithAnyBuilding([c_fl, c_fr, c_br, c_bl], 3.5, allKnownBuildings)) {
                  foundSafe = true;
                  posX = testX;
                  posZ = testZ;
                  rotY = Math.atan2(-nx, -nz);
                  break;
                }
              }
            }
            if (foundSafe) break;
          }

          if (foundSafe) {
            this.busStops.set(poi.id, { x: posX, z: posZ, rotationY: rotY, poi });
            poi.matchedBuildingId = `busstop-${poi.id}`;
          }
        }
        continue;
      }
    }

    // 3. Commercial, Retail, Dining, and Civic POIs -> Unified Complexes & Buildings!
    const commercialCategories = new Set([
      'SHOP',
      'SUPERMARKET',
      'CAFE',
      'RESTAURANT',
      'OFFICE',
      'HOTEL',
    ]);

    const remainingPOIs: MapPOIEntity[] = [];

    for (const poi of uniquePOIs) {
      if (poi.matchedBuildingId || poi.category === 'PARKING' || poi.category === 'BUS_STOP') continue;

      const isEligiblePOI =
        commercialCategories.has(poi.category) ||
        poi.category === 'GOVERNMENT' ||
        poi.category === 'HOSPITAL' ||
        poi.category === 'PUBLIC' ||
        poi.category === 'COLLEGE' ||
        poi.category === 'SCHOOL' ||
        Boolean(poi.tags?.shop || poi.tags?.amenity || (poi.name && poi.name.length > 2 && poi.name !== 'Building'));

      if (!isEligiblePOI) continue;

      // A. Check if ANY existing building matches by name
      const pNameLower = poi.name.toLowerCase().trim();
      let matchedExisting = false;
      const currentBuildings = [...this.normalizedBuildings.values(), ...existingBuildings, ...outSynthBuildings];

      for (const b of currentBuildings) {
        if (b.validationStatus === 'rejected') continue;
        const dist = Math.hypot(poi.x - b.centerX, poi.z - b.centerZ);
        const bNameLower = (b.name || '').toLowerCase().trim();

        if (
          bNameLower.length > 2 &&
          (bNameLower === pNameLower ||
            bNameLower.includes(pNameLower) ||
            pNameLower.includes(bNameLower)) &&
          dist <= 45.0
        ) {
          poi.matchedBuildingId = String(b.id);
          this.signageManager.addPOIToBuilding(b.id, poi);
          matchedExisting = true;
          break;
        }
      }
      if (matchedExisting) continue;

      // B. Commercial / Retail POI: Check if ANY existing building within 24m can adopt it as a co-tenant
      const isCommercial = commercialCategories.has(poi.category) || Boolean(poi.tags?.shop || poi.tags?.amenity);
      let adopted = false;
      if (isCommercial) {
        for (const b of currentBuildings) {
          if (b.validationStatus === 'rejected') continue;
          const dist = Math.hypot(poi.x - b.centerX, poi.z - b.centerZ);
          if (dist <= 24.0) {
            const tenants = this.signageManager.getPOIsForBuilding(b.id);
            if (tenants.length < 4) {
              if (!b.name || b.name === 'Building' || b.name.trim() === '') {
                b.name = poi.name;
                b.category = poi.category;
              }
              poi.matchedBuildingId = String(b.id);
              poi.signType = 'FACADE';
              this.signageManager.addPOIToBuilding(b.id, poi);
              adopted = true;
              break;
            }
          }
        }
      }
      if (adopted) continue;

      remainingPOIs.push(poi);
    }

    const commercialPOIs: MapPOIEntity[] = [];
    const civicPOIs: MapPOIEntity[] = [];

    for (const poi of remainingPOIs) {
      if (commercialCategories.has(poi.category) || poi.tags?.shop || poi.tags?.amenity) {
        commercialPOIs.push(poi);
      } else {
        civicPOIs.push(poi);
      }
    }

    // Cluster commercial POIs within 24m into unified commercial complexes (up to 4 shops per building)
    const commercialClusters: MapPOIEntity[][] = [];
    for (const poi of commercialPOIs) {
      let added = false;
      for (const cluster of commercialClusters) {
        if (cluster.length >= 4) continue;
        const canJoin = cluster.some((cp) => Math.hypot(poi.x - cp.x, poi.z - cp.z) <= 24.0);
        if (canJoin) {
          cluster.push(poi);
          added = true;
          break;
        }
      }
      if (!added) {
        commercialClusters.push([poi]);
      }
    }

    // Synthesize one single commercial building per cluster
    for (const cluster of commercialClusters) {
      const k = cluster.length;
      const clusterCx = cluster.reduce((s, p) => s + p.x, 0) / k;
      const clusterCz = cluster.reduce((s, p) => s + p.z, 0) / k;
      const clusterLat = cluster.reduce((s, p) => s + p.lat, 0) / k;
      const clusterLng = cluster.reduce((s, p) => s + p.lng, 0) / k;

      const isMall = cluster.some(
        (p) => (p.name || '').toLowerCase().includes('mall') || p.tags?.shop === 'mall'
      );
      const isSuper = cluster.some(
        (p) =>
          p.category === 'SUPERMARKET' ||
          (p.name || '').toLowerCase().includes('supermarket') ||
          (p.name || '').toLowerCase().includes('hypermarket') ||
          (p.name || '').toLowerCase().includes('tile')
      );

      let W = 9.5;
      let D = 7.5;
      let H = 5.0;
      let levels = 1;

      if (isMall) {
        W = Math.max(26.0, k * 7.5);
        D = 18.0;
        H = 12.0;
        levels = 3;
      } else if (isSuper) {
        W = Math.max(16.0, k * 6.5);
        D = 10.0;
        H = 5.8;
        levels = 1;
      } else if (k === 2) {
        W = 16.0;
        D = 8.0;
        H = 5.4;
        levels = 1;
      } else if (k === 3) {
        W = 22.0;
        D = 8.5;
        H = 5.6;
        levels = 2;
      } else if (k >= 4) {
        W = 28.0;
        D = 9.0;
        H = 6.0;
        levels = 2;
      }

      const checkList = [...this.normalizedBuildings.values(), ...existingBuildings, ...outSynthBuildings];
      const isBoxLocationSafe = (
        fl: { x: number; z: number },
        fr: { x: number; z: number },
        br: { x: number; z: number },
        bl: { x: number; z: number },
        cx: number,
        cz: number
      ) => {
        for (const ex of checkList) {
          if (ex.validationStatus === 'rejected') continue;
          const d = Math.hypot(cx - ex.centerX, cz - ex.centerZ);
          if (d < Math.hypot(W, D) * 0.5 + (ex.radius || 8.0) + 3.5) return false;
        }
        for (const bs of this.busStops.values()) {
          if (Math.hypot(cx - bs.x, cz - bs.z) < Math.hypot(W, D) * 0.5 + 4.0) return false;
        }
        for (const pl of this.parkingLots.values()) {
          if (Math.hypot(cx - pl.x, cz - pl.z) < Math.hypot(W, D) * 0.5 + 10.0) return false;
        }
        if (this.isBoxCollidingWithAnyBuilding([fl, fr, br, bl], 3.0, checkList)) return false;
        if (!this.isPolygonSafe([fl, fr, br, bl], 3.2, 1.5)) return false;
        return true;
      };

      const near = this.roadGraph.getNearestSegment(clusterCx, clusterCz, 160.0);
      let faceX = 0,
        faceZ = 1;
      let tanX = 1,
        tanZ = 0;

      if (near) {
        const dx = near.projX - clusterCx;
        const dz = near.projZ - clusterCz;
        const d = Math.hypot(dx, dz);
        if (d > 0.5) {
          faceX = dx / d;
          faceZ = dz / d;
        } else {
          faceX = near.segment.nx;
          faceZ = near.segment.nz;
        }
        tanX = -faceZ;
        tanZ = faceX;
      }

      let foundSafe = false;
      let chosenCenterX = 0;
      let chosenCenterZ = 0;
      let chosenPoly: { x: number; z: number }[] = [];

      // Strategy A: Direct In-Situ Placement in free space
      const inSituNudges = [
        { ox: 0, oz: 0 },
        { ox: tanX * 3.5, oz: tanZ * 3.5 },
        { ox: -tanX * 3.5, oz: -tanZ * 3.5 },
        { ox: faceX * 3.5, oz: faceZ * 3.5 },
        { ox: -faceX * 3.5, oz: -faceZ * 3.5 },
        { ox: tanX * 7.0, oz: tanZ * 7.0 },
        { ox: -tanX * 7.0, oz: -tanZ * 7.0 },
        { ox: faceX * 7.0, oz: faceZ * 7.0 },
        { ox: -faceX * 7.0, oz: -faceZ * 7.0 },
      ];

      for (const nudge of inSituNudges) {
        const testCx = clusterCx + nudge.ox;
        const testCz = clusterCz + nudge.oz;

        const fl = {
          x: testCx - tanX * (W * 0.5) + faceX * (D * 0.5),
          z: testCz - tanZ * (W * 0.5) + faceZ * (D * 0.5),
        };
        const fr = {
          x: testCx + tanX * (W * 0.5) + faceX * (D * 0.5),
          z: testCz + tanZ * (W * 0.5) + faceZ * (D * 0.5),
        };
        const br = {
          x: testCx + tanX * (W * 0.5) - faceX * (D * 0.5),
          z: testCz + tanZ * (W * 0.5) - faceZ * (D * 0.5),
        };
        const bl = {
          x: testCx - tanX * (W * 0.5) - faceX * (D * 0.5),
          z: testCz - tanZ * (W * 0.5) - faceZ * (D * 0.5),
        };

        if (isBoxLocationSafe(fl, fr, br, bl, testCx, testCz)) {
          foundSafe = true;
          chosenCenterX = testCx;
          chosenCenterZ = testCz;
          chosenPoly = [fl, fr, br, bl, fl];
          break;
        }
      }

      // Strategy B: Fallback to Roadside Verge if obstructed
      if (!foundSafe && near) {
        const halfRoad = near.segment.width * 0.5;
        const toPoiX = clusterCx - near.projX;
        const toPoiZ = clusterCz - near.projZ;
        const dot = toPoiX * near.segment.nx + toPoiZ * near.segment.nz;
        const initialSide = dot >= 0 ? 1 : -1;
        const ux = near.segment.ux;
        const uz = near.segment.uz;

        for (const s of [initialSide, -initialSide]) {
          const nx = near.segment.nx * s;
          const nz = near.segment.nz * s;

          for (const extraSetback of [0, 4.0, 8.0, 12.0]) {
            for (const tanOffset of [0, W * 1.2, -W * 1.2, W * 2.4, -W * 2.4]) {
              const frontDist = halfRoad + 4.5 + extraSetback;
              const testCx = near.projX + nx * (frontDist + D * 0.5) + ux * tanOffset;
              const testCz = near.projZ + nz * (frontDist + D * 0.5) + uz * tanOffset;

              const fl = {
                x: testCx - ux * (W * 0.5) - nx * (D * 0.5),
                z: testCz - uz * (W * 0.5) - nz * (D * 0.5),
              };
              const fr = {
                x: testCx + ux * (W * 0.5) - nx * (D * 0.5),
                z: testCz + uz * (W * 0.5) - nz * (D * 0.5),
              };
              const br = {
                x: testCx + ux * (W * 0.5) + nx * (D * 0.5),
                z: testCz + uz * (W * 0.5) + nz * (D * 0.5),
              };
              const bl = {
                x: testCx - ux * (W * 0.5) + nx * (D * 0.5),
                z: testCz - uz * (W * 0.5) + nz * (D * 0.5),
              };

              if (isBoxLocationSafe(fl, fr, br, bl, testCx, testCz)) {
                foundSafe = true;
                chosenCenterX = testCx;
                chosenCenterZ = testCz;
                chosenPoly = [fl, fr, br, bl, fl];
                break;
              }
            }
            if (foundSafe) break;
          }
          if (foundSafe) break;
        }
      }

      if (!foundSafe) continue;

      let bName = cluster[0].name;
      if (k > 1) {
        const mallPoi = cluster.find(
          (p) =>
            (p.name || '').toLowerCase().includes('mall') ||
            (p.name || '').toLowerCase().includes('complex') ||
            (p.name || '').toLowerCase().includes('centre')
        );
        bName = mallPoi ? mallPoi.name : `${cluster[0].name} & Commercial Arcade`;
      }

      const primaryPOI = cluster[0];
      const synthBuilding: NormalizedBuilding = {
        id: `synth-comm-${primaryPOI.id}`,
        name: bName,
        source: 'custom',
        category: isMall || isSuper ? 'SUPERMARKET' : 'SHOP',
        modelFamily: BuildingClassifier.getModelFamily('SHOP', primaryPOI.tags),
        centerX: chosenCenterX,
        centerZ: chosenCenterZ,
        centerLat: clusterLat,
        centerLng: clusterLng,
        radius: Math.hypot(W, D) * 0.5,
        height: H,
        levels,
        importanceLevel: isMall ? 4 : 3,
        coordinates: [
          [clusterLng, clusterLat],
          [clusterLng, clusterLat],
          [clusterLng, clusterLat],
          [clusterLng, clusterLat],
          [clusterLng, clusterLat],
        ],
        localPolygon: chosenPoly,
        cleanedPolygon: [[chosenPoly[0], chosenPoly[1], chosenPoly[2], chosenPoly[3]]],
        roadFacing: true,
        areaSqMeters: W * D,
        tags: { ...primaryPOI.tags, name: bName },
        validationStatus: 'clean',
      };

      outSynthBuildings.push(synthBuilding);
      existingBuildings.push(synthBuilding);

      for (const p of cluster) {
        p.matchedBuildingId = String(synthBuilding.id);
        p.signType = isMall ? 'ROOFTOP' : 'FACADE';
        this.signageManager.addPOIToBuilding(synthBuilding.id, p);
      }
    }

    // Synthesize civic buildings (Police, Hospital, School, etc.)
    for (const poi of civicPOIs) {
      const lowerName = poi.name.toLowerCase();
      const isPolice = lowerName.includes('police') || poi.tags.amenity === 'police';
      const isHospital = poi.category === 'HOSPITAL' || lowerName.includes('hospital');

      let W = 12.0;
      let D = 8.0;
      let H = 5.5;
      let levels = 1;

      if (isHospital) {
        W = 24.0;
        D = 16.0;
        H = 14.0;
        levels = 4;
      } else if (isPolice) {
        W = 14.0;
        D = 9.0;
        H = 6.8;
        levels = 2;
      } else if (poi.category === 'SCHOOL' || poi.category === 'COLLEGE') {
        W = 18.0;
        D = 12.0;
        H = 8.0;
        levels = 2;
      }

      const checkList = [...this.normalizedBuildings.values(), ...existingBuildings, ...outSynthBuildings];
      const isBoxLocationSafe = (
        fl: { x: number; z: number },
        fr: { x: number; z: number },
        br: { x: number; z: number },
        bl: { x: number; z: number },
        cx: number,
        cz: number
      ) => {
        for (const ex of checkList) {
          if (ex.validationStatus === 'rejected') continue;
          const d = Math.hypot(cx - ex.centerX, cz - ex.centerZ);
          if (d < Math.hypot(W, D) * 0.5 + (ex.radius || 8.0) + 3.5) return false;
        }
        for (const bs of this.busStops.values()) {
          if (Math.hypot(cx - bs.x, cz - bs.z) < Math.hypot(W, D) * 0.5 + 4.0) return false;
        }
        for (const pl of this.parkingLots.values()) {
          if (Math.hypot(cx - pl.x, cz - pl.z) < Math.hypot(W, D) * 0.5 + 10.0) return false;
        }
        if (this.isBoxCollidingWithAnyBuilding([fl, fr, br, bl], 3.0, checkList)) return false;
        if (!this.isPolygonSafe([fl, fr, br, bl], 3.2, 1.5)) return false;
        return true;
      };

      const near = this.roadGraph.getNearestSegment(poi.x, poi.z, 160.0);
      let faceX = 0,
        faceZ = 1;
      let tanX = 1,
        tanZ = 0;

      if (near) {
        const dx = near.projX - poi.x;
        const dz = near.projZ - poi.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.5) {
          faceX = dx / d;
          faceZ = dz / d;
        } else {
          faceX = near.segment.nx;
          faceZ = near.segment.nz;
        }
        tanX = -faceZ;
        tanZ = faceX;
      }

      let foundSafe = false;
      let chosenCenterX = 0;
      let chosenCenterZ = 0;
      let chosenPoly: { x: number; z: number }[] = [];

      const inSituNudges = [
        { ox: 0, oz: 0 },
        { ox: tanX * 3.5, oz: tanZ * 3.5 },
        { ox: -tanX * 3.5, oz: -tanZ * 3.5 },
        { ox: faceX * 3.5, oz: faceZ * 3.5 },
        { ox: -faceX * 3.5, oz: -faceZ * 3.5 },
      ];

      for (const nudge of inSituNudges) {
        const testCx = poi.x + nudge.ox;
        const testCz = poi.z + nudge.oz;

        const fl = {
          x: testCx - tanX * (W * 0.5) + faceX * (D * 0.5),
          z: testCz - tanZ * (W * 0.5) + faceZ * (D * 0.5),
        };
        const fr = {
          x: testCx + tanX * (W * 0.5) + faceX * (D * 0.5),
          z: testCz + tanZ * (W * 0.5) + faceZ * (D * 0.5),
        };
        const br = {
          x: testCx + tanX * (W * 0.5) - faceX * (D * 0.5),
          z: testCz + tanZ * (W * 0.5) - faceZ * (D * 0.5),
        };
        const bl = {
          x: testCx - tanX * (W * 0.5) - faceX * (D * 0.5),
          z: testCz - tanZ * (W * 0.5) - faceZ * (D * 0.5),
        };

        if (isBoxLocationSafe(fl, fr, br, bl, testCx, testCz)) {
          foundSafe = true;
          chosenCenterX = testCx;
          chosenCenterZ = testCz;
          chosenPoly = [fl, fr, br, bl, fl];
          break;
        }
      }

      if (!foundSafe && near) {
        const halfRoad = near.segment.width * 0.5;
        const toPoiX = poi.x - near.projX;
        const toPoiZ = poi.z - near.projZ;
        const dot = toPoiX * near.segment.nx + toPoiZ * near.segment.nz;
        const initialSide = dot >= 0 ? 1 : -1;
        const ux = near.segment.ux;
        const uz = near.segment.uz;

        for (const s of [initialSide, -initialSide]) {
          const nx = near.segment.nx * s;
          const nz = near.segment.nz * s;

          for (const extraSetback of [0, 4.0, 8.0]) {
            const frontDist = halfRoad + 4.5 + extraSetback;
            const testCx = near.projX + nx * (frontDist + D * 0.5);
            const testCz = near.projZ + nz * (frontDist + D * 0.5);

            const fl = {
              x: testCx - ux * (W * 0.5) - nx * (D * 0.5),
              z: testCz - uz * (W * 0.5) - nz * (D * 0.5),
            };
            const fr = {
              x: testCx + ux * (W * 0.5) - nx * (D * 0.5),
              z: testCz + uz * (W * 0.5) - nz * (D * 0.5),
            };
            const br = {
              x: testCx + ux * (W * 0.5) + nx * (D * 0.5),
              z: testCz + uz * (W * 0.5) + nz * (D * 0.5),
            };
            const bl = {
              x: testCx - ux * (W * 0.5) + nx * (D * 0.5),
              z: testCz - uz * (W * 0.5) + nz * (D * 0.5),
            };

            if (isBoxLocationSafe(fl, fr, br, bl, testCx, testCz)) {
              foundSafe = true;
              chosenCenterX = testCx;
              chosenCenterZ = testCz;
              chosenPoly = [fl, fr, br, bl, fl];
              break;
            }
          }
          if (foundSafe) break;
        }
      }

      if (!foundSafe) continue;

      const synthBuilding: NormalizedBuilding = {
        id: `synth-civic-${poi.id}`,
        name: poi.name,
        source: 'custom',
        category: isPolice ? 'GOVERNMENT' : isHospital ? 'HOSPITAL' : poi.category,
        modelFamily: BuildingClassifier.getModelFamily(poi.category, poi.tags),
        centerX: chosenCenterX,
        centerZ: chosenCenterZ,
        centerLat: poi.lat,
        centerLng: poi.lng,
        radius: Math.hypot(W, D) * 0.5,
        height: H,
        levels,
        importanceLevel: isHospital || isPolice ? 4 : 3,
        coordinates: [
          [poi.lng, poi.lat],
          [poi.lng, poi.lat],
          [poi.lng, poi.lat],
          [poi.lng, poi.lat],
          [poi.lng, poi.lat],
        ],
        localPolygon: chosenPoly,
        cleanedPolygon: [[chosenPoly[0], chosenPoly[1], chosenPoly[2], chosenPoly[3]]],
        roadFacing: true,
        areaSqMeters: W * D,
        tags: { ...poi.tags, name: poi.name, 'name:ml': poi.malayalamName || '' },
        validationStatus: 'clean',
      };

      outSynthBuildings.push(synthBuilding);
      existingBuildings.push(synthBuilding);
      poi.matchedBuildingId = String(synthBuilding.id);
      poi.signType = isHospital ? 'ROOFTOP' : 'FACADE';
      this.signageManager.addPOIToBuilding(synthBuilding.id, poi);
    }
  }

  public syncFromMap(map: maplibregl.Map) {
    if (!map) return;
    try {
      let roadFeatures: any[] = [];
      const vectorSourceId = map.getSource('openmaptiles') ? 'openmaptiles' : (map.getSource('openfreemap') ? 'openfreemap' : undefined);
      if (vectorSourceId && map.querySourceFeatures) {
        try {
          roadFeatures = map.querySourceFeatures(vectorSourceId, { sourceLayer: 'transportation' }) || [];
        } catch (_e) {}
      }
      if (!roadFeatures || roadFeatures.length === 0) {
        const rendered = map.queryRenderedFeatures() || [];
        roadFeatures = rendered.filter(
          f => f.sourceLayer === 'transportation' ||
               (f.layer && f.layer.id && (f.layer.id.includes('road') || f.layer.id.includes('tunnel') || f.layer.id.includes('highway')))
        );
      }

      for (const feat of roadFeatures) {
        if (!feat.geometry) continue;
        let lines: [number, number][][] = [];
        if (feat.geometry.type === 'LineString') {
          lines = [feat.geometry.coordinates as [number, number][]];
        } else if (feat.geometry.type === 'MultiLineString') {
          lines = feat.geometry.coordinates as [number, number][][];
        }

        const props = feat.properties || {};
        for (const line of lines) {
          if (line.length >= 2) {
            this.roadGraph.addRoadFeature(line, props, this.originLat, this.originLng);
          }
        }
      }

      // Query and ingest POI features from vector tiles (shops, cafes, restaurants in open free space)
      let poiFeatures: any[] = [];
      if (vectorSourceId && map.querySourceFeatures) {
        try {
          poiFeatures = map.querySourceFeatures(vectorSourceId, { sourceLayer: 'poi' }) || [];
        } catch (_e) {}
      }
      if (!poiFeatures || poiFeatures.length === 0) {
        try {
          const rendered = map.queryRenderedFeatures() || [];
          poiFeatures = rendered.filter(
            f => f.sourceLayer === 'poi' || (f.layer && f.layer.id && f.layer.id.includes('poi'))
          );
        } catch (_e) {}
      }

      const newPoisToSynthesize: MapPOIEntity[] = [];
      for (const feat of poiFeatures) {
        if (!feat.geometry) continue;
        let coords: [number, number] | null = null;
        if (feat.geometry.type === 'Point' && Array.isArray(feat.geometry.coordinates)) {
          coords = feat.geometry.coordinates as [number, number];
        }
        if (!coords) continue;

        const props = feat.properties || {};
        const pName = (props.name || props['name:en'] || props['name:ml'] || props.subclass || '').trim();
        if (!pName || pName.length < 2) continue;

        const [lng, lat] = coords;
        const { x: px, z: pz } = GeoCoords.toLocalMeters(lat, lng, this.originLat, this.originLng);

        const pKey = `${pName.toLowerCase()}_${Math.round(px / 15)}_${Math.round(pz / 15)}`;
        if (this.syncedPoiKeys.has(pKey)) continue;
        this.syncedPoiKeys.add(pKey);

        const category = BuildingClassifier.classify(props);
        const isBusStop = props.class === 'bus' || props.subclass === 'bus_stop' || props.highway === 'bus_stop';
        const isParking = props.class === 'parking' || props.amenity === 'parking';

        const poi: MapPOIEntity = {
          id: `vpoi-${feat.id || (Math.round(px) + '_' + Math.round(pz))}`,
          sourceId: String(feat.id || 'vatile'),
          name: pName,
          malayalamName: props['name:ml'] || props.name_ml,
          category: isBusStop ? 'BUS_STOP' : isParking ? 'PARKING' : (category || 'SHOP'),
          lat,
          lng,
          x: px,
          z: pz,
          tags: props,
          signType: 'FACADE',
          priorityTier: 'HIGH',
        };

        newPoisToSynthesize.push(poi);
      }

      if (newPoisToSynthesize.length > 0) {
        this.signageManager.addPOIs(newPoisToSynthesize);
        const synth: NormalizedBuilding[] = [];
        this.synthesizeRoadsideEntities(newPoisToSynthesize, Array.from(this.normalizedBuildings.values()), synth);
        const cleaned = RoadBuildingCleanupSystem.processBuildings(synth, this.roadGraph, this.waterSystem);
        const deNested = this.resolveBuildingOverlapsAndNesting(cleaned);
        let addedAny = false;
        for (const b of deNested) {
          if (b.validationStatus !== 'rejected' && !this.normalizedBuildings.has(b.id)) {
            this.normalizedBuildings.set(b.id, b);
            const mPoi = newPoisToSynthesize.find(p => p.matchedBuildingId === String(b.id));
            if (mPoi) {
              this.signageManager.addPOIToBuilding(b.id, mPoi);
            }
            addedAny = true;
          }
        }
        if (addedAny) {
          const allB = Array.from(this.normalizedBuildings.values());
          this.resolveBuildingOverlapsAndNesting(allB);
          for (const b of allB) {
            if (b.validationStatus === 'rejected') {
              this.normalizedBuildings.delete(b.id);
            }
          }
        }
        if (addedAny && this.onDataLoaded) {
          this.onDataLoaded();
        }
      }
    } catch (_e) {}
  }

  /**
   * Called by WorldChunkManager when a chunk is loaded.
   * Returns a Group of buildings that strictly belong to this chunk.
   */
  public buildChunk(minX: number, minZ: number, maxX: number, maxZ: number): THREE.Group | null {
    const chunkGroup = new THREE.Group();
    chunkGroup.name = `buildings-${minX}-${minZ}`;

    let added = 0;

    // 1. Render all normalized and synthesized roadside buildings
    for (const [id, b] of this.normalizedBuildings.entries()) {
      if (b.centerX >= minX && b.centerX < maxX && b.centerZ >= minZ && b.centerZ < maxZ) {
        
        // Skip deleted buildings
        if (b.validationStatus === 'rejected') continue;

        // ─── FINAL SAFETY GATE ──────────────────────────────────────────────
        // Even after cleanup, do an absolute check at render time.
        // If ANY edge, vertex, or body of the building touches or crosses ANY road corridor, SKIP!
        const polyToCheck = (b.cleanedPolygon && b.cleanedPolygon.length > 0 && b.cleanedPolygon[0]) || b.localPolygon;
        if (!this.isPolygonSafe(polyToCheck, 3.5, 1.5)) {
          continue;
        }
        // ────────────────────────────────────────────────────────────────────

        const nearSeg = this.roadGraph.getNearestSegment(b.centerX, b.centerZ, 80.0);
        const nearestRoadPoint = nearSeg
          ? { x: nearSeg.projX, z: nearSeg.projZ, roadWidth: nearSeg.segment.width }
          : undefined;
        const elevation = this.terrainEngine ? this.terrainEngine.getElevation(b.centerX, b.centerZ) : 0;

        const polygonsToRender = b.cleanedPolygon && b.cleanedPolygon.length > 0 
                                  ? b.cleanedPolygon 
                                  : [b.localPolygon];
        const buildingPois = this.signageManager.getPOIsForBuilding(id);

        for (let i = 0; i < polygonsToRender.length; i++) {
          const poly = polygonsToRender[i];
          const partId = polygonsToRender.length > 1 ? `${id}_part${i}` : id;
          
          const buildingObj = this.generator.createBuildingFromLocalPolygon(
            poly,
            b.height,
            partId,
            b.category,
            b.name,
            b.tags,
            nearestRoadPoint,
            elevation,
            0.6,
            b.importanceLevel,
            i === 0 ? buildingPois : undefined
          );

          if (buildingObj) {
            chunkGroup.add(buildingObj);
            added++;
          }
        }
      }
    }

    // 2. Render physical 3D Parking Lots ("P")
    for (const [id, lot] of this.parkingLots.entries()) {
      if (lot.x >= minX && lot.x < maxX && lot.z >= minZ && lot.z < maxZ) {
        // Last-resort render gate: ensure parking lot is not inside a road corridor, water, or building
        if (!this.isPointSafe(lot.x, lot.z, 3.0, 1.5)) continue;
        if (this.isCollidingWithAnyBuilding(lot.x, lot.z, 4.0)) continue;

        const elevation = this.terrainEngine ? this.terrainEngine.getElevation(lot.x, lot.z) : 0;
        const lotSlots: any[] = [];
        const lotMesh = this.parkingLotGenerator.createParkingLotMesh(
          {
            id: String(id),
            name: lot.poi.name,
            malayalamName: lot.poi.malayalamName,
            width: 16.8,
            depth: 8.4,
            rotationY: lot.rotationY,
            tags: lot.poi.tags,
          },
          lotSlots
        );

        if (lotMesh) {
          lotMesh.position.set(lot.x, elevation, lot.z);
          lotMesh.rotation.y = lot.rotationY;
          chunkGroup.add(lotMesh);
          added++;

          // Register slots in vehicle parking system
          if (this.parkingSystem && lotSlots.length > 0) {
            for (const s of lotSlots) {
              // Transform slot local position to world
              const cos = Math.cos(lot.rotationY);
              const sin = Math.sin(lot.rotationY);
              const wx = lot.x + s.position.x * cos - s.position.z * sin;
              const wz = lot.z + s.position.x * sin + s.position.z * cos;
              s.position.x = wx;
              s.position.z = wz;
              s.rotationY = lot.rotationY;
              this.parkingSystem.slots.set(s.id, s);
            }
          }
        }
      }
    }

    // 3. Render physical 3D Roadside Bus Stops
    for (const [id, bs] of this.busStops.entries()) {
      if (bs.x >= minX && bs.x < maxX && bs.z >= minZ && bs.z < maxZ) {
        // Last-resort render gate: ensure bus stop is not inside a road corridor, water, or building!
        if (!this.isPointSafe(bs.x, bs.z, 3.0, 1.5)) continue;
        if (this.isCollidingWithAnyBuilding(bs.x, bs.z, 3.5)) continue;

        const elevation = this.terrainEngine ? this.terrainEngine.getElevation(bs.x, bs.z) : 0;
        const busMesh = this.streetElementGenerator.createBusStopMesh(0);
        busMesh.name = `bus-stop-${id}`;
        busMesh.position.set(bs.x, elevation, bs.z);
        busMesh.rotation.y = bs.rotationY;
        chunkGroup.add(busMesh);
        added++;
      }
    }

    // 4. Chunk-level physical signage (standalone POI pole signs & roadside street name signs)
    const signageChunk = this.signageManager.buildChunkSignage(
      minX,
      minZ,
      maxX,
      maxZ,
      this.roadGraph,
      this.terrainEngine,
      this.waterSystem,
      this
    );
    if (signageChunk) {
      chunkGroup.add(signageChunk);
      added += signageChunk.children.length;
    }

    if (added === 0) return null;
    return chunkGroup;
  }
}
