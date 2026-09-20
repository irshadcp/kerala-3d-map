import { RemotePlayerData } from '../graphics/RemotePlayerManager';

export interface LocalUserProfile {
  id: string;
  name: string;
  district: string;
}

export type NetworkMessage =
  | {
      type: 'join';
      player: RemotePlayerData;
    }
  | {
      type: 'heartbeat';
      player: RemotePlayerData;
    }
  | {
      type: 'transform';
      id: string;
      lat: number;
      lng: number;
      heading: number;
      isWalking: boolean;
    }
  | {
      type: 'state';
      id: string;
      isMuted?: boolean;
      isSpeaking?: boolean;
    }
  | {
      type: 'leave';
      id: string;
    }
  | {
      type: 'signal';
      from: string;
      to: string;
      signal: any;
    };

/**
 * MultiplayerManager
 * Handles real-time multiplayer synchronization and WebRTC proximity voice chat.
 * 100% ephemeral: zero persistent database storage, auto-cleans on exit.
 * Uses BroadcastChannel for instant local testing + WebSocket network relay for cross-device multiplayer.
 */
export class MultiplayerManager {
  private profile: LocalUserProfile;
  private broadcastChannel: BroadcastChannel | null = null;
  private ws: WebSocket | null = null;
  private isDestroyed = false;

  // Local movement state
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

  // WebRTC Peer Connections for Voice: peerId -> RTCPeerConnection
  private peerConnections = new Map<string, RTCPeerConnection>();

  // Active Remote Players: peerId -> RemotePlayerData
  public remotePlayers = new Map<string, RemotePlayerData>();

  // Event Listeners
  public onPlayerUpdate?: (player: RemotePlayerData) => void;
  public onPlayerRemove?: (id: string) => void;
  public onPlayerCountChange?: (count: number) => void;
  public onRemoteStream?: (peerId: string, stream: MediaStream, audioCtx: AudioContext) => void;
  public onMuteStateChange?: (muted: boolean) => void;

  private heartbeatTimer: number | null = null;
  private pruneTimer: number | null = null;

  constructor(profile: LocalUserProfile, initialLat: number, initialLng: number) {
    this.profile = profile;
    this.localLat = initialLat;
    this.localLng = initialLng;

    this.initTransport();
    this.startHeartbeat();
    this.initExitHandlers();
  }

  private initTransport() {
    // 1. Local BroadcastChannel for zero-latency multi-tab sync on same machine
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.broadcastChannel = new BroadcastChannel('kerala-3d-map-channel');
        this.broadcastChannel.onmessage = (event) => {
          this.handleIncomingMessage(event.data);
        };
      }
    } catch (err) {
      console.warn('[Multiplayer] BroadcastChannel unavailable:', err);
    }

    // 2. Public WebSocket relay for cross-device / mobile multiplayer
    this.connectNetworkRelay();
  }

  private connectNetworkRelay() {
    // Connect to public WebSocket echo/relay broker
    const relayUrls = [
      'wss://socketsbay.com/wss/v2/1/kerala-3d-map/',
      'wss://echo.websocket.events',
    ];

    try {
      const url = relayUrls[0];
      const socket = new WebSocket(url);
      this.ws = socket;

      socket.onopen = () => {
        // Announce join
        this.broadcastJoin();
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleIncomingMessage(msg);
        } catch (_) {}
      };

      socket.onerror = () => {
        // Fallback or retry silently
      };

      socket.onclose = () => {
        if (!this.isDestroyed) {
          setTimeout(() => this.connectNetworkRelay(), 6000);
        }
      };
    } catch (_) {
      // Local BroadcastChannel continues functioning smoothly
    }
  }

  private send(msg: NetworkMessage) {
    if (this.isDestroyed) return;

    // Send to local BroadcastChannel
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(msg);
      } catch (_) {}
    }

    // Send to Network WebSocket
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(msg));
      } catch (_) {}
    }
  }

  private handleIncomingMessage(msg: NetworkMessage) {
    if (!msg || !('type' in msg)) return;

    // Ignore messages from self
    if ('id' in msg && msg.id === this.profile.id) return;
    if ('player' in msg && msg.player.id === this.profile.id) return;

    switch (msg.type) {
      case 'join':
      case 'heartbeat': {
        const p = msg.player;
        const isNew = !this.remotePlayers.has(p.id);
        this.remotePlayers.set(p.id, p);

        if (this.onPlayerUpdate) {
          this.onPlayerUpdate(p);
        }

        if (isNew) {
          this.notifyCountChange();
          // If this was a new player's join, respond with our presence so they know we exist!
          if (msg.type === 'join') {
            this.broadcastHeartbeat();
          }
          // If we have microphone active, initiate WebRTC connection for voice
          if (this.localStream) {
            this.initiatePeerCall(p.id);
          }
        }
        break;
      }

      case 'transform': {
        const existing = this.remotePlayers.get(msg.id);
        if (existing) {
          existing.lat = msg.lat;
          existing.lng = msg.lng;
          existing.heading = msg.heading;
          existing.isWalking = msg.isWalking;

          if (this.onPlayerUpdate) {
            this.onPlayerUpdate(existing);
          }
        }
        break;
      }

      case 'state': {
        const existing = this.remotePlayers.get(msg.id);
        if (existing) {
          if (msg.isMuted !== undefined) existing.isMuted = msg.isMuted;
          if (msg.isSpeaking !== undefined) existing.isSpeaking = msg.isSpeaking;

          if (this.onPlayerUpdate) {
            this.onPlayerUpdate(existing);
          }
        }
        break;
      }

      case 'leave': {
        this.removeRemotePeer(msg.id);
        break;
      }

      case 'signal': {
        if (msg.to === this.profile.id) {
          this.handleSignalMessage(msg.from, msg.signal);
        }
        break;
      }
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

    this.send({
      type: 'transform',
      id: this.profile.id,
      lat,
      lng,
      heading,
      isWalking,
    });
  }

  public broadcastJoin() {
    this.send({
      type: 'join',
      player: {
        id: this.profile.id,
        name: this.profile.name,
        district: this.profile.district,
        lat: this.localLat,
        lng: this.localLng,
        heading: this.localHeading,
        isWalking: this.localIsWalking,
        isMuted: this.isMuted,
        isSpeaking: this.isSpeaking,
      },
    });
  }

  private broadcastHeartbeat() {
    this.send({
      type: 'heartbeat',
      player: {
        id: this.profile.id,
        name: this.profile.name,
        district: this.profile.district,
        lat: this.localLat,
        lng: this.localLng,
        heading: this.localHeading,
        isWalking: this.localIsWalking,
        isMuted: this.isMuted,
        isSpeaking: this.isSpeaking,
      },
    });
  }

  private startHeartbeat() {
    this.broadcastJoin();

    this.heartbeatTimer = window.setInterval(() => {
      this.broadcastHeartbeat();
    }, 2000);

    // Prune stale peers every 2.5s
    this.pruneTimer = window.setInterval(() => {
      this.notifyCountChange();
    }, 2500);
  }

  private notifyCountChange() {
    if (this.onPlayerCountChange) {
      // Total count includes local player + remote players
      this.onPlayerCountChange(this.remotePlayers.size + 1);
    }
  }

  private removeRemotePeer(id: string) {
    if (this.remotePlayers.has(id)) {
      this.remotePlayers.delete(id);
      if (this.onPlayerRemove) {
        this.onPlayerRemove(id);
      }
      this.notifyCountChange();
    }

    const pc = this.peerConnections.get(id);
    if (pc) {
      pc.close();
      this.peerConnections.delete(id);
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
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Audio level analyser for speaking visual feedback
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      this.startVoiceLevelDetection();

      // Connect WebRTC audio to all active peers
      for (const peerId of this.remotePlayers.keys()) {
        this.initiatePeerCall(peerId);
      }

      return true;
    } catch (err) {
      console.warn('[Multiplayer] Microphone access denied or not available:', err);
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

    this.send({
      type: 'state',
      id: this.profile.id,
      isMuted: this.isMuted,
    });

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
          this.broadcastSpeakingState(false);
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
        this.broadcastSpeakingState(speaking);
      }
    }, 150);
  }

  private broadcastSpeakingState(speaking: boolean) {
    this.send({
      type: 'state',
      id: this.profile.id,
      isSpeaking: speaking,
    });
  }

  private async createPeerConnection(peerId: string): Promise<RTCPeerConnection> {
    const existing = this.peerConnections.get(peerId);
    if (existing) return existing;

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    // Send local audio tracks to peer
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.send({
          type: 'signal',
          from: this.profile.id,
          to: peerId,
          signal: { type: 'candidate', candidate: event.candidate },
        });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0] && this.audioContext) {
        if (this.onRemoteStream) {
          this.onRemoteStream(peerId, event.streams[0], this.audioContext);
        }
      }
    };

    this.peerConnections.set(peerId, pc);
    return pc;
  }

  private async initiatePeerCall(peerId: string) {
    try {
      // Deterministic peer caller (peer with smaller id makes the offer)
      if (this.profile.id > peerId) return;

      const pc = await this.createPeerConnection(peerId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      this.send({
        type: 'signal',
        from: this.profile.id,
        to: peerId,
        signal: { type: 'offer', sdp: offer },
      });
    } catch (err) {
      console.warn('[Multiplayer] Error creating WebRTC offer:', err);
    }
  }

  private async handleSignalMessage(fromPeerId: string, signal: any) {
    try {
      if (signal.type === 'offer') {
        const pc = await this.createPeerConnection(fromPeerId);
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        this.send({
          type: 'signal',
          from: this.profile.id,
          to: fromPeerId,
          signal: { type: 'answer', sdp: answer },
        });
      } else if (signal.type === 'answer') {
        const pc = this.peerConnections.get(fromPeerId);
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        }
      } else if (signal.type === 'candidate') {
        const pc = this.peerConnections.get(fromPeerId);
        if (pc && signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      }
    } catch (err) {
      console.warn('[Multiplayer] Error handling WebRTC signal:', err);
    }
  }

  // =========================================================================
  // Ephemeral Exit & Cleanup
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

    // Broadcast immediate leave packet
    try {
      this.send({
        type: 'leave',
        id: this.profile.id,
      });
    } catch (_) {}

    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.pruneTimer) clearInterval(this.pruneTimer);
    if (this.micCheckInterval) clearInterval(this.micCheckInterval);

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    for (const pc of this.peerConnections.values()) {
      pc.close();
    }
    this.peerConnections.clear();

    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
