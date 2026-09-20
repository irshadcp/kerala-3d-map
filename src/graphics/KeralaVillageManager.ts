import * as THREE from 'three';
import { SpatialObstacleMap } from './SpatialObstacleMap';
import { KeralaVillageGenerator } from './KeralaVillageGenerator';
import { GeoCoords } from '../core/geoCoords';
import { ZoneProfileRegistry } from '../core/ZoneProfileRegistry';

export interface PlacedVillageItemInfo {
  type:
    | 'chayakada'
    | 'open_well'
    | 'temple'
    | 'church'
    | 'mosque'
    | 'village_house'
    | 'farm_plot'
    | 'village_pond'
    | 'canal_culvert';
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
  private housePositions: Array<{ x: number; z: number }> = [];
  private farmPositions: Array<{ x: number; z: number }> = [];
  private pondPositions: Array<{ x: number; z: number }> = [];
  private culvertPositions: Array<{ x: number; z: number }> = [];

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
    this.housePositions = [];
    this.farmPositions = [];
    this.pondPositions = [];
    this.culvertPositions = [];
    this.placedItems = [];
  }

  public update(obstacleMap: SpatialObstacleMap, originLat: number, originLng: number): boolean {
    if (!obstacleMap.isReady || obstacleMap.roads.length === 0) {
      return false;
    }

    let itemsPlaced = 0;

    // Filter roads suitable for village elements (minor, tertiary, secondary, service)
    const eligibleRoads = obstacleMap.roads.filter(
      (r) =>
        (r.roadClass === 'minor' ||
          r.roadClass === 'tertiary' ||
          r.roadClass === 'secondary' ||
          r.roadClass === 'service') &&
        r.length >= 14
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

      const midZone = obstacleMap.getZoneAt(midX, midZ, originLat, originLng);
      const midProfile = ZoneProfileRegistry.get(midZone);

      // -------------------------------------------------------------
      // 1. Small Canal Bridges / Culverts (കലുങ്ക് / കനാൽ പാലം)
      // Placed where road segment crosses or is adjacent to water/canal
      // -------------------------------------------------------------
      if (midProfile.allowedAssets.includes('canal_culvert')) {
        const distToWater = obstacleMap.getDistanceToWater(midX, midZ, 25);
        if (distToWater <= 10) {
          const minCulvertDist = midProfile.spacing.canalCulvert || 180;
          const tooCloseCulvert = this.culvertPositions.some(
            (pos) => Math.hypot(pos.x - midX, pos.z - midZ) < minCulvertDist
          );

          if (!tooCloseCulvert) {
            const key = `culvert_${Math.round(midX / 6)}_${Math.round(midZ / 6)}`;
            if (!this.items.has(key)) {
              const model = KeralaVillageGenerator.createCanalBridgeModel(road.buffer * 2);
              model.position.set(midX, 0, midZ);
              model.rotation.y = Math.atan2(tx, tz);

              // Register custom obstacles along left & right parapet edges to clear tree canopies
              const halfW = road.buffer + 0.8;
              for (const side of [-halfW, halfW]) {
                const px = midX - tz * side;
                const pz = midZ + tx * side;
                obstacleMap.registerCustomObstacle(px - 1.5, px + 1.5, pz - 4.5, pz + 4.5);
              }

              this.scene.add(model);
              this.items.set(key, model);
              this.culvertPositions.push({ x: midX, z: midZ });

              const coords = GeoCoords.toLatLng(midX, midZ, originLat, originLng);
              this.placedItems.push({
                type: 'canal_culvert',
                name: 'ചെറിയ കലുങ്ക് / കനാൽ പാലം (Canal Culvert)',
                lat: coords.lat,
                lng: coords.lng,
                x: midX,
                z: midZ,
                roadName: road.roadClass,
              });
              itemsPlaced++;
            }
          }
        }
      }

      // Check left and right sides of the road for roadside village elements
      for (const side of [1, -1]) {
        const nx = -tz * side;
        const nz = tx * side;

        // -------------------------------------------------------------
        // 2. Roadside Chayakada (ചായക്കട - scaled 1.45x)
        // -------------------------------------------------------------
        const chayaDist = road.buffer + 3.8;
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
            const rotY = Math.atan2(-nx, -nz);
            if (
              obstacleMap.isStationFootprintClear(
                midX,
                midZ,
                nx,
                nz,
                tx,
                tz,
                chayaDist,
                3.5, // half-width
                2.6, // half-depth
                road.p1,
                road.p2
              ) &&
              !obstacleMap.isRoadCollision(cx, cz, 3.5, 2.6, rotY, road.p1, road.p2) &&
              !obstacleMap.isBuildingCollision(cx, cz, 4.0, 3.0, rotY) &&
              !obstacleMap.isPointInWater(cx, cz)
            ) {
              const key = `chaya_${Math.round(cx / 5)}_${Math.round(cz / 5)}`;
              if (!this.items.has(key)) {
                obstacleMap.registerCustomObstacle(cx - 4.2, cx + 4.2, cz - 3.2, cz + 3.2);

                const model = KeralaVillageGenerator.createChayakadaModel();
                model.position.set(cx, 0, cz);
                model.rotation.y = rotY; // Face towards road

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

        // -------------------------------------------------------------
        // 3. Traditional Open Well (തുറന്ന കിണർ - scaled 1.5x)
        // -------------------------------------------------------------
        const wellDist = road.buffer + 9.5;
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
                3.0,
                3.0,
                road.p1,
                road.p2
              ) &&
              !obstacleMap.isRoadCollision(wx, wz, 3.0, 3.0, 0, road.p1, road.p2) &&
              !obstacleMap.isBuildingCollision(wx, wz, 3.5, 3.5, 0) &&
              !obstacleMap.isPointInWater(wx, wz)
            ) {
              const key = `well_${Math.round(wx / 5)}_${Math.round(wz / 5)}`;
              if (!this.items.has(key)) {
                obstacleMap.registerCustomObstacle(wx - 3.5, wx + 3.5, wz - 3.5, wz + 3.5);

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

        // -------------------------------------------------------------
        // 4. Cultural Places of Worship (ക്ഷേത്രം / പള്ളി / മസ്ജിദ്)
        // -------------------------------------------------------------
        const worshipDist = road.buffer + 16.5;
        const sx = midX + nx * worshipDist;
        const sz = midZ + nz * worshipDist;

        if (profile.allowedAssets.includes('worship_place')) {
          const minWorshipDist = profile.spacing.worshipPlace || 600;
          const tooCloseWorship = this.worshipPositions.some(
            (pos) => Math.hypot(pos.x - sx, pos.z - sz) < minWorshipDist
          );

          if (!tooCloseWorship) {
            const rotY = Math.atan2(-nx, -nz);
            if (
              obstacleMap.isStationFootprintClear(
                midX,
                midZ,
                nx,
                nz,
                tx,
                tz,
                worshipDist,
                7.0, // half-width
                7.0, // half-depth
                road.p1,
                road.p2
              ) &&
              !obstacleMap.isRoadCollision(sx, sz, 7.0, 7.0, rotY, road.p1, road.p2) &&
              !obstacleMap.isBuildingCollision(sx, sz, 7.5, 7.5, rotY) &&
              !obstacleMap.isPointInWater(sx, sz)
            ) {
              const key = `worship_${Math.round(sx / 8)}_${Math.round(sz / 8)}`;
              if (!this.items.has(key)) {
                obstacleMap.registerCustomObstacle(sx - 7.5, sx + 7.5, sz - 7.5, sz + 7.5);

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
                model.rotation.y = rotY; // Face road

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

        // -------------------------------------------------------------
        // 5. Small Tiled Houses with Compound Walls & Water Tanks (ഓടിട്ട വീടും മതിലും)
        // -------------------------------------------------------------
        const houseDist = road.buffer + 10.5;
        const hx = midX + nx * houseDist;
        const hz = midZ + nz * houseDist;

        if (profile.allowedAssets.includes('village_house')) {
          const minHouseDist = profile.spacing.villageHouse || 150;
          const tooCloseHouse = this.housePositions.some(
            (pos) => Math.hypot(pos.x - hx, pos.z - hz) < minHouseDist
          );

          if (!tooCloseHouse) {
            const rotY = Math.atan2(-nx, -nz);
            if (
              obstacleMap.isStationFootprintClear(
                midX,
                midZ,
                nx,
                nz,
                tx,
                tz,
                houseDist,
                5.5,
                4.5,
                road.p1,
                road.p2
              ) &&
              !obstacleMap.isRoadCollision(hx, hz, 5.5, 4.5, rotY, road.p1, road.p2) &&
              !obstacleMap.isBuildingCollision(hx, hz, 6.0, 5.0, rotY) &&
              !obstacleMap.isPointInWater(hx, hz)
            ) {
              const key = `house_${Math.round(hx / 6)}_${Math.round(hz / 6)}`;
              if (!this.items.has(key)) {
                obstacleMap.registerCustomObstacle(hx - 6.0, hx + 6.0, hz - 6.0, hz + 6.0);

                const model = KeralaVillageGenerator.createSmallTiledHouseModel();
                model.position.set(hx, 0, hz);
                model.rotation.y = rotY; // Face road

                this.scene.add(model);
                this.items.set(key, model);
                this.housePositions.push({ x: hx, z: hz });

                const coords = GeoCoords.toLatLng(hx, hz, originLat, originLng);
                this.placedItems.push({
                  type: 'village_house',
                  name: 'ഓടിട്ട വീടും മതിലും (Traditional Tiled House)',
                  lat: coords.lat,
                  lng: coords.lng,
                  x: hx,
                  z: hz,
                  roadName: road.roadClass,
                });
                itemsPlaced++;
              }
            }
          }
        }

        // -------------------------------------------------------------
        // 6. Farm Buildings & Agricultural Plots (കളപ്പുര, തുറു, കൃഷിയിടം)
        // -------------------------------------------------------------
        const farmDist = road.buffer + 14.0;
        const fx = midX + nx * farmDist;
        const fz = midZ + nz * farmDist;

        if (profile.allowedAssets.includes('farm_plot')) {
          const minFarmDist = profile.spacing.farmPlot || 240;
          const tooCloseFarm = this.farmPositions.some(
            (pos) => Math.hypot(pos.x - fx, pos.z - fz) < minFarmDist
          );

          if (!tooCloseFarm) {
            const rotY = Math.atan2(-nx, -nz);
            if (
              obstacleMap.isStationFootprintClear(
                midX,
                midZ,
                nx,
                nz,
                tx,
                tz,
                farmDist,
                7.0,
                5.5,
                road.p1,
                road.p2
              ) &&
              !obstacleMap.isRoadCollision(fx, fz, 7.0, 5.5, rotY, road.p1, road.p2) &&
              !obstacleMap.isBuildingCollision(fx, fz, 7.5, 6.0, rotY) &&
              !obstacleMap.isPointInWater(fx, fz)
            ) {
              const key = `farm_${Math.round(fx / 7)}_${Math.round(fz / 7)}`;
              if (!this.items.has(key)) {
                obstacleMap.registerCustomObstacle(fx - 7.5, fx + 7.5, fz - 7.5, fz + 7.5);

                const model = KeralaVillageGenerator.createFarmBuildingPlotModel();
                model.position.set(fx, 0, fz);
                model.rotation.y = rotY;

                this.scene.add(model);
                this.items.set(key, model);
                this.farmPositions.push({ x: fx, z: fz });

                const coords = GeoCoords.toLatLng(fx, fz, originLat, originLng);
                this.placedItems.push({
                  type: 'farm_plot',
                  name: 'കളപ്പുരയും കൃഷിയിടവും (Farm Shed & Crop Plot)',
                  lat: coords.lat,
                  lng: coords.lng,
                  x: fx,
                  z: fz,
                  roadName: road.roadClass,
                });
                itemsPlaced++;
              }
            }
          }
        }

        // -------------------------------------------------------------
        // 7. Stepped Village Bathing Ponds (കൽപ്പടവുകളുള്ള കുളം)
        // -------------------------------------------------------------
        const pondDist = road.buffer + 16.5;
        const px = midX + nx * pondDist;
        const pz = midZ + nz * pondDist;

        if (profile.allowedAssets.includes('village_pond')) {
          const minPondDist = profile.spacing.villagePond || 360;
          const tooClosePond = this.pondPositions.some(
            (pos) => Math.hypot(pos.x - px, pos.z - pz) < minPondDist
          );

          if (!tooClosePond) {
            if (
              obstacleMap.isStationFootprintClear(
                midX,
                midZ,
                nx,
                nz,
                tx,
                tz,
                pondDist,
                8.0,
                6.5,
                road.p1,
                road.p2
              ) &&
              !obstacleMap.isRoadCollision(px, pz, 8.0, 6.5, 0, road.p1, road.p2) &&
              !obstacleMap.isBuildingCollision(px, pz, 8.5, 7.0, 0) &&
              !obstacleMap.isPointInWater(px, pz)
            ) {
              const key = `pond_${Math.round(px / 8)}_${Math.round(pz / 8)}`;
              if (!this.items.has(key)) {
                obstacleMap.registerCustomObstacle(px - 8.5, px + 8.5, pz - 8.5, pz + 8.5);

                const model = KeralaVillageGenerator.createVillagePondModel();
                model.position.set(px, 0, pz);

                this.scene.add(model);
                this.items.set(key, model);
                this.pondPositions.push({ x: px, z: pz });

                const coords = GeoCoords.toLatLng(px, pz, originLat, originLng);
                this.placedItems.push({
                  type: 'village_pond',
                  name: 'കൽപ്പടവുകളുള്ള കുളം (Village Pond)',
                  lat: coords.lat,
                  lng: coords.lng,
                  x: px,
                  z: pz,
                  roadName: road.roadClass,
                });
                itemsPlaced++;
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
