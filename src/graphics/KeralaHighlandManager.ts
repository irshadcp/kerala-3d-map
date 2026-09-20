import * as THREE from 'three';
import { SpatialObstacleMap } from './SpatialObstacleMap';
import { KeralaHighlandGenerator } from './KeralaHighlandGenerator';
import { GeoCoords } from '../core/geoCoords';
import { ZoneProfileRegistry } from '../core/ZoneProfileRegistry';

export interface PlacedHighlandItemInfo {
  type: 'tea_bush' | 'forest_checkpost' | 'viewpoint' | 'rocky_outcrop' | 'laterite_cut';
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
  private rockyPositions: Array<{ x: number; z: number }> = [];
  private lateritePositions: Array<{ x: number; z: number }> = [];

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
    this.rockyPositions = [];
    this.lateritePositions = [];
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

        // 1. Forest Department Check Post (ഫോറസ്റ്റ് ചെക്ക് പോസ്റ്റ് - scaled 1.4x)
        const checkpostDist = road.buffer + 3.0;
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
                4.5,
                3.0,
                road.p1,
                road.p2
              )
            ) {
              const key = `cp_${Math.round(cx / 8)}_${Math.round(cz / 8)}`;
              if (!this.items.has(key)) {
                obstacleMap.registerCustomObstacle(cx - 5.0, cx + 5.0, cz - 3.5, cz + 3.5);

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

        // 2. Mountain Viewpoint (വ്യൂ പോയിന്റ് - scaled 1.35x)
        const viewpointDist = road.buffer + 13.0;
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
                6.2,
                6.2,
                road.p1,
                road.p2
              )
            ) {
              const key = `vp_${Math.round(vx / 8)}_${Math.round(vz / 8)}`;
              if (!this.items.has(key)) {
                obstacleMap.registerCustomObstacle(vx - 6.5, vx + 6.5, vz - 6.5, vz + 6.5);

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

        // 4. Western Ghats Rocky Granite Outcrop (കരിങ്കൽ പാറക്കെട്ടുകൾ / മലഞ്ചെരിവുകൾ)
        const rockDist = road.buffer + 12.0;
        const rx = midX + nx * rockDist;
        const rz = midZ + nz * rockDist;

        if (profile.allowedAssets.includes('rocky_outcrop')) {
          const minRockDist = profile.spacing.rockyOutcrop || 380;
          const tooCloseRock = this.rockyPositions.some(
            (pos) => Math.hypot(pos.x - rx, pos.z - rz) < minRockDist
          );

          if (!tooCloseRock) {
            const rotY = Math.atan2(-nx, -nz);
            if (
              obstacleMap.isStationFootprintClear(
                midX,
                midZ,
                nx,
                nz,
                tx,
                tz,
                rockDist,
                6.5,
                5.0,
                road.p1,
                road.p2
              ) &&
              !obstacleMap.isRoadCollision(rx, rz, 6.5, 5.0, rotY, road.p1, road.p2) &&
              !obstacleMap.isBuildingCollision(rx, rz, 7.0, 5.5, rotY) &&
              !obstacleMap.isPointInWater(rx, rz)
            ) {
              const key = `rock_${Math.round(rx / 8)}_${Math.round(rz / 8)}`;
              if (!this.items.has(key)) {
                obstacleMap.registerCustomObstacle(rx - 7.0, rx + 7.0, rz - 6.0, rz + 6.0);

                const model = KeralaHighlandGenerator.createRockyGraniteOutcropModel();
                model.position.set(rx, 0, rz);
                model.rotation.y = rotY;

                this.scene.add(model);
                this.items.set(key, model);
                this.rockyPositions.push({ x: rx, z: rz });

                const coords = GeoCoords.toLatLng(rx, rz, originLat, originLng);
                this.placedItems.push({
                  type: 'rocky_outcrop',
                  name: 'കരിങ്കൽ പാറക്കെട്ടുകൾ (Rocky Granite Outcrop)',
                  lat: coords.lat,
                  lng: coords.lng,
                  x: rx,
                  z: rz,
                });
                itemsPlaced++;
              }
            }
          }
        }

        // 5. Highland Laterite Cutting (ചെങ്കൽ കുന്നുകൾ / തട്ടുകൾ)
        const lateriteDist = road.buffer + 9.0;
        const lx = midX + nx * lateriteDist;
        const lz = midZ + nz * lateriteDist;

        if (profile.allowedAssets.includes('laterite_cut')) {
          const minLateriteDist = profile.spacing.lateriteCut || 340;
          const tooCloseLaterite = this.lateritePositions.some(
            (pos) => Math.hypot(pos.x - lx, pos.z - lz) < minLateriteDist
          );

          if (!tooCloseLaterite) {
            const rotY = Math.atan2(-nx, -nz);
            if (
              obstacleMap.isStationFootprintClear(
                midX,
                midZ,
                nx,
                nz,
                tx,
                tz,
                lateriteDist,
                5.5,
                3.5,
                road.p1,
                road.p2
              ) &&
              !obstacleMap.isRoadCollision(lx, lz, 5.5, 3.5, rotY, road.p1, road.p2) &&
              !obstacleMap.isBuildingCollision(lx, lz, 6.0, 4.0, rotY) &&
              !obstacleMap.isPointInWater(lx, lz)
            ) {
              const key = `laterite_${Math.round(lx / 6)}_${Math.round(lz / 6)}`;
              if (!this.items.has(key)) {
                obstacleMap.registerCustomObstacle(lx - 5.5, lx + 5.5, lz - 4.0, lz + 4.0);

                const model = KeralaHighlandGenerator.createLateriteCutModel();
                model.position.set(lx, 0, lz);
                model.rotation.y = rotY;

                this.scene.add(model);
                this.items.set(key, model);
                this.lateritePositions.push({ x: lx, z: lz });

                const coords = GeoCoords.toLatLng(lx, lz, originLat, originLng);
                this.placedItems.push({
                  type: 'laterite_cut',
                  name: 'ചെങ്കൽ കുന്നുകൾ / തട്ടുകൾ (Laterite Soil Cutting)',
                  lat: coords.lat,
                  lng: coords.lng,
                  x: lx,
                  z: lz,
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
