/**
 * PULSO — analyzer.js
 * Módulo de subida y análisis visual en el navegador mediante Canvas API.
 * Extrae paleta cromática, brillo, contraste, intensidad y vector direccional de movimiento.
 */

export class VideoAnalyzer {
  constructor(options = {}) {
    this.sampleRate = options.sampleRate || 8; // Muestras por segundo
    this.maxSamples = options.maxSamples || 160; // Límite para evitar bloqueos en videos largos
    this.downscaleWidth = options.downscaleWidth || 128;
    this.downscaleHeight = options.downscaleHeight || 72;
    this.aborted = false;
    this._analysisRunId = 0;
  }

  /**
   * Valida un archivo de video seleccionado por el usuario.
   */
  static validateFile(file) {
    if (!file) return { valid: false, error: 'No se seleccionó ningún archivo.' };
    const validMimes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    const hasValidExt = /\.(mp4|webm|ogg|mov|m4v)$/i.test(file.name);
    if (!validMimes.includes(file.type) && !hasValidExt) {
      return {
        valid: false,
        error: `Formato de video no compatible (${file.type || 'desconocido'}). Usa MP4, WebM o MOV.`
      };
    }
    const maxSize = 250 * 1024 * 1024; // 250 MB
    if (file.size > maxSize) {
      return { valid: false, error: 'El archivo supera el límite de 250 MB.' };
    }
    return { valid: true };
  }

  static cancelSyntheticVideo() {
    this._cancelSyntheticVideo?.();
  }

  abort() {
    this.aborted = true;
    this._analysisRunId++;
    this._abortCurrent?.();
    this._abortCurrent = null;
  }

  /**
   * Carga el archivo en un elemento HTMLVideoElement en memoria y extrae metadatos.
   */
  async loadVideo(fileOrBlob) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';

      const url = URL.createObjectURL(fileOrBlob);
      video.src = url;

      video.onloadedmetadata = () => {
        if (!video.duration || video.duration === Infinity) {
          // Algunos WebM no tienen duración explícita hasta que se hace seek
          video.currentTime = 1e10;
          video.ontimeupdate = () => {
            video.ontimeupdate = null;
            video.currentTime = 0;
            resolve({ video, url, duration: video.duration, width: video.videoWidth, height: video.videoHeight });
          };
        } else {
          resolve({ video, url, duration: video.duration, width: video.videoWidth, height: video.videoHeight });
        }
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('No se pudo decodificar el video. El códec podría no ser compatible con el navegador.'));
      };
    });
  }

  /**
   * Analiza el video muestreando fotogramas de forma temporal determinista.
   * @param {HTMLVideoElement} video
   * @param {Function} onProgress (percent: number, currentMetrics: object) => void
   * @returns {Promise<AnalysisData>}
   */
  async analyze(video, onProgress = () => {}) {
    const runId = ++this._analysisRunId;
    this.aborted = false;
    let resolveAbort;
    const cancelled = new Promise(resolve => { resolveAbort = resolve; });
    this._abortCurrent = resolveAbort;
    const duration = video.duration || 5;
    const targetSamples = Math.min(this.maxSamples, Math.max(12, Math.round(duration * this.sampleRate)));
    const timeStep = duration / targetSamples;

    const canvas = document.createElement('canvas');
    canvas.width = this.downscaleWidth;
    canvas.height = this.downscaleHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const samples = [];
    let prevLuma = null;

    for (let i = 0; i < targetSamples; i++) {
      if (this.aborted || runId !== this._analysisRunId) {
        throw new Error('Análisis cancelado por el usuario.');
      }

      const targetTime = Math.min(duration - 0.05, i * timeStep);
      const seekCompleted = await Promise.race([
        this._seekVideo(video, targetTime).then(() => true), cancelled
      ]);
      if (!seekCompleted || this.aborted || runId !== this._analysisRunId) {
        throw new Error('Análisis cancelado por el usuario.');
      }

      ctx.drawImage(video, 0, 0, this.downscaleWidth, this.downscaleHeight);
      const imgData = ctx.getImageData(0, 0, this.downscaleWidth, this.downscaleHeight);
      const metrics = this._computeMetrics(imgData, prevLuma, targetTime);
      prevLuma = metrics.luma;

      samples.push(metrics);

      onProgress({
        progress: (i + 1) / targetSamples,
        sampleIndex: i,
        totalSamples: targetSamples,
        metrics: {
          time: targetTime,
          dominantColor: metrics.dominantColor,
          brightness: metrics.brightness,
          contrast: metrics.contrast,
          motion: metrics.motion,
          motionDx: metrics.motionDx,
          motionDy: metrics.motionDy,
          isStill: metrics.isStill
        }
      });
    }

    // Post-procesamiento: calcular derivadas temporales y normalización global
    const processed = this._postProcessSamples(samples, duration);
    processed.width = video.videoWidth || 1;
    processed.height = video.videoHeight || 1;
    if (runId === this._analysisRunId) this._abortCurrent = null;
    return processed;
  }

  _seekVideo(video, time) {
    return new Promise((resolve) => {
      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);
        resolve();
      };
      video.addEventListener('seeked', onSeeked);
      video.currentTime = time;
    });
  }

  /**
   * Extrae métricas de color, luminosidad y diferencia entre fotogramas.
   */
  _computeMetrics(imgData, prevLuma, timestamp) {
    const data = imgData.data;
    const totalPixels = this.downscaleWidth * this.downscaleHeight;
    const luma = new Float32Array(totalPixels);

    let sumLuma = 0;
    let sumLumaSq = 0;

    // Histograma de color para extracción de paleta (cuantización en espacio HSV)
    const hueBins = new Float32Array(12); // 12 sectores de 30 grados
    let totalSat = 0;
    let totalR = 0, totalG = 0, totalB = 0;

    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      totalR += r;
      totalG += g;
      totalB += b;

      // Luminancia ITU-R BT.601
      const y = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      luma[p] = y;
      sumLuma += y;
      sumLumaSq += y * y;

      // Color en HSL
      const hsl = rgbToHsl(r, g, b);
      const binIdx = Math.min(11, Math.floor(hsl[0] / 30));
      hueBins[binIdx] += hsl[1] * (0.2 + hsl[2] * 0.8); // ponderar por saturación y luminosidad
      totalSat += hsl[1];
    }

    const meanLuma = sumLuma / totalPixels;
    const variance = Math.max(0, (sumLumaSq / totalPixels) - (meanLuma * meanLuma));
    const contrast = Math.min(1, Math.sqrt(variance) * 2.5);

    // Color promedio
    const avgR = Math.round(totalR / totalPixels);
    const avgG = Math.round(totalG / totalPixels);
    const avgB = Math.round(totalB / totalPixels);
    const avgHsl = rgbToHsl(avgR, avgG, avgB);

    // Encontrar el tono dominante del histograma
    let maxBin = 0, maxBinVal = 0;
    for (let b = 0; b < 12; b++) {
      if (hueBins[b] > maxBinVal) {
        maxBinVal = hueBins[b];
        maxBin = b;
      }
    }
    const dominantHue = maxBin * 30 + 15;
    const avgSat = totalSat / totalPixels;
    const dominantRgb = hslToRgb(dominantHue, Math.max(0.35, avgSat), Math.max(0.25, Math.min(0.75, meanLuma)));

    // Detección de movimiento y centro de masa direccional
    let motionSum = 0;
    let motionCenterX = 0;
    let motionCenterY = 0;
    const gridSize = 4;
    const motionGrid = new Float32Array(gridSize * gridSize);

    if (prevLuma) {
      for (let y = 0; y < this.downscaleHeight; y++) {
        for (let x = 0; x < this.downscaleWidth; x++) {
          const idx = y * this.downscaleWidth + x;
          const diff = Math.abs(luma[idx] - prevLuma[idx]);
          // Umbral de ruido sensorial
          if (diff > 0.06) {
            motionSum += diff;
            motionCenterX += (x / this.downscaleWidth - 0.5) * diff;
            motionCenterY += (y / this.downscaleHeight - 0.5) * diff;
            const gx = Math.min(gridSize - 1, Math.floor(x / this.downscaleWidth * gridSize));
            const gy = Math.min(gridSize - 1, Math.floor(y / this.downscaleHeight * gridSize));
            motionGrid[gy * gridSize + gx] += diff;
          }
        }
      }
    }

    const rawMotion = motionSum / (totalPixels * 0.25);
    const motion = Math.min(1, rawMotion);

    let motionDx = 0;
    let motionDy = 0;
    if (motionSum > 0.001) {
      motionDx = Math.max(-1, Math.min(1, (motionCenterX / motionSum) * 2.5));
      motionDy = Math.max(-1, Math.min(1, (motionCenterY / motionSum) * 2.5));
    }

    const isStill = motion < 0.05;
    const gridTotal = motionGrid.reduce((sum, value) => sum + value, 0);
    if (gridTotal > 0) {
      for (let i = 0; i < motionGrid.length; i++) motionGrid[i] /= gridTotal;
    }

    return {
      time: timestamp,
      brightness: meanLuma,
      contrast: contrast,
      dominantColor: {
        r: dominantRgb[0],
        g: dominantRgb[1],
        b: dominantRgb[2],
        h: dominantHue,
        s: avgSat,
        l: meanLuma,
        hex: rgbToHex(dominantRgb[0], dominantRgb[1], dominantRgb[2])
      },
      avgColor: {
        r: avgR,
        g: avgG,
        b: avgB,
        hex: rgbToHex(avgR, avgG, avgB)
      },
      motion: motion,
      motionDx: motionDx,
      motionDy: motionDy,
      motionGrid: Array.from(motionGrid),
      isStill: isStill,
      luma: luma // referencia temporal para siguiente frame
    };
  }

  _postProcessSamples(samples, duration) {
    let globalMotionSum = 0;
    let maxMotion = 0.001;

    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      globalMotionSum += s.motion;
      if (s.motion > maxMotion) maxMotion = s.motion;

      // Calcular derivada temporal de velocidad
      if (i > 0) {
        const dt = Math.max(0.01, s.time - samples[i - 1].time);
        s.motionSpeed = Math.abs(s.motion - samples[i - 1].motion) / dt;
      } else {
        s.motionSpeed = 0;
      }

      // Eliminar búfer luma para liberar memoria
      delete s.luma;
    }

    const avgMotion = globalMotionSum / samples.length;

    // Calcular paleta global dominante (3 a 5 colores representativos)
    const globalPalette = this._extractGlobalPalette(samples);

    return {
      duration,
      sampleCount: samples.length,
      averageMotion: avgMotion,
      maxMotion: maxMotion,
      samples,
      globalPalette,
      summary: {
        dominantHue: globalPalette[0]?.h || 180,
        averageBrightness: samples.reduce((acc, s) => acc + s.brightness, 0) / samples.length,
        averageContrast: samples.reduce((acc, s) => acc + s.contrast, 0) / samples.length,
        stillRatio: samples.filter(s => s.isStill).length / samples.length
      }
    };
  }

  _extractGlobalPalette(samples) {
    const buckets = {};
    for (const s of samples) {
      const hCluster = Math.round(s.dominantColor.h / 45) * 45 % 360;
      if (!buckets[hCluster]) {
        buckets[hCluster] = { count: 0, sample: s.dominantColor };
      }
      buckets[hCluster].count++;
    }

    const sorted = Object.values(buckets).sort((a, b) => b.count - a.count);
    return sorted.slice(0, 5).map(b => b.sample);
  }

  /**
   * Genera un video sintético experimental en Canvas para pruebas instantáneas
   * sin requerir que el usuario posea un archivo de video al probar.
   */
  static generateSyntheticVideoBlob(durationSeconds = 6) {
    this.cancelSyntheticVideo();
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');

      if (!canvas.captureStream || typeof MediaRecorder === 'undefined') {
        throw new Error('Este navegador no permite crear el video de ejemplo. Prueba con un archivo de video.');
      }

      const stream = canvas.captureStream(30);
      let mimeType = 'video/webm';
      if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
        mimeType = 'video/mp4;codecs=avc1';
      } else if (!MediaRecorder.isTypeSupported('video/webm')) {
        mimeType = '';
      }
      if (!ctx) throw new Error('No se pudo preparar el lienzo para el video de ejemplo.');

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks = [];
      let intervalId;
      let wasCancelled = false;
      let settled = false;
      const finishStream = () => stream.getTracks().forEach(track => track.stop());
      const cleanUp = () => {
        clearInterval(intervalId);
        finishStream();
        if (VideoAnalyzer._cancelSyntheticVideo === cancel) VideoAnalyzer._cancelSyntheticVideo = null;
      };
      const cancel = () => {
        if (settled) return;
        wasCancelled = true;
        clearInterval(intervalId);
        if (recorder.state === 'recording') recorder.stop();
        else { cleanUp(); settled = true; reject(new Error('Generación del video de ejemplo cancelada.')); }
      };
      VideoAnalyzer._cancelSyntheticVideo = cancel;
      recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      recorder.onstop = () => {
        cleanUp();
        if (wasCancelled) {
          settled = true;
          reject(new Error('Generación del video de ejemplo cancelada.'));
          return;
        }
        if (!chunks.length) {
          settled = true;
          reject(new Error('El navegador no produjo datos para el video de ejemplo.'));
          return;
        }
        const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
        settled = true;
        resolve(blob);
      };
      recorder.onerror = () => {
        cleanUp();
        settled = true;
        reject(new Error('Falló la grabación del video sintético. Prueba con un archivo de video.'));
      };

      recorder.start();

      const startTime = performance.now();
      intervalId = setInterval(() => {
        const elapsed = (performance.now() - startTime) / 1000;
        if (elapsed >= durationSeconds) {
          clearInterval(intervalId);
          recorder.stop();
          return;
        }

        const t = elapsed;
        // Fondo con gradiente dinámico (día a noche a aurora)
        const hue = (t * 40) % 360;
        const grad = ctx.createLinearGradient(0, 0, 640, 360);
        grad.addColorStop(0, `hsl(${hue}, 70%, 15%)`);
        grad.addColorStop(1, `hsl(${(hue + 60) % 360}, 60%, 5%)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 640, 360);

        // Orbes y formas orgánicas con movimiento fluido
        const numShapes = 4;
        for (let i = 0; i < numShapes; i++) {
          const phase = t * (1.2 + i * 0.4) + i * 1.5;
          const x = 320 + Math.sin(phase) * 200 * (1 - i * 0.15);
          const y = 180 + Math.cos(phase * 0.8) * 110;
          const radius = 25 + Math.sin(t * 3 + i) * 15;
          const orbHue = (hue + i * 75) % 360;

          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${orbHue}, 85%, 60%, 0.8)`;
          ctx.shadowColor = `hsl(${orbHue}, 90%, 50%)`;
          ctx.shadowBlur = 20;
          ctx.fill();
        }
        ctx.shadowBlur = 0;

        // Pulso de onda rítmica
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x < 640; x += 10) {
          const y = 180 + Math.sin(x * 0.02 + t * 4) * 40 * Math.sin(t * 2);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

      }, 1000 / 30);
    });
  }
}

// Funciones auxiliares de conversión cromática
export function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
      case g: h = ((b - r) / d + 2) * 60; break;
      case b: h = ((r - g) / d + 4) * 60; break;
    }
  }
  return [Math.round(h), s, l];
}

export function hslToRgb(h, s, l) {
  h = (h % 360 + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

export function rgbToHex(r, g, b) {
  const toHex = c => Math.min(255, Math.max(0, c)).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
