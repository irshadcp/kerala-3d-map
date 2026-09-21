import * as THREE from 'three';

export type VehicleType = 'auto' | 'car';

/**
 * PlayerVehicle
 * Driveable authentic Kerala 3D vehicle (Iconic Kerala Auto-Rickshaw / Modern Car).
 * - Placed right beside each player when on foot so they can hop in anytime.
 * - Driver seat accommodation for the player character.
 * - Rotating wheels linked to velocity.
 * - Steerable front wheel/axle that turns into direction of travel.
 * - Emissive headlights and taillights.
 * - Soft grounded shadow.
 */
export class PlayerVehicle {
  public group: THREE.Group;
  public vehicleType: VehicleType;

  // Moving parts for realistic animation
  private frontWheelGroup!: THREE.Group;
  private rearLeftWheel!: THREE.Mesh;
  private rearRightWheel!: THREE.Mesh;
  private frontWheelMesh!: THREE.Mesh;
  private headlightMesh!: THREE.Mesh;
  public driverGroup!: THREE.Group;
  private driverSeatOffset = new THREE.Vector3(0, 0.55, 0.05);

  // Orientation & Animation state
  private currentHeading = 0;
  private targetHeading = 0;
  private currentPitch = 0;
  private targetPitch = 0;
  private wheelRotation = 0;
  private steerAngle = 0;
  private scale = 1.0;

  constructor(type: VehicleType = 'auto', scale = 1.0) {
    this.vehicleType = type;
    this.scale = scale;
    this.group = new THREE.Group();
    this.group.name = `player_vehicle_${type}`;
    this.group.rotation.order = 'YXZ';

    if (type === 'auto') {
      this.buildKeralaAuto();
    } else {
      this.buildKeralaCar();
    }

    this.group.scale.set(this.scale, this.scale, this.scale);
  }

  /**
   * Builds an authentic Kerala Bajaj RE Auto-Rickshaw (മഞ്ഞയും കറുപ്പും ഓട്ടോറിക്ഷ)
   */
  private buildKeralaAuto() {
    const blackChassisMat = new THREE.MeshLambertMaterial({ color: 0x18181b }); // Deep black
    const yellowCanopyMat = new THREE.MeshLambertMaterial({ color: 0xeab308 }); // Kerala Auto Yellow
    const glassMat = new THREE.MeshLambertMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.65,
    });
    const tireMat = new THREE.MeshLambertMaterial({ color: 0x27272a });
    const chromeMat = new THREE.MeshLambertMaterial({ color: 0xd4d4d8 });
    const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const taillightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const seatMat = new THREE.MeshLambertMaterial({ color: 0x292524 });

    // 1. Lower Black Chassis / Body
    const chassisGeo = new THREE.BoxGeometry(1.35, 0.55, 2.3);
    const chassis = new THREE.Mesh(chassisGeo, blackChassisMat);
    chassis.position.set(0, 0.45, 0);
    this.group.add(chassis);

    // Front nose taper
    const noseGeo = new THREE.BoxGeometry(1.0, 0.5, 0.7);
    const nose = new THREE.Mesh(noseGeo, blackChassisMat);
    nose.position.set(0, 0.42, 1.25);
    this.group.add(nose);

    // 2. Yellow Canopy Roof (മഞ്ഞ ടാർപോളിൻ മേൽക്കൂര)
    const canopyGeo = new THREE.BoxGeometry(1.38, 0.85, 2.05);
    const canopy = new THREE.Mesh(canopyGeo, yellowCanopyMat);
    canopy.position.set(0, 1.15, -0.1);
    this.group.add(canopy);

    // Canopy top curved cap
    const topCapGeo = new THREE.BoxGeometry(1.32, 0.12, 1.95);
    const topCap = new THREE.Mesh(topCapGeo, yellowCanopyMat);
    topCap.position.set(0, 1.6, -0.1);
    this.group.add(topCap);

    // 3. Windshield Frame & Glass
    const windshieldGeo = new THREE.BoxGeometry(1.2, 0.65, 0.05);
    const windshield = new THREE.Mesh(windshieldGeo, glassMat);
    windshield.position.set(0, 1.05, 0.95);
    windshield.rotation.x = -0.22;
    this.group.add(windshield);

    // Windshield frame border
    const frameGeo = new THREE.BoxGeometry(1.26, 0.06, 0.06);
    const frameTop = new THREE.Mesh(frameGeo, blackChassisMat);
    frameTop.position.set(0, 1.38, 0.88);
    this.group.add(frameTop);

    // 4. Seating & Driver Area
    const seatGeo = new THREE.BoxGeometry(1.1, 0.2, 0.5);
    const seat = new THREE.Mesh(seatGeo, seatMat);
    seat.position.set(0, 0.55, 0.2);
    this.group.add(seat);

    // Handlebars
    const handleGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.7, 8);
    handleGeo.rotateZ(Math.PI / 2);
    const handle = new THREE.Mesh(handleGeo, chromeMat);
    handle.position.set(0, 0.88, 0.9);
    this.group.add(handle);

    // 5. Front Single Wheel (Steerable)
    this.frontWheelGroup = new THREE.Group();
    this.frontWheelGroup.position.set(0, 0.26, 1.15);

    const wheelGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.14, 12);
    wheelGeo.rotateZ(Math.PI / 2);
    this.frontWheelMesh = new THREE.Mesh(wheelGeo, tireMat);
    this.frontWheelGroup.add(this.frontWheelMesh);

    // Front chrome fork
    const forkGeo = new THREE.BoxGeometry(0.18, 0.35, 0.06);
    const fork = new THREE.Mesh(forkGeo, chromeMat);
    fork.position.set(0, 0.2, 0);
    this.frontWheelGroup.add(fork);

    this.group.add(this.frontWheelGroup);

    // 6. Rear Twin Wheels
    const rearWheelGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.16, 12);
    rearWheelGeo.rotateZ(Math.PI / 2);

    this.rearLeftWheel = new THREE.Mesh(rearWheelGeo, tireMat);
    this.rearLeftWheel.position.set(-0.66, 0.26, -0.65);
    this.group.add(this.rearLeftWheel);

    this.rearRightWheel = new THREE.Mesh(rearWheelGeo, tireMat);
    this.rearRightWheel.position.set(0.66, 0.26, -0.65);
    this.group.add(this.rearRightWheel);

    // 7. Lights
    const lampGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.08, 12);
    lampGeo.rotateX(Math.PI / 2);
    this.headlightMesh = new THREE.Mesh(lampGeo, headlightMat);
    this.headlightMesh.position.set(0, 0.68, 1.6);
    this.group.add(this.headlightMesh);

    // Rear Brake / Tail Lights
    for (const rx of [-0.55, 0.55]) {
      const tailGeo = new THREE.BoxGeometry(0.14, 0.08, 0.04);
      const tail = new THREE.Mesh(tailGeo, taillightMat);
      tail.position.set(rx, 0.62, -1.16);
      this.group.add(tail);
    }

    // 8. Grounded Soft Shadow
    const shadowGeo = new THREE.PlaneGeometry(1.8, 2.8);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x09090b,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    this.group.add(shadow);

    // 9. Seated Authentic Kerala Driver (Active when driving)
    this.driverGroup = new THREE.Group();
    this.driverGroup.position.set(0, 0.58, 0.15);

    const driverSkinMat = new THREE.MeshLambertMaterial({ color: 0xd97706 });
    const driverHairMat = new THREE.MeshLambertMaterial({ color: 0x1c1917 });
    const driverShirtMat = new THREE.MeshLambertMaterial({ color: 0x047857 }); // Emerald green polo
    const driverPantsMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const driverShadesMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });

    // Driver Torso
    const dTorsoGeo = new THREE.BoxGeometry(0.55, 0.52, 0.3);
    const dTorso = new THREE.Mesh(dTorsoGeo, driverShirtMat);
    dTorso.position.y = 0.28;
    this.driverGroup.add(dTorso);

    // Driver Head
    const dHeadGeo = new THREE.BoxGeometry(0.32, 0.36, 0.32);
    const dHead = new THREE.Mesh(dHeadGeo, driverSkinMat);
    dHead.position.set(0, 0.68, 0);
    this.driverGroup.add(dHead);

    // Hair
    const dHairGeo = new THREE.BoxGeometry(0.34, 0.12, 0.34);
    const dHair = new THREE.Mesh(dHairGeo, driverHairMat);
    dHair.position.set(0, 0.85, -0.02);
    this.driverGroup.add(dHair);

    // Aviator Sunglasses
    const dShadesGeo = new THREE.BoxGeometry(0.32, 0.1, 0.08);
    const dShades = new THREE.Mesh(dShadesGeo, driverShadesMat);
    dShades.position.set(0, 0.70, 0.16);
    this.driverGroup.add(dShades);

    // Arms holding handlebars & seated thighs
    for (const side of [-1, 1]) {
      const armGeo = new THREE.BoxGeometry(0.12, 0.12, 0.45);
      const arm = new THREE.Mesh(armGeo, driverShirtMat);
      arm.position.set(side * 0.28, 0.32, 0.24);
      arm.rotation.x = -0.3;
      arm.rotation.y = -side * 0.15;
      this.driverGroup.add(arm);

      const legGeo = new THREE.BoxGeometry(0.18, 0.18, 0.42);
      const leg = new THREE.Mesh(legGeo, driverPantsMat);
      leg.position.set(side * 0.18, 0.04, 0.22);
      this.driverGroup.add(leg);
    }

    this.driverGroup.visible = false;
    this.group.add(this.driverGroup);

    this.driverSeatOffset.set(0, 0.48, 0.1);
  }

  /**
   * Alternative Modern Kerala Compact Car / Hatchback
   */
  private buildKeralaCar() {
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 }); // Sky blue
    const roofMat = new THREE.MeshLambertMaterial({ color: 0xffffff }); // White roof
    const glassMat = new THREE.MeshLambertMaterial({ color: 0x0f172a, transparent: true, opacity: 0.75 });
    const tireMat = new THREE.MeshLambertMaterial({ color: 0x18181b });
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    // Chassis
    const chassisGeo = new THREE.BoxGeometry(1.65, 0.6, 3.4);
    const chassis = new THREE.Mesh(chassisGeo, bodyMat);
    chassis.position.y = 0.5;
    this.group.add(chassis);

    // Cabin
    const cabinGeo = new THREE.BoxGeometry(1.5, 0.65, 1.9);
    const cabin = new THREE.Mesh(cabinGeo, roofMat);
    cabin.position.set(0, 1.1, -0.2);
    this.group.add(cabin);

    // Windows
    const winGeo = new THREE.BoxGeometry(1.54, 0.5, 1.7);
    const win = new THREE.Mesh(winGeo, glassMat);
    win.position.set(0, 1.08, -0.2);
    this.group.add(win);

    // 4 Wheels
    this.frontWheelGroup = new THREE.Group();
    this.frontWheelGroup.position.set(0, 0.28, 1.05);

    const wheelGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.16, 12);
    wheelGeo.rotateZ(Math.PI / 2);

    const fLeft = new THREE.Mesh(wheelGeo, tireMat);
    fLeft.position.x = -0.82;
    this.frontWheelGroup.add(fLeft);

    const fRight = new THREE.Mesh(wheelGeo, tireMat);
    fRight.position.x = 0.82;
    this.frontWheelGroup.add(fRight);

    this.group.add(this.frontWheelGroup);

    this.rearLeftWheel = new THREE.Mesh(wheelGeo, tireMat);
    this.rearLeftWheel.position.set(-0.82, 0.28, -1.05);
    this.group.add(this.rearLeftWheel);

    this.rearRightWheel = new THREE.Mesh(wheelGeo, tireMat);
    this.rearRightWheel.position.set(0.82, 0.28, -1.05);
    this.group.add(this.rearRightWheel);

    // Lights
    for (const lx of [-0.65, 0.65]) {
      const hLight = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.05), lightMat);
      hLight.position.set(lx, 0.55, 1.72);
      this.group.add(hLight);

      const tLight = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.05), tailMat);
      tLight.position.set(lx, 0.55, -1.72);
      this.group.add(tLight);
    }

    // Shadow
    const shadowGeo = new THREE.PlaneGeometry(2.0, 3.8);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x09090b, transparent: true, opacity: 0.45, depthWrite: false });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    this.group.add(shadow);

    this.driverSeatOffset.set(-0.35, 0.55, -0.1);
  }

  public getDriverSeatWorldPosition(out: THREE.Vector3): THREE.Vector3 {
    out.copy(this.driverSeatOffset);
    out.applyQuaternion(this.group.quaternion);
    out.add(this.group.position);
    return out;
  }

  public setHeading(angleRad: number) {
    this.targetHeading = angleRad;
  }

  public getHeading(): number {
    return this.currentHeading;
  }

  /**
   * Updates vehicle physics, steering angle, and wheel rolling animations.
   */
  public update(delta: number, isDriving: boolean, isMoving: boolean, speed = 1.0, steeringTarget = 0) {
    // 1. Smoothly interpolate vehicle heading and slope pitch
    let angleDiff = this.targetHeading - this.currentHeading;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    this.currentHeading += angleDiff * Math.min(1.0, delta * 12.0);
    this.group.rotation.y = this.currentHeading;

    // Smooth slope pitch tilt with suspension damping
    this.currentPitch += (this.targetPitch - this.currentPitch) * Math.min(1.0, delta * 7.0);
    this.group.rotation.x = this.currentPitch;

    // 2. Driver model visibility inside vehicle
    if (this.driverGroup) {
      this.driverGroup.visible = isDriving;
    }

    // 3. Wheel rotation and steering
    if (isMoving && isDriving) {
      const rollRate = delta * speed * 8.0;
      this.wheelRotation -= rollRate;

      if (this.frontWheelMesh) this.frontWheelMesh.rotation.x = this.wheelRotation;
      if (this.rearLeftWheel) this.rearLeftWheel.rotation.x = this.wheelRotation;
      if (this.rearRightWheel) this.rearRightWheel.rotation.x = this.wheelRotation;

      // Smooth steering angle
      this.steerAngle += (steeringTarget - this.steerAngle) * Math.min(1.0, delta * 8.0);
      if (this.frontWheelGroup) {
        this.frontWheelGroup.rotation.y = this.steerAngle;
      }
    } else {
      // Relax steering angle
      this.steerAngle *= 0.85;
      if (this.frontWheelGroup) {
        this.frontWheelGroup.rotation.y = this.steerAngle;
      }
    }
  }

  public setDriving(isDriving: boolean) {
    if (this.driverGroup) {
      this.driverGroup.visible = isDriving;
    }
  }

  public setPitch(pitch: number) {
    this.targetPitch = Math.max(-0.45, Math.min(0.45, pitch));
  }

  public setPosition(x: number, y: number, z: number) {
    this.group.position.set(x, y, z);
  }

  public setVisible(val: boolean) {
    this.group.visible = val;
  }

  public dispose() {
    this.group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const m = child as THREE.Mesh;
        m.geometry?.dispose();
      }
    });
  }
}
