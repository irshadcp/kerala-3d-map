/**
 * Procedural Web Audio API Sound Engine for GTA-style exploration.
 * Zero external MP3 asset dependency, 100% reliable, zero network latency.
 */
export class SoundManager {
  private static instance: SoundManager;
  private ctx: AudioContext | null = null;

  // Engine sound state
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private isEngineRunning = false;

  // Radio station state
  private radioInterval: any = null;
  private currentRadioStation = 0; // 0 = Off, 1 = Radio Kerala, 2 = City Pulse, 3 = Highway Chill
  private radioStations = [
    'Radio Off',
    '📻 Radio Kerala 98.4 FM',
    '📻 City Pulse 102.1 FM',
    '📻 Highway Chill 94.5 FM',
  ];

  public static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  private initAudio() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Starts the 2-stroke Auto Rickshaw engine sound loop.
   */
  public startEngine() {
    this.initAudio();
    if (!this.ctx || this.isEngineRunning) return;

    try {
      this.engineOsc = this.ctx.createOscillator();
      this.engineGain = this.ctx.createGain();
      this.engineFilter = this.ctx.createBiquadFilter();

      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(28, this.ctx.currentTime); // Base idle RPM

      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(280, this.ctx.currentTime);

      this.engineGain.gain.setValueAtTime(0.01, this.ctx.currentTime);
      this.engineGain.gain.linearRampToValueAtTime(0.14, this.ctx.currentTime + 0.3);

      this.engineOsc.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);

      this.engineOsc.start();
      this.isEngineRunning = true;
    } catch (_e) {}
  }

  /**
   * Modulates engine pitch and volume based on speed (km/h).
   */
  public updateEngineSpeed(speedKmh: number) {
    if (!this.ctx || !this.isEngineRunning || !this.engineOsc || !this.engineFilter) return;

    const clampedSpeed = Math.max(0, Math.min(130, speedKmh));
    // Base 28Hz idle up to 105Hz at high speed
    const targetFreq = 28 + (clampedSpeed / 130) * 78;
    const filterFreq = 280 + (clampedSpeed / 130) * 720;

    this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.08);
    this.engineFilter.frequency.setTargetAtTime(filterFreq, this.ctx.currentTime, 0.08);
  }

  /**
   * Stops the engine sound.
   */
  public stopEngine() {
    if (!this.ctx || !this.isEngineRunning || !this.engineGain) return;

    try {
      this.engineGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);
      setTimeout(() => {
        if (this.engineOsc) {
          this.engineOsc.stop();
          this.engineOsc.disconnect();
          this.engineOsc = null;
        }
        this.isEngineRunning = false;
      }, 260);
    } catch (_e) {
      this.isEngineRunning = false;
    }
  }

  /**
   * Plays the classic Indian Auto Rickshaw two-tone horn ("Pee-Poo").
   */
  public playHorn() {
    this.initAudio();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Tone 1: 440 Hz
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(440, now);
      gain1.gain.setValueAtTime(0.18, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      // Tone 2: 554 Hz (Major third harmony)
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(554, now);
      gain2.gain.setValueAtTime(0.16, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.36);
      osc2.stop(now + 0.36);
    } catch (_e) {}
  }

  /**
   * Plays a UI confirmation blip.
   */
  public playBlip() {
    this.initAudio();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.1); // A5

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.13);
    } catch (_e) {}
  }

  /**
   * Cycles through GTA-style Radio stations (Off -> Station 1 -> Station 2 -> Station 3 -> Off).
   */
  public toggleRadio(): string {
    this.initAudio();
    this.currentRadioStation = (this.currentRadioStation + 1) % this.radioStations.length;

    if (this.radioInterval) {
      clearInterval(this.radioInterval);
      this.radioInterval = null;
    }

    if (this.currentRadioStation > 0 && this.ctx) {
      // Start procedural melodic arpeggio loop for the radio station
      let noteIndex = 0;
      // Station 1: Retro Malayalam scale (Mohanam / Pentatonic Major: C, D, E, G, A)
      const scale1 = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25];
      // Station 2: Electro Synthwave (A minor: A, C, D, E, G)
      const scale2 = [220.0, 261.63, 293.66, 329.63, 392.0, 440.0];
      // Station 3: Lo-Fi Chords
      const scale3 = [196.0, 246.94, 293.66, 369.99, 440.0];

      const activeScale =
        this.currentRadioStation === 1 ? scale1 : this.currentRadioStation === 2 ? scale2 : scale3;

      const tempoMs = this.currentRadioStation === 1 ? 320 : this.currentRadioStation === 2 ? 240 : 420;

      this.radioInterval = setInterval(() => {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const freq = activeScale[noteIndex % activeScale.length];
        noteIndex++;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = this.currentRadioStation === 2 ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (tempoMs / 1000) * 0.9);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + tempoMs / 1000);
      }, tempoMs);
    }

    return this.radioStations[this.currentRadioStation];
  }

  public getCurrentStationName(): string {
    return this.radioStations[this.currentRadioStation];
  }
}
