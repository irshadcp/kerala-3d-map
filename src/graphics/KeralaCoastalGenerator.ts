import * as THREE from 'three';

export class KeralaCoastalGenerator {
  /**
   * 1. Coastal Seawall (കടൽഭിത്തി - Seawall / Riprap)
   * Heavy interlocking granite boulders stacked along coastal roads to protect from high waves.
   */
  public static createSeawallModel(length = 24): THREE.Group {
    const wall = new THREE.Group();
    wall.name = 'kerala_seawall';

    const rockColors = [0x334155, 0x475569, 0x1e293b, 0x52525b];
    const concreteMat = new THREE.MeshLambertMaterial({ color: 0xcfd8dc });

    // Paved concrete walkway curb on road edge
    const curbGeo = new THREE.BoxGeometry(length, 0.45, 1.2);
    const curb = new THREE.Mesh(curbGeo, concreteMat);
    curb.position.set(0, 0.22, -1.2);
    wall.add(curb);

    // Multi-layered interlocking granite boulders facing seaward
    const boulderGeo = new THREE.DodecahedronGeometry(1.2, 0); // Faceted rock geometry

    const rockCount = Math.floor(length / 2.2);
    for (let i = 0; i < rockCount; i++) {
      const rx = -length / 2 + 1.2 + i * 2.2;
      
      // Bottom layer boulders
      for (let layer = 0; layer < 2; layer++) {
        const mat = new THREE.MeshLambertMaterial({
          color: rockColors[(i + layer) % rockColors.length],
        });
        const rock = new THREE.Mesh(boulderGeo, mat);
        const zOffset = layer === 0 ? 0.2 : 1.4;
        const yOffset = layer === 0 ? 0.75 : 0.55;
        const scaleVar = 0.85 + Math.sin(i * 3 + layer) * 0.25;

        rock.position.set(rx + (layer * 0.4), yOffset, zOffset);
        rock.scale.set(scaleVar * 1.3, scaleVar * 0.95, scaleVar * 1.2);
        rock.rotation.set(Math.sin(i) * 0.5, Math.cos(i) * 0.5, (i % 2) * 0.4);
        wall.add(rock);
      }

      // Top interlocking rock
      const topMat = new THREE.MeshLambertMaterial({
        color: rockColors[(i * 2) % rockColors.length],
      });
      const topRock = new THREE.Mesh(boulderGeo, topMat);
      topRock.position.set(rx + 0.2, 1.35, 0.7);
      topRock.scale.set(1.1, 0.85, 1.1);
      topRock.rotation.y = i * 0.7;
      wall.add(topRock);
    }

    wall.scale.set(1.35, 1.35, 1.35);
    return wall;
  }

  /**
   * 2. Breakwater (പുലിമുട്ട് - Granite Boulder Breakwater with Navigation Beacon)
   * Iconic rock groyne projecting 45m straight into the sea waves with a light tower at the tip.
   */
  public static createBreakwaterModel(length = 42): THREE.Group {
    const breakwater = new THREE.Group();
    breakwater.name = 'kerala_breakwater';

    const rockColors = [0x1e293b, 0x334155, 0x475569];
    const pathMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
    const whiteMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });
    const redMat = new THREE.MeshLambertMaterial({ color: 0xdc2626 });
    const lightGlowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    // Flat Walking Ridge along the spine of the breakwater
    const pathGeo = new THREE.BoxGeometry(4.0, 0.8, length);
    const path = new THREE.Mesh(pathGeo, pathMat);
    path.position.set(0, 1.2, length / 2);
    breakwater.add(path);

    // Granite Armor Stones on left and right flanks
    const rockGeo = new THREE.DodecahedronGeometry(1.6, 0);
    const segCount = Math.floor(length / 2.8);

    for (let s = 0; s < segCount; s++) {
      const sz = 2.0 + s * 2.8;

      for (const side of [-1, 1]) {
        const mat = new THREE.MeshLambertMaterial({
          color: rockColors[(s + (side > 0 ? 1 : 0)) % rockColors.length],
        });
        const rock = new THREE.Mesh(rockGeo, mat);
        rock.position.set(side * 2.8, 0.9, sz);
        rock.scale.set(1.4, 1.0, 1.3);
        rock.rotation.set(Math.sin(s) * 0.4, Math.cos(s) * 0.5, 0.2 * side);
        breakwater.add(rock);

        // Lower submerged rocks
        const lowRock = new THREE.Mesh(rockGeo, mat);
        lowRock.position.set(side * 4.2, 0.4, sz);
        lowRock.scale.set(1.6, 0.8, 1.4);
        breakwater.add(lowRock);
      }
    }

    // Circular Beacon Platform at the Sea Tip
    const tipZ = length;
    const tipGeo = new THREE.CylinderGeometry(4.5, 5.0, 1.6, 16);
    const tip = new THREE.Mesh(tipGeo, pathMat);
    tip.position.set(0, 1.2, tipZ);
    breakwater.add(tip);

    // Maritime Navigation Light Beacon Tower (ലൈറ്റ് ബീക്കൺ)
    // Red & white striped cylindrical column
    const towerBaseGeo = new THREE.CylinderGeometry(1.4, 1.6, 1.5, 12);
    const towerBase = new THREE.Mesh(towerBaseGeo, whiteMat);
    towerBase.position.set(0, 2.75, tipZ);
    breakwater.add(towerBase);

    const towerMidGeo = new THREE.CylinderGeometry(1.1, 1.3, 2.2, 12);
    const towerMid = new THREE.Mesh(towerMidGeo, redMat);
    towerMid.position.set(0, 4.6, tipZ);
    breakwater.add(towerMid);

    const towerTopGeo = new THREE.CylinderGeometry(1.2, 1.0, 1.2, 12);
    const towerTop = new THREE.Mesh(towerTopGeo, whiteMat);
    towerTop.position.set(0, 6.3, tipZ);
    breakwater.add(towerTop);

    // Flashing Beacon Lantern Dome
    const lanternGeo = new THREE.SphereGeometry(0.65, 12, 10);
    const lantern = new THREE.Mesh(lanternGeo, lightGlowMat);
    lantern.position.set(0, 7.3, tipZ);
    breakwater.add(lantern);

    breakwater.scale.set(1.35, 1.35, 1.35);
    return breakwater;
  }

  /**
   * 3. Small Coastal Fishing House (തീരദേശ കുടിൽ / വീട്)
   * Pastel walls, blue sheet / tile roof, open sand veranda, fishing coir mats.
   */
  public static createFishingHouseModel(): THREE.Group {
    const house = new THREE.Group();
    house.name = 'kerala_fishing_house';

    const wallMat = new THREE.MeshLambertMaterial({ color: 0xbae6fd }); // Coastal pastel sky blue
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 }); // Bright marine blue sheet roof
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
    const netMat = new THREE.MeshLambertMaterial({ color: 0xd97706 }); // Dried brown coir net

    // Main Cabin (5m x 4m x 2.4m)
    const bodyGeo = new THREE.BoxGeometry(4.8, 2.4, 3.8);
    const body = new THREE.Mesh(bodyGeo, wallMat);
    body.position.set(0, 1.2, -0.6);
    house.add(body);

    // Sloping Gable Roof
    const roofGeo = new THREE.ConeGeometry(3.8, 1.4, 4);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 3.0, -0.6);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.25, 1, 1.05);
    house.add(roof);

    // Front Veranda Roof Eaves Extension
    const verandaRoofGeo = new THREE.BoxGeometry(5.0, 0.08, 2.0);
    const verandaRoof = new THREE.Mesh(verandaRoofGeo, roofMat);
    verandaRoof.position.set(0, 2.25, 1.5);
    verandaRoof.rotation.x = 0.2;
    house.add(verandaRoof);

    // 2 Veranda Wooden Posts
    for (const vx of [-2.1, 2.1]) {
      const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.1, 6);
      const post = new THREE.Mesh(postGeo, woodMat);
      post.position.set(vx, 1.05, 2.3);
      house.add(post);
    }

    // Fishing Net hanging on veranda wall
    const netGeo = new THREE.BoxGeometry(1.6, 1.2, 0.08);
    const net = new THREE.Mesh(netGeo, netMat);
    net.position.set(1.1, 1.4, 1.32);
    house.add(net);

    // Front Door
    const doorGeo = new THREE.BoxGeometry(1.1, 1.9, 0.06);
    const door = new THREE.Mesh(doorGeo, woodMat);
    door.position.set(-0.8, 0.95, 1.32);
    house.add(door);

    house.scale.set(1.35, 1.35, 1.35);
    return house;
  }

  /**
   * 4. Net Drying Racks (വല ഉണക്കുന്ന ചട്ടക്കൂട്)
   * Crossed bamboo trestles with fishing nets drying in sea air.
   */
  public static createNetDryingRackModel(): THREE.Group {
    const rack = new THREE.Group();
    rack.name = 'kerala_net_drying_rack';

    const bambooMat = new THREE.MeshLambertMaterial({ color: 0xb45309 });
    const netMat = new THREE.MeshLambertMaterial({ color: 0x1e3a8a, transparent: true, opacity: 0.85 }); // Deep blue fish net

    // 3 Bamboo A-frames
    for (const ax of [-3.0, 0, 3.0]) {
      // Crossed poles
      const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.5, 6);
      const pole1 = new THREE.Mesh(poleGeo, bambooMat);
      pole1.position.set(ax, 1.15, 0);
      pole1.rotation.z = 0.22;
      rack.add(pole1);

      const pole2 = new THREE.Mesh(poleGeo, bambooMat);
      pole2.position.set(ax, 1.15, 0);
      pole2.rotation.z = -0.22;
      rack.add(pole2);
    }

    // Horizontal Ridge Pole
    const ridgeGeo = new THREE.CylinderGeometry(0.06, 0.06, 7.2, 6);
    const ridge = new THREE.Mesh(ridgeGeo, bambooMat);
    ridge.position.set(0, 2.15, 0);
    ridge.rotation.z = Math.PI / 2;
    rack.add(ridge);

    // Draped Fish Net Mesh
    const netGeo = new THREE.BoxGeometry(6.6, 1.6, 0.15);
    const net = new THREE.Mesh(netGeo, netMat);
    net.position.set(0, 1.3, 0);
    rack.add(net);

    rack.scale.set(1.4, 1.4, 1.4);
    return rack;
  }

  /**
   * 5. Fishing Harbour Complex & Fish Auction Shed (ഫിഷിംഗ് ഹാർബറും ലേലപ്പുരയും)
   * Concrete wharf dock, unloading jib crane, covered auction hall (ലേലപ്പുര), fish crates.
   */
  public static createHarbourComplexModel(): THREE.Group {
    const harbour = new THREE.Group();
    harbour.name = 'kerala_harbour_complex';

    const quayMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 }); // Heavy concrete wharf
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x2563eb }); // Tarpaulin blue
    const steelMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    const yellowMat = new THREE.MeshLambertMaterial({ color: 0xeab308 }); // Crane yellow
    const crateMat = new THREE.MeshLambertMaterial({ color: 0xf97316 });

    // 1. Reinforced Concrete Quay Deck (18m long x 10m wide x 1.2m deep)
    const deckGeo = new THREE.BoxGeometry(18, 1.0, 10);
    const deck = new THREE.Mesh(deckGeo, quayMat);
    deck.position.set(0, 0.5, 0);
    harbour.add(deck);

    // Mooring Bollards along water edge (+Z)
    for (let bx = -7.5; bx <= 7.5; bx += 3.5) {
      const bollardGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.6, 8);
      const bollard = new THREE.Mesh(bollardGeo, steelMat);
      bollard.position.set(bx, 1.3, 4.5);
      harbour.add(bollard);
    }

    // 2. Yellow Unloading Derrick Crane (അൺലോഡിംഗ് ക്രെയിൻ)
    const craneBaseGeo = new THREE.CylinderGeometry(0.6, 0.8, 1.4, 8);
    const craneBase = new THREE.Mesh(craneBaseGeo, steelMat);
    craneBase.position.set(6.5, 1.7, 3.5);
    harbour.add(craneBase);

    // Jib arm reaching over water
    const jibGeo = new THREE.BoxGeometry(0.2, 0.25, 4.5);
    const jib = new THREE.Mesh(jibGeo, yellowMat);
    jib.position.set(6.5, 3.8, 4.8);
    jib.rotation.x = 0.4;
    harbour.add(jib);

    // 3. Fish Auction Hall / Shed (മത്സ്യ ലേലപ്പുര)
    const shedPillarGeo = new THREE.CylinderGeometry(0.1, 0.1, 3.2, 6);
    for (const px of [-7, 0, 4]) {
      for (const pz of [-3.5, 1.0]) {
        const pillar = new THREE.Mesh(shedPillarGeo, steelMat);
        pillar.position.set(px, 2.6, pz);
        harbour.add(pillar);
      }
    }

    // Open Shed Canopy Roof
    const shedRoofGeo = new THREE.ConeGeometry(8.5, 1.8, 4);
    const shedRoof = new THREE.Mesh(shedRoofGeo, roofMat);
    shedRoof.position.set(-1.5, 4.8, -1.2);
    shedRoof.rotation.y = Math.PI / 4;
    shedRoof.scale.set(1.4, 1, 0.8);
    harbour.add(shedRoof);

    // Fish Sorting & Auction Tables
    for (let i = -5; i <= 2; i += 2.8) {
      const tableGeo = new THREE.BoxGeometry(2.2, 0.8, 1.4);
      const table = new THREE.Mesh(tableGeo, quayMat);
      table.position.set(i, 1.4, -1.2);
      harbour.add(table);

      // Crates on table
      const crateGeo = new THREE.BoxGeometry(0.7, 0.3, 0.6);
      const crate = new THREE.Mesh(crateGeo, crateMat);
      crate.position.set(i, 1.95, -1.2);
      harbour.add(crate);
    }

    harbour.scale.set(1.35, 1.35, 1.35);
    return harbour;
  }

  /**
   * 6. Beached Country Fishing Boats Cluster (തീരത്തെ വള്ളങ്ങൾ)
   * 2-3 traditional colourful wooden fishing canoes tilted on the sandy beach.
   */
  public static createBeachBoatsCluster(): THREE.Group {
    const cluster = new THREE.Group();
    cluster.name = 'kerala_beach_boats_cluster';

    const colors = [0x0284c7, 0x16a34a, 0xeab308]; // Sky blue, green, yellow canoes
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x78350f });

    for (let b = 0; b < 3; b++) {
      const canoe = new THREE.Group();
      const hullMat = new THREE.MeshLambertMaterial({ color: colors[b] });

      const hullGeo = new THREE.BoxGeometry(1.2, 0.5, 5.5);
      const hull = new THREE.Mesh(hullGeo, hullMat);
      hull.position.y = 0.25;
      canoe.add(hull);

      for (const dir of [1, -1]) {
        const tipGeo = new THREE.ConeGeometry(0.6, 1.2, 4);
        const tip = new THREE.Mesh(tipGeo, hullMat);
        tip.position.set(0, 0.35, dir * 3.1);
        tip.rotation.x = dir * (Math.PI / 4);
        tip.rotation.y = Math.PI / 4;
        canoe.add(tip);
      }

      // Crossed Oar
      const oarGeo = new THREE.CylinderGeometry(0.03, 0.03, 3.2, 6);
      const oar = new THREE.Mesh(oarGeo, woodMat);
      oar.position.set(0.1, 0.55, 0);
      oar.rotation.z = 0.25;
      canoe.add(oar);

      // Natural beached tilt on the sand
      canoe.position.set(b * 3.2 - 3.2, 0.08, (b % 2) * 1.5);
      canoe.rotation.y = (b * 0.35) - 0.3;
      canoe.rotation.z = 0.12; // Tilted slightly on hull side
      cluster.add(canoe);
    }

    cluster.scale.set(1.35, 1.35, 1.35);
    return cluster;
  }
}
