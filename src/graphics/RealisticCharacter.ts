import * as THREE from 'three';

/**
 * RealisticCharacter
 * Grounded 3D articulated human character for real-world exploration.
 * Replaces the 2D floating pin/badge with an authentic realistic human model:
 * - Fully articulated joints (head, torso, shoulders, arms, hips, legs, shoes)
 * - Stylish travel outfit (emerald polo/jacket, dark chinos, sneakers, backpack, shades)
 * - Dynamic procedural walking & idle breathing animations
 * - Grounded natural shadow
 * - High camera visibility and 60 FPS mobile performance
 */
export class RealisticCharacter {
  public group: THREE.Group;

  // Body parts for articulation
  private torso: THREE.Group;
  private headGroup: THREE.Group;
  private leftArmPivot: THREE.Group;
  private rightArmPivot: THREE.Group;
  private leftLegPivot: THREE.Group;
  private rightLegPivot: THREE.Group;
  private shadowMesh: THREE.Mesh;

  // Animation state
  private animPhase = 0;
  private currentHeading = 0;
  private targetHeading = 0;

  constructor(scale = 1.0) {
    this.group = new THREE.Group();
    this.group.name = 'realistic_kerala_character';

    // Materials
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xd97706 }); // Warm natural Indian skin tone
    const hairMat = new THREE.MeshLambertMaterial({ color: 0x1c1917 }); // Dark brown/black hair
    const shadesMat = new THREE.MeshBasicMaterial({ color: 0x0f172a }); // Dark aviator sunglasses
    const shirtMat = new THREE.MeshLambertMaterial({ color: 0x047857 });  // Emerald Kerala green polo/jacket
    const collarMat = new THREE.MeshLambertMaterial({ color: 0xffffff }); // White collar trim
    const pantsMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });  // Dark navy chinos/denim
    const beltMat = new THREE.MeshLambertMaterial({ color: 0x451a03 });   // Leather belt
    const buckleMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });  // Brass buckle
    const shoeMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });   // White sneakers
    const soleMat = new THREE.MeshBasicMaterial({ color: 0x334155 });    // Grey sneaker sole
    const bagMat = new THREE.MeshLambertMaterial({ color: 0x7c2d12 });    // Leather travel backpack

    // =========================================================================
    // 1. Torso & Pelvis
    // =========================================================================
    this.torso = new THREE.Group();
    this.torso.position.y = 1.35 * scale;

    // Main chest / upper torso
    const chestGeo = new THREE.BoxGeometry(0.72 * scale, 0.75 * scale, 0.42 * scale);
    const chest = new THREE.Mesh(chestGeo, shirtMat);
    chest.position.y = 0.35 * scale;
    this.torso.add(chest);

    // Collar trim
    const collarGeo = new THREE.BoxGeometry(0.48 * scale, 0.12 * scale, 0.44 * scale);
    const collar = new THREE.Mesh(collarGeo, collarMat);
    collar.position.y = 0.72 * scale;
    this.torso.add(collar);

    // Waist / Lower Torso
    const waistGeo = new THREE.BoxGeometry(0.68 * scale, 0.35 * scale, 0.38 * scale);
    const waist = new THREE.Mesh(waistGeo, shirtMat);
    waist.position.y = -0.12 * scale;
    this.torso.add(waist);

    // Leather Belt & Buckle
    const beltGeo = new THREE.BoxGeometry(0.7 * scale, 0.1 * scale, 0.4 * scale);
    const belt = new THREE.Mesh(beltGeo, beltMat);
    belt.position.y = -0.28 * scale;
    this.torso.add(belt);

    const buckleGeo = new THREE.BoxGeometry(0.16 * scale, 0.12 * scale, 0.42 * scale);
    const buckle = new THREE.Mesh(buckleGeo, buckleMat);
    buckle.position.set(0, -0.28 * scale, 0.02 * scale);
    this.torso.add(buckle);

    // Travel Backpack on back
    const bagGeo = new THREE.BoxGeometry(0.55 * scale, 0.65 * scale, 0.28 * scale);
    const bag = new THREE.Mesh(bagGeo, bagMat);
    bag.position.set(0, 0.32 * scale, -0.28 * scale);
    this.torso.add(bag);

    // =========================================================================
    // 2. Head & Face
    // =========================================================================
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.85 * scale, 0);

    // Neck
    const neckGeo = new THREE.CylinderGeometry(0.14 * scale, 0.16 * scale, 0.22 * scale, 8);
    const neck = new THREE.Mesh(neckGeo, skinMat);
    neck.position.y = -0.06 * scale;
    this.headGroup.add(neck);

    // Head
    const headGeo = new THREE.BoxGeometry(0.44 * scale, 0.48 * scale, 0.44 * scale);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 0.22 * scale;
    this.headGroup.add(head);

    // Hair (Stylish cut)
    const hairTopGeo = new THREE.BoxGeometry(0.46 * scale, 0.18 * scale, 0.46 * scale);
    const hairTop = new THREE.Mesh(hairTopGeo, hairMat);
    hairTop.position.set(0, 0.46 * scale, -0.02 * scale);
    this.headGroup.add(hairTop);

    const hairBackGeo = new THREE.BoxGeometry(0.46 * scale, 0.32 * scale, 0.12 * scale);
    const hairBack = new THREE.Mesh(hairBackGeo, hairMat);
    hairBack.position.set(0, 0.26 * scale, -0.2 * scale);
    this.headGroup.add(hairBack);

    // Cool Aviator Sunglasses
    const glassesGeo = new THREE.BoxGeometry(0.42 * scale, 0.14 * scale, 0.1 * scale);
    const glasses = new THREE.Mesh(glassesGeo, shadesMat);
    glasses.position.set(0, 0.25 * scale, 0.22 * scale);
    this.headGroup.add(glasses);

    this.torso.add(this.headGroup);

    // =========================================================================
    // 3. Left & Right Arm Pivots
    // =========================================================================
    // Left Arm Pivot
    this.leftArmPivot = new THREE.Group();
    this.leftArmPivot.position.set(-0.48 * scale, 0.65 * scale, 0);

    const armUpperGeo = new THREE.BoxGeometry(0.18 * scale, 0.45 * scale, 0.18 * scale);
    const leftArmUpper = new THREE.Mesh(armUpperGeo, shirtMat);
    leftArmUpper.position.y = -0.22 * scale;
    this.leftArmPivot.add(leftArmUpper);

    const armLowerGeo = new THREE.BoxGeometry(0.16 * scale, 0.48 * scale, 0.16 * scale);
    const leftArmLower = new THREE.Mesh(armLowerGeo, skinMat);
    leftArmLower.position.y = -0.6 * scale;
    this.leftArmPivot.add(leftArmLower);

    this.torso.add(this.leftArmPivot);

    // Right Arm Pivot
    this.rightArmPivot = new THREE.Group();
    this.rightArmPivot.position.set(0.48 * scale, 0.65 * scale, 0);

    const rightArmUpper = new THREE.Mesh(armUpperGeo, shirtMat);
    rightArmUpper.position.y = -0.22 * scale;
    this.rightArmPivot.add(rightArmUpper);

    const rightArmLower = new THREE.Mesh(armLowerGeo, skinMat);
    rightArmLower.position.y = -0.6 * scale;
    this.rightArmPivot.add(rightArmLower);

    this.torso.add(this.rightArmPivot);

    this.group.add(this.torso);

    // =========================================================================
    // 4. Left & Right Leg Pivots
    // =========================================================================
    // Left Leg Pivot
    this.leftLegPivot = new THREE.Group();
    this.leftLegPivot.position.set(-0.2 * scale, 1.05 * scale, 0);

    const legUpperGeo = new THREE.BoxGeometry(0.24 * scale, 0.6 * scale, 0.26 * scale);
    const leftThigh = new THREE.Mesh(legUpperGeo, pantsMat);
    leftThigh.position.y = -0.3 * scale;
    this.leftLegPivot.add(leftThigh);

    const legLowerGeo = new THREE.BoxGeometry(0.22 * scale, 0.58 * scale, 0.24 * scale);
    const leftCalf = new THREE.Mesh(legLowerGeo, pantsMat);
    leftCalf.position.y = -0.75 * scale;
    this.leftLegPivot.add(leftCalf);

    // Sneaker
    const shoeGeo = new THREE.BoxGeometry(0.24 * scale, 0.18 * scale, 0.46 * scale);
    const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
    leftShoe.position.set(0, -1.02 * scale, 0.08 * scale);
    this.leftLegPivot.add(leftShoe);

    const soleGeo = new THREE.BoxGeometry(0.26 * scale, 0.06 * scale, 0.48 * scale);
    const leftSole = new THREE.Mesh(soleGeo, soleMat);
    leftSole.position.set(0, -1.1 * scale, 0.08 * scale);
    this.leftLegPivot.add(leftSole);

    this.group.add(this.leftLegPivot);

    // Right Leg Pivot
    this.rightLegPivot = new THREE.Group();
    this.rightLegPivot.position.set(0.2 * scale, 1.05 * scale, 0);

    const rightThigh = new THREE.Mesh(legUpperGeo, pantsMat);
    rightThigh.position.y = -0.3 * scale;
    this.rightLegPivot.add(rightThigh);

    const rightCalf = new THREE.Mesh(legLowerGeo, pantsMat);
    rightCalf.position.y = -0.75 * scale;
    this.rightLegPivot.add(rightCalf);

    const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
    rightShoe.position.set(0, -1.02 * scale, 0.08 * scale);
    this.rightLegPivot.add(rightShoe);

    const rightSole = new THREE.Mesh(soleGeo, soleMat);
    rightSole.position.set(0, -1.1 * scale, 0.08 * scale);
    this.rightLegPivot.add(rightSole);

    this.group.add(this.rightLegPivot);

    // =========================================================================
    // 5. Ground Contact Shadow
    // =========================================================================
    const shadowGeo = new THREE.CircleGeometry(0.75 * scale, 16);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    this.shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowMesh.rotation.x = -Math.PI / 2;
    this.shadowMesh.position.y = 0.04;
    this.group.add(this.shadowMesh);

    // Grounded scale for high camera visibility
    this.group.scale.set(1.5, 1.5, 1.5);
  }

  /**
   * Set target heading for smooth rotational interpolation
   */
  public setHeading(angleRad: number) {
    this.targetHeading = angleRad;
  }

  /**
   * Update character animations:
   * - Smooth walking strides (alternate leg and counter arm swings)
   * - Idle breathing and chest micro-expansion
   * - Smooth angular orientation interpolation
   */
  public update(delta: number, isWalking: boolean, speed = 1.0) {
    // 1. Smoothly interpolate rotation heading
    let angleDiff = this.targetHeading - this.currentHeading;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    this.currentHeading += angleDiff * Math.min(1.0, delta * 12.0);
    this.group.rotation.y = this.currentHeading;

    // 2. Procedural Animation
    if (isWalking) {
      this.animPhase += delta * 9.5 * speed;

      const swing = Math.sin(this.animPhase);
      const cosSwing = Math.cos(this.animPhase);

      // Alternating leg swings
      this.leftLegPivot.rotation.x = swing * 0.65;
      this.rightLegPivot.rotation.x = -swing * 0.65;

      // Counter-balancing arm swings
      this.leftArmPivot.rotation.x = -swing * 0.55;
      this.rightArmPivot.rotation.x = swing * 0.55;

      // Subtle hip & torso twist
      this.torso.rotation.y = swing * 0.12;

      // Walking vertical bobbing (bounce)
      const bounce = Math.abs(cosSwing) * 0.08;
      this.torso.position.y = (1.35 + bounce);

      // Shadow pulsates with stride
      this.shadowMesh.scale.setScalar(1.0 - bounce * 0.5);
    } else {
      // Idle Breathing Animation
      this.animPhase += delta * 2.2;
      const breath = Math.sin(this.animPhase);

      // Smoothly relax limbs to neutral
      this.leftLegPivot.rotation.x *= 0.85;
      this.rightLegPivot.rotation.x *= 0.85;
      this.leftArmPivot.rotation.x = Math.sin(this.animPhase * 0.5) * 0.05;
      this.rightArmPivot.rotation.x = -Math.sin(this.animPhase * 0.5) * 0.05;
      this.torso.rotation.y *= 0.85;

      // Gentle chest rise & fall
      this.torso.position.y = 1.35 + breath * 0.02;
      this.shadowMesh.scale.setScalar(1.0);
    }
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
