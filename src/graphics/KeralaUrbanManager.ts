import * as THREE from 'three';
import { SpatialObstacleMap } from './SpatialObstacleMap';
import { KeralaUrbanGenerator } from './KeralaUrbanGenerator';
import { GeoCoords } from '../core/geoCoords';
import { ZoneProfileRegistry } from '../core/ZoneProfileRegistry';

export interface PlacedUrbanItemInfo {
  type: 'traffic_signal' | 'billboard' | 'street_light';
  name: string;
  lat: number;
  lng: number;
  x: number;
  z: number;
  roadName?: string;
}

export class KeralaUrbanManager {
  private scene: THREE.Scene;
  private items = new Map<string, THREE.Group>();
  private signalPositions: Array<{ x: number; z: number }> = [];
  private billboardPositions: Array<{ x: number; z: number }> = [];

  public placedItems: PlacedUrbanItemInfo[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public clear() {
    for (const model of this.items.values()) {
      this.scene.remove(model);
      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.geometry?.dispose();
        }
      });
    }
    this.items.clear();
    this.signalPositions = [];
    this.billboardPositions = [];
    this.placedItems = [];
  }

  public update(obstacleMap: SpatialObstacleMap, originLat: number, originLng: number): boolean {
    if (!obstacleMap.isReady || obstacleMap.roads.length === 0) {
      return false;
    }

    let itemsPlaced = 0;

    // 1. Traffic Signals: Search for major intersections (primary, secondary, motorway)
    const majorRoads = obstacleMap.roads.filter(
      (r) =>
        (r.roadClass === 'primary' ||
          r.roadClass === 'secondary' ||
          r.roadClass === 'motorway' ||
          r.roadClass === 'trunk') &&
        r.length >= 15
    );

    for (const road of majorRoads) {
      const dx = road.p2.x - road.p1.x;
      const dz = road.p2.z - road.p1.z;
      const len = Math.hypot(dx, dz);
      if (len < 10) continue;

      const tx = dx / len;
      const tz = dz / len;

      // Check intersections at endpoints p1 and p2
      for (const endpoint of [road.p1, road.p2]) {
        // Is this near an intersection with another road?
        const isIntersection = obstacleMap.roads.some((other) => {
          if (other === road) return false;
          const d1 = Math.hypot(other.p1.x - endpoint.x, other.p1.z - endpoint.z);
          const d2 = Math.hypot(other.p2.x - endpoint.x, other.p2.z - endpoint.z);
          return d1 < 25 || d2 < 25;
        });

        if (!isIntersection) continue;

        const zone = obstacleMap.getZoneAt(endpoint.x, endpoint.z, originLat, originLng);
        const profile = ZoneProfileRegistry.get(zone);

        if (profile.allowedAssets.includes('traffic_signal')) {
          const minSignalDist = profile.spacing.trafficSignal || 180;
          const tooCloseSignal = this.signalPositions.some(
            (pos) => Math.hypot(pos.x - endpoint.x, pos.z - endpoint.z) < minSignalDist
          );

          if (!tooCloseSignal) {
            // Position on corner curb just outside road buffer
            const nx = -tz;
            const nz = tx;
            const sx = endpoint.x + nx * (road.buffer + 1.2);
            const sz = endpoint.z + nz * (road.buffer + 1.2);

            const key = `signal_${Math.round(sx / 6)}_${Math.round(sz / 6)}`;
            if (!this.items.has(key)) {
              obstacleMap.registerCustomObstacle(sx - 2, sx + 2, sz - 2, sz + 2);

              const model = KeralaUrbanGenerator.createTrafficSignalModel();
              model.position.set(sx, 0, sz);
              model.rotation.y = Math.atan2(tx, tz);

              this.scene.add(model);
              this.items.set(key, model);
              this.signalPositions.push({ x: sx, z: sz });

              const coords = GeoCoords.toLatLng(sx, sz, originLat, originLng);
              this.placedItems.push({
                type: 'traffic_signal',
                name: 'ട്രാഫിക് സിഗ്നൽ ജംഗ്ഷൻ (Traffic Signal Junction)',
                lat: coords.lat,
                lng: coords.lng,
                x: sx,
                z: sz,
                roadName: road.roadClass,
              });
              itemsPlaced++;
              break;
            }
          }
        }
      }

      // 2. Highway Advertising Billboards / Hoardings (ഹോർഡിംഗുകൾ)
      const midX = (road.p1.x + road.p2.x) / 2;
      const midZ = (road.p1.z + road.p2.z) / 2;

      for (const side of [1, -1]) {
        const nx = -tz * side;
        const nz = tx * side;

        const bbDist = road.buffer + 5.5;
        const bx = midX + nx * bbDist;
        const bz = midZ + nz * bbDist;

        const zone = obstacleMap.getZoneAt(bx, bz, originLat, originLng);
        const profile = ZoneProfileRegistry.get(zone);

        if (profile.allowedAssets.includes('billboard')) {
          const minBBDist = profile.spacing.billboard || 250;
          const tooCloseBB = this.billboardPositions.some(
            (pos) => Math.hypot(pos.x - bx, pos.z - bz) < minBBDist
          );

          if (!tooCloseBB) {
            if (
              obstacleMap.isStationFootprintClear(
                midX,
                midZ,
                nx,
                nz,
                tx,
                tz,
                bbDist,
                4.5,
                2.0,
                road.p1,
                road.p2
              )
            ) {
              const key = `bb_${Math.round(bx / 8)}_${Math.round(bz / 8)}`;
              if (!this.items.has(key)) {
                obstacleMap.registerCustomObstacle(bx - 4.5, bx + 4.5, bz - 2, bz + 2);

                const model = KeralaUrbanGenerator.createBillboardModel();
                model.position.set(bx, 0, bz);
                model.rotation.y = Math.atan2(tx, tz); // Face along road corridor

                this.scene.add(model);
                this.items.set(key, model);
                this.billboardPositions.push({ x: bx, z: bz });

                const coords = GeoCoords.toLatLng(bx, bz, originLat, originLng);
                this.placedItems.push({
                  type: 'billboard',
                  name: 'ഹൈവേ ഹോർഡിംഗ് (Highway Billboard)',
                  lat: coords.lat,
                  lng: coords.lng,
                  x: bx,
                  z: bz,
                  roadName: road.roadClass,
                });
                itemsPlaced++;
                break;
              }
            }
          }
        }
      }
    }

    if (itemsPlaced > 0) {
      console.log(`[KeralaUrban] Placed ${itemsPlaced} urban infrastructure elements (signals & hoardings).`);
    }

    return itemsPlaced > 0;
  }
}
