/**
 * PULSO — video-recorder.js
 * Exportación de video de la escultura en evolución sincronizada con la composición sonora.
 * Renderiza el desarrollo temporal determinista de la geometría desde cero hasta su forma final
 * combinando el stream de video de Three.js con la pista de audio de la Web Audio API.
 */

export class VideoRecorder {
  constructor(sculpture, synthesizer) {
    this.sculpture = sculpture;
    this.synthesizer = synthesizer;
    this.isRecording = false;
    this.aborted = false;
    this.mediaRecorder = null;
  }

  /**
   * Determina el mejor tipo MIME compatible para grabación en el navegador.
   */
  static getSupportedMimeType() {
    const types = [
      { mime: 'video/mp4;codecs=avc1,mp4a.40.2', ext: 'mp4' },
      { mime: 'video/mp4', ext: 'mp4' },
      { mime: 'video/webm;codecs=vp9,opus', ext: 'webm' },
      { mime: 'video/webm;codecs=vp8,opus', ext: 'webm' },
      { mime: 'video/webm', ext: 'webm' }
    ];

    for (const t of types) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t.mime)) {
        return t;
      }
    }
    return { mime: '', ext: 'webm' };
  }

  abort() {
    this.aborted = true;
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try { this.mediaRecorder.stop(); } catch (_) {}
    }
  }

  /**
   * Ejecuta el renderizado de la evolución y graba el video completo sincronizado.
   * @param {Object} options
   * @param {Function} onProgress (percent: number, statusText: string) => void
   * @returns {Promise<Blob>}
   */
  async recordEvolution(options = {}, onProgress = () => {}) {
    this.aborted = false;
    this.isRecording = true;

    const sculpture = this.sculpture;
    const synth = this.synthesizer;
    const score = synth.score;

    if (!score || !sculpture) {
      throw new Error('No hay partitura ni escultura disponibles para exportar.');
    }

    const duration = score.duration;
    const fps = options.fps || 30;
    const formatInfo = VideoRecorder.getSupportedMimeType();

    onProgress(0, 'Preparando motor de renderizado y audio...');

    // 1. Preparar stream de audio dedicado sin interferir con la salida de altavoces
    const audioCtx = synth.audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const audioDest = audioCtx.createMediaStreamDestination();

    // 2. Preparar stream de video del canvas de Three.js
    const canvas = sculpture.renderer.domElement;
    const canvasStream = canvas.captureStream(fps);

    // 3. Crear stream compuesto (video + audio)
    const tracks = [
      ...canvasStream.getVideoTracks(),
      ...audioDest.stream.getAudioTracks()
    ];
    const combinedStream = new MediaStream(tracks);

    // 4. Configurar MediaRecorder
    const recorderOptions = {
      videoBitsPerSecond: 6000000 // 6 Mbps para alta calidad
    };
    if (formatInfo.mime) recorderOptions.mimeType = formatInfo.mime;

    const recorder = new MediaRecorder(combinedStream, recorderOptions);
    this.mediaRecorder = recorder;
    const chunks = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    // 5. Iniciar grabación y ciclo de renderizado determinista
    return new Promise((resolve, reject) => {
      recorder.onstop = () => {
        this.isRecording = false;
        if (this.aborted) {
          reject(new Error('Grabación cancelada por el usuario.'));
          return;
        }
        const finalBlob = new Blob(chunks, { type: formatInfo.mime || 'video/webm' });
        resolve({ blob: finalBlob, extension: formatInfo.ext });
      };

      recorder.onerror = (e) => {
        this.isRecording = false;
        reject(e.error || new Error('Error durante la grabación de video.'));
      };

      recorder.start(100); // Guardar fragmentos cada 100ms

      // Reproducir notas en el stream de audio
      const startTime = audioCtx.currentTime + 0.1;
      for (const note of score.events) {
        synth._scheduleNote(audioCtx, audioDest, note, startTime + note.time);
      }

      // Reiniciar escultura a tiempo 0
      sculpture.updateGrowth(0);

      // Guardar rotación original de cámara
      const initialRotationY = sculpture.sculptureGroup.rotation.y;

      const recordStart = performance.now();
      const totalMs = duration * 1000;

      const renderStep = () => {
        if (this.aborted) {
          recorder.stop();
          return;
        }

        const elapsedMs = performance.now() - recordStart;
        const currentTime = Math.min(duration, elapsedMs / 1000);

        // Actualizar crecimiento determinista de la escultura
        sculpture.updateGrowth(currentTime);

        // Órbita suave cinematográfica para enriquecer la perspectiva 3D
        sculpture.sculptureGroup.rotation.y = initialRotationY + (currentTime / duration) * Math.PI * 0.75;
        sculpture.renderer.render(sculpture.scene, sculpture.camera);

        const progressPercent = Math.min(100, Math.round((currentTime / duration) * 100));
        onProgress(progressPercent, `Renderizando evolución: ${progressPercent}% (${currentTime.toFixed(1)}s / ${duration.toFixed(1)}s)`);

        if (elapsedMs < totalMs + 400) {
          requestAnimationFrame(renderStep);
        } else {
          // Esperar breve cola de reverberación y finalizar
          onProgress(100, 'Finalizando empaquetado del video...');
          setTimeout(() => {
            sculpture.sculptureGroup.rotation.y = initialRotationY;
            if (recorder.state !== 'inactive') recorder.stop();
          }, 500);
        }
      };

      // Comenzar renderizado sincronizado
      requestAnimationFrame(renderStep);
    });
  }
}
