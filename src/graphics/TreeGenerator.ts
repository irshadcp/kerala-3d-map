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
 * 1.  CoconutTree (തെങ്ങ്)
 * 2.  ArecanutTree (കവുങ്ങ് / അടക്ക മരം)
 * 3.  RubberTree (റബ്ബർ മരം with spiral tapping cut & latex cup)
 * 4.  BananaPlant (കുലവാഴ with purple blossom & bananas)
 * 5.  MangoTree (മാവ് with dome canopy & hanging mangoes)
 * 6.  JackfruitTree (പ്ലാവ് with trunk-growing jackfruits)
 * 7.  BanyanTree (പേരാൽ with aerial prop roots & Al-thara platform)
 * 8.  RainTree (മഴമരം with wide umbrella canopy & powderpuff blossoms)
 * 9.  PalmyraPalm (കരിമ്പന with fan leaves & palmyra fruits)
 * 10. Bamboo (മുളങ്കൂട്ടം / Bamboo Clump)
 * 11. TropicalShrub (ചെമ്പരത്തി & തെച്ചി flowering shrubs)
 * 12. Paddy (നെൽച്ചെടി with golden rice panicles)
 * 13. TeaPlant (തേയിലച്ചെടി - contoured tabletop hedges)
 * 14. CoffeePlant (കാപ്പിചെടി with glossy leaves & red coffee cherries)
 * 15. MixedForest (നിബിഡ വനത്തുരുത്ത് / Multi-layered rainforest patch)
 */
export class SnapTreeGenerator {
  // Shared Material Cache for high performance & low draw calls
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

  private static altaraMat = new THREE.MeshLambertMaterial({ color: 0xd1d5db });      // Stone platform
  private static shadowMat = new THREE.MeshBasicMaterial({
    color: 0x112200,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });

  // =========================================================================
  // 1. CoconutTree (തെങ്ങ്)
  // =========================================================================
  public static createCoconutTreeModel(scale = 1.0): THREE.Group {
    const palm = new THREE.Group();
    palm.name = 'kerala_coconut_tree';

    // Curved slender trunk (Leaning angle)
    const lowerTrunkGeo = new THREE.CylinderGeometry(0.32 * scale, 0.44 * scale, 4.4 * scale, 7);
    const lowerTrunk = new THREE.Mesh(lowerTrunkGeo, this.trunkMatPalm);
    lowerTrunk.position.set(0, 2.2 * scale, 0);
    lowerTrunk.rotation.z = 0.09;
    palm.add(lowerTrunk);

    const upperTrunkGeo = new THREE.CylinderGeometry(0.24 * scale, 0.32 * scale, 4.4 * scale, 7);
    const upperTrunk = new THREE.Mesh(upperTrunkGeo, this.trunkMatPalm);
    upperTrunk.position.set(0.38 * scale, 6.2 * scale, 0);
    upperTrunk.rotation.z = 0.15;
    palm.add(upperTrunk);

    // Crown of Radiating Drooping Palm Fronds
    const crown = new THREE.Group();
    crown.position.set(0.72 * scale, 8.2 * scale, 0);

    const frondCount = 8;
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
    const nutGeo = new THREE.SphereGeometry(0.26 * scale, 6, 6);
    for (let n = 0; n < 4; n++) {
      const nut = new THREE.Mesh(nutGeo, this.fruitMatCoconut);
      const na = n * (Math.PI * 2 / 4);
      nut.position.set(Math.sin(na) * 0.38 * scale, -0.22 * scale, Math.cos(na) * 0.38 * scale);
      crown.add(nut);
    }
    palm.add(crown);

    // Soft ground shadow
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(3.0 * scale, 12), this.shadowMat);
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

    const h = 8.2 * scale;
    const trunkGeo = new THREE.CylinderGeometry(0.12 * scale, 0.16 * scale, h, 7);
    const trunk = new THREE.Mesh(trunkGeo, this.trunkMatAreca);
    trunk.position.y = h / 2;
    palm.add(trunk);

    // Segmented node rings (കണ്ണികൾ)
    for (let y = 1.0; y < h - 0.5; y += 0.9 * scale) {
      const ringGeo = new THREE.CylinderGeometry(0.14 * scale, 0.14 * scale, 0.05 * scale, 7);
      const ring = new THREE.Mesh(ringGeo, this.ringMatAreca);
      ring.position.y = y;
      palm.add(ring);
    }

    // Compact crown with hanging arecanut bunches (അടക്കക്കുലകൾ)
    const crown = new THREE.Group();
    crown.position.set(0, h, 0);

    for (const na of [-0.6, 0.6]) {
      const nutGeo = new THREE.SphereGeometry(0.3 * scale, 6, 6);
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

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(2.0 * scale, 10), this.shadowMat);
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

    // Straight slender trunk
    const trunkGeo = new THREE.CylinderGeometry(0.24 * scale, 0.34 * scale, 5.5 * scale, 7);
    const trunk = new THREE.Mesh(trunkGeo, this.trunkMatRubber);
    trunk.position.set(0, 2.75 * scale, 0);
    tree.add(trunk);

    // Spiral Tapping Cut (റബ്ബർ വെട്ട് പാട്)
    const cutGeo = new THREE.CylinderGeometry(0.3 * scale, 0.31 * scale, 0.28 * scale, 7, 1, true);
    const cut = new THREE.Mesh(cutGeo, this.ringMatAreca);
    cut.position.set(0, 1.7 * scale, 0);
    cut.rotation.z = 0.35;
    tree.add(cut);

    // Latex Collection Cup & Spout (ചിരട്ട / കപ്പ് & പാൽ)
    const cupGeo = new THREE.CylinderGeometry(0.12 * scale, 0.08 * scale, 0.18 * scale, 7);
    const cup = new THREE.Mesh(cupGeo, this.ringMatAreca);
    cup.position.set(0.32 * scale, 1.35 * scale, 0);
    tree.add(cup);

    const latexGeo = new THREE.CircleGeometry(0.1 * scale, 6);
    const latexMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    const latex = new THREE.Mesh(latexGeo, latexMat);
    latex.rotation.x = -Math.PI / 2;
    latex.position.set(0.32 * scale, 1.43 * scale, 0);
    tree.add(latex);

    // Layered Rubber Canopy
    const canopyGroup = new THREE.Group();
    canopyGroup.position.set(0, 5.5 * scale, 0);

    const c1Geo = new THREE.SphereGeometry(2.5 * scale, 8, 8);
    c1Geo.scale(1.2, 0.8, 1.2);
    const c1 = new THREE.Mesh(c1Geo, this.leafMatBroadleaf1);
    c1.position.set(0, 0.8 * scale, 0);
    canopyGroup.add(c1);

    const c2Geo = new THREE.SphereGeometry(1.9 * scale, 7, 7);
    c2Geo.scale(1.1, 0.7, 1.1);
    const c2 = new THREE.Mesh(c2Geo, this.leafMatBroadleaf2);
    c2.position.set(0.6 * scale, 1.6 * scale, 0.3 * scale);
    canopyGroup.add(c2);

    tree.add(canopyGroup);

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(2.8 * scale, 12), this.shadowMat);
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

    // Thick succulent pseudo-stem
    const stemGeo = new THREE.CylinderGeometry(0.2 * scale, 0.28 * scale, 2.6 * scale, 7);
    const stem = new THREE.Mesh(stemGeo, this.trunkMatBanana);
    stem.position.set(0, 1.3 * scale, 0);
    banana.add(stem);

    // Arching Wide Banana Leaves (വാഴയിലകൾ)
    const leafCount = 6;
    for (let l = 0; l < leafCount; l++) {
      const la = (l / leafCount) * Math.PI * 2;
      const leafGeo = new THREE.BoxGeometry(0.65 * scale, 0.04 * scale, 2.2 * scale);
      const leaf = new THREE.Mesh(leafGeo, this.leafMatBanana);
      leaf.rotation.y = la;
      leaf.rotation.x = 0.52;
      leaf.position.set(Math.sin(la) * 0.9 * scale, 2.5 * scale, Math.cos(la) * 0.9 * scale);
      banana.add(leaf);
    }

    // Hanging Bunch of Green Bananas (വാഴക്കുല)
    const bunch = new THREE.Group();
    bunch.position.set(0.4 * scale, 2.1 * scale, 0);

    const stalkGeo = new THREE.CylinderGeometry(0.04 * scale, 0.04 * scale, 0.8 * scale, 6);
    const stalk = new THREE.Mesh(stalkGeo, this.trunkMatBanana);
    stalk.rotation.z = 0.4;
    bunch.add(stalk);

    for (let t = 0; t < 3; t++) {
      const tierY = -t * 0.18 * scale;
      for (let b = 0; b < 4; b++) {
        const ba = b * (Math.PI / 2);
        const banGeo = new THREE.CylinderGeometry(0.04 * scale, 0.04 * scale, 0.32 * scale, 5);
        banGeo.rotateZ(Math.PI / 3);
        const bMesh = new THREE.Mesh(banGeo, this.fruitMatBanana);
        bMesh.position.set(Math.sin(ba) * 0.16 * scale, tierY, Math.cos(ba) * 0.16 * scale);
        bunch.add(bMesh);
      }
    }

    // Terminal Purple/Magenta Banana Flower Heart (വാഴക്കൂമ്പ്)
    const budGeo = new THREE.ConeGeometry(0.14 * scale, 0.35 * scale, 6);
    budGeo.rotateX(Math.PI);
    const bud = new THREE.Mesh(budGeo, this.flowerMatBanana);
    bud.position.set(0, -0.68 * scale, 0);
    bunch.add(bud);

    banana.add(bunch);

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(2.2 * scale, 10), this.shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.08;
    banana.add(shadow);

    banana.scale.set(1.4, 1.4, 1.4);
    return banana;
  }

  // =========================================================================
  // 5. MangoTree (മാവ് with Dome Canopy & Hanging Mangoes)
  // =========================================================================
  public static createMangoTreeModel(scale = 1.0): THREE.Group {
    const tree = new THREE.Group();
    tree.name = 'kerala_mango_tree';

    const trunkGeo = new THREE.CylinderGeometry(0.42 * scale, 0.65 * scale, 3.8 * scale, 8);
    const trunk = new THREE.Mesh(trunkGeo, this.trunkMatWood);
    trunk.position.set(0, 1.9 * scale, 0);
    tree.add(trunk);

    // Sprawling dense umbrella canopy
    const c1Geo = new THREE.SphereGeometry(3.2 * scale, 8, 8);
    c1Geo.scale(1.25, 0.85, 1.25);
    const c1 = new THREE.Mesh(c1Geo, this.leafMatMango);
    c1.position.set(0, 4.4 * scale, 0);
    tree.add(c1);

    const c2Geo = new THREE.SphereGeometry(2.2 * scale, 7, 7);
    const c2 = new THREE.Mesh(c2Geo, this.leafMatBroadleaf2);
    c2.position.set(0.8 * scale, 5.2 * scale, -0.5 * scale);
    tree.add(c2);

    // Hanging Yellow/Gold Mangoes (മാങ്ങകൾ)
    for (let m = 0; m < 5; m++) {
      const ma = m * 1.3;
      const mangoGeo = new THREE.SphereGeometry(0.18 * scale, 6, 6);
      mangoGeo.scale(0.8, 1.25, 0.75);
      const mango = new THREE.Mesh(mangoGeo, this.fruitMatMango);
      mango.position.set(Math.sin(ma) * 1.8 * scale, 3.4 * scale, Math.cos(ma) * 1.8 * scale);
      tree.add(mango);
    }

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(3.8 * scale, 12), this.shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.08;
    tree.add(shadow);

    tree.scale.set(1.4, 1.4, 1.4);
    return tree;
  }

  // =========================================================================
  // 6. JackfruitTree (പ്ലാവ് with Trunk-Growing Jackfruits)
  // =========================================================================
  public static createJackfruitTreeModel(scale = 1.0): THREE.Group {
    const tree = new THREE.Group();
    tree.name = 'kerala_jackfruit_tree';

    const trunkGeo = new THREE.CylinderGeometry(0.48 * scale, 0.7 * scale, 4.2 * scale, 8);
    const trunk = new THREE.Mesh(trunkGeo, this.trunkMatWood);
    trunk.position.set(0, 2.1 * scale, 0);
    tree.add(trunk);

    // Cauliflory: Big spiky jackfruits (ചക്കകൾ) hanging right from the trunk
    for (const jy of [1.6, 2.5, 3.2]) {
      const jGeo = new THREE.CylinderGeometry(0.24 * scale, 0.22 * scale, 0.55 * scale, 8);
      const jMesh = new THREE.Mesh(jGeo, this.fruitMatJackfruit);
      jMesh.position.set(0.48 * scale, jy * scale, 0);
      jMesh.rotation.z = 0.2;
      tree.add(jMesh);
    }

    // Dense dark-green foliage crown
    const cGeo = new THREE.SphereGeometry(3.0 * scale, 8, 8);
    cGeo.scale(1.2, 0.9, 1.2);
    const canopy = new THREE.Mesh(cGeo, this.leafMatJackfruit);
    canopy.position.set(0, 4.8 * scale, 0);
    tree.add(canopy);

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(3.6 * scale, 12), this.shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.08;
    tree.add(shadow);

    tree.scale.set(1.4, 1.4, 1.4);
    return tree;
  }

  // =========================================================================
  // 7. BanyanTree (പേരാൽ with Aerial Prop Roots & Al-thara Platform)
  // =========================================================================
  public static createBanyanTreeModel(scale = 1.0): THREE.Group {
    const banyan = new THREE.Group();
    banyan.name = 'kerala_banyan_tree';

    // Octagonal sacred stone platform (ആൽത്തറ) at the base
    const tharaGeo = new THREE.CylinderGeometry(3.8 * scale, 4.2 * scale, 0.6 * scale, 8);
    const thara = new THREE.Mesh(tharaGeo, this.altaraMat);
    thara.position.set(0, 0.3 * scale, 0);
    banyan.add(thara);

    // Massive gnarly central trunk
    const trunkGeo = new THREE.CylinderGeometry(0.85 * scale, 1.2 * scale, 5.0 * scale, 9);
    const trunk = new THREE.Mesh(trunkGeo, this.trunkMatBanyan);
    trunk.position.set(0, 2.8 * scale, 0);
    banyan.add(trunk);

    // Descending Aerial Prop Roots (വിഴുതുകൾ / താങ്ങുവേരുകൾ)
    for (let r = 0; r < 6; r++) {
      const ra = (r / 6) * Math.PI * 2;
      const rootDist = 2.4 * scale;
      const rx = Math.sin(ra) * rootDist;
      const rz = Math.cos(ra) * rootDist;

      const propGeo = new THREE.CylinderGeometry(0.1 * scale, 0.14 * scale, 4.5 * scale, 6);
      const prop = new THREE.Mesh(propGeo, this.trunkMatBanyan);
      prop.position.set(rx, 2.5 * scale, rz);
      prop.rotation.z = (Math.random() - 0.5) * 0.15;
      banyan.add(prop);
    }

    // Vast spreading cathedral canopy
    const c1Geo = new THREE.SphereGeometry(5.2 * scale, 10, 10);
    c1Geo.scale(1.4, 0.65, 1.4);
    const c1 = new THREE.Mesh(c1Geo, this.leafMatBroadleaf2);
    c1.position.set(0, 6.2 * scale, 0);
    banyan.add(c1);

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(6.0 * scale, 16), this.shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.08;
    banyan.add(shadow);

    banyan.scale.set(1.4, 1.4, 1.4);
    return banyan;
  }

  // =========================================================================
  // 8. RainTree (മഴമരം with Wide Umbrella Canopy & Pink Blossoms)
  // =========================================================================
  public static createRainTreeModel(scale = 1.0): THREE.Group {
    const rain = new THREE.Group();
    rain.name = 'kerala_rain_tree';

    // Massive trunk dividing into Y-fork boughs
    const trunkGeo = new THREE.CylinderGeometry(0.65 * scale, 0.9 * scale, 4.8 * scale, 8);
    const trunk = new THREE.Mesh(trunkGeo, this.trunkMatRainTree);
    trunk.position.set(0, 2.4 * scale, 0);
    rain.add(trunk);

    // Enormous spreading horizontal umbrella canopy (12m wide)
    const umbrellaGeo = new THREE.CylinderGeometry(5.8 * scale, 4.2 * scale, 2.2 * scale, 12);
    const umbrella = new THREE.Mesh(umbrellaGeo, this.leafMatRainTree);
    umbrella.position.set(0, 5.8 * scale, 0);
    rain.add(umbrella);

    // Pink powderpuff blossoms scattered over the canopy top
    for (let p = 0; p < 8; p++) {
      const pa = p * 0.8;
      const pr = (1.5 + (p % 3) * 1.2) * scale;
      const puffGeo = new THREE.SphereGeometry(0.24 * scale, 6, 6);
      const puff = new THREE.Mesh(puffGeo, this.flowerMatRainTree);
      puff.position.set(Math.sin(pa) * pr, 7.0 * scale, Math.cos(pa) * pr);
      rain.add(puff);
    }

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(6.5 * scale, 16), this.shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.08;
    rain.add(shadow);

    rain.scale.set(1.4, 1.4, 1.4);
    return rain;
  }

  // =========================================================================
  // 9. PalmyraPalm (കരിമ്പന with Fan Leaves & Palmyra Fruits)
  // =========================================================================
  public static createPalmyraPalmModel(scale = 1.0): THREE.Group {
    const palm = new THREE.Group();
    palm.name = 'kerala_palmyra_palm';

    const h = 9.5 * scale;
    const trunkGeo = new THREE.CylinderGeometry(0.28 * scale, 0.38 * scale, h, 8);
    const trunk = new THREE.Mesh(trunkGeo, this.trunkMatPalmyra);
    trunk.position.set(0, h / 2, 0);
    palm.add(trunk);

    // Spherical Crown of Fan-Shaped Leaves (പനയോലകൾ)
    const crown = new THREE.Group();
    crown.position.set(0, h, 0);

    for (let f = 0; f < 10; f++) {
      const fa = (f / 10) * Math.PI * 2;
      const fanGeo = new THREE.CircleGeometry(1.2 * scale, 6);
      const fan = new THREE.Mesh(fanGeo, this.leafMatPalmyra);
      fan.rotation.y = fa;
      fan.rotation.x = 0.6;
      fan.position.set(Math.sin(fa) * 0.8 * scale, -0.2 * scale, Math.cos(fa) * 0.8 * scale);
      crown.add(fan);
    }

    // Black/Purple Palmyra Fruit Clusters (നൊങ്ക്)
    for (let p = 0; p < 3; p++) {
      const pa = p * 2.1;
      const fruitGeo = new THREE.SphereGeometry(0.3 * scale, 6, 6);
      const fruit = new THREE.Mesh(fruitGeo, this.fruitMatPalmyra);
      fruit.position.set(Math.sin(pa) * 0.35 * scale, -0.45 * scale, Math.cos(pa) * 0.35 * scale);
      crown.add(fruit);
    }
    palm.add(crown);

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(2.8 * scale, 12), this.shadowMat);
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

    // Clump of 9 segmented yellow-green culms
    for (let c = 0; c < 9; c++) {
      const ca = (c / 9) * Math.PI * 2;
      const cr = (0.2 + (c % 3) * 0.25) * scale;
      const bh = (5.5 + (c % 4) * 0.7) * scale;

      const culmGeo = new THREE.CylinderGeometry(0.06 * scale, 0.08 * scale, bh, 6);
      const culm = new THREE.Mesh(culmGeo, this.culmMatBamboo);
      culm.position.set(Math.sin(ca) * cr, bh / 2, Math.cos(ca) * cr);
      culm.rotation.z = (Math.sin(ca) * 0.08);
      clump.add(culm);

      // Node rings
      for (let ny = 0.8 * scale; ny < bh; ny += 0.9 * scale) {
        const ringGeo = new THREE.CylinderGeometry(0.075 * scale, 0.075 * scale, 0.04 * scale, 6);
        const ring = new THREE.Mesh(ringGeo, this.ringMatAreca);
        ring.position.set(Math.sin(ca) * cr, ny, Math.cos(ca) * cr);
        clump.add(ring);
      }
    }

    // Feathery arching leaf plume
    const plumeGeo = new THREE.SphereGeometry(2.4 * scale, 7, 7);
    plumeGeo.scale(1.2, 0.7, 1.2);
    const plume = new THREE.Mesh(plumeGeo, this.leafMatBamboo);
    plume.position.set(0, 6.2 * scale, 0);
    clump.add(plume);

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(2.4 * scale, 10), this.shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.08;
    clump.add(shadow);

    clump.scale.set(1.4, 1.4, 1.4);
    return clump;
  }

  // =========================================================================
  // 11. TropicalShrub (ചെമ്പരത്തി & തെച്ചി Flowering Shrubs)
  // =========================================================================
  public static createTropicalShrubModel(scale = 1.0): THREE.Group {
    const shrub = new THREE.Group();
    shrub.name = 'kerala_tropical_shrub';

    // Bushy dome foliage
    const bushGeo = new THREE.SphereGeometry(1.4 * scale, 7, 7);
    bushGeo.scale(1.3, 0.85, 1.3);
    const bush = new THREE.Mesh(bushGeo, this.leafMatShrub);
    bush.position.set(0, 1.0 * scale, 0);
    shrub.add(bush);

    // Flowers (Red Hibiscus or Orange Ixora)
    for (let fl = 0; fl < 7; fl++) {
      const fla = fl * 0.9;
      const flGeo = new THREE.SphereGeometry(0.12 * scale, 5, 5);
      const flMat = (fl % 2 === 0) ? this.flowerMatHibiscus : this.flowerMatIxora;
      const flower = new THREE.Mesh(flGeo, flMat);
      flower.position.set(Math.sin(fla) * 1.1 * scale, (0.8 + (fl % 3) * 0.3) * scale, Math.cos(fla) * 1.1 * scale);
      shrub.add(flower);
    }

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.6 * scale, 8), this.shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.08;
    shrub.add(shadow);

    shrub.scale.set(1.4, 1.4, 1.4);
    return shrub;
  }

  // =========================================================================
  // 12. Paddy (നെൽച്ചെടി with Golden Grain Panicles)
  // =========================================================================
  public static createPaddyClumpModel(scale = 1.0): THREE.Group {
    const paddy = new THREE.Group();
    paddy.name = 'kerala_paddy_clump';

    // Rice seedling stems
    for (let s = 0; s < 8; s++) {
      const sa = (s / 8) * Math.PI * 2;
      const sr = 0.25 * scale;
      const stemGeo = new THREE.CylinderGeometry(0.015 * scale, 0.02 * scale, 0.9 * scale, 4);
      const stem = new THREE.Mesh(stemGeo, this.stemMatPaddy);
      stem.position.set(Math.sin(sa) * sr, 0.45 * scale, Math.cos(sa) * sr);
      stem.rotation.z = Math.sin(sa) * 0.15;
      paddy.add(stem);

      // Drooping golden rice panicles (നെൽക്കതിരുകൾ)
      const grainGeo = new THREE.BoxGeometry(0.05 * scale, 0.28 * scale, 0.03 * scale);
      const grain = new THREE.Mesh(grainGeo, this.grainMatPaddy);
      grain.position.set(Math.sin(sa) * (sr + 0.12 * scale), 0.85 * scale, Math.cos(sa) * (sr + 0.12 * scale));
      grain.rotation.z = Math.sin(sa) * 0.4;
      paddy.add(grain);
    }

    paddy.scale.set(1.4, 1.4, 1.4);
    return paddy;
  }

  // =========================================================================
  // 13. TeaPlant (തേയിലച്ചെടി - Contoured Tabletop Hedges)
  // =========================================================================
  public static createTeaPlantModel(scale = 1.0): THREE.Group {
    const tea = new THREE.Group();
    tea.name = 'kerala_tea_plant';

    // Short woody stem
    const stemGeo = new THREE.CylinderGeometry(0.1 * scale, 0.14 * scale, 0.45 * scale, 6);
    const stem = new THREE.Mesh(stemGeo, this.trunkMatWood);
    stem.position.set(0, 0.22 * scale, 0);
    tea.add(stem);

    // Contoured Tabletop trimmed tea bush (മുകൾഭാഗം നിരപ്പാക്കിയ തേയിലപ്പൊന്ത)
    const bushGeo = new THREE.CylinderGeometry(1.2 * scale, 0.9 * scale, 0.7 * scale, 10);
    const bush = new THREE.Mesh(bushGeo, this.leafMatTea);
    bush.position.set(0, 0.75 * scale, 0);
    tea.add(bush);

    // Tender chartreuse top flush ("രണ്ടിലയും ഒരു കൂമ്പും")
    const flushGeo = new THREE.BoxGeometry(1.1 * scale, 0.08 * scale, 1.1 * scale);
    const flush = new THREE.Mesh(flushGeo, this.leafMatTeaFlush);
    flush.position.set(0, 1.12 * scale, 0);
    tea.add(flush);

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.3 * scale, 8), this.shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.08;
    tea.add(shadow);

    tea.scale.set(1.4, 1.4, 1.4);
    return tea;
  }

  // =========================================================================
  // 14. CoffeePlant (കാപ്പിചെടി with Red Coffee Cherries)
  // =========================================================================
  public static createCoffeePlantModel(scale = 1.0): THREE.Group {
    const coffee = new THREE.Group();
    coffee.name = 'kerala_coffee_plant';

    // Multi-branched shrub stem
    const stemGeo = new THREE.CylinderGeometry(0.12 * scale, 0.16 * scale, 1.2 * scale, 6);
    const stem = new THREE.Mesh(stemGeo, this.trunkMatWood);
    stem.position.set(0, 0.6 * scale, 0);
    coffee.add(stem);

    // Tiered horizontal branches with dark glossy leaves
    for (let t = 0; t < 2; t++) {
      const ty = (1.1 + t * 0.7) * scale;
      const bGeo = new THREE.BoxGeometry(1.8 * scale, 0.22 * scale, 1.8 * scale);
      const branch = new THREE.Mesh(bGeo, this.leafMatCoffee);
      branch.position.set(0, ty, 0);
      branch.rotation.y = t * 0.6;
      coffee.add(branch);

      // Clusters of ripe crimson-red coffee cherries (കാപ്പിക്കുരു)
      for (let c = 0; c < 6; c++) {
        const ca = c * 1.05;
        const berryGeo = new THREE.SphereGeometry(0.08 * scale, 5, 5);
        const berry = new THREE.Mesh(berryGeo, this.fruitMatCoffee);
        berry.position.set(Math.sin(ca) * 0.7 * scale, ty, Math.cos(ca) * 0.7 * scale);
        coffee.add(berry);
      }
    }

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.5 * scale, 8), this.shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.08;
    coffee.add(shadow);

    coffee.scale.set(1.4, 1.4, 1.4);
    return coffee;
  }

  // =========================================================================
  // 15. MixedForest (നിബിഡ വനം / Multi-Layered Rainforest Patch)
  // =========================================================================
  public static createMixedForestPatchModel(scale = 1.0): THREE.Group {
    const forest = new THREE.Group();
    forest.name = 'kerala_mixed_forest_patch';

    // Tall emergent rainforest tree
    const trunkGeo = new THREE.CylinderGeometry(0.55 * scale, 0.85 * scale, 8.5 * scale, 8);
    const trunk = new THREE.Mesh(trunkGeo, this.trunkMatWood);
    trunk.position.set(0, 4.25 * scale, 0);
    forest.add(trunk);

    // Liana / Vine winding around trunk
    const vineGeo = new THREE.CylinderGeometry(0.06 * scale, 0.06 * scale, 7.5 * scale, 5);
    const vine = new THREE.Mesh(vineGeo, this.leafMatBroadleaf2);
    vine.position.set(0.4 * scale, 4.0 * scale, 0);
    vine.rotation.z = 0.12;
    forest.add(vine);

    // Emergent multi-dome canopy
    const c1Geo = new THREE.SphereGeometry(4.2 * scale, 8, 8);
    c1Geo.scale(1.3, 0.8, 1.3);
    const c1 = new THREE.Mesh(c1Geo, this.leafMatBroadleaf1);
    c1.position.set(0, 9.2 * scale, 0);
    forest.add(c1);

    // Sub-canopy understory tree
    const subTrunkGeo = new THREE.CylinderGeometry(0.2 * scale, 0.3 * scale, 4.2 * scale, 6);
    const subTrunk = new THREE.Mesh(subTrunkGeo, this.trunkMatWood);
    subTrunk.position.set(2.2 * scale, 2.1 * scale, 1.2 * scale);
    forest.add(subTrunk);

    const subCanopyGeo = new THREE.SphereGeometry(2.0 * scale, 7, 7);
    const subCanopy = new THREE.Mesh(subCanopyGeo, this.leafMatBroadleaf2);
    subCanopy.position.set(2.2 * scale, 4.5 * scale, 1.2 * scale);
    forest.add(subCanopy);

    // Forest floor wild ferns & shrubs
    const fernGeo = new THREE.SphereGeometry(1.2 * scale, 6, 6);
    fernGeo.scale(1.2, 0.4, 1.2);
    const fern = new THREE.Mesh(fernGeo, this.leafMatShrub);
    fern.position.set(-1.8 * scale, 0.3 * scale, -1.2 * scale);
    forest.add(fern);

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(5.2 * scale, 14), this.shadowMat);
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

      // In Paddy fields: trees strictly along field bunds (വരമ്പുകൾ)
      if (profile.treeProfile.onlyOnBunds) {
        if (seededRandom(seed + 4) > 0.5) {
          rx = chunkX * chunkSize - chunkSize / 2 + (seededRandom(seed + 5) > 0.5 ? 8 : chunkSize - 8);
        } else {
          rz = chunkZ * chunkSize - chunkSize / 2 + (seededRandom(seed + 6) > 0.5 ? 8 : chunkSize - 8);
        }
      }

      // Strict Obstacle & Road Clearance check (Zero Collision with roads, buildings, water, landmarks)
      if (obstacleMap.isBlocked(rx, rz, 3.8)) {
        continue;
      }

      const scale = 0.9 + seededRandom(seed + 2) * 0.25;
      const typeRoll = seededRandom(seed + 7);
      let treeModel: THREE.Group;

      // =====================================================================
      // 1. Urban (City Center)
      // Rule: Absolutely NO coffee, tea, rubber, or paddy in dense city centers!
      // Uses stately avenue RainTrees, Mango trees, ornamental palms, and shrubs.
      // =====================================================================
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

      // =====================================================================
      // 2. Highland / Western Ghats / Mountain Slopes (Hilly)
      // Rule: Highlands exclusively feature Tea, Coffee, Bamboo, and Mountain trees!
      // =====================================================================
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

      // =====================================================================
      // 3. Plantation Zone (റബ്ബർ / കവുങ്ങ് / കാപ്പി തോട്ടങ്ങൾ)
      // =====================================================================
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

      // =====================================================================
      // 4. Forest Zone (നിബിഡ വനം / Rainforest)
      // =====================================================================
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

      // =====================================================================
      // 5. Coastal & Backwater (കടൽത്തീരവും കായലും)
      // Dense coconut palm belts leaning over water with palmyra & shrubs
      // =====================================================================
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

      // =====================================================================
      // 6. Paddy & Wetland (നെൽപ്പാടങ്ങളും ചതുപ്പും)
      // =====================================================================
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

      // =====================================================================
      // 7. Suburban & Rural (Classic Kerala Mixed Homestead Flora)
      // Coconut, Arecanut, Banana, Mango, Jackfruit, Banyan, Bamboo, Shrubs
      // =====================================================================
      else {
        if (typeRoll < 0.28) {
          treeModel = this.createCoconutTreeModel(scale);
        } else if (typeRoll < 0.48) {
          treeModel = this.createArecanutTreeModel(scale);
        } else if (typeRoll < 0.64) {
          treeModel = this.createBananaPlantModel(scale);
        } else if (typeRoll < 0.76) {
          treeModel = this.createMangoTreeModel(scale);
        } else if (typeRoll < 0.86) {
          treeModel = this.createJackfruitTreeModel(scale);
        } else if (typeRoll < 0.92) {
          treeModel = this.createBambooClumpModel(scale);
        } else if (typeRoll < 0.96) {
          treeModel = this.createBanyanTreeModel(scale);
        } else {
          treeModel = this.createTropicalShrubModel(scale);
        }
      }

      treeModel.position.set(rx, 0, rz);
      treeModel.rotation.y = seededRandom(seed + 3) * Math.PI * 2;
      group.add(treeModel);
    }

    return group;
  }
}
