import * as THREE from 'three';
import { SpatialObstacleMap } from './SpatialObstacleMap';
import { ZoneProfileRegistry } from '../core/ZoneProfileRegistry';
import { KeralaZoneType } from '../core/ZoneClassifier';

// Simple seeded pseudo-random generator
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * SnapTreeGenerator
 * Stylized Low-Poly Coniferous Trees Engine inspired by PolyOne Studio's
 * "Plants Pack - Coniferous Trees":
 * 1. AlpineFir (Grand Pine / Alpine Fir with 5-6 tiered drooping needle skirts & dry branch spurs)
 * 2. ScotsPine (Dense Scots Pine / Douglas Fir with full lush drooping needle foliage)
 * 3. ColumnarCypress (Pencil Pine / Italian Cypress - tall slender faceted flame)
 * 4. ForestFir (Classic balanced mountain fir with 4 needle tiers)
 * 5. PineSapling (Young spruce sapling with bright spring-green tips)
 * 6. SnagPine (Weathered bare dead conifer with horizontal jagged dry branches)
 * 7. ConiferBush (Faceted low-poly evergreen foliage bush)
 * 8. ForestFloorDetails (Stylized low-poly grass clumps & forest mushrooms)
 */
export class SnapTreeGenerator {
  // Shared Material Cache - Crisp Low-Poly Faceted Shading (PolyOne Studio Style)
  private static trunkMatCedar = new THREE.MeshLambertMaterial({ color: 0xb45309, flatShading: true });
  private static trunkMatAmber = new THREE.MeshLambertMaterial({ color: 0xa16207, flatShading: true });
  private static trunkMatDark = new THREE.MeshLambertMaterial({ color: 0x78350f, flatShading: true });
  private static trunkMatWeathered = new THREE.MeshLambertMaterial({ color: 0x854d0e, flatShading: true });
  private static spurMat = new THREE.MeshLambertMaterial({ color: 0xd97706, flatShading: true });

  // Coniferous Needle Foliage Tiers - Rich, vibrant stylized low-poly palette
  private static leafMatLime = new THREE.MeshLambertMaterial({ color: 0x4ade80, flatShading: true });
  private static leafMatVibrant = new THREE.MeshLambertMaterial({ color: 0x22c55e, flatShading: true });
  private static leafMatMid = new THREE.MeshLambertMaterial({ color: 0x16a34a, flatShading: true });
  private static leafMatDeep = new THREE.MeshLambertMaterial({ color: 0x15803d, flatShading: true });
  private static leafMatNordic = new THREE.MeshLambertMaterial({ color: 0x14532d, flatShading: true });
  private static leafMatMossy = new THREE.MeshLambertMaterial({ color: 0x65a30d, flatShading: true });

  // Understory & Forest Floor Materials
  private static grassMat = new THREE.MeshLambertMaterial({ color: 0x22c55e, flatShading: true });
  private static grassLightMat = new THREE.MeshLambertMaterial({ color: 0x4ade80, flatShading: true });
  private static shroomStemMat = new THREE.MeshLambertMaterial({ color: 0xf3f4f6, flatShading: true });
  private static shroomRedMat = new THREE.MeshLambertMaterial({ color: 0xef4444, flatShading: true });
  private static shroomBlueMat = new THREE.MeshLambertMaterial({ color: 0x0284c7, flatShading: true });
  private static shroomCreamMat = new THREE.MeshLambertMaterial({ color: 0xfde047, flatShading: true });

  private static shadowMat = new THREE.MeshBasicMaterial({
    color: 0x112200,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });

  // Base tier geometry templates (cloned on demand for leak-free disposal)
  private static tierTemplateCache = new Map<string, THREE.BufferGeometry>();

  /**
   * Procedural Coniferous Tier Geometry Generator
   * Generates a faceted conical needle skirt with downward-drooping peaks/teeth along the rim.
   */
  private static getTierGeometry(bottomR: number, height: number, droop: number, segs = 7): THREE.BufferGeometry {
    const key = `${bottomR.toFixed(2)}_${height.toFixed(2)}_${droop.toFixed(2)}_${segs}`;
    let template = this.tierTemplateCache.get(key);

    if (!template) {
      const geo = new THREE.BufferGeometry();
      const positions: number[] = [];
      const indices: number[] = [];

      // Vertex 0: Apex
      positions.push(0, height, 0);
      // Vertex 1: Bottom center (seals underside)
      positions.push(0, 0, 0);

      const numPoints = segs * 2;
      for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        const isPeak = i % 2 === 0;
        const r = isPeak ? bottomR : bottomR * 0.72;
        const y = isPeak ? -droop : droop * 0.3;
        positions.push(Math.sin(angle) * r, y, Math.cos(angle) * r);
      }

      // Outer cone faces: from apex (0) to rim
      for (let i = 0; i < numPoints; i++) {
        const curr = 2 + i;
        const next = 2 + ((i + 1) % numPoints);
        indices.push(0, next, curr);
      }

      // Underside faces: from center (1) to rim
      for (let i = 0; i < numPoints; i++) {
        const curr = 2 + i;
        const next = 2 + ((i + 1) % numPoints);
        indices.push(1, curr, next);
      }

      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setIndex(indices);
      template = geo.toNonIndexed();
      template.computeVertexNormals();
      this.tierTemplateCache.set(key, template);
    }

    return template.clone();
  }

  /**
   * Dry Branch Spur Generator
   * Creates the signature horizontal twigs/spurs extending from the lower trunk
   */
  private static createSpur(length: number, angleY: number, angleZ = 0.08, hasSubBranch = false): THREE.Group {
    const spurGroup = new THREE.Group();
    const geo = new THREE.CylinderGeometry(0.02, 0.055, length, 4);
    geo.rotateZ(Math.PI / 2);
    geo.translate(length / 2, 0, 0);
    const spur = new THREE.Mesh(geo, this.spurMat);
    spurGroup.add(spur);

    if (hasSubBranch && length > 1.1) {
      const subGeo = new THREE.CylinderGeometry(0.015, 0.035, length * 0.45, 4);
      subGeo.rotateZ(Math.PI / 2);
      subGeo.translate(length * 0.22, 0, 0);
      const sub = new THREE.Mesh(subGeo, this.spurMat);
      sub.position.set(length * 0.5, 0, 0);
      sub.rotation.y = 0.6;
      spurGroup.add(sub);
    }

    spurGroup.rotation.y = angleY;
    spurGroup.rotation.z = angleZ;
    return spurGroup;
  }

  /**
   * Understory Forest Floor Details (Grass Tufts & Mushrooms)
   */
  public static createForestFloorDetails(scale = 1.0): THREE.Group {
    const details = new THREE.Group();

    // Grass clump blades
    const bladeGeo = new THREE.ConeGeometry(0.06 * scale, 0.5 * scale, 3);
    const bladeCount = 5;
    for (let b = 0; b < bladeCount; b++) {
      const angle = (b / bladeCount) * Math.PI * 2;
      const blade = new THREE.Mesh(bladeGeo, b % 2 === 0 ? this.grassMat : this.grassLightMat);
      blade.position.set(Math.sin(angle) * 0.3 * scale, 0.25 * scale, Math.cos(angle) * 0.3 * scale);
      blade.rotation.z = (Math.random() - 0.5) * 0.4;
      blade.rotation.x = (Math.random() - 0.5) * 0.4;
      details.add(blade);
    }

    // Little forest mushrooms
    const shroomCapGeo = new THREE.SphereGeometry(0.12 * scale, 5, 4, 0, Math.PI * 2, 0, Math.PI / 2);
    const shroomStemGeo = new THREE.CylinderGeometry(0.025 * scale, 0.04 * scale, 0.22 * scale, 4);

    const shroomMats = [this.shroomRedMat, this.shroomBlueMat, this.shroomCreamMat];
    const shroomCount = 2 + Math.floor(Math.random() * 2);

    for (let s = 0; s < shroomCount; s++) {
      const sa = (s / shroomCount) * Math.PI * 2 + 0.4;
      const dist = (0.45 + Math.random() * 0.35) * scale;
      const shroom = new THREE.Group();

      const stem = new THREE.Mesh(shroomStemGeo, this.shroomStemMat);
      stem.position.y = 0.11 * scale;
      shroom.add(stem);

      const cap = new THREE.Mesh(shroomCapGeo, shroomMats[s % shroomMats.length]);
      cap.position.y = 0.22 * scale;
      shroom.add(cap);

      shroom.position.set(Math.sin(sa) * dist, 0, Math.cos(sa) * dist);
      shroom.rotation.y = Math.random() * Math.PI * 2;
      details.add(shroom);
    }

    return details;
  }

  // =========================================================================
  // 1. AlpineFir (Grand Pine / Alpine Fir with 5 Tiers & Lower Dry Branch Spurs)
  // =========================================================================
  public static createAlpineFirTreeModel(scale = 1.0): THREE.Group {
    const tree = new THREE.Group();
    tree.name = 'polyone_alpine_fir';

    // Tall warm cedar trunk with subtle curve
    const trunkHeight = 12.8 * scale;
    const trunkGeo = new THREE.CylinderGeometry(0.18 * scale, 0.42 * scale, trunkHeight, 6);
    const trunk = new THREE.Mesh(trunkGeo, this.trunkMatCedar);
    trunk.position.y = (trunkHeight / 2);
    trunk.rotation.z = 0.02;
    tree.add(trunk);

    // Dry branch spurs on lower bare trunk
    const spurY = [2.2, 2.9, 3.6, 4.3];
    const spurAngles = [0.4, 2.1, 3.8, 5.3];
    const spurLengths = [1.3, 1.6, 1.1, 1.4];
    for (let i = 0; i < spurY.length; i++) {
      const spur = this.createSpur(spurLengths[i] * scale, spurAngles[i], (i % 2 === 0 ? 0.07 : -0.05), i === 1);
      spur.position.set(0, spurY[i] * scale, 0);
      tree.add(spur);
    }

    // 5-tiered jagged coniferous needle skirts
    const tiers = [
      { y: 5.0 * scale, r: 2.3 * scale, h: 2.2 * scale, d: 0.55 * scale, mat: this.leafMatDeep },
      { y: 6.7 * scale, r: 1.95 * scale, h: 2.1 * scale, d: 0.50 * scale, mat: this.leafMatMid },
      { y: 8.3 * scale, r: 1.55 * scale, h: 2.0 * scale, d: 0.45 * scale, mat: this.leafMatVibrant },
      { y: 9.8 * scale, r: 1.20 * scale, h: 1.8 * scale, d: 0.40 * scale, mat: this.leafMatVibrant },
      { y: 11.2 * scale, r: 0.80 * scale, h: 1.8 * scale, d: 0.35 * scale, mat: this.leafMatLime },
    ];

    tiers.forEach((t) => {
      const tierMesh = new THREE.Mesh(this.getTierGeometry(t.r, t.h, t.d, 7), t.mat);
      tierMesh.position.y = t.y;
      tierMesh.rotation.y = Math.random() * Math.PI;
      tree.add(tierMesh);
    });

    // Circular ground shadow
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(2.6 * scale, 12), this.shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.06;
    tree.add(shadow);

    // Forest floor accent
    tree.add(this.createForestFloorDetails(scale));

    return tree;
  }

  // =========================================================================
  // 2. ScotsPine (Dense Scots Pine / Douglas Fir with Full Needle Overhang)
  // =========================================================================
  public static createScotsPineTreeModel(scale = 1.0): THREE.Group {
    const tree = new THREE.Group();
    tree.name = 'polyone_scots_pine';

    const trunkHeight = 10.5 * scale;
    const trunkGeo = new THREE.CylinderGeometry(0.22 * scale, 0.46 * scale, trunkHeight, 6);
    const trunk = new THREE.Mesh(trunkGeo, this.trunkMatAmber);
    trunk.position.y = (trunkHeight / 2);
    trunk.rotation.z = -0.03;
    tree.add(trunk);

    // Dry branch spurs
    const spurs = [
      { y: 2.0 * scale, len: 1.4 * scale, rotY: 1.0 },
      { y: 2.7 * scale, len: 1.7 * scale, rotY: 3.2 },
      { y: 3.4 * scale, len: 1.2 * scale, rotY: 5.0 },
    ];
    spurs.forEach((s, idx) => {
      const sp = this.createSpur(s.len, s.rotY, idx % 2 === 0 ? 0.08 : -0.06, idx === 1);
      sp.position.set(0, s.y, 0);
      tree.add(sp);
    });

    // 4 wide, lush needle tiers
    const tiers = [
      { y: 4.2 * scale, r: 2.6 * scale, h: 2.3 * scale, d: 0.60 * scale, mat: this.leafMatNordic },
      { y: 5.9 * scale, r: 2.1 * scale, h: 2.2 * scale, d: 0.52 * scale, mat: this.leafMatMossy },
      { y: 7.5 * scale, r: 1.6 * scale, h: 2.0 * scale, d: 0.46 * scale, mat: this.leafMatMid },
      { y: 9.0 * scale, r: 1.0 * scale, h: 1.9 * scale, d: 0.38 * scale, mat: this.leafMatVibrant },
    ];

    tiers.forEach((t) => {
      const tierMesh = new THREE.Mesh(this.getTierGeometry(t.r, t.h, t.d, 8), t.mat);
      tierMesh.position.y = t.y;
      tierMesh.rotation.y = Math.random() * Math.PI;
      tree.add(tierMesh);
    });

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(2.9 * scale, 12), this.shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.06;
    tree.add(shadow);

    tree.add(this.createForestFloorDetails(scale));

    return tree;
  }

  // =========================================================================
  // 3. ColumnarCypress (Pencil Pine / Italian Cypress - Slender Faceted Spire)
  // =========================================================================
  public static createColumnarCypressModel(scale = 1.0): THREE.Group {
    const tree = new THREE.Group();
    tree.name = 'polyone_columnar_cypress';

    // Short visible base trunk
    const trunkH = 1.4 * scale;
    const trunkGeo = new THREE.CylinderGeometry(0.18 * scale, 0.26 * scale, trunkH, 6);
    const trunk = new THREE.Mesh(trunkGeo, this.trunkMatDark);
    trunk.position.y = trunkH / 2;
    tree.add(trunk);

    // Slender tall flame-like faceted conifer spire
    const tiers = [
      { y: 1.2 * scale, r: 0.92 * scale, h: 2.4 * scale, d: 0.25 * scale, mat: this.leafMatDeep },
      { y: 3.0 * scale, r: 0.88 * scale, h: 2.3 * scale, d: 0.22 * scale, mat: this.leafMatMid },
      { y: 4.8 * scale, r: 0.76 * scale, h: 2.2 * scale, d: 0.20 * scale, mat: this.leafMatVibrant },
      { y: 6.5 * scale, r: 0.55 * scale, h: 2.2 * scale, d: 0.16 * scale, mat: this.leafMatVibrant },
      { y: 8.0 * scale, r: 0.32 * scale, h: 1.8 * scale, d: 0.12 * scale, mat: this.leafMatLime },
    ];

    tiers.forEach((t) => {
      const tierMesh = new THREE.Mesh(this.getTierGeometry(t.r, t.h, t.d, 6), t.mat);
      tierMesh.position.y = t.y;
      tierMesh.rotation.y = Math.random() * Math.PI;
      tree.add(tierMesh);
    });

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.4 * scale, 10), this.shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.06;
    tree.add(shadow);

    return tree;
  }

  // =========================================================================
  // 4. ForestFir (Classic Balanced Mountain Fir - 4 Tiers)
  // =========================================================================
  public static createForestFirModel(scale = 1.0): THREE.Group {
    const tree = new THREE.Group();
    tree.name = 'polyone_forest_fir';

    const trunkHeight = 8.5 * scale;
    const trunkGeo = new THREE.CylinderGeometry(0.16 * scale, 0.35 * scale, trunkHeight, 6);
    const trunk = new THREE.Mesh(trunkGeo, this.trunkMatCedar);
    trunk.position.y = trunkHeight / 2;
    tree.add(trunk);

    // Dry branch spurs
    const sp1 = this.createSpur(1.1 * scale, 0.8, 0.06);
    sp1.position.set(0, 1.8 * scale, 0);
    tree.add(sp1);

    const sp2 = this.createSpur(1.3 * scale, 3.4, -0.05);
    sp2.position.set(0, 2.5 * scale, 0);
    tree.add(sp2);

    // 4 needle tiers
    const tiers = [
      { y: 3.2 * scale, r: 2.1 * scale, h: 2.0 * scale, d: 0.48 * scale, mat: this.leafMatDeep },
      { y: 4.8 * scale, r: 1.7 * scale, h: 1.9 * scale, d: 0.42 * scale, mat: this.leafMatMid },
      { y: 6.2 * scale, r: 1.25 * scale, h: 1.7 * scale, d: 0.36 * scale, mat: this.leafMatVibrant },
      { y: 7.4 * scale, r: 0.75 * scale, h: 1.6 * scale, d: 0.30 * scale, mat: this.leafMatLime },
    ];

    tiers.forEach((t) => {
      const tierMesh = new THREE.Mesh(this.getTierGeometry(t.r, t.h, t.d, 7), t.mat);
      tierMesh.position.y = t.y;
      tierMesh.rotation.y = Math.random() * Math.PI;
      tree.add(tierMesh);
    });

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(2.3 * scale, 12), this.shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.06;
    tree.add(shadow);

    return tree;
  }

  // =========================================================================
  // 5. PineSapling (Young Compact Conifer with Fresh Spring Tips)
  // =========================================================================
  public static createPineSaplingModel(scale = 1.0): THREE.Group {
    const tree = new THREE.Group();
    tree.name = 'polyone_pine_sapling';

    const trunkHeight = 4.4 * scale;
    const trunkGeo = new THREE.CylinderGeometry(0.08 * scale, 0.18 * scale, trunkHeight, 5);
    const trunk = new THREE.Mesh(trunkGeo, this.trunkMatCedar);
    trunk.position.y = trunkHeight / 2;
    tree.add(trunk);

    const tiers = [
      { y: 1.2 * scale, r: 1.35 * scale, h: 1.5 * scale, d: 0.35 * scale, mat: this.leafMatMid },
      { y: 2.3 * scale, r: 0.95 * scale, h: 1.4 * scale, d: 0.30 * scale, mat: this.leafMatVibrant },
      { y: 3.3 * scale, r: 0.55 * scale, h: 1.3 * scale, d: 0.25 * scale, mat: this.leafMatLime },
    ];

    tiers.forEach((t) => {
      const tierMesh = new THREE.Mesh(this.getTierGeometry(t.r, t.h, t.d, 6), t.mat);
      tierMesh.position.y = t.y;
      tierMesh.rotation.y = Math.random() * Math.PI;
      tree.add(tierMesh);
    });

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.5 * scale, 10), this.shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.06;
    tree.add(shadow);

    return tree;
  }

  // =========================================================================
  // 6. SnagPine (Weathered Bare Dead Conifer from PolyOne Reference)
  // =========================================================================
  public static createSnagPineModel(scale = 1.0): THREE.Group {
    const tree = new THREE.Group();
    tree.name = 'polyone_snag_pine';

    const trunkHeight = 11.0 * scale;
    const trunkGeo = new THREE.CylinderGeometry(0.12 * scale, 0.38 * scale, trunkHeight, 6);
    const trunk = new THREE.Mesh(trunkGeo, this.trunkMatWeathered);
    trunk.position.y = trunkHeight / 2;
    trunk.rotation.z = 0.035;
    tree.add(trunk);

    // Weathered dry branches protruding all along the trunk
    const branchConfigs = [
      { y: 2.5 * scale, len: 1.6 * scale, rotY: 0.5, rotZ: 0.08, sub: true },
      { y: 3.4 * scale, len: 1.9 * scale, rotY: 1.8, rotZ: -0.06, sub: true },
      { y: 4.4 * scale, len: 2.1 * scale, rotY: 3.2, rotZ: 0.05, sub: true },
      { y: 5.3 * scale, len: 1.8 * scale, rotY: 4.6, rotZ: -0.07, sub: true },
      { y: 6.4 * scale, len: 1.6 * scale, rotY: 0.9, rotZ: 0.10, sub: true },
      { y: 7.5 * scale, len: 1.3 * scale, rotY: 2.4, rotZ: -0.04, sub: false },
      { y: 8.5 * scale, len: 1.0 * scale, rotY: 3.8, rotZ: 0.06, sub: false },
      { y: 9.6 * scale, len: 0.7 * scale, rotY: 5.2, rotZ: -0.05, sub: false },
    ];

    branchConfigs.forEach((b) => {
      const spur = this.createSpur(b.len, b.rotY, b.rotZ, b.sub);
      spur.position.set(0, b.y, 0);
      tree.add(spur);
    });

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(2.0 * scale, 10), this.shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.06;
    tree.add(shadow);

    return tree;
  }

  // =========================================================================
  // 7. ConiferBush (Faceted Low-Poly Evergreen Shrub)
  // =========================================================================
  public static createConiferBushModel(scale = 1.0): THREE.Group {
    const shrub = new THREE.Group();
    shrub.name = 'polyone_conifer_bush';

    const stemGeo = new THREE.CylinderGeometry(0.06 * scale, 0.12 * scale, 0.9 * scale, 5);
    const stem = new THREE.Mesh(stemGeo, this.trunkMatAmber);
    stem.position.y = 0.45 * scale;
    shrub.add(stem);

    // Clustered faceted low-poly foliage boulders
    const foliageOffsets = [
      { x: 0, y: 1.3 * scale, z: 0, r: 0.75 * scale, mat: this.leafMatVibrant },
      { x: 0.35 * scale, y: 1.0 * scale, z: 0.25 * scale, r: 0.60 * scale, mat: this.leafMatMid },
      { x: -0.32 * scale, y: 0.95 * scale, z: -0.20 * scale, r: 0.55 * scale, mat: this.leafMatDeep },
      { x: -0.25 * scale, y: 1.15 * scale, z: 0.30 * scale, r: 0.50 * scale, mat: this.leafMatLime },
    ];

    foliageOffsets.forEach((f) => {
      const geo = new THREE.DodecahedronGeometry(f.r, 0);
      const mesh = new THREE.Mesh(geo, f.mat);
      mesh.position.set(f.x, f.y, f.z);
      mesh.rotation.set(Math.random(), Math.random(), Math.random());
      shrub.add(mesh);
    });

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.2 * scale, 8), this.shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.06;
    shrub.add(shadow);

    return shrub;
  }

  // =========================================================================
  // Backwards-Compatibility Aliases (All Route to Coniferous Pack)
  // =========================================================================
  public static createCoconutTreeModel(scale = 1.0): THREE.Group {
    return this.createAlpineFirTreeModel(scale);
  }
  public static createArecanutTreeModel(scale = 1.0): THREE.Group {
    return this.createColumnarCypressModel(scale);
  }
  public static createRubberTreeModel(scale = 1.0): THREE.Group {
    return this.createForestFirModel(scale);
  }
  public static createBananaPlantModel(scale = 1.0): THREE.Group {
    return this.createPineSaplingModel(scale);
  }
  public static createMangoTreeModel(scale = 1.0): THREE.Group {
    return this.createScotsPineTreeModel(scale);
  }
  public static createJackfruitTreeModel(scale = 1.0): THREE.Group {
    return this.createAlpineFirTreeModel(scale);
  }
  public static createBanyanTreeModel(scale = 1.0): THREE.Group {
    return this.createScotsPineTreeModel(scale);
  }
  public static createRainTreeModel(scale = 1.0): THREE.Group {
    return this.createAlpineFirTreeModel(scale);
  }
  public static createPalmyraPalmModel(scale = 1.0): THREE.Group {
    return this.createColumnarCypressModel(scale);
  }
  public static createBambooClumpModel(scale = 1.0): THREE.Group {
    return this.createPineSaplingModel(scale);
  }
  public static createTropicalShrubModel(scale = 1.0): THREE.Group {
    return this.createConiferBushModel(scale);
  }
  public static createPaddyClumpModel(scale = 1.0): THREE.Group {
    return this.createPineSaplingModel(scale);
  }
  public static createTeaPlantModel(scale = 1.0): THREE.Group {
    return this.createConiferBushModel(scale);
  }
  public static createCoffeePlantModel(scale = 1.0): THREE.Group {
    return this.createConiferBushModel(scale);
  }
  public static createMixedForestPatchModel(scale = 1.0): THREE.Group {
    return this.createAlpineFirTreeModel(scale);
  }

  // =========================================================================
  // Chunk Generation: Stylized Low-Poly Coniferous Forest Distribution
  // =========================================================================
  public static generateTreesForChunk(
    chunkX: number,
    chunkZ: number,
    chunkSize: number,
    _scene: THREE.Scene,
    obstacleMap: SpatialObstacleMap,
    originLat?: number,
    originLng?: number
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = `chunk_${chunkX}_${chunkZ}`;

    const centerX = chunkX * chunkSize;
    const centerZ = chunkZ * chunkSize;

    // Detect zone for this chunk
    let zone: KeralaZoneType = 'suburban';
    if (originLat !== undefined && originLng !== undefined) {
      zone = obstacleMap.getZoneAt(centerX, centerZ, originLat, originLng);
    }
    const profile = ZoneProfileRegistry.get(zone);

    // Number of trees adapted to zone density
    const seedBase = chunkX * 123 + chunkZ * 456;
    const countVar = Math.floor(seededRandom(seedBase) * 6);
    const treeCount = Math.max(2, profile.treeProfile.baseDensity + countVar);

    for (let i = 0; i < treeCount; i++) {
      const seed = chunkX * 1000 + chunkZ * 100 + i;
      let rx = chunkX * chunkSize - chunkSize / 2 + seededRandom(seed) * chunkSize;
      let rz = chunkZ * chunkSize - chunkSize / 2 + seededRandom(seed + 1) * chunkSize;

      // In Paddy/cleared fields: trees strictly along field bunds/borders
      if (profile.treeProfile.onlyOnBunds) {
        if (seededRandom(seed + 4) > 0.5) {
          rx = chunkX * chunkSize - chunkSize / 2 + (seededRandom(seed + 5) > 0.5 ? 8 : chunkSize - 8);
        } else {
          rz = chunkZ * chunkSize - chunkSize / 2 + (seededRandom(seed + 6) > 0.5 ? 8 : chunkSize - 8);
        }
      }

      // Strict Obstacle & Road Clearance check (Zero collision with roads, buildings, water, landmarks)
      if (obstacleMap.isBlocked(rx, rz, 3.8)) {
        continue;
      }

      const scale = 0.9 + seededRandom(seed + 2) * 0.35;
      const typeRoll = seededRandom(seed + 7);
      let treeModel: THREE.Group;

      // Varied distribution of the PolyOne Coniferous Trees Pack across the world:
      if (zone === 'urban') {
        // City avenues: neat columnar cypresses, forest firs, and young saplings
        if (typeRoll < 0.45) {
          treeModel = this.createColumnarCypressModel(scale);
        } else if (typeRoll < 0.75) {
          treeModel = this.createForestFirModel(scale);
        } else if (typeRoll < 0.90) {
          treeModel = this.createPineSaplingModel(scale);
        } else {
          treeModel = this.createConiferBushModel(scale);
        }
      } else if (zone === 'hilly' || zone === 'forest') {
        // Mountains and Forests: Grand Alpine Firs, Dense Scots Pines, Snags, and Cypresses
        if (typeRoll < 0.35) {
          treeModel = this.createAlpineFirTreeModel(scale * 1.1);
        } else if (typeRoll < 0.65) {
          treeModel = this.createScotsPineTreeModel(scale * 1.05);
        } else if (typeRoll < 0.82) {
          treeModel = this.createColumnarCypressModel(scale);
        } else if (typeRoll < 0.93) {
          treeModel = this.createForestFirModel(scale);
        } else {
          // Weathered dead snag conifer adds wonderful environmental character
          treeModel = this.createSnagPineModel(scale * 1.0);
        }
      } else {
        // General landscapes (Suburban, Rural, Plantation, Coastal): Rich evergreen variety
        if (typeRoll < 0.28) {
          treeModel = this.createAlpineFirTreeModel(scale);
        } else if (typeRoll < 0.52) {
          treeModel = this.createScotsPineTreeModel(scale);
        } else if (typeRoll < 0.72) {
          treeModel = this.createColumnarCypressModel(scale);
        } else if (typeRoll < 0.86) {
          treeModel = this.createForestFirModel(scale);
        } else if (typeRoll < 0.95) {
          treeModel = this.createPineSaplingModel(scale);
        } else {
          treeModel = this.createSnagPineModel(scale);
        }
      }

      treeModel.position.set(rx, 0, rz);
      treeModel.rotation.y = seededRandom(seed + 3) * Math.PI * 2;
      group.add(treeModel);
    }

    return group;
  }
}
