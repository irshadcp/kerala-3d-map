import * as THREE from 'three';

/**
 * KeralaMaritimeGenerator
 * Stylized Low-Poly Water Transportation Engine inspired by PolyOne Studio's
 * "Vehicle Pack - Water Transportation":
 * 1. Modern Speedboat / Luxury Motor Yacht (deep-V hull, tinted windshield, radar arch, dual helm seats)
 * 2. Patrol / Coast Guard Interceptor (navy hull, orange Coast Guard stripe, enclosed wheelhouse, radar dome)
 * 3. Cargo / Container Freight Ship (commercial freighter hull, multi-tier bridge tower, stacked colorful ISO containers)
 * 4. Military Submarine (streamlined teardrop hull, conning tower sail, dive planes, cruciform rudders)
 * 5. Luxury Ocean Liner / Cruise Ship (white multi-deck promenade, bridge wings, twin smokestacks/funnels)
 * 6. Sailboat / Sloop (wooden yacht hull, vertical mast, vibrant orange triangular mainsail & jib)
 * 7. Inflatable Zodiac RIB Dinghy (curved red & white segmented tube, motor transom, outboard engine)
 * 8. Orange Raft / Lifeboat (bright orange inflatable ring, thwart seat, dual-blade kayak paddle)
 * 9. Classic Wooden Rowboat / Skiff (clinker wooden hull, floor ribs, bench seats, two wooden oars)
 * 10. Traditional Kerala Houseboat (കെട്ടുവള്ളം - Kettuvallam)
 * 11. Waterfront Boat Jetty (ബോട്ട് ജെട്ടി)
 */
export class KeralaMaritimeGenerator {
  // Shared Material Cache - Crisp Low-Poly Faceted Shading (flatShading: true)
  private static whiteMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc, flatShading: true });
  private static creamMat = new THREE.MeshLambertMaterial({ color: 0xfef08a, flatShading: true });
  private static navyMat = new THREE.MeshLambertMaterial({ color: 0x0f172a, flatShading: true });
  private static slateBlueMat = new THREE.MeshLambertMaterial({ color: 0x1e293b, flatShading: true });
  private static gunmetalMat = new THREE.MeshLambertMaterial({ color: 0x334155, flatShading: true });
  private static oxideRedMat = new THREE.MeshLambertMaterial({ color: 0x991b1b, flatShading: true });
  private static rescueRedMat = new THREE.MeshLambertMaterial({ color: 0xdc2626, flatShading: true });
  private static rescueOrangeMat = new THREE.MeshLambertMaterial({ color: 0xea580c, flatShading: true });
  private static sailOrangeMat = new THREE.MeshLambertMaterial({ color: 0xf97316, side: THREE.DoubleSide, flatShading: true });
  private static cyanMat = new THREE.MeshLambertMaterial({ color: 0x0284c7, flatShading: true });
  private static darkGlassMat = new THREE.MeshLambertMaterial({ color: 0x0284c7, transparent: true, opacity: 0.75, flatShading: true });
  private static woodTeakMat = new THREE.MeshLambertMaterial({ color: 0xb45309, flatShading: true });
  private static woodDarkMat = new THREE.MeshLambertMaterial({ color: 0x5c3d2e, flatShading: true });
  private static woodPlankMat = new THREE.MeshLambertMaterial({ color: 0x78350f, flatShading: true });
  private static thatchMat = new THREE.MeshLambertMaterial({ color: 0xb45309, flatShading: true });
  private static bambooMat = new THREE.MeshLambertMaterial({ color: 0xd97706, flatShading: true });
  private static greyMetalMat = new THREE.MeshLambertMaterial({ color: 0x64748b, flatShading: true });
  private static chromeMat = new THREE.MeshLambertMaterial({ color: 0xe2e8f0, flatShading: true });

  // Container Colors
  private static containerRed = new THREE.MeshLambertMaterial({ color: 0xdc2626, flatShading: true });
  private static containerBlue = new THREE.MeshLambertMaterial({ color: 0x2563eb, flatShading: true });
  private static containerYellow = new THREE.MeshLambertMaterial({ color: 0xeab308, flatShading: true });
  private static containerGreen = new THREE.MeshLambertMaterial({ color: 0x16a34a, flatShading: true });
  private static containerOrange = new THREE.MeshLambertMaterial({ color: 0xea580c, flatShading: true });

  // =========================================================================
  // 1. Modern Speedboat / Luxury Motor Yacht
  // Length: 7.6m, Width: 2.4m, Height: 2.1m
  // =========================================================================
  public static createSpeedboatModel(): THREE.Group {
    const boat = new THREE.Group();
    boat.name = 'water_vehicle_speedboat';

    // 1. Main Hull Body
    const hullGeo = new THREE.BoxGeometry(2.4, 0.75, 4.8);
    const hull = new THREE.Mesh(hullGeo, this.whiteMat);
    hull.position.set(0, 0.38, -0.6);
    boat.add(hull);

    // Pointed Deep-V Bow (Apex points forward +Z)
    const bowGeo = new THREE.ConeGeometry(1.2, 2.6, 4);
    bowGeo.rotateY(Math.PI / 4);
    bowGeo.rotateX(-Math.PI / 2);
    const bow = new THREE.Mesh(bowGeo, this.whiteMat);
    bow.position.set(0, 0.38, 3.1);
    boat.add(bow);

    // Cyan waterline accent stripe
    const stripeGeo = new THREE.BoxGeometry(2.44, 0.16, 4.6);
    const stripe = new THREE.Mesh(stripeGeo, this.cyanMat);
    stripe.position.set(0, 0.62, -0.6);
    boat.add(stripe);

    // 2. Cockpit Well (Recessed)
    const cockpitGeo = new THREE.BoxGeometry(1.8, 0.35, 2.6);
    const cockpit = new THREE.Mesh(cockpitGeo, this.navyMat);
    cockpit.position.set(0, 0.72, -0.4);
    boat.add(cockpit);

    // Tinted angular low-poly windshield
    const wsGeo = new THREE.ConeGeometry(1.05, 1.3, 4);
    wsGeo.rotateY(Math.PI / 4);
    wsGeo.rotateX(-Math.PI / 3);
    const ws = new THREE.Mesh(wsGeo, this.darkGlassMat);
    ws.position.set(0, 1.15, 1.15);
    boat.add(ws);

    // Dual helm sport seats
    for (const sx of [-0.45, 0.45]) {
      const seatGeo = new THREE.BoxGeometry(0.48, 0.38, 0.48);
      const seat = new THREE.Mesh(seatGeo, this.creamMat);
      seat.position.set(sx, 0.92, 0.25);
      boat.add(seat);
    }

    // Rear passenger lounge bench
    const benchGeo = new THREE.BoxGeometry(1.6, 0.35, 0.5);
    const bench = new THREE.Mesh(benchGeo, this.creamMat);
    bench.position.set(0, 0.92, -1.2);
    boat.add(bench);

    // Aft Radar Arch / Spoiler
    const archGeo = new THREE.BoxGeometry(2.2, 0.12, 0.24);
    const arch = new THREE.Mesh(archGeo, this.whiteMat);
    arch.position.set(0, 1.82, -1.6);
    boat.add(arch);

    for (const px of [-1.0, 1.0]) {
      const postGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.05, 4);
      const post = new THREE.Mesh(postGeo, this.whiteMat);
      post.position.set(px, 1.35, -1.6);
      boat.add(post);
    }

    // Bow sunpad cushions
    for (const bx of [-0.35, 0.35]) {
      const padGeo = new THREE.BoxGeometry(0.42, 0.08, 1.1);
      const pad = new THREE.Mesh(padGeo, this.creamMat);
      pad.position.set(bx, 0.8, 2.0);
      boat.add(pad);
    }

    return boat;
  }

  // =========================================================================
  // 2. Patrol / Coast Guard Interceptor Boat
  // Length: 13.5m, Width: 3.6m, Height: 4.2m
  // =========================================================================
  public static createPatrolBoatModel(): THREE.Group {
    const boat = new THREE.Group();
    boat.name = 'water_vehicle_patrol_boat';

    // 1. Dark Navy Hull
    const hullGeo = new THREE.BoxGeometry(3.6, 1.3, 8.5);
    const hull = new THREE.Mesh(hullGeo, this.slateBlueMat);
    hull.position.set(0, 0.65, -1.0);
    boat.add(hull);

    // Pointed Bow
    const bowGeo = new THREE.ConeGeometry(1.8, 4.2, 4);
    bowGeo.rotateY(Math.PI / 4);
    bowGeo.rotateX(-Math.PI / 2);
    const bow = new THREE.Mesh(bowGeo, this.slateBlueMat);
    bow.position.set(0, 0.65, 5.3);
    boat.add(bow);

    // Iconic Coast Guard Diagonal Orange & White Stripes on Bow sides
    for (const side of [-1, 1]) {
      const stripeOrange = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.85, 0.6), this.rescueOrangeMat);
      stripeOrange.position.set(side * 1.62, 0.85, 3.8);
      stripeOrange.rotation.y = side * 0.15;
      stripeOrange.rotation.z = side * 0.35;
      boat.add(stripeOrange);

      const stripeWhite = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.85, 0.35), this.whiteMat);
      stripeWhite.position.set(side * 1.62, 0.85, 4.4);
      stripeWhite.rotation.y = side * 0.15;
      stripeWhite.rotation.z = side * 0.35;
      boat.add(stripeWhite);
    }

    // 2. Enclosed White Bridge / Wheelhouse
    const bridgeGeo = new THREE.BoxGeometry(2.7, 1.8, 3.6);
    const bridge = new THREE.Mesh(bridgeGeo, this.whiteMat);
    bridge.position.set(0, 2.1, 0.2);
    boat.add(bridge);

    // Bridge Windows (Front & sides)
    const winFrontGeo = new THREE.BoxGeometry(2.4, 0.65, 0.1);
    const winFront = new THREE.Mesh(winFrontGeo, this.navyMat);
    winFront.position.set(0, 2.35, 2.05);
    boat.add(winFront);

    for (const sx of [-1.38, 1.38]) {
      const winSideGeo = new THREE.BoxGeometry(0.1, 0.55, 2.4);
      const winSide = new THREE.Mesh(winSideGeo, this.navyMat);
      winSide.position.set(sx, 2.35, 0.2);
      boat.add(winSide);
    }

    // Roof Radar Mast & Antenna
    const mastGeo = new THREE.CylinderGeometry(0.06, 0.08, 1.4, 6);
    const mast = new THREE.Mesh(mastGeo, this.greyMetalMat);
    mast.position.set(0, 3.7, -0.2);
    boat.add(mast);

    // Rotating Radar Bar on top
    const radarGeo = new THREE.BoxGeometry(1.4, 0.14, 0.22);
    const radar = new THREE.Mesh(radarGeo, this.whiteMat);
    radar.position.set(0, 4.4, -0.2);
    boat.add(radar);

    // Aft Open Work Deck
    const aftDeckGeo = new THREE.BoxGeometry(3.2, 0.25, 2.8);
    const aftDeck = new THREE.Mesh(aftDeckGeo, this.navyMat);
    aftDeck.position.set(0, 1.25, -3.6);
    boat.add(aftDeck);

    return boat;
  }

  // =========================================================================
  // 3. Cargo / Container Freight Ship
  // Length: 35.0m, Width: 8.2m, Height: 11.5m
  // =========================================================================
  public static createContainerShipModel(): THREE.Group {
    const ship = new THREE.Group();
    ship.name = 'water_vehicle_container_ship';

    // 1. Lower Hull (Oxide Red anti-fouling)
    const lowerHullGeo = new THREE.BoxGeometry(8.2, 1.8, 26.0);
    const lowerHull = new THREE.Mesh(lowerHullGeo, this.oxideRedMat);
    lowerHull.position.set(0, 0.9, -2.0);
    ship.add(lowerHull);

    // Upper Hull / Bulwark (Dark Charcoal)
    const upperHullGeo = new THREE.BoxGeometry(8.4, 1.6, 26.0);
    const upperHull = new THREE.Mesh(upperHullGeo, this.navyMat);
    upperHull.position.set(0, 2.5, -2.0);
    ship.add(upperHull);

    // Commercial Flared Bow
    const bowGeo = new THREE.ConeGeometry(4.2, 8.5, 4);
    bowGeo.rotateY(Math.PI / 4);
    bowGeo.rotateX(-Math.PI / 2);
    const bow = new THREE.Mesh(bowGeo, this.navyMat);
    bow.position.set(0, 2.0, 15.2);
    ship.add(bow);

    // 2. Aft Bridge Superstructure (3 Tiers)
    const bridgeTier1 = new THREE.Mesh(new THREE.BoxGeometry(7.2, 2.4, 5.0), this.whiteMat);
    bridgeTier1.position.set(0, 4.5, -11.0);
    ship.add(bridgeTier1);

    const bridgeTier2 = new THREE.Mesh(new THREE.BoxGeometry(8.6, 1.8, 4.2), this.whiteMat); // Wings overhang
    bridgeTier2.position.set(0, 6.6, -11.0);
    ship.add(bridgeTier2);

    // Bridge Windows
    const winGeo = new THREE.BoxGeometry(8.4, 0.5, 0.1);
    const win = new THREE.Mesh(winGeo, this.navyMat);
    win.position.set(0, 6.8, -8.85);
    ship.add(win);

    // Funnel / Smokestack
    const funnelGeo = new THREE.CylinderGeometry(0.9, 1.1, 3.2, 8);
    const funnel = new THREE.Mesh(funnelGeo, this.whiteMat);
    funnel.position.set(0, 8.8, -12.5);
    ship.add(funnel);

    const funnelCapGeo = new THREE.CylinderGeometry(0.92, 0.92, 0.6, 8);
    const funnelCap = new THREE.Mesh(funnelCapGeo, this.cyanMat);
    funnelCap.position.set(0, 10.3, -12.5);
    ship.add(funnelCap);

    // Radar Mast
    const mastGeo = new THREE.CylinderGeometry(0.08, 0.12, 3.5, 4);
    const mast = new THREE.Mesh(mastGeo, this.whiteMat);
    mast.position.set(0, 9.2, -9.5);
    ship.add(mast);

    // 3. Stacks of Colorful ISO Containers along cargo deck
    const containerMats = [
      this.containerRed,
      this.containerBlue,
      this.containerYellow,
      this.containerGreen,
      this.containerOrange,
    ];

    const cW = 2.4;
    const cH = 2.3;
    const cL = 5.8;

    let matIdx = 0;
    for (let rowZ = -6.0; rowZ <= 8.0; rowZ += 6.2) {
      for (const colX of [-2.45, 0, 2.45]) {
        // Tier 1
        const cMesh1 = new THREE.Mesh(
          new THREE.BoxGeometry(cW, cH, cL),
          containerMats[matIdx % containerMats.length]
        );
        cMesh1.position.set(colX, 4.4, rowZ);
        ship.add(cMesh1);
        matIdx++;

        // Tier 2 (on most rows)
        if (rowZ < 6.0) {
          const cMesh2 = new THREE.Mesh(
            new THREE.BoxGeometry(cW, cH, cL),
            containerMats[matIdx % containerMats.length]
          );
          cMesh2.position.set(colX, 6.7, rowZ);
          ship.add(cMesh2);
          matIdx++;
        }
      }
    }

    return ship;
  }

  // =========================================================================
  // 4. Military Submarine
  // Length: 26.0m, Width: 3.6m, Height: 4.8m
  // =========================================================================
  public static createSubmarineModel(): THREE.Group {
    const sub = new THREE.Group();
    sub.name = 'water_vehicle_submarine';

    // 1. Long Cylindrical Streamlined Teardrop Hull
    const hullGeo = new THREE.CylinderGeometry(1.7, 1.7, 20.0, 10);
    hullGeo.rotateX(Math.PI / 2);
    const hull = new THREE.Mesh(hullGeo, this.gunmetalMat);
    hull.position.set(0, 0.4, 0);
    sub.add(hull);

    // Rounded Nose Cone
    const noseGeo = new THREE.SphereGeometry(1.7, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    noseGeo.rotateX(Math.PI / 2);
    const nose = new THREE.Mesh(noseGeo, this.gunmetalMat);
    nose.position.set(0, 0.4, 10.0);
    sub.add(nose);

    // Tapered Tail
    const tailGeo = new THREE.ConeGeometry(1.7, 5.0, 8);
    tailGeo.rotateX(-Math.PI / 2);
    const tail = new THREE.Mesh(tailGeo, this.gunmetalMat);
    tail.position.set(0, 0.4, -12.5);
    sub.add(tail);

    // 2. Conning Tower (Sail)
    const sailGeo = new THREE.BoxGeometry(1.1, 2.2, 3.4);
    const sail = new THREE.Mesh(sailGeo, this.gunmetalMat);
    sail.position.set(0, 2.3, 3.0);
    sub.add(sail);

    // Horizontal Dive Planes / Hydroplanes
    const divePlanesGeo = new THREE.BoxGeometry(3.6, 0.14, 0.85);
    const divePlanes = new THREE.Mesh(divePlanesGeo, this.gunmetalMat);
    divePlanes.position.set(0, 2.4, 3.2);
    sub.add(divePlanes);

    // Periscopes & Radar Snorkel
    for (const px of [-0.2, 0.2]) {
      const scopeGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.3, 6);
      const scope = new THREE.Mesh(scopeGeo, this.chromeMat);
      scope.position.set(px, 3.8, 3.4);
      sub.add(scope);
    }

    // 3. Cruciform 4-Fin Tail Rudders
    const vFinGeo = new THREE.BoxGeometry(0.15, 3.6, 1.4);
    const vFin = new THREE.Mesh(vFinGeo, this.gunmetalMat);
    vFin.position.set(0, 0.4, -14.2);
    sub.add(vFin);

    const hFinGeo = new THREE.BoxGeometry(3.6, 0.15, 1.4);
    const hFin = new THREE.Mesh(hFinGeo, this.gunmetalMat);
    hFin.position.set(0, 0.4, -14.2);
    sub.add(hFin);

    return sub;
  }

  // =========================================================================
  // 5. Luxury Ocean Liner / Cruise Ship
  // Length: 40.0m, Width: 9.2m, Height: 13.0m
  // =========================================================================
  public static createCruiseShipModel(): THREE.Group {
    const ship = new THREE.Group();
    ship.name = 'water_vehicle_cruise_ship';

    // 1. Sleek White Cruise Hull
    const hullGeo = new THREE.BoxGeometry(9.0, 3.2, 30.0);
    const hull = new THREE.Mesh(hullGeo, this.whiteMat);
    hull.position.set(0, 1.6, -2.0);
    ship.add(hull);

    // Dark Waterline Band
    const waterlineGeo = new THREE.BoxGeometry(9.1, 0.35, 29.8);
    const waterline = new THREE.Mesh(waterlineGeo, this.navyMat);
    waterline.position.set(0, 0.45, -2.0);
    ship.add(waterline);

    // Raked Bow Prow
    const bowGeo = new THREE.ConeGeometry(4.5, 9.5, 4);
    bowGeo.rotateY(Math.PI / 4);
    bowGeo.rotateX(-Math.PI / 2);
    const bow = new THREE.Mesh(bowGeo, this.whiteMat);
    bow.position.set(0, 1.9, 17.5);
    ship.add(bow);

    // 2. Multi-tier Stepped Promenade Decks
    // Tier 1: Main Stateroom Deck
    const deck1 = new THREE.Mesh(new THREE.BoxGeometry(8.6, 2.2, 26.0), this.whiteMat);
    deck1.position.set(0, 4.3, -2.5);
    ship.add(deck1);

    // Window Bands (Dark horizontal glass strips representing hundreds of cabins)
    for (const side of [-4.35, 4.35]) {
      const band1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 24.0), this.navyMat);
      band1.position.set(side, 4.0, -2.5);
      ship.add(band1);

      const band2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 24.0), this.navyMat);
      band2.position.set(side, 4.9, -2.5);
      ship.add(band2);
    }

    // Tier 2: Lido & Balcony Deck
    const deck2 = new THREE.Mesh(new THREE.BoxGeometry(8.2, 2.0, 21.0), this.whiteMat);
    deck2.position.set(0, 6.4, -3.5);
    ship.add(deck2);

    // Tier 3: Forward Navigation Bridge with Cantilevered Wings
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(10.2, 1.6, 3.8), this.whiteMat);
    bridge.position.set(0, 7.8, 6.5);
    ship.add(bridge);

    const bridgeWin = new THREE.Mesh(new THREE.BoxGeometry(9.8, 0.6, 0.1), this.navyMat);
    bridgeWin.position.set(0, 8.0, 8.42);
    ship.add(bridgeWin);

    // Twin Aerodynamic Funnels / Smokestacks
    for (const fz of [-5.5, -9.5]) {
      const funnelGeo = new THREE.CylinderGeometry(0.9, 1.2, 3.2, 8);
      const funnel = new THREE.Mesh(funnelGeo, this.whiteMat);
      funnel.position.set(0, 8.8, fz);
      funnel.rotation.x = -0.12; // Swept back
      ship.add(funnel);

      const capGeo = new THREE.CylinderGeometry(0.92, 0.92, 0.6, 8);
      const cap = new THREE.Mesh(capGeo, this.navyMat);
      cap.position.set(0, 10.3, fz - 0.2);
      cap.rotation.x = -0.12;
      ship.add(cap);
    }

    // Forward Observation Radar Mast
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 4.0, 4), this.whiteMat);
    mast.position.set(0, 10.0, 8.0);
    ship.add(mast);

    return ship;
  }

  // =========================================================================
  // 6. Sailboat / Sloop
  // Length: 8.8m, Width: 2.8m, Height: 8.8m
  // =========================================================================
  public static createSailboatModel(): THREE.Group {
    const boat = new THREE.Group();
    boat.name = 'water_vehicle_sailboat';

    // 1. Warm Teak Wood Hull
    const hullGeo = new THREE.BoxGeometry(2.8, 0.9, 5.8);
    const hull = new THREE.Mesh(hullGeo, this.woodTeakMat);
    hull.position.set(0, 0.45, -0.6);
    boat.add(hull);

    // Pointed Bow
    const bowGeo = new THREE.ConeGeometry(1.4, 3.2, 4);
    bowGeo.rotateY(Math.PI / 4);
    bowGeo.rotateX(-Math.PI / 2);
    const bow = new THREE.Mesh(bowGeo, this.woodTeakMat);
    bow.position.set(0, 0.45, 3.8);
    boat.add(bow);

    // Crisp White Deck
    const deckGeo = new THREE.BoxGeometry(2.6, 0.12, 5.4);
    const deck = new THREE.Mesh(deckGeo, this.whiteMat);
    deck.position.set(0, 0.95, -0.5);
    boat.add(deck);

    // Open Cockpit Well Aft
    const cockpit = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.35, 2.2), this.woodPlankMat);
    cockpit.position.set(0, 0.85, -1.8);
    boat.add(cockpit);

    // 2. Vertical Mast (Aluminum)
    const mastHeight = 8.2;
    const mastGeo = new THREE.CylinderGeometry(0.06, 0.09, mastHeight, 6);
    const mast = new THREE.Mesh(mastGeo, this.chromeMat);
    mast.position.set(0, 0.95 + mastHeight / 2, 0.8);
    boat.add(mast);

    // Horizontal Boom extending aft
    const boomGeo = new THREE.CylinderGeometry(0.04, 0.04, 4.2, 4);
    boomGeo.rotateX(Math.PI / 2);
    const boom = new THREE.Mesh(boomGeo, this.chromeMat);
    boom.position.set(0, 2.0, -1.3);
    boat.add(boom);

    // 3. Vibrant Orange Triangular Mainsail
    // Custom 2D plane / buffer geometry forming sharp right triangle
    const mainSailGeo = new THREE.BufferGeometry();
    const mainPositions = new Float32Array([
      0, 2.0, 0.8,   // Tack (lower front at mast)
      0, 8.8, 0.8,   // Head (top of mast)
      0, 2.1, -3.2,  // Clew (lower aft at boom)
    ]);
    mainSailGeo.setAttribute('position', new THREE.BufferAttribute(mainPositions, 3));
    mainSailGeo.setIndex([0, 1, 2, 0, 2, 1]);
    mainSailGeo.computeVertexNormals();
    const mainSail = new THREE.Mesh(mainSailGeo, this.sailOrangeMat);
    boat.add(mainSail);

    // Forward Jib Sail (from bow to upper mast)
    const jibGeo = new THREE.BufferGeometry();
    const jibPositions = new Float32Array([
      0, 1.2, 4.8,   // Tack (bow)
      0, 7.2, 0.8,   // Head (upper mast)
      0, 1.8, 0.9,   // Clew (mast base)
    ]);
    jibGeo.setAttribute('position', new THREE.BufferAttribute(jibPositions, 3));
    jibGeo.setIndex([0, 1, 2, 0, 2, 1]);
    jibGeo.computeVertexNormals();
    const jib = new THREE.Mesh(jibGeo, this.sailOrangeMat);
    boat.add(jib);

    return boat;
  }

  // =========================================================================
  // 7. Inflatable Zodiac RIB (Rescue Dinghy)
  // Length: 3.6m, Width: 1.6m, Height: 1.1m
  // =========================================================================
  public static createZodiacDinghyModel(): THREE.Group {
    const dinghy = new THREE.Group();
    dinghy.name = 'water_vehicle_zodiac';

    // Inflatable tubes (Alternating red & white segments)
    const tubeR = 0.28;
    const tubeLen = 2.4;

    // Port & Starboard Tubes
    for (const side of [-0.68, 0.68]) {
      const tubeFront = new THREE.Mesh(
        new THREE.CylinderGeometry(tubeR, tubeR, tubeLen / 2, 8),
        this.rescueRedMat
      );
      tubeFront.rotation.x = Math.PI / 2;
      tubeFront.position.set(side, tubeR, 0.6);
      dinghy.add(tubeFront);

      const tubeMid = new THREE.Mesh(
        new THREE.CylinderGeometry(tubeR, tubeR, tubeLen / 2, 8),
        this.whiteMat
      );
      tubeMid.rotation.x = Math.PI / 2;
      tubeMid.position.set(side, tubeR, -0.6);
      dinghy.add(tubeMid);
    }

    // Curved Bow Tube
    const bowTube = new THREE.Mesh(
      new THREE.TorusGeometry(0.68, tubeR, 6, 8, Math.PI),
      this.rescueRedMat
    );
    bowTube.rotation.x = -Math.PI / 2;
    bowTube.position.set(0, tubeR, 1.2);
    dinghy.add(bowTube);

    // Solid Grey Fiberglass Floor
    const floor = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 2.6), this.greyMetalMat);
    floor.position.set(0, 0.14, 0);
    dinghy.add(floor);

    // Black Transom Stern Plate
    const transom = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.45, 0.08), this.navyMat);
    transom.position.set(0, 0.35, -1.2);
    dinghy.add(transom);

    // Outboard Engine
    const motor = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.65, 0.35), this.navyMat);
    motor.position.set(0, 0.45, -1.4);
    dinghy.add(motor);

    const motorCap = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.25, 4), this.rescueRedMat);
    motorCap.position.set(0, 0.85, -1.4);
    dinghy.add(motorCap);

    return dinghy;
  }

  // =========================================================================
  // 8. Orange Raft / Lifeboat
  // Length: 2.8m, Width: 1.4m, Height: 0.65m
  // =========================================================================
  public static createOrangeRaftModel(): THREE.Group {
    const raft = new THREE.Group();
    raft.name = 'water_vehicle_raft';

    // Oval inflatable tube ring in bright rescue orange
    const tubeR = 0.24;
    const raftBody = new THREE.Mesh(
      new THREE.TorusGeometry(0.85, tubeR, 6, 12),
      this.rescueOrangeMat
    );
    raftBody.scale.set(0.65, 1.4, 1.0);
    raftBody.rotation.x = -Math.PI / 2;
    raftBody.position.y = tubeR;
    raft.add(raftBody);

    // Recessed dark floor
    const floor = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.06, 1.8), this.slateBlueMat);
    floor.position.set(0, 0.1, 0);
    raft.add(floor);

    // Grey Thwart Seat across center
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.08, 0.3), this.greyMetalMat);
    seat.position.set(0, 0.26, 0);
    raft.add(seat);

    // Dual-blade kayak paddle resting across gunwales
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.0, 4), this.navyMat);
    shaft.rotation.z = Math.PI / 2.8;
    shaft.rotation.y = 0.3;
    shaft.position.set(0, 0.4, 0.1);
    raft.add(shaft);

    for (const dir of [-1, 1]) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 0.35), this.rescueOrangeMat);
      blade.position.set(dir * 0.85, 0.4 + dir * 0.15, 0.1);
      blade.rotation.z = Math.PI / 2.8;
      blade.rotation.y = 0.3;
      raft.add(blade);
    }

    return raft;
  }

  // =========================================================================
  // 9. Classic Wooden Rowboat / Skiff
  // Length: 3.8m, Width: 1.5m, Height: 0.85m
  // =========================================================================
  public static createWoodenRowboatModel(): THREE.Group {
    const boat = new THREE.Group();
    boat.name = 'water_vehicle_rowboat';

    // 1. Dark Wood Hull
    const hull = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 2.6), this.woodDarkMat);
    hull.position.set(0, 0.25, -0.4);
    boat.add(hull);

    // Pointed Bow
    const bowGeo = new THREE.ConeGeometry(0.7, 1.6, 4);
    bowGeo.rotateY(Math.PI / 4);
    bowGeo.rotateX(-Math.PI / 2);
    const bow = new THREE.Mesh(bowGeo, this.woodDarkMat);
    bow.position.set(0, 0.25, 1.6);
    boat.add(bow);

    // Three wooden bench seats
    for (const z of [-1.1, -0.3, 0.6]) {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 0.32), this.woodPlankMat);
      seat.position.set(0, 0.45, z);
      boat.add(seat);
    }

    // Two wooden oars resting outward in oarlocks
    for (const side of [-1, 1]) {
      const oarGroup = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.8, 4), this.woodTeakMat);
      shaft.rotation.z = side * (Math.PI / 3);
      shaft.position.set(side * 0.75, 0.65, -0.3);
      oarGroup.add(shaft);

      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.35), this.woodTeakMat);
      blade.position.set(side * 1.5, 0.25, -0.3);
      blade.rotation.z = side * (Math.PI / 3);
      oarGroup.add(blade);

      boat.add(oarGroup);
    }

    return boat;
  }

  // =========================================================================
  // 10. Traditional Kerala Houseboat (കെട്ടുവള്ളം - Kettuvallam)
  // Length: 15m, Width: 3.8m, Height: 3.8m
  // =========================================================================
  public static createHouseboatModel(): THREE.Group {
    const boat = new THREE.Group();
    boat.name = 'kerala_houseboat';

    // 1. Curved Hull
    const hullGeo = new THREE.BoxGeometry(3.6, 1.2, 14.5);
    const hull = new THREE.Mesh(hullGeo, this.woodDarkMat);
    hull.position.y = 0.5;
    boat.add(hull);

    // Upturned Bow
    const bowGeo = new THREE.ConeGeometry(1.8, 2.5, 4);
    const bow = new THREE.Mesh(bowGeo, this.woodDarkMat);
    bow.position.set(0, 0.95, 7.8);
    bow.rotation.x = -Math.PI / 4;
    bow.rotation.y = Math.PI / 4;
    boat.add(bow);

    // Upturned Stern
    const sternGeo = new THREE.ConeGeometry(1.8, 2.2, 4);
    const stern = new THREE.Mesh(sternGeo, this.woodDarkMat);
    stern.position.set(0, 0.9, -7.8);
    stern.rotation.x = Math.PI / 4;
    stern.rotation.y = Math.PI / 4;
    boat.add(stern);

    // 2. Open Front Sun Deck
    const deckGeo = new THREE.BoxGeometry(3.4, 0.15, 3.5);
    const deck = new THREE.Mesh(deckGeo, this.woodPlankMat);
    deck.position.set(0, 1.15, 5.0);
    boat.add(deck);

    // 3. Arched Woven Thatch Canopy
    const canopyGeo = new THREE.CylinderGeometry(1.8, 1.8, 9.5, 16, 1, false, 0, Math.PI);
    const canopy = new THREE.Mesh(canopyGeo, this.thatchMat);
    canopy.position.set(0, 1.9, -1.0);
    canopy.rotation.z = Math.PI / 2;
    canopy.rotation.y = Math.PI / 2;
    boat.add(canopy);

    // Bamboo Rib Arches
    for (let r = -4.0; r <= 3.5; r += 1.8) {
      const ribGeo = new THREE.TorusGeometry(1.82, 0.04, 6, 16, Math.PI);
      const rib = new THREE.Mesh(ribGeo, this.bambooMat);
      rib.position.set(0, 1.9, r);
      boat.add(rib);
    }

    return boat;
  }

  // =========================================================================
  // 11. Waterfront Boat Jetty (ബോട്ട് ജെട്ടി)
  // =========================================================================
  public static createBoatJettyModel(): THREE.Group {
    const jetty = new THREE.Group();
    jetty.name = 'kerala_boat_jetty';

    // Boardwalk Pier (8m long x 3.5m wide)
    const deck = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.3, 8.0), this.woodPlankMat);
    deck.position.set(0, 0.45, 0);
    jetty.add(deck);

    // Support Pilings
    for (const px of [-1.5, 1.5]) {
      for (const pz of [-3.5, -1.0, 1.5, 3.5]) {
        const piling = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.2, 6), this.gunmetalMat);
        piling.position.set(px, 0.1, pz);
        jetty.add(piling);
      }
    }

    // Small Passenger Waiting Shelter on bank end
    const shelter = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.2, 2.4), this.whiteMat);
    shelter.position.set(0, 1.5, -2.4);
    jetty.add(shelter);

    const shelterRoof = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.2, 4), this.cyanMat);
    shelterRoof.position.set(0, 3.1, -2.4);
    shelterRoof.rotation.y = Math.PI / 4;
    jetty.add(shelterRoof);

    return jetty;
  }

  // Backwards compatibility alias
  public static createFishingBoatModel(): THREE.Group {
    return this.createWoodenRowboatModel();
  }
  public static createFishMarketModel(): THREE.Group {
    return this.createBoatJettyModel();
  }
}
