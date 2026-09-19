export interface MovementInput {
  forward: number; // -1 to 1
  strafe: number;  // -1 to 1
  rotateCam: number; // -1 to 1
  isMoving: boolean;
  isSprinting: boolean;
  isJumping: boolean;
}

export class InputManager {
  private keys: Set<string> = new Set();
  private isDestroyed = false;

  constructor() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
  }

  public onTogglePerspective?: () => void;

  private handleKeyDown = (e: KeyboardEvent) => {
    // Prevent scrolling with arrow keys when playing
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    if (e.code === 'KeyV' && !e.repeat) {
      if (this.onTogglePerspective) {
        this.onTogglePerspective();
      }
    }
    this.keys.add(e.code);
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private handleBlur = () => {
    this.keys.clear();
  };

  private virtualForward = 0;
  private virtualStrafe = 0;
  private virtualSprint = false;
  private virtualJump = false;

  public setVirtualInput(forward: number, strafe: number, isSprinting = false, isJumping = false) {
    this.virtualForward = forward;
    this.virtualStrafe = strafe;
    this.virtualSprint = isSprinting;
    this.virtualJump = isJumping;
  }

  public getRawInput(): MovementInput {
    let forward = this.virtualForward;
    let strafe = this.virtualStrafe;
    let rotateCam = 0;

    // Forward / Backward
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) forward += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) forward -= 1;

    // Left / Right Strafe
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) strafe += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) strafe -= 1;

    // Camera rotation keys (Q = Rotate Left, C = Rotate Right)
    if (this.keys.has('KeyC')) rotateCam += 1;
    if (this.keys.has('KeyQ')) rotateCam -= 1;

    const isSprinting = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.virtualSprint;
    const isJumping = this.keys.has('Space') || this.virtualJump;
    const isMoving = Math.abs(forward) > 0.05 || Math.abs(strafe) > 0.05;

    return {
      forward,
      strafe,
      rotateCam,
      isMoving,
      isSprinting,
      isJumping,
    };
  }

  /**
   * Calculates world movement direction vector (x, z) relative to camera bearing.
   * @param cameraBearingDeg Camera rotation bearing in degrees (0 = North, 90 = East)
   */
  public getCameraRelativeDirection(cameraBearingDeg: number): {
    x: number;
    z: number;
    isMoving: boolean;
    isSprinting: boolean;
    isJumping: boolean;
  } {
    const raw = this.getRawInput();
    if (!raw.isMoving) {
      return { x: 0, z: 0, isMoving: false, isSprinting: false, isJumping: raw.isJumping };
    }

    // Camera bearing to radians
    const bearingRad = (cameraBearingDeg * Math.PI) / 180;

    // Camera forward vector in (X, Z) where -Z is North, +X is East
    // When bearing is 0 (facing North): forward is (0, -1), right is (1, 0)
    const forwardX = Math.sin(bearingRad);
    const forwardZ = -Math.cos(bearingRad);

    const rightX = Math.cos(bearingRad);
    const rightZ = Math.sin(bearingRad);

    // Combine raw forward and strafe
    let dirX = forwardX * raw.forward + rightX * raw.strafe;
    let dirZ = forwardZ * raw.forward + rightZ * raw.strafe;

    // Normalize
    const length = Math.sqrt(dirX * dirX + dirZ * dirZ);
    if (length > 0.0001) {
      dirX /= length;
      dirZ /= length;
    }

    return {
      x: dirX,
      z: dirZ,
      isMoving: true,
      isSprinting: raw.isSprinting,
      isJumping: raw.isJumping,
    };
  }

  public destroy() {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    this.keys.clear();
  }
}
