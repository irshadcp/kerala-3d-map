import * as THREE from 'three';
import { StreetElementGenerator } from './StreetElementGenerator';
import { GeoCoords } from '../core/geoCoords';
import { disposeHierarchy } from './disposeUtils';
import { mergeGroup } from './GeometryMerger';
import { WaterSystem } from '../core/WaterSystem';
import { RoadGraph } from '../core/RoadGraph';
import type { RealBuildingManager } from './RealBuildingManager';

export class StreetElementManager {
  public group: THREE.Group;
  private generator: StreetElementGenerator;

  private loadedElementIds: Set<string> = new Set();
  private loadedElements: Map<string, { group: THREE.Group; distSq: number }> = new Map();
  private originLat: number;
  private originLng: number;

  private waterSystem?: WaterSystem;
  private roadGraph?: RoadGraph;
  private realBuildingManager?: RealBuildingManager;

  // Maximum active street furniture elements (focused close to player for high performance)
  private readonly MAX_ELEMENTS = 70;

  constructor(originLat: number, originLng: number) {
    this.originLat = originLat;
    this.originLng = originLng;
    this.group = new THREE.Group();
    this.group.name = '3d-street-elements';
    this.generator = new StreetElementGenerator();
  }

  public setDependencies(waterSystem: WaterSystem, roadGraph: RoadGraph, realBuildingManager?: RealBuildingManager) {
    this.waterSystem = waterSystem;
    this.roadGraph = roadGraph;
    this.realBuildingManager = realBuildingManager;
  }

  /** Returns true if position (x,z) is unsafe: inside road corridor, building, sidewalk, or water body */
  private isPositionUnsafe(x: number, z: number, minRoadClearance = 3.5): boolean {
    if (this.waterSystem && this.waterSystem.isPointInWater(x, z, 2.0)) return true;
    if (this.realBuildingManager && this.realBuildingManager.isCollidingWithAnyBuilding(x, z, 3.5)) return true;
    if (this.roadGraph) {
      const allNear = this.roadGraph.getAllSegmentsNear(x, z, 50.0);
      for (const match of allNear) {
        const seg = match.segment;
        const halfRoad = seg.width * 0.5;
        let reqDist = halfRoad + minRoadClearance;
        if (seg.roadClass === 'motorway' || seg.roadClass === 'trunk') {
          reqDist = Math.max(reqDist, 13.5); // Highways require min 13.5m from centerline
        } else if (seg.roadClass === 'primary') {
          reqDist = Math.max(reqDist, 9.5);
        } else if (seg.roadClass === 'secondary') {
          reqDist = Math.max(reqDist, 7.5);
        }
        if (match.dist < reqDist) return true;
      }
    }
    return false;
  }

  public setOrigin(lat: number, lng: number) {
    this.originLat = lat;
    this.originLng = lng;
    this.clear();

  }

  public clear() {
    for (const [_id, item] of this.loadedElements) {
      this.group.remove(item.group);
      disposeHierarchy(item.group);
    }
    this.loadedElements.clear();
    this.loadedElementIds.clear();
  }

  private pruneExcessElements(cam?: { x: number; z: number }) {
    if (this.loadedElements.size <= this.MAX_ELEMENTS) return;

    if (cam) {
      for (const item of this.loadedElements.values()) {
        const px = item.group.position.x;
        const pz = item.group.position.z;
        item.distSq = (px - cam.x) ** 2 + (pz - cam.z) ** 2;
      }
    }

    const sorted = Array.from(this.loadedElements.entries()).sort(
      (a, b) => b[1].distSq - a[1].distSq
    );

    const excess = this.loadedElements.size - this.MAX_ELEMENTS;
    for (let i = 0; i < excess; i++) {
      const [id, item] = sorted[i];
      this.group.remove(item.group);
      disposeHierarchy(item.group);
      this.loadedElements.delete(id);
      this.loadedElementIds.delete(id);
    }
  }

  /**
   * Automatically synchronizes and distributes 3D bus stops, street lamps,
   * and traffic lights along active roads from MapLibre vector tiles.
   */
  public syncFromMap(map: any) {
    if (!map) return;
    try {
      const center = map.getCenter ? map.getCenter() : { lat: this.originLat, lng: this.originLng };
      const cam = GeoCoords.toLocalMeters(center.lat, center.lng, this.originLat, this.originLng);

      // 1. Query POIs for real OSM bus stops & traffic lights
      let poiFeatures: any[] = [];
      try {
        poiFeatures = map.queryRenderedFeatures({
          layers: ['poi_level1', 'poi_level2', 'poi_level3', 'place_suburb_village'],
        }) || [];
      } catch (_e) {}

      for (const feat of poiFeatures) {
        if (!feat.geometry || feat.geometry.type !== 'Point') continue;
        const [lng, lat] = feat.geometry.coordinates;
        const { x, z } = GeoCoords.toLocalMeters(lat, lng, this.originLat, this.originLng);
        const distSq = (x - cam.x) ** 2 + (z - cam.z) ** 2;
        if (distSq > 180 * 180) continue;

        const props = feat.properties || {};
        const isBus =
          props.class === 'bus' ||
          props.subclass === 'bus_stop' ||
          props.highway === 'bus_stop' ||
          props.public_transport === 'platform';

        if (isBus) {
          const key = `osm-bus-${feat.id || Math.round(x) + '-' + Math.round(z)}`;
          if (!this.loadedElementIds.has(key)) {
            // Bus stops from POI layer may land in water or on road — skip unsafe positions
            if (this.isPositionUnsafe(x, z, 3.0)) continue;
            const busStop = mergeGroup(this.generator.createBusStopMesh(0));
            busStop.position.set(x, 0, z);
            this.group.add(busStop);
            this.loadedElements.set(key, { group: busStop, distSq });
            this.loadedElementIds.add(key);
          }
        }
      }

      // 2. Query road segments to populate regular bus stops, street lamps & traffic lights
      const roadFeatures = map.queryRenderedFeatures({
        layers: ['road_minor_fill', 'road_major_fill', 'road_minor_casing', 'road_major_casing'],
      }) || [];

      if (!roadFeatures || roadFeatures.length === 0) return;

      let addedCount = 0;
      const maxAdd = 20;

      for (const feat of roadFeatures) {
        if (addedCount >= maxAdd) break;
        if (!feat.geometry) continue;

        let lines: [number, number][][] = [];
        if (feat.geometry.type === 'LineString') {
          lines = [feat.geometry.coordinates];
        } else if (feat.geometry.type === 'MultiLineString') {
          lines = feat.geometry.coordinates;
        }

        for (const line of lines) {
          if (line.length < 2) continue;

          for (let i = 0; i < line.length - 1; i++) {
            if (addedCount >= maxAdd) break;

            const p1 = GeoCoords.toLocalMeters(line[i][1], line[i][0], this.originLat, this.originLng);
            const p2 = GeoCoords.toLocalMeters(line[i + 1][1], line[i + 1][0], this.originLat, this.originLng);

            const dx = p2.x - p1.x;
            const dz = p2.z - p1.z;
            const segLen = Math.hypot(dx, dz);

            if (segLen < 12.0 || segLen > 350.0) continue;

            const midX = (p1.x + p2.x) / 2;
            const midZ = (p1.z + p2.z) / 2;
            const distSq = (midX - cam.x) ** 2 + (midZ - cam.z) ** 2;
            if (distSq > 180 * 180) continue;

            // Skip entire segment if midpoint is over water (bridge segments — no street furniture)
            if (this.waterSystem && this.waterSystem.isPointInWater(midX, midZ, 0.5)) continue;

            const ux = dx / segLen;
            const uz = dz / segLen;
            const nx = -uz;
            const nz = ux;

            // Determine local road width
            const nearMatch = this.roadGraph?.getNearestSegment(midX, midZ, 40.0);
            const estRoadWidth = nearMatch ? nearMatch.segment.width : 7.0;
            const halfRoad = estRoadWidth * 0.5;

            // (A) Place Traffic Light at segment endpoints / intersections
            // Must be safely set back from junction edge
            if (segLen > 40.0) {
              const juncKey = `traffic-${Math.round(p1.x / 18)}-${Math.round(p1.z / 18)}`;
              if (!this.loadedElementIds.has(juncKey)) {
                const tlX = p1.x - ux * 4.0 + nx * (halfRoad + 4.0);
                const tlZ = p1.z - uz * 4.0 + nz * (halfRoad + 4.0);
                // Only place traffic light if position is strictly safe in free space
                if (!this.isPositionUnsafe(tlX, tlZ, 3.5)) {
                  const trafficLight = mergeGroup(this.generator.createTrafficLightMesh());
                  trafficLight.position.set(tlX, 0, tlZ);
                  trafficLight.rotation.y = Math.atan2(ux, uz);
                  this.group.add(trafficLight);
                  this.loadedElements.set(juncKey, { group: trafficLight, distSq });
                  this.loadedElementIds.add(juncKey);
                  addedCount++;
                }
              }
            }



            // (C) Place 3D Street Lamps and Electric Poles every ~35m along roads in open free space
            const numLamps = Math.max(1, Math.floor(segLen / 35.0));
            for (let l = 0; l < numLamps && addedCount < maxAdd; l++) {
              const t = (l + 0.5) / numLamps;
              const lx = p1.x + t * dx;
              const lz = p1.z + t * dz;
              const side = (l % 2 === 0) ? 1 : -1;
              const objKey = `lamp-pole-${Math.round(lx / 14)}-${Math.round(lz / 14)}`;

              if (!this.loadedElementIds.has(objKey)) {
                // Must be safely set back outside road pavement & sidewalk into free space
                const poleX = lx + nx * (side * (halfRoad + 4.5));
                const poleZ = lz + nz * (side * (halfRoad + 4.5));

                // Safety check: skip if on road or in water
                if (this.isPositionUnsafe(poleX, poleZ, 3.5)) {
                  this.loadedElementIds.add(objKey);
                  continue;
                }

                const isPole = (Math.round(lx + lz) % 2 === 0);
                const obj = mergeGroup(isPole ? this.generator.createElectricPoleMesh() : this.generator.createStreetLampMesh());
                
                obj.position.set(poleX, 0, poleZ);
                if (!isPole) {
                  obj.rotation.y = (side === 1) ? Math.atan2(-nx, -nz) : Math.atan2(nx, nz);
                } else {
                  obj.rotation.y = Math.atan2(dx, dz);
                }
                
                this.group.add(obj);
                this.loadedElements.set(objKey, { group: obj, distSq });
                this.loadedElementIds.add(objKey);
                addedCount++;
              }

              // (D) Randomly park an Auto Rickshaw near the poles (in free space)
              if (l % 3 === 0 && Math.random() > 0.4) {
                const autoKey = `auto-${Math.round(lx / 10)}-${Math.round(lz / 10)}`;
                if (!this.loadedElementIds.has(autoKey)) {
                  const autoX = lx + nx * (side * (halfRoad + 4.2));
                  const autoZ = lz + nz * (side * (halfRoad + 4.2));
                  if (!this.isPositionUnsafe(autoX, autoZ, 3.5)) {
                    const auto = this.generator.createAutoRickshawMesh(addedCount * 13);
                    auto.position.set(autoX, 0, autoZ);
                    auto.rotation.y = Math.atan2(dx, dz) + (side === 1 ? 0 : Math.PI);
                    this.group.add(auto);
                    this.loadedElements.set(autoKey, { group: auto, distSq });
                    this.loadedElementIds.add(autoKey);
                    addedCount++;
                  }
                }
              }
            }
          }
        }
      }

      this.pruneExcessElements(cam);
    } catch (_e) {}
  }
}
