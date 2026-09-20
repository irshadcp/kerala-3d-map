import * as THREE from 'three';
import { SpatialObstacleMap } from './SpatialObstacleMap';
import { KeralaUrbanGenerator } from './KeralaUrbanGenerator';
import { GeoCoords } from '../core/geoCoords';
import { ZoneProfileRegistry } from '../core/ZoneProfileRegistry';

export interface PlacedUrbanItemInfo {
  type:
    | 'traffic_signal'
    | 'billboard'
    | 'street_light'
    | 'roadside_shops'
    | 'parking_area'
    | 'hospital'
    | 'commercial_complex'
    | 'apartment_tower'
    | 'hotel';
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
  private streetLightPositions: Array<{ x: number; z: number }> = [];
  private shopPositions: Array<{ x: number; z: number }> = [];
  private parkingPositions: Array<{ x: number; z: number }> = [];
  private landmarkTowerPositions: Array<{ x: number; z: number }> = [];

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
    this.streetLightPositions = [];
    this.shopPositions = [];
    this.parkingPositions = [];
    this.landmarkTowerPositions = [];
    this.placedItems = [];
  }

  public update(obstacleMap: SpatialObstacleMap, originLat: number, originLng: number): boolean {
    if (!obstacleMap.isReady || obstacleMap.roads.length === 0) {
      return false;
    }

    let itemsPlaced = 0;

    // -------------------------------------------------------------
    // 1. Traffic Signals: Major Intersections & Larger Junctions
    // -------------------------------------------------------------
    const majorRoads = obstacleMap.roads.filter(
      (r) =>
        (r.roadClass === 'primary' ||
          r.roadClass === 'secondary' ||
          r.roadClass === 'motorway' ||
          r.roadClass === 'trunk') &&
        r.length >= 14
    );

    for (const road of majorRoads) {
      const dx = road.p2.x - road.p1.x;
      const dz = road.p2.z - road.p1.z;
      const len = Math.hypot(dx, dz);
      if (len < 10) continue;

      const tx = dx / len;
      const tz = dz / len;

      for (const endpoint of [road.p1, road.p2]) {
        // Must be near an intersection with another road
        const isIntersection = obstacleMap.roads.some((other) => {
          if (other === road) return false;
          const d1 = Math.hypot(other.p1.x - endpoint.x, other.p1.z - endpoint.z);
          const d2 = Math.hypot(other.p2.x - endpoint.x, other.p2.z - endpoint.z);
          return d1 < 26 || d2 < 26;
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
            const nx = -tz;
            const nz = tx;
            const sx = endpoint.x + nx * (road.buffer + 1.8);
            const sz = endpoint.z + nz * (road.buffer + 1.8);

            // Zero road & building collision check
            if (
              !obstacleMap.isRoadCollision(sx, sz, 1.5, 1.5, Math.atan2(tx, tz), road.p1, road.p2) &&
              !obstacleMap.isBuildingCollision(sx, sz, 2.0, 2.0, Math.atan2(tx, tz))
            ) {
              const key = `signal_${Math.round(sx / 6)}_${Math.round(sz / 6)}`;
              if (!this.items.has(key)) {
                obstacleMap.registerCustomObstacle(sx - 3.2, sx + 3.2, sz - 3.2, sz + 3.2);

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
      }
    }

    // -------------------------------------------------------------
    // 2. Roadside Elements along Roads: Shops, Parking, Lights, Billboards, Towers
    // -------------------------------------------------------------
    const allRoads = obstacleMap.roads.filter((r) => r.length >= 16);

    for (const road of allRoads) {
      const dx = road.p2.x - road.p1.x;
      const dz = road.p2.z - road.p1.z;
      const len = Math.hypot(dx, dz);
      if (len < 14) continue;

      const tx = dx / len;
      const tz = dz / len;
      const roadAngle = Math.atan2(tx, tz);

      const midX = (road.p1.x + road.p2.x) / 2;
      const midZ = (road.p1.z + road.p2.z) / 2;

      for (const side of [1, -1]) {
        const nx = -tz * side;
        const nz = tx * side;
        const facingRoadAngle = Math.atan2(-nx, -nz);

        const zone = obstacleMap.getZoneAt(midX, midZ, originLat, originLng);
        const profile = ZoneProfileRegistry.get(zone);

        // ---------------------------------------------------------
        // A. Modern LED Street Lights (മോഡേൺ എൽഇഡി സ്ട്രീറ്റ് ലൈറ്റുകൾ)
        // Placed along curbs of major roads every ~50m
        // ---------------------------------------------------------
        if (profile.allowedAssets.includes('street_light')) {
          const isMajor = road.buffer >= 10 || road.roadClass === 'primary' || road.roadClass === 'secondary';
          if (isMajor) {
            const lightDist = road.buffer + 0.9;
            const lx = midX + nx * lightDist;
            const lz = midZ + nz * lightDist;

            const minLightDist = profile.spacing.streetLight || 50;
            const tooCloseLight = this.streetLightPositions.some(
              (pos) => Math.hypot(pos.x - lx, pos.z - lz) < minLightDist
            );

            if (!tooCloseLight) {
              if (
                !obstacleMap.isRoadCollision(lx, lz, 1.2, 1.2, facingRoadAngle, road.p1, road.p2) &&
                !obstacleMap.isBuildingCollision(lx, lz, 1.2, 1.2, facingRoadAngle)
              ) {
                const key = `light_${Math.round(lx / 5)}_${Math.round(lz / 5)}`;
                if (!this.items.has(key)) {
                  obstacleMap.registerCustomObstacle(lx - 1.2, lx + 1.2, lz - 1.2, lz + 1.2);

                  const model = KeralaUrbanGenerator.createStreetLightModel();
                  model.position.set(lx, 0, lz);
                  model.rotation.y = facingRoadAngle;

                  this.scene.add(model);
                  this.items.set(key, model);
                  this.streetLightPositions.push({ x: lx, z: lz });
                  itemsPlaced++;
                }
              }
            }
          }
        }

        // ---------------------------------------------------------
        // B. Dense Roadside Commercial Shops (റോഡരികിലെ കടകൾ)
        // Placed along roadside verges in urban and suburban areas
        // ---------------------------------------------------------
        if (profile.allowedAssets.includes('roadside_shops')) {
          const shopDist = road.buffer + 7.5;
          const sx = midX + nx * shopDist;
          const sz = midZ + nz * shopDist;

          const minShopDist = profile.spacing.roadsideShops || 160;
          const tooCloseShop = this.shopPositions.some(
            (pos) => Math.hypot(pos.x - sx, pos.z - sz) < minShopDist
          );

          if (!tooCloseShop) {
            if (
              obstacleMap.isStationFootprintClear(
                midX,
                midZ,
                nx,
                nz,
                tx,
                tz,
                shopDist,
                8.5,
                5.5,
                road.p1,
                road.p2
              ) &&
              !obstacleMap.isRoadCollision(sx, sz, 9.0, 5.0, facingRoadAngle, road.p1, road.p2) &&
              !obstacleMap.isBuildingCollision(sx, sz, 9.0, 5.0, facingRoadAngle)
            ) {
              const key = `shops_${Math.round(sx / 8)}_${Math.round(sz / 8)}`;
              if (!this.items.has(key)) {
                obstacleMap.registerCustomObstacle(sx - 9.0, sx + 9.0, sz - 5.5, sz + 5.5);

                const model = KeralaUrbanGenerator.createDenseRoadsideShopsModel();
                model.position.set(sx, 0, sz);
                model.rotation.y = facingRoadAngle;

                this.scene.add(model);
                this.items.set(key, model);
                this.shopPositions.push({ x: sx, z: sz });

                const coords = GeoCoords.toLatLng(sx, sz, originLat, originLng);
                this.placedItems.push({
                  type: 'roadside_shops',
                  name: 'റോഡരികിലെ കടകൾ (Roadside Commercial Shops)',
                  lat: coords.lat,
                  lng: coords.lng,
                  x: sx,
                  z: sz,
                  roadName: road.roadClass,
                });
                itemsPlaced++;
              }
            }
          }
        }

        // ---------------------------------------------------------
        // C. Parking Areas with Parked Cars (പാർക്കിംഗ് ഏരിയകൾ)
        // Placed in commercial verges outside major roads
        // ---------------------------------------------------------
        if (profile.allowedAssets.includes('parking_area')) {
          const parkDist = road.buffer + 9.5;
          const px = midX + nx * parkDist;
          const pz = midZ + nz * parkDist;

          const minParkDist = profile.spacing.parkingArea || 320;
          const tooClosePark = this.parkingPositions.some(
            (pos) => Math.hypot(pos.x - px, pos.z - pz) < minParkDist
          );

          if (!tooClosePark) {
            if (
              obstacleMap.isStationFootprintClear(
                midX,
                midZ,
                nx,
                nz,
                tx,
                tz,
                parkDist,
                9.5,
                7.5,
                road.p1,
                road.p2
              ) &&
              !obstacleMap.isRoadCollision(px, pz, 10.0, 7.0, facingRoadAngle, road.p1, road.p2) &&
              !obstacleMap.isBuildingCollision(px, pz, 10.0, 7.0, facingRoadAngle)
            ) {
              const key = `park_${Math.round(px / 9)}_${Math.round(pz / 9)}`;
              if (!this.items.has(key)) {
                obstacleMap.registerCustomObstacle(px - 10.0, px + 10.0, pz - 7.5, pz + 7.5);

                const model = KeralaUrbanGenerator.createParkingAreaModel();
                model.position.set(px, 0, pz);
                model.rotation.y = facingRoadAngle;

                this.scene.add(model);
                this.items.set(key, model);
                this.parkingPositions.push({ x: px, z: pz });

                const coords = GeoCoords.toLatLng(px, pz, originLat, originLng);
                this.placedItems.push({
                  type: 'parking_area',
                  name: 'പാർക്കിംഗ് ഏരിയ (Vehicle Parking Area)',
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

        // ---------------------------------------------------------
        // D. Highway Advertising Billboards (ഹോർഡിംഗുകൾ)
        // ---------------------------------------------------------
        if (profile.allowedAssets.includes('billboard')) {
          const bbDist = road.buffer + 8.5;
          const bx = midX + nx * bbDist;
          const bz = midZ + nz * bbDist;

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
                6.5,
                3.0,
                road.p1,
                road.p2
              ) &&
              !obstacleMap.isRoadCollision(bx, bz, 6.5, 3.0, roadAngle, road.p1, road.p2) &&
              !obstacleMap.isBuildingCollision(bx, bz, 6.5, 3.0, roadAngle)
            ) {
              const key = `bb_${Math.round(bx / 8)}_${Math.round(bz / 8)}`;
              if (!this.items.has(key)) {
                obstacleMap.registerCustomObstacle(bx - 6.5, bx + 6.5, bz - 3.2, bz + 3.2);

                const model = KeralaUrbanGenerator.createBillboardModel();
                model.position.set(bx, 0, bz);
                model.rotation.y = roadAngle;

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
              }
            }
          }
        }

        // ---------------------------------------------------------
        // E. Distinctive Urban Complexes (Hospital, Mall, Apartment, Hotel)
        // Placed in large open urban parcels outside road buffer
        // ---------------------------------------------------------
        const towerDist = road.buffer + 18.0;
        const txPos = midX + nx * towerDist;
        const tzPos = midZ + nz * towerDist;

        const tooCloseTower = this.landmarkTowerPositions.some(
          (pos) => Math.hypot(pos.x - txPos, pos.z - tzPos) < 360
        );

        if (!tooCloseTower) {
          // Check footprint clearance for a large urban complex (22x18m)
          if (
            obstacleMap.isStationFootprintClear(
              midX,
              midZ,
              nx,
              nz,
              tx,
              tz,
              towerDist,
              14.0,
              11.0,
              road.p1,
              road.p2
            ) &&
            !obstacleMap.isRoadCollision(txPos, tzPos, 14.0, 11.0, facingRoadAngle, road.p1, road.p2) &&
            !obstacleMap.isBuildingCollision(txPos, tzPos, 14.0, 11.0, facingRoadAngle)
          ) {
            // Pick candidate based on allowed profile assets
            let towerType: 'hospital' | 'commercial_complex' | 'apartment_tower' | 'hotel' | null = null;
            let towerName = '';

            const candidates: Array<{ type: 'hospital' | 'commercial_complex' | 'apartment_tower' | 'hotel'; name: string }> = [];
            if (profile.allowedAssets.includes('hospital')) {
              candidates.push({ type: 'hospital', name: 'ഹോസ്പിറ്റൽ (Multi-Speciality Hospital)' });
            }
            if (profile.allowedAssets.includes('commercial_complex')) {
              candidates.push({ type: 'commercial_complex', name: 'ഷോപ്പിംഗ് കോംപ്ലക്സ് (Shopping Centre & Mall)' });
            }
            if (profile.allowedAssets.includes('apartment_tower')) {
              candidates.push({ type: 'apartment_tower', name: 'അപ്പാർട്ട്മെന്റ് ടവർ (Residential Apartment Tower)' });
            }
            if (profile.allowedAssets.includes('hotel')) {
              candidates.push({ type: 'hotel', name: 'ബിസിനസ്സ് ഹോട്ടൽ (Business & Luxury Hotel)' });
            }

            if (candidates.length > 0) {
              const pickIdx = Math.floor(Math.abs(Math.sin(txPos * 13 + tzPos * 7)) * candidates.length);
              const picked = candidates[pickIdx % candidates.length];
              towerType = picked.type;
              towerName = picked.name;

              let model: THREE.Group;
              if (towerType === 'hospital') {
                model = KeralaUrbanGenerator.createHospitalModel();
              } else if (towerType === 'commercial_complex') {
                model = KeralaUrbanGenerator.createCommercialComplexModel();
              } else if (towerType === 'apartment_tower') {
                model = KeralaUrbanGenerator.createApartmentTowerModel();
              } else {
                model = KeralaUrbanGenerator.createHotelModel();
              }

              const key = `utower_${Math.round(txPos / 10)}_${Math.round(tzPos / 10)}`;
              if (!this.items.has(key)) {
                obstacleMap.registerCustomObstacle(txPos - 15, txPos + 15, tzPos - 12, tzPos + 12);

                model.position.set(txPos, 0, tzPos);
                model.rotation.y = facingRoadAngle;

                this.scene.add(model);
                this.items.set(key, model);
                this.landmarkTowerPositions.push({ x: txPos, z: tzPos });

                const coords = GeoCoords.toLatLng(txPos, tzPos, originLat, originLng);
                this.placedItems.push({
                  type: towerType,
                  name: towerName,
                  lat: coords.lat,
                  lng: coords.lng,
                  x: txPos,
                  z: tzPos,
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
      console.log(`[KeralaUrban] Placed ${itemsPlaced} urban elements (shops, parking, towers, signals, hoardings, lights).`);
    }

    return itemsPlaced > 0;
  }
}
