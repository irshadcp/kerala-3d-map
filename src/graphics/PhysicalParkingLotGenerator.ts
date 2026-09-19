import * as THREE from 'three';
import { ParkingSlot } from '../core/geoTypes';

export interface ParkingLotOptions {
  id: string;
  name?: string;
  malayalamName?: string;
  width?: number;
  depth?: number;
  rotationY?: number;
  numStalls?: number;
  tags?: Record<string, string>;
}

export class PhysicalParkingLotGenerator {
  private static asphaltMat: THREE.MeshLambertMaterial;
  private static curbMat: THREE.MeshLambertMaterial;
  private static stripeMat: THREE.MeshBasicMaterial;
  private static wheelStopMat: THREE.MeshLambertMaterial;
  private static poleMat: THREE.MeshLambertMaterial;
  private static blueSignMat: THREE.MeshLambertMaterial;
  private static carBodyMats: THREE.MeshLambertMaterial[];
  private static carGlassMat: THREE.MeshLambertMaterial;
  private static tireMat: THREE.MeshLambertMaterial;

  constructor() {
    PhysicalParkingLotGenerator.initMaterials();
  }

  private static initMaterials() {
    if (!this.asphaltMat) {
      this.asphaltMat = new THREE.MeshLambertMaterial({ color: 0x242b35 });
      this.curbMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
      this.stripeMat = new THREE.MeshBasicMaterial({
        color: 0xf8fafc,
        depthWrite: false,
        transparent: true,
        opacity: 0.9,
      });
      this.wheelStopMat = new THREE.MeshLambertMaterial({ color: 0xcbd5e1 });
      this.poleMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
      this.blueSignMat = new THREE.MeshLambertMaterial({ color: 0x1d4ed8 });

      this.carBodyMats = [
        new THREE.MeshLambertMaterial({ color: 0xef4444 }), // Red
        new THREE.MeshLambertMaterial({ color: 0x3b82f6 }), // Blue
        new THREE.MeshLambertMaterial({ color: 0xf8fafc }), // White
        new THREE.MeshLambertMaterial({ color: 0x334155 }), // Slate
        new THREE.MeshLambertMaterial({ color: 0xfacc15 }), // Yellow auto
      ];
      this.carGlassMat = new THREE.MeshLambertMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.75,
      });
      this.tireMat = new THREE.MeshLambertMaterial({ color: 0x111827 });
    }
  }

  /**
   * Generates an authentic physical 3D parking lot with paved ground,
   * painted white stall lines, concrete wheel stops, and a blue 'P' entrance sign.
   */
  public createParkingLotMesh(
    options: ParkingLotOptions,
    outSlots?: ParkingSlot[]
  ): THREE.Group {
    PhysicalParkingLotGenerator.initMaterials();

    const group = new THREE.Group();
    group.name = `parking-lot-${options.id}`;

    const numStalls = options.numStalls || 6;
    const stallWidth = 2.6;
    const stallLength = 5.2;
    const lotWidth = numStalls * stallWidth + 1.2;
    const lotDepth = stallLength + 3.2; // stall + entrance lane
    const baseHeight = 0.08;

    // 1. Asphalt Ground Plane
    const baseGeo = new THREE.BoxGeometry(lotWidth, baseHeight, lotDepth);
    baseGeo.translate(0, baseHeight * 0.5, 0);
    const baseMesh = new THREE.Mesh(baseGeo, PhysicalParkingLotGenerator.asphaltMat);
    baseMesh.receiveShadow = true;
    group.add(baseMesh);

    // 2. Concrete Boundary Curbs (back and sides, leaving front open to road)
    const curbThickness = 0.22;
    const curbHeight = 0.18;

    // Back curb
    const backCurbGeo = new THREE.BoxGeometry(lotWidth, curbHeight, curbThickness);
    backCurbGeo.translate(0, curbHeight * 0.5 + baseHeight, -lotDepth * 0.5 + curbThickness * 0.5);
    const backCurb = new THREE.Mesh(backCurbGeo, PhysicalParkingLotGenerator.curbMat);
    group.add(backCurb);

    // Left curb
    const leftCurbGeo = new THREE.BoxGeometry(curbThickness, curbHeight, lotDepth);
    leftCurbGeo.translate(-lotWidth * 0.5 + curbThickness * 0.5, curbHeight * 0.5 + baseHeight, 0);
    group.add(new THREE.Mesh(leftCurbGeo, PhysicalParkingLotGenerator.curbMat));

    // Right curb
    const rightCurbGeo = new THREE.BoxGeometry(curbThickness, curbHeight, lotDepth);
    rightCurbGeo.translate(lotWidth * 0.5 - curbThickness * 0.5, curbHeight * 0.5 + baseHeight, 0);
    group.add(new THREE.Mesh(rightCurbGeo, PhysicalParkingLotGenerator.curbMat));

    // 3. Painted Parking Divider Stripes and Concrete Wheel Stops
    const startX = -lotWidth * 0.5 + 0.6;
    const stripeZ = -lotDepth * 0.5 + curbThickness + stallLength * 0.5;

    for (let i = 0; i <= numStalls; i++) {
      const sx = startX + i * stallWidth;

      // Divider stripe
      const stripeGeo = new THREE.BoxGeometry(0.12, 0.015, stallLength);
      stripeGeo.translate(sx, baseHeight + 0.01, stripeZ);
      const stripe = new THREE.Mesh(stripeGeo, PhysicalParkingLotGenerator.stripeMat);
      group.add(stripe);

      // Add wheel stop and register slot for each bay (between i and i+1)
      if (i < numStalls) {
        const bayCenterX = sx + stallWidth * 0.5;
        const bayCenterZ = stripeZ;

        // Concrete Wheel Stop
        const wsGeo = new THREE.BoxGeometry(1.6, 0.12, 0.2);
        wsGeo.translate(bayCenterX, baseHeight + 0.06, -lotDepth * 0.5 + curbThickness + 0.4);
        const wheelStop = new THREE.Mesh(wsGeo, PhysicalParkingLotGenerator.wheelStopMat);
        group.add(wheelStop);

        // Record slot for vehicle controller integration
        if (outSlots) {
          outSlots.push({
            id: `slot-${options.id}-${i}`,
            roadSegmentId: options.id,
            position: { x: bayCenterX, z: bayCenterZ },
            rotationY: 0,
            width: stallWidth,
            length: stallLength,
            isOccupied: false,
          });
        }

        // Procedurally place 1 or 2 parked cars for realism
        const shouldParkCar = (i % 3 === 0 || i === numStalls - 1);
        if (shouldParkCar) {
          const car = this.createLowPolyCar(i);
          car.position.set(bayCenterX, baseHeight, bayCenterZ);
          group.add(car);
        }
      }
    }

    // 4. Entrance Physical 3D 'P' Parking Signboard Totem
    const signTotem = this.createParkingTotem(options.name, options.malayalamName);
    signTotem.position.set(lotWidth * 0.5 + 0.4, 0, lotDepth * 0.5 - 0.6);
    group.add(signTotem);

    return group;
  }

  /**
   * Creates a classic blue physical 'P' parking totem with steel pole and bilingual badge.
   */
  private createParkingTotem(name?: string, malayalamName?: string): THREE.Group {
    const totem = new THREE.Group();
    totem.name = 'parking-totem';

    // 1. Steel Mounting Pole
    const poleHeight = 3.2;
    const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, poleHeight, 8);
    poleGeo.translate(0, poleHeight * 0.5, 0);
    const pole = new THREE.Mesh(poleGeo, PhysicalParkingLotGenerator.poleMat);
    totem.add(pole);

    // 2. Square Blue Parking Sign Box
    const signBoxSize = 0.95;
    const signGeo = new THREE.BoxGeometry(signBoxSize, signBoxSize, 0.08);
    signGeo.translate(0, poleHeight - 0.4, 0);
    const signBox = new THREE.Mesh(signGeo, PhysicalParkingLotGenerator.blueSignMat);
    totem.add(signBox);

    // 3. Prominent White 'P' Icon Plate
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(0, 0, 256, 256);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 150px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('P', 128, 120);

    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(malayalamName ? 'പാർക്കിംഗ്' : 'PARKING', 128, 215);

    const texture = new THREE.CanvasTexture(canvas);
    const faceMat = new THREE.MeshBasicMaterial({ map: texture });

    const faceGeo = new THREE.PlaneGeometry(signBoxSize * 0.95, signBoxSize * 0.95);
    const frontFace = new THREE.Mesh(faceGeo, faceMat);
    frontFace.position.set(0, poleHeight - 0.4, 0.045);
    totem.add(frontFace);

    const backFace = new THREE.Mesh(faceGeo, faceMat);
    backFace.position.set(0, poleHeight - 0.4, -0.045);
    backFace.rotation.y = Math.PI;
    totem.add(backFace);

    // 4. Optional facility name plate below
    if (name && name !== 'Parking') {
      const namePlate = this.createSubNamePlate(name);
      namePlate.position.set(0, poleHeight - 1.1, 0);
      totem.add(namePlate);
    }

    return totem;
  }

  private createSubNamePlate(text: string): THREE.Group {
    const group = new THREE.Group();
    const w = 1.4;
    const h = 0.35;
    const d = 0.05;

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      PhysicalParkingLotGenerator.poleMat
    );
    group.add(base);

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text.length > 18 ? text.substring(0, 16) + '..' : text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const faceMat = new THREE.MeshBasicMaterial({ map: texture });
    const pGeo = new THREE.PlaneGeometry(w * 0.92, h * 0.88);
    const front = new THREE.Mesh(pGeo, faceMat);
    front.position.z = d * 0.5 + 0.005;
    group.add(front);

    return group;
  }

  /**
   * Low-poly stylized vehicle for parked ambiance.
   */
  private createLowPolyCar(seed: number): THREE.Group {
    const car = new THREE.Group();
    car.name = 'parked-vehicle';

    const bodyMat =
      PhysicalParkingLotGenerator.carBodyMats[
        Math.abs(seed) % PhysicalParkingLotGenerator.carBodyMats.length
      ];

    // Chassis / Lower Body
    const bodyW = 1.8;
    const bodyH = 0.65;
    const bodyL = 3.9;
    const lowerGeo = new THREE.BoxGeometry(bodyW, bodyH, bodyL);
    lowerGeo.translate(0, bodyH * 0.5 + 0.28, 0);
    const lowerBody = new THREE.Mesh(lowerGeo, bodyMat);
    car.add(lowerBody);

    // Cabin / Upper Glass Greenhouse
    const cabinW = 1.5;
    const cabinH = 0.58;
    const cabinL = 2.1;
    const cabinGeo = new THREE.BoxGeometry(cabinW, cabinH, cabinL);
    cabinGeo.translate(0, bodyH + 0.28 + cabinH * 0.5, -0.2);
    const cabin = new THREE.Mesh(cabinGeo, PhysicalParkingLotGenerator.carGlassMat);
    car.add(cabin);

    // 4 Wheels
    const wheelRadius = 0.28;
    const wheelWidth = 0.22;
    const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 8);
    wheelGeo.rotateZ(Math.PI * 0.5);

    const wx = bodyW * 0.5 + 0.02;
    const wz = bodyL * 0.32;
    const wheelPositions = [
      { x: -wx, z: -wz },
      { x: wx, z: -wz },
      { x: -wx, z: wz },
      { x: wx, z: wz },
    ];

    for (const pos of wheelPositions) {
      const wheel = new THREE.Mesh(wheelGeo, PhysicalParkingLotGenerator.tireMat);
      wheel.position.set(pos.x, wheelRadius, pos.z);
      car.add(wheel);
    }

    return car;
  }
}
