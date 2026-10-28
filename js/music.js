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

// Biblioteca de timbres etéreos sintetizados con Web Audio: no requiere
// archivos externos y funciona también sin conexión. Las voces originales
// siguen sonando; estos timbres se suman como capas armónicas.
export const SOUND_LIBRARY = Object.freeze({
  theremin: { name: 'Theremín', character: 'portamento y vibrato continuo' },
  handpan: { name: 'Handpan', character: 'parciales metálicos y caída percusiva' },
  analogPad: { name: 'Pad analógico', character: 'osciladores desafinados y filtro lento' },
  dreamGuitar: { name: 'Guitarra dream', character: 'ataque suave, chorus y eco' },
  bowedStrings: { name: 'Cuerdas frotadas', character: 'armónicos sostenidos y vibrato' },
  distantChoir: { name: 'Coro lejano', character: 'armónicos vocales y reverberación' }
});

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
        duration: Math.min(bassStep * 0.85, duration - t),
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
          duration: Math.min(0.12, duration - s.time),
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

    // Capas complementarias de la biblioteca etérea. Las pistas base no se
    // reemplazan: cada copia suma un color tímbrico con menor intensidad.
    const baseEvents = events.slice();
    const melodicVoices = ['theremin', 'dreamGuitar', 'bowedStrings'];
    let melodicIndex = 0;
    for (const note of baseEvents) {
      if (note.track === 'melody' && melodicIndex++ % 2 === 0) {
        const voice = melodicVoices[(melodicIndex + Math.round(note.velocity * 10)) % melodicVoices.length];
        events.push({ ...note, track: 'ethereal', voice, velocity: note.velocity * 0.27,
          duration: Math.min(duration - note.time, Math.max(note.duration, voice === 'theremin' ? 1.05 : 0.9)) });
      } else if (note.track === 'pad') {
        events.push({ ...note, track: 'ethereal', voice: 'analogPad', velocity: note.velocity * 0.22 });
        if (Math.round(note.time * 10) % 3 === 0) {
          events.push({ ...note, track: 'ethereal', voice: 'distantChoir', midi: note.midi + 12,
            freq: note.freq * 2, velocity: note.velocity * 0.14,
            pan: Math.max(-0.7, Math.min(0.7, note.pan * 0.65)),
            duration: Math.min(duration - note.time, Math.max(note.duration, 2.2)) });
        }
      }
    }

    // El handpan aparece en impulsos visuales separados, no como un pulso
    // electrónico constante. El grado musical sigue la tonalidad del video.
    let lastHandpanTime = -Infinity;
    for (const sample of samples) {
      if ((sample.motion < 0.24 && sample.motionSpeed < 0.75) || sample.time - lastHandpanTime < 0.72) continue;
      const degree = Math.floor(((sample.dominantColor.h || 0) / 360) * scaleLen * 2);
      const midi = getScaleNote(degree, 0);
      events.push({ time: sample.time, duration: Math.min(0.72, duration - sample.time), track: 'ethereal',
        voice: 'handpan', midi, freq: midiToFreq(midi), velocity: 0.2 + Math.min(0.2, sample.motion * 0.2),
        pan: sample.motionDx || 0, filterCutoff: 5200, color: sample.dominantColor.hex });
      lastHandpanTime = sample.time;
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
      const seed = Math.sin((i + 1) * 12.9898 + c * 78.233) * 43758.5453;
      const noise = (seed - Math.floor(seed)) * 2 - 1;
      const n = noise * Math.pow(1 - i / length, decay);
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
    if (note.voice && SOUND_LIBRARY[note.voice]) {
      this._scheduleEtherealVoice(ctx, targetNode, note, time);
      return;
    }
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
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.freq, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(Math.min(350, note.filterCutoff), time);

      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(note.velocity * 0.5, time + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + note.duration);

    } else { // texture
      osc.type = 'sine';
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

  _scheduleEtherealVoice(ctx, targetNode, note, time) {
    const voice = note.voice;
    const mixer = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const envelope = ctx.createGain();
    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    const destination = panner || targetNode;
    const oscillators = [];
    const activeSources = [];
    const cleanupNodes = [mixer, filter, envelope];
    const duration = Math.max(0.08, note.duration || 0.8);
    const frequency = Math.max(25, note.freq || 220);
    const peak = Math.max(0.0001, Math.min(0.18, note.velocity * 0.3));
    const settings = {
      theremin: { attack: 0.24, release: 0.5, cutoff: 4200, waveform: 'sine' },
      handpan: { attack: 0.008, release: 0.85, cutoff: 6500, waveform: 'sine' },
      analogPad: { attack: 0.7, release: 1.1, cutoff: 2600, waveform: 'triangle' },
      dreamGuitar: { attack: 0.012, release: 0.55, cutoff: 5200, waveform: 'triangle' },
      bowedStrings: { attack: 0.48, release: 0.8, cutoff: 3600, waveform: 'sawtooth' },
      distantChoir: { attack: 0.9, release: 1.25, cutoff: 3000, waveform: 'sine' }
    }[voice];
    const attack = Math.min(settings.attack, duration * 0.58);
    const release = Math.min(settings.release, duration * 0.48);
    const releaseStart = Math.max(time + attack, time + duration - release);
    const releaseEnd = time + duration + release;

    filter.type = voice === 'handpan' ? 'bandpass' : 'lowpass';
    filter.frequency.setValueAtTime(settings.cutoff, time);
    filter.Q.setValueAtTime(voice === 'handpan' ? 1.8 : 0.65, time);
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.linearRampToValueAtTime(peak, time + attack);
    if (voice === 'handpan') {
      const decayLevel = Math.max(0.0001, peak * 0.14);
      const decayEnd = Math.min(releaseStart, time + duration * 0.42);
      envelope.gain.exponentialRampToValueAtTime(decayLevel, Math.max(time + attack + 0.025, decayEnd));
    } else {
      envelope.gain.setValueAtTime(peak, releaseStart);
    }
    envelope.gain.exponentialRampToValueAtTime(0.0001, releaseEnd);
    mixer.connect(filter);
    filter.connect(envelope);
    envelope.connect(destination);
    if (panner) {
      panner.pan.setValueAtTime(Math.max(-1, Math.min(1, note.pan || 0)), time);
      panner.connect(targetNode);
    }

    const addTone = (ratio, level, waveform = settings.waveform, detune = 0, glide = false) => {
      const osc = ctx.createOscillator();
      const layer = ctx.createGain();
      osc.type = waveform;
      const targetFreq = frequency * ratio;
      osc.frequency.setValueAtTime(glide ? targetFreq * 0.965 : targetFreq, time);
      if (glide) osc.frequency.linearRampToValueAtTime(targetFreq, time + Math.min(0.35, attack + 0.08));
      osc.detune.setValueAtTime(detune, time);
      layer.gain.setValueAtTime(level, time);
      osc.connect(layer);
      layer.connect(mixer);
      osc.start(time);
      osc.stop(releaseEnd + (voice === 'dreamGuitar' ? 1.1 : 0.03));
      oscillators.push(osc);
      activeSources.push({ source: osc, layer });
      return osc;
    };

    if (voice === 'theremin') {
      const lead = addTone(1, 0.68, 'sine', 0, true);
      addTone(1.0025, 0.2, 'sine', 0, true);
      const vibrato = ctx.createOscillator();
      const depth = ctx.createGain();
      vibrato.frequency.setValueAtTime(4.7, time);
      depth.gain.setValueAtTime(frequency * 0.004, time);
      vibrato.connect(depth); depth.connect(lead.frequency);
      vibrato.start(time); vibrato.stop(releaseEnd + 0.03);
      oscillators.push(vibrato);
      cleanupNodes.push(depth);
    } else if (voice === 'handpan') {
      addTone(1, 0.72, 'sine');
      addTone(2.71, 0.24, 'sine', 4);
      addTone(4.16, 0.12, 'sine', -3);
      addTone(5.43, 0.06, 'sine', 2);
    } else if (voice === 'analogPad') {
      addTone(0.5, 0.38, 'triangle', -7);
      addTone(1, 0.43, 'sawtooth', 5);
      addTone(1.005, 0.27, 'triangle', 11);
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      lfo.frequency.setValueAtTime(0.16, time);
      depth.gain.setValueAtTime(620, time);
      lfo.connect(depth); depth.connect(filter.frequency);
      lfo.start(time); lfo.stop(releaseEnd + 0.03);
      oscillators.push(lfo);
      cleanupNodes.push(depth);
    } else if (voice === 'dreamGuitar') {
      addTone(1, 0.66, 'triangle', -3);
      addTone(2.004, 0.18, 'sine', 4);
      addTone(3.01, 0.07, 'sine', -5);
    } else if (voice === 'bowedStrings') {
      addTone(0.5, 0.22, 'triangle', -4);
      addTone(1, 0.58, 'sawtooth', 3);
      addTone(2, 0.16, 'triangle', 6);
      const vibrato = ctx.createOscillator();
      const depth = ctx.createGain();
      vibrato.frequency.setValueAtTime(5.2, time);
      depth.gain.setValueAtTime(frequency * 0.002, time);
      vibrato.connect(depth); depth.connect(oscillators[1].frequency);
      vibrato.start(time); vibrato.stop(releaseEnd + 0.03);
      oscillators.push(vibrato);
      cleanupNodes.push(depth);
    } else { // coro lejano
      addTone(0.5, 0.22, 'sine', -7);
      addTone(1, 0.46, 'sine', 3);
      addTone(1.5, 0.2, 'triangle', 8);
      addTone(2, 0.09, 'sine', -2);
      for (const formant of [720, 1180]) {
        const band = ctx.createBiquadFilter();
        const formantGain = ctx.createGain();
        band.type = 'bandpass';
        band.frequency.setValueAtTime(formant, time);
        band.Q.setValueAtTime(1.6, time);
        formantGain.gain.setValueAtTime(0.16, time);
        envelope.connect(band);
        band.connect(formantGain);
        formantGain.connect(destination);
        cleanupNodes.push(band, formantGain);
      }
    }

    if (voice === 'dreamGuitar') {
      const echo = ctx.createDelay(1.2);
      const wet = ctx.createGain();
      const feedback = ctx.createGain();
      const chorus = ctx.createDelay(0.05);
      const chorusWet = ctx.createGain();
      const chorusLfo = ctx.createOscillator();
      const chorusDepth = ctx.createGain();
      echo.delayTime.setValueAtTime(0.34, time);
      wet.gain.setValueAtTime(0.2, time);
      feedback.gain.setValueAtTime(0.26, time);
      chorus.delayTime.setValueAtTime(0.022, time);
      chorusWet.gain.setValueAtTime(0.2, time);
      chorusLfo.frequency.setValueAtTime(0.22, time);
      chorusDepth.gain.setValueAtTime(0.006, time);
      chorusLfo.connect(chorusDepth);
      chorusDepth.connect(chorus.delayTime);
      chorusLfo.start(time); chorusLfo.stop(releaseEnd + 1.1);
      oscillators.push(chorusLfo);
      envelope.connect(echo);
      echo.connect(wet);
      echo.connect(feedback);
      feedback.connect(echo);
      wet.connect(destination);
      envelope.connect(chorus);
      chorus.connect(chorusWet);
      chorusWet.connect(destination);
      cleanupNodes.push(echo, wet, feedback, chorus, chorusWet, chorusDepth);
    }

    if (panner) cleanupNodes.push(panner);
    let remainingSources = oscillators.length;
    for (const source of oscillators) {
      this.activeNodes.push(source);
      source.onended = () => {
        const index = this.activeNodes.indexOf(source);
        if (index !== -1) this.activeNodes.splice(index, 1);
        try { source.disconnect(); } catch (_) {}
        remainingSources--;
        if (remainingSources === 0) {
          try {
            for (const item of activeSources) item.layer.disconnect();
            cleanupNodes.forEach(node => node.disconnect());
          } catch (_) {}
        }
      };
    }
  }

  /**
   * Renderiza la partitura completa de forma offline y determinista a un AudioBuffer.
   * Ideal para exportación rápida a WAV y MP3 con calidad de estudio.
   */
  async renderOffline(score) {
    const sampleRate = 44100;
    const duration = score.duration;
    const offlineCtx = new OfflineAudioContext(2, Math.ceil(sampleRate * (duration + 3.5)), sampleRate);

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
