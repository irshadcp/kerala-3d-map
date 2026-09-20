import * as THREE from 'three';

export class KeralaHighlandGenerator {
  /**
   * 1. Tea Plantation Bush Cluster (തേയിലത്തോട്ടം)
   * Dense, manicured rounded tea bushes in lush plantation green.
   */
  public static createTeaClusterModel(count = 7): THREE.Group {
    const cluster = new THREE.Group();
    cluster.name = 'kerala_tea_cluster';

    const colors = [0x15803d, 0x16a34a, 0x14532d];
    const bushGeo = new THREE.SphereGeometry(1.2, 8, 8);
    bushGeo.scale(1.2, 0.7, 1.2); // Flattened dome bush

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const dist = 1.2 + (i % 3) * 0.8;
      const bx = Math.sin(angle) * dist;
      const bz = Math.cos(angle) * dist;

      const mat = new THREE.MeshLambertMaterial({
        color: colors[i % colors.length],
      });
      const bush = new THREE.Mesh(bushGeo, mat);
      bush.position.set(bx, 0.5, bz);
      bush.rotation.y = angle;
      cluster.add(bush);
    }

    cluster.scale.set(1.4, 1.4, 1.4);
    return cluster;
  }

  /**
   * 2. Forest Department Check Post (ഫോറസ്റ്റ് ചെക്ക് പോസ്റ്റ്)
   * Striped boom barrier gate (Red & White), forest green cabin, warning sign.
   */
  public static createCheckPostModel(): THREE.Group {
    const checkPost = new THREE.Group();
    checkPost.name = 'kerala_forest_checkpost';

    const cabinMat = new THREE.MeshLambertMaterial({ color: 0x14532d }); // Kerala forest green
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const whiteMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });
    const redMat = new THREE.MeshLambertMaterial({ color: 0xdc2626 });
    const postMat = new THREE.MeshLambertMaterial({ color: 0x475569 });

    // Guard Cabin (2.6m x 2.4m x 2.4m)
    const cabinGeo = new THREE.BoxGeometry(2.6, 2.4, 2.4);
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(-2.0, 1.2, 0);
    checkPost.add(cabin);

    // Overhanging Roof
    const roofGeo = new THREE.ConeGeometry(2.4, 1.0, 4);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(-2.0, 2.8, 0);
    roof.rotation.y = Math.PI / 4;
    checkPost.add(roof);

    // Barrier Gate Fulcrum Post
    const barrierBaseGeo = new THREE.BoxGeometry(0.5, 1.1, 0.5);
    const barrierBase = new THREE.Mesh(barrierBaseGeo, postMat);
    barrierBase.position.set(0, 0.55, 0);
    checkPost.add(barrierBase);

    // Striped Barrier Arm (6m long horizontal boom barrier)
    const stripeCount = 6;
    const stripeWidth = 0.9;
    for (let s = 0; s < stripeCount; s++) {
      const segGeo = new THREE.BoxGeometry(stripeWidth, 0.12, 0.08);
      const segMat = s % 2 === 0 ? redMat : whiteMat;
      const seg = new THREE.Mesh(segGeo, segMat);
      seg.position.set(0.6 + s * stripeWidth, 1.05, 0);
      checkPost.add(seg);
    }

    // Signboard on cabin: "FOREST CHECK POST"
    const signGeo = new THREE.BoxGeometry(1.8, 0.45, 0.06);
    const signMat = new THREE.MeshLambertMaterial({ color: 0xfacc15 }); // Bright yellow sign
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(-2.0, 2.2, 1.25);
    checkPost.add(sign);

    checkPost.scale.set(1.4, 1.4, 1.4);
    return checkPost;
  }

  /**
   * 3. Mountain Viewpoint (വ്യൂ പോയിന്റ്)
   * Stone observation terrace, rustic log railing, scenic viewpoint marker.
   */
  public static createViewpointModel(): THREE.Group {
    const viewpoint = new THREE.Group();
    viewpoint.name = 'kerala_mountain_viewpoint';

    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.8 });

    // Raised Circular Terrace
    const terraceGeo = new THREE.CylinderGeometry(4.0, 4.2, 0.5, 16);
    const terrace = new THREE.Mesh(terraceGeo, stoneMat);
    terrace.position.y = 0.25;
    viewpoint.add(terrace);

    // Outer Rustic Log Railings (Posts and Top Rail)
    const postCount = 12;
    for (let i = 0; i < postCount; i++) {
      const angle = (i / postCount) * Math.PI * 2;
      const px = Math.sin(angle) * 3.8;
      const pz = Math.cos(angle) * 3.8;

      const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.0, 6);
      const post = new THREE.Mesh(postGeo, woodMat);
      post.position.set(px, 0.9, pz);
      viewpoint.add(post);
    }

    // Circular Top Rail
    const railGeo = new THREE.TorusGeometry(3.8, 0.05, 6, 24);
    const rail = new THREE.Mesh(railGeo, woodMat);
    rail.rotation.x = Math.PI / 2;
    rail.position.y = 1.35;
    viewpoint.add(rail);

    // Panoramic Binoculars / Telescope Stand in Center
    const binoStandGeo = new THREE.CylinderGeometry(0.08, 0.12, 1.4, 8);
    const binoStand = new THREE.Mesh(binoStandGeo, brassMat);
    binoStand.position.set(0, 0.9, 0);
    viewpoint.add(binoStand);

    const binoBodyGeo = new THREE.BoxGeometry(0.4, 0.2, 0.35);
    const binoBody = new THREE.Mesh(binoBodyGeo, brassMat);
    binoBody.position.set(0, 1.6, 0);
    viewpoint.add(binoBody);

    viewpoint.scale.set(1.35, 1.35, 1.35);
    return viewpoint;
  }

  /**
   * 4. Laterite Soil Cut & Hillside Cutting (ചെങ്കൽ കുന്നുകൾ / ചെങ്കൽ തട്ടുകൾ)
   * Terraced cut laterite soil face with red laterite stone blocks,
   * quarry block textures, and green hillside shrubs on top.
   */
  public static createLateriteCutModel(): THREE.Group {
    const cut = new THREE.Group();
    cut.name = 'kerala_laterite_cut';

    const redEarthMat = new THREE.MeshLambertMaterial({ color: 0x9a3412 }); // Terracotta-red laterite earth
    const cutStoneMat = new THREE.MeshLambertMaterial({ color: 0xb45309 }); // Golden-red cut stone
    const darkStoneMat = new THREE.MeshLambertMaterial({ color: 0x7c2d12 });
    const shrubMat = new THREE.MeshLambertMaterial({ color: 0x16a34a });

    // Tier 1 Base Bank (7m wide x 3.5m deep x 1.4m high)
    const tier1Geo = new THREE.BoxGeometry(7.0, 1.4, 3.5);
    const tier1 = new THREE.Mesh(tier1Geo, redEarthMat);
    tier1.position.set(0, 0.7, 0);
    cut.add(tier1);

    // Tier 2 Upper Terraced Cutting (5.5m wide x 2.4m deep x 1.6m high)
    const tier2Geo = new THREE.BoxGeometry(5.5, 1.6, 2.4);
    const tier2 = new THREE.Mesh(tier2Geo, cutStoneMat);
    tier2.position.set(0, 2.2, -0.5);
    cut.add(tier2);

    // Stacked Cut Laterite Blocks (വെട്ടുകല്ല് പാടുകൾ) on the terrace
    for (let i = 0; i < 6; i++) {
      const bx = -2.0 + (i % 3) * 1.5;
      const bz = i >= 3 ? 0.8 : 1.3;
      const blockGeo = new THREE.BoxGeometry(1.2, 0.45, 0.6);
      const block = new THREE.Mesh(blockGeo, (i % 2 === 0 ? cutStoneMat : darkStoneMat));
      block.position.set(bx, 1.62, bz);
      cut.add(block);
    }

    // Wild shrubs & grasses on the top ridge
    for (let s = 0; s < 4; s++) {
      const sx = -2.0 + s * 1.3;
      const shrubGeo = new THREE.SphereGeometry(0.7, 6, 6);
      shrubGeo.scale(1.2, 0.6, 1.2);
      const shrub = new THREE.Mesh(shrubGeo, shrubMat);
      shrub.position.set(sx, 3.2, -0.6);
      cut.add(shrub);
    }

    cut.scale.set(1.4, 1.4, 1.4);
    return cut;
  }

  /**
   * 5. Western Ghats Rocky Granite Outcrop (കരിങ്കൽ പാറക്കെട്ടുകൾ / മലഞ്ചെരിവുകൾ)
   * Angular granite boulder crag with crevices and mountain vegetation.
   */
  public static createRockyGraniteOutcropModel(): THREE.Group {
    const outcrop = new THREE.Group();
    outcrop.name = 'kerala_rocky_outcrop';

    const rockMat1 = new THREE.MeshLambertMaterial({ color: 0x475569 }); // Slate granite
    const rockMat2 = new THREE.MeshLambertMaterial({ color: 0x334155 }); // Dark weathered rock
    const grassMat = new THREE.MeshLambertMaterial({ color: 0x65a30d }); // Highland wild tuft

    const boulderConfigs = [
      { x: 0, y: 1.5, z: 0, sx: 4.5, sy: 3.0, sz: 3.8, rotY: 0.3, mat: rockMat1 },
      { x: -2.2, y: 1.0, z: 0.8, sx: 3.2, sy: 2.0, sz: 2.8, rotY: -0.4, mat: rockMat2 },
      { x: 2.4, y: 1.2, z: -0.6, sx: 3.4, sy: 2.4, sz: 2.6, rotY: 0.7, mat: rockMat2 },
      { x: -0.8, y: 3.2, z: -0.4, sx: 2.8, sy: 1.6, sz: 2.4, rotY: 0.2, mat: rockMat1 },
    ];

    for (const bc of boulderConfigs) {
      const geo = new THREE.DodecahedronGeometry(1.0, 1);
      geo.scale(bc.sx / 2, bc.sy / 2, bc.sz / 2);
      const mesh = new THREE.Mesh(geo, bc.mat);
      mesh.position.set(bc.x, bc.y, bc.z);
      mesh.rotation.set(0.1, bc.rotY, -0.1);
      outcrop.add(mesh);
    }

    // Mountain grass & moss tufts in crevices
    for (let t = 0; t < 5; t++) {
      const tx = -2.0 + t * 1.0;
      const tuftGeo = new THREE.SphereGeometry(0.5, 5, 5);
      tuftGeo.scale(1.4, 0.4, 1.4);
      const tuft = new THREE.Mesh(tuftGeo, grassMat);
      tuft.position.set(tx, 0.3, 1.8);
      outcrop.add(tuft);
    }

    outcrop.scale.set(1.4, 1.4, 1.4);
    return outcrop;
  }
}
