import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * ModelLoader: Asynchronous manager for loading and caching 3D GLTF/GLB models.
 * Automatically handles scaling, coordinate conversion, shadows, and caching.
 */
export class ModelLoader {
  private static instance: ModelLoader;
  private loader: GLTFLoader;
  private cache: Map<string, THREE.Group> = new Map();
  private loadingPromises: Map<string, Promise<THREE.Group>> = new Map();
  private customAutoTemplate: THREE.Group | null = null;

  private constructor() {
    this.loader = new GLTFLoader();
  }

  public static getInstance(): ModelLoader {
    if (!ModelLoader.instance) {
      ModelLoader.instance = new ModelLoader();
    }
    return ModelLoader.instance;
  }

  /**
   * Loads or returns a cached GLTF model clone.
   */
  public async loadModel(url: string): Promise<THREE.Group> {
    if (this.cache.has(url)) {
      return this.cache.get(url)!.clone(true);
    }

    if (this.loadingPromises.has(url)) {
      const group = await this.loadingPromises.get(url)!;
      return group.clone(true);
    }

    const promise = new Promise<THREE.Group>((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => {
          const scene = gltf.scene;
          scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          this.cache.set(url, scene);
          resolve(scene.clone(true));
        },
        undefined,
        (error) => {
          console.warn(`[ModelLoader] Failed to load ${url}:`, error);
          reject(error);
        }
      );
    });

    this.loadingPromises.set(url, promise);
    return promise;
  }

  /**
   * Loads the iconic Auto Rickshaw GLB model with proper real-world scaling,
   * orientation (front facing -Z / North), and ground shadow decal.
   */
  public async loadAutoRickshaw(): Promise<THREE.Group> {
    if (this.customAutoTemplate) {
      return this.customAutoTemplate.clone(true);
    }

    // Try primary path in models folder, then root fallback
    const urls = ['/models/auto_rickshaw.glb', '/auto_rickshaw.glb'];
    let rawModel: THREE.Group | null = null;

    for (const url of urls) {
      try {
        rawModel = await this.loadModel(url);
        if (rawModel) break;
      } catch (_e) {
        // Continue to fallback
      }
    }

    if (!rawModel) {
      throw new Error('Unable to load auto_rickshaw.glb from standard paths.');
    }

    const container = new THREE.Group();
    container.name = '3d-auto-rickshaw-glb-container';

    // The GLTF model is already in real-world meters from its internal node transforms:
    // Raw bounds: width 1.50m (X), height 1.74m (Y), length 2.72m (Z).
    // Use scale 1.05 for real-world proportions matching the 1.85m tall character!
    rawModel.scale.set(1.05, 1.05, 1.05);

    // In raw model: Front is +Z, Rear is -Z
    // In our coordinate system: Front is -Z (North)
    // Rotate 180 degrees (Math.PI) around Y so front faces -Z
    rawModel.rotation.y = Math.PI;

    // Center offset along Z:
    // Wheelbase axle midpoint is around Z = +0.245m; after rotation by PI, offset by +0.25m
    rawModel.position.set(0, 0, 0.25);

    container.add(rawModel);

    // Add soft, realistic feathered ground shadow decal under the vehicle (no sharp rectangle!)
    const shadowGeo = new THREE.PlaneGeometry(2.5, 3.8);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: ModelLoader.createSoftAutoShadowTexture(),
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, 0.02, 0.25);
    container.add(shadow);

    this.customAutoTemplate = container;
    return container.clone(true);
  }

  /**
   * Generates a high-resolution, feathered radial pill gradient texture
   * so the ground shadow under the auto is soft, blurred, and completely free of sharp rectangle edges.
   */
  private static createSoftAutoShadowTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, 512, 512);

    ctx.save();
    ctx.translate(256, 256);
    ctx.scale(1.0, 1.55); // Elliptical pill proportion matching vehicle geometry

    const radius = 150;
    const grad = ctx.createRadialGradient(0, 0, 20, 0, 0, radius);
    grad.addColorStop(0.0, 'rgba(0, 0, 0, 0.65)');  // Dark contact core right under engine/chassis
    grad.addColorStop(0.35, 'rgba(0, 0, 0, 0.42)'); // Mid-body contact shadow
    grad.addColorStop(0.65, 'rgba(0, 0, 0, 0.16)'); // Soft feathered falloff
    grad.addColorStop(0.85, 'rgba(0, 0, 0, 0.04)'); // Gentle diffusion
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');   // 100% transparent feathered boundary

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = true;
    return texture;
  }

  public getCachedAutoRickshaw(): THREE.Group | null {
    if (this.customAutoTemplate) {
      return this.customAutoTemplate.clone(true);
    }
    return null;
  }
}
