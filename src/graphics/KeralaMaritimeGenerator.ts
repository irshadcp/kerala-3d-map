import * as THREE from 'three';

export class KeralaMaritimeGenerator {
  /**
   * 1. Traditional Kerala Houseboat (കെട്ടുവള്ളം - Kettuvallam)
   * Curved wooden hull tied with coir rope, arched woven thatch roof, front viewing deck, windows.
   */
  public static createHouseboatModel(): THREE.Group {
    const boat = new THREE.Group();
    boat.name = 'kerala_houseboat';

    const hullMat = new THREE.MeshLambertMaterial({ color: 0x451a03 }); // Dark oiled teak wood
    const thatchMat = new THREE.MeshLambertMaterial({ color: 0xb45309 }); // Golden-brown woven palm thatch
    const bambooMat = new THREE.MeshLambertMaterial({ color: 0xd97706 }); // Bamboo rib framing
    const deckMat = new THREE.MeshLambertMaterial({ color: 0x78350f }); // Wooden floor planks
    const whiteMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });

    // 1. Curved Hull (Length 15m, Width 3.6m, Depth 1.4m)
    const hullGeo = new THREE.BoxGeometry(3.6, 1.2, 14.5);
    const hull = new THREE.Mesh(hullGeo, hullMat);
    hull.position.y = 0.5;
    boat.add(hull);

    // Upturned Bow (Prow / മുൻഭാഗം)
    const bowGeo = new THREE.ConeGeometry(1.8, 2.5, 4);
    const bow = new THREE.Mesh(bowGeo, hullMat);
    bow.position.set(0, 0.95, 7.8);
    bow.rotation.x = -Math.PI / 4;
    bow.rotation.y = Math.PI / 4;
    boat.add(bow);

    // Upturned Stern (പിൻഭാഗം)
    const sternGeo = new THREE.ConeGeometry(1.8, 2.2, 4);
    const stern = new THREE.Mesh(sternGeo, hullMat);
    stern.position.set(0, 0.9, -7.8);
    stern.rotation.x = Math.PI / 4;
    stern.rotation.y = Math.PI / 4;
    boat.add(stern);

    // 2. Open Front Sun Deck (മുൻവശത്തെ ഇരിപ്പിടം)
    const deckGeo = new THREE.BoxGeometry(3.4, 0.15, 3.5);
    const deck = new THREE.Mesh(deckGeo, deckMat);
    deck.position.set(0, 1.15, 5.0);
    boat.add(deck);

    // Front Railing
    for (const rx of [-1.6, 1.6]) {
      const railGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 6);
      const railPost = new THREE.Mesh(railGeo, bambooMat);
      railPost.position.set(rx, 1.55, 6.2);
      boat.add(railPost);
    }
    const frontRailBarGeo = new THREE.BoxGeometry(3.3, 0.06, 0.06);
    const frontRailBar = new THREE.Mesh(frontRailBarGeo, bambooMat);
    frontRailBar.position.set(0, 1.9, 6.2);
    boat.add(frontRailBar);

    // 3. Arched Woven Thatch Canopy (പനയോല മേൽക്കൂര)
    // Modeled with cylinder semi-tube along z-axis
    const canopyGeo = new THREE.CylinderGeometry(1.8, 1.8, 9.5, 16, 1, false, 0, Math.PI);
    const canopy = new THREE.Mesh(canopyGeo, thatchMat);
    canopy.position.set(0, 1.9, -1.0);
    canopy.rotation.z = Math.PI / 2;
    canopy.rotation.y = Math.PI / 2;
    boat.add(canopy);

    // Bamboo Rib Arches along canopy
    for (let r = -4.0; r <= 3.5; r += 1.8) {
      const ribGeo = new THREE.TorusGeometry(1.82, 0.04, 6, 16, Math.PI);
      const rib = new THREE.Mesh(ribGeo, bambooMat);
      rib.position.set(0, 1.9, r);
      boat.add(rib);
    }

    // Window Openings (Cutout boxes along sides)
    for (const side of [-1.82, 1.82]) {
      for (let w = -3.2; w <= 2.2; w += 2.2) {
        const winGeo = new THREE.BoxGeometry(0.1, 0.6, 1.0);
        const winMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
        const win = new THREE.Mesh(winGeo, winMat);
        win.position.set(side, 1.9, w);
        boat.add(win);
      }
    }

    // Little flag on bow
    const mastGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.4, 6);
    const mast = new THREE.Mesh(mastGeo, bambooMat);
    mast.position.set(0, 2.1, 7.8);
    boat.add(mast);

    const flagGeo = new THREE.BoxGeometry(0.02, 0.35, 0.6);
    const flag = new THREE.Mesh(flagGeo, whiteMat);
    flag.position.set(0, 2.5, 7.5);
    boat.add(flag);

    return boat;
  }

  /**
   * 2. Traditional Country Fishing Boat / Canoe (വള്ളം / ചെറുവഞ്ചി)
   * Slender wood canoe resting by the water edge.
   */
  public static createFishingBoatModel(): THREE.Group {
    const canoe = new THREE.Group();
    canoe.name = 'kerala_fishing_boat';

    const hullMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 }); // Bright Kerala coastal sky-blue
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x78350f });

    // Slender Hull
    const hullGeo = new THREE.BoxGeometry(1.2, 0.5, 5.5);
    const hull = new THREE.Mesh(hullGeo, hullMat);
    hull.position.y = 0.25;
    canoe.add(hull);

    // Pointed Bow & Stern
    for (const dir of [1, -1]) {
      const tipGeo = new THREE.ConeGeometry(0.6, 1.2, 4);
      const tip = new THREE.Mesh(tipGeo, hullMat);
      tip.position.set(0, 0.35, dir * 3.1);
      tip.rotation.x = dir * (Math.PI / 4);
      tip.rotation.y = Math.PI / 4;
      canoe.add(tip);
    }

    // Cross Seating Planks
    for (const z of [-1.4, 0, 1.4]) {
      const plankGeo = new THREE.BoxGeometry(1.1, 0.08, 0.35);
      const plank = new THREE.Mesh(plankGeo, woodMat);
      plank.position.set(0, 0.45, z);
      canoe.add(plank);
    }

    // Crossed Oar
    const oarGeo = new THREE.CylinderGeometry(0.03, 0.03, 3.2, 6);
    const oar = new THREE.Mesh(oarGeo, woodMat);
    oar.position.set(0.1, 0.6, 0);
    oar.rotation.z = 0.25;
    oar.rotation.y = 0.4;
    canoe.add(oar);

    return canoe;
  }

  /**
   * 3. Waterfront Boat Jetty (ബോട്ട് ജെട്ടി)
   * Wooden pier with passenger shelter and mooring posts.
   */
  public static createBoatJettyModel(): THREE.Group {
    const jetty = new THREE.Group();
    jetty.name = 'kerala_boat_jetty';

    const woodPlankMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
    const postMat = new THREE.MeshLambertMaterial({ color: 0x334155 }); // Dark piling posts
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 }); // Coastal blue roof
    const whiteMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });

    // Boardwalk Pier (8m long x 3.5m wide)
    const deckGeo = new THREE.BoxGeometry(3.5, 0.3, 8.0);
    const deck = new THREE.Mesh(deckGeo, woodPlankMat);
    deck.position.set(0, 0.45, 0);
    jetty.add(deck);

    // Support Pilings
    for (const px of [-1.5, 1.5]) {
      for (const pz of [-3.5, -1.0, 1.5, 3.5]) {
        const pilingGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.2, 8);
        const piling = new THREE.Mesh(pilingGeo, postMat);
        piling.position.set(px, 0.1, pz);
        jetty.add(piling);
      }
    }

    // Small Passenger Waiting Shelter on bank end
    const shelterWallGeo = new THREE.BoxGeometry(3.0, 2.2, 2.4);
    const shelter = new THREE.Mesh(shelterWallGeo, whiteMat);
    shelter.position.set(0, 1.5, -2.4);
    jetty.add(shelter);

    const shelterRoofGeo = new THREE.ConeGeometry(2.6, 1.2, 4);
    const shelterRoof = new THREE.Mesh(shelterRoofGeo, roofMat);
    shelterRoof.position.set(0, 3.1, -2.4);
    shelterRoof.rotation.y = Math.PI / 4;
    jetty.add(shelterRoof);

    // Mooring Bollards at outer water edge
    for (const bx of [-1.4, 1.4]) {
      const bollardGeo = new THREE.CylinderGeometry(0.1, 0.14, 0.45, 8);
      const bollard = new THREE.Mesh(bollardGeo, postMat);
      bollard.position.set(bx, 0.8, 3.6);
      jetty.add(bollard);
    }

    return jetty;
  }

  /**
   * 4. Coastal Fish Market (തീരദേശ മീൻ ചന്ത)
   * Open market pavilion with blue roof, display stalls, and fish crates.
   */
  public static createFishMarketModel(): THREE.Group {
    const market = new THREE.Group();
    market.name = 'kerala_fish_market';

    const roofMat = new THREE.MeshLambertMaterial({ color: 0x2563eb }); // Tarpaulin blue
    const concreteMat = new THREE.MeshLambertMaterial({ color: 0xe2e8f0 });
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
    const crateMat = new THREE.MeshLambertMaterial({ color: 0xf59e0b }); // Orange-yellow fish baskets

    // Raised concrete market slab
    const floorGeo = new THREE.BoxGeometry(6.5, 0.3, 5.0);
    const floor = new THREE.Mesh(floorGeo, concreteMat);
    floor.position.set(0, 0.15, 0);
    market.add(floor);

    // 4 Corner Pillars
    for (const px of [-2.8, 2.8]) {
      for (const pz of [-2.0, 2.0]) {
        const pillarGeo = new THREE.CylinderGeometry(0.09, 0.09, 2.4, 6);
        const pillar = new THREE.Mesh(pillarGeo, woodMat);
        pillar.position.set(px, 1.35, pz);
        market.add(pillar);
      }
    }

    // Sloping Shed Roof
    const roofGeo = new THREE.ConeGeometry(4.6, 1.4, 4);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 3.1, 0);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.1, 1, 0.85);
    market.add(roof);

    // Fish Display Counter Slabs
    for (const cz of [-1.0, 1.0]) {
      const tableGeo = new THREE.BoxGeometry(4.8, 0.8, 0.9);
      const table = new THREE.Mesh(tableGeo, concreteMat);
      table.position.set(0, 0.7, cz);
      market.add(table);

      // Crates on table
      for (let i = -1.6; i <= 1.6; i += 1.0) {
        const crateGeo = new THREE.BoxGeometry(0.65, 0.25, 0.55);
        const crate = new THREE.Mesh(crateGeo, crateMat);
        crate.position.set(i, 1.2, cz);
        market.add(crate);
      }
    }

    return market;
  }
}
