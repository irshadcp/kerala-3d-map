import * as THREE from 'three';
import { SpatialObstacleMap } from './SpatialObstacleMap';
import { KeralaCoastalGenerator } from './KeralaCoastalGenerator';
import { GeoCoords } from '../core/geoCoords';
import { ZoneProfileRegistry } from '../core/ZoneProfileRegistry';

export interface PlacedCoastalItemInfo {
  type: 'seawall' | 'breakwater' | 'fishing_house' | 'net_drying_rack' | 'harbour_complex' | 'beach_boats';
  name: string;
  lat: number;
  lng: number;
  x: number;
  z: number;
}

export class KeralaCoastalManager {
  private scene: THREE.Scene;
  private items = new Map<string, THREE.Group>();
  private breakwaterPositions: Array<{ x: number; z: number }> = [];
  private seawallPositions: Array<{ x: number; z: number }> = [];
  private housePositions: Array<{ x: number; z: number }> = [];
  private harbourPositions: Array<{ x: number; z: number }> = [];

  public placedItems: PlacedCoastalItemInfo[] = [];

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
    this.breakwaterPositions = [];
    this.seawallPositions = [];
    this.housePositions = [];
    this.harbourPositions = [];
    this.placedItems = [];
  }

  public update(obstacleMap: SpatialObstacleMap, originLat: number, originLng: number): boolean {
    if (!obstacleMap.isReady) {
      return false;
    }

    let itemsPlaced = 0;

    // -------------------------------------------------------------
    // 1. Breakwaters (പുലിമുട്ടുകൾ) - Extending from coastal land into the sea
    // -------------------------------------------------------------
    if (obstacleMap.waterObstacles.length > 0) {
      for (const water of obstacleMap.waterObstacles) {
        if (!water.rings || water.rings.length === 0) continue;
        const outerRing = water.rings[0];
        if (outerRing.length < 4) continue;

        for (let i = 0; i < outerRing.length - 1; i += 3) {
          const p1 = outerRing[i];
          const p2 = outerRing[i + 1];

          const dx = p2.x - p1.x;
          const dz = p2.z - p1.z;
          const len = Math.hypot(dx, dz);
          if (len < 16) continue;

          const tx = dx / len;
          const tz = dz / len;

          // Normal vector pointing outwards into sea
          const nx = -tz;
          const nz = tx;

          const midX = (p1.x + p2.x) / 2;
          const midZ = (p1.z + p2.z) / 2;

          const zone = obstacleMap.getZoneAt(midX, midZ, originLat, originLng);
          const profile = ZoneProfileRegistry.get(zone);

          if (profile.allowedAssets.includes('breakwater')) {
            const minBWDist = profile.spacing.breakwater || 420;
            const tooCloseBW = this.breakwaterPositions.some(
              (pos) => Math.hypot(pos.x - midX, pos.z - midZ) < minBWDist
            );

            if (!tooCloseBW) {
              const key = `bw_${Math.round(midX / 10)}_${Math.round(midZ / 10)}`;
              if (!this.items.has(key)) {
                // Register footprint (45m long x 8m wide)
                const endX = midX + nx * 45;
                const endZ = midZ + nz * 45;
                const minX = Math.min(midX, endX) - 6;
                const maxX = Math.max(midX, endX) + 6;
                const minZ = Math.min(midZ, endZ) - 6;
                const maxZ = Math.max(midZ, endZ) + 6;
                obstacleMap.registerCustomObstacle(minX, maxX, minZ, maxZ);

                const model = KeralaCoastalGenerator.createBreakwaterModel(42);
                model.position.set(midX, 0, midZ);
                model.rotation.y = Math.atan2(nx, nz); // Point into sea

                this.scene.add(model);
                this.items.set(key, model);
                this.breakwaterPositions.push({ x: midX, z: midZ });

                const coords = GeoCoords.toLatLng(midX, midZ, originLat, originLng);
                this.placedItems.push({
                  type: 'breakwater',
                  name: 'കേരള പുലിമുട്ട് (Coastal Breakwater)',
                  lat: coords.lat,
                  lng: coords.lng,
                  x: midX,
                  z: midZ,
                });
                itemsPlaced++;
              }
            }
          }
        }
      }
    }

    // -------------------------------------------------------------
    // 2. Coastal Roads, Seawalls (കടൽഭിത്തി), Fishing Villages, & Harbours
    // -------------------------------------------------------------
    const coastalRoads = obstacleMap.roads.filter((r) => r.length >= 18);

    for (const road of coastalRoads) {
      const dx = road.p2.x - road.p1.x;
      const dz = road.p2.z - road.p1.z;
      const len = Math.hypot(dx, dz);
      if (len < 14) continue;

      const tx = dx / len;
      const tz = dz / len;

      const midX = (road.p1.x + road.p2.x) / 2;
      const midZ = (road.p1.z + road.p2.z) / 2;

      for (const side of [1, -1]) {
        const nx = -tz * side;
        const nz = tx * side;

        const zone = obstacleMap.getZoneAt(midX, midZ, originLat, originLng);
        const profile = ZoneProfileRegistry.get(zone);

        // A. Seawall (കടൽഭിത്തി) - Lined along the seaward side of coastal road
        if (profile.allowedAssets.includes('seawall')) {
          const seawallDist = road.buffer + 2.5;
          const swX = midX + nx * seawallDist;
          const swZ = midZ + nz * seawallDist;

          // Check if there is water nearby on this side (within 40m)
          const isNearWater = obstacleMap.isBlocked(swX + nx * 15, swZ + nz * 15, 2.0);

          if (isNearWater) {
            const minSWDist = 70;
            const tooCloseSW = this.seawallPositions.some(
              (pos) => Math.hypot(pos.x - swX, pos.z - swZ) < minSWDist
            );

            if (!tooCloseSW) {
              const key = `sw_${Math.round(swX / 8)}_${Math.round(swZ / 8)}`;
              if (!this.items.has(key)) {
                obstacleMap.registerCustomObstacle(swX - 14, swX + 14, swZ - 3, swZ + 3);

                const model = KeralaCoastalGenerator.createSeawallModel(24);
                model.position.set(swX, 0, swZ);
                model.rotation.y = Math.atan2(tx, tz); // Aligned parallel to road

                this.scene.add(model);
                this.items.set(key, model);
                this.seawallPositions.push({ x: swX, z: swZ });

                const coords = GeoCoords.toLatLng(swX, swZ, originLat, originLng);
                this.placedItems.push({
                  type: 'seawall',
                  name: 'തീരദേശ കടൽഭിത്തി (Coastal Seawall)',
                  lat: coords.lat,
                  lng: coords.lng,
                  x: swX,
                  z: swZ,
                });
                itemsPlaced++;
              }
            }
          }
        }

        // B. Small Fishing Houses (തീരദേശ വീടുകൾ) & Net Drying Racks
        if (profile.allowedAssets.includes('fishing_house')) {
          const houseDist = road.buffer + 9.5;
          const hx = midX + nx * houseDist;
          const hz = midZ + nz * houseDist;

          const minHouseDist = profile.spacing.fishingHouse || 140;
          const tooCloseHouse = this.housePositions.some(
            (pos) => Math.hypot(pos.x - hx, pos.z - hz) < minHouseDist
          );

          if (!tooCloseHouse) {
            if (
              obstacleMap.isStationFootprintClear(
                midX,
                midZ,
                nx,
                nz,
                tx,
                tz,
                houseDist,
                4.5,
                3.8,
                road.p1,
                road.p2
              )
            ) {
              const key = `fhouse_${Math.round(hx / 6)}_${Math.round(hz / 6)}`;
              if (!this.items.has(key)) {
                obstacleMap.registerCustomObstacle(hx - 5, hx + 5, hz - 4.5, hz + 4.5);

                const model = KeralaCoastalGenerator.createFishingHouseModel();
                model.position.set(hx, 0, hz);
                model.rotation.y = Math.atan2(-nx, -nz); // Face road

                this.scene.add(model);
                this.items.set(key, model);
                this.housePositions.push({ x: hx, z: hz });

                // Adjacent net drying rack in the sandy yard
                const rx = hx + tx * 6.5;
                const rz = hz + tz * 6.5;
                if (obstacleMap.isFootprintClear(rx, rz, 3.5, 2)) {
                  obstacleMap.registerCustomObstacle(rx - 3.5, rx + 3.5, rz - 2, rz + 2);
                  const rack = KeralaCoastalGenerator.createNetDryingRackModel();
                  rack.position.set(rx, 0, rz);
                  rack.rotation.y = Math.atan2(tx, tz);
                  this.scene.add(rack);
                  this.items.set(`${key}_rack`, rack);
                }

                // Beached boats nearby on sand
                const bx = hx + nx * 7.5;
                const bz = hz + nz * 7.5;
                if (obstacleMap.isFootprintClear(bx, bz, 4, 3)) {
                  obstacleMap.registerCustomObstacle(bx - 4, bx + 4, bz - 3, bz + 3);
                  const boats = KeralaCoastalGenerator.createBeachBoatsCluster();
                  boats.position.set(bx, 0, bz);
                  this.scene.add(boats);
                  this.items.set(`${key}_boats`, boats);
                }

                const coords = GeoCoords.toLatLng(hx, hz, originLat, originLng);
                this.placedItems.push({
                  type: 'fishing_house',
                  name: 'തീരദേശ വീട് (Coastal Fishing House)',
                  lat: coords.lat,
                  lng: coords.lng,
                  x: hx,
                  z: hz,
                });
                itemsPlaced++;
              }
            }
          }
        }

        // C. Fishing Harbour Complex & Fish Auction Shed (ലേലപ്പുര)
        if (profile.allowedAssets.includes('harbour_complex')) {
          const harbourDist = road.buffer + 14.0;
          const hbx = midX + nx * harbourDist;
          const hbz = midZ + nz * harbourDist;

          const minHarbourDist = profile.spacing.harbour || 700;
          const tooCloseHarbour = this.harbourPositions.some(
            (pos) => Math.hypot(pos.x - hbx, pos.z - hbz) < minHarbourDist
          );

          if (!tooCloseHarbour) {
            if (
              obstacleMap.isStationFootprintClear(
                midX,
                midZ,
                nx,
                nz,
                tx,
                tz,
                harbourDist,
                11.0,
                7.0,
                road.p1,
                road.p2
              )
            ) {
              const key = `harbour_${Math.round(hbx / 10)}_${Math.round(hbz / 10)}`;
              if (!this.items.has(key)) {
                obstacleMap.registerCustomObstacle(hbx - 12, hbx + 12, hbz - 8, hbz + 8);

                const model = KeralaCoastalGenerator.createHarbourComplexModel();
                model.position.set(hbx, 0, hbz);
                model.rotation.y = Math.atan2(tx, tz);

                this.scene.add(model);
                this.items.set(key, model);
                this.harbourPositions.push({ x: hbx, z: hbz });

                const coords = GeoCoords.toLatLng(hbx, hbz, originLat, originLng);
                this.placedItems.push({
                  type: 'harbour_complex',
                  name: 'ഫിഷിംഗ് ഹാർബറും ലേലപ്പുരയും (Fishing Harbour & Auction Hall)',
                  lat: coords.lat,
                  lng: coords.lng,
                  x: hbx,
                  z: hbz,
                });
                itemsPlaced++;
              }
            }
          }
        }
      }
    }

    if (itemsPlaced > 0) {
      console.log(`[KeralaCoastal] Placed ${itemsPlaced} coastal elements (breakwaters, seawalls, fishing village, harbour).`);
    }

    return itemsPlaced > 0;
  }
}
