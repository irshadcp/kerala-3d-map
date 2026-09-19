import * as THREE from 'three';

export class CharacterModel {
  public group: THREE.Group;
  private head: THREE.Group;
  private torso: THREE.Group;
  private leftArm: THREE.Group;
  private rightArm: THREE.Group;
  private leftLeg: THREE.Group;
  private rightLeg: THREE.Group;
  private shadowMesh: THREE.Mesh;

  private bodyContainer: THREE.Group;
  private walkPhase = 0;
  private idleTime = 0;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'player-character';

    // Materials with cartoon pastel / stylized shading
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xffdfc4 });
    const hairMat = new THREE.MeshLambertMaterial({ color: 0x2c3437 });
    const capMat = new THREE.MeshLambertMaterial({ color: 0xef4444 }); // vibrant red cap
    const hoodieMat = new THREE.MeshLambertMaterial({ color: 0x3b82f6 }); // stylish blue hoodie
    const backpackMat = new THREE.MeshLambertMaterial({ color: 0xf59e0b }); // golden yellow backpack
    const pantsMat = new THREE.MeshLambertMaterial({ color: 0x334155 }); // dark slate pants
    const shoeMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc }); // white sneakers
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });

    // Container for character body parts that elevates during jumping
    this.bodyContainer = new THREE.Group();
    this.group.add(this.bodyContainer);

    // 1. Torso & Body
    this.torso = new THREE.Group();
    this.torso.position.y = 1.35;

    // Hoodie body
    const bodyGeo = new THREE.CylinderGeometry(0.32, 0.28, 0.75, 8);
    const bodyMesh = new THREE.Mesh(bodyGeo, hoodieMat);
    bodyMesh.castShadow = true;
    this.torso.add(bodyMesh);

    // Backpack
    const backpackGeo = new THREE.BoxGeometry(0.38, 0.45, 0.22);
    const backpackMesh = new THREE.Mesh(backpackGeo, backpackMat);
    backpackMesh.position.set(0, 0.05, -0.22);
    backpackMesh.castShadow = true;
    this.torso.add(backpackMesh);

    // 2. Head & Cap
    this.head = new THREE.Group();
    this.head.position.set(0, 0.65, 0);

    // Head base
    const headGeo = new THREE.SphereGeometry(0.32, 12, 10);
    headGeo.scale(1, 1.1, 1);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.castShadow = true;
    this.head.add(headMesh);

    // Hair fringe / sideburns under cap
    const hairGeo = new THREE.BoxGeometry(0.36, 0.12, 0.2);
    const hairMesh = new THREE.Mesh(hairGeo, hairMat);
    hairMesh.position.set(0, 0.12, -0.15);
    this.head.add(hairMesh);

    // Cap crown
    const capGeo = new THREE.SphereGeometry(0.33, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const capMesh = new THREE.Mesh(capGeo, capMat);
    capMesh.position.y = 0.05;
    this.head.add(capMesh);

    // Cap visor (visor pointing forward)
    const visorGeo = new THREE.BoxGeometry(0.32, 0.04, 0.22);
    const visorMesh = new THREE.Mesh(visorGeo, capMat);
    visorMesh.position.set(0, 0.08, 0.32);
    visorMesh.rotation.x = -0.15;
    this.head.add(visorMesh);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.04, 6, 6);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.1, 0.04, 0.3);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.1, 0.04, 0.3);
    this.head.add(leftEye);
    this.head.add(rightEye);

    this.torso.add(this.head);

    // 3. Arms (Pivots at shoulder)
    const armGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.55, 6);
    armGeo.translate(0, -0.25, 0);

    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.38, 0.28, 0);
    const leftArmMesh = new THREE.Mesh(armGeo, hoodieMat);
    leftArmMesh.castShadow = true;
    this.leftArm.add(leftArmMesh);
    this.torso.add(this.leftArm);

    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.38, 0.28, 0);
    const rightArmMesh = new THREE.Mesh(armGeo, hoodieMat);
    rightArmMesh.castShadow = true;
    this.rightArm.add(rightArmMesh);
    this.torso.add(this.rightArm);

    this.bodyContainer.add(this.torso);

    // 4. Legs (Pivots at hips)
    const legGeo = new THREE.CylinderGeometry(0.1, 0.08, 0.65, 6);
    legGeo.translate(0, -0.3, 0);

    const shoeGeo = new THREE.BoxGeometry(0.16, 0.12, 0.26);
    shoeGeo.translate(0, -0.6, 0.05);

    // Left Leg
    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-0.16, 0.95, 0);
    const leftLegMesh = new THREE.Mesh(legGeo, pantsMat);
    leftLegMesh.castShadow = true;
    const leftShoeMesh = new THREE.Mesh(shoeGeo, shoeMat);
    leftShoeMesh.castShadow = true;
    this.leftLeg.add(leftLegMesh);
    this.leftLeg.add(leftShoeMesh);
    this.bodyContainer.add(this.leftLeg);

    // Right Leg
    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(0.16, 0.95, 0);
    const rightLegMesh = new THREE.Mesh(legGeo, pantsMat);
    rightLegMesh.castShadow = true;
    const rightShoeMesh = new THREE.Mesh(shoeGeo, shoeMat);
    rightShoeMesh.castShadow = true;
    this.rightLeg.add(rightLegMesh);
    this.rightLeg.add(rightShoeMesh);
    this.bodyContainer.add(this.rightLeg);

    // 5. Soft Ground Shadow Decal (Stays on ground during jump)
    const shadowGeo = new THREE.CircleGeometry(0.95, 16);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    });
    this.shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowMesh.rotation.x = -Math.PI / 2;
    this.shadowMesh.position.y = 0.03;
    this.group.add(this.shadowMesh);

    // Prominent, heroic character scale (1.85x) for great visibility across vast city maps
    this.group.scale.set(1.85, 1.85, 1.85);
  }

  /**
   * Updates procedural animation based on speed, movement state, and jump height.
   */
  public updateAnimation(
    delta: number,
    speed: number,
    isMoving: boolean,
    jumpHeight = 0,
    isGrounded = true
  ) {
    // 1. Handle jump elevation & ground shadow
    this.bodyContainer.position.y = jumpHeight;

    if (!isGrounded || jumpHeight > 0.05) {
      // In-air jump pose
      const shadowScale = Math.max(0.35, 1.0 - jumpHeight * 0.28);
      this.shadowMesh.scale.set(shadowScale, shadowScale, 1);
      (this.shadowMesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0.06, 0.22 - jumpHeight * 0.05);

      // Cute athletic jump pose
      this.leftLeg.rotation.x = -0.45;
      this.rightLeg.rotation.x = 0.25;
      this.leftArm.rotation.x = -0.7;
      this.leftArm.rotation.z = -0.35;
      this.rightArm.rotation.x = -0.7;
      this.rightArm.rotation.z = 0.35;
      this.torso.rotation.x = 0.15;
      this.head.rotation.y = 0;
      return;
    }

    // Reset arm abduction when on ground
    this.leftArm.rotation.z *= 0.8;
    this.rightArm.rotation.z *= 0.8;
    (this.shadowMesh.material as THREE.MeshBasicMaterial).opacity = 0.22;

    if (isMoving && speed > 0.1) {
      // Walking / running cycle dynamically calibrated to higher speed
      const cycleSpeed = Math.min(speed * 1.15, 20.0);
      this.walkPhase += delta * cycleSpeed;

      // Leg swing (alternating)
      const legAngle = Math.sin(this.walkPhase) * 0.75;
      this.leftLeg.rotation.x = legAngle;
      this.rightLeg.rotation.x = -legAngle;

      // Arm swing (opposite to legs)
      this.leftArm.rotation.x = -legAngle * 0.7;
      this.rightArm.rotation.x = legAngle * 0.7;

      // Vertical bounce
      const bounce = Math.abs(Math.sin(this.walkPhase)) * 0.08;
      this.torso.position.y = 1.35 + bounce;

      // Slight forward lean
      this.torso.rotation.x = 0.12;

      // Shadow pulses subtly
      this.shadowMesh.scale.set(1 + bounce * 0.5, 1 + bounce * 0.5, 1);
    } else {
      // Return smoothly to idle
      this.idleTime += delta * 2.0;

      this.leftLeg.rotation.x *= 0.85;
      this.rightLeg.rotation.x *= 0.85;
      this.leftArm.rotation.x *= 0.85;
      this.rightArm.rotation.x *= 0.85;

      // Idle breathing
      const breath = Math.sin(this.idleTime) * 0.02;
      this.torso.position.y = 1.35 + breath;
      this.torso.rotation.x = 0;
      this.head.rotation.y = Math.sin(this.idleTime * 0.5) * 0.08;
      this.shadowMesh.scale.set(1, 1, 1);
    }
  }

  /**
   * Sets character heading rotation (in radians) smoothly.
   */
  public setHeading(rotationY: number) {
    this.group.rotation.y = rotationY;
  }
}
