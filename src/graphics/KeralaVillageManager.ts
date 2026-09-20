import * as THREE from 'three';
import { SpatialObstacleMap } from './SpatialObstacleMap';
import { KeralaVillageGenerator } from './KeralaVillageGenerator';
import { GeoCoords } from '../core/geoCoords';
import { ZoneProfileRegistry } from '../core/ZoneProfileRegistry';

export interface PlacedVillageItemInfo {
  type: 'chayakada' | 'open_well' | 'temple' | 'church' | 'mosque';
  name: string;
  lat: number;
  lng: number;
  x: number;
  z: number;
  roadName?: string;
}

export class KeralaVillageManager {
  private scene: THREE.Scene;
  private items = new Map<string, THREE.Group>();
  private chayakadaPositions: Array<{ x: number; z: number }> = [];
  private wellPositions: Array<{ x: number; z: number }> = [];
  private worshipPositions: Array<{ x: number; z: number }> = [];

  public placedItems: PlacedVillageItemInfo[] = [];

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
    this.chayakadaPositions = [];
    this.wellPositions = [];
    this.worshipPositions = [];
    this.placedItems = [];
  }

  public update(obstacleMap: SpatialObstacleMap, originLat: number, originLng: number): boolean {
    if (!obstacleMap.isReady || obstacleMap.roads.length === 0) {
      return false;
    }

    let itemsPlaced = 0;

    // Filter roads suitable for village elements (minor, tertiary, secondary)
    const eligibleRoads = obstacleMap.roads.filter(
      (r) =>
        (r.roadClass === 'minor' ||
          r.roadClass === 'tertiary' ||
          r.roadClass === 'secondary' ||
          r.roadClass === 'service') &&
        r.length >= 15
    );

    let worshipCounter = 0;

    for (const road of eligibleRoads) {
      const dx = road.p2.x - road.p1.x;
      const dz = road.p2.z - road.p1.z;
      const len = Math.hypot(dx, dz);
      if (len < 10) continue;

      const tx = dx / len;
      const tz = dz / len;

      const midX = (road.p1.x + road.p2.x) / 2;
      const midZ = (road.p1.z + road.p2.z) / 2;

      for (const side of [1, -1]) {
        const nx = -tz * side;
        const nz = tx * side;

        // 1. Check for Roadside Chayakada (ചായക്കട)
        const chayaDist = road.buffer + 2.8;
        const cx = midX + nx * chayaDist;
        const cz = midZ + nz * chayaDist;

        const zone = obstacleMap.getZoneAt(cx, cz, originLat, originLng);
        const profile = ZoneProfileRegistry.get(zone);

        if (profile.allowedAssets.includes('chayakada')) {
          const minChayaDist = profile.spacing.chayakada || 300;
          const tooCloseChaya = this.chayakadaPositions.some(
            (pos) => Math.hypot(pos.x - cx, pos.z - cz) < minChayaDist
          );

          if (!tooCloseChaya) {
            if (
              obstacleMap.isStationFootprintClear(
                midX,
                midZ,
                nx,
                nz,
                tx,
                tz,
                chayaDist,
                2.4, // half-width
                1.8, // half-depth
                road.p1,
                road.p2
              )
            ) {
              const key = `chaya_${Math.round(cx / 5)}_${Math.round(cz / 5)}`;
              if (!this.items.has(key)) {
                obstacleMap.registerCustomObstacle(cx - 3, cx + 3, cz - 2.5, cz + 2.5);

                const model = KeralaVillageGenerator.createChayakadaModel();
                model.position.set(cx, 0, cz);
                model.rotation.y = Math.atan2(-nx, -nz); // Face towards road

                this.scene.add(model);
                this.items.set(key, model);
                this.chayakadaPositions.push({ x: cx, z: cz });

                const coords = GeoCoords.toLatLng(cx, cz, originLat, originLng);
                this.placedItems.push({
                  type: 'chayakada',
                  name: 'നാടൻ ചായക്കട (Kerala Tea Shop)',
                  lat: coords.lat,
                  lng: coords.lng,
                  x: cx,
                  z: cz,
                  roadName: road.roadClass,
                });
                itemsPlaced++;
                break;
              }
            }
          }
        }

        // 2. Check for Traditional Open Well (തുറന്ന കിണർ) in village yards
        const wellDist = road.buffer + 8.5;
        const wx = midX + nx * wellDist;
        const wz = midZ + nz * wellDist;

        if (profile.allowedAssets.includes('open_well')) {
          const minWellDist = profile.spacing.openWell || 250;
          const tooCloseWell = this.wellPositions.some(
            (pos) => Math.hypot(pos.x - wx, pos.z - wz) < minWellDist
          );

          if (!tooCloseWell) {
            if (
              obstacleMap.isStationFootprintClear(
                midX,
                midZ,
                nx,
                nz,
                tx,
                tz,
                wellDist,
                2.0,
                2.0,
                road.p1,
                road.p2
              )
            ) {
              const key = `well_${Math.round(wx / 5)}_${Math.round(wz / 5)}`;
              if (!this.items.has(key)) {
                obstacleMap.registerCustomObstacle(wx - 2.5, wx + 2.5, wz - 2.5, wz + 2.5);

                const model = KeralaVillageGenerator.createOpenWellModel();
                model.position.set(wx, 0, wz);

                this.scene.add(model);
                this.items.set(key, model);
                this.wellPositions.push({ x: wx, z: wz });

                const coords = GeoCoords.toLatLng(wx, wz, originLat, originLng);
                this.placedItems.push({
                  type: 'open_well',
                  name: 'പരമ്പരാഗത കിണർ (Kerala Open Well)',
                  lat: coords.lat,
                  lng: coords.lng,
                  x: wx,
                  z: wz,
                });
                itemsPlaced++;
              }
            }
          }
        }

        // 3. Cultural Places of Worship (ക്ഷേത്രം / പള്ളി / മസ്ജിദ്)
        const worshipDist = road.buffer + 14.0;
        const sx = midX + nx * worshipDist;
        const sz = midZ + nz * worshipDist;

        if (profile.allowedAssets.includes('worship_place')) {
          const minWorshipDist = profile.spacing.worshipPlace || 600;
          const tooCloseWorship = this.worshipPositions.some(
            (pos) => Math.hypot(pos.x - sx, pos.z - sz) < minWorshipDist
          );

          if (!tooCloseWorship) {
            if (
              obstacleMap.isStationFootprintClear(
                midX,
                midZ,
                nx,
                nz,
                tx,
                tz,
                worshipDist,
                5.0, // half-width
                5.0, // half-depth
                road.p1,
                road.p2
              )
            ) {
              const key = `worship_${Math.round(sx / 8)}_${Math.round(sz / 8)}`;
              if (!this.items.has(key)) {
                obstacleMap.registerCustomObstacle(sx - 5.5, sx + 5.5, sz - 5.5, sz + 5.5);

                const worshipTypeIdx = worshipCounter++ % 3;
                let model: THREE.Group;
                let itemType: 'temple' | 'church' | 'mosque';
                let itemName: string;

                if (worshipTypeIdx === 0) {
                  model = KeralaVillageGenerator.createTempleModel();
                  itemType = 'temple';
                  itemName = 'പരമ്പരാഗത അമ്പലം (Kerala Temple)';
                } else if (worshipTypeIdx === 1) {
                  model = KeralaVillageGenerator.createChurchModel();
                  itemType = 'church';
                  itemName = 'ക്രിസ്ത്യൻ പള്ളി (Kerala Church)';
                } else {
                  model = KeralaVillageGenerator.createMosqueModel();
                  itemType = 'mosque';
                  itemName = 'മുസ്‌ലിം പള്ളി (Kerala Mosque)';
                }

                model.position.set(sx, 0, sz);
                model.rotation.y = Math.atan2(-nx, -nz); // Face road

                this.scene.add(model);
                this.items.set(key, model);
                this.worshipPositions.push({ x: sx, z: sz });

                const coords = GeoCoords.toLatLng(sx, sz, originLat, originLng);
                this.placedItems.push({
                  type: itemType,
                  name: itemName,
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
      }
    }

    if (itemsPlaced > 0) {
      console.log(`[KeralaVillage] Placed ${itemsPlaced} authentic village and cultural elements.`);
    }

    return itemsPlaced > 0;
  }
}
