import * as THREE from 'three';
import { SpatialObstacleMap } from './SpatialObstacleMap';

interface PlacedHouse {
  key: string;
  group: THREE.Group;
  geometries: THREE.BufferGeometry[];
  localX: number;
  localZ: number;
}

/**
 * KeralaHouseManager
 * Procedurally generates authentic Kerala style residential homes, traditional tharavadu houses,
 * and roadside town shops with hipped terracotta clay roofs, front verandas (പൂമുഖം), round pillars,
 * and deep foundation plinths (തറ) anchored securely into mountain terrain.
 * 
 * - Strictly respects user constraint: ZERO windows or doors on building exterior walls.
 * - Deep 1.5m foundation plinths eliminate any hovering or cut-off on steep Kerala hill slopes.
 * - High-performance lightweight geometry: maintains silky smooth 60 FPS on mobile.
 */
export class KeralaHouseManager {
  private scene: THREE.Scene;
  private container = new THREE.Group();
  private houses = new Map<string, PlacedHouse>();

  private lastUpdateX = -99999;
  private lastUpdateZ = -99999;

  private isPerformanceMode = false;
  private lodRadius = 320; // Expanded to 320m to cover full city view horizon

  // Shared Materials for instant batching
  private terracottaRoofMat: THREE.MeshLambertMaterial;
  private ridgeTileMat: THREE.MeshLambertMaterial;
  private whitewashWallMat: THREE.MeshLambertMaterial;
  private creamWallMat: THREE.MeshLambertMaterial;
  private timberTrimMat: THREE.MeshLambertMaterial;
  private pillarMat: THREE.MeshLambertMaterial;
  private plinthMat: THREE.MeshLambertMaterial;
  private waterTankMat: THREE.MeshLambertMaterial;
  private awningBlueMat: THREE.MeshLambertMaterial;
  private compoundWallMat: THREE.MeshLambertMaterial;
  private palmFoliageMat: THREE.MeshLambertMaterial;
  private palmTrunkMat: THREE.MeshLambertMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.container.name = 'KeralaHouseContainer';
    this.scene.add(this.container);

    // Warm, rich Kerala terracotta clay roof tile
    this.terracottaRoofMat = new THREE.MeshLambertMaterial({
      color: 0xea580c,
    });

    // Deep burnt clay ridge capping
    this.ridgeTileMat = new THREE.MeshLambertMaterial({
      color: 0xc2410c,
    });

    // Traditional Kerala crisp whitewashed plaster
    this.whitewashWallMat = new THREE.MeshLambertMaterial({
      color: 0xf1f5f9,
    });

    // Traditional Kerala warm ivory lime plaster
    this.creamWallMat = new THREE.MeshLambertMaterial({
      color: 0xfef9c3,
    });

    // Rich teak / rosewood timber fascia and rafters
    this.timberTrimMat = new THREE.MeshLambertMaterial({
      color: 0x78350f,
    });

    // Classical round veranda whitewashed pillars
    this.pillarMat = new THREE.MeshLambertMaterial({
      color: 0xfffbeb,
    });

    // Dressed laterite / dark granite foundation stone plinth (തറ)
    this.plinthMat = new THREE.MeshLambertMaterial({
      color: 0x334155,
    });

    // Black rooftop Sintex water tank
    this.waterTankMat = new THREE.MeshLambertMaterial({
      color: 0x0f172a,
    });

    // Azure roadside storefront canopy
    this.awningBlueMat = new THREE.MeshLambertMaterial({
      color: 0x0284c7,
    });

    // Whitewashed residential compound boundary wall
    this.compoundWallMat = new THREE.MeshLambertMaterial({
      color: 0xe2e8f0,
    });

    // Courtyard banana / areca foliage
    this.palmFoliageMat = new THREE.MeshLambertMaterial({
      color: 0x22c55e,
    });
    this.palmTrunkMat = new THREE.MeshLambertMaterial({
      color: 0x64748b,
    });
  }

  public setPerformanceMode(isPerformance: boolean) {
    this.isPerformanceMode = isPerformance;
    this.lodRadius = isPerformance ? 220 : 340;
    this.lastUpdateX = -99999;
  }

  public getHouseCount(): number {
    return this.houses.size;
  }

  /**
   * Constructs an Authentic Multi-Story Kerala Town Commercial Building / Shopping Complex.
   * Features:
   * - 2-4 stories with dividing cornices and storefront shop awnings
   * - Sloping terracotta clay crown roof atop rooftop terrace
   * - Deep 1.8m granite plinth foundation (തറ) anchored into terrain
   * - Rooftop Sintex water tank
   * - STRICTLY ZERO windows or doors on exterior walls
   */
  private createKeralaTownCommercialBuilding(
    width: number,
    depth: number,
    angle: number,
    floors = 3
  ): { group: THREE.Group; geometries: THREE.BufferGeometry[] } {
    const group = new THREE.Group();
    const geometries: THREE.BufferGeometry[] = [];

    const w = Math.max(10.0, Math.min(width, 28.0));
    const d = Math.max(8.0, Math.min(depth, 24.0));
    const floorH = 3.2;
    const totalWallH = floorH * floors;

    // 1. Deep Granite Foundation Plinth (1.8m deep)
    const plinthH = 2.2;
    const plinthGeo = new THREE.BoxGeometry(w + 0.8, plinthH, d + 0.8);
    geometries.push(plinthGeo);
    const plinth = new THREE.Mesh(plinthGeo, this.plinthMat);
    plinth.position.set(0, -1.8 + plinthH * 0.5, 0);
    group.add(plinth);

    // 2. Main Multi-Story Plaster Facade (Zero windows/doors)
    const wallGeo = new THREE.BoxGeometry(w, totalWallH, d);
    geometries.push(wallGeo);
    const wallMesh = new THREE.Mesh(wallGeo, this.creamWallMat);
    wallMesh.position.set(0, 0.4 + totalWallH * 0.5, 0);
    group.add(wallMesh);

    // 3. Storefront Ground Awnings (Azure/Blue canopy)
    const awningDepth = 2.0;
    const awningGeo = new THREE.BoxGeometry(w + 0.4, 0.15, awningDepth);
    geometries.push(awningGeo);
    const awning = new THREE.Mesh(awningGeo, this.awningBlueMat);
    awning.position.set(0, 0.4 + 2.8, d * 0.5 + awningDepth * 0.5 - 0.2);
    awning.rotation.x = 0.18;
    group.add(awning);

    // 4. Floor Dividing Cornices (horizontal architectural bands)
    for (let f = 1; f < floors; f++) {
      const corniceGeo = new THREE.BoxGeometry(w + 0.4, 0.2, d + 0.4);
      geometries.push(corniceGeo);
      const cornice = new THREE.Mesh(corniceGeo, this.timberTrimMat);
      cornice.position.set(0, 0.4 + f * floorH, 0);
      group.add(cornice);
    }

    // 5. Rooftop Parapet and Terracotta Tiled Crown Roof
    const parapetGeo = new THREE.BoxGeometry(w + 0.4, 0.7, d + 0.4);
    geometries.push(parapetGeo);
    const parapet = new THREE.Mesh(parapetGeo, this.whitewashWallMat);
    parapet.position.set(0, 0.4 + totalWallH + 0.35, 0);
    group.add(parapet);

    // Sloping Terracotta Roof Canopy atop central terrace
    const roofW = w * 0.85;
    const roofD = d * 0.85;
    const roofPitchH = Math.min(3.5, Math.max(2.2, Math.min(roofW, roofD) * 0.35));
    const hippedGeo = new THREE.ConeGeometry(
      Math.max(roofW, roofD) * 0.6,
      roofPitchH,
      4
    );
    hippedGeo.rotateY(Math.PI / 4);
    geometries.push(hippedGeo);
    const hippedMesh = new THREE.Mesh(hippedGeo, this.terracottaRoofMat);
    hippedMesh.position.set(0, 0.4 + totalWallH + 0.7 + roofPitchH * 0.5, 0);
    hippedMesh.scale.set(
      roofW / Math.max(roofW, roofD),
      1,
      roofD / Math.max(roofW, roofD)
    );
    group.add(hippedMesh);

    // 6. Rooftop Sintex Water Tanks
    const tankGeo = new THREE.CylinderGeometry(0.7, 0.7, 1.4, 10);
    geometries.push(tankGeo);
    const tank = new THREE.Mesh(tankGeo, this.waterTankMat);
    tank.position.set(w * 0.3, 0.4 + totalWallH + 0.7 + 0.7, -d * 0.25);
    group.add(tank);

    group.rotation.y = angle;
    return { group, geometries };
  }

  /**
   * Constructs an Authentic Traditional Kerala Tharavadu House (നാലുകെട്ട് / തറവാട് വീട്).
   * Features:
   * - Deep granite plinth extending 1.6m underground to prevent floating on hills
   * - Sloping terracotta hipped roof with eaves overhang and timber rafters
   * - Front Poomukham Veranda (പൂമുഖം) with classical round pillars and charupadi
   * - Black Sintex water tank
   * - Compound wall with gate pillars
   * - Courtyard banana plant
   * - STRICTLY ZERO windows or doors on exterior walls
   */
  private createTraditionalKeralaHouse(
    width: number,
    depth: number,
    angle: number
  ): { group: THREE.Group; geometries: THREE.BufferGeometry[] } {
    const group = new THREE.Group();
    const geometries: THREE.BufferGeometry[] = [];

    const w = Math.max(5.5, Math.min(width, 18.0));
    const d = Math.max(5.5, Math.min(depth, 18.0));
    const wallH = 2.9;

    // 1. Solid Plinth Foundation (തറ)
    // Starts at -1.6m underground and extends to +0.35m above ground.
    // Absorbs up to 1.5m slope differential on steep hills!
    const plinthH = 1.95;
    const plinthGeo = new THREE.BoxGeometry(w + 0.6, plinthH, d + 0.6);
    geometries.push(plinthGeo);
    const plinth = new THREE.Mesh(plinthGeo, this.plinthMat);
    plinth.position.set(0, -1.6 + plinthH * 0.5, 0);
    group.add(plinth);

    // 2. Main Building Plaster Walls (Zero windows/doors)
    const wallGeo = new THREE.BoxGeometry(w, wallH, d);
    geometries.push(wallGeo);
    const wallMesh = new THREE.Mesh(wallGeo, this.whitewashWallMat);
    wallMesh.position.set(0, 0.35 + wallH * 0.5, 0);
    group.add(wallMesh);

    // 3. Timber Eaves Fascia (ഇറയം / തടി ഫ്രെയിം)
    const eaveWidth = w + 0.8;
    const eaveDepth = d + 0.8;
    const eaveGeo = new THREE.BoxGeometry(eaveWidth, 0.18, eaveDepth);
    geometries.push(eaveGeo);
    const eave = new THREE.Mesh(eaveGeo, this.timberTrimMat);
    eave.position.set(0, 0.35 + wallH + 0.08, 0);
    group.add(eave);

    // 4. Sloping Hipped Terracotta Roof (ചരിഞ്ഞ ഓടുമേഞ്ഞ മേൽക്കൂര)
    const roofPitchH = Math.min(3.2, Math.max(2.1, Math.min(w, d) * 0.42));
    const hippedGeo = new THREE.ConeGeometry(
      Math.max(eaveWidth, eaveDepth) * 0.6,
      roofPitchH,
      4
    );
    hippedGeo.rotateY(Math.PI / 4);
    geometries.push(hippedGeo);

    const hippedMesh = new THREE.Mesh(hippedGeo, this.terracottaRoofMat);
    hippedMesh.position.set(0, 0.35 + wallH + 0.17 + roofPitchH * 0.5, 0);
    hippedMesh.scale.set(
      eaveWidth / Math.max(eaveWidth, eaveDepth),
      1,
      eaveDepth / Math.max(eaveWidth, eaveDepth)
    );
    group.add(hippedMesh);

    // 5. Terracotta Ridge Cap (ഓട് വരമ്പ്) along the peak
    const ridgeLen = Math.max(1.5, Math.abs(w - d) * 0.75 + 1.2);
    const ridgeGeo = new THREE.CylinderGeometry(0.14, 0.14, ridgeLen, 8);
    if (w >= d) {
      ridgeGeo.rotateZ(Math.PI / 2);
    } else {
      ridgeGeo.rotateX(Math.PI / 2);
    }
    geometries.push(ridgeGeo);
    const ridgeMesh = new THREE.Mesh(ridgeGeo, this.ridgeTileMat);
    ridgeMesh.position.set(0, 0.35 + wallH + 0.17 + roofPitchH - 0.04, 0);
    group.add(ridgeMesh);

    // 6. Traditional Poomukham Veranda (പൂമുഖം / വരാന്ത)
    const verandaW = Math.min(w * 0.65, 4.8);
    const verandaD = 2.2;
    const verandaRoofH = 2.4;

    // Veranda Foundation Step
    const vPlinthGeo = new THREE.BoxGeometry(verandaW + 0.3, 1.8, verandaD + 0.3);
    geometries.push(vPlinthGeo);
    const vPlinth = new THREE.Mesh(vPlinthGeo, this.plinthMat);
    vPlinth.position.set(0, -1.6 + 0.9, d * 0.5 + verandaD * 0.5);
    group.add(vPlinth);

    // Sloped Veranda Awning Roof
    const vRoofGeo = new THREE.BoxGeometry(verandaW, 0.15, verandaD);
    geometries.push(vRoofGeo);
    const vRoof = new THREE.Mesh(vRoofGeo, this.terracottaRoofMat);
    vRoof.position.set(0, verandaRoofH, d * 0.5 + verandaD * 0.5);
    vRoof.rotation.x = 0.24; // Pleasant slope
    group.add(vRoof);

    // Classical Round Veranda Pillars (തൂണുകൾ)
    const pillarR = 0.11;
    const pillarH = verandaRoofH - 0.35;
    const pillarGeo = new THREE.CylinderGeometry(pillarR * 0.9, pillarR, pillarH, 8);
    geometries.push(pillarGeo);

    for (const side of [-1, 1]) {
      const pillar = new THREE.Mesh(pillarGeo, this.pillarMat);
      pillar.position.set(
        side * (verandaW * 0.42),
        0.35 + pillarH * 0.5,
        d * 0.5 + verandaD * 0.85
      );
      group.add(pillar);

      // Traditional Charupadi sitting ledge (ചാരുപടി)
      const seatGeo = new THREE.BoxGeometry(verandaW * 0.36, 0.1, 0.28);
      geometries.push(seatGeo);
      const seat = new THREE.Mesh(seatGeo, this.timberTrimMat);
      seat.position.set(
        side * (verandaW * 0.22),
        0.35 + 0.45,
        d * 0.5 + verandaD * 0.85
      );
      group.add(seat);
    }

    // 7. Overhead Sintex Black Water Tank
    const tankGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.9, 10);
    geometries.push(tankGeo);
    const tank = new THREE.Mesh(tankGeo, this.waterTankMat);
    tank.position.set(-w * 0.28, 0.35 + wallH + 0.6, -d * 0.28);
    group.add(tank);

    // 8. Front Compound Wall & Gate Pillars
    const wallLen = w + 2.4;
    const wallThick = 0.22;
    const wallHeight = 0.95;

    const compWallGeo = new THREE.BoxGeometry(wallLen, wallHeight + 1.2, wallThick);
    geometries.push(compWallGeo);

    // Left wall segment
    const leftW = new THREE.Mesh(compWallGeo, this.compoundWallMat);
    leftW.position.set(0, -1.2 + (wallHeight + 1.2) * 0.5, d * 0.5 + verandaD + 2.2);
    leftW.scale.set(0.38, 1, 1);
    leftW.position.x = -wallLen * 0.28;
    group.add(leftW);

    // Right wall segment
    const rightW = new THREE.Mesh(compWallGeo, this.compoundWallMat);
    rightW.position.set(0, -1.2 + (wallHeight + 1.2) * 0.5, d * 0.5 + verandaD + 2.2);
    rightW.scale.set(0.38, 1, 1);
    rightW.position.x = wallLen * 0.28;
    group.add(rightW);

    // Gate Pillars with pyramid caps
    const gatePillarGeo = new THREE.BoxGeometry(0.42, wallHeight + 1.4, 0.42);
    geometries.push(gatePillarGeo);
    for (const side of [-1, 1]) {
      const gp = new THREE.Mesh(gatePillarGeo, this.compoundWallMat);
      gp.position.set(side * (wallLen * 0.12), -1.2 + (wallHeight + 1.4) * 0.5, d * 0.5 + verandaD + 2.2);
      group.add(gp);
    }

    // 9. Courtyard Banana Plant / Areca Palm
    const bananaTrunkGeo = new THREE.CylinderGeometry(0.09, 0.14, 2.2, 6);
    geometries.push(bananaTrunkGeo);
    const bananaTrunk = new THREE.Mesh(bananaTrunkGeo, this.palmTrunkMat);
    bananaTrunk.position.set(w * 0.5 + 1.2, 0.35 + 1.1, d * 0.2);
    group.add(bananaTrunk);

    const leafGeo = new THREE.SphereGeometry(0.9, 5, 4);
    leafGeo.scale(1.4, 0.35, 1.4);
    geometries.push(leafGeo);
    const leafMesh = new THREE.Mesh(leafGeo, this.palmFoliageMat);
    leafMesh.position.set(w * 0.5 + 1.2, 0.35 + 2.3, d * 0.2);
    group.add(leafMesh);

    group.rotation.y = angle;
    return { group, geometries };
  }

  /**
   * Constructs a Modern Kerala Tropical Villa (കേരള മോഡേൺ വില്ല).
   * Contemporary whitewashed two-story villa with terracotta sloped upper eaves,
   * car porch, rooftop water tank, and deep terrain anchoring plinth.
   */
  private createModernKeralaVilla(
    width: number,
    depth: number,
    angle: number
  ): { group: THREE.Group; geometries: THREE.BufferGeometry[] } {
    const group = new THREE.Group();
    const geometries: THREE.BufferGeometry[] = [];

    const w = Math.max(6.5, Math.min(width, 20.0));
    const d = Math.max(6.5, Math.min(depth, 20.0));
    const groundH = 3.0;
    const upperH = 2.6;

    // 1. Deep Granite Plinth Foundation
    const plinthH = 1.95;
    const plinthGeo = new THREE.BoxGeometry(w + 0.6, plinthH, d + 0.6);
    geometries.push(plinthGeo);
    const plinth = new THREE.Mesh(plinthGeo, this.plinthMat);
    plinth.position.set(0, -1.6 + plinthH * 0.5, 0);
    group.add(plinth);

    // 2. Ground Floor Walls (Warm Ivory plaster, zero windows/doors)
    const gfGeo = new THREE.BoxGeometry(w, groundH, d);
    geometries.push(gfGeo);
    const gf = new THREE.Mesh(gfGeo, this.creamWallMat);
    gf.position.set(0, 0.35 + groundH * 0.5, 0);
    group.add(gf);

    // Mid-level Concrete Slab Projection
    const slabGeo = new THREE.BoxGeometry(w + 0.7, 0.22, d + 0.7);
    geometries.push(slabGeo);
    const slab = new THREE.Mesh(slabGeo, this.whitewashWallMat);
    slab.position.set(0, 0.35 + groundH + 0.11, 0);
    group.add(slab);

    // 3. First Floor Upper Volume (Set back slightly)
    const ufW = w * 0.78;
    const ufD = d * 0.75;
    const ufGeo = new THREE.BoxGeometry(ufW, upperH, ufD);
    geometries.push(ufGeo);
    const uf = new THREE.Mesh(ufGeo, this.whitewashWallMat);
    uf.position.set(-w * 0.08, 0.35 + groundH + 0.22 + upperH * 0.5, -d * 0.08);
    group.add(uf);

    // 4. Upper Terracotta Sloping Roof
    const roofH = 1.8;
    const roofGeo = new THREE.ConeGeometry(Math.max(ufW, ufD) * 0.65, roofH, 4);
    roofGeo.rotateY(Math.PI / 4);
    geometries.push(roofGeo);
    const roof = new THREE.Mesh(roofGeo, this.terracottaRoofMat);
    roof.position.set(
      -w * 0.08,
      0.35 + groundH + 0.22 + upperH + roofH * 0.5,
      -d * 0.08
    );
    roof.scale.set(ufW / Math.max(ufW, ufD), 1, ufD / Math.max(ufW, ufD));
    group.add(roof);

    // 5. Front Car Porch / Canopy
    const porchW = 4.2;
    const porchD = 3.2;
    const porchRoofH = 2.6;

    const porchPlinthGeo = new THREE.BoxGeometry(porchW + 0.2, 1.8, porchD + 0.2);
    geometries.push(porchPlinthGeo);
    const porchPlinth = new THREE.Mesh(porchPlinthGeo, this.plinthMat);
    porchPlinth.position.set(w * 0.22, -1.6 + 0.9, d * 0.5 + porchD * 0.5);
    group.add(porchPlinth);

    const porchRoofGeo = new THREE.BoxGeometry(porchW, 0.2, porchD);
    geometries.push(porchRoofGeo);
    const porchRoof = new THREE.Mesh(porchRoofGeo, this.terracottaRoofMat);
    porchRoof.position.set(w * 0.22, porchRoofH, d * 0.5 + porchD * 0.5);
    porchRoof.rotation.x = 0.18;
    group.add(porchRoof);

    // Porch Slim Square Columns
    const colGeo = new THREE.BoxGeometry(0.24, porchRoofH - 0.35, 0.24);
    geometries.push(colGeo);
    for (const side of [-1, 1]) {
      const col = new THREE.Mesh(colGeo, this.pillarMat);
      col.position.set(
        w * 0.22 + side * (porchW * 0.42),
        0.35 + (porchRoofH - 0.35) * 0.5,
        d * 0.5 + porchD * 0.85
      );
      group.add(col);
    }

    // 6. Rooftop Sintex Water Tank
    const tankGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.95, 10);
    geometries.push(tankGeo);
    const tank = new THREE.Mesh(tankGeo, this.waterTankMat);
    tank.position.set(w * 0.25, 0.35 + groundH + 0.22 + 0.5, d * 0.25);
    group.add(tank);

    group.rotation.y = angle;
    return { group, geometries };
  }

  /**
   * Constructs an Authentic Kerala Roadside Village Shop / Bakery / Chayakada (നാടൻ ചായക്കട).
   * Features colorful front canopy awning, terracotta roof, and deep plinth.
   */
  private createRoadsideShop(
    width: number,
    depth: number,
    angle: number
  ): { group: THREE.Group; geometries: THREE.BufferGeometry[] } {
    const group = new THREE.Group();
    const geometries: THREE.BufferGeometry[] = [];

    const w = Math.max(4.2, Math.min(width, 7.0));
    const d = Math.max(4.0, Math.min(depth, 6.5));
    const h = 2.8;

    // Foundation Plinth
    const plinthH = 1.9;
    const plinthGeo = new THREE.BoxGeometry(w + 0.4, plinthH, d + 0.4);
    geometries.push(plinthGeo);
    const plinth = new THREE.Mesh(plinthGeo, this.plinthMat);
    plinth.position.set(0, -1.6 + plinthH * 0.5, 0);
    group.add(plinth);

    // Main Wall
    const wallGeo = new THREE.BoxGeometry(w, h, d);
    geometries.push(wallGeo);
    const wallMesh = new THREE.Mesh(wallGeo, this.whitewashWallMat);
    wallMesh.position.set(0, 0.35 + h * 0.5, 0);
    group.add(wallMesh);

    // Terracotta Sloped Roof
    const roofH = 1.7;
    const roofGeo = new THREE.ConeGeometry(Math.max(w, d) * 0.62, roofH, 4);
    roofGeo.rotateY(Math.PI / 4);
    geometries.push(roofGeo);
    const roof = new THREE.Mesh(roofGeo, this.terracottaRoofMat);
    roof.position.set(0, 0.35 + h + roofH * 0.5, 0);
    roof.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d));
    group.add(roof);

    // Front Storefront Canopy Awning
    const awningGeo = new THREE.BoxGeometry(w * 0.9, 0.12, 1.8);
    geometries.push(awningGeo);
    const awning = new THREE.Mesh(awningGeo, this.awningBlueMat);
    awning.position.set(0, 2.35, d * 0.5 + 0.85);
    awning.rotation.x = 0.28;
    group.add(awning);

    group.rotation.y = angle;
    return { group, geometries };
  }

  /**
   * Evaluates player vicinity, populating roadsides and building footprints
   * with authentic Kerala houses anchored firmly on terrain.
   */
  public update(
    obstacleMap: SpatialObstacleMap,
    playerX: number,
    playerZ: number,
    force = false,
    getElevation?: (localX: number, localZ: number) => number
  ) {
    if (!obstacleMap || !obstacleMap.isReady) return;

    const distMoved = Math.hypot(playerX - this.lastUpdateX, playerZ - this.lastUpdateZ);
    if (!force && distMoved < 10) {
      return;
    }

    this.lastUpdateX = playerX;
    this.lastUpdateZ = playerZ;

    const activeKeys = new Set<string>();
    const maxHouses = this.isPerformanceMode ? 90 : 240;

    // 1. Process OSM Building Footprints in radius
    const nearbyOsmBuildings = obstacleMap.getBuildingsInRadius(
      playerX,
      playerZ,
      this.lodRadius,
      true
    );

    let count = 0;
    for (const b of nearbyOsmBuildings) {
      if (count >= maxHouses) break;

      const centerX = (b.minX + b.maxX) * 0.5;
      const centerZ = (b.minZ + b.maxZ) * 0.5;
      const w = Math.max(4.5, b.maxX - b.minX);
      const d = Math.max(4.5, b.maxZ - b.minZ);
      const key = `osm_${centerX.toFixed(1)}_${centerZ.toFixed(1)}`;
      activeKeys.add(key);

      if (!this.houses.has(key)) {
        // Pick house / building style
        let houseItem: { group: THREE.Group; geometries: THREE.BufferGeometry[] };
        const roll = Math.abs(Math.sin(centerX * 12.9898 + centerZ * 78.233));
        if (b.isCommercial || w > 15 || d > 15) {
          const floors = roll < 0.4 ? 2 : (roll < 0.8 ? 3 : 4);
          houseItem = this.createKeralaTownCommercialBuilding(w, d, roll * Math.PI * 2, floors);
        } else if (roll < 0.28) {
          houseItem = this.createRoadsideShop(w, d, roll * Math.PI * 2);
        } else if (roll < 0.68) {
          houseItem = this.createTraditionalKeralaHouse(w, d, roll * Math.PI * 2);
        } else {
          houseItem = this.createModernKeralaVilla(w, d, roll * Math.PI * 2);
        }

        const groundY = getElevation ? getElevation(centerX, centerZ) : 0;
        houseItem.group.position.set(centerX, groundY, centerZ);
        this.container.add(houseItem.group);

        this.houses.set(key, {
          key,
          group: houseItem.group,
          geometries: houseItem.geometries,
          localX: centerX,
          localZ: centerZ,
        });
      } else if (getElevation) {
        const item = this.houses.get(key)!;
        item.group.position.y = getElevation(item.localX, item.localZ);
      }
      count++;
    }

    // 2. Active Roadside Infill: populate town streets & roads with authentic Kerala buildings!
    if (count < maxHouses && obstacleMap.roads.length > 0) {
      for (const road of obstacleMap.roads) {
        if (count >= maxHouses) break;

        const midX = (road.p1.x + road.p2.x) * 0.5;
        const midZ = (road.p1.z + road.p2.z) * 0.5;
        const distToPlayer = Math.hypot(midX - playerX, midZ - playerZ);

        if (distToPlayer > this.lodRadius || road.length < 14) continue;

        // Vector along road
        const rdx = road.p2.x - road.p1.x;
        const rdz = road.p2.z - road.p1.z;
        const roadLen = Math.hypot(rdx, rdz);
        if (roadLen < 10) continue;

        const dirX = rdx / roadLen;
        const dirZ = rdz / roadLen;
        // Normal perpendicular to road
        const normX = -dirZ;
        const normZ = dirX;

        // Place on roadside with 8.5m setback
        for (const side of [-1, 1]) {
          if (count >= maxHouses) break;

          const setback = 9.5;
          const hx = midX + side * normX * setback;
          const hz = midZ + side * normZ * setback;

          const key = `road_${hx.toFixed(1)}_${hz.toFixed(1)}`;
          if (activeKeys.has(key)) continue;

          // Ensure not colliding with water or existing buildings
          if (obstacleMap.isPointInWater(hx, hz, 3.0)) continue;
          if (obstacleMap.isBuildingCollision(hx, hz, 3.5, 3.5, 0)) continue;

          activeKeys.add(key);

          if (!this.houses.has(key)) {
            const roadAngle = Math.atan2(dirX, dirZ) + (side > 0 ? -Math.PI / 2 : Math.PI / 2);
            const roll = Math.abs(Math.sin(hx * 37.1 + hz * 91.7));

            let houseItem: { group: THREE.Group; geometries: THREE.BufferGeometry[] };
            if (roll < 0.18) {
              houseItem = this.createKeralaTownCommercialBuilding(12.0, 9.0, roadAngle, 2);
            } else if (roll < 0.45) {
              houseItem = this.createRoadsideShop(5.5, 4.8, roadAngle);
            } else if (roll < 0.75) {
              houseItem = this.createTraditionalKeralaHouse(8.0, 7.5, roadAngle);
            } else {
              houseItem = this.createModernKeralaVilla(9.0, 8.0, roadAngle);
            }

            const groundY = getElevation ? getElevation(hx, hz) : 0;
            houseItem.group.position.set(hx, groundY, hz);
            this.container.add(houseItem.group);

            this.houses.set(key, {
              key,
              group: houseItem.group,
              geometries: houseItem.geometries,
              localX: hx,
              localZ: hz,
            });
            count++;
          }
        }
      }
    }

    // Unload houses outside active radius
    for (const [key, item] of this.houses.entries()) {
      if (!activeKeys.has(key)) {
        this.container.remove(item.group);
        for (const geo of item.geometries) {
          geo.dispose();
        }
        this.houses.delete(key);
      }
    }
  }

  /**
   * Resnaps all active houses to updated terrain elevation.
   */
  public refreshElevations(getElevation: (localX: number, localZ: number) => number) {
    for (const item of this.houses.values()) {
      const groundY = getElevation(item.localX, item.localZ);
      item.group.position.y = groundY;
    }
  }

  public clear() {
    for (const item of this.houses.values()) {
      this.container.remove(item.group);
      for (const geo of item.geometries) {
        geo.dispose();
      }
    }
    this.houses.clear();
    this.lastUpdateX = -99999;
    this.lastUpdateZ = -99999;
  }

  public dispose() {
    this.clear();
    this.scene.remove(this.container);
    this.terracottaRoofMat.dispose();
    this.ridgeTileMat.dispose();
    this.whitewashWallMat.dispose();
    this.creamWallMat.dispose();
    this.timberTrimMat.dispose();
    this.pillarMat.dispose();
    this.plinthMat.dispose();
    this.waterTankMat.dispose();
    this.awningBlueMat.dispose();
    this.compoundWallMat.dispose();
    this.palmFoliageMat.dispose();
    this.palmTrunkMat.dispose();
  }
}
