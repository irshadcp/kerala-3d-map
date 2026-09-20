import * as THREE from 'three';
import { SpatialObstacleMap } from './SpatialObstacleMap';
import { GeoCoords } from '../core/geoCoords';
import { KeralaRoadsideGenerator } from './KeralaRoadsideGenerator';

export type KeralaRoadsideType =
  | 'concrete_pole'
  | 'street_light'
  | 'road_sign'
  | 'bus_stop'
  | 'small_shop'
  | 'tea_shop'
  | 'bakery'
  | 'pharmacy'
  | 'compound_wall'
  | 'gate'
  | 'drain'
  | 'culvert'
  | 'bridge'
  | 'billboard'
  | 'auto_stand';

export interface PlacedRoadsideItem {
  type: KeralaRoadsideType;
  name: string;
  lat: number;
  lng: number;
  x: number;
  z: number;
  roadName: string;
}

export class KeralaRoadsideManager {
  private scene: THREE.Scene;
  private items = new Map<string, THREE.Group>();
  public placedItems: PlacedRoadsideItem[] = [];

  // Spacing tracker arrays
  private concretePolePositions: { x: number; z: number }[] = [];
  private streetLightPositions: { x: number; z: number }[] = [];
  private roadSignPositions: { x: number; z: number }[] = [];
  private busStopPositions: { x: number; z: number }[] = [];
  private smallShopPositions: { x: number; z: number }[] = [];
  private teaShopPositions: { x: number; z: number }[] = [];
  private bakeryPositions: { x: number; z: number }[] = [];
  private pharmacyPositions: { x: number; z: number }[] = [];
  private compoundWallPositions: { x: number; z: number }[] = [];
  private gatePositions: { x: number; z: number }[] = [];
  private drainPositions: { x: number; z: number }[] = [];
  private culvertPositions: { x: number; z: number }[] = [];
  private bridgePositions: { x: number; z: number }[] = [];
  private billboardPositions: { x: number; z: number }[] = [];
  private autoStandPositions: { x: number; z: number }[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public clear() {
    for (const model of this.items.values()) {
      this.scene.remove(model);
      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          m.geometry?.dispose();
        }
      });
    }
    this.items.clear();
    this.placedItems = [];
    this.concretePolePositions = [];
    this.streetLightPositions = [];
    this.roadSignPositions = [];
    this.busStopPositions = [];
    this.smallShopPositions = [];
    this.teaShopPositions = [];
    this.bakeryPositions = [];
    this.pharmacyPositions = [];
    this.compoundWallPositions = [];
    this.gatePositions = [];
    this.drainPositions = [];
    this.culvertPositions = [];
    this.bridgePositions = [];
    this.billboardPositions = [];
    this.autoStandPositions = [];
  }

  public update(obstacleMap: SpatialObstacleMap, originLat: number, originLng: number) {
    if (!obstacleMap.isReady || obstacleMap.roads.length === 0) return;

    this.clear();
    let itemsPlaced = 0;
    const maxItems = 260;

    for (const road of obstacleMap.roads) {
      if (itemsPlaced >= maxItems) break;

      const dx = road.p2.x - road.p1.x;
      const dz = road.p2.z - road.p1.z;
      const len = Math.hypot(dx, dz);
      if (len < 12) continue;

      const tx = dx / len;
      const tz = dz / len;
      const nx = -tz;
      const nz = tx;
      const roadRot = Math.atan2(tx, tz);

      // Evaluate both roadside verges (+normal and -normal)
      const sides = [1, -1];

      for (const side of sides) {
        if (itemsPlaced >= maxItems) break;

        const snx = nx * side;
        const snz = nz * side;

        // Sample midpoint along road segment
        const midX = (road.p1.x + road.p2.x) * 0.5;
        const midZ = (road.p1.z + road.p2.z) * 0.5;

        // =============================================================
        // 1. ConcretePole (കെ.എസ്.ഇ.ബി കോൺക്രീറ്റ് പോസ്റ്റ്)
        // =============================================================
        const poleDist = road.buffer + 0.85;
        const px = midX + snx * poleDist;
        const pz = midZ + snz * poleDist;
        const tooClosePole = this.concretePolePositions.some(
          (pos) => Math.hypot(pos.x - px, pos.z - pz) < 45
        );

        if (!tooClosePole) {
          if (
            obstacleMap.isStationFootprintClear(midX, midZ, snx, snz, tx, tz, poleDist, 1.2, 1.2, road.p1, road.p2) &&
            !obstacleMap.isRoadCollision(px, pz, 1.2, 1.2, roadRot, road.p1, road.p2) &&
            !obstacleMap.isBuildingCollision(px, pz, 1.4, 1.4, roadRot) &&
            !obstacleMap.isPointInWater(px, pz)
          ) {
            const key = `pole_${Math.round(px / 4)}_${Math.round(pz / 4)}`;
            if (!this.items.has(key)) {
              obstacleMap.registerCustomObstacle(px - 1.2, px + 1.2, pz - 1.2, pz + 1.2);

              const model = KeralaRoadsideGenerator.createConcretePoleModel();
              model.position.set(px, 0, pz);
              model.rotation.y = roadRot;

              this.scene.add(model);
              this.items.set(key, model);
              this.concretePolePositions.push({ x: px, z: pz });

              const coords = GeoCoords.toLatLng(px, pz, originLat, originLng);
              this.placedItems.push({
                type: 'concrete_pole',
                name: 'കെ.എസ്.ഇ.ബി കോൺക്രീറ്റ് പോസ്റ്റ് (KSEB Concrete Electric Pole)',
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

        // =============================================================
        // 2. StreetLight (റോഡരികിലെ സ്ട്രീറ്റ് ലൈറ്റ്)
        // =============================================================
        const lightDist = road.buffer + 1.1;
        const lx = midX + snx * lightDist;
        const lz = midZ + snz * lightDist;
        const tooCloseLight = this.streetLightPositions.some(
          (pos) => Math.hypot(pos.x - lx, pos.z - lz) < 60
        );

        if (!tooCloseLight && (road.roadClass === 'primary' || road.roadClass === 'secondary' || road.roadClass === 'tertiary')) {
          if (
            obstacleMap.isStationFootprintClear(midX, midZ, snx, snz, tx, tz, lightDist, 1.2, 1.2, road.p1, road.p2) &&
            !obstacleMap.isRoadCollision(lx, lz, 1.2, 1.2, roadRot, road.p1, road.p2) &&
            !obstacleMap.isBuildingCollision(lx, lz, 1.5, 1.5, roadRot) &&
            !obstacleMap.isPointInWater(lx, lz)
          ) {
            const key = `slight_${Math.round(lx / 4)}_${Math.round(lz / 4)}`;
            if (!this.items.has(key)) {
              obstacleMap.registerCustomObstacle(lx - 1.2, lx + 1.2, lz - 1.2, lz + 1.2);

              const model = KeralaRoadsideGenerator.createStreetLightModel();
              model.position.set(lx, 0, lz);
              // Luminaire arm points towards road carriageway
              model.rotation.y = Math.atan2(-snx, -snz);

              this.scene.add(model);
              this.items.set(key, model);
              this.streetLightPositions.push({ x: lx, z: lz });

              const coords = GeoCoords.toLatLng(lx, lz, originLat, originLng);
              this.placedItems.push({
                type: 'street_light',
                name: 'റോഡരികിലെ സ്ട്രീറ്റ് ലൈറ്റ് (LED Street Light)',
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

        // =============================================================
        // 3. RoadSign (കേരള PWD ദിശാ / മുന്നറിയിപ്പ് ബോർഡുകൾ)
        // =============================================================
        const signDist = road.buffer + 1.6;
        const rx = midX + snx * signDist;
        const rz = midZ + snz * signDist;
        const tooCloseSign = this.roadSignPositions.some(
          (pos) => Math.hypot(pos.x - rx, pos.z - rz) < 130
        );

        if (!tooCloseSign) {
          if (
            obstacleMap.isStationFootprintClear(midX, midZ, snx, snz, tx, tz, signDist, 2.0, 1.2, road.p1, road.p2) &&
            !obstacleMap.isRoadCollision(rx, rz, 2.0, 1.2, roadRot, road.p1, road.p2) &&
            !obstacleMap.isBuildingCollision(rx, rz, 2.2, 1.4, roadRot) &&
            !obstacleMap.isPointInWater(rx, rz)
          ) {
            const key = `rsign_${Math.round(rx / 4)}_${Math.round(rz / 4)}`;
            if (!this.items.has(key)) {
              obstacleMap.registerCustomObstacle(rx - 2.0, rx + 2.0, rz - 1.2, rz + 1.2);

              const signType = itemsPlaced % 3 === 0 ? 'direction' : (itemsPlaced % 3 === 1 ? 'warning' : 'speed');
              const model = KeralaRoadsideGenerator.createRoadSignModel(signType);
              model.position.set(rx, 0, rz);
              model.rotation.y = roadRot + Math.PI / 2;

              this.scene.add(model);
              this.items.set(key, model);
              this.roadSignPositions.push({ x: rx, z: rz });

              const coords = GeoCoords.toLatLng(rx, rz, originLat, originLng);
              this.placedItems.push({
                type: 'road_sign',
                name: 'കേരള PWD ദിശാ / മുന്നറിയിപ്പ് ബോർഡ് (Road Signpost)',
                lat: coords.lat,
                lng: coords.lng,
                x: rx,
                z: rz,
                roadName: road.roadClass,
              });
              itemsPlaced++;
            }
          }
        }

        // =============================================================
        // 4. BusStop (കേരള ബസ് കാത്തിരിപ്പ് കേന്ദ്രം)
        // =============================================================
        const busDist = road.buffer + 3.8;
        const bx = midX + snx * busDist;
        const bz = midZ + snz * busDist;
        const tooCloseBus = this.busStopPositions.some(
          (pos) => Math.hypot(pos.x - bx, pos.z - bz) < 220
        );

        if (!tooCloseBus && len >= 28) {
          const rotY = Math.atan2(-snx, -snz);
          if (
            obstacleMap.isStationFootprintClear(midX, midZ, snx, snz, tx, tz, busDist, 4.5, 2.8, road.p1, road.p2) &&
            !obstacleMap.isRoadCollision(bx, bz, 4.5, 2.8, rotY, road.p1, road.p2) &&
            !obstacleMap.isBuildingCollision(bx, bz, 4.8, 3.2, rotY) &&
            !obstacleMap.isPointInWater(bx, bz)
          ) {
            const key = `bshelter_${Math.round(bx / 5)}_${Math.round(bz / 5)}`;
            if (!this.items.has(key)) {
              obstacleMap.registerCustomObstacle(bx - 4.5, bx + 4.5, bz - 2.8, bz + 2.8);

              const model = KeralaRoadsideGenerator.createBusStopModel();
              model.position.set(bx, 0, bz);
              model.rotation.y = rotY;

              this.scene.add(model);
              this.items.set(key, model);
              this.busStopPositions.push({ x: bx, z: bz });

              const coords = GeoCoords.toLatLng(bx, bz, originLat, originLng);
              this.placedItems.push({
                type: 'bus_stop',
                name: 'കേരള ബസ് കാത്തിരിപ്പ് കേന്ദ്രം (Kerala Bus Stop Shelter)',
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

        // =============================================================
        // 5. SmallShop (പെട്ടിക്കട / തട്ടുകട)
        // =============================================================
        const shopDist = road.buffer + 4.2;
        const shx = midX + snx * shopDist;
        const shz = midZ + snz * shopDist;
        const tooCloseSmallShop = this.smallShopPositions.some(
          (pos) => Math.hypot(pos.x - shx, pos.z - shz) < 170
        );

        if (!tooCloseSmallShop) {
          const rotY = Math.atan2(-snx, -snz);
          if (
            obstacleMap.isStationFootprintClear(midX, midZ, snx, snz, tx, tz, shopDist, 3.0, 2.5, road.p1, road.p2) &&
            !obstacleMap.isRoadCollision(shx, shz, 3.0, 2.5, rotY, road.p1, road.p2) &&
            !obstacleMap.isBuildingCollision(shx, shz, 3.4, 2.8, rotY) &&
            !obstacleMap.isPointInWater(shx, shz)
          ) {
            const key = `sshop_${Math.round(shx / 5)}_${Math.round(shz / 5)}`;
            if (!this.items.has(key)) {
              obstacleMap.registerCustomObstacle(shx - 3.0, shx + 3.0, shz - 2.5, shz + 2.5);

              const model = KeralaRoadsideGenerator.createSmallShopModel();
              model.position.set(shx, 0, shz);
              model.rotation.y = rotY;

              this.scene.add(model);
              this.items.set(key, model);
              this.smallShopPositions.push({ x: shx, z: shz });

              const coords = GeoCoords.toLatLng(shx, shz, originLat, originLng);
              this.placedItems.push({
                type: 'small_shop',
                name: 'വഴിയോര പെട്ടിക്കട / തട്ടുകട (Kerala Wayside Petty Shop)',
                lat: coords.lat,
                lng: coords.lng,
                x: shx,
                z: shz,
                roadName: road.roadClass,
              });
              itemsPlaced++;
            }
          }
        }

        // =============================================================
        // 6. TeaShop (കേരള ചായക്കട)
        // =============================================================
        const teaDist = road.buffer + 4.8;
        const tax = midX + snx * teaDist;
        const taz = midZ + snz * teaDist;
        const tooCloseTea = this.teaShopPositions.some(
          (pos) => Math.hypot(pos.x - tax, pos.z - taz) < 210
        );

        if (!tooCloseTea) {
          const rotY = Math.atan2(-snx, -snz);
          if (
            obstacleMap.isStationFootprintClear(midX, midZ, snx, snz, tx, tz, teaDist, 3.8, 3.2, road.p1, road.p2) &&
            !obstacleMap.isRoadCollision(tax, taz, 3.8, 3.2, rotY, road.p1, road.p2) &&
            !obstacleMap.isBuildingCollision(tax, taz, 4.2, 3.6, rotY) &&
            !obstacleMap.isPointInWater(tax, taz)
          ) {
            const key = `teashop_${Math.round(tax / 5)}_${Math.round(taz / 5)}`;
            if (!this.items.has(key)) {
              obstacleMap.registerCustomObstacle(tax - 3.8, tax + 3.8, taz - 3.2, taz + 3.2);

              const model = KeralaRoadsideGenerator.createTeaShopModel();
              model.position.set(tax, 0, taz);
              model.rotation.y = rotY;

              this.scene.add(model);
              this.items.set(key, model);
              this.teaShopPositions.push({ x: tax, z: taz });

              const coords = GeoCoords.toLatLng(tax, taz, originLat, originLng);
              this.placedItems.push({
                type: 'tea_shop',
                name: 'കേരള ചായക്കട (Kerala Tea Shop & Snacks)',
                lat: coords.lat,
                lng: coords.lng,
                x: tax,
                z: taz,
                roadName: road.roadClass,
              });
              itemsPlaced++;
            }
          }
        }

        // =============================================================
        // 7. Bakery (കേരള ബേക്കറി)
        // =============================================================
        const bakeDist = road.buffer + 5.2;
        const bkx = midX + snx * bakeDist;
        const bkz = midZ + snz * bakeDist;
        const tooCloseBake = this.bakeryPositions.some(
          (pos) => Math.hypot(pos.x - bkx, pos.z - bkz) < 240
        );

        if (!tooCloseBake && (road.roadClass === 'primary' || road.roadClass === 'secondary')) {
          const rotY = Math.atan2(-snx, -snz);
          if (
            obstacleMap.isStationFootprintClear(midX, midZ, snx, snz, tx, tz, bakeDist, 4.2, 3.5, road.p1, road.p2) &&
            !obstacleMap.isRoadCollision(bkx, bkz, 4.2, 3.5, rotY, road.p1, road.p2) &&
            !obstacleMap.isBuildingCollision(bkx, bkz, 4.6, 3.8, rotY) &&
            !obstacleMap.isPointInWater(bkx, bkz)
          ) {
            const key = `bakery_${Math.round(bkx / 5)}_${Math.round(bkz / 5)}`;
            if (!this.items.has(key)) {
              obstacleMap.registerCustomObstacle(bkx - 4.2, bkx + 4.2, bkz - 3.5, bkz + 3.5);

              const model = KeralaRoadsideGenerator.createBakeryModel();
              model.position.set(bkx, 0, bkz);
              model.rotation.y = rotY;

              this.scene.add(model);
              this.items.set(key, model);
              this.bakeryPositions.push({ x: bkx, z: bkz });

              const coords = GeoCoords.toLatLng(bkx, bkz, originLat, originLng);
              this.placedItems.push({
                type: 'bakery',
                name: 'കേരള ബേക്കറി (Kerala Bakery & Confectionery)',
                lat: coords.lat,
                lng: coords.lng,
                x: bkx,
                z: bkz,
                roadName: road.roadClass,
              });
              itemsPlaced++;
            }
          }
        }

        // =============================================================
        // 8. Pharmacy (മെഡിക്കൽ സ്റ്റോർ / ഫാർമസി)
        // =============================================================
        const pharmDist = road.buffer + 5.0;
        const phx = midX + snx * pharmDist;
        const phz = midZ + snz * pharmDist;
        const tooClosePharm = this.pharmacyPositions.some(
          (pos) => Math.hypot(pos.x - phx, pos.z - phz) < 260
        );

        if (!tooClosePharm && (road.roadClass === 'primary' || road.roadClass === 'secondary' || road.roadClass === 'tertiary')) {
          const rotY = Math.atan2(-snx, -snz);
          if (
            obstacleMap.isStationFootprintClear(midX, midZ, snx, snz, tx, tz, pharmDist, 4.2, 3.4, road.p1, road.p2) &&
            !obstacleMap.isRoadCollision(phx, phz, 4.2, 3.4, rotY, road.p1, road.p2) &&
            !obstacleMap.isBuildingCollision(phx, phz, 4.6, 3.8, rotY) &&
            !obstacleMap.isPointInWater(phx, phz)
          ) {
            const key = `pharm_${Math.round(phx / 5)}_${Math.round(phz / 5)}`;
            if (!this.items.has(key)) {
              obstacleMap.registerCustomObstacle(phx - 4.2, phx + 4.2, phz - 3.4, phz + 3.4);

              const model = KeralaRoadsideGenerator.createPharmacyModel();
              model.position.set(phx, 0, phz);
              model.rotation.y = rotY;

              this.scene.add(model);
              this.items.set(key, model);
              this.pharmacyPositions.push({ x: phx, z: phz });

              const coords = GeoCoords.toLatLng(phx, phz, originLat, originLng);
              this.placedItems.push({
                type: 'pharmacy',
                name: 'മെഡിക്കൽ സ്റ്റോർ / ഫാർമസി (Pharmacy & Healthcare)',
                lat: coords.lat,
                lng: coords.lng,
                x: phx,
                z: phz,
                roadName: road.roadClass,
              });
              itemsPlaced++;
            }
          }
        }

        // =============================================================
        // 9. CompoundWall (കേരള കോമ്പൗണ്ട് വാൾ)
        // =============================================================
        const wallDist = road.buffer + 2.8;
        const cwx = midX + snx * wallDist;
        const cwz = midZ + snz * wallDist;
        const tooCloseWall = this.compoundWallPositions.some(
          (pos) => Math.hypot(pos.x - cwx, pos.z - cwz) < 110
        );

        if (!tooCloseWall) {
          if (
            obstacleMap.isStationFootprintClear(midX, midZ, snx, snz, tx, tz, wallDist, 5.5, 0.8, road.p1, road.p2) &&
            !obstacleMap.isRoadCollision(cwx, cwz, 5.5, 0.8, roadRot, road.p1, road.p2) &&
            !obstacleMap.isBuildingCollision(cwx, cwz, 5.8, 1.0, roadRot) &&
            !obstacleMap.isPointInWater(cwx, cwz)
          ) {
            const key = `cwall_${Math.round(cwx / 5)}_${Math.round(cwz / 5)}`;
            if (!this.items.has(key)) {
              obstacleMap.registerCustomObstacle(cwx - 5.5, cwx + 5.5, cwz - 0.8, cwz + 0.8);

              const model = KeralaRoadsideGenerator.createCompoundWallModel();
              model.position.set(cwx, 0, cwz);
              model.rotation.y = roadRot;

              this.scene.add(model);
              this.items.set(key, model);
              this.compoundWallPositions.push({ x: cwx, z: cwz });

              const coords = GeoCoords.toLatLng(cwx, cwz, originLat, originLng);
              this.placedItems.push({
                type: 'compound_wall',
                name: 'കേരള കോമ്പൗണ്ട് വാൾ (Boundary Wall with Terracotta Coping)',
                lat: coords.lat,
                lng: coords.lng,
                x: cwx,
                z: cwz,
                roadName: road.roadClass,
              });
              itemsPlaced++;
            }
          }
        }

        // =============================================================
        // 10. Gate (ഇരുമ്പ് ഗേറ്റ് & ഗേറ്റ് പില്ലറുകൾ)
        // =============================================================
        const gateDist = road.buffer + 3.0;
        const gtx = midX + snx * gateDist;
        const gtz = midZ + snz * gateDist;
        const tooCloseGate = this.gatePositions.some(
          (pos) => Math.hypot(pos.x - gtx, pos.z - gtz) < 130
        );

        if (!tooCloseGate) {
          if (
            obstacleMap.isStationFootprintClear(midX, midZ, snx, snz, tx, tz, gateDist, 3.2, 1.2, road.p1, road.p2) &&
            !obstacleMap.isRoadCollision(gtx, gtz, 3.2, 1.2, roadRot, road.p1, road.p2) &&
            !obstacleMap.isBuildingCollision(gtx, gtz, 3.5, 1.5, roadRot) &&
            !obstacleMap.isPointInWater(gtx, gtz)
          ) {
            const key = `gate_${Math.round(gtx / 5)}_${Math.round(gtz / 5)}`;
            if (!this.items.has(key)) {
              obstacleMap.registerCustomObstacle(gtx - 3.2, gtx + 3.2, gtz - 1.2, gtz + 1.2);

              const model = KeralaRoadsideGenerator.createGateModel();
              model.position.set(gtx, 0, gtz);
              model.rotation.y = roadRot;

              this.scene.add(model);
              this.items.set(key, model);
              this.gatePositions.push({ x: gtx, z: gtz });

              const coords = GeoCoords.toLatLng(gtx, gtz, originLat, originLng);
              this.placedItems.push({
                type: 'gate',
                name: 'ഇരുമ്പ് പ്രവേശന ഗേറ്റ് (Ornamental Iron Gate & Pillars)',
                lat: coords.lat,
                lng: coords.lng,
                x: gtx,
                z: gtz,
                roadName: road.roadClass,
              });
              itemsPlaced++;
            }
          }
        }

        // =============================================================
        // 11. Drain (റോഡരികിലെ ഓട)
        // =============================================================
        const drainDist = road.buffer + 0.7;
        const drx = midX + snx * drainDist;
        const drz = midZ + snz * drainDist;
        const tooCloseDrain = this.drainPositions.some(
          (pos) => Math.hypot(pos.x - drx, pos.z - drz) < 55
        );

        if (!tooCloseDrain) {
          if (
            obstacleMap.isStationFootprintClear(midX, midZ, snx, snz, tx, tz, drainDist, 6.0, 1.0, road.p1, road.p2) &&
            !obstacleMap.isRoadCollision(drx, drz, 6.0, 1.0, roadRot, road.p1, road.p2) &&
            !obstacleMap.isBuildingCollision(drx, drz, 6.2, 1.2, roadRot) &&
            !obstacleMap.isPointInWater(drx, drz)
          ) {
            const key = `drain_${Math.round(drx / 5)}_${Math.round(drz / 5)}`;
            if (!this.items.has(key)) {
              obstacleMap.registerCustomObstacle(drx - 6.0, drx + 6.0, drz - 1.0, drz + 1.0);

              const model = KeralaRoadsideGenerator.createDrainModel();
              model.position.set(drx, 0, drz);
              model.rotation.y = roadRot;

              this.scene.add(model);
              this.items.set(key, model);
              this.drainPositions.push({ x: drx, z: drz });

              const coords = GeoCoords.toLatLng(drx, drz, originLat, originLng);
              this.placedItems.push({
                type: 'drain',
                name: 'റോഡരികിലെ ഓട (Roadside Storm Drain with Concrete Slabs)',
                lat: coords.lat,
                lng: coords.lng,
                x: drx,
                z: drz,
                roadName: road.roadClass,
              });
              itemsPlaced++;
            }
          }
        }

        // =============================================================
        // 12. Culvert (റോഡരികിലെ കലുങ്ക്)
        // =============================================================
        const culvertDist = road.buffer + 0.9;
        const clx = midX + snx * culvertDist;
        const clz = midZ + snz * culvertDist;
        const tooCloseCulvert = this.culvertPositions.some(
          (pos) => Math.hypot(pos.x - clx, pos.z - clz) < 140
        );

        if (!tooCloseCulvert) {
          const distToWater = obstacleMap.getDistanceToWater(clx, clz, 25);
          // Culverts naturally sit where roads cross ditches or water channels
          if (distToWater <= 18) {
            if (
              obstacleMap.isStationFootprintClear(midX, midZ, snx, snz, tx, tz, culvertDist, 3.5, 2.2, road.p1, road.p2) &&
              !obstacleMap.isRoadCollision(clx, clz, 3.5, 2.2, roadRot, road.p1, road.p2) &&
              !obstacleMap.isBuildingCollision(clx, clz, 3.8, 2.5, roadRot)
            ) {
              const key = `culvert_${Math.round(clx / 5)}_${Math.round(clz / 5)}`;
              if (!this.items.has(key)) {
                obstacleMap.registerCustomObstacle(clx - 3.5, clx + 3.5, clz - 2.2, clz + 2.2);

                const model = KeralaRoadsideGenerator.createCulvertModel();
                model.position.set(clx, 0, clz);
                model.rotation.y = roadRot;

                this.scene.add(model);
                this.items.set(key, model);
                this.culvertPositions.push({ x: clx, z: clz });

                const coords = GeoCoords.toLatLng(clx, clz, originLat, originLng);
                this.placedItems.push({
                  type: 'culvert',
                  name: 'റോഡരികിലെ കലുങ്ക് (Culvert with Hazard Stripes)',
                  lat: coords.lat,
                  lng: coords.lng,
                  x: clx,
                  z: clz,
                  roadName: road.roadClass,
                });
                itemsPlaced++;
              }
            }
          }
        }

        // =============================================================
        // 13. Bridge (പാലം)
        // =============================================================
        const bridgeDist = road.buffer + 0.3;
        const bgx = midX + snx * bridgeDist;
        const bgz = midZ + snz * bridgeDist;
        const tooCloseBridge = this.bridgePositions.some(
          (pos) => Math.hypot(pos.x - bgx, pos.z - bgz) < 220
        );

        if (!tooCloseBridge) {
          const distToWater = obstacleMap.getDistanceToWater(bgx, bgz, 15);
          if (distToWater <= 10) {
            if (
              !obstacleMap.isBuildingCollision(bgx, bgz, 9.0, 4.0, roadRot)
            ) {
              const key = `bridge_${Math.round(bgx / 6)}_${Math.round(bgz / 6)}`;
              if (!this.items.has(key)) {
                obstacleMap.registerCustomObstacle(bgx - 9.0, bgx + 9.0, bgz - 4.0, bgz + 4.0);

                const model = KeralaRoadsideGenerator.createBridgeModel();
                model.position.set(bgx, 0, bgz);
                model.rotation.y = roadRot;

                this.scene.add(model);
                this.items.set(key, model);
                this.bridgePositions.push({ x: bgx, z: bgz });

                const coords = GeoCoords.toLatLng(bgx, bgz, originLat, originLng);
                this.placedItems.push({
                  type: 'bridge',
                  name: 'പാലം (Road Bridge with Safety Barriers)',
                  lat: coords.lat,
                  lng: coords.lng,
                  x: bgx,
                  z: bgz,
                  roadName: road.roadClass,
                });
                itemsPlaced++;
              }
            }
          }
        }

        // =============================================================
        // 14. Billboard (റോഡരികിലെ വലിയ പരസ്യബോർഡ്)
        // =============================================================
        const billDist = road.buffer + 7.5;
        const blx = midX + snx * billDist;
        const blz = midZ + snz * billDist;
        const tooCloseBillboard = this.billboardPositions.some(
          (pos) => Math.hypot(pos.x - blx, pos.z - blz) < 240
        );

        if (!tooCloseBillboard && (road.roadClass === 'primary' || road.roadClass === 'secondary')) {
          if (
            obstacleMap.isStationFootprintClear(midX, midZ, snx, snz, tx, tz, billDist, 6.0, 3.0, road.p1, road.p2) &&
            !obstacleMap.isRoadCollision(blx, blz, 6.0, 3.0, roadRot, road.p1, road.p2) &&
            !obstacleMap.isBuildingCollision(blx, blz, 6.5, 3.5, roadRot) &&
            !obstacleMap.isPointInWater(blx, blz)
          ) {
            const key = `bb_${Math.round(blx / 6)}_${Math.round(blz / 6)}`;
            if (!this.items.has(key)) {
              obstacleMap.registerCustomObstacle(blx - 6.0, blx + 6.0, blz - 3.0, blz + 3.0);

              const model = KeralaRoadsideGenerator.createBillboardModel();
              model.position.set(blx, 0, blz);
              model.rotation.y = roadRot;

              this.scene.add(model);
              this.items.set(key, model);
              this.billboardPositions.push({ x: blx, z: blz });

              const coords = GeoCoords.toLatLng(blx, blz, originLat, originLng);
              this.placedItems.push({
                type: 'billboard',
                name: 'റോഡരികിലെ പരസ്യബോർഡ് (Commercial Highway Billboard)',
                lat: coords.lat,
                lng: coords.lng,
                x: blx,
                z: blz,
                roadName: road.roadClass,
              });
              itemsPlaced++;
            }
          }
        }

        // =============================================================
        // 15. AutoStand (കേരള ഓട്ടോ സ്റ്റാൻഡ്)
        // =============================================================
        const autoDist = road.buffer + 5.5;
        const ax = midX + snx * autoDist;
        const az = midZ + snz * autoDist;
        const tooCloseAuto = this.autoStandPositions.some(
          (pos) => Math.hypot(pos.x - ax, pos.z - az) < 280
        );

        if (!tooCloseAuto && len >= 22) {
          const rotY = Math.atan2(-snx, -snz);
          if (
            obstacleMap.isStationFootprintClear(midX, midZ, snx, snz, tx, tz, autoDist, 5.2, 3.0, road.p1, road.p2) &&
            !obstacleMap.isRoadCollision(ax, az, 5.2, 3.0, rotY, road.p1, road.p2) &&
            !obstacleMap.isBuildingCollision(ax, az, 5.6, 3.4, rotY) &&
            !obstacleMap.isPointInWater(ax, az)
          ) {
            const key = `autostand_${Math.round(ax / 5)}_${Math.round(az / 5)}`;
            if (!this.items.has(key)) {
              obstacleMap.registerCustomObstacle(ax - 5.2, ax + 5.2, az - 3.0, az + 3.0);

              const model = KeralaRoadsideGenerator.createAutoStandModel();
              model.position.set(ax, 0, az);
              model.rotation.y = rotY;

              this.scene.add(model);
              this.items.set(key, model);
              this.autoStandPositions.push({ x: ax, z: az });

              const coords = GeoCoords.toLatLng(ax, az, originLat, originLng);
              this.placedItems.push({
                type: 'auto_stand',
                name: 'കേരള ഓട്ടോ സ്റ്റാൻഡ് (Kerala Auto-Rickshaw Stand)',
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
    }
  }
}
