import * as THREE from 'three';
import { ModelLoader } from './ModelLoader';

export class StreetElementGenerator {
  // Static shared unit geometries across all street elements
  private static unitBoxGeo: THREE.BoxGeometry;
  private static unitBottomBoxGeo: THREE.BoxGeometry;
  private static unitCylinderGeo: THREE.CylinderGeometry;
  private static unitSphereGeo: THREE.SphereGeometry;
  private static unitPlaneGeo: THREE.PlaneGeometry;

  // Cached materials
  private poleGreyMat: THREE.MeshLambertMaterial;
  private canopyBlueMat: THREE.MeshLambertMaterial;
  private canopyGlassMat: THREE.MeshLambertMaterial;
  private benchWoodMat: THREE.MeshLambertMaterial;
  private busYellowMat: THREE.MeshLambertMaterial;
  private busSignBlueMat: THREE.MeshLambertMaterial;
  private lampGlowMat: THREE.MeshBasicMaterial;
  private lampHousingMat: THREE.MeshLambertMaterial;
  private lightPuddleMat: THREE.MeshBasicMaterial;
  private signalRedMat: THREE.MeshBasicMaterial;
  private signalYellowMat: THREE.MeshBasicMaterial;
  private signalGreenMat: THREE.MeshBasicMaterial;
  private signalBoxMat: THREE.MeshLambertMaterial;
  private pavementMat: THREE.MeshLambertMaterial;
  private curbYellowMat: THREE.MeshLambertMaterial;
  private shadowMat: THREE.MeshBasicMaterial;

  // New materials
  private concretePoleMat: THREE.MeshLambertMaterial;
  private wireMat: THREE.MeshLambertMaterial;
  private insulatorMat: THREE.MeshLambertMaterial;
  private autoRickshawMats: THREE.MeshLambertMaterial[];
  private autoCanvasMat: THREE.MeshLambertMaterial;
  private autoWheelMat: THREE.MeshLambertMaterial;

  constructor() {
    StreetElementGenerator.initSharedGeometries();

    this.poleGreyMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    this.canopyBlueMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 });
    this.canopyGlassMat = new THREE.MeshLambertMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.82,
    });
    this.benchWoodMat = new THREE.MeshLambertMaterial({ color: 0xb45309 });
    this.busYellowMat = new THREE.MeshLambertMaterial({ color: 0xfacc15 });
    this.busSignBlueMat = new THREE.MeshLambertMaterial({ color: 0x1d4ed8 });

    this.lampGlowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    this.lampHousingMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    this.lightPuddleMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });

    this.signalRedMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    this.signalYellowMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    this.signalGreenMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    this.signalBoxMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });

    this.pavementMat = new THREE.MeshLambertMaterial({ color: 0xe2e8f0 });
    this.curbYellowMat = new THREE.MeshLambertMaterial({ color: 0xfbbf24 });

    this.shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
    });

    // Indian Visual Identity Materials
    this.concretePoleMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 }); // Light concrete gray
    this.wireMat = new THREE.MeshLambertMaterial({ color: 0x1e293b }); // Dark wire
    this.insulatorMat = new THREE.MeshLambertMaterial({ color: 0x78716c }); // Ceramic brown
    
    this.autoRickshawMats = [
      new THREE.MeshLambertMaterial({ color: 0xfacc15 }), // Yellow body
      new THREE.MeshLambertMaterial({ color: 0x16a34a }), // Green body
      new THREE.MeshLambertMaterial({ color: 0x111827 }), // Black body
    ];
    this.autoCanvasMat = new THREE.MeshLambertMaterial({ color: 0x27272a }); // Dark canvas roof
    this.autoWheelMat = new THREE.MeshLambertMaterial({ color: 0x171717 }); // Tire black
  }

  private static initSharedGeometries() {
    if (StreetElementGenerator.unitBoxGeo) return;

    StreetElementGenerator.unitBoxGeo = new THREE.BoxGeometry(1, 1, 1);
    (StreetElementGenerator.unitBoxGeo as any).isSharedUnit = true;

    StreetElementGenerator.unitBottomBoxGeo = new THREE.BoxGeometry(1, 1, 1);
    StreetElementGenerator.unitBottomBoxGeo.translate(0, 0.5, 0);
    (StreetElementGenerator.unitBottomBoxGeo as any).isSharedUnit = true;

    StreetElementGenerator.unitCylinderGeo = new THREE.CylinderGeometry(0.5, 0.5, 1.0, 10);
    StreetElementGenerator.unitCylinderGeo.translate(0, 0.5, 0);
    (StreetElementGenerator.unitCylinderGeo as any).isSharedUnit = true;

    StreetElementGenerator.unitSphereGeo = new THREE.SphereGeometry(1.0, 8, 8);
    (StreetElementGenerator.unitSphereGeo as any).isSharedUnit = true;

    StreetElementGenerator.unitPlaneGeo = new THREE.PlaneGeometry(1, 1);
    (StreetElementGenerator.unitPlaneGeo as any).isSharedUnit = true;
  }

  private box(w: number, h: number, d: number, mat: THREE.Material): THREE.Mesh {
    const m = new THREE.Mesh(StreetElementGenerator.unitBoxGeo, mat);
    m.scale.set(w, h, d);
    return m;
  }

  private bottomBox(w: number, h: number, d: number, mat: THREE.Material): THREE.Mesh {
    const m = new THREE.Mesh(StreetElementGenerator.unitBottomBoxGeo, mat);
    m.scale.set(w, h, d);
    return m;
  }

  private cylinder(r: number, h: number, mat: THREE.Material): THREE.Mesh {
    const m = new THREE.Mesh(StreetElementGenerator.unitCylinderGeo, mat);
    m.scale.set(r * 2, h, r * 2);
    return m;
  }

  /**
   * Creates an authentic 3D Bus Waiting Shelter with passenger bench,
   * curved canopy roof, steel pillars, route board, and circular bus signpost.
   */
  public createBusStopMesh(variant = 0): THREE.Group {
    const busStop = new THREE.Group();
    busStop.name = '3d-bus-stop';

    const pw = 6.2;
    const pd = 3.2;
    const ph = 0.22;

    // 1. Paved Bus Waiting Platform
    const platform = this.bottomBox(pw, ph, pd, this.pavementMat);
    busStop.add(platform);

    // Platform curb safety stripe (front curb facing road)
    const curb = this.box(pw, 0.14, 0.2, this.curbYellowMat);
    curb.position.set(0, ph / 2, pd / 2);
    busStop.add(curb);

    // 2. Support Pillars (4 steel posts)
    const postHeight = 2.8;
    const postRadius = 0.08;
    const postPositions = [
      { x: -pw / 2 + 0.45, z: -pd / 2 + 0.45 },
      { x: pw / 2 - 0.45, z: -pd / 2 + 0.45 },
      { x: -pw / 2 + 0.45, z: pd / 2 - 0.55 },
      { x: pw / 2 - 0.45, z: pd / 2 - 0.55 },
    ];

    for (const pos of postPositions) {
      const pMesh = this.cylinder(postRadius, postHeight, this.poleGreyMat);
      pMesh.position.set(pos.x, ph, pos.z);
      busStop.add(pMesh);
    }

    // 3. Arched Roof Canopy (Cantilevered with overhang)
    const roofWidth = pw + 0.5;
    const roofDepth = pd + 0.6;
    const roofMat = variant % 2 === 0 ? this.canopyBlueMat : this.canopyGlassMat;

    // Canopy slab
    const roofSlab = this.box(roofWidth, 0.16, roofDepth, roofMat);
    roofSlab.position.set(0, ph + postHeight + 0.08, 0);
    roofSlab.rotation.x = 0.04; // slight slope for rainwater
    busStop.add(roofSlab);

    // Curved front canopy lip
    const canopyLip = this.box(roofWidth, 0.22, 0.12, this.canopyBlueMat);
    canopyLip.position.set(0, ph + postHeight + 0.08, roofDepth / 2);
    busStop.add(canopyLip);

    // 4. Back Wall Glass Panel / Advertisement Board
    const backWall = this.box(pw - 1.2, 1.8, 0.08, this.canopyGlassMat);
    backWall.position.set(0, ph + 1.2, -pd / 2 + 0.45);
    busStop.add(backWall);

    // Timetable / Ad poster board in center
    const adBoard = this.box(2.0, 1.2, 0.12, this.busYellowMat);
    adBoard.position.set(0, ph + 1.3, -pd / 2 + 0.46);
    busStop.add(adBoard);

    // 5. Passenger Waiting Bench
    const benchWidth = pw - 2.0;
    const benchSeatHeight = 0.48;
    const benchDepth = 0.55;

    // Bench seat
    const seat = this.box(benchWidth, 0.08, benchDepth, this.benchWoodMat);
    seat.position.set(0, ph + benchSeatHeight, -pd / 2 + 0.9);
    busStop.add(seat);

    // Bench backrest
    const backrest = this.box(benchWidth, 0.35, 0.06, this.benchWoodMat);
    backrest.position.set(0, ph + benchSeatHeight + 0.3, -pd / 2 + 0.65);
    busStop.add(backrest);

    // Bench legs
    for (const lx of [-benchWidth / 2 + 0.4, benchWidth / 2 - 0.4]) {
      const leg = this.box(0.08, benchSeatHeight, benchDepth * 0.8, this.poleGreyMat);
      leg.position.set(lx, ph + benchSeatHeight / 2, -pd / 2 + 0.9);
      busStop.add(leg);
    }

    // 6. Bus Stop Signpost standing beside the shelter
    const signPostX = pw / 2 + 0.5;
    const signPole = this.cylinder(0.06, 3.2, this.poleGreyMat);
    signPole.position.set(signPostX, 0, pd / 2 - 0.3);
    busStop.add(signPole);

    // Circular Bus Emblem Badge on top
    const signDisk = new THREE.Mesh(StreetElementGenerator.unitSphereGeo, this.busSignBlueMat);
    signDisk.scale.set(0.48, 0.48, 0.08);
    signDisk.position.set(signPostX, 3.2, pd / 2 - 0.3);
    busStop.add(signDisk);

    // Yellow bus icon plate
    const iconPlate = this.box(0.55, 0.35, 0.1, this.busYellowMat);
    iconPlate.position.set(signPostX, 3.2, pd / 2 - 0.3);
    busStop.add(iconPlate);

    // 7. Ground shadow decal
    const shadow = new THREE.Mesh(StreetElementGenerator.unitPlaneGeo, this.shadowMat);
    shadow.scale.set(pw + 1.6, pd + 1.4, 1);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, 0.02, 0);
    busStop.add(shadow);

    return busStop;
  }

  /**
   * Creates a slender, elegant 3D street lamppost with curved arm,
   * warm lantern head, and soft light puddle on the ground.
   */
  public createStreetLampMesh(): THREE.Group {
    const lamp = new THREE.Group();
    lamp.name = '3d-street-lamp';

    const poleHeight = 6.2;

    // Base collar
    const baseCollar = this.cylinder(0.24, 0.4, this.poleGreyMat);
    baseCollar.position.set(0, 0, 0);
    lamp.add(baseCollar);

    // Vertical pole shaft
    const pole = this.cylinder(0.09, poleHeight, this.poleGreyMat);
    pole.position.set(0, 0, 0);
    lamp.add(pole);

    // Curved gooseneck arm extending toward the street (+Z direction)
    const armLength = 1.4;
    const arm = this.cylinder(0.07, armLength, this.poleGreyMat);
    arm.rotation.x = Math.PI / 3.2;
    arm.position.set(0, poleHeight - 0.2, armLength * 0.4);
    lamp.add(arm);

    // Lantern housing fixture
    const lampHeadZ = armLength * 0.85;
    const lampHeadY = poleHeight + 0.4;
    const housing = this.box(0.38, 0.16, 0.75, this.lampHousingMat);
    housing.position.set(0, lampHeadY, lampHeadZ);
    lamp.add(housing);

    // Glowing warm LED lens
    const lens = this.box(0.3, 0.06, 0.6, this.lampGlowMat);
    lens.position.set(0, lampHeadY - 0.08, lampHeadZ);
    lamp.add(lens);

    // Soft warm light puddle on the road underneath
    const puddle = new THREE.Mesh(StreetElementGenerator.unitPlaneGeo, this.lightPuddleMat);
    puddle.scale.set(4.5, 4.5, 1);
    puddle.rotation.x = -Math.PI / 2;
    puddle.position.set(0, 0.02, lampHeadZ);
    lamp.add(puddle);

    return lamp;
  }

  /**
   * Creates an authentic intersection 3D traffic light with red, amber, green lenses,
   * sun visors, and pedestrian crossing signal.
   */
  public createTrafficLightMesh(): THREE.Group {
    const trafficLight = new THREE.Group();
    trafficLight.name = '3d-traffic-light';

    const poleH = 6.0;

    // Base & main upright pole
    const base = this.cylinder(0.25, 0.4, this.poleGreyMat);
    trafficLight.add(base);

    const pole = this.cylinder(0.12, poleH, this.poleGreyMat);
    trafficLight.add(pole);

    // Horizontal mast arm reaching out over traffic lane
    const armLen = 3.6;
    const arm = this.cylinder(0.08, armLen, this.poleGreyMat);
    arm.rotation.z = -Math.PI / 2;
    arm.position.set(armLen / 2, poleH - 0.3, 0);
    trafficLight.add(arm);

    // Main Signal Box over lane
    const boxW = 0.55;
    const boxH = 1.55;
    const boxD = 0.42;
    const boxX = armLen - 0.4;
    const boxY = poleH - 0.3;

    const signalBox = this.box(boxW, boxH, boxD, this.signalBoxMat);
    signalBox.position.set(boxX, boxY, 0);
    trafficLight.add(signalBox);

    // Red, Yellow, Green Lenses
    const redLens = new THREE.Mesh(StreetElementGenerator.unitSphereGeo, this.signalRedMat);
    redLens.scale.set(0.18, 0.18, 0.08);
    redLens.position.set(boxX, boxY + 0.42, boxD / 2 + 0.02);
    trafficLight.add(redLens);

    const yellowLens = new THREE.Mesh(StreetElementGenerator.unitSphereGeo, this.signalYellowMat);
    yellowLens.scale.set(0.18, 0.18, 0.08);
    yellowLens.position.set(boxX, boxY, boxD / 2 + 0.02);
    trafficLight.add(yellowLens);

    const greenLens = new THREE.Mesh(StreetElementGenerator.unitSphereGeo, this.signalGreenMat);
    greenLens.scale.set(0.18, 0.18, 0.08);
    greenLens.position.set(boxX, boxY - 0.42, boxD / 2 + 0.02);
    trafficLight.add(greenLens);

    // Secondary Post-Mount Signal Box for pedestrians (height 2.4m)
    const pedBox = this.box(0.38, 0.8, 0.3, this.signalBoxMat);
    pedBox.position.set(0.32, 2.4, 0);
    trafficLight.add(pedBox);

    const pedRed = new THREE.Mesh(StreetElementGenerator.unitSphereGeo, this.signalRedMat);
    pedRed.scale.set(0.12, 0.12, 0.06);
    pedRed.position.set(0.32, 2.58, 0.16);
    trafficLight.add(pedRed);

    const pedGreen = new THREE.Mesh(StreetElementGenerator.unitSphereGeo, this.signalGreenMat);
    pedGreen.scale.set(0.12, 0.12, 0.06);
    pedGreen.position.set(0.32, 2.22, 0.16);
    trafficLight.add(pedGreen);

    // Drop shadow
    const shadow = new THREE.Mesh(StreetElementGenerator.unitPlaneGeo, this.shadowMat);
    shadow.scale.set(1.6, 1.6, 1);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, 0.02, 0);
    trafficLight.add(shadow);

    return trafficLight;
  }
  /**
   * Creates a typical Indian concrete electric pole with cross-arms and insulators.
   */
  public createElectricPoleMesh(): THREE.Group {
    const group = new THREE.Group();
    group.name = '3d-electric-pole';

    const poleH = 7.5;
    
    // Main concrete pole (tapered base to top)
    // We can use a stretched box for simplicity
    const pole = this.bottomBox(0.25, poleH, 0.25, this.concretePoleMat);
    group.add(pole);

    // Cross arms
    const arm1 = this.box(1.6, 0.1, 0.1, this.concretePoleMat);
    arm1.position.set(0, poleH - 0.5, 0);
    group.add(arm1);

    const arm2 = this.box(1.2, 0.1, 0.1, this.concretePoleMat);
    arm2.position.set(0, poleH - 1.2, 0);
    group.add(arm2);

    // Insulators on arms
    for (const pos of [-0.75, 0.75]) {
      const ins = this.cylinder(0.06, 0.2, this.insulatorMat);
      ins.position.set(pos, poleH - 0.45, 0);
      group.add(ins);
    }
    for (const pos of [-0.55, 0.55]) {
      const ins = this.cylinder(0.06, 0.2, this.insulatorMat);
      ins.position.set(pos, poleH - 1.15, 0);
      group.add(ins);
    }

    // Ground shadow
    const shadow = new THREE.Mesh(StreetElementGenerator.unitPlaneGeo, this.shadowMat);
    shadow.scale.set(1.2, 1.2, 1);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, 0.02, 0);
    group.add(shadow);

    // Wires (mock connecting wires)
    const wire = this.box(0.02, 0.02, 12.0, this.wireMat);
    wire.position.set(-0.75, poleH - 0.25, 0);
    group.add(wire);
    const wire2 = this.box(0.02, 0.02, 12.0, this.wireMat);
    wire2.position.set(0.75, poleH - 0.25, 0);
    group.add(wire2);

    return group;
  }

  /**
   * Creates an iconic Indian Auto Rickshaw (3-wheeler).
   * Automatically uses the authentic custom 3D model auto_rickshaw.glb if loaded!
   */
  public createAutoRickshawMesh(seed = 0): THREE.Group {
    const cachedGlb = ModelLoader.getInstance().getCachedAutoRickshaw();
    if (cachedGlb) {
      return cachedGlb;
    }

    const auto = new THREE.Group();
    auto.name = '3d-auto-rickshaw';

    const bodyMat = this.autoRickshawMats[Math.abs(seed) % this.autoRickshawMats.length];
    
    // Dimensions
    const w = 1.3;
    const l = 2.6;
    const h = 1.8;
    const wheelR = 0.25;

    // Lower Body (cabin base)
    const lowerBody = this.bottomBox(w, 0.7, l, bodyMat);
    lowerBody.position.set(0, wheelR, 0);
    auto.add(lowerBody);

    // Canvas Roof
    const roof = this.box(w, 0.1, l - 0.3, this.autoCanvasMat);
    roof.position.set(0, wheelR + h - 0.1, 0.15);
    auto.add(roof);

    // Windshield frame
    const frame = this.box(w, 0.9, 0.1, bodyMat);
    frame.position.set(0, wheelR + 0.7 + 0.45, -l/2 + 0.35);
    // Slight angle
    frame.rotation.x = 0.2;
    auto.add(frame);

    // Rear cabin support
    const rearSupport = this.bottomBox(w, h - 0.7, 0.1, this.autoCanvasMat);
    rearSupport.position.set(0, wheelR + 0.7, l/2 - 0.05);
    auto.add(rearSupport);

    // Wheels
    const w1 = this.cylinder(wheelR, 0.15, this.autoWheelMat);
    w1.rotation.z = Math.PI / 2;
    w1.position.set(0, wheelR, -l/2 + 0.3);
    auto.add(w1);

    const w2 = this.cylinder(wheelR, 0.2, this.autoWheelMat);
    w2.rotation.z = Math.PI / 2;
    w2.position.set(-w/2, wheelR, l/2 - 0.4);
    auto.add(w2);

    const w3 = this.cylinder(wheelR, 0.2, this.autoWheelMat);
    w3.rotation.z = Math.PI / 2;
    w3.position.set(w/2, wheelR, l/2 - 0.4);
    auto.add(w3);
    
    // Drop shadow
    const shadow = new THREE.Mesh(StreetElementGenerator.unitPlaneGeo, this.shadowMat);
    shadow.scale.set(w + 0.4, l + 0.4, 1);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, 0.02, 0);
    auto.add(shadow);

    return auto;
  }
}
