/**
 * PULSO — timeline.js
 * Controlador de sincronización audiovisual unificado.
 * Mantiene sincronizados el reloj de audio Web Audio API, el crecimiento 3D en Three.js y el video original.
 */

export class TimelineController {
  constructor(options = {}) {
    this.synthesizer = options.synthesizer || null;
    this.sculpture = options.sculpture || null;
    this.videoElement = options.videoElement || null;

    this.duration = 10;
    this.currentTime = 0;
    this.isPlaying = false;
    this.loop = false;

    this.onTimeUpdate = options.onTimeUpdate || (() => {});
    this.onPlayStateChange = options.onPlayStateChange || (() => {});
    this.onEnded = options.onEnded || (() => {});

    this._rafId = null;
    this._lastRealTime = 0;
  }

  setDuration(duration) {
    this.duration = Math.max(1, duration);
    this.seek(0);
  }

  play() {
    if (this.isPlaying) return;

    if (this.currentTime >= this.duration - 0.05) {
      this.seek(0);
    }

    this.isPlaying = true;
    this._lastRealTime = performance.now();

    if (this.synthesizer) {
      this.synthesizer.play(this.currentTime);
    }
    if (this.videoElement) {
      this.videoElement.currentTime = this.currentTime;
      this.videoElement.play().catch(() => {});
    }

    this.onPlayStateChange(true);
    this._tick();
  }

  pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;

    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }

    if (this.synthesizer) {
      this.synthesizer.pause();
    }
    if (this.videoElement) {
      this.videoElement.pause();
    }

    this.onPlayStateChange(false);
  }

  togglePlay() {
    if (this.isPlaying) this.pause();
    else this.play();
  }

  seek(targetTime) {
    this.currentTime = Math.max(0, Math.min(this.duration, targetTime));

    if (this.sculpture) {
      this.sculpture.updateGrowth(this.currentTime);
    }
    if (this.videoElement) {
      this.videoElement.currentTime = this.currentTime;
    }

    if (this.isPlaying) {
      if (this.synthesizer) {
        this.synthesizer.play(this.currentTime);
      }
    } else {
      if (this.synthesizer) {
        this.synthesizer.pauseOffset = this.currentTime;
      }
    }

    this.onTimeUpdate(this.currentTime, this.duration, this.currentTime / this.duration);
  }

  _tick() {
    if (!this.isPlaying) return;

    const now = performance.now();
    const dt = (now - this._lastRealTime) / 1000;
    this._lastRealTime = now;

    // Usar el reloj de audio si está disponible para máxima precisión
    if (this.synthesizer && this.synthesizer.isPlaying) {
      this.currentTime = this.synthesizer.getCurrentTime();
    } else {
      this.currentTime += dt;
    }

    if (this.sculpture) {
      this.sculpture.updateGrowth(this.currentTime);
    }

    this.onTimeUpdate(this.currentTime, this.duration, this.currentTime / this.duration);

    if (this.currentTime >= this.duration) {
      if (this.loop) {
        this.seek(0);
        this.play();
      } else {
        this.pause();
        this.seek(this.duration);
        this.onEnded();
        return;
      }
    }

    this._rafId = requestAnimationFrame(() => this._tick());
  }

  dispose() {
    this.pause();
  }
}
