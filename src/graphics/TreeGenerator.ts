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
 * Comprehensive, authentic 3D procedural vegetation engine for Kerala:
 * 1.  CoconutTree (തെങ്ങ് - curved leaning trunk, radiating palm fronds, coconut clusters)
 * 2.  ArecanutTree (കവുങ്ങ് / അടക്ക മരം - tall slender ringed trunk, arecanut bunches)
 * 3.  RubberTree (റബ്ബർ മരം - spiral tapping incision & latex collection cup)
 * 4.  BananaPlant (കുലവാഴ - broad drooping leaves, banana bunch & purple blossom)
 * 5.  MangoTree (മാവ് - dense rounded canopy, hanging golden mangoes)
 * 6.  JackfruitTree (പ്ലാവ് - robust dark bark, bumpy jackfruits on main trunk)
 * 7.  BanyanTree (പേരാൽ - massive canopy, hanging aerial prop roots)
 * 8.  RainTree (മഴമരം - umbrella canopy, pink powderpuff blossoms)
 * 9.  PalmyraPalm (കരിമ്പന - dark fibrous trunk, fan-shaped leaves, palmyra fruits)
 * 10. Bamboo (മുളങ്കൂട്ടം - segmented nodding yellow-green culms)
 * 11. TropicalShrub (ചെമ്പരത്തി & തെച്ചി flowering bushes)
 * 12. Paddy (നെൽച്ചെടി - emerald paddy clumps with golden rice panicles)
 * 13. TeaPlant (തേയിലച്ചെടി - contoured tabletop hedges with fresh flush)
 * 14. CoffeePlant (കാപ്പിചെടി - dark glossy leaves & crimson coffee cherries)
 * 15. MixedForest (നിബിഡ വനത്തുരുത്ത് - multi-layered tropical rainforest patch)
 */
export class SnapTreeGenerator {
  // Shared Material Cache for high performance & minimal draw calls
  private static trunkMatPalm = new THREE.MeshLambertMaterial({ color: 0x78350f });
  private static trunkMatRubber = new THREE.MeshLambertMaterial({ color: 0x64748b });
  private static trunkMatAreca = new THREE.MeshLambertMaterial({ color: 0x64748b });
  private static ringMatAreca = new THREE.MeshLambertMaterial({ color: 0x334155 });
  private static trunkMatBanyan = new THREE.MeshLambertMaterial({ color: 0x4a3b32 });
  private static trunkMatRainTree = new THREE.MeshLambertMaterial({ color: 0x382e2b });
  private static trunkMatPalmyra = new THREE.MeshLambertMaterial({ color: 0x1f2937 });
  private static trunkMatBanana = new THREE.MeshLambertMaterial({ color: 0x22c55e });
  private static trunkMatWood = new THREE.MeshLambertMaterial({ color: 0x5c4033 });

  private static leafMatCoconut = new THREE.MeshLambertMaterial({ color: 0x15803d, side: THREE.DoubleSide });
  private static leafMatBanana = new THREE.MeshLambertMaterial({ color: 0x4ade80, side: THREE.DoubleSide });
  private static leafMatBroadleaf1 = new THREE.MeshLambertMaterial({ color: 0x166534 });
  private static leafMatBroadleaf2 = new THREE.MeshLambertMaterial({ color: 0x14532d });
  private static leafMatMango = new THREE.MeshLambertMaterial({ color: 0x15803d });
  private static leafMatJackfruit = new THREE.MeshLambertMaterial({ color: 0x166534 });
  private static leafMatRainTree = new THREE.MeshLambertMaterial({ color: 0x15803d });
  private static leafMatPalmyra = new THREE.MeshLambertMaterial({ color: 0x14532d, side: THREE.DoubleSide });
  private static leafMatBamboo = new THREE.MeshLambertMaterial({ color: 0x86efac });
  private static culmMatBamboo = new THREE.MeshLambertMaterial({ color: 0xca8a04 });
  private static leafMatShrub = new THREE.MeshLambertMaterial({ color: 0x22c55e });
  private static leafMatTea = new THREE.MeshLambertMaterial({ color: 0x15803d });
  private static leafMatTeaFlush = new THREE.MeshLambertMaterial({ color: 0x84cc16 });
  private static leafMatCoffee = new THREE.MeshLambertMaterial({ color: 0x14532d });

  private static fruitMatCoconut = new THREE.MeshLambertMaterial({ color: 0x451a03 });
  private static fruitMatAreca = new THREE.MeshLambertMaterial({ color: 0xd97706 });
  private static fruitMatBanana = new THREE.MeshLambertMaterial({ color: 0x65a30d });
  private static flowerMatBanana = new THREE.MeshBasicMaterial({ color: 0xa21caf }); // Purple banana blossom
  private static fruitMatMango = new THREE.MeshLambertMaterial({ color: 0xf59e0b });
  private static fruitMatJackfruit = new THREE.MeshLambertMaterial({ color: 0x65a30d });
  private static fruitMatPalmyra = new THREE.MeshBasicMaterial({ color: 0x18181b });
  private static flowerMatRainTree = new THREE.MeshBasicMaterial({ color: 0xf472b6 }); // Pink pom-pom
  private static flowerMatHibiscus = new THREE.MeshBasicMaterial({ color: 0xef4444 }); // Red hibiscus
  private static flowerMatIxora = new THREE.MeshBasicMaterial({ color: 0xf97316 });    // Orange ixora
  private static grainMatPaddy = new THREE.MeshLambertMaterial({ color: 0xeab308 });
  private static stemMatPaddy = new THREE.MeshLambertMaterial({ color: 0x4ade80 });
  private static fruitMatCoffee = new THREE.MeshBasicMaterial({ color: 0xbe123c });   // Crimson coffee cherries

  private static shadowMat = new THREE.MeshBasicMaterial({
    color: 0x112200,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });

  // Low-End Mobile / Budget Mode flag
  public static isLowEndMode: boolean = false;

  public static setLowEndMode(enabled: boolean) {
    this.isLowEndMode = enabled;
  }

  // =========================================================================
  // 1. CoconutTree (തെങ്ങ്)
  // =========================================================================
  public static createCoconutTreeModel(scale = 1.0): THREE.Group {
    const palm = new THREE.Group();
    palm.name = 'kerala_coconut_tree';

    const segs = this.isLowEndMode ? 5 : 7;
    // Curved slender trunk (Leaning angle)
    const lowerTrunkGeo = new THREE.CylinderGeometry(0.32 * scale, 0.44 * scale, 4.4 * scale, segs);
    const lowerTrunk = new THREE.Mesh(lowerTrunkGeo, this.trunkMatPalm);
    lowerTrunk.position.set(0, 2.2 * scale, 0);
    lowerTrunk.rotation.z = 0.09;
    palm.add(lowerTrunk);

    const upperTrunkGeo = new THREE.CylinderGeometry(0.24 * scale, 0.32 * scale, 4.4 * scale, segs);
    const upperTrunk = new THREE.Mesh(upperTrunkGeo, this.trunkMatPalm);
    upperTrunk.position.set(0.38 * scale, 6.2 * scale, 0);
    upperTrunk.rotation.z = 0.15;
    palm.add(upperTrunk);

    // Crown of Radiating Drooping Palm Fronds
    const crown = new THREE.Group();
    crown.position.set(0.72 * scale, 8.2 * scale, 0);

    const frondCount = this.isLowEndMode ? 6 : 8;
    for (let f = 0; f < frondCount; f++) {
      const angle = (f / frondCount) * Math.PI * 2;
      const frondGeo = new THREE.BoxGeometry(0.48 * scale, 0.06 * scale, 4.0 * scale);
      const frond = new THREE.Mesh(frondGeo, this.leafMatCoconut);
      frond.rotation.y = angle;
      frond.rotation.x = 0.46;
      frond.position.set(Math.sin(angle) * 1.5 * scale, -0.4 * scale, Math.cos(angle) * 1.5 * scale);
      crown.add(frond);
    }

    // Cluster of brown & green coconuts (തേങ്ങാക്കുലകൾ)
    if (!this.isLowEndMode) {
      const nutGeo = new THREE.SphereGeometry(0.26 * scale, 5, 5);
      for (let n = 0; n < 4; n++) {
        const nut = new THREE.Mesh(nutGeo, this.fruitMatCoconut);
        const na = n * (Math.PI * 2 / 4);
        nut.position.set(Math.sin(na) * 0.38 * scale, -0.22 * scale, Math.cos(na) * 0.38 * scale);
        crown.add(nut);
      }
    }
    palm.add(crown);

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(3.0 * scale, 8), this.shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.08;
    palm.add(shadow);

    palm.scale.set(1.4, 1.4, 1.4);
    return palm;
  }

  // =========================================================================
  // 2. ArecanutTree (കവുങ്ങ് / അടക്ക മരം)
  // =========================================================================
  public static createArecanutTreeModel(scale = 1.0): THREE.Group {
    const palm = new THREE.Group();
    palm.name = 'kerala_arecanut_tree';

    const segs = this.isLowEndMode ? 5 : 7;
    const h = 8.2 * scale;
    const trunkGeo = new THREE.CylinderGeometry(0.12 * scale, 0.16 * scale, h, segs);
    const trunk = new THREE.Mesh(trunkGeo, this.trunkMatAreca);
    trunk.position.y = h / 2;
    palm.add(trunk);

    // Segmented node rings (കണ്ണികൾ)
    if (!this.isLowEndMode) {
      for (let y = 1.0; y < h - 0.5; y += 0.9 * scale) {
        const ringGeo = new THREE.CylinderGeometry(0.14 * scale, 0.14 * scale, 0.05 * scale, 6);
        const ring = new THREE.Mesh(ringGeo, this.ringMatAreca);
        ring.position.y = y;
        palm.add(ring);
      }
    }

    // Compact crown with hanging arecanut bunches (അടക്കക്കുലകൾ)
    const crown = new THREE.Group();
    crown.position.set(0, h, 0);

    for (const na of [-0.6, 0.6]) {
      const nutGeo = new THREE.SphereGeometry(0.3 * scale, 5, 5);
      nutGeo.scale(0.8, 1.2, 0.8);
      const nut = new THREE.Mesh(nutGeo, this.fruitMatAreca);
      nut.position.set(Math.sin(na) * 0.25 * scale, -0.38 * scale, Math.cos(na) * 0.25 * scale);
      crown.add(nut);
    }

    for (let f = 0; f < 6; f++) {
      const fa = (f / 6) * Math.PI * 2;
      const frondGeo = new THREE.BoxGeometry(0.28 * scale, 0.04 * scale, 2.4 * scale);
      const frond = new THREE.Mesh(frondGeo, this.leafMatCoconut);
      frond.rotation.y = fa;
      frond.rotation.x = 0.55;
      frond.position.set(Math.sin(fa) * 0.9 * scale, -0.16 * scale, Math.cos(fa) * 0.9 * scale);
      crown.add(frond);
    }
    palm.add(crown);

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(2.0 * scale, 8), this.shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.08;
    palm.add(shadow);

    palm.scale.set(1.4, 1.4, 1.4);
    return palm;
  }

  // =========================================================================
  // 3. RubberTree (റബ്ബർ മരം with Tapping Cut & Latex Cup)
  // =========================================================================
  public static createRubberTreeModel(scale = 1.0): THREE.Group {
    const tree = new THREE.Group();
    tree.name = 'kerala_rubber_tree';

    const segs = this.isLowEndMode ? 5 : 7;
    const trunkGeo = new THREE.CylinderGeometry(0.24 * scale, 0.34 * scale, 5.5 * scale, segs);
    const trunk = new THREE.Mesh(trunkGeo, this.trunkMatRubber);
    trunk.position.set(0, 2.75 * scale, 0);
    tree.add(trunk);

    if (!this.isLowEndMode) {
      // Spiral Tapping Cut (റബ്ബർ വെട്ട് പാട്)
      const cutGeo = new THREE.CylinderGeometry(0.3 * scale, 0.31 * scale, 0.28 * scale, 6, 1, true);
      const cut = new THREE.Mesh(cutGeo, this.ringMatAreca);
      cut.position.set(0, 1.7 * scale, 0);
      cut.rotation.z = 0.35;
      tree.add(cut);

      // Latex Collection Cup & Spout (ചിരട്ട / കപ്പ് & പാൽ)
      const cupGeo = new THREE.CylinderGeometry(0.12 * scale, 0.08 * scale, 0.18 * scale, 6);
      const cup = new THREE.Mesh(cupGeo, this.ringMatAreca);
      cup.position.set(0.32 * scale, 1.35 * scale, 0);
      tree.add(cup);

      const latexGeo = new THREE.CircleGeometry(0.1 * scale, 6);
      const latexMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
      const latex = new THREE.Mesh(latexGeo, latexMat);
      latex.rotation.x = -Math.PI / 2;
      latex.position.set(0.32 * scale, 1.43 * scale, 0);
      tree.add(latex);
    }

    // Layered Rubber Canopy
    const canopyGroup = new THREE.Group();
    canopyGroup.position.set(0, 5.5 * scale, 0);

    const c1Geo = new THREE.SphereGeometry(2.5 * scale, 6, 6);
    c1Geo.scale(1.2, 0.8, 1.2);
    const c1 = new THREE.Mesh(c1Geo, this.leafMatBroadleaf1);
    c1.position.set(0, 0.8 * scale, 0);
    canopyGroup.add(c1);

    const c2Geo = new THREE.SphereGeometry(1.9 * scale, 6, 6);
    c2Geo.scale(1.1, 0.7, 1.1);
    const c2 = new THREE.Mesh(c2Geo, this.leafMatBroadleaf2);
    c2.position.set(0.6 * scale, 1.6 * scale, 0.3 * scale);
    canopyGroup.add(c2);

    tree.add(canopyGroup);

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(2.8 * scale, 8), this.shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.08;
    tree.add(shadow);

    tree.scale.set(1.4, 1.4, 1.4);
    return tree;
  }

  // =========================================================================
  // 4. BananaPlant (കുലവാഴ with Bananas & Purple Blossom)
  // =========================================================================
  public static createBananaPlantModel(scale = 1.0): THREE.Group {
    const banana = new THREE.Group();
    banana.name = 'kerala_banana_plant';

    const stemGeo = new THREE.CylinderGeometry(0.2 * scale, 0.28 * scale, 2.6 * scale, 6);
    const stem = new THREE.Mesh(stemGeo, this.trunkMatBanana);
    stem.position.set(0, 1.3 * scale, 0);
    banana.add(stem);

    // 6 Arching Lush Green Leaves
    const leafCount = 6;
    for (let l = 0; l < leafCount; l++) {
      const angle = (l / leafCount) * Math.PI * 2;
      const leafGeo = new THREE.BoxGeometry(0.75 * scale, 0.04 * scale, 2.8 * scale);
      const leaf = new THREE.Mesh(leafGeo, this.leafMatBanana);
      leaf.position.set(Math.sin(angle) * 1.1 * scale, 2.5 * scale, Math.cos(angle) * 1.1 * scale);
      leaf.rotation.y = angle;
      leaf.rotation.x = 0.42;
      banana.add(leaf);
    }

    if (!this.isLowEndMode) {
      // Banana Bunch (വാഴക്കുല)
      const bunchGeo = new THREE.CylinderGeometry(0.28 * scale, 0.22 * scale, 0.8 * scale, 6);
      const bunch = new THREE.Mesh(bunchGeo, this.fruitMatBanana);
      bunch.position.set(0.42 * scale, 1.8 * scale, 0.3 * scale);
      bunch.rotation.z = 0.45;
      banana.add(bunch);

      // Purple Blossom / Flower Heart (വാഴക്കൂമ്പ്)
      const flowerGeo = new THREE.ConeGeometry(0.18 * scale, 0.45 * scale, 5);
      const flower = new THREE.Mesh(flowerGeo, this.flowerMatBanana);
      flower.position.set(0.62 * scale, 1.35 * scale, 0.44 * scale);
      flower.rotation.x = Math.PI;
      banana.add(flower);
    }

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.8 * scale, 8), this.shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.08;
    banana.add(shadow);

    banana.scale.set(1.4, 1.4, 1.4);
    return banana;
  }

  // =========================================================================
  // 5. MangoTree (മാവ് with Hanging Mangoes)
  // =========================================================================
  public static createMangoTreeModel(scale = 1.0): THREE.Group {
    const tree = new THREE.Group();
    tree.name = 'kerala_mango_tree';

    const trunkGeo = new THREE.CylinderGeometry(0.48 * scale, 0.68 * scale, 4.0 * scale, 7);
    const trunk = new THREE.Mesh(trunkGeo, this.trunkMatWood);
    trunk.position.set(0, 2.0 * scale, 0);
    tree.add(trunk);

    // Large rounded umbrella dome canopy
    const canopyGeo = new THREE.SphereGeometry(3.6 * scale, 7, 7);
    canopyGeo.scale(1.2, 0.9, 1.2);
    const canopy = new THREE.Mesh(canopyGeo, this.leafMatMango);
    canopy.position.set(0, 4.8 * scale, 0);
    tree.add(canopy);

    if (!this.isLowEndMode) {
      const mangoGeo = new THREE.SphereGeometry(0.24 * scale, 5, 5);
      mangoGeo.scale(0.8, 1.2, 0.8);
      for (let m = 0; m < 5; m++) {
        const ma = m * 1.3;
        const mango = new THREE.Mesh(mangoGeo, this.fruitMatMango);
        mango.position.set(Math.sin(ma) * 2.8 * scale, 3.2 * scale, Math.cos(ma) * 2.8 * scale);
        tree.add(mango);
      }
    }

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(4.2 * scale, 10), this.shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.08;
    tree.add(shadow);

    tree.scale.set(1.4, 1.4, 1.4);
    return tree;
  }

  // =========================================================================
  // 6. JackfruitTree (പ്ലാവ് with Trunk-growing Jackfruits)
  // =========================================================================
  public static createJackfruitTreeModel(scale = 1.0): THREE.Group {
    const tree = new THREE.Group();
    tree.name = 'kerala_jackfruit_tree';

    const trunkGeo = new THREE.CylinderGeometry(0.55 * scale, 0.72 * scale, 4.6 * scale, 7);
    const trunk = new THREE.Mesh(trunkGeo, this.trunkMatBanyan);
    trunk.position.set(0, 2.3 * scale, 0);
    tree.add(trunk);

    // Hanging Jackfruits directly attached to the main trunk (ചക്ക)
    if (!this.isLowEndMode) {
      const jackGeo = new THREE.CylinderGeometry(0.32 * scale, 0.35 * scale, 0.8 * scale, 6);
      for (let j = 0; j < 3; j++) {
        const jack = new THREE.Mesh(jackGeo, this.fruitMatJackfruit);
        const ja = j * 2.1;
        jack.position.set(Math.sin(ja) * 0.65 * scale, (1.8 + j * 0.8) * scale, Math.cos(ja) * 0.65 * scale);
        jack.rotation.z = 0.2;
        tree.add(jack);
      }
    }

    const canopyGeo = new THREE.SphereGeometry(3.2 * scale, 7, 7);
    canopyGeo.scale(1.1, 0.95, 1.1);
    const canopy = new THREE.Mesh(canopyGeo, this.leafMatJackfruit);
    canopy.position.set(0, 5.2 * scale, 0);
    tree.add(canopy);

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(3.8 * scale, 10), this.shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.08;
    tree.add(shadow);

    tree.scale.set(1.4, 1.4, 1.4);
    return tree;
  }

  // =========================================================================
  // 7. BanyanTree (പേരാൽ with Aerial Roots)
  // =========================================================================
  public static createBanyanTreeModel(scale = 1.0): THREE.Group {
    const tree = new THREE.Group();
    tree.name = 'kerala_banyan_tree';

    const mainTrunkGeo = new THREE.CylinderGeometry(0.85 * scale, 1.2 * scale, 4.8 * scale, 8);
    const mainTrunk = new THREE.Mesh(mainTrunkGeo, this.trunkMatBanyan);
    mainTrunk.position.set(0, 2.4 * scale, 0);
    tree.add(mainTrunk);

    // Aerial Prop Roots (വിഴുതുകൾ) descending to the ground
    for (let r = 0; r < 5; r++) {
      const ra = (r / 5) * Math.PI * 2;
      const rootGeo = new THREE.CylinderGeometry(0.12 * scale, 0.16 * scale, 4.2 * scale, 5);
      const root = new THREE.Mesh(rootGeo, this.trunkMatBanyan);
      root.position.set(Math.sin(ra) * 2.4 * scale, 2.1 * scale, Math.cos(ra) * 2.4 * scale);
      tree.add(root);
    }

    const canopyGeo = new THREE.SphereGeometry(5.2 * scale, 8, 7);
    canopyGeo.scale(1.35, 0.65, 1.35);
    const canopy = new THREE.Mesh(canopyGeo, this.leafMatBroadleaf2);
    canopy.position.set(0, 5.6 * scale, 0);
    tree.add(canopy);

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(5.8 * scale, 12), this.shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.08;
    tree.add(shadow);

    tree.scale.set(1.4, 1.4, 1.4);
    return tree;
  }

  // =========================================================================
  // 8. RainTree (മഴമരം with Pink Powder-Puff Blossoms)
  // =========================================================================
  public static createRainTreeModel(scale = 1.0): THREE.Group {
    const tree = new THREE.Group();
    tree.name = 'kerala_rain_tree';

    const trunkGeo = new THREE.CylinderGeometry(0.6 * scale, 0.85 * scale, 4.2 * scale, 7);
    const trunk = new THREE.Mesh(trunkGeo, this.trunkMatRainTree);
    trunk.position.set(0, 2.1 * scale, 0);
    tree.add(trunk);

    // Wide umbrella spreading canopy
    const umbrellaGeo = new THREE.CylinderGeometry(4.8 * scale, 1.2 * scale, 2.0 * scale, 8);
    const umbrella = new THREE.Mesh(umbrellaGeo, this.leafMatRainTree);
    umbrella.position.set(0, 5.2 * scale, 0);
    tree.add(umbrella);

    // Pink powder-puff pom-poms on top
    if (!this.isLowEndMode) {
      const bloomGeo = new THREE.SphereGeometry(0.3 * scale, 5, 5);
      for (let b = 0; b < 6; b++) {
        const ba = (b / 6) * Math.PI * 2;
        const bloom = new THREE.Mesh(bloomGeo, this.flowerMatRainTree);
        bloom.position.set(Math.sin(ba) * 3.2 * scale, 6.2 * scale, Math.cos(ba) * 3.2 * scale);
        tree.add(bloom);
      }
    }

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(5.2 * scale, 12), this.shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.08;
    tree.add(shadow);

    tree.scale.set(1.4, 1.4, 1.4);
    return tree;
  }

  // =========================================================================
  // 9. PalmyraPalm (കരിമ്പന with Fan Leaves & Palmyra Fruits)
  // =========================================================================
  public static createPalmyraPalmModel(scale = 1.0): THREE.Group {
    const palm = new THREE.Group();
    palm.name = 'kerala_palmyra_palm';

    const h = 9.5 * scale;
    const trunkGeo = new THREE.CylinderGeometry(0.28 * scale, 0.42 * scale, h, 7);
    const trunk = new THREE.Mesh(trunkGeo, this.trunkMatPalmyra);
    trunk.position.y = h / 2;
    palm.add(trunk);

    const crown = new THREE.Group();
    crown.position.set(0, h, 0);

    // Circular fan-shaped fronds (കരിമ്പന ഓലകൾ)
    const fanCount = 8;
    for (let f = 0; f < fanCount; f++) {
      const fa = (f / fanCount) * Math.PI * 2;
      const fanGeo = new THREE.CircleGeometry(1.4 * scale, 6);
      const fan = new THREE.Mesh(fanGeo, this.leafMatPalmyra);
      fan.rotation.y = fa;
      fan.rotation.x = 0.6;
      fan.position.set(Math.sin(fa) * 0.8 * scale, 0.2 * scale, Math.cos(fa) * 0.8 * scale);
      crown.add(fan);
    }
    if (!this.isLowEndMode) {
      const nutGeo = new THREE.SphereGeometry(0.3 * scale, 5, 5);
      for (let n = 0; n < 3; n++) {
        const na = n * 2.0;
        const nut = new THREE.Mesh(nutGeo, this.fruitMatPalmyra);
        nut.position.set(Math.sin(na) * 0.35 * scale, -0.3 * scale, Math.cos(na) * 0.35 * scale);
        crown.add(nut);
      }
    }
    palm.add(crown);

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(2.4 * scale, 8), this.shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.08;
    palm.add(shadow);

    palm.scale.set(1.4, 1.4, 1.4);
    return palm;
  }

  // =========================================================================
  // 10. Bamboo (മുളങ്കൂട്ടം / Bamboo Clump)
  // =========================================================================
  public static createBambooClumpModel(scale = 1.0): THREE.Group {
    const clump = new THREE.Group();
    clump.name = 'kerala_bamboo_clump';

    const culmCount = this.isLowEndMode ? 4 : 7;
    for (let i = 0; i < culmCount; i++) {
      const a = (i / culmCount) * Math.PI * 2;
      const r = 0.45 * scale;
      const ch = (6.0 + (i % 3) * 1.2) * scale;
      const culmGeo = new THREE.CylinderGeometry(0.08 * scale, 0.1 * scale, ch, 5);
      const culm = new THREE.Mesh(culmGeo, this.culmMatBamboo);
      culm.position.set(Math.sin(a) * r, ch / 2, Math.cos(a) * r);
      culm.rotation.z = (Math.random() - 0.5) * 0.15;
      culm.rotation.x = (Math.random() - 0.5) * 0.15;
      clump.add(culm);

      // Delicate nodding foliage top
      const leafGeo = new THREE.SphereGeometry(1.2 * scale, 5, 5);
      leafGeo.scale(0.8, 1.4, 0.8);
      const leaves = new THREE.Mesh(leafGeo, this.leafMatBamboo);
      leaves.position.set(Math.sin(a) * r * 1.5, ch - 0.5 * scale, Math.cos(a) * r * 1.5);
      clump.add(leaves);
    }

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(2.2 * scale, 8), this.shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.08;
    clump.add(shadow);

    clump.scale.set(1.4, 1.4, 1.4);
    return clump;
  }

  // =========================================================================
  // 11. TropicalShrub (ചെമ്പരത്തി & തെച്ചി Flowering Bushes)
  // =========================================================================
  public static createTropicalShrubModel(scale = 1.0): THREE.Group {
    const shrub = new THREE.Group();
    shrub.name = 'kerala_tropical_shrub';

    const bushGeo = new THREE.SphereGeometry(1.2 * scale, 6, 6);
    bushGeo.scale(1.2, 0.85, 1.2);
    const bush = new THREE.Mesh(bushGeo, this.leafMatShrub);
    bush.position.set(0, 0.85 * scale, 0);
    shrub.add(bush);

    // Hibiscus & Ixora blooms
    if (!this.isLowEndMode) {
      const flowerGeo = new THREE.SphereGeometry(0.16 * scale, 4, 4);
      for (let f = 0; f < 4; f++) {
        const fa = f * 1.6;
        const fl = new THREE.Mesh(flowerGeo, f % 2 === 0 ? this.flowerMatHibiscus : this.flowerMatIxora);
        fl.position.set(Math.sin(fa) * 1.1 * scale, (0.7 + (f % 3) * 0.3) * scale, Math.cos(fa) * 1.1 * scale);
        shrub.add(fl);
      }
    }

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.4 * scale, 8), this.shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.08;
    shrub.add(shadow);

    shrub.scale.set(1.4, 1.4, 1.4);
    return shrub;
  }

  // =========================================================================
  // 12. PaddyClump (നെൽച്ചെടി / Golden Rice Tufts)
  // =========================================================================
  public static createPaddyClumpModel(scale = 1.0): THREE.Group {
    const paddy = new THREE.Group();
    paddy.name = 'kerala_paddy_clump';

    const stalkGeo = new THREE.CylinderGeometry(0.04 * scale, 0.06 * scale, 1.1 * scale, 4);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const stalk = new THREE.Mesh(stalkGeo, this.stemMatPaddy);
      stalk.position.set(Math.sin(a) * 0.25 * scale, 0.55 * scale, Math.cos(a) * 0.25 * scale);
      stalk.rotation.z = (Math.random() - 0.5) * 0.2;
      paddy.add(stalk);

      const grainGeo = new THREE.BoxGeometry(0.08 * scale, 0.35 * scale, 0.08 * scale);
      const grain = new THREE.Mesh(grainGeo, this.grainMatPaddy);
      grain.position.set(Math.sin(a) * 0.28 * scale, 1.05 * scale, Math.cos(a) * 0.28 * scale);
      grain.rotation.z = 0.3;
      paddy.add(grain);
    }

    paddy.scale.set(1.4, 1.4, 1.4);
    return paddy;
  }

  // =========================================================================
  // 13. TeaPlant (തേയിലച്ചെടി / Tabletop Contoured Hedges)
  // =========================================================================
  public static createTeaPlantModel(scale = 1.0): THREE.Group {
    const tea = new THREE.Group();
    tea.name = 'kerala_tea_plant';

    const baseGeo = new THREE.CylinderGeometry(1.1 * scale, 0.7 * scale, 0.85 * scale, 7);
    const base = new THREE.Mesh(baseGeo, this.leafMatTea);
    base.position.set(0, 0.45 * scale, 0);
    tea.add(base);

    // Lime-green young tea flush shoots (കൊഴുന്ത്) on the tabletop
    const flushGeo = new THREE.CylinderGeometry(1.15 * scale, 1.1 * scale, 0.18 * scale, 7);
    const flush = new THREE.Mesh(flushGeo, this.leafMatTeaFlush);
    flush.position.set(0, 0.92 * scale, 0);
    tea.add(flush);

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.3 * scale, 8), this.shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.08;
    tea.add(shadow);

    tea.scale.set(1.4, 1.4, 1.4);
    return tea;
  }

  // =========================================================================
  // 14. CoffeePlant (കാപ്പിചെടി with Glossy Leaves & Crimson Berries)
  // =========================================================================
  public static createCoffeePlantModel(scale = 1.0): THREE.Group {
    const coffee = new THREE.Group();
    coffee.name = 'kerala_coffee_plant';

    const stemGeo = new THREE.CylinderGeometry(0.12 * scale, 0.16 * scale, 1.6 * scale, 5);
    const stem = new THREE.Mesh(stemGeo, this.trunkMatWood);
    stem.position.set(0, 0.8 * scale, 0);
    coffee.add(stem);

    const canopyGeo = new THREE.SphereGeometry(1.4 * scale, 6, 6);
    canopyGeo.scale(1.2, 0.8, 1.2);
    const canopy = new THREE.Mesh(canopyGeo, this.leafMatCoffee);
    canopy.position.set(0, 1.7 * scale, 0);
    coffee.add(canopy);

    if (!this.isLowEndMode) {
      const berryGeo = new THREE.SphereGeometry(0.14 * scale, 4, 4);
      for (let b = 0; b < 6; b++) {
        const ba = b * 1.1;
        const berry = new THREE.Mesh(berryGeo, this.fruitMatCoffee);
        berry.position.set(Math.sin(ba) * 1.15 * scale, 1.5 * scale, Math.cos(ba) * 1.15 * scale);
        coffee.add(berry);
      }
    }

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.6 * scale, 8), this.shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.08;
    coffee.add(shadow);

    coffee.scale.set(1.4, 1.4, 1.4);
    return coffee;
  }

  // =========================================================================
  // 15. MixedForest (നിബിഡ വനത്തുരുത്ത് / Multi-layered Rainforest Patch)
  // =========================================================================
  public static createMixedForestPatchModel(scale = 1.0): THREE.Group {
    const forest = new THREE.Group();
    forest.name = 'kerala_mixed_forest_patch';

    // 2-3 clustered canopy layers
    const c1Geo = new THREE.SphereGeometry(3.5 * scale, 7, 7);
    c1Geo.scale(1.1, 0.85, 1.1);
    const c1 = new THREE.Mesh(c1Geo, this.leafMatBroadleaf1);
    c1.position.set(-1.0 * scale, 5.0 * scale, 0);
    forest.add(c1);

    const c2Geo = new THREE.SphereGeometry(2.8 * scale, 6, 6);
    c2Geo.scale(1.0, 0.9, 1.0);
    const c2 = new THREE.Mesh(c2Geo, this.leafMatBroadleaf2);
    c2.position.set(1.2 * scale, 4.4 * scale, 0.8 * scale);
    forest.add(c2);

    const t1Geo = new THREE.CylinderGeometry(0.4 * scale, 0.6 * scale, 4.5 * scale, 6);
    const t1 = new THREE.Mesh(t1Geo, this.trunkMatWood);
    t1.position.set(-1.0 * scale, 2.25 * scale, 0);
    forest.add(t1);

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(5.0 * scale, 10), this.shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.08;
    forest.add(shadow);

    forest.scale.set(1.4, 1.4, 1.4);
    return forest;
  }

  // =========================================================================
  // Chunk Generation: Realistic Mixed Kerala Ecological Distribution
  // =========================================================================
  public static generateTreesForChunk(
    chunkX: number,
    chunkZ: number,
    chunkSize: number,
    _scene: THREE.Scene,
    obstacleMap: SpatialObstacleMap,
    originLat?: number,
    originLng?: number,
    getElevation?: (localX: number, localZ: number) => number
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

    // Number of trees adapted to zone density & device mode
    const seedBase = chunkX * 123 + chunkZ * 456;
    const countVar = Math.floor(seededRandom(seedBase) * 5);
    let baseDensity = profile.treeProfile.baseDensity;
    if (this.isLowEndMode) {
      baseDensity = Math.max(1, Math.floor(baseDensity * 0.6));
    }
    const treeCount = Math.max(2, baseDensity + countVar);

    for (let i = 0; i < treeCount; i++) {
      const seed = chunkX * 1000 + chunkZ * 100 + i;
      let rx = chunkX * chunkSize - chunkSize / 2 + seededRandom(seed) * chunkSize;
      let rz = chunkZ * chunkSize - chunkSize / 2 + seededRandom(seed + 1) * chunkSize;

      // In Paddy fields: trees strictly along field bunds (വരമ്പുകൾ)
      if (profile.treeProfile.onlyOnBunds) {
        if (seededRandom(seed + 4) > 0.5) {
          rx = chunkX * chunkSize - chunkSize / 2 + (seededRandom(seed + 5) > 0.5 ? 8 : chunkSize - 8);
        } else {
          rz = chunkZ * chunkSize - chunkSize / 2 + (seededRandom(seed + 6) > 0.5 ? 8 : chunkSize - 8);
        }
      }

      // Strict Obstacle & Road Clearance check (Zero collision with roads, buildings, water, landmarks)
      if (obstacleMap.isBlocked(rx, rz, 3.6)) {
        continue;
      }

      const scale = 0.9 + seededRandom(seed + 2) * 0.25;
      const typeRoll = seededRandom(seed + 7);
      let treeModel: THREE.Group;

      // 1. Urban (City Center)
      if (zone === 'urban') {
        if (typeRoll < 0.38) {
          treeModel = this.createRainTreeModel(scale * 0.95);
        } else if (typeRoll < 0.65) {
          treeModel = this.createMangoTreeModel(scale);
        } else if (typeRoll < 0.82) {
          treeModel = this.createCoconutTreeModel(scale);
        } else if (typeRoll < 0.92) {
          treeModel = this.createPalmyraPalmModel(scale);
        } else {
          treeModel = this.createTropicalShrubModel(scale);
        }
      }
      // 2. Highland / Western Ghats / Mountain Slopes (Hilly)
      else if (zone === 'hilly') {
        if (typeRoll < 0.35) {
          treeModel = this.createTeaPlantModel(scale * 1.1);
        } else if (typeRoll < 0.65) {
          treeModel = this.createCoffeePlantModel(scale * 1.1);
        } else if (typeRoll < 0.80) {
          treeModel = this.createBambooClumpModel(scale);
        } else if (typeRoll < 0.92) {
          treeModel = this.createJackfruitTreeModel(scale);
        } else {
          treeModel = this.createRainTreeModel(scale);
        }
      }
      // 3. Plantation Zone (റബ്ബർ / കവുങ്ങ് / കാപ്പി തോട്ടങ്ങൾ)
      else if (zone === 'plantation') {
        if (typeRoll < 0.55) {
          treeModel = this.createRubberTreeModel(scale);
        } else if (typeRoll < 0.75) {
          treeModel = this.createArecanutTreeModel(scale);
        } else if (typeRoll < 0.90) {
          treeModel = this.createCoffeePlantModel(scale);
        } else {
          treeModel = this.createBananaPlantModel(scale);
        }
      }
      // 4. Forest Zone (നിബിഡ വനം / Rainforest)
      else if (zone === 'forest') {
        if (typeRoll < 0.35) {
          treeModel = this.createMixedForestPatchModel(scale);
        } else if (typeRoll < 0.58) {
          treeModel = this.createBanyanTreeModel(scale);
        } else if (typeRoll < 0.75) {
          treeModel = this.createRainTreeModel(scale);
        } else if (typeRoll < 0.90) {
          treeModel = this.createBambooClumpModel(scale);
        } else {
          treeModel = this.createTropicalShrubModel(scale);
        }
      }
      // 5. Coastal & Backwater (കടൽത്തീരവും കായലും)
      else if (zone === 'coastal' || zone === 'backwater') {
        if (typeRoll < 0.65) {
          treeModel = this.createCoconutTreeModel(scale);
        } else if (typeRoll < 0.82) {
          treeModel = this.createPalmyraPalmModel(scale);
        } else if (typeRoll < 0.92) {
          treeModel = this.createMangoTreeModel(scale);
        } else {
          treeModel = this.createTropicalShrubModel(scale);
        }
      }
      // 6. Paddy & Wetland (നെൽപ്പാടങ്ങളും ചതുപ്പും)
      else if (zone === 'paddy' || zone === 'wetland') {
        if (typeRoll < 0.40) {
          treeModel = this.createCoconutTreeModel(scale);
        } else if (typeRoll < 0.65) {
          treeModel = this.createArecanutTreeModel(scale);
        } else if (typeRoll < 0.85) {
          treeModel = this.createBananaPlantModel(scale);
        } else if (typeRoll < 0.94) {
          treeModel = this.createBambooClumpModel(scale);
        } else {
          treeModel = this.createPaddyClumpModel(scale);
        }
      }
      // 7. Suburban & Rural (Classic Kerala Mixed Homestead Flora)
      else {
        if (typeRoll < 0.30) {
          treeModel = this.createCoconutTreeModel(scale);
        } else if (typeRoll < 0.50) {
          treeModel = this.createArecanutTreeModel(scale);
        } else if (typeRoll < 0.66) {
          treeModel = this.createBananaPlantModel(scale);
        } else if (typeRoll < 0.78) {
          treeModel = this.createMangoTreeModel(scale);
        } else if (typeRoll < 0.88) {
          treeModel = this.createJackfruitTreeModel(scale);
        } else if (typeRoll < 0.93) {
          treeModel = this.createBambooClumpModel(scale);
        } else if (typeRoll < 0.97) {
          treeModel = this.createBanyanTreeModel(scale);
        } else {
          treeModel = this.createTropicalShrubModel(scale);
        }
      }

      // Sample exact terrain elevation (anchoring 0.2m into soil so downhill slope roots never hover)
      const treeY = (getElevation ? getElevation(rx, rz) : 0) - 0.2;
      treeModel.position.set(rx, treeY, rz);
      treeModel.rotation.y = seededRandom(seed + 3) * Math.PI * 2;
      treeModel.userData = {
        localX: rx,
        localZ: rz,
      };
      group.add(treeModel);
    }

    return group;
  }
}
