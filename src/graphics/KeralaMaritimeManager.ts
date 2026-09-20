import * as THREE from 'three';
import { SpatialObstacleMap } from './SpatialObstacleMap';
import { KeralaMaritimeGenerator } from './KeralaMaritimeGenerator';
import { GeoCoords } from '../core/geoCoords';
import { ZoneProfileRegistry } from '../core/ZoneProfileRegistry';

export interface PlacedMaritimeItemInfo {
  type: 'houseboat' | 'fishing_boat' | 'boat_jetty' | 'fish_market';
  name: string;
  lat: number;
  lng: number;
  x: number;
  z: number;
}

export class KeralaMaritimeManager {
  private scene: THREE.Scene;
  private items = new Map<string, THREE.Group>();
  private houseboatPositions: Array<{ x: number; z: number }> = [];
  private jettyPositions: Array<{ x: number; z: number }> = [];
  private boatPositions: Array<{ x: number; z: number }> = [];
  private marketPositions: Array<{ x: number; z: number }> = [];

  public placedItems: PlacedMaritimeItemInfo[] = [];

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
    this.houseboatPositions = [];
    this.jettyPositions = [];
    this.boatPositions = [];
    this.marketPositions = [];
    this.placedItems = [];
  }

  public update(obstacleMap: SpatialObstacleMap, originLat: number, originLng: number): boolean {
    if (!obstacleMap.isReady || obstacleMap.waterObstacles.length === 0) {
      return false;
    }

    let itemsPlaced = 0;

    for (const water of obstacleMap.waterObstacles) {
      if (!water.rings || water.rings.length === 0) continue;
      const outerRing = water.rings[0];
      if (outerRing.length < 3) continue;

      for (let i = 0; i < outerRing.length - 1; i += 2) {
        const p1 = outerRing[i];
        const p2 = outerRing[i + 1];

        const dx = p2.x - p1.x;
        const dz = p2.z - p1.z;
        const len = Math.hypot(dx, dz);
        if (len < 12) continue;

        const tx = dx / len;
        const tz = dz / len;

        // Normal perpendicular to waterbank edge
        const nx = -tz;
        const nz = tx;

        const midX = (p1.x + p2.x) / 2;
        const midZ = (p1.z + p2.z) / 2;

        const zone = obstacleMap.getZoneAt(midX, midZ, originLat, originLng);
        const profile = ZoneProfileRegistry.get(zone);

        // 1. Traditional Kerala Houseboat (കെട്ടുവള്ളം) in Backwater / Canal areas
        if (profile.allowedAssets.includes('houseboat')) {
          const minHBDist = profile.spacing.houseboat || 180;
          const tooCloseHB = this.houseboatPositions.some(
            (pos) => Math.hypot(pos.x - midX, pos.z - midZ) < minHBDist
          );

          if (!tooCloseHB) {
            // Place along water edge, parallel to bank
            const hbx = midX + nx * 3.5;
            const hbz = midZ + nz * 3.5;

            const key = `hb_${Math.round(hbx / 10)}_${Math.round(hbz / 10)}`;
            if (!this.items.has(key)) {
              obstacleMap.registerCustomObstacle(hbx - 8, hbx + 8, hbz - 8, hbz + 8);

              const model = KeralaMaritimeGenerator.createHouseboatModel();
              model.position.set(hbx, 0.05, hbz);
              model.rotation.y = Math.atan2(tx, tz); // Orient parallel to water edge

              this.scene.add(model);
              this.items.set(key, model);
              this.houseboatPositions.push({ x: hbx, z: hbz });

              const coords = GeoCoords.toLatLng(hbx, hbz, originLat, originLng);
              this.placedItems.push({
                type: 'houseboat',
                name: 'കേരള കെട്ടുവള്ളം (Kerala Houseboat)',
                lat: coords.lat,
                lng: coords.lng,
                x: hbx,
                z: hbz,
              });
              itemsPlaced++;
              continue;
            }
          }
        }

        // 2. Waterfront Boat Jetty (ബോട്ട് ജെട്ടി)
        if (profile.allowedAssets.includes('boat_jetty')) {
          const minJettyDist = profile.spacing.boatJetty || 350;
          const tooCloseJetty = this.jettyPositions.some(
            (pos) => Math.hypot(pos.x - midX, pos.z - midZ) < minJettyDist
          );

          if (!tooCloseJetty) {
            const jx = midX;
            const jz = midZ;

            const key = `jetty_${Math.round(jx / 10)}_${Math.round(jz / 10)}`;
            if (!this.items.has(key)) {
              obstacleMap.registerCustomObstacle(jx - 5, jx + 5, jz - 5, jz + 5);

              const model = KeralaMaritimeGenerator.createBoatJettyModel();
              model.position.set(jx, 0, jz);
              model.rotation.y = Math.atan2(nx, nz); // Extend perpendicular out into water

              this.scene.add(model);
              this.items.set(key, model);
              this.jettyPositions.push({ x: jx, z: jz });

              const coords = GeoCoords.toLatLng(jx, jz, originLat, originLng);
              this.placedItems.push({
                type: 'boat_jetty',
                name: 'കായൽ ബോട്ട് ജെട്ടി (Backwater Boat Jetty)',
                lat: coords.lat,
                lng: coords.lng,
                x: jx,
                z: jz,
              });
              itemsPlaced++;
              continue;
            }
          }
        }

        // 3. Country Fishing Boat (ചെറുവഞ്ചി) along shorelines
        if (profile.allowedAssets.includes('fishing_boat')) {
          const minBoatDist = 120;
          const tooCloseBoat = this.boatPositions.some(
            (pos) => Math.hypot(pos.x - midX, pos.z - midZ) < minBoatDist
          );

          if (!tooCloseBoat) {
            const bx = midX + nx * 1.5;
            const bz = midZ + nz * 1.5;

            const key = `boat_${Math.round(bx / 8)}_${Math.round(bz / 8)}`;
            if (!this.items.has(key)) {
              const model = KeralaMaritimeGenerator.createFishingBoatModel();
              model.position.set(bx, 0.05, bz);
              model.rotation.y = Math.atan2(tx, tz) + (Math.random() - 0.5) * 0.4;

              this.scene.add(model);
              this.items.set(key, model);
              this.boatPositions.push({ x: bx, z: bz });

              const coords = GeoCoords.toLatLng(bx, bz, originLat, originLng);
              this.placedItems.push({
                type: 'fishing_boat',
                name: 'പരമ്പരാഗത വള്ളം (Country Fishing Boat)',
                lat: coords.lat,
                lng: coords.lng,
                x: bx,
                z: bz,
              });
              itemsPlaced++;
              continue;
            }
          }
        }

        // 4. Coastal Fish Market (തീരദേശ മീൻ ചന്ത) on land near water
        if (profile.allowedAssets.includes('fish_market')) {
          const minMarketDist = 500;
          const tooCloseMarket = this.marketPositions.some(
            (pos) => Math.hypot(pos.x - midX, pos.z - midZ) < minMarketDist
          );

          if (!tooCloseMarket) {
            // Placed on landward side: -nx * 12
            const mx = midX - nx * 10;
            const mz = midZ - nz * 10;

            if (obstacleMap.isFootprintClear(mx, mz, 5, 4)) {
              const key = `market_${Math.round(mx / 10)}_${Math.round(mz / 10)}`;
              if (!this.items.has(key)) {
                obstacleMap.registerCustomObstacle(mx - 5, mx + 5, mz - 4, mz + 4);

                const model = KeralaMaritimeGenerator.createFishMarketModel();
                model.position.set(mx, 0, mz);
                model.rotation.y = Math.atan2(tx, tz);

                this.scene.add(model);
                this.items.set(key, model);
                this.marketPositions.push({ x: mx, z: mz });

                const coords = GeoCoords.toLatLng(mx, mz, originLat, originLng);
                this.placedItems.push({
                  type: 'fish_market',
                  name: 'തീരദേശ മീൻ ചന്ത (Coastal Fish Market)',
                  lat: coords.lat,
                  lng: coords.lng,
                  x: mx,
                  z: mz,
                });
                itemsPlaced++;
              }
            }
          }
        }
      }
    }

    if (itemsPlaced > 0) {
      console.log(`[KeralaMaritime] Placed ${itemsPlaced} authentic maritime & backwater elements.`);
    }

    return itemsPlaced > 0;
  }
}
