import * as THREE from 'three';
import { SpatialObstacleMap, BuildingObstacle } from './SpatialObstacleMap';

interface ActiveBuildingLOD {
  group: THREE.Group;
  geometries: THREE.BufferGeometry[];
}

/**
 * BuildingLODManager
 * Dynamically provides realistic Kerala architectural models with soft curved/beveled
 * edges, traditional sloping terracotta tile roofs, front verandas (പൂമുഖം), and
 * round support pillars.
 * 
 * - Soft Curved Geometry: Eliminates harsh blocky edges with smooth beveled fillets
 * - Kerala Residential Houses: Authentic sloped hipped roofs, eaves, and verandas
 * - Commercial Buildings: Soft curved modern parapets and storefront awnings
 * - Ground Contact Plinths: Smooth ambient occlusion grounding skirts
 * - Zero windows or doors generated (strictly respects user constraint)
 */
export class BuildingLODManager {
  private scene: THREE.Scene;
  private container = new THREE.Group();
  private activeBuildings = new Map<string, ActiveBuildingLOD>();

  private lastUpdateX = -99999;
  private lastUpdateZ = -99999;

  private isPerformanceMode = false;
  private lodRadius = 48; // meters around character

  // Reusable materials
  private terracottaRoofMat: THREE.MeshLambertMaterial;
  private ridgeTileMat: THREE.MeshLambertMaterial;
  private commercialRoofMat: THREE.MeshLambertMaterial;
  private pillarMat: THREE.MeshLambertMaterial;
  private awningMat: THREE.MeshLambertMaterial;
  private groundAoMat: THREE.MeshBasicMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.container.name = 'BuildingLODContainer';
    this.scene.add(this.container);

    // Warm, rich Kerala clay terracotta roof tile
    this.terracottaRoofMat = new THREE.MeshLambertMaterial({
      color: 0xea580c, // Bright warm terracotta tile
    });

    // Deep terracotta ridge capping
    this.ridgeTileMat = new THREE.MeshLambertMaterial({
      color: 0xc2410c, // Rich burnt clay ridge tone
    });

    // Modern slate commercial parapet cornice
    this.commercialRoofMat = new THREE.MeshLambertMaterial({
      color: 0x475569, // Slate graphite tone
    });

    // Veranda round pillar material (Traditional whitewashed cream / teak)
    this.pillarMat = new THREE.MeshLambertMaterial({
      color: 0xfef9c3, // Ivory whitewash pillar
    });

    // Commercial storefront canopy awning
    this.awningMat = new THREE.MeshLambertMaterial({
      color: 0x0284c7, // Vibrant Kerala azure canopy
    });

    // Soft ground contact ambient occlusion plinth
    this.groundAoMat = new THREE.MeshBasicMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    });
  }

  public setPerformanceMode(isPerformance: boolean) {
    this.isPerformanceMode = isPerformance;
    this.lodRadius = isPerformance ? 34 : 58;
    this.lastUpdateX = -99999;
  }

  public update(
    obstacleMap: SpatialObstacleMap,
    playerX: number,
    playerZ: number,
    force = false,
    getElevation?: (localX: number, localZ: number) => number
  ) {
    if (!obstacleMap || !obstacleMap.isReady) return;

    const distMoved = Math.hypot(playerX - this.lastUpdateX, playerZ - this.lastUpdateZ);
    if (!force && distMoved < 7) {
      return;
    }

    this.lastUpdateX = playerX;
    this.lastUpdateZ = playerZ;

    const nearbyBuildings = obstacleMap.getBuildingsInRadius(
      playerX,
      playerZ,
      this.lodRadius,
      true // osmOnly
    );

    const maxBuildings = this.isPerformanceMode ? 12 : 24;
    const candidateBuildings = nearbyBuildings.slice(0, maxBuildings);

    const activeKeys = new Set<string>();

    for (const b of candidateBuildings) {
      const key = `${b.minX.toFixed(1)},${b.minZ.toFixed(1)}`;
      activeKeys.add(key);

      if (!this.activeBuildings.has(key)) {
        const item = this.createBuildingLOD(b, getElevation);
        if (item) {
          this.container.add(item.group);
          this.activeBuildings.set(key, item);
        }
      } else if (getElevation) {
        const item = this.activeBuildings.get(key);
        if (item) {
          const centerX = (b.minX + b.maxX) * 0.5;
          const centerZ = (b.minZ + b.maxZ) * 0.5;
          item.group.position.y = getElevation(centerX, centerZ);
        }
      }
    }

    // Unload buildings that moved outside proximity ring
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

  private createBuildingLOD(
    b: BuildingObstacle,
    getElevation?: (localX: number, localZ: number) => number
  ): ActiveBuildingLOD | null {
    const ring = b.rings?.[0];
    if (!ring || ring.length < 3) return null;

    const geometries: THREE.BufferGeometry[] = [];
    const group = new THREE.Group();

    try {
      const centerX = (b.minX + b.maxX) * 0.5;
      const centerZ = (b.minZ + b.maxZ) * 0.5;
      const width = Math.max(3, b.maxX - b.minX);
      const depth = Math.max(3, b.maxZ - b.minZ);

      const shape = new THREE.Shape();
      shape.moveTo(ring[0].x - centerX, -(ring[0].z - centerZ));
      for (let i = 1; i < ring.length; i++) {
        shape.lineTo(ring[i].x - centerX, -(ring[i].z - centerZ));
      }
      shape.closePath();

      // 1. Soft Ground Contact Ambient Occlusion Rim (soft curved ground skirt)
      const groundGeo = new THREE.ShapeGeometry(shape);
      groundGeo.rotateX(Math.PI / 2);
      geometries.push(groundGeo);

      const groundMesh = new THREE.Mesh(groundGeo, this.groundAoMat);
      groundMesh.position.set(0, 0.04, 0);
      groundMesh.scale.set(1.08, 1, 1.08); // soft outward margin
      group.add(groundMesh);

      // Roof base height matching the 18m minimum fill-extrusion
      const roofBaseHeight = Math.max(18.0, (b.height || 8.0) + 8.0);

      if (b.isCommercial) {
        // ==========================================
        // COMMERCIAL / RETAIL BUILDING (വ്യാപാര കെട്ടിടം)
        // Soft rounded parapet cornices & modern storefront canopy
        // ==========================================
        const parapetExtrude: THREE.ExtrudeGeometryOptions = {
          depth: 0.5,
          bevelEnabled: true,
          bevelSegments: this.isPerformanceMode ? 1 : 3,
          bevelSize: 0.32,
          bevelThickness: 0.25,
        };
        const parapetGeo = new THREE.ExtrudeGeometry(shape, parapetExtrude);
        parapetGeo.rotateX(Math.PI / 2);
        geometries.push(parapetGeo);

        const parapetMesh = new THREE.Mesh(parapetGeo, this.commercialRoofMat);
        parapetMesh.position.set(0, roofBaseHeight + 0.3, 0);
        group.add(parapetMesh);

        // Soft curved entrance awning along the wider side
        const awningWidth = Math.min(width * 0.7, 7.0);
        const awningDepth = 2.2;
        const awningGeo = new THREE.CylinderGeometry(
          awningWidth * 0.5,
          awningWidth * 0.5,
          awningDepth,
          this.isPerformanceMode ? 6 : 10,
          1,
          false,
          0,
          Math.PI
        );
        awningGeo.rotateZ(Math.PI / 2);
        geometries.push(awningGeo);

        const awningMesh = new THREE.Mesh(awningGeo, this.awningMat);
        awningMesh.position.set(0, 3.4, depth * 0.5 + 0.8);
        awningMesh.scale.set(1, 0.25, 1);
        group.add(awningMesh);
      } else {
        // ==========================================
        // AUTHENTIC KERALA RESIDENTIAL HOUSE (കേരളീയ വീട്)
        // Sloping Terracotta Tiled Hipped Roof + Poomukham Veranda
        // ==========================================

        // 1. Lower Eaves Overhang (ഇറയം) with Soft Curved Beveled Edges
        const eaveExtrude: THREE.ExtrudeGeometryOptions = {
          depth: 0.42,
          bevelEnabled: true,
          bevelSegments: this.isPerformanceMode ? 2 : 3,
          bevelSize: 0.38, // Smooth rounded curved eave edge
          bevelThickness: 0.3,
        };
        const eaveGeo = new THREE.ExtrudeGeometry(shape, eaveExtrude);
        eaveGeo.rotateX(Math.PI / 2);
        geometries.push(eaveGeo);

        const eaveMesh = new THREE.Mesh(eaveGeo, this.terracottaRoofMat);
        eaveMesh.position.set(0, roofBaseHeight + 0.2, 0);
        eaveMesh.scale.set(1.05, 1, 1.05); // overhang beyond building walls
        group.add(eaveMesh);

        // 2. Upper Pitch Hipped Terracotta Roof
        const roofPitchHeight = Math.min(3.6, Math.max(2.2, Math.min(width, depth) * 0.38));
        const hippedGeo = new THREE.ConeGeometry(
          Math.max(width, depth) * 0.62,
          roofPitchHeight,
          4 // 4-sided hipped pyramid pitch
        );
        hippedGeo.rotateY(Math.PI / 4);
        geometries.push(hippedGeo);

        const hippedMesh = new THREE.Mesh(hippedGeo, this.terracottaRoofMat);
        hippedMesh.position.set(0, roofBaseHeight + 0.4 + roofPitchHeight * 0.5, 0);
        hippedMesh.scale.set(width / Math.max(width, depth), 1, depth / Math.max(width, depth));
        group.add(hippedMesh);

        // 3. Terracotta Ridge Cap (ഓട് വരമ്പ്) along the peak
        const ridgeLength = Math.max(1.8, Math.abs(width - depth) * 0.8 + 1.2);
        const ridgeGeo = new THREE.CylinderGeometry(0.16, 0.16, ridgeLength, 8);
        if (width >= depth) {
          ridgeGeo.rotateZ(Math.PI / 2);
        } else {
          ridgeGeo.rotateX(Math.PI / 2);
        }
        geometries.push(ridgeGeo);

        const ridgeMesh = new THREE.Mesh(ridgeGeo, this.ridgeTileMat);
        ridgeMesh.position.set(0, roofBaseHeight + 0.4 + roofPitchHeight - 0.05, 0);
        group.add(ridgeMesh);

        // 4. Front Veranda / Poomukham (പൂമുഖം / വരാന്ത) with Round Classical Pillars
        // Only if house is sufficiently spacious (> 7m)
        if (width >= 6.5 && depth >= 6.5) {
          const verandaWidth = Math.min(width * 0.65, 5.5);
          const verandaDepth = 2.4;
          const verandaRoofH = 2.8;

          // Sloped Veranda Awning
          const verandaRoofGeo = new THREE.BoxGeometry(verandaWidth, 0.16, verandaDepth);
          geometries.push(verandaRoofGeo);
          const verandaRoof = new THREE.Mesh(verandaRoofGeo, this.terracottaRoofMat);
          verandaRoof.position.set(0, verandaRoofH, depth * 0.5 + verandaDepth * 0.45);
          verandaRoof.rotation.x = 0.22; // sloping canopy
          group.add(verandaRoof);

          // 2 Round Classical White/Cream Pillars
          const pillarRadius = 0.12;
          const pillarH = verandaRoofH - 0.2;
          const pillarGeo = new THREE.CylinderGeometry(pillarRadius * 0.9, pillarRadius, pillarH, 8);
          geometries.push(pillarGeo);

          for (const side of [-1, 1]) {
            const pillar = new THREE.Mesh(pillarGeo, this.pillarMat);
            const px = side * (verandaWidth * 0.42);
            const pz = depth * 0.5 + verandaDepth * 0.82;
            pillar.position.set(px, pillarH * 0.5, pz);
            group.add(pillar);
          }
        }
      }

      const groundY = getElevation ? getElevation(centerX, centerZ) : 0;
      group.position.set(centerX, groundY, centerZ);
      return { group, geometries };
    } catch {
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
    this.ridgeTileMat.dispose();
    this.commercialRoofMat.dispose();
    this.pillarMat.dispose();
    this.awningMat.dispose();
    this.groundAoMat.dispose();
  }
}
