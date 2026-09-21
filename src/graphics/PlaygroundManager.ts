import * as THREE from 'three';
import { SpatialObstacleMap } from './SpatialObstacleMap';
import { PlaygroundGenerator } from './PlaygroundGenerator';
import { GeoCoords } from '../core/geoCoords';
import { ZoneProfileRegistry } from '../core/ZoneProfileRegistry';

export interface PlacedPlaygroundInfo {
  name: string;
  lat: number;
  lng: number;
  x: number;
  z: number;
  roadName?: string;
}

export class PlaygroundManager {
  private scene: THREE.Scene;
  private playgrounds = new Map<string, THREE.Group>();
  private playgroundPositions: Array<{ x: number; z: number }> = [];

  public placedPlaygrounds: PlacedPlaygroundInfo[] = [];

  // Minimum distance between two playgrounds (realistic community distribution)
  private readonly MIN_PLAYGROUND_DISTANCE = 650; // 650 meters

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public update(
    obstacleMap: SpatialObstacleMap,
    originLat: number,
    originLng: number,
    getElevation?: (localX: number, localZ: number) => number
  ): boolean {
    if (!obstacleMap.isReady || obstacleMap.roads.length === 0) {
      return false;
    }

    let newPlaygroundsPlaced = 0;

    // RULE: "dont focus mane rodes juntions"
    // Playgrounds belong in neighborhood areas, parks, secondary and minor roads, NOT highway junctions!
    const eligibleRoads = obstacleMap.roads.filter(
      (r) =>
        (r.roadClass === 'secondary' ||
          r.roadClass === 'tertiary' ||
          r.roadClass === 'minor' ||
          r.roadClass === 'primary') &&
        r.length >= 25
    );

    // Prioritize secondary & tertiary neighborhood roads for playgrounds
    const priorityOrder: Record<string, number> = {
      secondary: 4,
      tertiary: 3,
      minor: 2,
      primary: 1,
    };
    eligibleRoads.sort((a, b) => (priorityOrder[b.roadClass] || 0) - (priorityOrder[a.roadClass] || 0));

    for (const road of eligibleRoads) {
      const dx = road.p2.x - road.p1.x;
      const dz = road.p2.z - road.p1.z;
      const len = Math.hypot(dx, dz);
      if (len < 12) continue;

      const midX = (road.p1.x + road.p2.x) / 2;
      const midZ = (road.p1.z + road.p2.z) / 2;

      // Check distance to existing playgrounds
      const isTooClose = this.playgroundPositions.some(
        (pos) => Math.hypot(pos.x - midX, pos.z - midZ) < this.MIN_PLAYGROUND_DISTANCE
      );
      if (isTooClose) continue;

      // RULE: Avoid Road Junctions!
      // Check if this point is near an intersection with another major road
      const isNearJunction = obstacleMap.roads.some((other) => {
        if (other === road) return false;
        const d1 = Math.hypot(other.p1.x - midX, other.p1.z - midZ);
        const d2 = Math.hypot(other.p2.x - midX, other.p2.z - midZ);
        // If within 40m of another road intersection, skip!
        return d1 < 40 || d2 < 40;
      });
      if (isNearJunction) continue;

      const tx = dx / len;
      const tz = dz / len;

      // Try placing on both sides of the road in open land
      for (const side of [1, -1]) {
        const nx = -tz * side;
        const nz = tx * side;

        // Playground dimensions: scaled 1.25x (55m x 35m)
        const centerDist = road.buffer + 28;
        const cx = midX + nx * centerDist;
        const cz = midZ + nz * centerDist;

        // Kerala Zone Environmental Check
        const zone = obstacleMap.getZoneAt(cx, cz, originLat, originLng);
        const profile = ZoneProfileRegistry.get(zone);
        if (!profile.allowedAssets.includes('playground')) {
          continue;
        }

        const minDistance = profile.spacing.playground;

        // Check distance again from exact candidate position
        const tooCloseCandidate = this.playgroundPositions.some(
          (pos) => Math.hypot(pos.x - cx, pos.z - cz) < minDistance
        );
        if (tooCloseCandidate) continue;

        // Verify that the entire field is 100% free of buildings, other roads, and water!
        if (
          obstacleMap.isStationFootprintClear(
            midX,
            midZ,
            nx,
            nz,
            tx,
            tz,
            centerDist,
            28, // half-width along road
            18, // half-depth perpendicular
            road.p1,
            road.p2
          )
        ) {
          const key = `ground_${Math.round(cx / 10)}_${Math.round(cz / 10)}`;
          if (this.playgrounds.has(key)) continue;

          // 1. Register playground footprint into obstacleMap
          // This automatically CLEARS all trees inside and around the sports field!
          obstacleMap.registerCustomObstacle(cx - 30, cx + 30, cz - 20, cz + 20);

          // 2. Create and orient 3D playground model
          const model = PlaygroundGenerator.createModel();
          const elevY = getElevation ? getElevation(cx, cz) : 0;
          model.position.set(cx, elevY, cz);

          // Orient field parallel to the neighborhood road
          const facingAngle = Math.atan2(tx, tz);
          model.rotation.y = facingAngle;

          this.scene.add(model);
          this.playgrounds.set(key, model);
          this.playgroundPositions.push({ x: cx, z: cz });

          // Record GPS coordinates
          const coords = GeoCoords.toLatLng(cx, cz, originLat, originLng);
          const groundNames = ['Central Sports Turf', 'Community Playground', 'Greenfield Arena', 'Youth Football Ground', 'Town Sports Field'];
          const groundTitle = groundNames[this.placedPlaygrounds.length % groundNames.length];
          const info: PlacedPlaygroundInfo = {
            name: `${groundTitle} (${road.roadClass.toUpperCase()})`,
            lat: coords.lat,
            lng: coords.lng,
            x: cx,
            z: cz,
            roadName: road.roadClass,
          };
          this.placedPlaygrounds.push(info);
          newPlaygroundsPlaced++;

          console.log(
            `[Playground] Placed ${info.name} in open neighborhood space at lat: ${coords.lat.toFixed(5)}, lng: ${coords.lng.toFixed(5)}`
          );

          // Once placed for this road segment, proceed to next road
          break;
        }
      }
    }

    if (typeof window !== 'undefined') {
      (window as any).__playgrounds = this.placedPlaygrounds;
    }

    return newPlaygroundsPlaced > 0;
  }

  public clear() {
    for (const group of this.playgrounds.values()) {
      this.scene.remove(group);
      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.geometry?.dispose();
        }
      });
    }
    this.playgrounds.clear();
    this.playgroundPositions = [];
    this.placedPlaygrounds = [];
  }
}
