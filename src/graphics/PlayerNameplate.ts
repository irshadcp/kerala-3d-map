import * as THREE from 'three';

export interface NameplateOptions {
  name: string;
  district: string;
  isMuted?: boolean;
  isSpeaking?: boolean;
}

/**
 * PlayerNameplate
 * High-definition 3D overhead billboard badge for multiplayer characters.
 * Renders Player Name + District + Voice Indicator floating above head.
 * Auto-faces camera with depthTest: false for 100% legibility at all times.
 */
export class PlayerNameplate {
  public sprite: THREE.Sprite;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture;
  private material: THREE.SpriteMaterial;
  private currentName: string;
  private currentDistrict: string;
  private isMuted: boolean;
  private isSpeaking: boolean;

  constructor(options: NameplateOptions) {
    this.currentName = options.name || 'Player';
    this.currentDistrict = options.district || 'Kerala';
    this.isMuted = options.isMuted ?? false;
    this.isSpeaking = options.isSpeaking ?? false;

    this.canvas = document.createElement('canvas');
    this.canvas.width = 512;
    this.canvas.height = 200;
    this.ctx = this.canvas.getContext('2d')!;

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.generateMipmaps = false;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;

    this.material = new THREE.SpriteMaterial({
      map: this.texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    this.sprite = new THREE.Sprite(this.material);
    this.sprite.scale.set(1.75, 0.68, 1);
    this.sprite.position.set(0, 2.45, 0);
    this.sprite.renderOrder = 9999;

    this.draw();
  }

  public update(options: Partial<NameplateOptions>) {
    let changed = false;
    if (options.name !== undefined && options.name !== this.currentName) {
      this.currentName = options.name;
      changed = true;
    }
    if (options.district !== undefined && options.district !== this.currentDistrict) {
      this.currentDistrict = options.district;
      changed = true;
    }
    if (options.isMuted !== undefined && options.isMuted !== this.isMuted) {
      this.isMuted = options.isMuted;
      changed = true;
    }
    if (options.isSpeaking !== undefined && options.isSpeaking !== this.isSpeaking) {
      this.isSpeaking = options.isSpeaking;
      changed = true;
    }

    if (changed) {
      this.draw();
      this.texture.needsUpdate = true;
    }
  }

  private draw() {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const pad = 16;
    const cardX = pad;
    const cardY = pad;
    const cardW = w - pad * 2;
    const cardH = h - pad * 2;
    const r = 24;

    // Drop shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 6;

    // Background pill/card with dark glass styling
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, r);
    ctx.fillStyle = this.isSpeaking ? 'rgba(15, 23, 42, 0.96)' : 'rgba(15, 23, 42, 0.88)';
    ctx.fill();
    ctx.restore();

    // Border (glows emerald green when speaking, cyan otherwise)
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, r);
    ctx.lineWidth = this.isSpeaking ? 5 : 3;
    ctx.strokeStyle = this.isSpeaking ? '#10b981' : 'rgba(255, 255, 255, 0.35)';
    ctx.stroke();

    // Player Name
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 42px "Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Truncate name if too long
    let displayName = this.currentName;
    if (displayName.length > 15) {
      displayName = displayName.substring(0, 13) + '…';
    }
    ctx.fillText(displayName, w / 2, cardY + 50);

    // District Badge Pill
    const badgeY = cardY + 98;
    const badgeH = 44;
    const badgeText = `📍 ${this.currentDistrict}`;
    ctx.font = '700 24px "Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
    const textWidth = ctx.measureText(badgeText).width;
    const badgeW = Math.max(160, textWidth + 36);
    const badgeX = (w - badgeW) / 2;

    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 22);
    ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#10b981';
    ctx.stroke();

    ctx.fillStyle = '#34d399';
    ctx.fillText(badgeText, w / 2, badgeY + badgeH / 2);

    // Microphone Status Pill (Top Right)
    const micX = cardX + cardW - 32;
    const micY = cardY + 30;

    ctx.beginPath();
    ctx.arc(micX, micY, 14, 0, Math.PI * 2);
    ctx.fillStyle = this.isMuted ? 'rgba(239, 68, 68, 0.85)' : 'rgba(16, 185, 129, 0.85)';
    ctx.fill();

    ctx.font = '700 13px system-ui';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.isMuted ? '✕' : '●', micX, micY);
  }

  public dispose() {
    this.material.dispose();
    this.texture.dispose();
  }
}
