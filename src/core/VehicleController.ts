import * as THREE from 'three';
import { StreetElementGenerator } from '../graphics/StreetElementGenerator';
import { ModelLoader } from '../graphics/ModelLoader';
import { TerrainEngine } from './TerrainEngine';

export interface VehicleState {
  x: number;
  z: number;
  speedKmh: number;
  headingRad: number;
  isOccupied: boolean;
  isParked: boolean;
}

export class VehicleController {
  public mesh: THREE.Group;

  public x = 0;
  public y = 0;
  public z = 0;
  public headingRad = 0;
  private speed = 0; // m/s
  private maxSpeed = 34.0; // ~122 km/h (high-speed exploration across Kerala map)
  private reverseMaxSpeed = 9.0; // ~32 km/h
  private accelRate = 22.0; // rapid acceleration
  private brakeRate = 35.0; // high-performance braking
  private turnSpeed = 2.8; // rad/s at full steer

  public isOccupied = false;
  public isParked = true; // Auto rickshaws start parked until entered

  private terrainEngine?: TerrainEngine;

  constructor(_originLat: number, _originLng: number, terrainEngine?: TerrainEngine) {
    this.terrainEngine = terrainEngine;
    this.mesh = new THREE.Group();
    this.mesh.name = 'player-vehicle-autorickshaw';

    // Immediate procedural fallback so mesh is never empty/undefined
    const generator = new StreetElementGenerator();
    const fallbackMesh = generator.createAutoRickshawMesh(42);
    this.mesh.add(fallbackMesh);

    // Asynchronously load the authentic 3D GLB model (auto_rickshaw.glb)
    this.loadCustomGlbModel();
  }

  private async loadCustomGlbModel() {
    try {
      const glbModel = await ModelLoader.getInstance().loadAutoRickshaw();
      // Remove placeholder mesh
      while (this.mesh.children.length > 0) {
        this.mesh.remove(this.mesh.children[0]);
      }
      this.mesh.add(glbModel);
      console.log('🛺 [VehicleController] Successfully loaded custom auto_rickshaw.glb model!');
    } catch (err) {
      console.warn('[VehicleController] Using procedural auto rickshaw fallback:', err);
    }
  }

  public setTerrainEngine(terrainEngine: TerrainEngine) {
    this.terrainEngine = terrainEngine;
  }

  public teleportTo(x: number, z: number, headingRad = 0) {
    this.x = x;
    this.z = z;
    this.y = this.terrainEngine ? this.terrainEngine.getElevation(this.x, this.z) : 0;
    this.headingRad = headingRad;
    this.speed = 0;
    this.isParked = false;
    this.mesh.position.set(this.x, this.y, this.z);
    this.mesh.rotation.y = -this.headingRad;
  }

  public enter() {
    this.isOccupied = true;
    this.isParked = false;
  }

  public exit(): { x: number; z: number } {
    this.isOccupied = false;
    this.speed = 0;
    // Exit safely 1.8m to the left or right of the vehicle
    const sideX = -Math.cos(this.headingRad) * 1.8;
    const sideZ = Math.sin(this.headingRad) * 1.8;
    return {
      x: this.x + sideX,
      z: this.z + sideZ,
    };
  }

  /**
   * Updates vehicle motion and arcade physics with complete freedom of movement.
   * Allows driving anywhere (roads, shoulders, verges, open plots, parking areas)
   * while checking against physical solid obstacles (building walls and water bodies).
   */
  public update(
    delta: number,
    input: { throttle: number; steer: number; handbrake?: boolean },
    collisionCheck?: {
      isPointInObstacle?: (x: number, z: number) => boolean;
    }
  ) {
    const dt = Math.min(delta, 0.08);

    if (this.isOccupied && !this.isParked) {
      // 1. Throttle / Acceleration
      if (input.throttle > 0) {
        this.speed += this.accelRate * input.throttle * dt;
        if (this.speed > this.maxSpeed) this.speed = this.maxSpeed;
      } else if (input.throttle < 0) {
        if (this.speed > 0.2) {
          // Braking while moving forward
          this.speed -= this.brakeRate * dt;
          if (this.speed < 0) this.speed = 0;
        } else {
          // Reverse
          this.speed -= (this.accelRate * 0.6) * dt;
          if (this.speed < -this.reverseMaxSpeed) this.speed = -this.reverseMaxSpeed;
        }
      } else {
        // Natural rolling friction
        if (this.speed > 0) {
          this.speed -= 7.0 * dt;
          if (this.speed < 0) this.speed = 0;
        } else if (this.speed < 0) {
          this.speed += 7.0 * dt;
          if (this.speed > 0) this.speed = 0;
        }
      }

      // Handbrake / Drift
      if (input.handbrake) {
        this.speed *= Math.max(0, 1.0 - 5.0 * dt);
      }

      // 2. Steering (effective when vehicle has speed)
      if (Math.abs(this.speed) > 0.05 && input.steer !== 0) {
        const steerDir = this.speed >= 0 ? input.steer : -input.steer;
        const driftMultiplier = input.handbrake ? 1.4 : 1.0;
        this.headingRad += steerDir * this.turnSpeed * driftMultiplier * dt;
      }

      // 3. Move forward along heading vector
      // In Three.js: +X is East, -Z is North
      const moveVx = Math.sin(this.headingRad) * this.speed;
      const moveVz = -Math.cos(this.headingRad) * this.speed;

      const candidateX = this.x + moveVx * dt;
      const candidateZ = this.z + moveVz * dt;

      // 4. Freedom of Movement with Solid Physical Obstacle Avoidance:
      // The vehicle can drive anywhere freely (roads, road shoulders, free spaces, parking lots).
      // It is only stopped by solid building walls or deep water bodies!
      let isBlocked = false;
      if (collisionCheck && collisionCheck.isPointInObstacle) {
        if (collisionCheck.isPointInObstacle(candidateX, candidateZ)) {
          isBlocked = true;
        }
      }

      if (!isBlocked) {
        this.x = candidateX;
        this.z = candidateZ;
      } else {
        // Soft obstacle bounce & velocity dampening
        this.speed = -this.speed * 0.25;
      }
    }

    // Apply to 3D mesh
    this.y = this.terrainEngine ? this.terrainEngine.getElevation(this.x, this.z) : 0;
    this.mesh.position.set(this.x, this.y, this.z);
    this.mesh.rotation.y = -this.headingRad;
  }

  public getVelocity(): { vx: number; vz: number; speed: number } {
    return {
      vx: Math.sin(this.headingRad) * this.speed,
      vz: -Math.cos(this.headingRad) * this.speed,
      speed: Math.abs(this.speed),
    };
  }

  public getState(): VehicleState {
    return {
      x: this.x,
      z: this.z,
      speedKmh: Math.abs(this.speed * 3.6),
      headingRad: this.headingRad,
      isOccupied: this.isOccupied,
      isParked: this.isParked,
    };
  }

  public getPosition(): { x: number; y: number; z: number } {
    return { x: this.x, y: this.y, z: this.z };
  }
}
