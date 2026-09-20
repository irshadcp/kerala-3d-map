import { joinRoom, Room, selfId } from '@trystero-p2p/mqtt';
import { RemotePlayerData } from '../graphics/RemotePlayerManager';

export interface LocalUserProfile {
  id: string;
  name: string;
  district: string;
}

/**
 * MultiplayerManager
 * 100% Free & Serverless cross-device Real-Time Multiplayer + WebRTC Proximity Voice Chat.
 * Uses @trystero-p2p/mqtt over public redundant MQTT brokers (HiveMQ, EMQX, Mosquitto)
 * to connect mobile phones, laptops, and tablets anywhere in the world.
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
  public onPlayerRemove?: (id: string) => void;
  public onPlayerCountChange?: (count: number) => void;
  public onRemoteStream?: (peerId: string, stream: MediaStream, audioCtx: AudioContext) => void;
  public onMuteStateChange?: (muted: boolean) => void;

  private heartbeatTimer: number | null = null;

  constructor(profile: LocalUserProfile, initialLat: number, initialLng: number) {
    this.profile = profile;
    this.localLat = initialLat;
    this.localLng = initialLng;

    // 1. Initialize Trystero P2P MQTT Room (connects cross-device across the internet)
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
      }, 500);

      if (this.localStream) {
        this.room.addStream(this.localStream, { target: peerId });
      }
      this.notifyCountChange();
    };

    // When a peer disconnects
    this.room.onPeerLeave = (peerId: string) => {
      this.removeRemotePeer(peerId);
    };

    // Handle incoming peer profiles
    profileAction.onMessage = (data: any, context) => {
      const peerId = context.peerId;
      if (peerId === selfId || peerId === this.profile.id) return;

      const isNew = !this.remotePlayers.has(peerId);
      const player: RemotePlayerData = {
        id: peerId,
        name: data.name || 'Explorer',
        district: data.district || 'Kerala',
        lat: typeof data.lat === 'number' ? data.lat : this.localLat,
        lng: typeof data.lng === 'number' ? data.lng : this.localLng,
        heading: data.heading || 0,
        isWalking: Boolean(data.isWalking),
        isMuted: Boolean(data.isMuted),
        isSpeaking: Boolean(data.isSpeaking),
      };

      this.remotePlayers.set(peerId, player);

      if (this.onPlayerUpdate) {
        this.onPlayerUpdate(player);
      }

      if (isNew) {
        this.notifyCountChange();
        // Reply with our profile so the other peer also has our info
        this.broadcastSelfProfile(peerId);
      }
    };

    // Handle incoming coordinate / movement updates
    transformAction.onMessage = (data: any, context) => {
      const peerId = context.peerId;
      const player = this.remotePlayers.get(peerId);
      if (player) {
        player.lat = data.lat;
        player.lng = data.lng;
        player.heading = data.heading;
        player.isWalking = data.isWalking;

        if (this.onPlayerUpdate) {
          this.onPlayerUpdate(player);
        }
      }
    };

    // Handle incoming state updates (mute / speaking)
    stateAction.onMessage = (data: any, context) => {
      const peerId = context.peerId;
      const player = this.remotePlayers.get(peerId);
      if (player) {
        if (data.isMuted !== undefined) player.isMuted = data.isMuted;
        if (data.isSpeaking !== undefined) player.isSpeaking = data.isSpeaking;

        if (this.onPlayerUpdate) {
          this.onPlayerUpdate(player);
        }
      }
    };

    // Handle incoming WebRTC audio stream for Proximity Voice Chat
    this.room.onPeerStream = (stream: MediaStream, peerId: string) => {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (this.onRemoteStream) {
        this.onRemoteStream(peerId, stream, this.audioContext);
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

    // Heartbeat every 2.0s to ensure all connected peers have latest coordinates
    this.heartbeatTimer = window.setInterval(() => {
      this.broadcastSelfProfile();
      this.notifyCountChange();
    }, 2000);

    this.initExitHandlers();
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
      isMuted: this.isMuted,
      isSpeaking: this.isSpeaking,
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
    isWalking: boolean
  ) {
    this.localLat = lat;
    this.localLng = lng;
    this.localHeading = heading;
    this.localIsWalking = isWalking;

    const data = { lat, lng, heading, isWalking };

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
        isMuted: msg.data.isMuted,
        isSpeaking: msg.data.isSpeaking,
      };
      this.remotePlayers.set(msg.peerId, player);
      if (this.onPlayerUpdate) this.onPlayerUpdate(player);
      if (isNew) this.notifyCountChange();
    } else if (msg.type === 'transform') {
      const p = this.remotePlayers.get(msg.peerId);
      if (p) {
        p.lat = msg.data.lat;
        p.lng = msg.data.lng;
        p.heading = msg.data.heading;
        p.isWalking = msg.data.isWalking;
        if (this.onPlayerUpdate) this.onPlayerUpdate(p);
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
    if (this.localStream) return true;

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
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      // Voice level detection
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      this.startVoiceLevelDetection();

      // Send local microphone audio stream to all peers in the room
      this.room.addStream(stream);

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
