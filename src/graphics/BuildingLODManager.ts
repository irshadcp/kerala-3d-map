import * as THREE from 'three';
import { SpatialObstacleMap, BuildingObstacle } from './SpatialObstacleMap';

interface ActiveBuildingLOD {
  group: THREE.Group;
  geometries: THREE.BufferGeometry[];
}

/**
 * BuildingLODManager
 * Dynamically provides Distance-based Level of Detail (LOD) for buildings in Kerala.
 * 
 * - LOD 0 (High Quality, 0-45m mobile / 0-65m desktop):
 *   For the closest buildings immediately around the player, creates rich architectural
 *   roof parapet cornices (Kerala terracotta & modern slate) and ground ambient occlusion
 *   contact plinths that ground the buildings to the terrain.
 * 
 * - LOD 1 (Medium Quality, 45-120m):
 *   Buildings outside the inner ring remain clean, lightweight volumetric 3D boxes
 *   rendered by MapLibre vector extrusions without any decorative mesh overhead.
 * 
 * - Strictly respects user constraint: Zero windows or doors are generated.
 */
export class BuildingLODManager {
  private scene: THREE.Scene;
  private container = new THREE.Group();
  private activeBuildings = new Map<string, ActiveBuildingLOD>();

  private lastUpdateX = -99999;
  private lastUpdateZ = -99999;

  private isPerformanceMode = false;
  private lodRadius = 45; // meters around character

  // Reusable materials
  private terracottaRoofMat: THREE.MeshLambertMaterial;
  private commercialRoofMat: THREE.MeshLambertMaterial;
  private groundAoMat: THREE.MeshBasicMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.container.name = 'BuildingLODContainer';
    this.scene.add(this.container);

    // Kerala clay terracotta roof cornice
    this.terracottaRoofMat = new THREE.MeshLambertMaterial({
      color: 0xc2410c, // Rich Kerala warm clay tile tone
    });

    // Modern slate commercial parapet cornice
    this.commercialRoofMat = new THREE.MeshLambertMaterial({
      color: 0x475569, // Slate graphite tone
    });

    // Soft ground contact ambient occlusion plinth
    this.groundAoMat = new THREE.MeshBasicMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
  }

  public setPerformanceMode(isPerformance: boolean) {
    this.isPerformanceMode = isPerformance;
    // On budget mobiles: smaller radius (32m, ~6-10 buildings max)
    // On balanced/desktop: broader radius (55m, ~15-20 buildings)
    this.lodRadius = isPerformance ? 32 : 55;
    this.lastUpdateX = -99999; // force recalculation
  }

  public update(
    obstacleMap: SpatialObstacleMap,
    playerX: number,
    playerZ: number,
    force = false
  ) {
    if (!obstacleMap || !obstacleMap.isReady) return;

    // Throttle checks: only update when player moves more than 7 meters
    const distMoved = Math.hypot(playerX - this.lastUpdateX, playerZ - this.lastUpdateZ);
    if (!force && distMoved < 7) {
      return;
    }

    this.lastUpdateX = playerX;
    this.lastUpdateZ = playerZ;

    // Query OSM buildings within the dynamic inner LOD radius around the character
    const nearbyBuildings = obstacleMap.getBuildingsInRadius(
      playerX,
      playerZ,
      this.lodRadius,
      true // osmOnly
    );

    // Limit maximum concurrent high-detail buildings for rock-solid 60 FPS
    const maxBuildings = this.isPerformanceMode ? 10 : 22;
    const candidateBuildings = nearbyBuildings.slice(0, maxBuildings);

    const activeKeys = new Set<string>();

    for (const b of candidateBuildings) {
      const key = `${b.minX.toFixed(1)},${b.minZ.toFixed(1)}`;
      activeKeys.add(key);

      if (!this.activeBuildings.has(key)) {
        const item = this.createBuildingLOD(b);
        if (item) {
          this.container.add(item.group);
          this.activeBuildings.set(key, item);
        }
      }
    }

    // Unload buildings that have moved outside the character's proximity ring
    for (const [key, item] of this.activeBuildings.entries()) {
      if (!activeKeys.has(key)) {
        this.container.remove(item.group);
        for (const geo of item.geometries) {
          geo.dispose();
        }
        this.activeBuildings.delete(key);
      }
    }
  }

  private createBuildingLOD(b: BuildingObstacle): ActiveBuildingLOD | null {
    const ring = b.rings?.[0];
    if (!ring || ring.length < 3) return null;

    const geometries: THREE.BufferGeometry[] = [];
    const group = new THREE.Group();

    try {
      const centerX = (b.minX + b.maxX) * 0.5;
      const centerZ = (b.minZ + b.maxZ) * 0.5;

      const shape = new THREE.Shape();
      shape.moveTo(ring[0].x - centerX, -(ring[0].z - centerZ));
      for (let i = 1; i < ring.length; i++) {
        shape.lineTo(ring[i].x - centerX, -(ring[i].z - centerZ));
      }
      shape.closePath();

      // 1. Ground Contact Ambient Occlusion Rim (soft ground shadow base)
      const groundGeo = new THREE.ShapeGeometry(shape);
      groundGeo.rotateX(Math.PI / 2);
      geometries.push(groundGeo);

      const groundMesh = new THREE.Mesh(groundGeo, this.groundAoMat);
      groundMesh.position.set(0, 0.04, 0);
      groundMesh.scale.set(1.06, 1, 1.06); // subtle outward soft margin
      group.add(groundMesh);

      // 2. High-Fidelity Roof Parapet Cornice Cap
      const roofHeight = Math.max(3.2, b.height);
      const roofMat = b.isCommercial ? this.commercialRoofMat : this.terracottaRoofMat;

      if (this.isPerformanceMode) {
        // Ultra-lightweight flat roof parapet cap for budget devices
        const roofGeo = new THREE.ShapeGeometry(shape);
        roofGeo.rotateX(Math.PI / 2);
        geometries.push(roofGeo);

        const roofMesh = new THREE.Mesh(roofGeo, roofMat);
        roofMesh.position.set(0, roofHeight + 0.15, 0);
        roofMesh.scale.set(1.02, 1, 1.02);
        group.add(roofMesh);
      } else {
        // Architectural beveled parapet cornice for desktop / high-end devices
        const extrudeSettings: THREE.ExtrudeGeometryOptions = {
          depth: 0.45,
          bevelEnabled: true,
          bevelSegments: 1,
          bevelSize: 0.18,
          bevelThickness: 0.2,
        };
        const roofGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        roofGeo.rotateX(Math.PI / 2);
        geometries.push(roofGeo);

        const roofMesh = new THREE.Mesh(roofGeo, roofMat);
        roofMesh.position.set(0, roofHeight + 0.35, 0);
        group.add(roofMesh);
      }

      group.position.set(centerX, 0, centerZ);
      return { group, geometries };
    } catch {
      // Discard on any non-manifold or self-intersecting polygon
      for (const geo of geometries) {
        geo.dispose();
      }
      return null;
    }
  }

  public clear() {
    for (const item of this.activeBuildings.values()) {
      this.container.remove(item.group);
      for (const geo of item.geometries) {
        geo.dispose();
      }
    }
    this.activeBuildings.clear();
    this.lastUpdateX = -99999;
    this.lastUpdateZ = -99999;
  }

  public dispose() {
    this.clear();
    this.scene.remove(this.container);
    this.terracottaRoofMat.dispose();
    this.commercialRoofMat.dispose();
    this.groundAoMat.dispose();
  }
}
