import * as THREE from 'three';
import { RealisticCharacter } from './RealisticCharacter';
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
  isMuted?: boolean;
  isSpeaking?: boolean;
}

export interface RemotePlayerInstance {
  data: RemotePlayerData;
  character: RealisticCharacter;
  group: THREE.Group;
  nameplate: PlayerNameplate;
  currentPos: THREE.Vector2;
  targetPos: THREE.Vector2;
  currentHeading: number;
  targetHeading: number;
  lastSeen: number;
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

  constructor(scene: THREE.Scene) {
    this.scene = scene;
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

  public updatePlayer(
    data: RemotePlayerData,
    originLat: number,
    originLng: number
  ) {
    let player = this.players.get(data.id);

    const localTarget = GeoCoords.toLocalMeters(data.lat, data.lng, originLat, originLng);

    if (!player) {
      // Spawn new remote player
      const group = new THREE.Group();
      group.name = `remote_player_${data.id}`;

      const character = new RealisticCharacter(1.35);
      group.add(character.group);

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
        group,
        nameplate,
        currentPos: new THREE.Vector2(localTarget.x, localTarget.z),
        targetPos: new THREE.Vector2(localTarget.x, localTarget.z),
        currentHeading: data.heading || 0,
        targetHeading: data.heading || 0,
        lastSeen: Date.now(),
      };

      this.players.set(data.id, player);
    } else {
      // Update existing player
      player.data = { ...player.data, ...data };
      player.targetPos.set(localTarget.x, localTarget.z);
      player.targetHeading = data.heading;
      player.lastSeen = Date.now();

      player.nameplate.update({
        name: data.name,
        district: data.district,
        isMuted: data.isMuted,
        isSpeaking: data.isSpeaking,
      });
    }
  }

  public registerAudioStream(
    playerId: string,
    remoteStream: MediaStream,
    audioCtx: AudioContext
  ) {
    this.audioContext = audioCtx;
    const player = this.players.get(playerId);

    try {
      const audio = new Audio();
      audio.srcObject = remoteStream;
      audio.autoplay = true;

      const source = audioCtx.createMediaStreamSource(remoteStream);
      const gainNode = audioCtx.createGain();
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime); // Start at 0, smoothly fade in by distance

      source.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      if (player) {
        player.gainNode = gainNode;
        player.audioElement = audio;
      }
    } catch (err) {
      console.warn('[RemotePlayerManager] Error setting up audio stream:', err);
    }
  }

  public removePlayer(id: string) {
    const player = this.players.get(id);
    if (!player) return;

    this.scene.remove(player.group);
    player.nameplate.dispose();

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
    localPlayerZ: number
  ) {
    const now = Date.now();
    const toRemove: string[] = [];

    for (const [id, player] of this.players) {
      // Ephemeral pruning: If remote player hasn't broadcast in 4.5 seconds, remove immediately!
      if (now - player.lastSeen > 4500) {
        toRemove.push(id);
        continue;
      }

      // Smooth coordinate interpolation (lerp)
      const lerpFactor = Math.min(1, delta * 12);
      player.currentPos.lerp(player.targetPos, lerpFactor);
      player.group.position.set(player.currentPos.x, 0, player.currentPos.y);

      // Smooth heading interpolation
      let diff = player.targetHeading - player.currentHeading;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      player.currentHeading += diff * lerpFactor;
      player.character.setHeading(player.currentHeading);

      // Animate walking / idle breathing
      player.character.update(delta, player.data.isWalking, 1.25);

      // Proximity Voice Chat: calculate real-time 3D audio attenuation
      if (player.gainNode && this.audioContext) {
        const dist = Math.hypot(
          player.currentPos.x - localPlayerX,
          player.currentPos.y - localPlayerZ
        );
        const maxAudibleDist = 45; // 45 meters audible threshold

        let gain = 0;
        if (dist < maxAudibleDist && !player.data.isMuted) {
          // Quadratic attenuation: (1 - d/max)^2 gives realistic spatial sound
          gain = Math.pow(1 - dist / maxAudibleDist, 2);
        }

        try {
          player.gainNode.gain.setTargetAtTime(gain, this.audioContext.currentTime, 0.08);
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
  }
}
