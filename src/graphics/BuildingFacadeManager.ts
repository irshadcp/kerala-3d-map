import * as THREE from 'three';
import { SpatialObstacleMap } from './SpatialObstacleMap';

/**
 * BuildingFacadeManager
 * Generates ultra-lightweight floor-based procedural double windows, residential entrance doors,
 * and commercial shopfront shutters for OpenStreetMap 3D extruded blank boxes.
 * 
 * Rules:
 * - Only applies to real OpenStreetMap 3D buildings (zero custom props, parking lots, temples, or tea stalls).
 * - Proper floor-by-floor vertical layout (Ground, 1st, 2nd, 3rd floors based on building height).
 * - Uses wide dual-casement double windows (not single isolated window squares).
 * - Exactly 3 GPU draw calls total using THREE.InstancedMesh.
 * - Polygon offset enabled for zero z-fighting on building walls.
 */
export class BuildingFacadeManager {
  private scene: THREE.Scene;

  private windowMesh: THREE.InstancedMesh;
  private doorMesh: THREE.InstancedMesh;
  private shutterMesh: THREE.InstancedMesh;

  private readonly MAX_WINDOWS = 4000;
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

    // 1. Generate High-Fidelity Procedural Textures
    this.windowTex = this.createDoubleWindowTexture();
    this.doorTex = this.createDoorTexture();
    this.shutterTex = this.createShutterTexture();

    // 2. High-Performance Polygon-Offset Materials
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

    // 3. Wide Dual-Casement Double Windows & Real Proportions
    // 2.2m wide double window (pair of architectural windows with center mullion)
    this.windowGeo = new THREE.PlaneGeometry(2.2, 1.35);
    this.doorGeo = new THREE.PlaneGeometry(1.3, 2.2);
    this.shutterGeo = new THREE.PlaneGeometry(2.2, 2.2);

    // 4. Batched Instanced Meshes (Only 3 Draw Calls for the entire map!)
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
   * Only processes real OpenStreetMap buildings (osmOnly = true).
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

    // Radius: 180m around the player (strictly real OSM buildings only, osmOnly = true)
    const buildings = obstacleMap.getBuildingsInRadius(playerX, playerZ, 180, true);
    if (buildings.length === 0) {
      this.clear();
      return;
    }

    let windowIdx = 0;
    let doorIdx = 0;
    let shutterIdx = 0;

    for (const bldg of buildings) {
      // Safety: skip any custom landmarks, parking lots, tea shops, temples, etc.
      if (bldg.isCustomObstacle) continue;
      if (!bldg.rings || bldg.rings.length === 0) continue;

      const outerRing = bldg.rings[0];
      if (outerRing.length < 3) continue;

      const height = bldg.height || 8;
      const isCommercial = bldg.isCommercial || false;

      // Determine Floor Elevations based on building height
      // Each floor is ~2.6m to 3.0m high
      const floorElevations: number[] = [];
      if (height < 4.0) {
        // 1-story low building
        floorElevations.push(1.25);
      } else if (height < 6.8) {
        // 2-story building (Ground + 1st floor)
        floorElevations.push(1.25, 3.5);
      } else if (height < 9.8) {
        // 3-story building (Standard 8m OSM building)
        floorElevations.push(1.25, 3.7, 6.2);
      } else if (height < 12.8) {
        // 4-story building
        floorElevations.push(1.25, 3.7, 6.2, 8.8);
      } else {
        // Tall building: floors every 2.7m
        for (let y = 1.25; y + 0.75 <= height - 0.4; y += 2.7) {
          floorElevations.push(y);
        }
      }

      // Find the primary entrance wall (longest suitable wall)
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

      // Process exterior wall segments
      for (let i = 0; i < outerRing.length - 1; i++) {
        const p1 = outerRing[i];
        const p2 = outerRing[i + 1];
        const dx = p2.x - p1.x;
        const dz = p2.z - p1.z;
        const wallLen = Math.hypot(dx, dz);

        // Require minimum 3.0m for wide double window + margins
        if (wallLen < 3.0) continue;

        const tx = dx / wallLen;
        const tz = dz / wallLen;

        // Candidate outward normal
        let nx = -tz;
        let nz = tx;

        const mx = (p1.x + p2.x) * 0.5;
        const mz = (p1.z + p2.z) * 0.5;

        // Ensure normal points OUTWARD (away from building interior)
        if (SpatialObstacleMap.pointInPolygon(mx + nx * 0.2, mz + nz * 0.2, outerRing)) {
          nx = -nx;
          nz = -nz;
        }

        // Clearance check: do not put windows if this wall directly abuts another building
        let isAbuttingOther = false;
        for (const other of buildings) {
          if (other === bldg) continue;
          if (SpatialObstacleMap.pointInPolygon(mx + nx * 0.4, mz + nz * 0.4, other.rings[0])) {
            isAbuttingOther = true;
            break;
          }
        }
        if (isAbuttingOther) continue;

        const rotY = Math.atan2(nx, nz);

        // Calculate bay slots along the wall
        const margin = 1.5; // margin from building corners
        const usable = wallLen - 2 * margin;

        let bays = 1;
        let step = usable;
        if (usable >= 1.0) {
          bays = Math.max(1, Math.floor(usable / 3.6));
          step = usable / bays;
        }

        const centerBay = Math.floor(bays / 2);
        const hasEntrance = (i === primaryWallIdx || (wallLen > 18 && i % 2 === 0));

        // Place features bay by bay, vertically aligned on EVERY floor
        for (let k = 0; k < bays; k++) {
          const s = usable < 1.0 ? wallLen * 0.5 : margin + (k + 0.5) * step;
          const wx = p1.x + tx * s + nx * 0.045; // 4.5cm outward offset
          const wz = p1.z + tz * s + nz * 0.045;

          for (let fIdx = 0; fIdx < floorElevations.length; fIdx++) {
            const yElevation = floorElevations[fIdx];

            // --- GROUND FLOOR (fIdx === 0) ---
            if (fIdx === 0 && hasEntrance && k === centerBay) {
              if (isCommercial && shutterIdx < this.MAX_SHUTTERS) {
                // Commercial rolling shopfront shutter
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
              // --- ALL OTHER BAYS & ALL UPPER FLOORS: WIDE DOUBLE WINDOWS ---
              this.dummy.position.set(wx, yElevation, wz);
              this.dummy.rotation.set(0, rotY, 0);
              this.dummy.scale.set(1, 1, 1);
              this.dummy.updateMatrix();
              this.windowMesh.setMatrixAt(windowIdx++, this.dummy.matrix);
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
   * Dual-Casement Double Window (256 x 144)
   * Two side-by-side architectural glass casements with white frames,
   * sky reflection gradient, glass glare, top weather chajja, and bottom sill.
   */
  private createDoubleWindowTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 144;
    const ctx = canvas.getContext('2d')!;

    // 1. Top Concrete Sunshade / Weather Chajja Lintels
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, 256, 10);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(0, 10, 256, 4); // Chajja cast shadow

    // 2. Main Wall Reveal & Window Frame (Ivory / Off-White)
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(4, 14, 248, 118);

    // 3. Inner shadow reveal
    ctx.fillStyle = '#475569';
    ctx.fillRect(8, 18, 114, 110);  // Left Casement recess
    ctx.fillRect(134, 18, 114, 110); // Right Casement recess

    // 4. Glass Panes with Daylight Sky Reflection Gradient
    const glassGrad = ctx.createLinearGradient(0, 20, 0, 126);
    glassGrad.addColorStop(0, '#38bdf8');   // Daylight sky highlight
    glassGrad.addColorStop(0.35, '#0284c7');
    glassGrad.addColorStop(0.7, '#0f172a');  // Interior depth
    glassGrad.addColorStop(1, '#020617');

    // Left Casement Panes (Upper & Lower)
    ctx.fillStyle = glassGrad;
    ctx.fillRect(12, 22, 106, 48); // Upper Left
    ctx.fillRect(12, 76, 106, 48); // Lower Left

    // Right Casement Panes (Upper & Lower)
    ctx.fillRect(138, 22, 106, 48); // Upper Right
    ctx.fillRect(138, 76, 106, 48); // Lower Right

    // 5. Diagonal Glass Glare Sheen
    ctx.fillStyle = 'rgba(255, 255, 255, 0.26)';
    // Left glare
    ctx.beginPath();
    ctx.moveTo(12, 22);
    ctx.lineTo(55, 22);
    ctx.lineTo(12, 70);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(60, 22);
    ctx.lineTo(118, 22);
    ctx.lineTo(12, 124);
    ctx.closePath();
    ctx.fill();

    // Right glare
    ctx.beginPath();
    ctx.moveTo(138, 22);
    ctx.lineTo(180, 22);
    ctx.lineTo(138, 70);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(185, 22);
    ctx.lineTo(244, 22);
    ctx.lineTo(138, 124);
    ctx.closePath();
    ctx.fill();

    // 6. Sub-pane Transom divider bars (White)
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(8, 70, 114, 6);
    ctx.fillRect(134, 70, 114, 6);

    // 7. Center Mullion Post (Ivory Frame Divider)
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(122, 14, 12, 118);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(122, 14, 2, 118); // shadow line

    // 8. Bottom Concrete Window Sill
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, 132, 256, 8);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(0, 140, 256, 4); // Sill drop shadow

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
    canvas.width = 180;
    canvas.height = 220;
    const ctx = canvas.getContext('2d')!;

    // Steel frame
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 0, 180, 220);

    // Top Shutter Hood Box (Cyan Commercial Lintel)
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(8, 6, 164, 28);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('STORE', 90, 24);

    // Rolling Steel Shutter Slats
    for (let y = 38; y < 204; y += 8) {
      ctx.fillStyle = (y % 16 === 0) ? '#64748b' : '#94a3b8';
      ctx.fillRect(12, y, 156, 7);
      ctx.fillStyle = '#475569';
      ctx.fillRect(12, y + 6, 156, 1); // slat shadow
    }

    // Shutter Center Lock & Padlock
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(84, 192, 12, 10);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(88, 196, 4, 3); // brass lock

    // Bottom weather seal
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(8, 204, 164, 8);

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 2;
    return tex;
  }
}
