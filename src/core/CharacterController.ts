import { CharacterModel } from '../graphics/CharacterModel';
import { GeoCoords } from './geoCoords';
import { GAME_CONFIG } from '../config/gameConfig';

export interface PlayerState {
  lat: number;
  lng: number;
  x: number;
  z: number;
  speed: number;        // m/s
  speedKmh: number;     // km/h
  headingDeg: number;   // 0 = North, 90 = East
  isMoving: boolean;
  isSprinting: boolean;
}

import { TerrainEngine } from './TerrainEngine';

export class CharacterController {
  public model: CharacterModel;

  private originLat: number;
  private originLng: number;
  
  private terrainEngine?: TerrainEngine;

  // Real-world meter coordinates relative to origin
  public x = 0;
  public y = 0;
  public z = 0;

  // Physics
  public vx = 0;
  public vy = 0;
  public vz = 0;
  private gravity = 18.0;
  private jumpForce = 6.0;
  private isGrounded = true;

  // State
  private currentHeadingRad = 0;
  private targetHeadingRad = 0;
  private currentSpeed = 0;
  private isMoving = false;
  private isSprinting = false;

  constructor(originLat: number, originLng: number, terrainEngine?: TerrainEngine) {
    this.originLat = originLat;
    this.originLng = originLng;
    this.terrainEngine = terrainEngine;
    this.model = new CharacterModel();
    this.model.group.position.set(0, 0, 0);
  }

  public setTerrainEngine(terrainEngine: TerrainEngine) {
    this.terrainEngine = terrainEngine;
  }

  /**
   * Resets or teleports player to a specific geographic location.
   */
  public teleportTo(lat: number, lng: number, originLat = lat, originLng = lng) {
    this.originLat = originLat;
    this.originLng = originLng;

    const local = GeoCoords.toLocalMeters(lat, lng, this.originLat, this.originLng);
    this.x = local.x;
    this.z = local.z;
    this.y = this.terrainEngine ? this.terrainEngine.getElevation(this.x, this.z) : 0;
    
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.isGrounded = true;
    this.currentSpeed = 0;
    this.isMoving = false;

    this.model.group.position.set(this.x, this.y, this.z);
    this.model.updateAnimation(0.016, 0, false, 0, true);
  }

  /**
   * Smoothly updates character position when the user pans/moves the map.
   */
  public setPositionFromMap(targetX: number, targetZ: number, delta: number) {
    const dx = targetX - this.x;
    const dz = targetZ - this.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const dt = Math.max(delta, 0.016);

    if (dist > 0.01) {
      // Calculate target heading towards movement direction
      this.targetHeadingRad = Math.atan2(dx, dz);
      let diff = this.targetHeadingRad - this.currentHeadingRad;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.currentHeadingRad += diff * Math.min(18.0 * dt, 1.0);

      this.x = targetX;
      this.z = targetZ;
      this.currentSpeed = Math.min(dist / dt, 15.0);
      this.isMoving = true;

      this.model.group.position.set(this.x, this.y, this.z);
      this.model.setHeading(this.currentHeadingRad);
      this.model.updateAnimation(dt, this.currentSpeed, true, 0, true);
    } else {
      this.x = targetX;
      this.z = targetZ;
      this.currentSpeed = 0;
      this.isMoving = false;
      this.model.group.position.set(this.x, this.y, this.z);
      this.model.updateAnimation(dt, 0, false, 0, true);
    }
  }

  /**
   * Updates physics, movement, and character animation for a frame.
   */
  public update(
    delta: number,
    moveDir: { x: number; z: number; isMoving: boolean; isSprinting: boolean; isJumping?: boolean }
  ) {
    // Clamp delta to avoid huge physics jumps on frame lag
    const dt = Math.min(delta, 0.1);

    this.isMoving = moveDir.isMoving;
    this.isSprinting = moveDir.isSprinting;

    // Jump mechanics
    if (moveDir.isJumping && this.isGrounded) {
      this.vy = this.jumpForce;
      this.isGrounded = false;
    }

    const groundY = this.terrainEngine ? this.terrainEngine.getElevation(this.x, this.z) : 0;

    if (!this.isGrounded) {
      this.vy -= this.gravity * dt;
      this.y += this.vy * dt;
      if (this.y <= groundY) {
        this.y = groundY;
        this.vy = 0;
        this.isGrounded = true;
      }
    } else {
      // Snap to ground if walking
      this.y = groundY;
    }

    const maxSpeed = this.isSprinting ? GAME_CONFIG.runSpeed : GAME_CONFIG.walkSpeed;
    const accel = GAME_CONFIG.acceleration;
    const damping = GAME_CONFIG.damping;

    if (moveDir.isMoving) {
      // Accelerate towards desired direction
      const targetVx = moveDir.x * maxSpeed;
      const targetVz = moveDir.z * maxSpeed;

      this.vx += (targetVx - this.vx) * Math.min(accel * dt, 1.0);
      this.vz += (targetVz - this.vz) * Math.min(accel * dt, 1.0);

      // Target heading based on movement vector (Three.js: +X is East, -Z is North)
      // When moving North (dirX=0, dirZ=-1): target is 0 (or Math.PI)
      this.targetHeadingRad = Math.atan2(moveDir.x, moveDir.z);
    } else {
      // Crisp, responsive deceleration with no ice-skating slide
      this.vx -= this.vx * Math.min(damping * dt, 1.0);
      this.vz -= this.vz * Math.min(damping * dt, 1.0);

      if (Math.hypot(this.vx, this.vz) < 0.25) {
        this.vx = 0;
        this.vz = 0;
      }
    }

    // Update position
    this.x += this.vx * dt;
    this.z += this.vz * dt;

    // Current speed
    this.currentSpeed = Math.sqrt(this.vx * this.vx + this.vz * this.vz);

    // Smooth heading rotation
    if (moveDir.isMoving) {
      let diff = this.targetHeadingRad - this.currentHeadingRad;
      // Wrap diff to [-PI, PI] for shortest turn
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.currentHeadingRad += diff * Math.min(GAME_CONFIG.turnSpeed * dt, 1.0);
    }

    // Apply to 3D model
    this.model.group.position.set(this.x, this.y, this.z);
    this.model.setHeading(this.currentHeadingRad);
    this.model.updateAnimation(dt, this.currentSpeed, this.isMoving, this.y, this.isGrounded);
  }

  /**
   * Returns complete current player state including lat/lng coordinates.
   */
  public getState(): PlayerState {
    const coords = GeoCoords.toLatLng(this.x, this.z, this.originLat, this.originLng);

    // Calculate heading in degrees (0 = North, 90 = East)
    let headingDeg = (-this.currentHeadingRad * 180) / Math.PI + 180;
    headingDeg = (headingDeg + 360) % 360;

    return {
      lat: coords.lat,
      lng: coords.lng,
      x: this.x,
      z: this.z,
      speed: this.currentSpeed,
      speedKmh: this.currentSpeed * 3.6,
      headingDeg,
      isMoving: this.isMoving,
      isSprinting: this.isSprinting,
    };
  }

  public getPosition(): { x: number; y: number; z: number } {
    return { x: this.x, y: this.y, z: this.z };
  }

  public getOrigin(): { lat: number; lng: number } {
    return { lat: this.originLat, lng: this.originLng };
  }
}
