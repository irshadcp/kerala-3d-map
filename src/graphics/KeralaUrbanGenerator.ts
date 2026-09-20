import * as THREE from 'three';

export class KeralaUrbanGenerator {
  /**
   * 1. Modern Cantilever Traffic Signal (ട്രാഫിക് സിഗ്നൽ)
   * Overhead cantilever gantry with 3-aspect LED signals (Red/Amber/Green) at major intersections.
   */
  public static createTrafficSignalModel(): THREE.Group {
    const signal = new THREE.Group();
    signal.name = 'kerala_traffic_signal';

    const steelMat = new THREE.MeshLambertMaterial({ color: 0x334155 }); // Dark slate grey steel
    const blackMat = new THREE.MeshLambertMaterial({ color: 0x0f172a }); // Housing black
    const redMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const amberMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const greenMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });

    // Vertical Main Pole (Height 6.5m)
    const poleGeo = new THREE.CylinderGeometry(0.14, 0.18, 6.5, 10);
    const pole = new THREE.Mesh(poleGeo, steelMat);
    pole.position.set(0, 3.25, 0);
    signal.add(pole);

    // Horizontal Cantilever Arm over road (Length 4.5m)
    const armGeo = new THREE.CylinderGeometry(0.09, 0.09, 4.5, 8);
    const arm = new THREE.Mesh(armGeo, steelMat);
    arm.position.set(2.25, 6.0, 0);
    arm.rotation.z = -Math.PI / 2;
    signal.add(arm);

    // Overhead Signal Box
    const boxGeo = new THREE.BoxGeometry(0.45, 1.2, 0.3);
    const box = new THREE.Mesh(boxGeo, blackMat);
    box.position.set(3.5, 5.2, 0);
    signal.add(box);

    // 3 LED Signal Lights (Red, Amber, Green)
    const lensGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.05, 12);
    lensGeo.rotateX(Math.PI / 2);

    const redLens = new THREE.Mesh(lensGeo, redMat);
    redLens.position.set(3.5, 5.6, 0.16);
    signal.add(redLens);

    const amberLens = new THREE.Mesh(lensGeo, amberMat);
    amberLens.position.set(3.5, 5.2, 0.16);
    signal.add(amberLens);

    const greenLens = new THREE.Mesh(lensGeo, greenMat);
    greenLens.position.set(3.5, 4.8, 0.16);
    signal.add(greenLens);

    // Pedestrian pole signal at base (for pedestrians)
    const pedBoxGeo = new THREE.BoxGeometry(0.35, 0.7, 0.25);
    const pedBox = new THREE.Mesh(pedBoxGeo, blackMat);
    pedBox.position.set(0.35, 2.5, 0);
    signal.add(pedBox);

    const pedRed = new THREE.Mesh(lensGeo, redMat);
    pedRed.scale.set(0.8, 0.8, 0.8);
    pedRed.position.set(0.35, 2.68, 0.13);
    signal.add(pedRed);

    const pedGreen = new THREE.Mesh(lensGeo, greenMat);
    pedGreen.scale.set(0.8, 0.8, 0.8);
    pedGreen.position.set(0.35, 2.32, 0.13);
    signal.add(pedGreen);

    signal.scale.set(1.45, 1.45, 1.45);
    return signal;
  }

  /**
   * 2. Highway Advertising Billboard / Hoarding (ഹോർഡിംഗ്)
   * Elevated twin steel pillars supporting wide billboard with colorful Kerala pastel ad.
   */
  public static createBillboardModel(): THREE.Group {
    const billboard = new THREE.Group();
    billboard.name = 'kerala_billboard';

    const steelMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
    const frameMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const adMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 }); // Vibrant sky-blue ad poster

    // Twin Steel Columns
    for (const cx of [-2.4, 2.4]) {
      const colGeo = new THREE.CylinderGeometry(0.2, 0.25, 7.5, 10);
      const col = new THREE.Mesh(colGeo, steelMat);
      col.position.set(cx, 3.75, 0);
      billboard.add(col);
    }

    // Outer Billboard Frame (8.0m wide x 4.0m high x 0.3m deep)
    const frameGeo = new THREE.BoxGeometry(8.2, 4.2, 0.3);
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(0, 8.5, 0);
    billboard.add(frame);

    // Front Graphic Poster (Double-sided advertising)
    for (const side of [0.16, -0.16]) {
      const boardGeo = new THREE.BoxGeometry(7.8, 3.8, 0.05);
      const board = new THREE.Mesh(boardGeo, adMat);
      board.position.set(0, 8.5, side);
      billboard.add(board);
    }

    // Top Walkway & Floodlight Lamps
    for (let lx = -3.0; lx <= 3.0; lx += 2.0) {
      const lampArmGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 6);
      const lampArm = new THREE.Mesh(lampArmGeo, steelMat);
      lampArm.position.set(lx, 10.8, 0.4);
      lampArm.rotation.x = 0.5;
      billboard.add(lampArm);

      const lampHeadGeo = new THREE.BoxGeometry(0.3, 0.15, 0.25);
      const lampHeadMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const lampHead = new THREE.Mesh(lampHeadGeo, lampHeadMat);
      lampHead.position.set(lx, 11.1, 0.7);
      billboard.add(lampHead);
    }

    billboard.scale.set(1.4, 1.4, 1.4);
    return billboard;
  }

  /**
   * 3. Modern LED Street Light (ആധുനിക തെരുവ് വിളക്ക്)
   */
  public static createStreetLightModel(): THREE.Group {
    const light = new THREE.Group();
    light.name = 'kerala_street_light';

    const poleMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
    const lampGlowMat = new THREE.MeshBasicMaterial({ color: 0xfffaed });

    // Vertical Pole
    const poleGeo = new THREE.CylinderGeometry(0.08, 0.12, 6.0, 8);
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 3.0;
    light.add(pole);

    // Curved Upper Arm
    const armGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.6, 6);
    const arm = new THREE.Mesh(armGeo, poleMat);
    arm.position.set(0.6, 6.4, 0);
    arm.rotation.z = -0.7;
    light.add(arm);

    // LED Lamp Fixture Head
    const headGeo = new THREE.BoxGeometry(0.6, 0.1, 0.25);
    const head = new THREE.Mesh(headGeo, lampGlowMat);
    head.position.set(1.2, 6.6, 0);
    light.add(head);

    light.scale.set(1.4, 1.4, 1.4);
    return light;
  }

  /**
   * 4. Dense Roadside Shops Block (തിങ്ങിനിറഞ്ഞ റോഡരികിലെ കടകൾ / പീടികകൾ)
   * 3-unit connected roadside commercial shops with canopies, storefronts, and signage.
   */
  public static createDenseRoadsideShopsModel(): THREE.Group {
    const block = new THREE.Group();
    block.name = 'kerala_dense_shops';

    const wallMat1 = new THREE.MeshLambertMaterial({ color: 0xfef08a }); // Bakery yellow
    const wallMat2 = new THREE.MeshLambertMaterial({ color: 0xe0f2fe }); // Medical sky-tint
    const wallMat3 = new THREE.MeshLambertMaterial({ color: 0xfecdd3 }); // Fancy store pink
    const trimMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    const glassMat = new THREE.MeshLambertMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.75 });
    const shutterMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });

    const redAwningMat = new THREE.MeshLambertMaterial({ color: 0xdc2626 });
    const blueAwningMat = new THREE.MeshLambertMaterial({ color: 0x2563eb });
    const greenAwningMat = new THREE.MeshLambertMaterial({ color: 0x16a34a });

    const shopConfigs = [
      { x: -3.8, wallMat: wallMat1, awningMat: redAwningMat, signColor: 0xb91c1c },
      { x: 0, wallMat: wallMat2, awningMat: blueAwningMat, signColor: 0x1d4ed8 },
      { x: 3.8, wallMat: wallMat3, awningMat: greenAwningMat, signColor: 0x15803d },
    ];

    for (const cfg of shopConfigs) {
      // Main shop unit structure (width 3.6m x depth 5.0m x height 3.5m)
      const unitGeo = new THREE.BoxGeometry(3.6, 3.5, 5.0);
      const unit = new THREE.Mesh(unitGeo, cfg.wallMat);
      unit.position.set(cfg.x, 1.75, 0);
      block.add(unit);

      // Open shop entrance & glass display front
      const glassGeo = new THREE.BoxGeometry(2.8, 2.0, 0.1);
      const glass = new THREE.Mesh(glassGeo, glassMat);
      glass.position.set(cfg.x, 1.2, 2.52);
      block.add(glass);

      // Roll-up metal shutter rolled at top of entrance
      const shutterGeo = new THREE.BoxGeometry(3.0, 0.4, 0.25);
      const shutter = new THREE.Mesh(shutterGeo, shutterMat);
      shutter.position.set(cfg.x, 2.45, 2.6);
      block.add(shutter);

      // Projecting colorful cloth awning (ചായ്പ്പ് പന്തൽ)
      const awningGeo = new THREE.BoxGeometry(3.4, 0.08, 1.4);
      const awning = new THREE.Mesh(awningGeo, cfg.awningMat);
      awning.position.set(cfg.x, 2.6, 3.2);
      awning.rotation.x = 0.25; // Sloped down towards road
      block.add(awning);

      // Shop Signboard above awning
      const signMat = new THREE.MeshBasicMaterial({ color: cfg.signColor });
      const signGeo = new THREE.BoxGeometry(3.2, 0.65, 0.12);
      const sign = new THREE.Mesh(signGeo, signMat);
      sign.position.set(cfg.x, 3.1, 2.58);
      block.add(sign);
    }

    // Top roof parapet connecting all 3 shops
    const parapetGeo = new THREE.BoxGeometry(11.8, 0.35, 5.2);
    const parapet = new THREE.Mesh(parapetGeo, trimMat);
    parapet.position.set(0, 3.65, 0);
    block.add(parapet);

    block.scale.set(1.4, 1.4, 1.4);
    return block;
  }

  /**
   * 5. Surface Parking Area with Parked Cars (പാർക്കിംഗ് ഏരിയ)
   * Open asphalt surface, painted parking bays, 3 colorful cars, and 'P' signpost.
   */
  public static createParkingAreaModel(): THREE.Group {
    const parking = new THREE.Group();
    parking.name = 'kerala_parking_area';

    const asphaltMat = new THREE.MeshLambertMaterial({ color: 0x334155 }); // Slate dark tarmac
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const signPostMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
    const signBlueMat = new THREE.MeshBasicMaterial({ color: 0x1d4ed8 });

    // Asphalt surface pad (13m wide x 8.5m deep x 0.06m flush)
    const padGeo = new THREE.BoxGeometry(13.0, 0.06, 8.5);
    const pad = new THREE.Mesh(padGeo, asphaltMat);
    pad.position.set(0, 0.03, 0);
    parking.add(pad);

    // White painted parking bay dividers (5 bays)
    for (let x = -5.0; x <= 5.0; x += 2.5) {
      const lineGeo = new THREE.BoxGeometry(0.12, 0.02, 5.5);
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.position.set(x, 0.07, 0.5);
      parking.add(line);
    }

    // Parking Signpost ('P')
    const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.8, 8);
    const post = new THREE.Mesh(postGeo, signPostMat);
    post.position.set(-5.8, 1.4, -3.4);
    parking.add(post);

    const signGeo = new THREE.BoxGeometry(0.8, 0.8, 0.08);
    const sign = new THREE.Mesh(signGeo, signBlueMat);
    sign.position.set(-5.8, 2.7, -3.4);
    parking.add(sign);

    // Parked Cars (3 modern low-poly vehicles in stalls)
    const carData = [
      { x: -3.75, color: 0xffffff, type: 'suv' },      // White SUV
      { x: -1.25, color: 0xdc2626, type: 'hatchback' },// Red Hatchback
      { x: 3.75, color: 0x0284c7, type: 'sedan' },     // Blue Sedan
    ];

    const tireMat = new THREE.MeshLambertMaterial({ color: 0x111827 });
    const glassMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });
    const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const taillightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    for (const car of carData) {
      const carGroup = new THREE.Group();
      const carPaintMat = new THREE.MeshLambertMaterial({ color: car.color });

      // Lower chassis body
      const bodyHeight = car.type === 'suv' ? 0.75 : 0.58;
      const bodyWidth = car.type === 'suv' ? 1.7 : 1.55;
      const bodyLength = car.type === 'sedan' ? 3.8 : car.type === 'suv' ? 3.5 : 3.1;

      const bodyGeo = new THREE.BoxGeometry(bodyWidth, bodyHeight, bodyLength);
      const body = new THREE.Mesh(bodyGeo, carPaintMat);
      body.position.y = 0.45;
      carGroup.add(body);

      // Upper cabin & windows
      const cabinHeight = car.type === 'suv' ? 0.7 : 0.52;
      const cabinLength = car.type === 'sedan' ? 2.0 : car.type === 'suv' ? 2.3 : 1.8;
      const cabinGeo = new THREE.BoxGeometry(bodyWidth * 0.9, cabinHeight, cabinLength);
      const cabin = new THREE.Mesh(cabinGeo, glassMat);
      cabin.position.set(0, 0.45 + bodyHeight / 2 + cabinHeight / 2, -0.15);
      carGroup.add(cabin);

      // 4 Wheels
      for (const wx of [-bodyWidth / 2, bodyWidth / 2]) {
        for (const wz of [-bodyLength * 0.32, bodyLength * 0.32]) {
          const wheelGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.16, 10);
          wheelGeo.rotateZ(Math.PI / 2);
          const wheel = new THREE.Mesh(wheelGeo, tireMat);
          wheel.position.set(wx, 0.24, wz);
          carGroup.add(wheel);
        }
      }

      // Headlights and Taillights
      for (const lx of [-0.5, 0.5]) {
        const headGeo = new THREE.BoxGeometry(0.22, 0.12, 0.05);
        const head = new THREE.Mesh(headGeo, headlightMat);
        head.position.set(lx, 0.5, bodyLength / 2 + 0.02);
        carGroup.add(head);

        const tailGeo = new THREE.BoxGeometry(0.22, 0.12, 0.05);
        const tail = new THREE.Mesh(tailGeo, taillightMat);
        tail.position.set(lx, 0.5, -bodyLength / 2 - 0.02);
        carGroup.add(tail);
      }

      carGroup.position.set(car.x, 0.06, 0.6);
      parking.add(carGroup);
    }

    parking.scale.set(1.4, 1.4, 1.4);
    return parking;
  }

  /**
   * 6. Multi-Speciality Hospital Complex (മൾട്ടി-സ്പെഷ്യാലിറ്റി ഹോസ്പിറ്റൽ)
   * Modern white & teal medical building, Casualty/Emergency portico, red cross rooftop emblem.
   */
  public static createHospitalModel(): THREE.Group {
    const hospital = new THREE.Group();
    hospital.name = 'kerala_hospital';

    const wallMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc }); // Hospital white
    const accentMat = new THREE.MeshLambertMaterial({ color: 0x0d9488 }); // Medical teal
    const glassMat = new THREE.MeshLambertMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.75 });
    const redMat = new THREE.MeshBasicMaterial({ color: 0xef4444 }); // Emergency red
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x475569 });

    // Main Hospital Tower (16m wide x 12m deep x 15m high)
    const towerGeo = new THREE.BoxGeometry(16, 15, 12);
    const tower = new THREE.Mesh(towerGeo, wallMat);
    tower.position.set(0, 7.5, 0);
    hospital.add(tower);

    // Front Teal Architectural Accent Spine
    const spineGeo = new THREE.BoxGeometry(3.5, 15.6, 0.5);
    const spine = new THREE.Mesh(spineGeo, accentMat);
    spine.position.set(0, 7.8, 6.1);
    hospital.add(spine);

    // Front Glass Window Grid
    for (let floor = 2; floor <= 4; floor++) {
      for (const side of [-5.2, 5.2]) {
        const winGeo = new THREE.BoxGeometry(4.5, 1.8, 0.15);
        const win = new THREE.Mesh(winGeo, glassMat);
        win.position.set(side, floor * 3.0, 6.05);
        hospital.add(win);
      }
    }

    // Emergency / Casualty Ground Floor Canopy Portico
    const porticoGeo = new THREE.BoxGeometry(8.0, 0.4, 4.5);
    const portico = new THREE.Mesh(porticoGeo, redMat);
    portico.position.set(0, 3.8, 8.25);
    hospital.add(portico);

    // Portico support columns
    for (const cx of [-3.5, 3.5]) {
      const colGeo = new THREE.CylinderGeometry(0.18, 0.18, 3.8, 8);
      const col = new THREE.Mesh(colGeo, wallMat);
      col.position.set(cx, 1.9, 10.2);
      hospital.add(col);
    }

    // Rooftop Red Cross (+) Sign
    const crossBar1 = new THREE.BoxGeometry(0.6, 2.4, 0.2);
    const c1 = new THREE.Mesh(crossBar1, redMat);
    c1.position.set(0, 16.5, 5.8);
    hospital.add(c1);

    const crossBar2 = new THREE.BoxGeometry(2.4, 0.6, 0.2);
    const c2 = new THREE.Mesh(crossBar2, redMat);
    c2.position.set(0, 16.5, 5.8);
    hospital.add(c2);

    // Rooftop AC / Elevator plant unit
    const plantGeo = new THREE.BoxGeometry(5.0, 2.2, 4.0);
    const plant = new THREE.Mesh(plantGeo, roofMat);
    plant.position.set(0, 16.1, -1.5);
    hospital.add(plant);

    hospital.scale.set(1.4, 1.4, 1.4);
    return hospital;
  }

  /**
   * 7. Commercial Complex & Shopping Centre (ഷോപ്പിംഗ് കോംപ്ലക്സ് / മാൾ)
   * Multi-level retail complex with glass curtain walls, atrium entrance, and brand billboard.
   */
  public static createCommercialComplexModel(): THREE.Group {
    const mall = new THREE.Group();
    mall.name = 'kerala_commercial_complex';

    const facadeMat = new THREE.MeshLambertMaterial({ color: 0xe2e8f0 }); // Sleek stone grey
    const glassMat = new THREE.MeshLambertMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.8 });
    const bronzeMat = new THREE.MeshLambertMaterial({ color: 0x78350f }); // Warm bronze architectural fins
    const adMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b }); // Vibrant mall branding

    // Main Shopping Building (18m wide x 13m deep x 16m high)
    const baseGeo = new THREE.BoxGeometry(18, 16, 13);
    const base = new THREE.Mesh(baseGeo, facadeMat);
    base.position.set(0, 8, 0);
    mall.add(base);

    // Central Glass Atrium (Curtain Wall facade)
    const atriumGeo = new THREE.BoxGeometry(9.0, 13.0, 0.3);
    const atrium = new THREE.Mesh(atriumGeo, glassMat);
    atrium.position.set(0, 7.5, 6.6);
    mall.add(atrium);

    // Bronze Vertical Architectural Mullions
    for (let x = -4.0; x <= 4.0; x += 2.0) {
      const mullionGeo = new THREE.BoxGeometry(0.12, 13.2, 0.45);
      const mullion = new THREE.Mesh(mullionGeo, bronzeMat);
      mullion.position.set(x, 7.5, 6.7);
      mall.add(mullion);
    }

    // Grand Entrance Plaza Glass Canopy
    const canopyGeo = new THREE.BoxGeometry(8.5, 0.25, 3.5);
    const canopy = new THREE.Mesh(canopyGeo, bronzeMat);
    canopy.position.set(0, 4.2, 8.2);
    mall.add(canopy);

    // Large Commercial Shopping Mall Branding Board on top facade
    const boardGeo = new THREE.BoxGeometry(14.0, 2.0, 0.2);
    const board = new THREE.Mesh(boardGeo, adMat);
    board.position.set(0, 14.8, 6.6);
    mall.add(board);

    mall.scale.set(1.4, 1.4, 1.4);
    return mall;
  }

  /**
   * 8. High-Rise Residential Apartment Tower (അപ്പാർട്ട്മെന്റ് ടവർ)
   * Multi-story modern residential tower with staggered balconies, glass railings, and penthouse pergola.
   */
  public static createApartmentTowerModel(): THREE.Group {
    const tower = new THREE.Group();
    tower.name = 'kerala_apartment_tower';

    const wallWhiteMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });
    const terracottaMat = new THREE.MeshLambertMaterial({ color: 0xc2410c }); // Kerala terracotta accent
    const balconyGlassMat = new THREE.MeshLambertMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.7 });
    const pergolaMat = new THREE.MeshLambertMaterial({ color: 0x334155 });

    // Main Tower (13m wide x 13m deep x 26m high - ~8 stories)
    const bodyGeo = new THREE.BoxGeometry(13, 26, 13);
    const body = new THREE.Mesh(bodyGeo, wallWhiteMat);
    body.position.set(0, 13, 0);
    tower.add(body);

    // Vertical Terracotta Architectural Feature Strip
    const stripGeo = new THREE.BoxGeometry(2.6, 26.2, 0.4);
    const strip = new THREE.Mesh(stripGeo, terracottaMat);
    strip.position.set(0, 13, 6.6);
    tower.add(strip);

    // Staggered Residential Balconies on Front & Rear Facades
    for (let f = 1; f <= 6; f++) {
      const y = f * 3.6 + 2.0;

      // Front Balconies (Left & Right)
      for (const bx of [-4.2, 4.2]) {
        // Balcony slab
        const slabGeo = new THREE.BoxGeometry(3.6, 0.3, 1.6);
        const slab = new THREE.Mesh(slabGeo, wallWhiteMat);
        slab.position.set(bx, y, 7.3);
        tower.add(slab);

        // Glass safety railing
        const railGeo = new THREE.BoxGeometry(3.5, 0.9, 0.08);
        const rail = new THREE.Mesh(railGeo, balconyGlassMat);
        rail.position.set(bx, y + 0.6, 8.05);
        tower.add(rail);
      }
    }

    // Rooftop Penthouse Structure & Timber Pergola
    const penthouseGeo = new THREE.BoxGeometry(7.0, 3.2, 7.0);
    const penthouse = new THREE.Mesh(penthouseGeo, terracottaMat);
    penthouse.position.set(0, 27.6, 0);
    tower.add(penthouse);

    for (let i = -3.0; i <= 3.0; i += 1.0) {
      const beamGeo = new THREE.BoxGeometry(7.6, 0.15, 0.15);
      const beam = new THREE.Mesh(beamGeo, pergolaMat);
      beam.position.set(0, 29.3, i);
      tower.add(beam);
    }

    tower.scale.set(1.4, 1.4, 1.4);
    return tower;
  }

  /**
   * 9. Contemporary Business Hotel (ബിസിനസ്സ് ഹോട്ടൽ)
   * Welcoming arrival porte-cochère drive-through canopy, glass lobby, and rooftop hotel crest.
   */
  public static createHotelModel(): THREE.Group {
    const hotel = new THREE.Group();
    hotel.name = 'kerala_hotel';

    const wallMat = new THREE.MeshLambertMaterial({ color: 0xede9fe }); // Sophisticated warm lavender-grey
    const trimMat = new THREE.MeshLambertMaterial({ color: 0x4c1d95 }); // Royal purple trim
    const glassMat = new THREE.MeshLambertMaterial({ color: 0xfef08a, transparent: true, opacity: 0.85 }); // Warm interior lighting
    const signMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 }); // Golden hotel sign

    // Main Hotel Building (15m wide x 12m deep x 15m high)
    const mainGeo = new THREE.BoxGeometry(15, 15, 12);
    const main = new THREE.Mesh(mainGeo, wallMat);
    main.position.set(0, 7.5, 0);
    hotel.add(main);

    // Glass Hotel Lobby on Ground Floor
    const lobbyGeo = new THREE.BoxGeometry(11.0, 3.2, 0.3);
    const lobby = new THREE.Mesh(lobbyGeo, glassMat);
    lobby.position.set(0, 1.6, 6.1);
    hotel.add(lobby);

    // Porte-Cochère Arrival Canopy (Car drive-under)
    const canopyGeo = new THREE.BoxGeometry(9.0, 0.35, 5.0);
    const canopy = new THREE.Mesh(canopyGeo, trimMat);
    canopy.position.set(0, 3.6, 8.5);
    hotel.add(canopy);

    // Canopy pillars
    for (const px of [-3.8, 3.8]) {
      const colGeo = new THREE.CylinderGeometry(0.2, 0.2, 3.6, 8);
      const col = new THREE.Mesh(colGeo, wallMat);
      col.position.set(px, 1.8, 10.7);
      hotel.add(col);
    }

    // Hotel Room Window Array with warm ambient glow
    for (let floor = 2; floor <= 4; floor++) {
      for (let w = -5.0; w <= 5.0; w += 2.5) {
        const winGeo = new THREE.BoxGeometry(1.6, 1.8, 0.15);
        const win = new THREE.Mesh(winGeo, glassMat);
        win.position.set(w, floor * 3.0 + 1.2, 6.05);
        hotel.add(win);
      }
    }

    // Rooftop 'HOTEL' Crown Signboard
    const signGeo = new THREE.BoxGeometry(6.5, 1.2, 0.2);
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, 15.8, 5.8);
    hotel.add(sign);

    hotel.scale.set(1.4, 1.4, 1.4);
    return hotel;
  }
}
