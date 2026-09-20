import * as THREE from 'three';
import { SpatialObstacleMap } from './SpatialObstacleMap';

/**
 * BuildingFacadeManager
 * Generates ultra-lightweight procedural windows, residential doors, and commercial shutters
 * for 3D extruded buildings using THREE.InstancedMesh.
 * 
 * Performance architecture:
 * - Exactly 3 GPU draw calls for all buildings across the city.
 * - Procedural canvas textures with baked lighting and reflections.
 * - Spatial bucket querying (only processes buildings in 180m radius).
 * - Updates only when player travels > 25m (0 overhead during walking/camera motion).
 * - Polygon offset enabled for zero z-fighting on building walls.
 */
export class BuildingFacadeManager {
  private scene: THREE.Scene;

  private windowMesh: THREE.InstancedMesh;
  private doorMesh: THREE.InstancedMesh;
  private shutterMesh: THREE.InstancedMesh;

  private readonly MAX_WINDOWS = 3500;
  private readonly MAX_DOORS = 400;
  private readonly MAX_SHUTTERS = 400;

  private windowGeo: THREE.PlaneGeometry;
  private doorGeo: THREE.PlaneGeometry;
  private shutterGeo: THREE.PlaneGeometry;

  private windowTex: THREE.CanvasTexture;
  private doorTex: THREE.CanvasTexture;
  private shutterTex: THREE.CanvasTexture;

  private windowMat: THREE.MeshBasicMaterial;
  private doorMat: THREE.MeshBasicMaterial;
  private shutterMat: THREE.MeshBasicMaterial;

  private dummy = new THREE.Object3D();
  private lastUpdateX = -99999;
  private lastUpdateZ = -99999;
  private isPlaced = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // 1. Generate Crisp Procedural Canvas Textures
    this.windowTex = this.createWindowTexture();
    this.doorTex = this.createDoorTexture();
    this.shutterTex = this.createShutterTexture();

    // 2. High-Performance Polygon-Offset Materials (Prevents Z-Fighting on Extruded Walls)
    this.windowMat = new THREE.MeshBasicMaterial({
      map: this.windowTex,
      polygonOffset: true,
      polygonOffsetFactor: -1.0,
      polygonOffsetUnits: -1.0,
      side: THREE.FrontSide,
    });

    this.doorMat = new THREE.MeshBasicMaterial({
      map: this.doorTex,
      polygonOffset: true,
      polygonOffsetFactor: -1.0,
      polygonOffsetUnits: -1.0,
      side: THREE.FrontSide,
    });

    this.shutterMat = new THREE.MeshBasicMaterial({
      map: this.shutterTex,
      polygonOffset: true,
      polygonOffsetFactor: -1.0,
      polygonOffsetUnits: -1.0,
      side: THREE.FrontSide,
    });

    // 3. Human-Scale Planar Geometries
    this.windowGeo = new THREE.PlaneGeometry(1.25, 1.45);
    this.doorGeo = new THREE.PlaneGeometry(1.3, 2.2);
    this.shutterGeo = new THREE.PlaneGeometry(1.85, 2.2);

    // 4. Batched Instanced Meshes (Only 3 Draw Calls Total!)
    this.windowMesh = new THREE.InstancedMesh(this.windowGeo, this.windowMat, this.MAX_WINDOWS);
    this.doorMesh = new THREE.InstancedMesh(this.doorGeo, this.doorMat, this.MAX_DOORS);
    this.shutterMesh = new THREE.InstancedMesh(this.shutterGeo, this.shutterMat, this.MAX_SHUTTERS);

    this.windowMesh.count = 0;
    this.doorMesh.count = 0;
    this.shutterMesh.count = 0;

    this.windowMesh.name = 'instanced_building_windows';
    this.doorMesh.name = 'instanced_building_doors';
    this.shutterMesh.name = 'instanced_building_shutters';

    this.scene.add(this.windowMesh);
    this.scene.add(this.doorMesh);
    this.scene.add(this.shutterMesh);
  }

  /**
   * Updates facade instances around the player.
   * Only recomputes if player moves > 25m or when force = true.
   */
  public update(
    obstacleMap: SpatialObstacleMap,
    _originLat: number,
    _originLng: number,
    playerX: number,
    playerZ: number,
    force = false
  ) {
    if (!obstacleMap || !obstacleMap.isReady) return;

    const distMoved = Math.hypot(playerX - this.lastUpdateX, playerZ - this.lastUpdateZ);
    if (!force && this.isPlaced && distMoved < 25) {
      return;
    }

    this.lastUpdateX = playerX;
    this.lastUpdateZ = playerZ;
    this.isPlaced = true;

    // Radius of visible facade details: 180m (optimal for high FPS & crisp view)
    const buildings = obstacleMap.getBuildingsInRadius(playerX, playerZ, 180);
    if (buildings.length === 0) {
      this.clear();
      return;
    }

    let windowIdx = 0;
    let doorIdx = 0;
    let shutterIdx = 0;

    for (const bldg of buildings) {
      if (!bldg.rings || bldg.rings.length === 0) continue;
      const outerRing = bldg.rings[0];
      if (outerRing.length < 3) continue;

      const height = bldg.height || 8;
      const isCommercial = bldg.isCommercial || false;

      // Seeded determination of primary entrance wall
      let maxWallLen = 0;
      let primaryWallIdx = -1;

      for (let i = 0; i < outerRing.length - 1; i++) {
        const p1 = outerRing[i];
        const p2 = outerRing[i + 1];
        const len = Math.hypot(p2.x - p1.x, p2.z - p1.z);
        if (len > maxWallLen) {
          maxWallLen = len;
          primaryWallIdx = i;
        }
      }

      // Loop through wall segments
      for (let i = 0; i < outerRing.length - 1; i++) {
        const p1 = outerRing[i];
        const p2 = outerRing[i + 1];
        const dx = p2.x - p1.x;
        const dz = p2.z - p1.z;
        const wallLen = Math.hypot(dx, dz);

        // Skip walls that are too narrow for standard windows/doors
        if (wallLen < 2.4) continue;

        // Tangent along wall
        const tx = dx / wallLen;
        const tz = dz / wallLen;

        // Candidate normal (perpendicular)
        let nx = -tz;
        let nz = tx;

        // Verify that normal points OUTWARD (away from building interior)
        const mx = (p1.x + p2.x) * 0.5;
        const mz = (p1.z + p2.z) * 0.5;
        const testIn = SpatialObstacleMap.pointInPolygon(mx + nx * 0.25, mz + nz * 0.25, outerRing);
        if (testIn) {
          nx = -nx;
          nz = -nz;
        }

        // Clearance check: do not put windows on a shared party wall touching another building
        const testClearanceX = mx + nx * 0.6;
        const testClearanceZ = mz + nz * 0.6;
        if (obstacleMap.isBuildingCollision(testClearanceX, testClearanceZ, 0.2, 0.2, 0)) {
          continue; // Blocked wall / internal alleyway
        }

        // Rotation angle for outward facing plane
        const rotY = Math.atan2(nx, nz);

        // Wall spacing
        const margin = 1.2; // clearance from building corners
        const usable = wallLen - 2 * margin;
        if (usable < 1.0) continue;

        const bayCount = Math.max(1, Math.floor(usable / 3.0));
        const step = usable / bayCount;
        const centerBay = Math.floor(bayCount / 2);

        const hasEntrance = (i === primaryWallIdx || (wallLen > 15 && i % 2 === 0));

        for (let k = 0; k < bayCount; k++) {
          const s = margin + (k + 0.5) * step;
          const wx = p1.x + tx * s + nx * 0.045; // 4.5cm outward offset
          const wz = p1.z + tz * s + nz * 0.045;

          // --- GROUND FLOOR ---
          if (hasEntrance && k === centerBay) {
            if (isCommercial && shutterIdx < this.MAX_SHUTTERS) {
              // Commercial rolling shop shutter
              this.dummy.position.set(wx, 1.1, wz);
              this.dummy.rotation.set(0, rotY, 0);
              this.dummy.scale.set(1, 1, 1);
              this.dummy.updateMatrix();
              this.shutterMesh.setMatrixAt(shutterIdx++, this.dummy.matrix);
            } else if (doorIdx < this.MAX_DOORS) {
              // Teak wood residential entrance door
              this.dummy.position.set(wx, 1.1, wz);
              this.dummy.rotation.set(0, rotY, 0);
              this.dummy.scale.set(1, 1, 1);
              this.dummy.updateMatrix();
              this.doorMesh.setMatrixAt(doorIdx++, this.dummy.matrix);
            }
          } else if (windowIdx < this.MAX_WINDOWS) {
            // Ground floor window
            this.dummy.position.set(wx, 1.4, wz);
            this.dummy.rotation.set(0, rotY, 0);
            this.dummy.scale.set(1, 1, 1);
            this.dummy.updateMatrix();
            this.windowMesh.setMatrixAt(windowIdx++, this.dummy.matrix);
          }

          // --- UPPER FLOORS ---
          for (let floor = 1; ; floor++) {
            const yElevation = 1.4 + floor * 3.0; // 3m floor-to-floor height
            if (yElevation + 0.75 > height - 0.3) {
              break; // Ensure window stays cleanly below the roof line
            }

            if (windowIdx < this.MAX_WINDOWS) {
              this.dummy.position.set(wx, yElevation, wz);
              this.dummy.rotation.set(0, rotY, 0);
              this.dummy.scale.set(1, 1, 1);
              this.dummy.updateMatrix();
              this.windowMesh.setMatrixAt(windowIdx++, this.dummy.matrix);
            } else {
              break;
            }
          }
        }
      }
    }

    // Apply updated instance counts and notify WebGL
    this.windowMesh.count = windowIdx;
    this.windowMesh.instanceMatrix.needsUpdate = true;

    this.doorMesh.count = doorIdx;
    this.doorMesh.instanceMatrix.needsUpdate = true;

    this.shutterMesh.count = shutterIdx;
    this.shutterMesh.instanceMatrix.needsUpdate = true;
  }

  public clear() {
    this.windowMesh.count = 0;
    this.doorMesh.count = 0;
    this.shutterMesh.count = 0;
    this.windowMesh.instanceMatrix.needsUpdate = true;
    this.doorMesh.instanceMatrix.needsUpdate = true;
    this.shutterMesh.instanceMatrix.needsUpdate = true;
    this.isPlaced = false;
  }

  public dispose() {
    this.clear();
    this.scene.remove(this.windowMesh);
    this.scene.remove(this.doorMesh);
    this.scene.remove(this.shutterMesh);

    this.windowGeo.dispose();
    this.doorGeo.dispose();
    this.shutterGeo.dispose();

    this.windowTex.dispose();
    this.doorTex.dispose();
    this.shutterTex.dispose();

    this.windowMat.dispose();
    this.doorMat.dispose();
    this.shutterMat.dispose();
  }

  // =========================================================================
  // Procedural Canvas Texture Generators
  // =========================================================================

  /**
   * Modern architectural 4-pane window with sky reflection gradient,
   * ivory frame, diagonal glare, and bottom sill.
   */
  private createWindowTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 144;
    const ctx = canvas.getContext('2d')!;

    // 1. Crisp architectural frame (Ivory)
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 128, 144);

    // 2. Window reveal / inner shadow
    ctx.fillStyle = '#64748b';
    ctx.fillRect(6, 6, 116, 124);

    // 3. Glass Panes with daytime sky reflection gradient
    const glassGrad = ctx.createLinearGradient(0, 8, 0, 128);
    glassGrad.addColorStop(0, '#38bdf8');   // Bright sky reflection
    glassGrad.addColorStop(0.35, '#0284c7');
    glassGrad.addColorStop(0.7, '#0f172a');  // Interior depth
    glassGrad.addColorStop(1, '#020617');

    // 4 Panes
    ctx.fillStyle = glassGrad;
    ctx.fillRect(10, 10, 50, 54);  // Upper Left
    ctx.fillRect(68, 10, 50, 54);  // Upper Right
    ctx.fillRect(10, 72, 50, 54);  // Lower Left
    ctx.fillRect(68, 72, 50, 54);  // Lower Right

    // 4. Diagonal light sheen / reflection
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.beginPath();
    ctx.moveTo(10, 10);
    ctx.lineTo(40, 10);
    ctx.lineTo(10, 48);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(68, 10);
    ctx.lineTo(118, 10);
    ctx.lineTo(68, 72);
    ctx.closePath();
    ctx.fill();

    // 5. Concrete Window Sill at bottom
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(2, 130, 124, 10);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(2, 140, 124, 4); // sill drop shadow

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 2;
    return tex;
  }

  /**
   * Kerala Teak Wood entrance door with top glass transom, beveled panels,
   * brass pull handle, and metal kickplate.
   */
  private createDoorTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 220;
    const ctx = canvas.getContext('2d')!;

    // 1. Dark timber frame
    ctx.fillStyle = '#451a03';
    ctx.fillRect(0, 0, 128, 220);

    // 2. Door Body (Kerala Teak Wood)
    const woodGrad = ctx.createLinearGradient(0, 0, 128, 0);
    woodGrad.addColorStop(0, '#78350f');
    woodGrad.addColorStop(0.5, '#92400e');
    woodGrad.addColorStop(1, '#78350f');
    ctx.fillStyle = woodGrad;
    ctx.fillRect(8, 8, 112, 206);

    // 3. Top Glass Transom / Ventilator
    const transomGrad = ctx.createLinearGradient(0, 14, 0, 52);
    transomGrad.addColorStop(0, '#38bdf8');
    transomGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = transomGrad;
    ctx.fillRect(16, 14, 96, 36);

    ctx.fillStyle = '#f8fafc';
    ctx.strokeRect(16, 14, 96, 36);
    ctx.fillRect(63, 14, 2, 36); // Transom vertical divider

    // 4. Two Beveled Wood Panels
    for (const py of [60, 134]) {
      ctx.fillStyle = '#3a1805'; // panel recess shadow
      ctx.fillRect(18, py, 92, 64);
      ctx.fillStyle = '#854d0e'; // inner panel highlight
      ctx.fillRect(22, py + 4, 84, 56);
    }

    // 5. Brass Handle & Keyhole
    ctx.fillStyle = '#facc15'; // Brass
    ctx.fillRect(100, 115, 6, 24); // vertical handle
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(99, 113, 8, 3);
    ctx.fillRect(99, 138, 8, 3);
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(102, 145, 3, 5); // keyhole

    // 6. Brushed Aluminum Kickplate at bottom
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(12, 204, 104, 8);

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 2;
    return tex;
  }

  /**
   * Commercial rolling steel shutter for shopfronts with steel slats,
   * cyan lintel fascia, and center padlock.
   */
  private createShutterTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 220;
    const ctx = canvas.getContext('2d')!;

    // Steel frame
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 0, 128, 220);

    // Top Shutter Hood Box (Cyan Commercial Lintel)
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(6, 6, 116, 28);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('STORE', 64, 24);

    // Rolling Steel Shutter Slats
    for (let y = 38; y < 204; y += 8) {
      ctx.fillStyle = (y % 16 === 0) ? '#64748b' : '#94a3b8';
      ctx.fillRect(10, y, 108, 7);
      ctx.fillStyle = '#475569';
      ctx.fillRect(10, y + 6, 108, 1); // slat shadow
    }

    // Shutter Center Lock & Padlock
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(58, 192, 12, 10);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(62, 196, 4, 3); // brass lock

    // Bottom weather seal
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(8, 204, 112, 8);

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 2;
    return tex;
  }
}
