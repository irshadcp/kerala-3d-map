import * as THREE from 'three';
import { SpatialObstacleMap } from './SpatialObstacleMap';
import { PetrolStationGenerator } from './PetrolStationGenerator';
import { GeoCoords } from '../core/geoCoords';
import { ZoneProfileRegistry } from '../core/ZoneProfileRegistry';

export interface PlacedStationInfo {
  name: string;
  lat: number;
  lng: number;
  x: number;
  z: number;
  roadName?: string;
}

export class PetrolStationManager {
  private scene: THREE.Scene;
  private stations = new Map<string, THREE.Group>();
  private stationPositions: Array<{ x: number; z: number }> = [];

  public placedStations: PlacedStationInfo[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public update(obstacleMap: SpatialObstacleMap, originLat: number, originLng: number): boolean {
    if (!obstacleMap.isReady || obstacleMap.roads.length === 0) {
      return false;
    }

    let newStationsPlaced = 0;

    // Filter for eligible roads (highways, primary, secondary, tertiary, and minor/rural)
    const eligibleRoads = obstacleMap.roads.filter(
      (r) =>
        (r.roadClass === 'motorway' ||
          r.roadClass === 'trunk' ||
          r.roadClass === 'primary' ||
          r.roadClass === 'secondary' ||
          r.roadClass === 'tertiary' ||
          r.roadClass === 'minor') &&
        r.length >= 20
    );

    // Prioritize main roads where gamers drive:
    // Motorways/highways first, then primary corridors, then secondary, then rural/minor
    const priorityOrder: Record<string, number> = {
      motorway: 5,
      trunk: 4,
      primary: 3,
      secondary: 2,
      tertiary: 1,
      minor: 0,
    };
    eligibleRoads.sort((a, b) => (priorityOrder[b.roadClass] || 0) - (priorityOrder[a.roadClass] || 0));

    for (const road of eligibleRoads) {
      const dx = road.p2.x - road.p1.x;
      const dz = road.p2.z - road.p1.z;
      const len = Math.hypot(dx, dz);
      if (len < 10) continue;

      // Unit tangent vector pointing ALONG the road:
      const tx = dx / len;
      const tz = dz / len;

      const midX = (road.p1.x + road.p2.x) / 2;
      const midZ = (road.p1.z + road.p2.z) / 2;

      // Distance spacing: 500m on main highways/primaries, 750m on secondary/rural
      const isMainRoad = road.roadClass === 'motorway' || road.roadClass === 'trunk' || road.roadClass === 'primary';
      const minDistance = isMainRoad ? 450 : 700;

      const isTooClose = this.stationPositions.some(
        (pos) => Math.hypot(pos.x - midX, pos.z - midZ) < minDistance
      );
      if (isTooClose) continue;

      // Unit normal vector perpendicular to the road:
      // In 2D, rotating (tx, tz) by 90 degrees gives (-tz, tx)
      for (const side of [1, -1]) {
        const nx = -tz * side;
        const nz = tx * side;

        // Station dimensions: width = 24m (along road), depth = 18m (perpendicular to road).
        // Front curb must sit completely outside the road buffer with a clean 3.5m verge gap.
        // Station center is at distance: road.buffer + halfDepth (9m) + 3.5m verge = road.buffer + 12.5m
        const centerDist = road.buffer + 13.5;
        const cx = midX + nx * centerDist;
        const cz = midZ + nz * centerDist;

        // Kerala Zone Environmental Check
        const zone = obstacleMap.getZoneAt(cx, cz, originLat, originLng);
        const profile = ZoneProfileRegistry.get(zone);
        if (!profile.allowedAssets.includes('petrol_station')) {
          continue; // Forbidden in wetland, paddy, forest, coastal beaches
        }

        const minDistance = profile.spacing.petrolStation;

        // Check distance against existing stations
        const tooCloseCandidate = this.stationPositions.some(
          (pos) => Math.hypot(pos.x - cx, pos.z - cz) < minDistance
        );
        if (tooCloseCandidate) continue;

        // Check if footprint is 100% free of buildings, other roads, and water
        if (
          obstacleMap.isStationFootprintClear(
            midX,
            midZ,
            nx,
            nz,
            tx,
            tz,
            centerDist,
            12, // half-width
            9,  // half-depth
            road.p1,
            road.p2
          )
        ) {
          const key = `fuel_${Math.round(cx / 10)}_${Math.round(cz / 10)}`;
          if (this.stations.has(key)) continue;

          // 1. Register petrol station footprint into obstacleMap so trees are cleared/avoided!
          obstacleMap.registerCustomObstacle(cx - 15, cx + 15, cz - 12, cz + 12);

          // 2. Create and orient the 3D model
          const model = PetrolStationGenerator.createModel();
          model.position.set(cx, 0, cz);

          // Model's front (pumps + canopy) is at +Z in local space.
          // Point local +Z towards the road (direction -nx, -nz):
          const facingAngle = Math.atan2(-nx, -nz);
          model.rotation.y = facingAngle;

          this.scene.add(model);
          this.stations.set(key, model);
          this.stationPositions.push({ x: cx, z: cz });

          // Record GPS coordinates for fly-to and user info
          const coords = GeoCoords.toLatLng(cx, cz, originLat, originLng);
          const brandNames = ['IndianOil Fuel Station', 'HP Petrol Pump', 'Bharat Petroleum', 'Shell Auto Fuel'];
          const brand = brandNames[this.placedStations.length % brandNames.length];
          const info: PlacedStationInfo = {
            name: `${brand} (${road.roadClass.toUpperCase()})`,
            lat: coords.lat,
            lng: coords.lng,
            x: cx,
            z: cz,
            roadName: road.roadClass,
          };
          this.placedStations.push(info);
          newStationsPlaced++;

          console.log(
            `[PetrolStation] Placed ${info.name} on ${road.roadClass} roadside at lat: ${coords.lat.toFixed(5)}, lng: ${coords.lng.toFixed(5)}`
          );

          // Once placed for this road segment, proceed to next road
          break;
        }
      }
    }

    if (typeof window !== 'undefined') {
      (window as any).__pumps = this.placedStations;
    }

    return newStationsPlaced > 0;
  }

  public clear() {
    for (const group of this.stations.values()) {
      this.scene.remove(group);
      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.geometry?.dispose();
        }
      });
    }
    this.stations.clear();
    this.stationPositions = [];
    this.placedStations = [];
  }
}
