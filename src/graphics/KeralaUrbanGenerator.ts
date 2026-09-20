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

    return light;
  }
}
