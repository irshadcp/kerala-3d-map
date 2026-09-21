import * as THREE from 'three';
import { RealisticCharacter } from './RealisticCharacter';
import { PlayerVehicle } from './PlayerVehicle';
import { PlayerNameplate } from './PlayerNameplate';
import { GeoCoords } from '../core/geoCoords';

export interface RemotePlayerData {
  id: string;
  name: string;
  district: string;
  lat: number;
  lng: number;
  heading: number;
  isWalking: boolean;
  isDriving?: boolean;
  isMuted?: boolean;
  isSpeaking?: boolean;
  t?: number;
}

export interface RemotePlayerInstance {
  data: RemotePlayerData;
  character: RealisticCharacter;
  vehicle: PlayerVehicle;
  group: THREE.Group;
  nameplate: PlayerNameplate;
  currentPos: THREE.Vector2;
  targetPos: THREE.Vector2;
  currentHeading: number;
  targetHeading: number;
  lastSeen: number;
  lastTransformTime: number;
  gainNode?: GainNode;
  audioElement?: HTMLAudioElement;
}

/**
 * RemotePlayerManager
 * Manages all active remote multiplayer players in the Three.js 3D scene.
 * Handles smooth spatial interpolation, limb animations, 3D overhead nameplates,
 * and proximity voice chat volume attenuation.
 */
export class RemotePlayerManager {
  private scene: THREE.Scene;
  public players = new Map<string, RemotePlayerInstance>();
  private audioContext: AudioContext | null = null;
  private pendingAudioStreams = new Map<string, MediaStream>();
  private isDeafened = false;

  public setDeafened(deafened: boolean) {
    this.isDeafened = deafened;
    if (deafened) {
      for (const p of this.players.values()) {
        if (p.audioElement) p.audioElement.volume = 0;
        if (p.gainNode && this.audioContext) {
          try {
            p.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
          } catch (_) {}
        }
      }
    }
  }

  public getIsDeafened(): boolean {
    return this.isDeafened;
  }

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Listen for first user tap or keypress to unblock browser audio autoplay policies
    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        if (this.audioContext && this.audioContext.state === 'suspended') {
          this.audioContext.resume().catch(() => {});
        }
        for (const p of this.players.values()) {
          if (p.audioElement && p.audioElement.paused) {
            p.audioElement.play().catch(() => {});
          }
        }
      };
      window.addEventListener('pointerdown', unlockAudio, { passive: true, once: false });
      window.addEventListener('keydown', unlockAudio, { passive: true, once: false });
    }
  }

  public setAudioContext(ctx: AudioContext) {
    this.audioContext = ctx;
  }

  public getPlayerCount(): number {
    return this.players.size;
  }

  public getPlayerList(): RemotePlayerData[] {
    return Array.from(this.players.values()).map((p) => ({ ...p.data }));
  }

  public hasMovingNearbyPlayer(localX: number, localZ: number, thresholdDist = 80): boolean {
    for (const player of this.players.values()) {
      if (player.data.isWalking) {
        const dist = Math.hypot(player.currentPos.x - localX, player.currentPos.y - localZ);
        if (dist <= thresholdDist) return true;
      }
    }
    return false;
  }

  public updatePlayer(
    data: RemotePlayerData,
    originLat: number,
    originLng: number
  ) {
    let player = this.players.get(data.id);

    const hasValidCoords = typeof data.lat === 'number' && typeof data.lng === 'number' && !isNaN(data.lat) && !isNaN(data.lng);
    const localTarget = hasValidCoords
      ? GeoCoords.toLocalMeters(data.lat, data.lng, originLat, originLng)
      : null;

    if (!player) {
      // Must have valid initial coordinates to spawn a player in the 3D scene
      if (!localTarget) return;

      const group = new THREE.Group();
      group.name = `remote_player_${data.id}`;

      const character = new RealisticCharacter(1.35);
      group.add(character.group);

      const vehicle = new PlayerVehicle('auto', 1.0);
      group.add(vehicle.group);

      const nameplate = new PlayerNameplate({
        name: data.name,
        district: data.district,
        isMuted: data.isMuted,
        isSpeaking: data.isSpeaking,
      });
      group.add(nameplate.sprite);

      group.position.set(localTarget.x, 0, localTarget.z);
      this.scene.add(group);

      player = {
        data,
        character,
        vehicle,
        group,
        nameplate,
        currentPos: new THREE.Vector2(localTarget.x, localTarget.z),
        targetPos: new THREE.Vector2(localTarget.x, localTarget.z),
        currentHeading: data.heading || 0,
        targetHeading: data.heading || 0,
        lastSeen: Date.now(),
        lastTransformTime: data.t || Date.now(),
      };

      this.players.set(data.id, player);

      // Check if an audio stream arrived before this player was initialized
      const pendingStream = this.pendingAudioStreams.get(data.id);
      if (pendingStream) {
        this.attachAudioStreamToPlayer(player, pendingStream);
      }
    } else {
      // Drop out-of-order packets if timestamp is older
      if (data.t && player.lastTransformTime && data.t < player.lastTransformTime) {
        return;
      }
      if (data.t) {
        player.lastTransformTime = data.t;
      }

      // Update player data
      player.data = { ...player.data, ...data };
      player.lastSeen = Date.now();

      if (localTarget) {
        player.targetPos.set(localTarget.x, localTarget.z);
        if (typeof data.heading === 'number') {
          player.targetHeading = data.heading;
        }

        // Snap immediately if teleported or searched far away (> 35 meters)
        if (player.currentPos.distanceTo(player.targetPos) > 35) {
          player.currentPos.copy(player.targetPos);
        }
      }

      player.nameplate.update({
        name: player.data.name,
        district: player.data.district,
        isMuted: player.data.isMuted,
        isSpeaking: player.data.isSpeaking,
      });
    }
  }

  /**
   * Update mute or speaking state without ever altering player 3D coordinates.
   */
  public updatePlayerState(id: string, isMuted?: boolean, isSpeaking?: boolean) {
    const player = this.players.get(id);
    if (!player) return;

    if (isMuted !== undefined) player.data.isMuted = isMuted;
    if (isSpeaking !== undefined) player.data.isSpeaking = isSpeaking;

    player.nameplate.update({
      name: player.data.name,
      district: player.data.district,
      isMuted: player.data.isMuted,
      isSpeaking: player.data.isSpeaking,
    });
  }

  public registerAudioStream(
    playerId: string,
    remoteStream: MediaStream,
    audioCtx?: AudioContext
  ) {
    if (audioCtx) {
      this.audioContext = audioCtx;
    }
    this.pendingAudioStreams.set(playerId, remoteStream);

    const player = this.players.get(playerId);
    if (player) {
      this.attachAudioStreamToPlayer(player, remoteStream);
    }
  }

  private attachAudioStreamToPlayer(player: RemotePlayerInstance, stream: MediaStream) {
    try {
      if (player.audioElement) {
        player.audioElement.srcObject = null;
      }

      // Direct HTMLAudioElement - 100% reliable across iOS Safari, Android Chrome, and Desktop
      const audio = new Audio();
      audio.srcObject = stream;
      audio.autoplay = true;
      (audio as any).playsInline = true;
      audio.muted = false;
      audio.volume = 0; // Starts at 0, smoothly attenuated by 3D distance in update()
      audio.play().catch(() => {});
      player.audioElement = audio;

      // Optional Web Audio API gain routing
      if (this.audioContext) {
        try {
          const source = this.audioContext.createMediaStreamSource(stream);
          const gainNode = this.audioContext.createGain();
          gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
          source.connect(gainNode);
          gainNode.connect(this.audioContext.destination);
          player.gainNode = gainNode;
        } catch (_) {}
      }
    } catch (err) {
      console.warn('[RemotePlayerManager] Error setting up audio stream:', err);
    }
  }

  public removePlayer(id: string) {
    const player = this.players.get(id);
    this.pendingAudioStreams.delete(id);
    if (!player) return;

    this.scene.remove(player.group);
    player.nameplate.dispose();
    player.vehicle.dispose();

    player.group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.geometry?.dispose();
      }
    });

    if (player.gainNode) {
      try {
        player.gainNode.disconnect();
      } catch (_) {}
    }

    if (player.audioElement) {
      player.audioElement.pause();
      player.audioElement.srcObject = null;
    }

    this.players.delete(id);
  }

  public onOriginChange(newOriginLat: number, newOriginLng: number) {
    // Re-anchor all remote players to the new local coordinate origin
    for (const player of this.players.values()) {
      const local = GeoCoords.toLocalMeters(
        player.data.lat,
        player.data.lng,
        newOriginLat,
        newOriginLng
      );
      player.currentPos.set(local.x, local.z);
      player.targetPos.set(local.x, local.z);
      player.group.position.set(local.x, 0, local.z);
    }
  }

  public update(
    delta: number,
    localPlayerX: number,
    localPlayerZ: number,
    getElevation?: (localX: number, localZ: number) => number
  ) {
    const now = Date.now();
    const toRemove: string[] = [];

    for (const [id, player] of this.players) {
      // Prune inactive peers after 15 seconds without updates
      if (now - player.lastSeen > 15000) {
        toRemove.push(id);
        continue;
      }

      // Smooth coordinate interpolation (lerp)
      const lerpFactor = Math.min(1, delta * 12);
      player.currentPos.lerp(player.targetPos, lerpFactor);
      const groundY = getElevation ? getElevation(player.currentPos.x, player.currentPos.y) : 0;
      player.group.position.set(player.currentPos.x, groundY, player.currentPos.y);

      // Smooth heading interpolation
      let diff = player.targetHeading - player.currentHeading;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      player.currentHeading += diff * lerpFactor;
      player.character.setHeading(player.currentHeading);

      // Animate walking / idle breathing
      player.character.update(delta, player.data.isWalking, 1.25);

      // Animate overhead PUBG-style nameplate & speaking pulse
      player.nameplate.tick(now);
      player.nameplate.setDriving(player.data.isDriving ?? false);

      // Vehicle & Driving Posture
      if (player.data.isDriving) {
        player.character.group.visible = false; // Inside auto
        player.vehicle.setPosition(0, 0, 0);
        player.vehicle.setHeading(player.currentHeading);
        player.vehicle.update(delta, true, player.data.isWalking, 2.5);
      } else {
        player.character.group.visible = true; // On foot
        player.character.group.position.set(0, 0, 0);
        player.character.group.scale.set(1.5, 1.5, 1.5);
        player.vehicle.setPosition(2.2, 0, 0);
        player.vehicle.setHeading(0);
        player.vehicle.update(delta, false, false, 0);
      }

      // Proximity Voice Chat: calculate real-time 3D audio attenuation
      const dist = Math.hypot(
        player.currentPos.x - localPlayerX,
        player.currentPos.y - localPlayerZ
      );
      const maxAudibleDist = 45; // 45 meters audible threshold

      let targetGain = 0;
      if (!this.isDeafened && dist < maxAudibleDist && !player.data.isMuted) {
        // Quadratic distance attenuation for realistic spatial sound
        targetGain = Math.pow(1 - dist / maxAudibleDist, 2);
      }
      targetGain = Math.max(0, Math.min(1, targetGain));

      // 1. Direct HTMLAudioElement volume adjustment
      if (player.audioElement) {
        try {
          player.audioElement.volume = targetGain;
          if (targetGain > 0 && player.audioElement.paused) {
            player.audioElement.play().catch(() => {});
          }
        } catch (_) {}
      }

      // 2. Web Audio API gain adjustment
      if (player.gainNode && this.audioContext) {
        try {
          player.gainNode.gain.setTargetAtTime(targetGain, this.audioContext.currentTime, 0.08);
        } catch (_) {}
      }
    }

    for (const id of toRemove) {
      this.removePlayer(id);
    }
  }

  public clear() {
    for (const id of Array.from(this.players.keys())) {
      this.removePlayer(id);
    }
    this.pendingAudioStreams.clear();
  }
}
