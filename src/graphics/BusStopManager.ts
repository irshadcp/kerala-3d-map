import * as THREE from 'three';
import { SpatialObstacleMap } from './SpatialObstacleMap';
import { BusStopGenerator } from './BusStopGenerator';
import { GeoCoords } from '../core/geoCoords';
import { ZoneProfileRegistry } from '../core/ZoneProfileRegistry';

export interface PlacedBusStopInfo {
  name: string;
  lat: number;
  lng: number;
  x: number;
  z: number;
  roadName?: string;
}

export class BusStopManager {
  private scene: THREE.Scene;
  private stops = new Map<string, THREE.Group>();
  private stopPositions: Array<{ x: number; z: number }> = [];

  public placedStops: PlacedBusStopInfo[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public update(obstacleMap: SpatialObstacleMap, originLat: number, originLng: number): boolean {
    if (!obstacleMap.isReady || obstacleMap.roads.length === 0) {
      return false;
    }

    let newStopsPlaced = 0;

    // Filter roads for transit: primary, secondary, tertiary, trunk, motorway, minor
    const eligibleRoads = obstacleMap.roads.filter(
      (r) =>
        (r.roadClass === 'primary' ||
          r.roadClass === 'secondary' ||
          r.roadClass === 'tertiary' ||
          r.roadClass === 'trunk' ||
          r.roadClass === 'motorway' ||
          r.roadClass === 'minor') &&
        r.length >= 15
    );

    // Prioritize main transit corridors (primary & secondary streets)
    const priorityOrder: Record<string, number> = {
      primary: 5,
      secondary: 4,
      tertiary: 3,
      trunk: 2,
      motorway: 1,
      minor: 0,
    };
    eligibleRoads.sort((a, b) => (priorityOrder[b.roadClass] || 0) - (priorityOrder[a.roadClass] || 0));

    for (const road of eligibleRoads) {
      const dx = road.p2.x - road.p1.x;
      const dz = road.p2.z - road.p1.z;
      const len = Math.hypot(dx, dz);
      if (len < 8) continue;

      // Unit tangent vector pointing ALONG the road
      const tx = dx / len;
      const tz = dz / len;

      const midX = (road.p1.x + road.p2.x) / 2;
      const midZ = (road.p1.z + road.p2.z) / 2;

      // Distance spacing: ~250m on main corridors, ~400m on rural/minor
      const isMainRoad = road.roadClass === 'primary' || road.roadClass === 'secondary' || road.roadClass === 'tertiary';
      const minDistance = isMainRoad ? 240 : 380;

      const isTooClose = this.stopPositions.some(
        (pos) => Math.hypot(pos.x - midX, pos.z - midZ) < minDistance
      );
      if (isTooClose) continue;

      // Unit normal vector perpendicular to the road: (-tz * side, tx * side)
      for (const side of [1, -1]) {
        const nx = -tz * side;
        const nz = tx * side;

        // Shelter is 6.5m wide x 3.0m deep (scaled 1.45x)
        const centerDist = road.buffer + 3.2;
        const cx = midX + nx * centerDist;
        const cz = midZ + nz * centerDist;

        // Kerala Zone Environmental Check
        const zone = obstacleMap.getZoneAt(cx, cz, originLat, originLng);
        const profile = ZoneProfileRegistry.get(zone);
        if (!profile.allowedAssets.includes('bus_stop')) {
          continue;
        }

        const minDistance = profile.spacing.busStop;

        // Verify distance from exact candidate position
        const tooCloseCandidate = this.stopPositions.some(
          (pos) => Math.hypot(pos.x - cx, pos.z - cz) < minDistance
        );
        if (tooCloseCandidate) continue;

        // Check if footprint is 100% free of buildings, other roads, and water
        if (
          obstacleMap.isStationFootprintClear(
            midX,
            midZ,
            nx,
            nz,
            tx,
            tz,
            centerDist,
            5.2, // half-width along road
            2.6, // half-depth perpendicular
            road.p1,
            road.p2
          )
        ) {
          const key = `bus_${Math.round(cx / 6)}_${Math.round(cz / 6)}`;
          if (this.stops.has(key)) continue;

          // 1. Register bus shelter footprint into obstacleMap
          // This guarantees TreeGenerator will NEVER place trees inside or near this shelter!
          obstacleMap.registerCustomObstacle(cx - 5.8, cx + 5.8, cz - 3.8, cz + 3.8);

          // 2. Create and orient the 3D model
          const model = BusStopGenerator.createModel();
          model.position.set(cx, 0, cz);

          // Model's open front is facing towards the road:
          const facingAngle = Math.atan2(-nx, -nz);
          model.rotation.y = facingAngle;

          this.scene.add(model);
          this.stops.set(key, model);
          this.stopPositions.push({ x: cx, z: cz });

          // Record GPS coordinates
          const coords = GeoCoords.toLatLng(cx, cz, originLat, originLng);
          const stopNames = ['Town Center', 'Metro Junction', 'North Gate', 'Market Road', 'Civil Line', 'Hospital Stop', 'Station Cross'];
          const stopTitle = stopNames[this.placedStops.length % stopNames.length];
          const info: PlacedBusStopInfo = {
            name: `${stopTitle} Bus Stop (${road.roadClass.toUpperCase()})`,
            lat: coords.lat,
            lng: coords.lng,
            x: cx,
            z: cz,
            roadName: road.roadClass,
          };
          this.placedStops.push(info);
          newStopsPlaced++;

          // Once placed for this road segment, proceed to next road
          break;
        }
      }
    }

    if (typeof window !== 'undefined') {
      (window as any).__busStops = this.placedStops;
    }

    return newStopsPlaced > 0;
  }

  public clear() {
    for (const group of this.stops.values()) {
      this.scene.remove(group);
      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.geometry?.dispose();
        }
      });
    }
    this.stops.clear();
    this.stopPositions = [];
    this.placedStops = [];
  }
}
