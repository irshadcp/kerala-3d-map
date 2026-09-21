import * as THREE from 'three';
import { SpatialObstacleMap } from './SpatialObstacleMap';
import { KeralaVillageGenerator } from './KeralaVillageGenerator';
import { KeralaHighlandGenerator } from './KeralaHighlandGenerator';
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
    | 'canal_culvert'
    | 'arecanut_grove'
    | 'banana_grove'
    | 'sacred_grove'
    | 'laterite_cut'
    | 'paddy_parcel'
    | 'coconut_plantation'
    | 'rubber_shed'
    | 'lotus_pond'
    | 'stream_bridge'
    | 'wetland_mangrove'
    | 'residential_parcel';
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
  private arecanutPositions: Array<{ x: number; z: number }> = [];
  private bananaPositions: Array<{ x: number; z: number }> = [];
  private sacredPositions: Array<{ x: number; z: number }> = [];
  private lateritePositions: Array<{ x: number; z: number }> = [];
  private paddyPositions: Array<{ x: number; z: number }> = [];
  private coconutPositions: Array<{ x: number; z: number }> = [];
  private rubberShedPositions: Array<{ x: number; z: number }> = [];
  private lotusPondPositions: Array<{ x: number; z: number }> = [];
  private streamBridgePositions: Array<{ x: number; z: number }> = [];
  private wetlandPositions: Array<{ x: number; z: number }> = [];
  private residentialPositions: Array<{ x: number; z: number }> = [];

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
    this.arecanutPositions = [];
    this.bananaPositions = [];
    this.sacredPositions = [];
    this.lateritePositions = [];
    this.paddyPositions = [];
    this.coconutPositions = [];
    this.rubberShedPositions = [];
    this.lotusPondPositions = [];
    this.streamBridgePositions = [];
    this.wetlandPositions = [];
    this.residentialPositions = [];
    this.placedItems = [];
  }

  private getElevation?: (localX: number, localZ: number) => number;

  private setModelPosition(model: THREE.Object3D, x: number, z: number) {
    const y = this.getElevation ? this.getElevation(x, z) : 0;
    model.position.set(x, y, z);
  }

  public update(
    obstacleMap: SpatialObstacleMap,
    originLat: number,
    originLng: number,
    getElevation?: (localX: number, localZ: number) => number
  ): boolean {
    this.getElevation = getElevation;
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
              this.setModelPosition(model, midX, midZ);
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
                this.setModelPosition(model, cx, cz);
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
                this.setModelPosition(model, wx, wz);

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

                this.setModelPosition(model, sx, sz);
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
                this.setModelPosition(model, hx, hz);
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
                this.setModelPosition(model, fx, fz);
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
                this.setModelPosition(model, px, pz);

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

        // -------------------------------------------------------------
        // 8. Arecanut Grove (കവുങ്ങിൻ തോട്ടം / അടക്ക മരങ്ങൾ)
        // -------------------------------------------------------------
        const arecanutDist = road.buffer + 9.5;
        const ax = midX + nx * arecanutDist;
        const az = midZ + nz * arecanutDist;

        if (profile.allowedAssets.includes('arecanut_grove')) {
          const minArecanutDist = profile.spacing.arecanutGrove || 220;
          const tooCloseArecanut = this.arecanutPositions.some(
            (pos) => Math.hypot(pos.x - ax, pos.z - az) < minArecanutDist
          );

          if (!tooCloseArecanut) {
            const rotY = Math.atan2(-nx, -nz);
            if (
              obstacleMap.isStationFootprintClear(
                midX,
                midZ,
                nx,
                nz,
                tx,
                tz,
                arecanutDist,
                4.5,
                4.5,
                road.p1,
                road.p2
              ) &&
              !obstacleMap.isRoadCollision(ax, az, 4.5, 4.5, rotY, road.p1, road.p2) &&
              !obstacleMap.isBuildingCollision(ax, az, 5.0, 5.0, rotY) &&
              !obstacleMap.isPointInWater(ax, az)
            ) {
              const key = `arecanut_${Math.round(ax / 6)}_${Math.round(az / 6)}`;
              if (!this.items.has(key)) {
                obstacleMap.registerCustomObstacle(ax - 5.0, ax + 5.0, az - 5.0, az + 5.0);

                const model = KeralaVillageGenerator.createArecanutGroveModel();
                this.setModelPosition(model, ax, az);
                model.rotation.y = rotY;

                this.scene.add(model);
                this.items.set(key, model);
                this.arecanutPositions.push({ x: ax, z: az });

                const coords = GeoCoords.toLatLng(ax, az, originLat, originLng);
                this.placedItems.push({
                  type: 'arecanut_grove',
                  name: 'കവുങ്ങിൻ തോട്ടം (Arecanut Grove)',
                  lat: coords.lat,
                  lng: coords.lng,
                  x: ax,
                  z: az,
                  roadName: road.roadClass,
                });
                itemsPlaced++;
              }
            }
          }
        }

        // -------------------------------------------------------------
        // 9. Banana Plantation Clump (വാഴത്തോട്ടം / കുലവാഴകൾ)
        // -------------------------------------------------------------
        const bananaDist = road.buffer + 10.0;
        const bx = midX + nx * bananaDist;
        const bz = midZ + nz * bananaDist;

        if (profile.allowedAssets.includes('banana_grove')) {
          const minBananaDist = profile.spacing.bananaGrove || 180;
          const tooCloseBanana = this.bananaPositions.some(
            (pos) => Math.hypot(pos.x - bx, pos.z - bz) < minBananaDist
          );

          if (!tooCloseBanana) {
            const rotY = Math.atan2(-nx, -nz);
            if (
              obstacleMap.isStationFootprintClear(
                midX,
                midZ,
                nx,
                nz,
                tx,
                tz,
                bananaDist,
                4.5,
                4.5,
                road.p1,
                road.p2
              ) &&
              !obstacleMap.isRoadCollision(bx, bz, 4.5, 4.5, rotY, road.p1, road.p2) &&
              !obstacleMap.isBuildingCollision(bx, bz, 5.0, 5.0, rotY) &&
              !obstacleMap.isPointInWater(bx, bz)
            ) {
              const key = `banana_${Math.round(bx / 6)}_${Math.round(bz / 6)}`;
              if (!this.items.has(key)) {
                obstacleMap.registerCustomObstacle(bx - 5.0, bx + 5.0, bz - 5.0, bz + 5.0);

                const model = KeralaVillageGenerator.createBananaGroveModel();
                this.setModelPosition(model, bx, bz);
                model.rotation.y = rotY;

                this.scene.add(model);
                this.items.set(key, model);
                this.bananaPositions.push({ x: bx, z: bz });

                const coords = GeoCoords.toLatLng(bx, bz, originLat, originLng);
                this.placedItems.push({
                  type: 'banana_grove',
                  name: 'വാഴത്തോട്ടം (Banana Plantation Grove)',
                  lat: coords.lat,
                  lng: coords.lng,
                  x: bx,
                  z: bz,
                  roadName: road.roadClass,
                });
                itemsPlaced++;
              }
            }
          }
        }

        // -------------------------------------------------------------
        // 10. Sacred Grove (വിശുദ്ധ കാവ് / കുറുങ്കാട് - Sacred Forest Patch)
        // -------------------------------------------------------------
        const sacredDist = road.buffer + 16.5;
        const sgx = midX + nx * sacredDist;
        const sgz = midZ + nz * sacredDist;

        if (profile.allowedAssets.includes('sacred_grove')) {
          const minSacredDist = profile.spacing.sacredGrove || 500;
          const tooCloseSacred = this.sacredPositions.some(
            (pos) => Math.hypot(pos.x - sgx, pos.z - sgz) < minSacredDist
          );

          if (!tooCloseSacred) {
            const rotY = Math.atan2(-nx, -nz);
            if (
              obstacleMap.isStationFootprintClear(
                midX,
                midZ,
                nx,
                nz,
                tx,
                tz,
                sacredDist,
                6.5,
                6.5,
                road.p1,
                road.p2
              ) &&
              !obstacleMap.isRoadCollision(sgx, sgz, 6.5, 6.5, rotY, road.p1, road.p2) &&
              !obstacleMap.isBuildingCollision(sgx, sgz, 7.0, 7.0, rotY) &&
              !obstacleMap.isPointInWater(sgx, sgz)
            ) {
              const key = `sacred_${Math.round(sgx / 8)}_${Math.round(sgz / 8)}`;
              if (!this.items.has(key)) {
                obstacleMap.registerCustomObstacle(sgx - 7.0, sgx + 7.0, sgz - 7.0, sgz + 7.0);

                const model = KeralaVillageGenerator.createSacredGroveModel();
                this.setModelPosition(model, sgx, sgz);
                model.rotation.y = rotY;

                this.scene.add(model);
                this.items.set(key, model);
                this.sacredPositions.push({ x: sgx, z: sgz });

                const coords = GeoCoords.toLatLng(sgx, sgz, originLat, originLng);
                this.placedItems.push({
                  type: 'sacred_grove',
                  name: 'വിശുദ്ധ കാവ് / കുറുങ്കാട് (Sacred Grove / Forest Patch)',
                  lat: coords.lat,
                  lng: coords.lng,
                  x: sgx,
                  z: sgz,
                  roadName: road.roadClass,
                });
                itemsPlaced++;
              }
            }
          }
        }

        // -------------------------------------------------------------
        // 11. Laterite Soil Cut & Hillside (ചെങ്കൽ കുന്നുകൾ / തട്ടുകൾ)
        // -------------------------------------------------------------
        const lateriteDist = road.buffer + 8.5;
        const lx = midX + nx * lateriteDist;
        const lz = midZ + nz * lateriteDist;

        if (profile.allowedAssets.includes('laterite_cut')) {
          const minLateriteDist = profile.spacing.lateriteCut || 320;
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
                this.setModelPosition(model, lx, lz);
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
                  roadName: road.roadClass,
                });
                itemsPlaced++;
              }
            }
          }
        }

        // -------------------------------------------------------------
        // 12. Flat Residential Land Parcel (റെസിഡൻഷ്യൽ പ്ലോട്ട് / വീട്ടുപറമ്പ്)
        // -------------------------------------------------------------
        const resDist = road.buffer + 9.5;
        const resX = midX + nx * resDist;
        const resZ = midZ + nz * resDist;

        if (profile.allowedAssets.includes('residential_parcel')) {
          const minResDist = profile.spacing.residentialParcel || 160;
          const tooCloseRes = this.residentialPositions.some(
            (pos) => Math.hypot(pos.x - resX, pos.z - resZ) < minResDist
          );

          if (!tooCloseRes) {
            const rotY = Math.atan2(-nx, -nz);
            if (
              obstacleMap.isStationFootprintClear(
                midX,
                midZ,
                nx,
                nz,
                tx,
                tz,
                resDist,
                7.0,
                5.5,
                road.p1,
                road.p2
              ) &&
              !obstacleMap.isRoadCollision(resX, resZ, 7.0, 5.5, rotY, road.p1, road.p2) &&
              !obstacleMap.isBuildingCollision(resX, resZ, 7.5, 6.0, rotY) &&
              !obstacleMap.isPointInWater(resX, resZ)
            ) {
              const key = `res_${Math.round(resX / 6)}_${Math.round(resZ / 6)}`;
              if (!this.items.has(key)) {
                obstacleMap.registerCustomObstacle(resX - 7.0, resX + 7.0, resZ - 5.5, resZ + 5.5);

                const model = KeralaVillageGenerator.createResidentialCompoundParcelModel();
                this.setModelPosition(model, resX, resZ);
                model.rotation.y = rotY;

                this.scene.add(model);
                this.items.set(key, model);
                this.residentialPositions.push({ x: resX, z: resZ });

                const coords = GeoCoords.toLatLng(resX, resZ, originLat, originLng);
                this.placedItems.push({
                  type: 'residential_parcel',
                  name: 'റെസിഡൻഷ്യൽ പ്ലോട്ട് / വീട്ടുപറമ്പ് (Flat Residential Land)',
                  lat: coords.lat,
                  lng: coords.lng,
                  x: resX,
                  z: resZ,
                  roadName: road.roadClass,
                });
                itemsPlaced++;
              }
            }
          }
        }

        // -------------------------------------------------------------
        // 13. Paddy Field Parcel with Bunds & Scarecrow (നെൽപ്പാടവും വരമ്പും)
        // -------------------------------------------------------------
        const paddyDist = road.buffer + 14.5;
        const pdx = midX + nx * paddyDist;
        const pdz = midZ + nz * paddyDist;

        if (profile.allowedAssets.includes('paddy_parcel')) {
          const minPaddyDist = profile.spacing.paddyParcel || 240;
          const tooClosePaddy = this.paddyPositions.some(
            (pos) => Math.hypot(pos.x - pdx, pos.z - pdz) < minPaddyDist
          );

          if (!tooClosePaddy) {
            const rotY = Math.atan2(-nx, -nz);
            if (
              obstacleMap.isStationFootprintClear(
                midX,
                midZ,
                nx,
                nz,
                tx,
                tz,
                paddyDist,
                7.5,
                5.5,
                road.p1,
                road.p2
              ) &&
              !obstacleMap.isRoadCollision(pdx, pdz, 7.5, 5.5, rotY, road.p1, road.p2) &&
              !obstacleMap.isBuildingCollision(pdx, pdz, 8.0, 6.0, rotY) &&
              !obstacleMap.isPointInWater(pdx, pdz)
            ) {
              const key = `paddy_${Math.round(pdx / 7)}_${Math.round(pdz / 7)}`;
              if (!this.items.has(key)) {
                obstacleMap.registerCustomObstacle(pdx - 7.5, pdx + 7.5, pdz - 5.5, pdz + 5.5);

                const model = KeralaVillageGenerator.createPaddyFieldParcelModel();
                this.setModelPosition(model, pdx, pdz);
                model.rotation.y = rotY;

                this.scene.add(model);
                this.items.set(key, model);
                this.paddyPositions.push({ x: pdx, z: pdz });

                const coords = GeoCoords.toLatLng(pdx, pdz, originLat, originLng);
                this.placedItems.push({
                  type: 'paddy_parcel',
                  name: 'നെൽപ്പാടവും വരമ്പും (Paddy Field & Bunds)',
                  lat: coords.lat,
                  lng: coords.lng,
                  x: pdx,
                  z: pdz,
                  roadName: road.roadClass,
                });
                itemsPlaced++;
              }
            }
          }
        }

        // -------------------------------------------------------------
        // 14. Coconut Plantation Plot (തെങ്ങിൻ തോപ്പ്)
        // -------------------------------------------------------------
        const cocoDist = road.buffer + 12.0;
        const ccx = midX + nx * cocoDist;
        const ccz = midZ + nz * cocoDist;

        if (profile.allowedAssets.includes('coconut_plantation')) {
          const minCocoDist = profile.spacing.coconutPlantation || 220;
          const tooCloseCoco = this.coconutPositions.some(
            (pos) => Math.hypot(pos.x - ccx, pos.z - ccz) < minCocoDist
          );

          if (!tooCloseCoco) {
            const rotY = Math.atan2(-nx, -nz);
            if (
              obstacleMap.isStationFootprintClear(
                midX,
                midZ,
                nx,
                nz,
                tx,
                tz,
                cocoDist,
                6.5,
                5.0,
                road.p1,
                road.p2
              ) &&
              !obstacleMap.isRoadCollision(ccx, ccz, 6.5, 5.0, rotY, road.p1, road.p2) &&
              !obstacleMap.isBuildingCollision(ccx, ccz, 7.0, 5.5, rotY) &&
              !obstacleMap.isPointInWater(ccx, ccz)
            ) {
              const key = `coco_${Math.round(ccx / 6)}_${Math.round(ccz / 6)}`;
              if (!this.items.has(key)) {
                obstacleMap.registerCustomObstacle(ccx - 6.5, ccx + 6.5, ccz - 5.0, ccz + 5.0);

                const model = KeralaVillageGenerator.createCoconutPlantationPlotModel();
                this.setModelPosition(model, ccx, ccz);
                model.rotation.y = rotY;

                this.scene.add(model);
                this.items.set(key, model);
                this.coconutPositions.push({ x: ccx, z: ccz });

                const coords = GeoCoords.toLatLng(ccx, ccz, originLat, originLng);
                this.placedItems.push({
                  type: 'coconut_plantation',
                  name: 'തെങ്ങിൻ തോപ്പ് (Coconut Plantation Plot)',
                  lat: coords.lat,
                  lng: coords.lng,
                  x: ccx,
                  z: ccz,
                  roadName: road.roadClass,
                });
                itemsPlaced++;
              }
            }
          }
        }

        // -------------------------------------------------------------
        // 15. Rubber Processing Shed & Sheet Drying (റബ്ബർ പുകപ്പുര)
        // -------------------------------------------------------------
        const rubberDist = road.buffer + 8.5;
        const rbx = midX + nx * rubberDist;
        const rbz = midZ + nz * rubberDist;

        if (profile.allowedAssets.includes('rubber_shed')) {
          const minRubberDist = profile.spacing.rubberShed || 250;
          const tooCloseRubber = this.rubberShedPositions.some(
            (pos) => Math.hypot(pos.x - rbx, pos.z - rbz) < minRubberDist
          );

          if (!tooCloseRubber) {
            const rotY = Math.atan2(-nx, -nz);
            if (
              obstacleMap.isStationFootprintClear(
                midX,
                midZ,
                nx,
                nz,
                tx,
                tz,
                rubberDist,
                4.5,
                3.5,
                road.p1,
                road.p2
              ) &&
              !obstacleMap.isRoadCollision(rbx, rbz, 4.5, 3.5, rotY, road.p1, road.p2) &&
              !obstacleMap.isBuildingCollision(rbx, rbz, 5.0, 4.0, rotY) &&
              !obstacleMap.isPointInWater(rbx, rbz)
            ) {
              const key = `rshed_${Math.round(rbx / 6)}_${Math.round(rbz / 6)}`;
              if (!this.items.has(key)) {
                obstacleMap.registerCustomObstacle(rbx - 4.5, rbx + 4.5, rbz - 3.5, rbz + 3.5);

                const model = KeralaVillageGenerator.createRubberProcessingShedModel();
                this.setModelPosition(model, rbx, rbz);
                model.rotation.y = rotY;

                this.scene.add(model);
                this.items.set(key, model);
                this.rubberShedPositions.push({ x: rbx, z: rbz });

                const coords = GeoCoords.toLatLng(rbx, rbz, originLat, originLng);
                this.placedItems.push({
                  type: 'rubber_shed',
                  name: 'റബ്ബർ പുകപ്പുര & റോളർ മെഷീൻ (Rubber Processing Shed)',
                  lat: coords.lat,
                  lng: coords.lng,
                  x: rbx,
                  z: rbz,
                  roadName: road.roadClass,
                });
                itemsPlaced++;
              }
            }
          }
        }

        // -------------------------------------------------------------
        // 16. Natural Country Lotus Pond (നാടൻ ആമ്പൽക്കുളം)
        // -------------------------------------------------------------
        const lotusDist = road.buffer + 13.5;
        const ltx = midX + nx * lotusDist;
        const ltz = midZ + nz * lotusDist;

        if (profile.allowedAssets.includes('lotus_pond')) {
          const minLotusDist = profile.spacing.lotusPond || 300;
          const tooCloseLotus = this.lotusPondPositions.some(
            (pos) => Math.hypot(pos.x - ltx, pos.z - ltz) < minLotusDist
          );

          if (!tooCloseLotus) {
            if (
              obstacleMap.isStationFootprintClear(
                midX,
                midZ,
                nx,
                nz,
                tx,
                tz,
                lotusDist,
                5.5,
                5.0,
                road.p1,
                road.p2
              ) &&
              !obstacleMap.isRoadCollision(ltx, ltz, 5.5, 5.0, 0, road.p1, road.p2) &&
              !obstacleMap.isBuildingCollision(ltx, ltz, 6.0, 5.5, 0) &&
              !obstacleMap.isPointInWater(ltx, ltz)
            ) {
              const key = `lotus_${Math.round(ltx / 6)}_${Math.round(ltz / 6)}`;
              if (!this.items.has(key)) {
                obstacleMap.registerCustomObstacle(ltx - 5.5, ltx + 5.5, ltz - 5.0, ltz + 5.0);

                const model = KeralaVillageGenerator.createNaturalLotusPondModel();
                this.setModelPosition(model, ltx, ltz);

                this.scene.add(model);
                this.items.set(key, model);
                this.lotusPondPositions.push({ x: ltx, z: ltz });

                const coords = GeoCoords.toLatLng(ltx, ltz, originLat, originLng);
                this.placedItems.push({
                  type: 'lotus_pond',
                  name: 'നാടൻ ആമ്പൽക്കുളം (Natural Lotus Pond)',
                  lat: coords.lat,
                  lng: coords.lng,
                  x: ltx,
                  z: ltz,
                  roadName: road.roadClass,
                });
                itemsPlaced++;
              }
            }
          }
        }

        // -------------------------------------------------------------
        // 17. Country Stream with Coconut Trunk Footbridge (തോടും തെങ്ങുപാലവും)
        // -------------------------------------------------------------
        const streamDist = road.buffer + 8.5;
        const stx = midX + nx * streamDist;
        const stz = midZ + nz * streamDist;

        if (profile.allowedAssets.includes('stream_bridge')) {
          const distToWater = obstacleMap.getDistanceToWater(stx, stz, 30);
          if (distToWater <= 20) {
            const minStreamDist = profile.spacing.streamBridge || 200;
            const tooCloseStream = this.streamBridgePositions.some(
              (pos) => Math.hypot(pos.x - stx, pos.z - stz) < minStreamDist
            );

            if (!tooCloseStream) {
              const rotY = Math.atan2(tx, tz);
              if (
                obstacleMap.isStationFootprintClear(
                  midX,
                  midZ,
                  nx,
                  nz,
                  tx,
                  tz,
                  streamDist,
                  4.5,
                  6.0,
                  road.p1,
                  road.p2
                ) &&
                !obstacleMap.isRoadCollision(stx, stz, 4.5, 6.0, rotY, road.p1, road.p2) &&
                !obstacleMap.isBuildingCollision(stx, stz, 5.0, 6.5, rotY)
              ) {
                const key = `sbridge_${Math.round(stx / 6)}_${Math.round(stz / 6)}`;
                if (!this.items.has(key)) {
                  obstacleMap.registerCustomObstacle(stx - 4.5, stx + 4.5, stz - 6.0, stz + 6.0);

                  const model = KeralaVillageGenerator.createStreamFootbridgeModel();
                  this.setModelPosition(model, stx, stz);
                  model.rotation.y = rotY;

                  this.scene.add(model);
                  this.items.set(key, model);
                  this.streamBridgePositions.push({ x: stx, z: stz });

                  const coords = GeoCoords.toLatLng(stx, stz, originLat, originLng);
                  this.placedItems.push({
                    type: 'stream_bridge',
                    name: 'തോടും തെങ്ങുപാലവും (Stream with Footbridge)',
                    lat: coords.lat,
                    lng: coords.lng,
                    x: stx,
                    z: stz,
                    roadName: road.roadClass,
                  });
                  itemsPlaced++;
                }
              }
            }
          }
        }

        // -------------------------------------------------------------
        // 18. Wetland Mangrove & Reed Thicket (ചതുപ്പും കണ്ടൽക്കാടുകളും)
        // -------------------------------------------------------------
        const wetlandDist = road.buffer + 14.0;
        const wmx = midX + nx * wetlandDist;
        const wmz = midZ + nz * wetlandDist;

        if (profile.allowedAssets.includes('wetland_mangrove')) {
          const distToWater = obstacleMap.getDistanceToWater(wmx, wmz, 35);
          if (distToWater <= 25) {
            const minWetlandDist = profile.spacing.wetlandMangrove || 240;
            const tooCloseWetland = this.wetlandPositions.some(
              (pos) => Math.hypot(pos.x - wmx, pos.z - wmz) < minWetlandDist
            );

            if (!tooCloseWetland) {
              const rotY = Math.atan2(-nx, -nz);
              if (
                obstacleMap.isStationFootprintClear(
                  midX,
                  midZ,
                  nx,
                  nz,
                  tx,
                  tz,
                  wetlandDist,
                  6.5,
                  5.5,
                  road.p1,
                  road.p2
                ) &&
                !obstacleMap.isRoadCollision(wmx, wmz, 6.5, 5.5, rotY, road.p1, road.p2) &&
                !obstacleMap.isBuildingCollision(wmx, wmz, 7.0, 6.0, rotY)
              ) {
                const key = `wmangrove_${Math.round(wmx / 6)}_${Math.round(wmz / 6)}`;
                if (!this.items.has(key)) {
                  obstacleMap.registerCustomObstacle(wmx - 6.5, wmx + 6.5, wmz - 5.5, wmz + 5.5);

                  const model = KeralaVillageGenerator.createWetlandMangroveModel();
                  this.setModelPosition(model, wmx, wmz);
                  model.rotation.y = rotY;

                  this.scene.add(model);
                  this.items.set(key, model);
                  this.wetlandPositions.push({ x: wmx, z: wmz });

                  const coords = GeoCoords.toLatLng(wmx, wmz, originLat, originLng);
                  this.placedItems.push({
                    type: 'wetland_mangrove',
                    name: 'ചതുപ്പും കണ്ടൽക്കാടുകളും (Wetland Mangroves & Reeds)',
                    lat: coords.lat,
                    lng: coords.lng,
                    x: wmx,
                    z: wmz,
                    roadName: road.roadClass,
                  });
                  itemsPlaced++;
                }
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
