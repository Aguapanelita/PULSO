/**
 * PULSO — music.js
 * Generación musical algorítmica y motor de síntesis Web Audio API.
 * Traduce colores, contraste, movimiento y reposo en una composición armónica coherente.
 * Soporta reproducción en tiempo real y renderizado offline determinista.
 */

const SCALES = {
  dorian: [0, 2, 3, 5, 7, 9, 10],           // Cálido, nostálgico, introspectivo
  lydian: [0, 2, 4, 6, 7, 9, 11],          // Luminoso, aéreo, etéreo
  aeolian: [0, 2, 3, 5, 7, 8, 10],         // Menor natural, melancólico
  phrygian: [0, 1, 3, 5, 7, 8, 10],        // Tenso, místico, exótico
  major_penta: [0, 2, 4, 7, 9],            // Abierto, claro, consonante
  minor_penta: [0, 3, 5, 7, 10]            // Profundo, contemplativo
};

export class MusicComposer {
  /**
   * Determina la tonalidad, modo y escala a partir de la paleta y características del video.
   */
  static selectScaleSystem(summary) {
    const hue = summary.dominantHue % 360;
    let mode = 'aeolian';
    let root = 57; // La3 (220 Hz)
    let modeName = 'La menor eólica';

    if (hue >= 340 || hue < 40) {
      // Rojos / Naranjas: Cálido, terrenal
      mode = 'dorian';
      root = 50; // Re3
      modeName = 'Re dórico';
    } else if (hue >= 40 && hue < 100) {
      // Amarillos / Dorados: Radiante, abierto
      mode = 'major_penta';
      root = 48; // Do3
      modeName = 'Do mayor pentatónico';
    } else if (hue >= 100 && hue < 170) {
      // Verdes / Esmeraldas: Natural, etéreo
      mode = 'lydian';
      root = 53; // Fa3
      modeName = 'Fa lidio';
    } else if (hue >= 170 && hue < 250) {
      // Cianes / Azules: Acuático, profundo
      mode = 'minor_penta';
      root = 57; // La3
      modeName = 'La menor pentatónico';
    } else {
      // Violetas / Magentas: Místico, dramático
      mode = 'phrygian';
      root = 52; // Mi3
      modeName = 'Mi frigio';
    }

    return { mode, root, modeName, scaleIntervals: SCALES[mode] };
  }

  /**
   * Compone una partitura algorítmica completa (`NoteEvent[]`) a partir del análisis visual.
   * La partitura es 100% determinista.
   */
  static compose(analysis) {
    const { samples, duration, summary } = analysis;
    const { root, scaleIntervals, modeName } = this.selectScaleSystem(summary);

    const events = [];
    const scaleLen = scaleIntervals.length;

    const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);
    const getScaleNote = (degree, octaveOffset = 0) => {
      const oct = Math.floor(degree / scaleLen) + octaveOffset;
      const deg = ((degree % scaleLen) + scaleLen) % scaleLen;
      return root + scaleIntervals[deg] + oct * 12;
    };

    // 1. Capa PAD / AMBIENTE (Drones armónicos según color y quietud)
    // Genera bloques armónicos sostenidos cada 2 a 4 segundos
    const padStep = Math.max(2.5, duration / 8);
    for (let t = 0; t < duration; t += padStep) {
      // Buscar muestra visual más cercana
      const sample = samples.find(s => s.time >= t) || samples[0];
      const chordDegree = Math.floor((sample.dominantColor.h / 360) * scaleLen * 2);

      // Tríada o acorde abierto
      const chordDegrees = [chordDegree, chordDegree + 2, chordDegree + 4];
      const chordDuration = Math.min(padStep * 1.35, duration - t);

      for (let c = 0; c < chordDegrees.length; c++) {
        const midi = getScaleNote(chordDegrees[c], -1); // octava baja
        const vel = 0.22 + sample.brightness * 0.15;
        events.push({
          time: t,
          duration: chordDuration,
          track: 'pad',
          midi,
          freq: midiToFreq(midi),
          velocity: vel,
          pan: (c - 1) * 0.45,
          filterCutoff: 400 + sample.brightness * 2200,
          color: sample.dominantColor.hex
        });
      }
    }

    // 2. Capa MELÓDICA / EVENTOS (Reactiva a picos de movimiento)
    let lastMelodyTime = -1;
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];

      // La densidad de eventos depende de la intensidad del movimiento
      const minInterval = 0.18 + (1 - s.motion) * 0.55;
      if (s.time - lastMelodyTime < minInterval) continue;

      // Picos de movimiento o cambios cromáticos disparan notas
      if (s.motion > 0.08 || s.motionSpeed > 0.8) {
        lastMelodyTime = s.time;

        // Selección de nota melódica: influida por brillo (altura) y tono de color (grado)
        const pitchRegister = Math.floor(s.brightness * 8); // 0 a 7
        const chromaticDegree = Math.floor((s.dominantColor.h / 360) * scaleLen * 3);
        const midi = getScaleNote(chromaticDegree + pitchRegister, 0);

        // Duración: movimiento rápido produce notas staccato cortas; movimiento suave produce notas largas
        const noteDur = s.motionSpeed > 1.2 ? 0.2 : (0.35 + (1 - s.motion) * 0.8);
        const vel = Math.min(0.95, 0.4 + s.motion * 0.55);

        events.push({
          time: s.time,
          duration: Math.min(noteDur, duration - s.time),
          track: 'melody',
          midi,
          freq: midiToFreq(midi),
          velocity: vel,
          pan: s.motionDx, // Dirección horizontal de movimiento controla paneo estéreo
          filterCutoff: 800 + s.contrast * 4500,
          color: s.dominantColor.hex
        });
      }
    }

    // 3. Capa BAJO / ANCLAJE (Pulsos en transiciones o cambios estructurales)
    const bassStep = Math.max(1.8, duration / 12);
    for (let t = 0; t < duration; t += bassStep) {
      const sample = samples.find(s => s.time >= t) || samples[0];
      const midi = getScaleNote(0, -2); // Tónica en octava profunda
      events.push({
        time: t,
        duration: bassStep * 0.85,
        track: 'bass',
        midi,
        freq: midiToFreq(midi),
        velocity: 0.45 + (1 - sample.brightness) * 0.35, // Escenas oscuras tienen bajo más pronunciado
        pan: 0,
        filterCutoff: 220 + sample.contrast * 600,
        color: sample.dominantColor.hex
      });
    }

    // 4. Capa TEXTURA / PERCUSIÓN SUTIL (Acentos en picos de aceleración)
    for (const s of samples) {
      if (s.motionSpeed > 1.8 && s.motion > 0.25) {
        events.push({
          time: s.time,
          duration: 0.12,
          track: 'texture',
          midi: 84,
          freq: 2400 + s.dominantColor.h * 4,
          velocity: Math.min(0.65, s.motionSpeed * 0.2),
          pan: s.motionDx,
          filterCutoff: 3000 + s.brightness * 4000,
          color: s.dominantColor.hex
        });
      }
    }

    // Ordenar eventos cronológicamente
    events.sort((a, b) => a.time - b.time);

    return {
      duration,
      modeName,
      rootMidi: root,
      events,
      totalNotes: events.length
    };
  }
}

/**
 * Sintetizador Web Audio API: renderiza las notas programadas tanto en tiempo real como en OfflineAudioContext.
 */
export class MusicSynthesizer {
  constructor() {
    this.audioCtx = null;
    this.score = null;
    this.masterGain = null;
    this.reverbNode = null;
    this.activeNodes = [];
    this.isPlaying = false;
    this.startTime = 0;
    this.pauseOffset = 0;
    this.outputDestination = null;
  }

  init(audioCtx = null) {
    if (!this.audioCtx) {
      this.audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    this._setupAudioGraph(this.audioCtx);
  }

  _setupAudioGraph(ctx) {
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0.85;

    // Compresor de dinámica para evitar saturación
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-12, ctx.currentTime);
    compressor.knee.setValueAtTime(30, ctx.currentTime);
    compressor.ratio.setValueAtTime(8, ctx.currentTime);
    compressor.attack.setValueAtTime(0.003, ctx.currentTime);
    compressor.release.setValueAtTime(0.25, ctx.currentTime);

    // Reverb por convolución
    this.reverbNode = ctx.createConvolver();
    this.reverbNode.buffer = this._createImpulseResponse(ctx, 2.2, 2.8);
    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.35;

    this.masterGain.connect(compressor);
    this.masterGain.connect(this.reverbNode);
    this.reverbNode.connect(reverbGain);
    reverbGain.connect(compressor);

    compressor.connect(ctx.destination);
    this.outputDestination = compressor;
  }

  _createImpulseResponse(ctx, duration = 2.0, decay = 2.5) {
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const impulse = ctx.createBuffer(2, length, sampleRate);
    for (let c = 0; c < 2; c++) {
      const channelData = impulse.getChannelData(c);
      for (let i = 0; i < length; i++) {
        const n = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
        channelData[i] = n;
      }
    }
    return impulse;
  }

  setScore(score) {
    this.score = score;
    this.pauseOffset = 0;
  }

  play(startOffset = 0) {
    if (!this.score) return;
    this.init();

    this.stop();
    this.isPlaying = true;
    this.pauseOffset = startOffset;
    this.startTime = this.audioCtx.currentTime - startOffset;

    // Programar los eventos desde el offset actual
    const now = this.audioCtx.currentTime;
    for (const note of this.score.events) {
      if (note.time + note.duration < startOffset) continue;
      const scheduledTime = now + Math.max(0, note.time - startOffset);
      this._scheduleNote(this.audioCtx, this.masterGain, note, scheduledTime);
    }
  }

  pause() {
    if (!this.isPlaying) return;
    this.pauseOffset = this.getCurrentTime();
    this.stop();
  }

  stop() {
    this.isPlaying = false;
    // Detener y desconectar osciladores activos
    for (const node of this.activeNodes) {
      try {
        node.stop();
        node.disconnect();
      } catch (_) {}
    }
    this.activeNodes = [];
  }

  getCurrentTime() {
    if (!this.isPlaying || !this.audioCtx) return this.pauseOffset;
    return Math.min(this.score ? this.score.duration : 0, this.audioCtx.currentTime - this.startTime);
  }

  /**
   * Síntesis específica de una nota programada.
   */
  _scheduleNote(ctx, targetNode, note, time) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    let panner = null;
    if (ctx.createStereoPanner) {
      panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(note.pan, time);
    }

    // Configuración según el tipo de pista (track)
    if (note.track === 'pad') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.freq, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(note.filterCutoff, time);

      // Envolvente lenta (ataque suave)
      const atk = Math.min(0.8, note.duration * 0.3);
      const rel = Math.min(1.2, note.duration * 0.4);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(note.velocity * 0.35, time + atk);
      gain.gain.setValueAtTime(note.velocity * 0.35, time + note.duration - rel);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + note.duration);

    } else if (note.track === 'melody') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.freq, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(note.filterCutoff, time);
      filter.Q.setValueAtTime(3.0, time);

      // Envolvente percusiva/pluck
      const atk = 0.015;
      const decay = note.duration * 0.85;
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(note.velocity * 0.6, time + atk);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + atk + decay);

    } else if (note.track === 'bass') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(note.freq, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(Math.min(350, note.filterCutoff), time);

      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(note.velocity * 0.5, time + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + note.duration);

    } else { // texture
      osc.type = 'square';
      osc.frequency.setValueAtTime(note.freq, time);
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(note.filterCutoff, time);

      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(note.velocity * 0.25, time + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + note.duration);
    }

    // Conexión de audio
    osc.connect(filter);
    filter.connect(gain);

    if (panner) {
      gain.connect(panner);
      panner.connect(targetNode);
    } else {
      gain.connect(targetNode);
    }

    osc.start(time);
    osc.stop(time + note.duration + 0.05);

    this.activeNodes.push(osc);
    osc.onended = () => {
      const idx = this.activeNodes.indexOf(osc);
      if (idx !== -1) this.activeNodes.splice(idx, 1);
      try {
        osc.disconnect();
        gain.disconnect();
        filter.disconnect();
        if (panner) panner.disconnect();
      } catch (_) {}
    };
  }

  /**
   * Renderiza la partitura completa de forma offline y determinista a un AudioBuffer.
   * Ideal para exportación rápida a WAV y MP3 con calidad de estudio.
   */
  async renderOffline(score) {
    const sampleRate = 44100;
    const duration = score.duration;
    const offlineCtx = new OfflineAudioContext(2, Math.ceil(sampleRate * (duration + 1.5)), sampleRate);

    const masterGain = offlineCtx.createGain();
    masterGain.gain.value = 0.85;

    const compressor = offlineCtx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-12, 0);
    compressor.ratio.setValueAtTime(8, 0);

    const reverb = offlineCtx.createConvolver();
    reverb.buffer = this._createImpulseResponse(offlineCtx, 2.0, 2.8);
    const reverbGain = offlineCtx.createGain();
    reverbGain.gain.value = 0.35;

    masterGain.connect(compressor);
    masterGain.connect(reverb);
    reverb.connect(reverbGain);
    reverbGain.connect(compressor);
    compressor.connect(offlineCtx.destination);

    for (const note of score.events) {
      this._scheduleNote(offlineCtx, masterGain, note, note.time);
    }

    return await offlineCtx.startRendering();
  }
}
