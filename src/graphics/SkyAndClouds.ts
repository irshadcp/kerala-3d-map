import * as THREE from 'three';
import { GAME_CONFIG } from '../config/gameConfig';

export class SkyAndClouds {
  public group: THREE.Group;
  private clouds: { group: THREE.Group; speed: number }[] = [];
  private airplane?: THREE.Group;
  private hotAirBalloon?: THREE.Group;
  private time = 0;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'sky-and-clouds';

    this.createCutePuffyClouds();
    this.createCartoonAirplane();
    this.createHotAirBalloon();
  }

  /**
   * Creates puffy cartoon cloud clusters with soft ground shadows.
   * Smooth curved edges with soft sky-blue/white gradient tone.
   */
  private createCutePuffyClouds() {
    const cloudMat = new THREE.MeshLambertMaterial({
      color: 0xf0f9ff, // Soft marshmallow sky-blue/white tone
      transparent: true,
      opacity: 0.92,
      flatShading: false, // Smooth curved edges, no sharp faceted polygons
    });


    const cloudCount = 14;
    for (let i = 0; i < cloudCount; i++) {
      const cloudGroup = new THREE.Group();
      const cloudCenter = new THREE.Group();

      // Multi-puff cluster forming a cute marshmallow/cotton cloud
      const puffCount = 5 + Math.floor(Math.random() * 4);
      let totalWidth = 0;

      for (let p = 0; p < puffCount; p++) {
        const radius = 9 + Math.random() * 8;
        // High segment count for smooth curved surfaces
        const puffGeo = new THREE.SphereGeometry(radius, 14, 12);
        puffGeo.scale(1.15, 0.72, 1.05);
        const puffMesh = new THREE.Mesh(puffGeo, cloudMat);

        const offsetX = (p - puffCount / 2) * 11 + (Math.random() - 0.5) * 6;
        const offsetY = (Math.random() - 0.5) * 3;
        const offsetZ = (Math.random() - 0.5) * 6;

        puffMesh.position.set(offsetX, offsetY, offsetZ);
        cloudCenter.add(puffMesh);
        totalWidth += 11;
      }

      cloudGroup.add(cloudCenter);

      // Position in sky
      const angle = (i / cloudCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const dist = 70 + Math.random() * 180;
      const altitude = 65 + (i % 4) * 15;

      const posX = Math.cos(angle) * dist;
      const posZ = Math.sin(angle) * dist;

      cloudCenter.position.set(posX, altitude, posZ);

      this.group.add(cloudCenter);

      this.clouds.push({
        group: cloudCenter,
        speed: 1.2 + Math.random() * 1.6,
      });
    }
  }

  /**
   * Cute commercial passenger airliner jet with yellow and white livery
   * matching user reference screenshot (IMG_3821 / media_1789680694506.png).
   * Features swept-back wings, twin jet engines, and yellow vertical tail fin.
   */
  private createCartoonAirplane() {
    const plane = new THREE.Group();
    plane.name = 'cartoon-commercial-jet';

    const yellowMat = new THREE.MeshLambertMaterial({ color: 0xfbbf24 }); // Sunny warm canary yellow
    const whiteMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });  // Clean airliner white
    const blueMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });     // Sky-blue cockpit & passenger windows
    const engineMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 }); // Jet turbine silver-grey

    const scale = 1.35;

    // 1. Fuselage (Smooth aerodynamic airliner body)
    const bodyGeo = new THREE.CylinderGeometry(1.5 * scale, 1.1 * scale, 14 * scale, 16);
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMesh = new THREE.Mesh(bodyGeo, whiteMat);
    plane.add(bodyMesh);

    // Yellow passenger stripe / underbelly
    const bellyGeo = new THREE.CylinderGeometry(1.52 * scale, 1.12 * scale, 9 * scale, 16, 1, false, 0, Math.PI);
    bellyGeo.rotateX(Math.PI / 2);
    bellyGeo.rotateZ(Math.PI);
    const bellyMesh = new THREE.Mesh(bellyGeo, yellowMat);
    bellyMesh.position.z = 0.5 * scale;
    plane.add(bellyMesh);

    // Smooth Nose Cone (Streamlined bullet nose)
    const noseGeo = new THREE.SphereGeometry(1.5 * scale, 16, 12);
    noseGeo.scale(1.0, 1.0, 1.8);
    noseGeo.translate(0, 0, 7.0 * scale);
    const nose = new THREE.Mesh(noseGeo, whiteMat);
    plane.add(nose);

    // Cockpit Windshield (Cute curved wrap-around blue visor)
    const cockpitGeo = new THREE.BoxGeometry(1.6 * scale, 0.75 * scale, 1.6 * scale);
    cockpitGeo.translate(0, 0.9 * scale, 6.2 * scale);
    const cockpit = new THREE.Mesh(cockpitGeo, blueMat);
    plane.add(cockpit);

    // Row of Passenger Windows along fuselage
    for (let w = -4; w <= 3; w++) {
      for (const side of [-1, 1]) {
        const pWinGeo = new THREE.BoxGeometry(0.08 * scale, 0.35 * scale, 0.5 * scale);
        const pWin = new THREE.Mesh(pWinGeo, blueMat);
        pWin.position.set(side * 1.51 * scale, 0.35 * scale, w * 1.1 * scale);
        plane.add(pWin);
      }
    }

    // 2. Swept-Back Airliner Wings
    const wingSpan = 22 * scale;
    const wingGeo = new THREE.BoxGeometry(wingSpan, 0.28 * scale, 3.2 * scale);
    // Swept back angle
    const wingMesh = new THREE.Mesh(wingGeo, whiteMat);
    wingMesh.position.set(0, -0.2 * scale, 0.5 * scale);
    wingMesh.rotation.x = -0.05; // Slight dihedral
    plane.add(wingMesh);

    // Yellow Wingtip Winglets
    for (const side of [-1, 1]) {
      const wingletGeo = new THREE.BoxGeometry(0.18 * scale, 1.2 * scale, 1.4 * scale);
      const winglet = new THREE.Mesh(wingletGeo, yellowMat);
      winglet.position.set(side * (wingSpan * 0.5 - 0.1), 0.5 * scale, 0.5 * scale);
      plane.add(winglet);
    }

    // 3. Twin Jet Engines under the wings
    for (const side of [-1, 1]) {
      const engineGeo = new THREE.CylinderGeometry(0.75 * scale, 0.7 * scale, 3.2 * scale, 12);
      engineGeo.rotateX(Math.PI / 2);
      const engineMesh = new THREE.Mesh(engineGeo, whiteMat);
      engineMesh.position.set(side * 4.6 * scale, -1.0 * scale, 0.8 * scale);
      plane.add(engineMesh);

      // Yellow engine cowl ring
      const cowlGeo = new THREE.CylinderGeometry(0.78 * scale, 0.78 * scale, 0.8 * scale, 12);
      cowlGeo.rotateX(Math.PI / 2);
      const cowlMesh = new THREE.Mesh(cowlGeo, yellowMat);
      cowlMesh.position.set(side * 4.6 * scale, -1.0 * scale, 2.1 * scale);
      plane.add(cowlMesh);

      // Jet exhaust intake & cone
      const intakeGeo = new THREE.CircleGeometry(0.68 * scale, 12);
      const intake = new THREE.Mesh(intakeGeo, engineMat);
      intake.position.set(side * 4.6 * scale, -1.0 * scale, 2.5 * scale);
      plane.add(intake);
    }

    // 4. Swept Vertical Tail Fin (Canary Yellow matching screenshot)
    const tailFinGeo = new THREE.BoxGeometry(0.24 * scale, 3.8 * scale, 3.4 * scale);
    tailFinGeo.translate(0, 2.2 * scale, -5.8 * scale);
    const tailFin = new THREE.Mesh(tailFinGeo, yellowMat);
    tailFin.rotation.x = -0.3; // Swept backwards
    plane.add(tailFin);

    // Horizontal Tail Stabilizers
    const hTailGeo = new THREE.BoxGeometry(7.5 * scale, 0.18 * scale, 2.2 * scale);
    hTailGeo.translate(0, 0.8 * scale, -6.2 * scale);
    const hTail = new THREE.Mesh(hTailGeo, whiteMat);
    plane.add(hTail);

    // Initial position high in the sky
    plane.position.set(-160, 95, -110);
    plane.rotation.y = Math.PI / 3.8;

    this.airplane = plane;
    this.group.add(plane);
  }

  /**
   * Colorful cartoon hot air balloon drifting gently in the sky.
   */
  private createHotAirBalloon() {
    const balloon = new THREE.Group();
    balloon.name = 'cartoon-hot-air-balloon';

    const redMat = new THREE.MeshLambertMaterial({ color: 0xef4444 });
    const whiteMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const basketMat = new THREE.MeshLambertMaterial({ color: 0xa16207 });

    // Balloon envelope (faceted tear-drop)
    const envelopeGeo = new THREE.SphereGeometry(6.5, 12, 10);
    envelopeGeo.scale(1.0, 1.35, 1.0);
    const envelope = new THREE.Mesh(envelopeGeo, redMat);
    balloon.add(envelope);

    // White equator stripe
    const stripeGeo = new THREE.CylinderGeometry(6.4, 6.4, 1.8, 12);
    const stripe = new THREE.Mesh(stripeGeo, whiteMat);
    stripe.position.y = 0;
    balloon.add(stripe);

    // Wicker basket
    const basketGeo = new THREE.BoxGeometry(2.4, 1.8, 2.4);
    basketGeo.translate(0, -11, 0);
    const basket = new THREE.Mesh(basketGeo, basketMat);
    balloon.add(basket);

    // Ropes connecting basket
    const ropeGeo = new THREE.CylinderGeometry(0.06, 0.06, 4.0, 4);
    const rope1 = new THREE.Mesh(ropeGeo, basketMat);
    rope1.position.set(-0.9, -8.5, -0.9);
    const rope2 = new THREE.Mesh(ropeGeo, basketMat);
    rope2.position.set(0.9, -8.5, -0.9);
    const rope3 = new THREE.Mesh(ropeGeo, basketMat);
    rope3.position.set(-0.9, -8.5, 0.9);
    const rope4 = new THREE.Mesh(ropeGeo, basketMat);
    rope4.position.set(0.9, -8.5, 0.9);
    balloon.add(rope1, rope2, rope3, rope4);

    balloon.position.set(110, 75, -80);
    this.hotAirBalloon = balloon;
    this.group.add(balloon);
  }

  /**
   * Sets up high-key bright cartoon daylighting with zero dark shadows.
   */
  public static createLighting(): {
    ambient: THREE.HemisphereLight;
    sun: THREE.DirectionalLight;
    fill: THREE.DirectionalLight;
  } {
    // Bright hemisphere light with pure white sky and fresh grass bounce
    const ambient = new THREE.HemisphereLight(0xffffff, GAME_CONFIG.palette.ground, 1.45);

    // High-key sunny directional light (warm sunny white)
    const sun = new THREE.DirectionalLight(GAME_CONFIG.palette.sunLight, 1.6);
    sun.position.set(55, 110, 45);

    // Soft sky-blue fill light to ensure all building facades stay bright and cheerful
    const fill = new THREE.DirectionalLight(0xbae6fd, 0.65);
    fill.position.set(-55, 80, -45);

    return { ambient, sun, fill };
  }

  /**
   * Animates clouds, airplane, and hot air balloon.
   */
  public update(delta: number) {
    this.time += delta;

    // Drifting clouds across sunny sky
    for (const c of this.clouds) {
      c.group.position.x += delta * c.speed;

      if (c.group.position.x > 300) {
        c.group.position.x = -300;
      }
    }

    // Flying yellow airplane
    if (this.airplane) {
      this.airplane.position.x += Math.cos(Math.PI / 4) * delta * 22;
      this.airplane.position.z += Math.sin(Math.PI / 4) * delta * 22;

      // Gentle flight wobble
      this.airplane.rotation.z = Math.sin(this.time * 2) * 0.05;

      if (this.airplane.position.x > 380) {
        this.airplane.position.x = -380;
        this.airplane.position.z = -280;
      }
    }

    // Floating hot air balloon gentle bobbing
    if (this.hotAirBalloon) {
      this.hotAirBalloon.position.y = 75 + Math.sin(this.time * 0.7) * 2.5;
      this.hotAirBalloon.rotation.y += delta * 0.08;
    }
  }
}
