import * as THREE from 'three';
import { SpatialObstacleMap } from './SpatialObstacleMap';
import { KeralaHighlandGenerator } from './KeralaHighlandGenerator';
import { GeoCoords } from '../core/geoCoords';
import { ZoneProfileRegistry } from '../core/ZoneProfileRegistry';

export interface PlacedHighlandItemInfo {
  type: 'tea_bush' | 'forest_checkpost' | 'viewpoint';
  name: string;
  lat: number;
  lng: number;
  x: number;
  z: number;
}

export class KeralaHighlandManager {
  private scene: THREE.Scene;
  private items = new Map<string, THREE.Group>();
  private checkpostPositions: Array<{ x: number; z: number }> = [];
  private viewpointPositions: Array<{ x: number; z: number }> = [];
  private teaPositions: Array<{ x: number; z: number }> = [];

  public placedItems: PlacedHighlandItemInfo[] = [];

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
    this.checkpostPositions = [];
    this.viewpointPositions = [];
    this.teaPositions = [];
    this.placedItems = [];
  }

  public update(obstacleMap: SpatialObstacleMap, originLat: number, originLng: number): boolean {
    if (!obstacleMap.isReady || obstacleMap.roads.length === 0) {
      return false;
    }

    let itemsPlaced = 0;

    const eligibleRoads = obstacleMap.roads.filter((r) => r.length >= 15);

    for (const road of eligibleRoads) {
      const dx = road.p2.x - road.p1.x;
      const dz = road.p2.z - road.p1.z;
      const len = Math.hypot(dx, dz);
      if (len < 12) continue;

      const tx = dx / len;
      const tz = dz / len;

      const midX = (road.p1.x + road.p2.x) / 2;
      const midZ = (road.p1.z + road.p2.z) / 2;

      for (const side of [1, -1]) {
        const nx = -tz * side;
        const nz = tx * side;

        // 1. Forest Department Check Post (ഫോറസ്റ്റ് ചെക്ക് പോസ്റ്റ്)
        const checkpostDist = road.buffer + 2.0;
        const cx = midX + nx * checkpostDist;
        const cz = midZ + nz * checkpostDist;

        const zone = obstacleMap.getZoneAt(cx, cz, originLat, originLng);
        const profile = ZoneProfileRegistry.get(zone);

        if (profile.allowedAssets.includes('forest_checkpost')) {
          const minCheckpostDist = profile.spacing.checkpost || 600;
          const tooCloseCP = this.checkpostPositions.some(
            (pos) => Math.hypot(pos.x - cx, pos.z - cz) < minCheckpostDist
          );

          if (!tooCloseCP) {
            if (
              obstacleMap.isStationFootprintClear(
                midX,
                midZ,
                nx,
                nz,
                tx,
                tz,
                checkpostDist,
                3.2,
                2.2,
                road.p1,
                road.p2
              )
            ) {
              const key = `cp_${Math.round(cx / 8)}_${Math.round(cz / 8)}`;
              if (!this.items.has(key)) {
                obstacleMap.registerCustomObstacle(cx - 3.5, cx + 3.5, cz - 2.5, cz + 2.5);

                const model = KeralaHighlandGenerator.createCheckPostModel();
                model.position.set(cx, 0, cz);
                model.rotation.y = Math.atan2(tx, tz); // Align along roadway edge

                this.scene.add(model);
                this.items.set(key, model);
                this.checkpostPositions.push({ x: cx, z: cz });

                const coords = GeoCoords.toLatLng(cx, cz, originLat, originLng);
                this.placedItems.push({
                  type: 'forest_checkpost',
                  name: 'ഫോറസ്റ്റ് ചെക്ക് പോസ്റ്റ് (Forest Check Post)',
                  lat: coords.lat,
                  lng: coords.lng,
                  x: cx,
                  z: cz,
                });
                itemsPlaced++;
                break;
              }
            }
          }
        }

        // 2. Mountain Viewpoint (വ്യൂ പോയിന്റ്)
        const viewpointDist = road.buffer + 10.0;
        const vx = midX + nx * viewpointDist;
        const vz = midZ + nz * viewpointDist;

        if (profile.allowedAssets.includes('viewpoint')) {
          const minVPDist = profile.spacing.viewpoint || 450;
          const tooCloseVP = this.viewpointPositions.some(
            (pos) => Math.hypot(pos.x - vx, pos.z - vz) < minVPDist
          );

          if (!tooCloseVP) {
            if (
              obstacleMap.isStationFootprintClear(
                midX,
                midZ,
                nx,
                nz,
                tx,
                tz,
                viewpointDist,
                4.5,
                4.5,
                road.p1,
                road.p2
              )
            ) {
              const key = `vp_${Math.round(vx / 8)}_${Math.round(vz / 8)}`;
              if (!this.items.has(key)) {
                obstacleMap.registerCustomObstacle(vx - 5, vx + 5, vz - 5, vz + 5);

                const model = KeralaHighlandGenerator.createViewpointModel();
                model.position.set(vx, 0, vz);

                this.scene.add(model);
                this.items.set(key, model);
                this.viewpointPositions.push({ x: vx, z: vz });

                const coords = GeoCoords.toLatLng(vx, vz, originLat, originLng);
                this.placedItems.push({
                  type: 'viewpoint',
                  name: 'മലയോര വ്യൂ പോയിന്റ് (Munnar/Highland Viewpoint)',
                  lat: coords.lat,
                  lng: coords.lng,
                  x: vx,
                  z: vz,
                });
                itemsPlaced++;
                break;
              }
            }
          }
        }

        // 3. Tea Plantation Bush Clusters (തേയിലത്തോട്ടം)
        const teaDist = road.buffer + 7.0;
        const txPos = midX + nx * teaDist;
        const tzPos = midZ + nz * teaDist;

        if (profile.allowedAssets.includes('tea_bush')) {
          const minTeaDist = 65;
          const tooCloseTea = this.teaPositions.some(
            (pos) => Math.hypot(pos.x - txPos, pos.z - tzPos) < minTeaDist
          );

          if (!tooCloseTea) {
            if (
              obstacleMap.isStationFootprintClear(
                midX,
                midZ,
                nx,
                nz,
                tx,
                tz,
                teaDist,
                2.5,
                2.5,
                road.p1,
                road.p2
              )
            ) {
              const key = `tea_${Math.round(txPos / 6)}_${Math.round(tzPos / 6)}`;
              if (!this.items.has(key)) {
                obstacleMap.registerCustomObstacle(txPos - 3, txPos + 3, tzPos - 3, tzPos + 3);

                const model = KeralaHighlandGenerator.createTeaClusterModel(6);
                model.position.set(txPos, 0, tzPos);

                this.scene.add(model);
                this.items.set(key, model);
                this.teaPositions.push({ x: txPos, z: tzPos });

                const coords = GeoCoords.toLatLng(txPos, tzPos, originLat, originLng);
                this.placedItems.push({
                  type: 'tea_bush',
                  name: 'തേയിലത്തോട്ടം (Tea Plantation Bush)',
                  lat: coords.lat,
                  lng: coords.lng,
                  x: txPos,
                  z: tzPos,
                });
                itemsPlaced++;
              }
            }
          }
        }
      }
    }

    if (itemsPlaced > 0) {
      console.log(`[KeralaHighland] Placed ${itemsPlaced} authentic highland and tea estate elements.`);
    }

    return itemsPlaced > 0;
  }
}
