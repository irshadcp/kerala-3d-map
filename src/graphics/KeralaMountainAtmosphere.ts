import * as THREE from 'three';

interface CloudPuff {
  mesh: THREE.Mesh;
  baseX: number;
  baseZ: number;
  altitude: number;
  speed: number;
  driftRange: number;
  rotSpeed: number;
  phase: number;
}

/**
 * KeralaMountainAtmosphere
 * Renders atmospheric drifting valley mist, mountain fog, and low-hanging clouds
 * characteristic of the Western Ghats (വയനാട്, മൂന്നാർ, ഇടുക്കി, നിലമ്പൂർ മലകൾ).
 */
export class KeralaMountainAtmosphere {
  private scene: THREE.Scene;
  private container = new THREE.Group();
  private clouds: CloudPuff[] = [];
  private cloudTexture: THREE.Texture;
  private cloudMaterial: THREE.MeshBasicMaterial;
  private lastUpdateX = -99999;
  private lastUpdateZ = -99999;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.container.name = 'kerala_mountain_atmosphere';
    this.scene.add(this.container);

    // Procedural soft Gaussian radial cloud puff texture
    this.cloudTexture = this.createCloudTexture();

    this.cloudMaterial = new THREE.MeshBasicMaterial({
      map: this.cloudTexture,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      color: 0xf0fdf4, // Soft morning mist tint
    });
  }

  private createCloudTexture(): THREE.Texture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(0.35, 'rgba(240, 253, 244, 0.7)');
    grad.addColorStop(0.7, 'rgba(224, 242, 254, 0.25)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }

  public update(
    playerX: number,
    playerZ: number,
    getElevation?: (localX: number, localZ: number) => number
  ) {
    const dist = Math.hypot(playerX - this.lastUpdateX, playerZ - this.lastUpdateZ);
    if (dist < 40 && this.clouds.length > 0) return;

    this.lastUpdateX = playerX;
    this.lastUpdateZ = playerZ;

    // Dispose old clouds
    this.clear();

    const cloudCount = 12; // Lightweight, high-impact atmospheric presence
    const spreadRadius = 260; // 260m coverage around player

    const cloudGeo = new THREE.PlaneGeometry(65, 45);
    cloudGeo.rotateX(-Math.PI / 2); // Flat horizontal mist plane

    for (let i = 0; i < cloudCount; i++) {
      const angle = (i / cloudCount) * Math.PI * 2 + (i % 3) * 0.4;
      const radius = 60 + ((i * 37) % (spreadRadius - 60));
      const cx = playerX + Math.cos(angle) * radius;
      const cz = playerZ + Math.sin(angle) * radius;

      const groundY = getElevation ? getElevation(cx, cz) : 0;
      // Position mist nestled 14m - 28m above hill valleys
      const altitude = groundY + 14 + (i % 4) * 4.5;

      const mesh = new THREE.Mesh(cloudGeo, this.cloudMaterial);
      mesh.position.set(cx, altitude, cz);
      const scale = 0.85 + ((i * 19) % 5) * 0.18;
      mesh.scale.set(scale, 1, scale * (0.8 + (i % 3) * 0.2));

      this.container.add(mesh);

      this.clouds.push({
        mesh,
        baseX: cx,
        baseZ: cz,
        altitude,
        speed: 1.2 + (i % 3) * 0.6,
        driftRange: 35 + (i % 4) * 10,
        rotSpeed: 0.02 * ((i % 2 === 0) ? 1 : -1),
        phase: i * 1.35,
      });
    }
  }

  public tick(now: number) {
    if (this.clouds.length === 0) return;
    const t = now * 0.001;

    for (let i = 0; i < this.clouds.length; i++) {
      const c = this.clouds[i];
      // Gentle horizontal wind drift
      const offsetX = Math.sin(t * 0.15 * c.speed + c.phase) * c.driftRange;
      const offsetZ = Math.cos(t * 0.11 * c.speed + c.phase * 0.8) * (c.driftRange * 0.6);
      const verticalSway = Math.sin(t * 0.25 + c.phase) * 1.5;

      c.mesh.position.x = c.baseX + offsetX;
      c.mesh.position.z = c.baseZ + offsetZ;
      c.mesh.position.y = c.altitude + verticalSway;
      c.mesh.rotation.y += c.rotSpeed * 0.01;
    }
  }

  public clear() {
    for (const c of this.clouds) {
      this.container.remove(c.mesh);
    }
    this.clouds = [];
  }

  public dispose() {
    this.clear();
    this.scene.remove(this.container);
    this.cloudTexture.dispose();
    this.cloudMaterial.dispose();
  }
}
