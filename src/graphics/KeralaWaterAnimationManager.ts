import * as THREE from 'three';
import { SpatialObstacleMap, WaterObstacle } from './SpatialObstacleMap';

interface ActiveWaterMesh {
  group: THREE.Group;
  geometries: THREE.BufferGeometry[];
}

/**
 * KeralaWaterAnimationManager
 * Renders real-time animated tropical rivers, canals, backwaters, and lagoons.
 * Features:
 * - Multi-frequency harmonic wave ripples
 * - Dynamic sunlight specular glints (sun sparkle)
 * - Deep azure to turquoise depth gradients
 * - Procedural moving caustics
 */
export class KeralaWaterAnimationManager {
  private scene: THREE.Scene;
  private container = new THREE.Group();
  private waterMaterial: THREE.ShaderMaterial;
  private activeMeshes = new Map<string, ActiveWaterMesh>();
  private lastUpdateX = -99999;
  private lastUpdateZ = -99999;
  private waterRadius = 240; // 240 meters around character

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.container.name = 'kerala_animated_water';
    this.scene.add(this.container);

    // Dynamic Tropical River Water Shader
    this.waterMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSunDirection: { value: new THREE.Vector3(0.4, 0.85, 0.35).normalize() },
        uDeepColor: { value: new THREE.Color(0x0284c7) }, // Deep azure blue
        uShallowColor: { value: new THREE.Color(0x38bdf8) }, // Tropical turquoise
        uSunColor: { value: new THREE.Color(0xfffbeb) }, // Warm golden tropical sun
      },
      vertexShader: `
        uniform float uTime;
        varying vec3 vWorldPosition;
        varying vec3 vNormal;

        void main() {
          vec3 pos = position;
          // Harmonic undulating river waves
          float w1 = sin(pos.x * 0.22 + uTime * 1.9) * 0.07;
          float w2 = cos(pos.z * 0.28 + uTime * 1.5) * 0.05;
          float w3 = sin((pos.x * 0.7 + pos.z * 0.7) * 0.18 + uTime * 2.3) * 0.035;
          pos.y += w1 + w2 + w3;

          // Wave normals for lighting
          float dx = 0.07 * 0.22 * cos(pos.x * 0.22 + uTime * 1.9) + 0.035 * 0.18 * 0.7 * cos((pos.x * 0.7 + pos.z * 0.7) * 0.18 + uTime * 2.3);
          float dz = -0.05 * 0.28 * sin(pos.z * 0.28 + uTime * 1.5) + 0.035 * 0.18 * 0.7 * cos((pos.x * 0.7 + pos.z * 0.7) * 0.18 + uTime * 2.3);
          vNormal = normalize(vec3(-dx, 1.0, -dz));

          vec4 worldPos = modelMatrix * vec4(pos, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uSunDirection;
        uniform vec3 uDeepColor;
        uniform vec3 uShallowColor;
        uniform vec3 uSunColor;
        varying vec3 vWorldPosition;
        varying vec3 vNormal;

        void main() {
          vec3 viewDir = normalize(cameraPosition - vWorldPosition);
          vec3 sunDir = normalize(uSunDirection);

          // Fresnel reflectance (glancing angle gives sky reflection)
          float fresnel = clamp(1.0 - dot(viewDir, vNormal), 0.0, 1.0);
          fresnel = pow(fresnel, 2.2);

          // Procedural river caustics
          float c1 = sin(vWorldPosition.x * 0.6 + uTime * 1.3) * cos(vWorldPosition.z * 0.6 + uTime * 1.6);
          float c2 = sin(vWorldPosition.x * 1.2 - uTime * 0.9) * sin(vWorldPosition.z * 1.1 + uTime * 1.2);
          float caustics = clamp((c1 + c2) * 0.5 + 0.5, 0.0, 1.0);
          caustics = pow(caustics, 3.8) * 0.45;

          // Sun specular glint sparkle
          vec3 halfVec = normalize(sunDir + viewDir);
          float spec = max(dot(vNormal, halfVec), 0.0);
          float sunGlint = pow(spec, 40.0) * 1.35;

          // Vibrant tropical water color gradient
          vec3 waterCol = mix(uDeepColor, uShallowColor, fresnel * 0.75 + caustics * 0.4);
          waterCol += uSunColor * (sunGlint + caustics * 0.6);

          gl_FragColor = vec4(waterCol, 0.88);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }

  public update(
    obstacleMap: SpatialObstacleMap,
    playerX: number,
    playerZ: number,
    force = false,
    getElevation?: (localX: number, localZ: number) => number
  ) {
    if (!obstacleMap || !obstacleMap.isReady) return;

    const distMoved = Math.hypot(playerX - this.lastUpdateX, playerZ - this.lastUpdateZ);
    if (!force && distMoved < 15) return;

    this.lastUpdateX = playerX;
    this.lastUpdateZ = playerZ;

    const activeKeys = new Set<string>();

    for (const w of obstacleMap.waterObstacles) {
      const cx = (w.minX + w.maxX) * 0.5;
      const cz = (w.minZ + w.maxZ) * 0.5;
      const dist = Math.hypot(cx - playerX, cz - playerZ);

      if (dist <= this.waterRadius) {
        const key = `${w.minX.toFixed(1)},${w.minZ.toFixed(1)}`;
        activeKeys.add(key);

        if (!this.activeMeshes.has(key)) {
          const item = this.createWaterMesh(w, getElevation);
          if (item) {
            this.container.add(item.group);
            this.activeMeshes.set(key, item);
          }
        } else if (getElevation) {
          const item = this.activeMeshes.get(key);
          if (item) {
            item.group.position.y = getElevation(cx, cz) + 0.15;
          }
        }
      }
    }

    // Cull distant water bodies outside player range
    for (const [key, item] of this.activeMeshes.entries()) {
      if (!activeKeys.has(key)) {
        this.container.remove(item.group);
        for (const geo of item.geometries) {
          geo.dispose();
        }
        this.activeMeshes.delete(key);
      }
    }
  }

  private createWaterMesh(
    w: WaterObstacle,
    getElevation?: (localX: number, localZ: number) => number
  ): ActiveWaterMesh | null {
    const ring = w.rings?.[0];
    if (!ring || ring.length < 3) return null;

    const geometries: THREE.BufferGeometry[] = [];
    const group = new THREE.Group();

    try {
      const cx = (w.minX + w.maxX) * 0.5;
      const cz = (w.minZ + w.maxZ) * 0.5;

      const shape = new THREE.Shape();
      shape.moveTo(ring[0].x - cx, -(ring[0].z - cz));
      for (let i = 1; i < ring.length; i++) {
        shape.lineTo(ring[i].x - cx, -(ring[i].z - cz));
      }
      shape.closePath();

      // Tessellated shape geometry for wave vertices
      const waterGeo = new THREE.ShapeGeometry(shape);
      waterGeo.rotateX(Math.PI / 2);
      geometries.push(waterGeo);

      const waterMesh = new THREE.Mesh(waterGeo, this.waterMaterial);
      group.add(waterMesh);

      const groundY = getElevation ? getElevation(cx, cz) : 0;
      group.position.set(cx, groundY + 0.15, cz);

      return { group, geometries };
    } catch {
      for (const geo of geometries) {
        geo.dispose();
      }
      return null;
    }
  }

  public tick(now: number) {
    if (this.waterMaterial) {
      this.waterMaterial.uniforms.uTime.value = now * 0.001;
    }
  }

  public clear() {
    for (const item of this.activeMeshes.values()) {
      this.container.remove(item.group);
      for (const geo of item.geometries) {
        geo.dispose();
      }
    }
    this.activeMeshes.clear();
    this.lastUpdateX = -99999;
    this.lastUpdateZ = -99999;
  }

  public dispose() {
    this.clear();
    this.scene.remove(this.container);
    this.waterMaterial.dispose();
  }
}
