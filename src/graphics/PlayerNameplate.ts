import * as THREE from 'three';

export interface NameplateOptions {
  name: string;
  district: string;
  isMuted?: boolean;
  isSpeaking?: boolean;
  isLocal?: boolean;
}

/**
 * PlayerNameplate
 * Compact, ultra-clean PUBG-style 3D floating billboard badge.
 * Displays:
 * 1. Player Name in high-contrast crisp bold typography
 * 2. District badge pill (e.g. 📍 മലപ്പുറം)
 * 3. Speaker icon status (🔊 / 🔇)
 * 4. Animated pulsing / blinking microphone soundwave bars when speaking (🎙️ ▂▃▅)
 * 5. Height-adaptive for vehicle driving vs on-foot walking
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
  private isLocal: boolean;
  private pulsePhase = 0;
  private lastTick = 0;
  private isDriving = false;

  constructor(options: NameplateOptions) {
    this.currentName = options.name || 'Player';
    this.currentDistrict = options.district || 'Kerala';
    this.isMuted = options.isMuted ?? false;
    this.isSpeaking = options.isSpeaking ?? false;
    this.isLocal = options.isLocal ?? false;

    this.canvas = document.createElement('canvas');
    this.canvas.width = 460;
    this.canvas.height = 140;
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
    this.sprite.scale.set(1.65, 0.5, 1);
    this.sprite.position.set(0, 2.45, 0);
    this.sprite.renderOrder = 9999;

    this.draw();
  }

  public setDriving(isDriving: boolean) {
    if (this.isDriving === isDriving) return;
    this.isDriving = isDriving;
    // On foot: 2.45m above ground; Inside auto: 2.20m neatly above vehicle roof
    this.sprite.position.set(0, isDriving ? 2.18 : 2.45, 0);
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
    if (options.isLocal !== undefined && options.isLocal !== this.isLocal) {
      this.isLocal = options.isLocal;
      changed = true;
    }

    if (changed) {
      this.draw();
      this.texture.needsUpdate = true;
    }
  }

  /**
   * Called on each render frame to animate the blinking / pulsing microphone bars while speaking
   */
  public tick(now: number) {
    if (!this.isSpeaking) return;

    // Throttle pulse redraw to 20 FPS (every 50ms) for ultra-lightweight GPU footprint
    if (now - this.lastTick > 50) {
      this.lastTick = now;
      this.pulsePhase = (now * 0.01) % (Math.PI * 2);
      this.draw();
      this.texture.needsUpdate = true;
    }
  }

  private draw() {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const pad = 10;
    const cardX = pad;
    const cardY = pad;
    const cardW = w - pad * 2;
    const cardH = h - pad * 2;
    const r = 24;

    // Subtle drop shadow for 100% legibility over 3D world
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;

    // Background pill (PUBG dark tactical carbon glass)
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, r);
    ctx.fillStyle = this.isSpeaking
      ? 'rgba(10, 20, 30, 0.94)'
      : this.isLocal
      ? 'rgba(6, 78, 59, 0.92)' // Local player has deep emerald tactical tint
      : 'rgba(15, 23, 42, 0.90)';
    ctx.fill();
    ctx.restore();

    // Border (glows bright emerald green when speaking, crisp white/cyan otherwise)
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, r);
    if (this.isSpeaking) {
      const pulseAlpha = 0.6 + 0.4 * Math.sin(this.pulsePhase);
      ctx.lineWidth = 4;
      ctx.strokeStyle = `rgba(16, 185, 129, ${pulseAlpha})`;
    } else {
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = this.isLocal ? '#34d399' : 'rgba(255, 255, 255, 0.4)';
    }
    ctx.stroke();

    // -------------------------------------------------------------------------
    // 1. Left Icon: Speaker Status (🔊 / 🔇)
    // -------------------------------------------------------------------------
    const spkX = cardX + 32;
    const spkY = cardY + cardH / 2;

    ctx.font = '22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.isMuted ? '🔇' : '🔊', spkX, spkY);

    // -------------------------------------------------------------------------
    // 2. Center: Player Name & District Subtitle
    // -------------------------------------------------------------------------
    let displayName = this.currentName;
    if (displayName.length > 14) {
      displayName = displayName.substring(0, 12) + '…';
    }

    // Player Name
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 34px "Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(displayName, w / 2 - 6, cardY + 48);

    // District Pill / Tag
    const tagText = this.isLocal
      ? `📍 ${this.currentDistrict} • നിങ്ങൾ`
      : `📍 ${this.currentDistrict}`;
    ctx.font = '700 18px "Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
    ctx.fillStyle = this.isLocal ? '#6ee7b7' : '#94a3b8';
    ctx.fillText(tagText, w / 2 - 6, cardY + 84);

    // -------------------------------------------------------------------------
    // 3. Right Icon: PUBG-Style Animated Microphone Indicator (🎙️ ▂▃▅)
    // -------------------------------------------------------------------------
    const micCenterX = cardX + cardW - 36;
    const micCenterY = cardY + cardH / 2;

    if (this.isMuted) {
      // Muted: Red circular badge with slashed mic
      ctx.beginPath();
      ctx.arc(micCenterX, micCenterY, 18, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#fca5a5';
      ctx.stroke();

      ctx.font = '700 15px system-ui, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✕', micCenterX, micCenterY);
    } else if (this.isSpeaking) {
      // Speaking: Green pulsing badge with dynamic equalizer soundwave bars
      ctx.beginPath();
      ctx.arc(micCenterX, micCenterY, 20, 0, Math.PI * 2);
      const bgAlpha = 0.75 + 0.25 * Math.sin(this.pulsePhase * 2);
      ctx.fillStyle = `rgba(16, 185, 129, ${bgAlpha})`;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#6ee7b7';
      ctx.stroke();

      // Equalizer soundwave bars (3 animated vertical bars)
      const barW = 3;
      const barGap = 2.5;
      const heights = [
        8 + 7 * Math.abs(Math.sin(this.pulsePhase)),
        12 + 10 * Math.abs(Math.sin(this.pulsePhase + 1.2)),
        9 + 8 * Math.abs(Math.sin(this.pulsePhase + 2.4)),
      ];

      ctx.fillStyle = '#ffffff';
      for (let b = 0; b < 3; b++) {
        const bx = micCenterX - (barW * 3 + barGap * 2) / 2 + b * (barW + barGap);
        const bh = heights[b];
        ctx.beginPath();
        ctx.roundRect(bx, micCenterY - bh / 2, barW, bh, 1.5);
        ctx.fill();
      }
    } else {
      // Unmuted & Silent: Quiet calm mic indicator
      ctx.beginPath();
      ctx.arc(micCenterX, micCenterY, 16, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.7)';
      ctx.stroke();

      ctx.font = '14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🎙️', micCenterX, micCenterY);
    }
  }

  public dispose() {
    this.material.dispose();
    this.texture.dispose();
  }
}
