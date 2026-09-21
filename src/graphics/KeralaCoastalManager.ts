import * as THREE from 'three';
import { SpatialObstacleMap } from './SpatialObstacleMap';
import { KeralaCoastalGenerator } from './KeralaCoastalGenerator';
import { GeoCoords } from '../core/geoCoords';
import { ZoneProfileRegistry } from '../core/ZoneProfileRegistry';
import { isKeralaOceanCoastline } from '../core/ZoneClassifier';

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
    if (!obstacleMap.isReady) {
      return false;
    }

    // -------------------------------------------------------------
    // 0. STRICT ADAPTIVE LOCATION CHECK
    // Coastal elements (പുലിമുട്ട്, കടൽഭിത്തി, ഹാർബർ, തീരദേശ വീടുകൾ)
    // MUST ONLY be placed on the genuine Arabian Sea coastline (Kadal).
    // NEVER in inland cities/suburbs like Palarivattom!
    // -------------------------------------------------------------
    if (!isKeralaOceanCoastline(originLat, originLng)) {
      return false;
    }

    let itemsPlaced = 0;

    // -------------------------------------------------------------
    // 1. Breakwaters (പുലിമുട്ടുകൾ) - Extending from shoreline out into the sea
    // -------------------------------------------------------------
    if (obstacleMap.waterObstacles.length > 0) {
      for (const water of obstacleMap.waterObstacles) {
        // Only consider substantial ocean water bodies (at least 80m span)
        if (water.maxX - water.minX < 80 && water.maxZ - water.minZ < 80) continue;
        if (!water.rings || water.rings.length === 0) continue;
        const outerRing = water.rings[0];
        if (outerRing.length < 5) continue;

        for (let i = 0; i < outerRing.length - 1; i += 4) {
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
            const minBWDist = profile.spacing.breakwater || 450;
            const tooCloseBW = this.breakwaterPositions.some(
              (pos) => Math.hypot(pos.x - midX, pos.z - midZ) < minBWDist
            );
            if (tooCloseBW) continue;

            // RULE VERIFICATION:
            // Check that the breakwater path (42m) extends INTO ACTUAL WATER,
            // NOT over land, roads, or buildings!
            let pathValid = true;
            for (const step of [10, 20, 30, 40]) {
              const testX = midX + nx * step;
              const testZ = midZ + nz * step;
              if (!obstacleMap.isPointInWater(testX, testZ)) {
                pathValid = false;
                break;
              }
            }
            if (!pathValid) continue;

            // Check that breakwater does NOT collide with ANY road
            const bwCenterX = midX + nx * 21;
            const bwCenterZ = midZ + nz * 21;
            const bwAngle = Math.atan2(nx, nz);
            if (obstacleMap.isRoadCollision(bwCenterX, bwCenterZ, 22, 4.5, bwAngle)) {
              continue; // Road safety rule: zero road clipping!
            }
            if (obstacleMap.isBuildingCollision(bwCenterX, bwCenterZ, 22, 4.5, bwAngle)) {
              continue;
            }

            const key = `bw_${Math.round(midX / 10)}_${Math.round(midZ / 10)}`;
            if (this.items.has(key)) continue;

            // Register footprint so trees are cleared
            const endX = midX + nx * 45;
            const endZ = midZ + nz * 45;
            obstacleMap.registerCustomObstacle(
              Math.min(midX, endX) - 5,
              Math.max(midX, endX) + 5,
              Math.min(midZ, endZ) - 5,
              Math.max(midZ, endZ) + 5
            );

            const model = KeralaCoastalGenerator.createBreakwaterModel(42);
            this.setModelPosition(model, midX, midZ);
            model.rotation.y = bwAngle; // Point out into sea

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

    // -------------------------------------------------------------
    // 2. Coastal Roads: Seawalls (കടൽഭിത്തി), Fishing Houses, & Harbours
    // -------------------------------------------------------------
    const coastalRoads = obstacleMap.roads.filter((r) => r.length >= 18);

    for (const road of coastalRoads) {
      const dx = road.p2.x - road.p1.x;
      const dz = road.p2.z - road.p1.z;
      const len = Math.hypot(dx, dz);
      if (len < 16) continue;

      const tx = dx / len;
      const tz = dz / len;
      const roadAngle = Math.atan2(tx, tz);

      const midX = (road.p1.x + road.p2.x) / 2;
      const midZ = (road.p1.z + road.p2.z) / 2;

      for (const side of [1, -1]) {
        const nx = -tz * side;
        const nz = tx * side;

        const zone = obstacleMap.getZoneAt(midX, midZ, originLat, originLng);
        const profile = ZoneProfileRegistry.get(zone);

        // -------------------------------------------------------------
        // A. Seawall (കടൽഭിത്തി)
        // MUST ONLY be placed on the seaward verge between road and water.
        // STRICT RULE: NEVER CROSS A ROAD, NEVER OVERLAP ANOTHER ROAD LANE!
        // -------------------------------------------------------------
        if (profile.allowedAssets.includes('seawall')) {
          const seawallDist = road.buffer + 2.4;
          const swX = midX + nx * seawallDist;
          const swZ = midZ + nz * seawallDist;

          // 1. MUST HAVE ACTUAL SEA WATER on this side (within 10-15m)
          const isWaterBeside =
            obstacleMap.isPointInWater(swX + nx * 5, swZ + nz * 5) ||
            obstacleMap.getDistanceToWater(swX, swZ, 25) <= 10;

          if (isWaterBeside) {
            // 2. ZERO ROAD COLLISION: Must not touch any other road, cross road, or opposite carriageway!
            const roadCollision = obstacleMap.isRoadCollision(
              swX,
              swZ,
              12.5, // half-length of 24m seawall
              2.2,  // half-width
              roadAngle,
              road.p1,
              road.p2
            );

            // 3. ZERO BUILDING COLLISION
            const buildingCollision = obstacleMap.isBuildingCollision(
              swX,
              swZ,
              12.5,
              2.2,
              roadAngle
            );

            if (!roadCollision && !buildingCollision) {
              const minSWDist = 60;
              const tooCloseSW = this.seawallPositions.some(
                (pos) => Math.hypot(pos.x - swX, pos.z - swZ) < minSWDist
              );

              if (!tooCloseSW) {
                const key = `sw_${Math.round(swX / 8)}_${Math.round(swZ / 8)}`;
                if (!this.items.has(key)) {
                  obstacleMap.registerCustomObstacle(swX - 13, swX + 13, swZ - 3, swZ + 3);

                  const model = KeralaCoastalGenerator.createSeawallModel(24);
                  this.setModelPosition(model, swX, swZ);
                  model.rotation.y = roadAngle; // Perfectly parallel to road edge

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
        }

        // -------------------------------------------------------------
        // B. Small Fishing Houses (തീരദേശ വീടുകൾ) & Net Drying Racks
        // -------------------------------------------------------------
        if (profile.allowedAssets.includes('fishing_house')) {
          const houseDist = road.buffer + 11.0;
          const hx = midX + nx * houseDist;
          const hz = midZ + nz * houseDist;

          const minHouseDist = profile.spacing.fishingHouse || 150;
          const tooCloseHouse = this.housePositions.some(
            (pos) => Math.hypot(pos.x - hx, pos.z - hz) < minHouseDist
          );

          if (!tooCloseHouse) {
            // Must be entirely on LAND (not in sea!) and 100% clear of all roads and buildings
            if (!obstacleMap.isPointInWater(hx, hz)) {
              if (
                obstacleMap.isStationFootprintClear(
                  midX,
                  midZ,
                  nx,
                  nz,
                  tx,
                  tz,
                  houseDist,
                  6.0,
                  5.5,
                  road.p1,
                  road.p2
                )
              ) {
                const key = `fhouse_${Math.round(hx / 8)}_${Math.round(hz / 8)}`;
                if (!this.items.has(key)) {
                  obstacleMap.registerCustomObstacle(hx - 6, hx + 6, hz - 5.5, hz + 5.5);

                  const model = KeralaCoastalGenerator.createFishingHouseModel();
                  this.setModelPosition(model, hx, hz);
                  model.rotation.y = Math.atan2(-nx, -nz); // Face road

                  this.scene.add(model);
                  this.items.set(key, model);
                  this.housePositions.push({ x: hx, z: hz });

                  // Net drying rack placed in clear space
                  const rx = hx + tx * 7.5;
                  const rz = hz + tz * 7.5;
                  if (!obstacleMap.isPointInWater(rx, rz) && obstacleMap.isFootprintClear(rx, rz, 4, 2.5)) {
                    obstacleMap.registerCustomObstacle(rx - 4, rx + 4, rz - 2.5, rz + 2.5);
                    const rack = KeralaCoastalGenerator.createNetDryingRackModel();
                    this.setModelPosition(rack, rx, rz);
                    rack.rotation.y = roadAngle;
                    this.scene.add(rack);
                    this.items.set(`${key}_rack`, rack);
                  }

                  // Beached canoes nearby
                  const bx = hx + nx * 8.5;
                  const bz = hz + nz * 8.5;
                  if (!obstacleMap.isPointInWater(bx, bz) && obstacleMap.isFootprintClear(bx, bz, 4.5, 3.5)) {
                    obstacleMap.registerCustomObstacle(bx - 4.5, bx + 4.5, bz - 3.5, bz + 3.5);
                    const boats = KeralaCoastalGenerator.createBeachBoatsCluster();
                    this.setModelPosition(boats, bx, bz);
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
        }

        // -------------------------------------------------------------
        // C. Fishing Harbour Complex & Fish Auction Shed (ലേലപ്പുര)
        // -------------------------------------------------------------
        if (profile.allowedAssets.includes('harbour_complex')) {
          const harbourDist = road.buffer + 16.0;
          const hbx = midX + nx * harbourDist;
          const hbz = midZ + nz * harbourDist;

          const minHarbourDist = profile.spacing.harbour || 700;
          const tooCloseHarbour = this.harbourPositions.some(
            (pos) => Math.hypot(pos.x - hbx, pos.z - hbz) < minHarbourDist
          );

          if (!tooCloseHarbour) {
            // Must be adjacent to water (< 35m) but footprint itself on solid land
            const distToWater = obstacleMap.getDistanceToWater(hbx, hbz, 50);
            if (distToWater <= 35 && !obstacleMap.isPointInWater(hbx, hbz)) {
              if (
                obstacleMap.isStationFootprintClear(
                  midX,
                  midZ,
                  nx,
                  nz,
                  tx,
                  tz,
                  harbourDist,
                  14.0,
                  10.0,
                  road.p1,
                  road.p2
                )
              ) {
                const key = `harbour_${Math.round(hbx / 12)}_${Math.round(hbz / 12)}`;
                if (!this.items.has(key)) {
                  obstacleMap.registerCustomObstacle(hbx - 14, hbx + 14, hbz - 10, hbz + 10);

                  const model = KeralaCoastalGenerator.createHarbourComplexModel();
                  this.setModelPosition(model, hbx, hbz);
                  model.rotation.y = roadAngle;

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
    }

    if (itemsPlaced > 0) {
      console.log(`[KeralaCoastal] Placed ${itemsPlaced} verified coastal elements along ocean shoreline.`);
    }

    return itemsPlaced > 0;
  }
}
