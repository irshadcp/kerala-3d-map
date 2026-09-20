import { joinRoom, Room, selfId } from 'trystero';
import { RemotePlayerData } from '../graphics/RemotePlayerManager';

export interface LocalUserProfile {
  id: string;
  name: string;
  district: string;
}

/**
 * MultiplayerManager
 * 100% Free & Serverless cross-device Real-Time Multiplayer + WebRTC Proximity Voice Chat.
 * Uses trystero over 28 redundant public Nostr relays on standard HTTPS/WSS port 443
 * to reliably connect mobile phones (Jio/Airtel/Vi 4G/5G, iOS, Android) and laptops anywhere in the world.
 * Zero database storage, zero API keys, 100% ephemeral and zero cost.
 */
export class MultiplayerManager {
  private profile: LocalUserProfile;
  private room: Room;
  private broadcastChannel: BroadcastChannel | null = null;
  private isDestroyed = false;

  // Trystero action transmitters
  private sendTransform: (data: any, targetPeerId?: string) => void;
  private sendProfile: (data: any, targetPeerId?: string) => void;
  private sendState: (data: any, targetPeerId?: string) => void;

  // Local state
  public localLat = 0;
  public localLng = 0;
  public localHeading = 0;
  public localIsWalking = false;
  public localIsDriving = false;

  // Voice Chat state
  private audioContext: AudioContext | null = null;
  private localStream: MediaStream | null = null;
  private isMuted = false;
  private isSpeaking = false;
  private analyser: AnalyserNode | null = null;
  private micCheckInterval: number | null = null;

  // Active Remote Players: peerId -> RemotePlayerData
  public remotePlayers = new Map<string, RemotePlayerData>();

  // Event Listeners
  public onPlayerUpdate?: (player: RemotePlayerData) => void;
  public onPlayerStateChange?: (id: string, isMuted: boolean, isSpeaking: boolean) => void;
  public onPlayerRemove?: (id: string) => void;
  public onPlayerCountChange?: (count: number) => void;
  public onRemoteStream?: (peerId: string, stream: MediaStream, audioCtx?: AudioContext) => void;
  public onMuteStateChange?: (muted: boolean) => void;
  public onLocalSpeakingChange?: (speaking: boolean) => void;

  private heartbeatTimer: number | null = null;
  private lastTransformSent = 0;

  constructor(profile: LocalUserProfile, initialLat: number, initialLng: number) {
    this.profile = profile;
    this.localLat = initialLat;
    this.localLng = initialLng;

    // 1. Initialize Trystero P2P Room (Standard WSS Port 443 with 28 public Nostr relays)
    const APP_ID = 'kerala-3d-map-realtime-2026';
    const ROOM_NAME = 'kerala-global-room';

    this.room = joinRoom({ appId: APP_ID }, ROOM_NAME);

    // Setup action channels
    const transformAction = this.room.makeAction<any>('transform');
    const profileAction = this.room.makeAction<any>('profile');
    const stateAction = this.room.makeAction<any>('state');

    this.sendTransform = (data: any, targetPeerId?: string) => {
      try {
        transformAction.send(data, targetPeerId ? { target: targetPeerId } : undefined);
      } catch (_) {}
    };
    this.sendProfile = (data: any, targetPeerId?: string) => {
      try {
        profileAction.send(data, targetPeerId ? { target: targetPeerId } : undefined);
      } catch (_) {}
    };
    this.sendState = (data: any, targetPeerId?: string) => {
      try {
        stateAction.send(data, targetPeerId ? { target: targetPeerId } : undefined);
      } catch (_) {}
    };

    // When a peer connects across the internet
    this.room.onPeerJoin = (peerId: string) => {
      this.broadcastSelfProfile(peerId);
      // Staggered follow-up broadcast to guarantee arrival after WebRTC data channel handshakes
      setTimeout(() => {
        if (!this.isDestroyed) {
          this.broadcastSelfProfile(peerId);
        }
      }, 600);

      if (this.localStream) {
        try {
          this.room.addStream(this.localStream, { target: peerId });
        } catch (_) {}
      }
      this.notifyCountChange();
    };

    // When a peer disconnects
    this.room.onPeerLeave = (peerId: string) => {
      this.removeRemotePeer(peerId);
    };

    // Handle incoming peer profiles
    profileAction.onMessage = (data: any, context) => {
      const peerId = typeof context === 'string' ? context : context?.peerId || data?.peerId;
      if (!peerId || peerId === selfId || peerId === this.profile.id) return;

      const isNew = !this.remotePlayers.has(peerId);
      let player = this.remotePlayers.get(peerId);

      if (isNew || !player) {
        player = {
          id: peerId,
          name: data.name || 'Explorer',
          district: data.district || 'Kerala',
          lat: typeof data.lat === 'number' ? data.lat : this.localLat,
          lng: typeof data.lng === 'number' ? data.lng : this.localLng,
          heading: data.heading || 0,
          isWalking: Boolean(data.isWalking),
          isDriving: Boolean(data.isDriving),
          isMuted: Boolean(data.isMuted),
          isSpeaking: Boolean(data.isSpeaking),
          t: data.t || Date.now(),
        };

        this.remotePlayers.set(peerId, player);

        if (this.onPlayerUpdate) {
          this.onPlayerUpdate(player);
        }
        this.notifyCountChange();
        // Reply with our profile so the new peer immediately receives our info
        this.broadcastSelfProfile(peerId);
      } else {
        // Player already exists - ONLY update metadata to avoid movement jitter!
        let updated = false;
        if (data.name && player.name !== data.name) {
          player.name = data.name;
          updated = true;
        }
        if (data.district && player.district !== data.district) {
          player.district = data.district;
          updated = true;
        }
        if (data.isMuted !== undefined && player.isMuted !== data.isMuted) {
          player.isMuted = data.isMuted;
          updated = true;
        }
        if (data.isSpeaking !== undefined && player.isSpeaking !== data.isSpeaking) {
          player.isSpeaking = data.isSpeaking;
          updated = true;
        }

        // Only update coords if data has a timestamp strictly newer than last known transform
        if (data.t && (!player.t || data.t > player.t) && typeof data.lat === 'number' && typeof data.lng === 'number') {
          player.t = data.t;
          player.lat = data.lat;
          player.lng = data.lng;
          if (data.heading !== undefined) player.heading = data.heading;
          if (data.isWalking !== undefined) player.isWalking = Boolean(data.isWalking);
          if (data.isDriving !== undefined) player.isDriving = Boolean(data.isDriving);
          updated = true;
        }

        if (updated && this.onPlayerUpdate) {
          this.onPlayerUpdate(player);
        }
      }
    };

    // Handle incoming coordinate / movement updates
    transformAction.onMessage = (data: any, context) => {
      const peerId = typeof context === 'string' ? context : context?.peerId || data?.peerId;
      if (!peerId) return;

      const player = this.remotePlayers.get(peerId);
      if (player) {
        // Drop older out-of-order movement packets
        if (data.t && player.t && data.t < player.t) {
          return;
        }
        player.t = data.t || Date.now();
        if (typeof data.lat === 'number') player.lat = data.lat;
        if (typeof data.lng === 'number') player.lng = data.lng;
        if (typeof data.heading === 'number') player.heading = data.heading;
        if (data.isWalking !== undefined) player.isWalking = Boolean(data.isWalking);
        if (data.isDriving !== undefined) player.isDriving = Boolean(data.isDriving);

        if (this.onPlayerUpdate) {
          this.onPlayerUpdate(player);
        }
      }
    };

    // Handle incoming state updates (mute / speaking) - NEVER touch coordinates!
    stateAction.onMessage = (data: any, context) => {
      const peerId = typeof context === 'string' ? context : context?.peerId || data?.peerId;
      if (!peerId) return;

      const player = this.remotePlayers.get(peerId);
      if (player) {
        if (data.isMuted !== undefined) player.isMuted = Boolean(data.isMuted);
        if (data.isSpeaking !== undefined) player.isSpeaking = Boolean(data.isSpeaking);

        if (this.onPlayerStateChange) {
          this.onPlayerStateChange(peerId, Boolean(player.isMuted), Boolean(player.isSpeaking));
        } else if (this.onPlayerUpdate) {
          this.onPlayerUpdate(player);
        }
      }
    };

    // Handle incoming WebRTC audio stream for Proximity Voice Chat
    this.room.onPeerStream = (stream: MediaStream, peerId: string) => {
      if (!this.audioContext && typeof window !== 'undefined') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) this.audioContext = new AudioCtx();
      }
      if (this.onRemoteStream) {
        this.onRemoteStream(peerId, stream, this.audioContext || undefined);
      }
    };

    // 2. Initialize local BroadcastChannel (for instant multi-tab sync on same machine)
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.broadcastChannel = new BroadcastChannel('kerala-3d-local-bc');
        this.broadcastChannel.onmessage = (event) => {
          this.handleLocalBcMessage(event.data);
        };
      }
    } catch (_) {}

    // Heartbeat every 2.5s to ensure all connected peers retain profile info
    this.heartbeatTimer = window.setInterval(() => {
      this.broadcastSelfProfile();
      this.notifyCountChange();
    }, 2500);

    this.initExitHandlers();
  }

  public updateProfile(name: string, district: string) {
    this.profile.name = name;
    this.profile.district = district;
    this.broadcastSelfProfile();
  }

  private broadcastSelfProfile(targetPeerId?: string) {
    const data = {
      peerId: selfId,
      name: this.profile.name,
      district: this.profile.district,
      lat: this.localLat,
      lng: this.localLng,
      heading: this.localHeading,
      isWalking: this.localIsWalking,
      isDriving: this.localIsDriving,
      isMuted: this.isMuted,
      isSpeaking: this.isSpeaking,
      t: Date.now(),
    };

    try {
      this.sendProfile(data, targetPeerId);
    } catch (_) {}

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'profile',
          peerId: selfId,
          data,
        });
      } catch (_) {}
    }
  }

  public updateLocalTransform(
    lat: number,
    lng: number,
    heading: number,
    isWalking: boolean,
    isDriving?: boolean
  ) {
    const now = Date.now();
    const walkingChanged = isWalking !== this.localIsWalking;
    const drivingChanged = isDriving !== undefined && isDriving !== this.localIsDriving;
    if (isDriving !== undefined) {
      this.localIsDriving = isDriving;
    }
    const timeElapsed = now - this.lastTransformSent >= 60; // Max ~16 updates/sec for smooth 60fps interpolation

    this.localLat = lat;
    this.localLng = lng;
    this.localHeading = heading;
    this.localIsWalking = isWalking;

    // Send packet immediately if walking/driving state changed, or after 60ms
    if (walkingChanged || drivingChanged || timeElapsed) {
      this.lastTransformSent = now;
      const data = {
        lat,
        lng,
        heading,
        isWalking,
        isDriving: this.localIsDriving,
        t: now,
      };

      try {
        this.sendTransform(data);
      } catch (_) {}

      if (this.broadcastChannel) {
        try {
          this.broadcastChannel.postMessage({
            type: 'transform',
            peerId: selfId,
            data,
          });
        } catch (_) {}
      }
    }
  }

  private handleLocalBcMessage(msg: any) {
    if (!msg || msg.peerId === selfId || msg.peerId === this.profile.id) return;

    if (msg.type === 'profile') {
      const isNew = !this.remotePlayers.has(msg.peerId);
      const player: RemotePlayerData = {
        id: msg.peerId,
        name: msg.data.name || 'Explorer',
        district: msg.data.district || 'Kerala',
        lat: msg.data.lat,
        lng: msg.data.lng,
        heading: msg.data.heading,
        isWalking: msg.data.isWalking,
        isDriving: Boolean(msg.data.isDriving),
        isMuted: msg.data.isMuted,
        isSpeaking: msg.data.isSpeaking,
        t: msg.data.t || Date.now(),
      };
      this.remotePlayers.set(msg.peerId, player);
      if (this.onPlayerUpdate) this.onPlayerUpdate(player);
      if (isNew) this.notifyCountChange();
    } else if (msg.type === 'transform') {
      const p = this.remotePlayers.get(msg.peerId);
      if (p) {
        if (msg.data.t && p.t && msg.data.t < p.t) {
          return;
        }
        p.t = msg.data.t || Date.now();
        p.lat = msg.data.lat;
        p.lng = msg.data.lng;
        p.heading = msg.data.heading;
        p.isWalking = msg.data.isWalking;
        p.isDriving = Boolean(msg.data.isDriving);
        if (this.onPlayerUpdate) this.onPlayerUpdate(p);
      }
    } else if (msg.type === 'state') {
      const p = this.remotePlayers.get(msg.peerId);
      if (p) {
        if (msg.data.isMuted !== undefined) p.isMuted = msg.data.isMuted;
        if (msg.data.isSpeaking !== undefined) p.isSpeaking = msg.data.isSpeaking;
        if (this.onPlayerStateChange) {
          this.onPlayerStateChange(msg.peerId, Boolean(p.isMuted), Boolean(p.isSpeaking));
        } else if (this.onPlayerUpdate) {
          this.onPlayerUpdate(p);
        }
      }
    } else if (msg.type === 'leave') {
      this.removeRemotePeer(msg.peerId);
    }
  }

  private notifyCountChange() {
    if (this.onPlayerCountChange) {
      const peers = this.room ? Object.keys(this.room.getPeers()).length : 0;
      const count = Math.max(this.remotePlayers.size, peers) + 1;
      this.onPlayerCountChange(count);
    }
  }

  private removeRemotePeer(peerId: string) {
    if (this.remotePlayers.has(peerId)) {
      this.remotePlayers.delete(peerId);
      if (this.onPlayerRemove) {
        this.onPlayerRemove(peerId);
      }
      this.notifyCountChange();
    }
  }

  // =========================================================================
  // WebRTC Proximity Voice Chat System
  // =========================================================================

  public async enableMicrophone(): Promise<boolean> {
    if (this.localStream) {
      if (this.isMuted) {
        this.toggleMute();
      }
      return true;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      this.localStream = stream;
      this.isMuted = false;

      if (!this.audioContext && typeof window !== 'undefined') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) this.audioContext = new AudioCtx();
      }
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume().catch(() => {});
      }

      // Voice level detection
      if (this.audioContext) {
        try {
          const source = this.audioContext.createMediaStreamSource(stream);
          this.analyser = this.audioContext.createAnalyser();
          this.analyser.fftSize = 256;
          source.connect(this.analyser);
          this.startVoiceLevelDetection();
        } catch (_) {}
      }

      // Broadcast local microphone audio stream to all peers in the room
      try {
        this.room.addStream(stream);
      } catch (_) {}

      try {
        this.sendState({ isMuted: false });
      } catch (_) {}

      if (this.onMuteStateChange) {
        this.onMuteStateChange(false);
      }

      return true;
    } catch (err) {
      console.warn('[Multiplayer] Microphone access error:', err);
      return false;
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;

    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !this.isMuted;
      });
    }

    try {
      this.sendState({ isMuted: this.isMuted });
    } catch (_) {}

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'state',
          peerId: selfId,
          data: { isMuted: this.isMuted },
        });
      } catch (_) {}
    }

    if (this.onMuteStateChange) {
      this.onMuteStateChange(this.isMuted);
    }

    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  private startVoiceLevelDetection() {
    if (this.micCheckInterval) clearInterval(this.micCheckInterval);

    const buffer = new Uint8Array(this.analyser ? this.analyser.frequencyBinCount : 128);

    this.micCheckInterval = window.setInterval(() => {
      if (!this.analyser || this.isMuted) {
        if (this.isSpeaking) {
          this.isSpeaking = false;
          try {
            this.sendState({ isSpeaking: false });
          } catch (_) {}
          if (this.onLocalSpeakingChange) {
            this.onLocalSpeakingChange(false);
          }
        }
        return;
      }

      this.analyser.getByteFrequencyData(buffer);
      let sum = 0;
      for (let i = 0; i < buffer.length; i++) {
        sum += buffer[i];
      }
      const avg = sum / buffer.length;
      const speaking = avg > 22;

      if (speaking !== this.isSpeaking) {
        this.isSpeaking = speaking;
        try {
          this.sendState({ isSpeaking: speaking });
        } catch (_) {}
        if (this.onLocalSpeakingChange) {
          this.onLocalSpeakingChange(speaking);
        }
      }
    }, 150);
  }

  // =========================================================================
  // Exit Handlers & Clean Shutdown
  // =========================================================================

  private initExitHandlers() {
    const handleLeave = () => {
      this.destroy();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleLeave);
      window.addEventListener('pagehide', handleLeave);
    }
  }

  public destroy() {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'leave',
          peerId: selfId,
        });
        this.broadcastChannel.close();
      } catch (_) {}
    }

    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.micCheckInterval) clearInterval(this.micCheckInterval);

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    try {
      this.room.leave();
    } catch (_) {}

    this.remotePlayers.clear();
  }
}
