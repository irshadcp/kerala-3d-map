import * as THREE from 'three';

/**
 * KeralaRoadsideGenerator
 * Generates authentic 3D procedural models for Kerala roadside elements:
 * 1.  ConcretePole (കെ.എസ്.ഇ.ബി കോൺക്രീറ്റ് പോസ്റ്റ് / KSEB Concrete Electric Pole)
 * 2.  StreetLight (റോഡരികിലെ സ്ട്രീറ്റ് ലൈറ്റ് / Roadside Street Light)
 * 3.  RoadSign (കേരള PWD ദിശാ / മുന്നറിയിപ്പ് ബോർഡുകൾ / PWD Direction & Caution Signs)
 * 4.  BusStop (കേരള ബസ് കാത്തിരിപ്പ് കേന്ദ്രം / Kerala Bus Waiting Shelter)
 * 5.  SmallShop (പെട്ടിക്കട / തട്ടുകട / Wayside Petty Shop & Cool Bar)
 * 6.  TeaShop (കേരള ചായക്കട / Kerala Chayakada with Samovar & Snack Counter)
 * 7.  Bakery (കേരള ബേക്കറി / Kerala Bakery with Glass Counters & Sweet Jars)
 * 8.  Pharmacy (മെഡിക്കൽ സ്റ്റോർ / ഫാർമസി / Pharmacy with Green Cross)
 * 9.  CompoundWall (കേരള കോമ്പൗണ്ട് വാൾ / Boundary Wall with Terracotta Coping)
 * 10. Gate (ഇരുമ്പ് ഗേറ്റ് / Ornamental Iron Gate & Gate Pillars)
 * 11. Drain (റോഡരികിലെ ഓട / Roadside Storm Drain with Slotted Slabs)
 * 12. Culvert (റോഡരികിലെ കലുങ്ക് / Masonry Culvert with Yellow/Black Hazard Stripes)
 * 13. Bridge (പാലം / Road Bridge with Safety Parapets & Piers)
 * 14. Billboard (റോഡരികിലെ വലിയ പരസ്യബോർഡ് / High Commercial Billboard)
 * 15. AutoStand (കേരള ഓട്ടോ സ്റ്റാൻഡ് / Auto-rickshaws & Auto Stand Board)
 */
export class KeralaRoadsideGenerator {

  // =========================================================================
  // 1. ConcretePole (കെ.എസ്.ഇ.ബി കോൺക്രീറ്റ് പോസ്റ്റ്)
  // =========================================================================
  public static createConcretePoleModel(): THREE.Group {
    const poleGroup = new THREE.Group();
    poleGroup.name = 'kerala_concrete_pole';

    const concreteMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 }); // Weathered KSEB concrete
    const ironMat = new THREE.MeshLambertMaterial({ color: 0x334155 });     // Steel crossarm
    const insulatorMat = new THREE.MeshLambertMaterial({ color: 0x78350f });  // Brown porcelain insulators
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });        // Black copper cable
    const redDangerMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });   // Danger plate
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Main rectangular tapered concrete pole (Height 8.5m)
    const poleGeo = new THREE.BoxGeometry(0.24, 8.5, 0.18);
    const pole = new THREE.Mesh(poleGeo, concreteMat);
    pole.position.set(0, 4.25, 0);
    poleGroup.add(pole);

    // KSEB Pole Base Reinforcement Collar
    const baseCollarGeo = new THREE.BoxGeometry(0.36, 0.6, 0.3);
    const baseCollar = new THREE.Mesh(baseCollarGeo, concreteMat);
    baseCollar.position.set(0, 0.3, 0);
    poleGroup.add(baseCollar);

    // Horizontal Steel Crossarm (Top 7.8m)
    const crossarmGeo = new THREE.BoxGeometry(2.4, 0.08, 0.08);
    const crossarm = new THREE.Mesh(crossarmGeo, ironMat);
    crossarm.position.set(0, 7.8, 0);
    poleGroup.add(crossarm);

    // Pin Insulators on Crossarm (3 Phases: Red, Yellow, Blue lines)
    for (const ix of [-1.0, 0, 1.0]) {
      const pinGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.18, 8);
      const pin = new THREE.Mesh(pinGeo, ironMat);
      pin.position.set(ix, 7.92, 0);
      poleGroup.add(pin);

      const insulatorGeo = new THREE.CylinderGeometry(0.065, 0.08, 0.16, 10);
      const insulator = new THREE.Mesh(insulatorGeo, insulatorMat);
      insulator.position.set(ix, 8.04, 0);
      poleGroup.add(insulator);

      // Overhead Power Cable segments spanning along road direction
      const cableGeo = new THREE.CylinderGeometry(0.015, 0.015, 14.0, 6);
      cableGeo.rotateX(Math.PI / 2);
      const cable = new THREE.Mesh(cableGeo, wireMat);
      cable.position.set(ix, 8.12, 0);
      poleGroup.add(cable);
    }

    // Secondary lower Crossarm for domestic 230V / Street light line
    const lowerCrossarmGeo = new THREE.BoxGeometry(1.6, 0.06, 0.06);
    const lowerCrossarm = new THREE.Mesh(lowerCrossarmGeo, ironMat);
    lowerCrossarm.position.set(0, 6.5, 0);
    poleGroup.add(lowerCrossarm);

    for (const ix of [-0.65, 0.65]) {
      const insGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.12, 8);
      const ins = new THREE.Mesh(insGeo, insulatorMat);
      ins.position.set(ix, 6.6, 0);
      poleGroup.add(ins);

      const cableGeo = new THREE.CylinderGeometry(0.012, 0.012, 14.0, 6);
      cableGeo.rotateX(Math.PI / 2);
      const cable = new THREE.Mesh(cableGeo, wireMat);
      cable.position.set(ix, 6.66, 0);
      poleGroup.add(cable);
    }

    // KSEB Danger / 11KV Warning Plate
    const plateGeo = new THREE.BoxGeometry(0.28, 0.35, 0.02);
    const plate = new THREE.Mesh(plateGeo, redDangerMat);
    plate.position.set(0, 2.8, 0.1);
    poleGroup.add(plate);

    const skullGeo = new THREE.BoxGeometry(0.18, 0.12, 0.025);
    const skull = new THREE.Mesh(skullGeo, whiteMat);
    skull.position.set(0, 2.8, 0.105);
    poleGroup.add(skull);

    // Diagonal Stay Wire with ceramic strain egg insulator
    const stayGeo = new THREE.CylinderGeometry(0.015, 0.015, 7.8, 6);
    const stay = new THREE.Mesh(stayGeo, ironMat);
    stay.position.set(1.5, 3.8, 0);
    stay.rotation.z = -0.4;
    poleGroup.add(stay);

    const eggGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.18, 8);
    const egg = new THREE.Mesh(eggGeo, insulatorMat);
    egg.position.set(1.2, 4.4, 0);
    egg.rotation.z = -0.4;
    poleGroup.add(egg);

    poleGroup.scale.set(1.4, 1.4, 1.4);
    return poleGroup;
  }

  // =========================================================================
  // 2. StreetLight (റോഡരികിലെ സ്ട്രീറ്റ് ലൈറ്റ്)
  // =========================================================================
  public static createStreetLightModel(): THREE.Group {
    const lightGroup = new THREE.Group();
    lightGroup.name = 'kerala_street_light';

    const steelMat = new THREE.MeshLambertMaterial({ color: 0x475569 }); // Galvanized grey
    const lampMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    const lensMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb });   // Warm white glowing lens
    const concreteMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });

    // Octagonal / Round Steel Pole (Height 7.2m)
    const poleGeo = new THREE.CylinderGeometry(0.1, 0.16, 7.2, 10);
    const pole = new THREE.Mesh(poleGeo, steelMat);
    pole.position.set(0, 3.6, 0);
    lightGroup.add(pole);

    // Concrete Footing & Base Flange
    const baseGeo = new THREE.BoxGeometry(0.45, 0.4, 0.45);
    const base = new THREE.Mesh(baseGeo, concreteMat);
    base.position.set(0, 0.2, 0);
    lightGroup.add(base);

    // Curved Outreach Arm pointing towards road carriageway
    const armGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.2, 8);
    const arm = new THREE.Mesh(armGeo, steelMat);
    arm.position.set(0.9, 7.3, 0);
    arm.rotation.z = -Math.PI / 3;
    lightGroup.add(arm);

    // Modern LED Luminaire Fixture
    const fixtureGeo = new THREE.BoxGeometry(0.7, 0.14, 0.32);
    const fixture = new THREE.Mesh(fixtureGeo, lampMat);
    fixture.position.set(1.9, 7.7, 0);
    lightGroup.add(fixture);

    // Glowing LED Lens facing downward
    const lensGeo = new THREE.PlaneGeometry(0.6, 0.26);
    const lens = new THREE.Mesh(lensGeo, lensMat);
    lens.position.set(1.9, 7.62, 0);
    lens.rotation.x = Math.PI / 2;
    lightGroup.add(lens);

    // Night Illuminance Cone / Ground Glow
    const coneGeo = new THREE.ConeGeometry(3.5, 7.5, 16, 1, true);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xffedd5,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.set(1.9, 3.8, 0);
    lightGroup.add(cone);

    lightGroup.scale.set(1.4, 1.4, 1.4);
    return lightGroup;
  }

  // =========================================================================
  // 3. RoadSign (കേരള PWD ദിശാ / മുന്നറിയിപ്പ് ബോർഡുകൾ)
  // =========================================================================
  public static createRoadSignModel(type: 'direction' | 'warning' | 'speed' = 'direction'): THREE.Group {
    const signGroup = new THREE.Group();
    signGroup.name = `kerala_road_sign_${type}`;

    const poleMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
    const pwdGreenMat = new THREE.MeshBasicMaterial({ color: 0x047857 }); // Kerala PWD Forest Green
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    const yellowMat = new THREE.MeshBasicMaterial({ color: 0xeab308 });
    const redMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });
    const blackMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });

    if (type === 'direction') {
      // Twin Steel Support Posts
      for (const px of [-1.1, 1.1]) {
        const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 3.8, 8);
        const post = new THREE.Mesh(postGeo, poleMat);
        post.position.set(px, 1.9, 0);
        signGroup.add(post);
      }

      // Large Rectangular PWD Direction Board (3.2m x 1.4m)
      const boardGeo = new THREE.BoxGeometry(3.2, 1.4, 0.06);
      const board = new THREE.Mesh(boardGeo, pwdGreenMat);
      board.position.set(0, 3.1, 0);
      signGroup.add(board);

      // White reflective outer border
      const borderGeo = new THREE.BoxGeometry(3.26, 1.46, 0.05);
      const border = new THREE.Mesh(borderGeo, whiteMat);
      border.position.set(0, 3.1, -0.01);
      signGroup.add(border);

      // Simulated Malayalam / English Text Stripes and Arrows
      const topBarGeo = new THREE.BoxGeometry(2.6, 0.18, 0.07);
      const topBar = new THREE.Mesh(topBarGeo, whiteMat);
      topBar.position.set(0, 3.4, 0.01);
      signGroup.add(topBar);

      const midBarGeo = new THREE.BoxGeometry(2.2, 0.16, 0.07);
      const midBar = new THREE.Mesh(midBarGeo, whiteMat);
      midBar.position.set(-0.2, 3.05, 0.01);
      signGroup.add(midBar);

      // Direction Arrow
      const arrowGeo = new THREE.BoxGeometry(0.5, 0.12, 0.07);
      const arrow = new THREE.Mesh(arrowGeo, whiteMat);
      arrow.position.set(1.1, 3.05, 0.01);
      signGroup.add(arrow);

      const arrowHeadGeo = new THREE.ConeGeometry(0.18, 0.28, 4);
      arrowHeadGeo.rotateZ(-Math.PI / 2);
      const arrowHead = new THREE.Mesh(arrowHeadGeo, whiteMat);
      arrowHead.position.set(1.4, 3.05, 0.01);
      signGroup.add(arrowHead);
    } else if (type === 'warning') {
      // Single Post
      const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 3.6, 8);
      const post = new THREE.Mesh(postGeo, poleMat);
      post.position.set(0, 1.8, 0);
      signGroup.add(post);

      // Equilateral Triangular Caution Board (Yellow with Red border)
      const triGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.05, 3);
      const tri = new THREE.Mesh(triGeo, yellowMat);
      tri.position.set(0, 3.1, 0);
      tri.rotation.z = Math.PI;
      signGroup.add(tri);

      // Black exclamation mark / curve symbol
      const symGeo = new THREE.BoxGeometry(0.12, 0.45, 0.06);
      const sym = new THREE.Mesh(symGeo, blackMat);
      sym.position.set(0, 3.15, 0.01);
      signGroup.add(sym);
    } else {
      // Speed Limit 50 km/h (Circular)
      const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 3.6, 8);
      const post = new THREE.Mesh(postGeo, poleMat);
      post.position.set(0, 1.8, 0);
      signGroup.add(post);

      const discGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.05, 24);
      discGeo.rotateX(Math.PI / 2);
      const disc = new THREE.Mesh(discGeo, redMat);
      disc.position.set(0, 3.1, 0);
      signGroup.add(disc);

      const innerDiscGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.055, 24);
      innerDiscGeo.rotateX(Math.PI / 2);
      const innerDisc = new THREE.Mesh(innerDiscGeo, whiteMat);
      innerDisc.position.set(0, 3.1, 0);
      signGroup.add(innerDisc);

      // "50" Text block
      const numGeo = new THREE.BoxGeometry(0.45, 0.32, 0.06);
      const num = new THREE.Mesh(numGeo, blackMat);
      num.position.set(0, 3.1, 0.01);
      signGroup.add(num);
    }

    signGroup.scale.set(1.4, 1.4, 1.4);
    return signGroup;
  }

  // =========================================================================
  // 4. BusStop (കേരള ബസ് കാത്തിരിപ്പ് കേന്ദ്രം)
  // =========================================================================
  public static createBusStopModel(): THREE.Group {
    const busStop = new THREE.Group();
    busStop.name = 'kerala_bus_stop';

    const tileRedMat = new THREE.MeshLambertMaterial({ color: 0xb91c1c });   // Terracotta Red tiles
    const steelBlueMat = new THREE.MeshLambertMaterial({ color: 0x0369a1 }); // Blue steel posts
    const concreteMat = new THREE.MeshLambertMaterial({ color: 0xd6d3d1 });  // Paved platform
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x78350f });      // Teak wood passenger bench
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    const yellowMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });

    // Elevated Concrete Waiting Platform (6.4m x 3.2m x 0.3m)
    const platformGeo = new THREE.BoxGeometry(6.4, 0.3, 3.2);
    const platform = new THREE.Mesh(platformGeo, concreteMat);
    platform.position.set(0, 0.15, 0);
    busStop.add(platform);

    // Front Curb Line with yellow-black paint markings
    const curbGeo = new THREE.BoxGeometry(6.4, 0.32, 0.1);
    const curb = new THREE.Mesh(curbGeo, yellowMat);
    curb.position.set(0, 0.16, 1.55);
    busStop.add(curb);

    // 4 Structural Columns
    for (const px of [-2.7, 2.7]) {
      for (const pz of [-1.1, 0.9]) {
        const colGeo = new THREE.CylinderGeometry(0.1, 0.1, 3.1, 10);
        const col = new THREE.Mesh(colGeo, steelBlueMat);
        col.position.set(px, 1.65, pz);
        busStop.add(col);
      }
    }

    // Gable / Arched Roof Structure
    const roofTrussGeo = new THREE.BoxGeometry(6.6, 0.25, 3.5);
    const roofTruss = new THREE.Mesh(roofTrussGeo, tileRedMat);
    roofTruss.position.set(0, 3.3, 0);
    roofTruss.rotation.x = 0.06;
    busStop.add(roofTruss);

    // Decorative Front Fascia Signboard: "ബസ് കാത്തിരിപ്പ് കേന്ദ്രം"
    const signGeo = new THREE.BoxGeometry(5.6, 0.55, 0.08);
    const sign = new THREE.Mesh(signGeo, steelBlueMat);
    sign.position.set(0, 3.1, 1.7);
    busStop.add(sign);

    const signTextGeo = new THREE.BoxGeometry(4.8, 0.25, 0.09);
    const signText = new THREE.Mesh(signTextGeo, whiteMat);
    signText.position.set(0, 3.1, 1.71);
    busStop.add(signText);

    // Rear Windscreen / Wall with MLA Fund Board
    const backWallGeo = new THREE.BoxGeometry(5.8, 2.2, 0.08);
    const backWallMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
    const backWall = new THREE.Mesh(backWallGeo, backWallMat);
    backWall.position.set(0, 1.4, -1.2);
    busStop.add(backWall);

    // Passenger Waiting Bench (Wood + Steel Legs)
    const benchGeo = new THREE.BoxGeometry(5.2, 0.08, 0.6);
    const bench = new THREE.Mesh(benchGeo, woodMat);
    bench.position.set(0, 0.6, -0.65);
    busStop.add(bench);

    const backrestGeo = new THREE.BoxGeometry(5.2, 0.45, 0.06);
    const backrest = new THREE.Mesh(backrestGeo, woodMat);
    backrest.position.set(0, 0.95, -0.92);
    busStop.add(backrest);

    // Bus Stop Flag / Bus Route Board at roadside edge
    const flagPoleGeo = new THREE.CylinderGeometry(0.04, 0.04, 3.6, 8);
    const flagPole = new THREE.Mesh(flagPoleGeo, steelBlueMat);
    flagPole.position.set(3.4, 1.8, 1.4);
    busStop.add(flagPole);

    const flagDiscGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.04, 20);
    flagDiscGeo.rotateX(Math.PI / 2);
    const flagDisc = new THREE.Mesh(flagDiscGeo, steelBlueMat);
    flagDisc.position.set(3.4, 3.3, 1.4);
    busStop.add(flagDisc);

    busStop.scale.set(1.4, 1.4, 1.4);
    return busStop;
  }

  // =========================================================================
  // 5. SmallShop (പെട്ടിക്കട / തട്ടുകട / Wayside Petty Shop)
  // =========================================================================
  public static createSmallShopModel(): THREE.Group {
    const shop = new THREE.Group();
    shop.name = 'kerala_small_shop';

    const woodMat = new THREE.MeshLambertMaterial({ color: 0x854d0e });    // Weathered timber planks
    const tinRoofMat = new THREE.MeshLambertMaterial({ color: 0x3b82f6 }); // Blue corrugated tin
    const counterMat = new THREE.MeshLambertMaterial({ color: 0xa16207 });
    const packetMat1 = new THREE.MeshBasicMaterial({ color: 0xef4444 });  // Red chips packets
    const packetMat2 = new THREE.MeshBasicMaterial({ color: 0xeab308 });  // Yellow mixture packets
    const bottleGreen = new THREE.MeshBasicMaterial({ color: 0x15803d }); // Soda bottles
    const awningMat = new THREE.MeshLambertMaterial({ color: 0xd97706 });

    // Shop Wooden Cabin (3.2m wide x 2.4m deep x 2.7m high)
    const cabinGeo = new THREE.BoxGeometry(3.2, 2.5, 2.4);
    const cabin = new THREE.Mesh(cabinGeo, woodMat);
    cabin.position.set(0, 1.25, 0);
    shop.add(cabin);

    // Slanted Corrugated Sheet Roof
    const roofGeo = new THREE.BoxGeometry(3.6, 0.12, 2.8);
    const roof = new THREE.Mesh(roofGeo, tinRoofMat);
    roof.position.set(0, 2.65, 0.1);
    roof.rotation.x = 0.12;
    shop.add(roof);

    // Front Serving Opening / Window
    const openFrameGeo = new THREE.BoxGeometry(2.4, 1.3, 0.2);
    const openFrameMat = new THREE.MeshBasicMaterial({ color: 0x1c1917 }); // Dark interior
    const openFrame = new THREE.Mesh(openFrameGeo, openFrameMat);
    openFrame.position.set(0, 1.5, 1.15);
    shop.add(openFrame);

    // Front Wooden Counter Shelf
    const counterGeo = new THREE.BoxGeometry(2.6, 0.15, 0.6);
    const counter = new THREE.Mesh(counterGeo, counterMat);
    counter.position.set(0, 0.9, 1.4);
    shop.add(counter);

    // Striped Fabric Awning over counter
    const awningGeo = new THREE.BoxGeometry(2.8, 0.08, 0.9);
    const awning = new THREE.Mesh(awningGeo, awningMat);
    awning.position.set(0, 2.25, 1.6);
    awning.rotation.x = 0.25;
    shop.add(awning);

    // Overhead String of Hanging Snack Packets (ലെയ്‌സ്, മിക്സ്ചർ, ബിസ്ക്കറ്റ്)
    for (let px = -1.0; px <= 1.0; px += 0.28) {
      const pMat = Math.random() > 0.5 ? packetMat1 : packetMat2;
      const pGeo = new THREE.BoxGeometry(0.14, 0.22, 0.04);
      const packet = new THREE.Mesh(pGeo, pMat);
      packet.position.set(px, 1.95 - (Math.abs(px) * 0.06), 1.3);
      shop.add(packet);
    }

    // Glass Soda Bottles in Crate on counter
    for (let bx = -0.8; bx <= -0.4; bx += 0.15) {
      const bottleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.25, 8);
      const bottle = new THREE.Mesh(bottleGeo, bottleGreen);
      bottle.position.set(bx, 1.1, 1.4);
      shop.add(bottle);
    }

    // Side Newspaper Stand / Magazine rack
    const rackGeo = new THREE.BoxGeometry(0.5, 1.2, 0.4);
    const rackMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
    const rack = new THREE.Mesh(rackGeo, rackMat);
    rack.position.set(1.9, 0.7, 0.8);
    shop.add(rack);

    shop.scale.set(1.4, 1.4, 1.4);
    return shop;
  }

  // =========================================================================
  // 6. TeaShop (കേരള ചായക്കട / Kerala Chayakada)
  // =========================================================================
  public static createTeaShopModel(): THREE.Group {
    const chaya = new THREE.Group();
    chaya.name = 'kerala_tea_shop';

    const wallMat = new THREE.MeshLambertMaterial({ color: 0xfef08a });    // Pastel yellow plaster
    const tileMat = new THREE.MeshLambertMaterial({ color: 0x991b1b });    // Terracotta roof tiles
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x78350f });    // Warm teak bench/timber
    const steelMat = new THREE.MeshLambertMaterial({ color: 0xe2e8f0 });   // Samovar steel
    const glassMat = new THREE.MeshLambertMaterial({ color: 0xa5f3fc, transparent: true, opacity: 0.7 });
    const friedSnackMat = new THREE.MeshBasicMaterial({ color: 0xd97706 }); // Pazham pori / Vada gold
    const signMat = new THREE.MeshBasicMaterial({ color: 0x1e3a8a });

    // Main Tea Shop Building (4.4m wide x 3.2m deep x 3.0m high)
    const buildingGeo = new THREE.BoxGeometry(4.4, 2.8, 3.2);
    const building = new THREE.Mesh(buildingGeo, wallMat);
    building.position.set(0, 1.4, 0);
    chaya.add(building);

    // Overhanging Tiled Kerala Sloped Roof
    const roofGeo = new THREE.ConeGeometry(3.6, 1.6, 4);
    roofGeo.rotateY(Math.PI / 4);
    const roof = new THREE.Mesh(roofGeo, tileMat);
    roof.position.set(0, 3.5, 0);
    roof.scale.set(1.4, 1.0, 1.1);
    chaya.add(roof);

    // Front Open Verandah / Counter Area
    const counterGeo = new THREE.BoxGeometry(3.6, 1.0, 0.7);
    const counter = new THREE.Mesh(counterGeo, woodMat);
    counter.position.set(0, 0.5, 1.75);
    chaya.add(counter);

    // Traditional Glass Snack Counter (പലഹാരക്കൂട് / കണ്ണാടിക്കൂട്)
    const showcaseGeo = new THREE.BoxGeometry(1.6, 0.75, 0.55);
    const showcase = new THREE.Mesh(showcaseGeo, glassMat);
    showcase.position.set(-0.8, 1.35, 1.75);
    chaya.add(showcase);

    // Hot Kerala Fried Snacks inside Glass Box (Pazham Pori, Parippuvada, Samosa)
    for (let sx = -1.2; sx <= -0.4; sx += 0.28) {
      const snackGeo = new THREE.CylinderGeometry(0.07, 0.08, 0.08, 8);
      const snack = new THREE.Mesh(snackGeo, friedSnackMat);
      snack.position.set(sx, 1.12, 1.75);
      chaya.add(snack);
    }

    // Classic Cylindrical Brass/Steel Tea Samovar (ചായ സമോവർ) with Chimney
    const samovarGeo = new THREE.CylinderGeometry(0.24, 0.22, 0.65, 12);
    const samovar = new THREE.Mesh(samovarGeo, steelMat);
    samovar.position.set(0.9, 1.32, 1.75);
    chaya.add(samovar);

    const chimneyGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8);
    const chimney = new THREE.Mesh(chimneyGeo, steelMat);
    chimney.position.set(0.9, 1.95, 1.75);
    chaya.add(chimney);

    // Outside Long Wooden Bench for Customers
    const benchGeo = new THREE.BoxGeometry(3.0, 0.45, 0.4);
    const bench = new THREE.Mesh(benchGeo, woodMat);
    bench.position.set(0, 0.25, 2.5);
    chaya.add(bench);

    // Malayalam Signboard: "ചായക്കട / നാടൻ പലഹാരങ്ങൾ"
    const signGeo = new THREE.BoxGeometry(3.2, 0.45, 0.06);
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, 2.7, 1.65);
    chaya.add(sign);

    chaya.scale.set(1.4, 1.4, 1.4);
    return chaya;
  }

  // =========================================================================
  // 7. Bakery (കേരള ബേക്കറി / Kerala Bakery)
  // =========================================================================
  public static createBakeryModel(): THREE.Group {
    const bakery = new THREE.Group();
    bakery.name = 'kerala_bakery';

    const facadeMat = new THREE.MeshLambertMaterial({ color: 0xf43f5e });  // Vibrant Rose/Ruby shop facade
    const glassMat = new THREE.MeshLambertMaterial({ color: 0xcffafe, transparent: true, opacity: 0.75 });
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const halwaBlackMat = new THREE.MeshBasicMaterial({ color: 0x1c1917 }); // Kozhikode Black Halwa
    const halwaRedMat = new THREE.MeshBasicMaterial({ color: 0xb91c1c });   // Red Halwa
    const chipsYellowMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 }); // Kerala Banana Chips
    const frameMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });

    // Main Storefront (5.2m wide x 3.6m deep x 3.4m high)
    const storeGeo = new THREE.BoxGeometry(5.2, 3.4, 3.6);
    const store = new THREE.Mesh(storeGeo, facadeMat);
    store.position.set(0, 1.7, 0);
    bakery.add(store);

    // Large Front Display Windows
    const glassFrontGeo = new THREE.BoxGeometry(4.2, 2.0, 0.1);
    const glassFront = new THREE.Mesh(glassFrontGeo, glassMat);
    glassFront.position.set(0, 1.5, 1.82);
    bakery.add(glassFront);

    // Illuminated Top Signboard: "KERALA BAKERY / ബേക്കറി & കൂൾ ബാർ"
    const signBoxGeo = new THREE.BoxGeometry(4.8, 0.65, 0.15);
    const signBox = new THREE.Mesh(signBoxGeo, frameMat);
    signBox.position.set(0, 3.0, 1.85);
    bakery.add(signBox);

    const signTextGeo = new THREE.BoxGeometry(4.4, 0.45, 0.16);
    const signText = new THREE.Mesh(signTextGeo, whiteMat);
    signText.position.set(0, 3.0, 1.86);
    bakery.add(signText);

    // Big Transparent Display Jars inside with Halwa & Banana Chips
    for (let jx = -1.5; jx <= 1.5; jx += 0.75) {
      const jarGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.45, 10);
      const jMat = jx < -0.5 ? halwaBlackMat : (jx > 0.5 ? chipsYellowMat : halwaRedMat);
      const jar = new THREE.Mesh(jarGeo, jMat);
      jar.position.set(jx, 1.0, 1.6);
      bakery.add(jar);
    }

    // Entrance Steps
    const stepGeo = new THREE.BoxGeometry(2.0, 0.2, 0.6);
    const step = new THREE.Mesh(stepGeo, whiteMat);
    step.position.set(0, 0.1, 2.05);
    bakery.add(step);

    bakery.scale.set(1.4, 1.4, 1.4);
    return bakery;
  }

  // =========================================================================
  // 8. Pharmacy (മെഡിക്കൽ സ്റ്റോർ / ഫാർമസി / Medical Store)
  // =========================================================================
  public static createPharmacyModel(): THREE.Group {
    const pharm = new THREE.Group();
    pharm.name = 'kerala_pharmacy';

    const wallMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });     // Clean Clinical White
    const cyanTrimMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 }); // Medical Cyan Trim
    const greenCrossMat = new THREE.MeshBasicMaterial({ color: 0x10b981 }); // Glowing Green Cross
    const glassMat = new THREE.MeshLambertMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.8 });
    const medBoxMat1 = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const medBoxMat2 = new THREE.MeshBasicMaterial({ color: 0x3b82f6 });

    // Store Building (5.0m wide x 3.4m deep x 3.4m high)
    const bldgGeo = new THREE.BoxGeometry(5.0, 3.4, 3.4);
    const bldg = new THREE.Mesh(bldgGeo, wallMat);
    bldg.position.set(0, 1.7, 0);
    pharm.add(bldg);

    // Front Fascia Signboard: "CITY MEDICALS / ഫാർമസി (24 HOURS)"
    const fasciaGeo = new THREE.BoxGeometry(4.6, 0.65, 0.14);
    const fascia = new THREE.Mesh(fasciaGeo, cyanTrimMat);
    fascia.position.set(0, 2.95, 1.74);
    pharm.add(fascia);

    // Glowing Green Medical Cross (+) Symbol on storefront
    const crossArm1 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.08), greenCrossMat);
    crossArm1.position.set(1.8, 2.95, 1.82);
    pharm.add(crossArm1);

    const crossArm2 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.08), greenCrossMat);
    crossArm2.position.set(1.8, 2.95, 1.82);
    pharm.add(crossArm2);

    // Glass Counter & Entrance
    const counterGeo = new THREE.BoxGeometry(3.6, 1.0, 0.15);
    const counter = new THREE.Mesh(counterGeo, glassMat);
    counter.position.set(-0.3, 1.2, 1.72);
    pharm.add(counter);

    // Medicine Shelves behind counter
    for (let rx = -1.4; rx <= 0.8; rx += 0.5) {
      for (let ry = 1.0; ry <= 2.2; ry += 0.35) {
        const mGeo = new THREE.BoxGeometry(0.35, 0.15, 0.08);
        const mMat = Math.random() > 0.5 ? medBoxMat1 : medBoxMat2;
        const box = new THREE.Mesh(mGeo, mMat);
        box.position.set(rx, ry, 1.4);
        pharm.add(box);
      }
    }

    pharm.scale.set(1.4, 1.4, 1.4);
    return pharm;
  }

  // =========================================================================
  // 9. CompoundWall (കേരള കോമ്പൗണ്ട് വാൾ / Boundary Wall)
  // =========================================================================
  public static createCompoundWallModel(): THREE.Group {
    const wallGroup = new THREE.Group();
    wallGroup.name = 'kerala_compound_wall';

    const wallMat = new THREE.MeshLambertMaterial({ color: 0xf1f5f9 }); // Whitewashed masonry
    const tileMat = new THREE.MeshLambertMaterial({ color: 0x991b1b }); // Terracotta coping tiles
    const baseMat = new THREE.MeshLambertMaterial({ color: 0x78350f }); // Laterite stone foundation

    // Length 8.0m, Height 1.8m, Thickness 0.28m
    const wallGeo = new THREE.BoxGeometry(8.0, 1.5, 0.28);
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(0, 0.9, 0);
    wallGroup.add(wall);

    // Laterite Stone Base Course
    const baseGeo = new THREE.BoxGeometry(8.1, 0.3, 0.34);
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.set(0, 0.15, 0);
    wallGroup.add(base);

    // Terracotta Sloped Coping Tiles on top (മുകളിൽ പാകിയ ഓടുകൾ)
    const copingGeo = new THREE.ConeGeometry(0.32, 0.2, 4);
    copingGeo.rotateY(Math.PI / 4);
    // Continuous peaked coping slab
    const roofCopingGeo = new THREE.BoxGeometry(8.2, 0.12, 0.38);
    const coping = new THREE.Mesh(roofCopingGeo, tileMat);
    coping.position.set(0, 1.72, 0);
    wallGroup.add(coping);

    // Intermediate Concrete Support Pillars
    for (const px of [-4.0, 0, 4.0]) {
      const pillarGeo = new THREE.BoxGeometry(0.45, 1.85, 0.45);
      const pillar = new THREE.Mesh(pillarGeo, wallMat);
      pillar.position.set(px, 0.92, 0);
      wallGroup.add(pillar);

      // Pyramid pillar cap
      const capGeo = new THREE.ConeGeometry(0.38, 0.25, 4);
      capGeo.rotateY(Math.PI / 4);
      const cap = new THREE.Mesh(capGeo, tileMat);
      cap.position.set(px, 1.95, 0);
      wallGroup.add(cap);
    }

    wallGroup.scale.set(1.35, 1.35, 1.35);
    return wallGroup;
  }

  // =========================================================================
  // 10. Gate (ഇരുമ്പ് ഗേറ്റ് / Ornamental Iron Gate)
  // =========================================================================
  public static createGateModel(): THREE.Group {
    const gateGroup = new THREE.Group();
    gateGroup.name = 'kerala_entrance_gate';

    const pillarMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc }); // Whitewashed pillars
    const ironMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });   // Black wrought iron
    const goldMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });     // Golden spear tips
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });     // Gate lamp glow

    // Twin Stately Gate Pillars (Span 4.2m)
    for (const px of [-2.1, 2.1]) {
      const pGeo = new THREE.BoxGeometry(0.7, 2.4, 0.7);
      const pillar = new THREE.Mesh(pGeo, pillarMat);
      pillar.position.set(px, 1.2, 0);
      gateGroup.add(pillar);

      // Sphere / Lantern Gate Lamp on top
      const lampHeadGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.35, 10);
      const lampHead = new THREE.Mesh(lampHeadGeo, lampMat);
      lampHead.position.set(px, 2.6, 0);
      gateGroup.add(lampHead);
    }

    // Double Swing Wrought Iron Gate (2 Leaves: -1.0m to +1.0m)
    for (const leafX of [-1.0, 1.0]) {
      // Outer Frame
      const frameGeo = new THREE.BoxGeometry(1.9, 1.8, 0.06);
      const frame = new THREE.Mesh(frameGeo, ironMat);
      frame.position.set(leafX, 1.0, 0);
      gateGroup.add(frame);

      // Vertical Iron Railings & Spear Tips
      for (let rx = leafX - 0.8; rx <= leafX + 0.8; rx += 0.25) {
        const spearGeo = new THREE.ConeGeometry(0.04, 0.15, 6);
        const spear = new THREE.Mesh(spearGeo, goldMat);
        spear.position.set(rx, 2.0, 0);
        gateGroup.add(spear);
      }
    }

    gateGroup.scale.set(1.4, 1.4, 1.4);
    return gateGroup;
  }

  // =========================================================================
  // 11. Drain (റോഡരികിലെ ഓട / Roadside Storm Drain with Slotted Slabs)
  // =========================================================================
  public static createDrainModel(): THREE.Group {
    const drain = new THREE.Group();
    drain.name = 'kerala_roadside_drain';

    const concreteMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 }); // Slotted concrete slabs
    const channelMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });    // Deep drain interior shadow
    const kerbMat = new THREE.MeshLambertMaterial({ color: 0xd1d5db });

    // Drain Channel Trench (Length 10.0m x Width 0.85m x Depth 0.6m)
    const trenchGeo = new THREE.BoxGeometry(10.0, 0.5, 0.85);
    const trench = new THREE.Mesh(trenchGeo, channelMat);
    trench.position.set(0, 0.15, 0);
    drain.add(trench);

    // Slotted Concrete Slabs laid sequentially across the drain
    for (let sx = -4.5; sx <= 4.5; sx += 1.0) {
      const slabGeo = new THREE.BoxGeometry(0.92, 0.12, 0.88);
      const slab = new THREE.Mesh(slabGeo, concreteMat);
      slab.position.set(sx, 0.38, 0);
      drain.add(slab);

      // Drainage slot opening between slabs
      const slotGeo = new THREE.BoxGeometry(0.06, 0.14, 0.45);
      const slot = new THREE.Mesh(slotGeo, channelMat);
      slot.position.set(sx + 0.48, 0.39, 0);
      drain.add(slot);
    }

    // Roadside Raised Kerb Stone
    const kerbGeo = new THREE.BoxGeometry(10.0, 0.22, 0.15);
    const kerb = new THREE.Mesh(kerbGeo, kerbMat);
    kerb.position.set(0, 0.35, 0.5);
    drain.add(kerb);

    drain.scale.set(1.35, 1.35, 1.35);
    return drain;
  }

  // =========================================================================
  // 12. Culvert (റോഡരികിലെ കലുങ്ക് / Road Culvert with Hazard Stripes)
  // =========================================================================
  public static createCulvertModel(): THREE.Group {
    const culvert = new THREE.Group();
    culvert.name = 'kerala_roadside_culvert';

    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x64748b });   // Laterite/concrete abutment
    const yellowMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });   // Reflective Highway Yellow
    const blackMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });    // Hazard Black Stripes
    const whiteMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });

    // Under-road Culvert Water Basin / Barrel
    const barrelGeo = new THREE.BoxGeometry(5.0, 0.6, 2.8);
    const barrel = new THREE.Mesh(barrelGeo, stoneMat);
    barrel.position.set(0, 0.2, 0);
    culvert.add(barrel);

    // Twin Masonry Parapet Walls on both sides of road (ഇരുവശങ്ങളിലെയും കലുങ്ക് ഭിത്തികൾ)
    for (const sideZ of [-1.35, 1.35]) {
      // White Base Wall
      const wallGeo = new THREE.BoxGeometry(4.8, 0.9, 0.35);
      const wall = new THREE.Mesh(wallGeo, whiteMat);
      wall.position.set(0, 0.7, sideZ);
      culvert.add(wall);

      // Rounded Terminal End Posts
      for (const px of [-2.4, 2.4]) {
        const postGeo = new THREE.CylinderGeometry(0.24, 0.24, 1.1, 10);
        const post = new THREE.Mesh(postGeo, whiteMat);
        post.position.set(px, 0.75, sideZ);
        culvert.add(post);
      }

      // Iconic Diagonal Yellow & Black Reflective Hazard Stripes (കറുപ്പും മഞ്ഞയും പെയിന്റടിച്ച അടയാളം)
      for (let sx = -1.8; sx <= 1.8; sx += 0.6) {
        const stripeGeo = new THREE.BoxGeometry(0.26, 0.85, 0.37);
        const sMat = (Math.round(sx * 10) % 2 === 0) ? yellowMat : blackMat;
        const stripe = new THREE.Mesh(stripeGeo, sMat);
        stripe.position.set(sx, 0.7, sideZ);
        culvert.add(stripe);
      }
    }

    culvert.scale.set(1.4, 1.4, 1.4);
    return culvert;
  }

  // =========================================================================
  // 13. Bridge (പാലം / Road Bridge with Piers & Safety Barriers)
  // =========================================================================
  public static createBridgeModel(): THREE.Group {
    const bridge = new THREE.Group();
    bridge.name = 'kerala_road_bridge';

    const concreteMat = new THREE.MeshLambertMaterial({ color: 0xd1d5db }); // Concrete deck & piers
    const asphaltMat = new THREE.MeshBasicMaterial({ color: 0x334155 });   // Bridge road surface
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });     // Railings
    const yellowMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });    // Retro-reflective end blocks

    // Reinforced Concrete Bridge Deck (Length 16.0m x Width 6.4m x Thickness 0.6m)
    const deckGeo = new THREE.BoxGeometry(16.0, 0.6, 6.4);
    const deck = new THREE.Mesh(deckGeo, concreteMat);
    deck.position.set(0, 1.2, 0);
    bridge.add(deck);

    // Asphalt Wearing Surface
    const roadGeo = new THREE.BoxGeometry(16.0, 0.05, 5.8);
    const road = new THREE.Mesh(roadGeo, asphaltMat);
    road.position.set(0, 1.53, 0);
    bridge.add(road);

    // Safety Crash Barrier Railings on both sides (കൈവരികൾ)
    for (const sideZ of [-3.05, 3.05]) {
      // Continuous Top Parapet Rail
      const railGeo = new THREE.BoxGeometry(16.2, 0.22, 0.25);
      const rail = new THREE.Mesh(railGeo, whiteMat);
      rail.position.set(0, 2.3, sideZ);
      bridge.add(rail);

      // Mid Rail
      const midRailGeo = new THREE.BoxGeometry(16.2, 0.12, 0.18);
      const midRail = new THREE.Mesh(midRailGeo, whiteMat);
      midRail.position.set(0, 1.85, sideZ);
      bridge.add(midRail);

      // Upright Balusters / Stanchions
      for (let bx = -7.5; bx <= 7.5; bx += 1.5) {
        const postGeo = new THREE.BoxGeometry(0.2, 0.9, 0.2);
        const post = new THREE.Mesh(postGeo, whiteMat);
        post.position.set(bx, 1.9, sideZ);
        bridge.add(post);
      }

      // Yellow-Black Hazard Approach End Blocks
      for (const ex of [-8.0, 8.0]) {
        const endBlockGeo = new THREE.BoxGeometry(0.45, 1.1, 0.45);
        const endBlock = new THREE.Mesh(endBlockGeo, yellowMat);
        endBlock.position.set(ex, 1.95, sideZ);
        bridge.add(endBlock);
      }
    }

    // Heavy Concrete Piers supporting deck in water
    for (const px of [-4.5, 4.5]) {
      const pierGeo = new THREE.CylinderGeometry(0.7, 0.85, 3.2, 12);
      const pier = new THREE.Mesh(pierGeo, concreteMat);
      pier.position.set(px, -0.4, 0);
      bridge.add(pier);
    }

    bridge.scale.set(1.4, 1.4, 1.4);
    return bridge;
  }

  // =========================================================================
  // 14. Billboard (റോഡരികിലെ വലിയ പരസ്യബോർഡ് / Commercial Billboard)
  // =========================================================================
  public static createBillboardModel(): THREE.Group {
    const billboard = new THREE.Group();
    billboard.name = 'kerala_roadside_billboard';

    const steelMat = new THREE.MeshLambertMaterial({ color: 0x334155 }); // Dark structural steel
    const frameMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });
    const adBlueMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });  // Vibrant Kerala Ad Poster
    const adGoldMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });  // Gold jewellery ad accent
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Elevated Twin Steel Columns (Height 8.0m)
    for (const cx of [-2.8, 2.8]) {
      const colGeo = new THREE.CylinderGeometry(0.22, 0.28, 8.0, 10);
      const col = new THREE.Mesh(colGeo, steelMat);
      col.position.set(cx, 4.0, 0);
      billboard.add(col);
    }

    // Structural Diagonal Cross-Bracing
    const braceGeo = new THREE.CylinderGeometry(0.06, 0.06, 6.2, 6);
    const brace1 = new THREE.Mesh(braceGeo, steelMat);
    brace1.position.set(0, 4.5, 0);
    brace1.rotation.z = 0.7;
    billboard.add(brace1);

    const brace2 = new THREE.Mesh(braceGeo, steelMat);
    brace2.position.set(0, 4.5, 0);
    brace2.rotation.z = -0.7;
    billboard.add(brace2);

    // Large Billboard Display Frame (9.0m wide x 4.2m high)
    const frameGeo = new THREE.BoxGeometry(9.2, 4.4, 0.35);
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(0, 9.8, 0);
    billboard.add(frame);

    // Advertising Poster Face (Double-sided)
    for (const faceZ of [0.19, -0.19]) {
      const adGeo = new THREE.BoxGeometry(8.8, 4.0, 0.05);
      const ad = new THREE.Mesh(adGeo, adBlueMat);
      ad.position.set(0, 9.8, faceZ);
      billboard.add(ad);

      // Gold Jewellery / Brand Banner Graphic
      const bannerGeo = new THREE.BoxGeometry(5.5, 1.2, 0.06);
      const banner = new THREE.Mesh(bannerGeo, adGoldMat);
      banner.position.set(0, 10.4, faceZ);
      billboard.add(banner);

      const subtextGeo = new THREE.BoxGeometry(4.0, 0.4, 0.07);
      const subtext = new THREE.Mesh(subtextGeo, whiteMat);
      subtext.position.set(0, 9.0, faceZ);
      billboard.add(subtext);
    }

    // Overhead Illumination Floodlights
    for (let lx = -3.5; lx <= 3.5; lx += 2.3) {
      const lampArmGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.9, 6);
      const lampArm = new THREE.Mesh(lampArmGeo, steelMat);
      lampArm.position.set(lx, 12.2, 0.4);
      lampArm.rotation.x = 0.55;
      billboard.add(lampArm);

      const lampHeadGeo = new THREE.BoxGeometry(0.35, 0.18, 0.28);
      const lampHead = new THREE.Mesh(lampHeadGeo, whiteMat);
      lampHead.position.set(lx, 12.5, 0.75);
      billboard.add(lampHead);
    }

    billboard.scale.set(1.4, 1.4, 1.4);
    return billboard;
  }

  // =========================================================================
  // 15. AutoStand (കേരള ഓട്ടോ സ്റ്റാൻഡ് / Kerala Auto Stand)
  // =========================================================================
  public static createAutoStandModel(): THREE.Group {
    const stand = new THREE.Group();
    stand.name = 'kerala_auto_stand';

    const pvdBlueMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 });  // Official Blue Board
    const yellowMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });    // Auto Yellow
    const blackMat = new THREE.MeshBasicMaterial({ color: 0x111827 });     // Auto Lower Black
    const concreteMat = new THREE.MeshLambertMaterial({ color: 0xd6d3d1 }); // Paved Parking Bay
    const pipeMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });

    // Paved Auto Parking Bay (8.0m x 4.0m)
    const bayGeo = new THREE.BoxGeometry(8.0, 0.1, 4.0);
    const bay = new THREE.Mesh(bayGeo, concreteMat);
    bay.position.set(0, 0.05, 0);
    stand.add(bay);

    // Yellow Parking Bay Markings
    const markGeo = new THREE.BoxGeometry(7.8, 0.12, 0.12);
    const mark = new THREE.Mesh(markGeo, yellowMat);
    mark.position.set(0, 0.06, -1.85);
    stand.add(mark);

    // Official Kerala Auto Stand Signboard: "ഓട്ടോ റിക്ഷാ സ്റ്റാൻഡ്"
    const signPoleGeo = new THREE.CylinderGeometry(0.06, 0.06, 3.4, 8);
    const signPole = new THREE.Mesh(signPoleGeo, pipeMat);
    signPole.position.set(-3.2, 1.7, 1.6);
    stand.add(signPole);

    const signBoardGeo = new THREE.BoxGeometry(1.6, 0.9, 0.08);
    const signBoard = new THREE.Mesh(signBoardGeo, pvdBlueMat);
    signBoard.position.set(-3.2, 3.0, 1.6);
    stand.add(signBoard);

    const signTextGeo = new THREE.BoxGeometry(1.3, 0.4, 0.09);
    const signText = new THREE.Mesh(signTextGeo, yellowMat);
    signText.position.set(-3.2, 3.0, 1.61);
    stand.add(signText);

    // Iconic Kerala Bajaj RE Auto-Rickshaws (മഞ്ഞയും കറുപ്പും ഓട്ടോറിക്ഷകൾ)
    const createKeralaAuto = (): THREE.Group => {
      const auto = new THREE.Group();

      // Lower Black Chassis
      const chassisGeo = new THREE.BoxGeometry(1.3, 0.5, 2.4);
      const chassis = new THREE.Mesh(chassisGeo, blackMat);
      chassis.position.set(0, 0.4, 0);
      auto.add(chassis);

      // Yellow Top Canopy (മഞ്ഞ ടാർപോളിൻ മേൽക്കൂര)
      const canopyGeo = new THREE.BoxGeometry(1.32, 0.85, 2.1);
      const canopy = new THREE.Mesh(canopyGeo, yellowMat);
      canopy.position.set(0, 1.1, -0.1);
      auto.add(canopy);

      // Front Windshield Glass
      const shieldGeo = new THREE.BoxGeometry(1.15, 0.55, 0.06);
      const shieldMat = new THREE.MeshLambertMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.6 });
      const shield = new THREE.Mesh(shieldGeo, shieldMat);
      shield.position.set(0, 1.0, 0.95);
      shield.rotation.x = -0.2;
      auto.add(shield);

      // Front Single Wheel
      const frontWheelGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.12, 12);
      frontWheelGeo.rotateZ(Math.PI / 2);
      const frontWheel = new THREE.Mesh(frontWheelGeo, blackMat);
      frontWheel.position.set(0, 0.24, 1.0);
      auto.add(frontWheel);

      // Rear Twin Wheels
      for (const rx of [-0.62, 0.62]) {
        const rearWheel = new THREE.Mesh(frontWheelGeo, blackMat);
        rearWheel.position.set(rx, 0.24, -0.65);
        auto.add(rearWheel);
      }

      // Round Chrome Headlight
      const lampGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.06, 10);
      lampGeo.rotateX(Math.PI / 2);
      const lamp = new THREE.Mesh(lampGeo, whiteMat);
      lamp.position.set(0, 0.65, 1.22);
      auto.add(lamp);

      return auto;
    };

    // Place 2-3 Kerala Auto-Rickshaws queued up in the stand
    const auto1 = createKeralaAuto();
    auto1.position.set(-1.6, 0, 0);
    stand.add(auto1);

    const auto2 = createKeralaAuto();
    auto2.position.set(1.2, 0, 0);
    stand.add(auto2);

    // Bench for waiting drivers / passengers
    const driverBenchGeo = new THREE.BoxGeometry(2.0, 0.45, 0.4);
    const driverBench = new THREE.Mesh(driverBenchGeo, pipeMat);
    driverBench.position.set(2.8, 0.25, 1.5);
    stand.add(driverBench);

    stand.scale.set(1.4, 1.4, 1.4);
    return stand;
  }

}
