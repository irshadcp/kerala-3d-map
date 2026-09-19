import * as THREE from 'three';

/**
 * Recursively disposes of Three.js objects, geometries, textures, and materials.
 * Skips shared static unit geometries tagged with `isSharedUnit`.
 *
 * IMPORTANT: This disposes ALL geometries and ALL materials by default.
 * Shared unit geometries (tagged isSharedUnit) are the only exception.
 */
export function disposeHierarchy(obj: THREE.Object3D) {
  if (!obj) return;

  obj.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;

      // Dispose geometry (skip shared unit geometries only)
      if (mesh.geometry && !(mesh.geometry as any).isSharedUnit) {
        mesh.geometry.dispose();
      }

      // Dispose ALL materials and their textures unconditionally
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of mats) {
        if (!mat) continue;
        // Skip static shared materials (tagged isSharedMaterial)
        if ((mat as any).isSharedMaterial) continue;

        // Dispose all texture maps the material might hold
        const matAny = mat as any;
        if (matAny.map) matAny.map.dispose();
        if (matAny.normalMap) matAny.normalMap.dispose();
        if (matAny.roughnessMap) matAny.roughnessMap.dispose();
        if (matAny.metalnessMap) matAny.metalnessMap.dispose();
        if (matAny.emissiveMap) matAny.emissiveMap.dispose();
        if (matAny.aoMap) matAny.aoMap.dispose();
        if (matAny.envMap) matAny.envMap.dispose();
        mat.dispose();
      }
    } else if ((child as THREE.Sprite).isSprite) {
      const sprite = child as THREE.Sprite;
      if (sprite.material) {
        if (sprite.material.map) sprite.material.map.dispose();
        sprite.material.dispose();
      }
    }
  });
}
