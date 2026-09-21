import * as THREE from 'three';
import { SpatialObstacleMap } from './SpatialObstacleMap';
import { KeralaMaritimeGenerator } from './KeralaMaritimeGenerator';
import { GeoCoords } from '../core/geoCoords';

export type MaritimeVehicleType =
  | 'speedboat'
  | 'patrol_boat'
  | 'container_ship'
  | 'submarine'
  | 'cruise_ship'
  | 'sailboat'
  | 'zodiac'
  | 'raft'
  | 'rowboat'
  | 'houseboat'
  | 'fishing_boat'
  | 'boat_jetty'
  | 'fish_market';

export interface PlacedMaritimeItemInfo {
  type: MaritimeVehicleType;
  name: string;
  lat: number;
  lng: number;
  x: number;
  z: number;
}

interface FloatingVessel {
  group: THREE.Group;
  baseY: number;
  phase: number;
  rollFactor: number;
  pitchFactor: number;
}

export class KeralaMaritimeManager {
  private scene: THREE.Scene;
  private items = new Map<string, THREE.Group>();
  private placedVessels: Array<{ x: number; z: number; r: number }> = [];
  private floatingVessels: FloatingVessel[] = [];
  private getElevation?: (localX: number, localZ: number) => number;

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
    this.placedVessels = [];
    this.floatingVessels = [];
    this.placedItems = [];
  }

  /**
   * Procedural floating wave animation
   * Subtle harmonic bobbing & rocking on the water surface
   */
  public updateFloatingAnimation(now: number) {
    if (this.floatingVessels.length === 0) return;
    const t = now * 0.001;

    for (let i = 0; i < this.floatingVessels.length; i++) {
      const v = this.floatingVessels[i];
      // Multi-frequency wave formula
      const waveY = Math.sin(t * 1.8 + v.phase) * 0.05 + Math.cos(t * 3.1 + v.phase * 1.3) * 0.02;
      const waveRoll = Math.sin(t * 1.4 + v.phase) * 0.035 * v.rollFactor;
      const wavePitch = Math.cos(t * 1.1 + v.phase * 0.9) * 0.02 * v.pitchFactor;

      v.group.position.y = v.baseY + waveY;
      v.group.rotation.z = waveRoll;
      v.group.rotation.x = wavePitch;
    }
  }

  /**
   * Verifies that a vessel's bounding footprint is STRICTLY on water.
   * Tests 5 points: Center, Bow, Stern, Port, Starboard.
   * Also ensures zero collision with roads, bridges, and buildings.
   */
  private isVesselFootprintStrictlyInWater(
    obstacleMap: SpatialObstacleMap,
    cx: number,
    cz: number,
    halfLength: number,
    halfWidth: number,
    angle: number
  ): boolean {
    const sinA = Math.sin(angle);
    const cosA = Math.cos(angle);

    // Margin inside water boundary
    const margin = 0.5;

    // 1. Center
    if (!obstacleMap.isPointInWater(cx, cz, margin)) return false;

    // 2. Bow (+Z in local)
    const bowX = cx + sinA * (halfLength * 0.85);
    const bowZ = cz + cosA * (halfLength * 0.85);
    if (!obstacleMap.isPointInWater(bowX, bowZ, margin)) return false;

    // 3. Stern (-Z in local)
    const sternX = cx - sinA * (halfLength * 0.85);
    const sternZ = cz - cosA * (halfLength * 0.85);
    if (!obstacleMap.isPointInWater(sternX, sternZ, margin)) return false;

    // 4. Port side (+X in local)
    const portX = cx + cosA * (halfWidth * 0.85);
    const portZ = cz - sinA * (halfWidth * 0.85);
    if (!obstacleMap.isPointInWater(portX, portZ, margin)) return false;

    // 5. Starboard side (-X in local)
    const starX = cx - cosA * (halfWidth * 0.85);
    const starZ = cz + sinA * (halfWidth * 0.85);
    if (!obstacleMap.isPointInWater(starX, starZ, margin)) return false;

    // Must not collide with roads, bridges, or buildings
    if (obstacleMap.isRoadCollision(cx, cz, halfLength * 1.1, halfWidth * 1.1, angle)) return false;
    if (obstacleMap.isBuildingCollision(cx, cz, halfLength * 1.1, halfWidth * 1.1, angle)) return false;

    return true;
  }

  public update(
    obstacleMap: SpatialObstacleMap,
    originLat: number,
    originLng: number,
    getElevation?: (localX: number, localZ: number) => number
  ): boolean {
    this.getElevation = getElevation;
    if (!obstacleMap.isReady || obstacleMap.waterObstacles.length === 0) {
      return false;
    }

    let itemsPlaced = 0;
    this.clear();

    for (const water of obstacleMap.waterObstacles) {
      if (!water.rings || water.rings.length === 0) continue;
      const outerRing = water.rings[0];
      if (outerRing.length < 3) continue;

      const waterWidth = water.maxX - water.minX;
      const waterDepth = water.maxZ - water.minZ;
      const isLargeWater = waterWidth > 60 && waterDepth > 60;
      const isMediumWater = waterWidth > 22 || waterDepth > 22;

      // 1. Placement along water corridors / shorelines
      for (let i = 0; i < outerRing.length - 1; i += 2) {
        const p1 = outerRing[i];
        const p2 = outerRing[i + 1];

        const dx = p2.x - p1.x;
        const dz = p2.z - p1.z;
        const segLen = Math.hypot(dx, dz);
        if (segLen < 12) continue;

        const tx = dx / segLen;
        const tz = dz / segLen;
        const edgeAngle = Math.atan2(tx, tz);

        // Inward normal pointing into water
        const nx = -tz;
        const nz = tx;

        const midX = (p1.x + p2.x) / 2;
        const midZ = (p1.z + p2.z) / 2;

        // Try placing craft at varied offsets into the water
        const testOffsets = [4.5, 9.0, 16.0, 25.0];

        for (const offset of testOffsets) {
          const cx = midX + nx * offset;
          const cz = midZ + nz * offset;

          // Check if too close to another placed vessel
          const tooClose = this.placedVessels.some(
            (v) => Math.hypot(v.x - cx, v.z - cz) < v.r + 14
          );
          if (tooClose) continue;

          // Pick candidate vessel based on water body size and offset
          type CandidateSpec = {
            type: MaritimeVehicleType;
            name: string;
            hL: number;
            hW: number;
            baseY: number;
            create: () => THREE.Group;
            spacingR: number;
            rollFactor: number;
            pitchFactor: number;
          };

          const candidates: CandidateSpec[] = [];

          // Large ships only in wide, deep open water bodies
          if (isLargeWater && offset >= 14) {
            candidates.push(
              {
                type: 'container_ship',
                name: 'കണ്ടെയ്നർ കാർഗോ കപ്പൽ (Container Cargo Ship)',
                hL: 18.0,
                hW: 4.5,
                baseY: 0.1,
                create: () => KeralaMaritimeGenerator.createContainerShipModel(),
                spacingR: 35,
                rollFactor: 0.3,
                pitchFactor: 0.2,
              },
              {
                type: 'cruise_ship',
                name: 'ലക്ഷ്വറി ക്രൂയിസ് കപ്പൽ (Luxury Cruise Ship)',
                hL: 21.0,
                hW: 5.0,
                baseY: 0.1,
                create: () => KeralaMaritimeGenerator.createCruiseShipModel(),
                spacingR: 38,
                rollFactor: 0.25,
                pitchFactor: 0.18,
              },
              {
                type: 'submarine',
                name: 'മിലിട്ടറി അന്തർവാഹിനി (Naval Submarine)',
                hL: 14.0,
                hW: 2.2,
                baseY: -0.15,
                create: () => KeralaMaritimeGenerator.createSubmarineModel(),
                spacingR: 28,
                rollFactor: 0.4,
                pitchFactor: 0.2,
              }
            );
          }

          // Medium vessels (Patrol boat, Speedboat, Sailboat, Houseboat)
          if (isMediumWater && offset >= 6) {
            candidates.push(
              {
                type: 'patrol_boat',
                name: 'കോസ്റ്റ് ഗാർഡ് പട്രോൾ ബോട്ട് (Coast Guard Patrol Boat)',
                hL: 7.0,
                hW: 2.2,
                baseY: 0.08,
                create: () => KeralaMaritimeGenerator.createPatrolBoatModel(),
                spacingR: 16,
                rollFactor: 0.8,
                pitchFactor: 0.6,
              },
              {
                type: 'speedboat',
                name: 'മോഡേൺ സ്പീഡ് ബോട്ട് (Modern Speedboat Yacht)',
                hL: 4.2,
                hW: 1.5,
                baseY: 0.08,
                create: () => KeralaMaritimeGenerator.createSpeedboatModel(),
                spacingR: 12,
                rollFactor: 1.1,
                pitchFactor: 0.8,
              },
              {
                type: 'sailboat',
                name: 'ഓറഞ്ച് സെയ്‌ൽബോട്ട് (Orange Sloop Sailboat)',
                hL: 5.0,
                hW: 1.8,
                baseY: 0.08,
                create: () => KeralaMaritimeGenerator.createSailboatModel(),
                spacingR: 14,
                rollFactor: 1.3,
                pitchFactor: 0.9,
              },
              {
                type: 'houseboat',
                name: 'കേരള കെട്ടുവള്ളം (Kerala Houseboat)',
                hL: 8.0,
                hW: 2.2,
                baseY: 0.06,
                create: () => KeralaMaritimeGenerator.createHouseboatModel(),
                spacingR: 18,
                rollFactor: 0.6,
                pitchFactor: 0.4,
              }
            );
          }

          // Small craft (Zodiac, Raft, Rowboat) - can fit in any canal or water edge
          candidates.push(
            {
              type: 'zodiac',
              name: 'ഇൻഫ്ലേറ്റബിൾ സോഡിയാക് ഡിങ്കി (Zodiac RIB Dinghy)',
              hL: 2.2,
              hW: 1.1,
              baseY: 0.05,
              create: () => KeralaMaritimeGenerator.createZodiacDinghyModel(),
              spacingR: 8,
              rollFactor: 1.4,
              pitchFactor: 1.1,
            },
            {
              type: 'raft',
              name: 'ലൈഫ് റാഫ്റ്റ് (Rescue Raft & Paddle)',
              hL: 1.8,
              hW: 1.0,
              baseY: 0.05,
              create: () => KeralaMaritimeGenerator.createOrangeRaftModel(),
              spacingR: 7,
              rollFactor: 1.5,
              pitchFactor: 1.2,
            },
            {
              type: 'rowboat',
              name: 'തടി വള്ളം / റോബോട്ട് (Wooden Rowboat with Oars)',
              hL: 2.4,
              hW: 1.2,
              baseY: 0.05,
              create: () => KeralaMaritimeGenerator.createWoodenRowboatModel(),
              spacingR: 8,
              rollFactor: 1.2,
              pitchFactor: 1.0,
            }
          );

          // Try each candidate in pseudo-random order
          const seed = Math.abs(Math.sin(cx * 12.3 + cz * 45.6));
          const startIdx = Math.floor(seed * candidates.length);

          let placedThisLocation = false;
          for (let c = 0; c < candidates.length; c++) {
            const cand = candidates[(startIdx + c) % candidates.length];

            // Heading parallel to water channel + slight natural variation
            const heading = edgeAngle + (seed - 0.5) * 0.35;

            // Strict in-water clearance test
            if (!this.isVesselFootprintStrictlyInWater(obstacleMap, cx, cz, cand.hL, cand.hW, heading)) {
              continue;
            }

            // Successfully verified! Place the 3D model
            const key = `mv_${cand.type}_${Math.round(cx)}_${Math.round(cz)}`;
            if (this.items.has(key)) continue;

            const elevY = this.getElevation ? this.getElevation(cx, cz) : 0;
            const finalBaseY = elevY + cand.baseY;

            const model = cand.create();
            model.position.set(cx, finalBaseY, cz);
            model.rotation.y = heading;

            this.scene.add(model);
            this.items.set(key, model);
            this.placedVessels.push({ x: cx, z: cz, r: cand.spacingR });

            // Register obstacle so land props don't collide
            obstacleMap.registerCustomObstacle(
              cx - cand.hL,
              cx + cand.hL,
              cz - cand.hL,
              cz + cand.hL
            );

            // Add to floating wave animation
            this.floatingVessels.push({
              group: model,
              baseY: finalBaseY,
              phase: seed * Math.PI * 2,
              rollFactor: cand.rollFactor,
              pitchFactor: cand.pitchFactor,
            });

            const coords = GeoCoords.toLatLng(cx, cz, originLat, originLng);
            this.placedItems.push({
              type: cand.type,
              name: cand.name,
              lat: coords.lat,
              lng: coords.lng,
              x: cx,
              z: cz,
            });

            itemsPlaced++;
            placedThisLocation = true;
            break;
          }

          if (placedThisLocation) break;
        }
      }

      // 2. Waterfront Boat Jetty placement along banks
      for (let i = 0; i < outerRing.length - 1; i += 6) {
        const p1 = outerRing[i];
        const p2 = outerRing[i + 1];
        const dx = p2.x - p1.x;
        const dz = p2.z - p1.z;
        const segLen = Math.hypot(dx, dz);
        if (segLen < 15) continue;

        const tx = dx / segLen;
        const tz = dz / segLen;
        const nx = -tz;
        const nz = tx;
        const midX = (p1.x + p2.x) / 2;
        const midZ = (p1.z + p2.z) / 2;

        const tooClose = this.placedVessels.some((v) => Math.hypot(v.x - midX, v.z - midZ) < 80);
        if (tooClose) continue;

        const jAngle = Math.atan2(nx, nz);
        if (obstacleMap.isRoadCollision(midX, midZ, 6, 3, jAngle)) continue;
        if (obstacleMap.isBuildingCollision(midX, midZ, 6, 3, jAngle)) continue;

        const key = `jetty_${Math.round(midX)}_${Math.round(midZ)}`;
        if (this.items.has(key)) continue;

        const elevY = this.getElevation ? this.getElevation(midX, midZ) : 0;
        const model = KeralaMaritimeGenerator.createBoatJettyModel();
        model.position.set(midX, elevY, midZ);
        model.rotation.y = jAngle;

        this.scene.add(model);
        this.items.set(key, model);
        this.placedVessels.push({ x: midX, z: midZ, r: 15 });

        const coords = GeoCoords.toLatLng(midX, midZ, originLat, originLng);
        this.placedItems.push({
          type: 'boat_jetty',
          name: 'കായൽ ബോട്ട് ജെട്ടി (Waterfront Boat Jetty)',
          lat: coords.lat,
          lng: coords.lng,
          x: midX,
          z: midZ,
        });
        itemsPlaced++;
      }
    }

    if (itemsPlaced > 0) {
      console.log(`[WaterTransportation] Placed ${itemsPlaced} authentic water vessels and ships on water bodies.`);
    }

    return itemsPlaced > 0;
  }
}
