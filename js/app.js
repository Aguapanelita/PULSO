/**
 * PULSO — app.js
 * Orquestador principal de la aplicación.
 * Gestiona el ciclo de vida de la experiencia en 3 pantallas:
 * 1. Inicio: Selección de video, validación y vista previa.
 * 2. Procesamiento: Análisis visual en tiempo real con monitores e indicadores reales.
 * 3. Resultado: Explorador 3D interactivo, reproductor audiovisual sincronizado y centro de exportación.
 */

import { VideoAnalyzer } from './analyzer.js';
import { MusicComposer, MusicSynthesizer } from './music.js';
import { ProceduralSculpture } from './sculpture.js';
import { TimelineController } from './timeline.js';
import { MediaExporter } from './exporter.js';
import { VideoRecorder } from './video-recorder.js';

class PulsoApp {
  constructor() {
    this.analyzer = new VideoAnalyzer();
    this.synthesizer = new MusicSynthesizer();
    this.sculpture = null;
    this.timeline = null;
    this.videoRecorder = null;

    this.currentVideoFile = null;
    this.videoElement = null;
    this.analysisData = null;
    this.musicScore = null;
    this.renderedAudioBuffer = null;

    this.screens = {
      intro: document.getElementById('screen-intro'),
      processing: document.getElementById('screen-processing'),
      result: document.getElementById('screen-result')
    };

    this.initDOM();
  }

  initDOM() {
    // 1. Elementos de Inicio
    this.dropZone = document.getElementById('drop-zone');
    this.fileInput = document.getElementById('file-input');
    this.btnSelectFile = document.getElementById('btn-select-file');
    this.btnDemoVideo = document.getElementById('btn-demo-video');
    this.previewSection = document.getElementById('intro-preview-section');
    this.introVideoPreview = document.getElementById('intro-video-preview');
    this.introVideoInfo = document.getElementById('intro-video-info');
    this.btnStartAnalysis = document.getElementById('btn-start-analysis');

    // 2. Elementos de Procesamiento
    this.procVideoPreview = document.getElementById('proc-video-preview');
    this.procProgressBar = document.getElementById('proc-progress-bar');
    this.procProgressText = document.getElementById('proc-progress-text');
    this.procStatusText = document.getElementById('proc-status-text');
    this.procColorPalette = document.getElementById('proc-color-palette');
    this.procMotionVal = document.getElementById('proc-motion-val');
    this.procBrightVal = document.getElementById('proc-bright-val');
    this.procContrastVal = document.getElementById('proc-contrast-val');
    this.procCompassDir = document.getElementById('proc-compass-dir');
    this.btnCancelAnalysis = document.getElementById('btn-cancel-analysis');

    // 3. Elementos de Resultado
    this.viewport3D = document.getElementById('viewport-3d');
    this.resultTitle = document.getElementById('result-title');
    this.resultInfo = document.getElementById('result-info');
    this.btnPlayPause = document.getElementById('btn-play-pause');
    this.timelineScrubber = document.getElementById('timeline-scrubber');
    this.timeDisplay = document.getElementById('time-display');
    this.btnLoop = document.getElementById('btn-loop');
    this.btnAutoRotate = document.getElementById('btn-autorotate');
    this.btnTogglePip = document.getElementById('btn-toggle-pip');
    this.pipContainer = document.getElementById('pip-container');
    this.pipVideo = document.getElementById('pip-video');
    this.btnReset = document.getElementById('btn-reset');
    this.btnOpenExport = document.getElementById('btn-open-export');

    // 4. Modal de Exportación
    this.exportModal = document.getElementById('export-modal');
    this.btnCloseExport = document.getElementById('btn-close-export');
    this.btnExportWav = document.getElementById('btn-export-wav');
    this.btnExportMp3 = document.getElementById('btn-export-mp3');
    this.btnExportGlb = document.getElementById('btn-export-glb');
    this.btnExportPng = document.getElementById('btn-export-png');
    this.btnExportVideo = document.getElementById('btn-export-video');
    this.exportVideoProgress = document.getElementById('export-video-progress');
    this.exportVideoProgressBar = document.getElementById('export-video-progress-bar');
    this.exportVideoText = document.getElementById('export-video-text');
    this.btnCancelVideoExport = document.getElementById('btn-cancel-video-export');

    // Mensajes y Toast
    this.toastEl = document.getElementById('toast');

    // Inicializar la escena 3D global con formas de cristal flotantes ambientales
    if (this.viewport3D) {
      this.sculpture = new ProceduralSculpture(this.viewport3D);
      this.sculpture.init();
    }

    this.bindEvents();
  }

  showScreen(screenName) {
    document.body.classList.toggle('in-result', screenName === 'result');
    Object.keys(this.screens).forEach(key => {
      this.screens[key].classList.toggle('active', key === screenName);
    });
    if (this.sculpture) {
      // Las figuras flotantes ambientales solo deben mostrarse en la pantalla de inicio
      this.sculpture.setAmbientVisible(screenName === 'intro');
    }
  }

  showToast(message, duration = 3000) {
    if (!this.toastEl) return;
    this.toastEl.textContent = message;
    this.toastEl.classList.add('visible');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this.toastEl.classList.remove('visible');
    }, duration);
  }

  bindEvents() {
    // Selección de archivos
    this.btnSelectFile.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) this.handleSelectedFile(file);
    });

    // Drag and Drop
    ['dragenter', 'dragover'].forEach(name => {
      this.dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        this.dropZone.classList.add('drag-over');
      });
    });
    ['dragleave', 'drop'].forEach(name => {
      this.dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        this.dropZone.classList.remove('drag-over');
      });
    });
    this.dropZone.addEventListener('drop', (e) => {
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) this.handleSelectedFile(file);
    });

    // Video demo sintético
    this.btnDemoVideo.addEventListener('click', () => this.handleDemoVideo());

    // Iniciar análisis
    this.btnStartAnalysis.addEventListener('click', () => this.startAnalysis());

    // Cancelar análisis
    this.btnCancelAnalysis.addEventListener('click', () => {
      this.analyzer.abort();
      if (this.sculpture) {
        this.sculpture.clear();
        this.sculpture.setAmbientVisible(true);
      }
      this.showScreen('intro');
      this.showToast('Análisis cancelado.');
    });

    // Controles de reproducción
    this.btnPlayPause.addEventListener('click', () => {
      if (this.timeline) this.timeline.togglePlay();
    });

    this.timelineScrubber.addEventListener('input', (e) => {
      if (this.timeline) {
        const targetTime = (Number(e.target.value) / 100) * this.timeline.duration;
        this.timeline.seek(targetTime);
      }
    });

    this.btnLoop.addEventListener('click', () => {
      if (this.timeline) {
        this.timeline.loop = !this.timeline.loop;
        this.btnLoop.classList.toggle('active', this.timeline.loop);
        this.showToast(this.timeline.loop ? 'Repetición activada' : 'Repetición desactivada');
      }
    });

    this.btnAutoRotate.addEventListener('click', () => {
      if (this.sculpture) {
        const nextState = !this.sculpture._autoRotate;
        this.sculpture.setAutoRotate(nextState);
        this.btnAutoRotate.classList.toggle('active', nextState);
      }
    });

    this.btnTogglePip.addEventListener('click', () => {
      const isHidden = this.pipContainer.classList.toggle('hidden');
      this.btnTogglePip.classList.toggle('active', !isHidden);
    });

    this.btnReset.addEventListener('click', () => {
      if (this.timeline) this.timeline.pause();
      if (this.sculpture) {
        this.sculpture.clear();
        this.sculpture.setAmbientVisible(true);
      }
      this.showScreen('intro');
    });

    // Modal de Exportación
    this.btnOpenExport.addEventListener('click', () => {
      this.exportModal.classList.add('active');
    });
    this.btnCloseExport.addEventListener('click', () => {
      this.exportModal.classList.remove('active');
    });
    this.exportModal.addEventListener('click', (e) => {
      if (e.target === this.exportModal) this.exportModal.classList.remove('active');
    });

    // Acciones de Exportación
    this.btnExportWav.addEventListener('click', () => this.exportWav());
    this.btnExportMp3.addEventListener('click', () => this.exportMp3());
    this.btnExportGlb.addEventListener('click', () => this.exportGlb());
    this.btnExportPng.addEventListener('click', () => this.exportPng());
    this.btnExportVideo.addEventListener('click', () => this.exportVideo());
    this.btnCancelVideoExport.addEventListener('click', () => {
      if (this.videoRecorder) this.videoRecorder.abort();
    });
  }

  async handleSelectedFile(file) {
    const validation = VideoAnalyzer.validateFile(file);
    if (!validation.valid) {
      this.showToast(validation.error, 4000);
      return;
    }

    this.currentVideoFile = file;
    this.showToast('Cargando video...', 1500);

    try {
      const loaded = await this.analyzer.loadVideo(file);
      this.videoElement = loaded.video;
      this.videoDuration = loaded.duration;

      this.introVideoPreview.src = loaded.url;
      this.introVideoInfo.textContent = `${file.name} · ${loaded.width}×${loaded.height} px · ${loaded.duration.toFixed(1)} s`;
      this.previewSection.classList.remove('hidden');
    } catch (err) {
      this.showToast(err.message, 4000);
    }
  }

  async handleDemoVideo() {
    this.showToast('Generando escena sintética de prueba...', 2000);
    try {
      const blob = await VideoAnalyzer.generateSyntheticVideoBlob(7);
      blob.name = 'escena_sintetica_pulso.webm';
      this.handleSelectedFile(blob);
    } catch (err) {
      this.showToast('Error generando escena de prueba: ' + err.message, 4000);
    }
  }

  async startAnalysis() {
    if (!this.videoElement) return;

    this.showScreen('processing');
    this.procVideoPreview.src = this.introVideoPreview.src;
    this.procVideoPreview.play().catch(() => {});

    try {
      this.procStatusText.textContent = 'Muestreando fotogramas y cuantizando color...';
      const result = await this.analyzer.analyze(this.videoElement, ({ progress, metrics }) => {
        const pct = Math.round(progress * 100);
        this.procProgressBar.style.width = `${pct}%`;
        this.procProgressText.textContent = `${pct}%`;

        // Actualizar monitores en vivo
        this.procMotionVal.textContent = `${Math.round(metrics.motion * 100)}%`;
        this.procBrightVal.textContent = `${Math.round(metrics.brightness * 100)}%`;
        this.procContrastVal.textContent = `${Math.round(metrics.contrast * 100)}%`;

        const deg = Math.round(metrics.motionDx * 45);
        this.procCompassDir.style.transform = `rotate(${deg}deg)`;

        // Actualizar muestra de color
        this._updatePaletteDisplay([metrics.dominantColor]);
      });

      this.analysisData = result;
      this.procStatusText.textContent = 'Traduciendo datos a partitura musical...';

      // 1. Generación de partitura algorítmica
      this.musicScore = MusicComposer.compose(result);

      // 2. Configurar sintetizador
      this.synthesizer.setScore(this.musicScore);

      // 3. Inicializar escultura 3D
      if (!this.sculpture) {
        this.sculpture = new ProceduralSculpture(this.viewport3D);
      }
      this.sculpture.buildFromScore(this.musicScore, result);

      // 4. Configurar controlador de sincronización audiovisual
      this.pipVideo.src = this.introVideoPreview.src;
      this.timeline = new TimelineController({
        synthesizer: this.synthesizer,
        sculpture: this.sculpture,
        videoElement: this.pipVideo,
        onTimeUpdate: (time, duration, pct) => this.onTimelineUpdate(time, duration, pct),
        onPlayStateChange: (isPlaying) => this.onPlayStateChange(isPlaying),
        onEnded: () => this.onPlaybackEnded()
      });
      this.timeline.setDuration(this.musicScore.duration);

      // 5. Configurar información en pantalla de resultado
      this.resultTitle.textContent = `PULSO — ${result.summary.dominantHue.toFixed(0)}°`;
      this.resultInfo.textContent = `${this.musicScore.modeName} · ${this.musicScore.totalNotes} notas · ${this.musicScore.duration.toFixed(1)} s`;

      // 6. Pre-renderizar audio offline en segundo plano para exportación inmediata
      this.synthesizer.renderOffline(this.musicScore).then(buf => {
        this.renderedAudioBuffer = buf;
      }).catch(err => console.warn('Pre-render audio falló:', err));

      // Transición a pantalla de resultado
      this.showScreen('result');
      this.timeline.seek(this.musicScore.duration); // Mostrar escultura madura al llegar
      this.showToast('Composición y escultura generadas con éxito.');

    } catch (err) {
      if (err.message.includes('cancelado')) return;
      this.showToast('Error en el análisis: ' + err.message, 4000);
      this.showScreen('intro');
    }
  }

  _updatePaletteDisplay(palette) {
    this.procColorPalette.innerHTML = '';
    palette.slice(0, 5).forEach(c => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      swatch.style.backgroundColor = c.hex;
      this.procColorPalette.appendChild(swatch);
    });
  }

  onTimelineUpdate(time, duration, pct) {
    this.timelineScrubber.value = Math.round(pct * 100);
    const formatTime = (s) => {
      const m = Math.floor(s / 60);
      const sec = Math.floor(s % 60);
      return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    };
    this.timeDisplay.textContent = `${formatTime(time)} / ${formatTime(duration)}`;
  }

  onPlayStateChange(isPlaying) {
    this.btnPlayPause.textContent = isPlaying ? '❚❚ Pausar' : '▶ Reproducir';
    this.btnPlayPause.classList.toggle('playing', isPlaying);
  }

  onPlaybackEnded() {
    this.btnPlayPause.textContent = '▶ Reproducir';
    this.btnPlayPause.classList.remove('playing');
  }

  // ================= EXPORTACIÓN =================

  async _ensureRenderedBuffer() {
    if (this.renderedAudioBuffer) return this.renderedAudioBuffer;
    this.showToast('Renderizando audio en alta fidelidad...', 2000);
    this.renderedAudioBuffer = await this.synthesizer.renderOffline(this.musicScore);
    return this.renderedAudioBuffer;
  }

  async exportWav() {
    try {
      this.btnExportWav.disabled = true;
      const buffer = await this._ensureRenderedBuffer();
      const blob = MediaExporter.audioBufferToWav(buffer);
      MediaExporter.downloadBlob(blob, 'pulso_composicion.wav');
      this.showToast('Descargando archivo WAV...');
    } catch (err) {
      this.showToast('Error exportando WAV: ' + err.message, 4000);
    } finally {
      this.btnExportWav.disabled = false;
    }
  }

  async exportMp3() {
    try {
      this.btnExportMp3.disabled = true;
      const buffer = await this._ensureRenderedBuffer();
      this.showToast('Codificando MP3 a 192 kbps...', 1500);
      const blob = MediaExporter.audioBufferToMp3(buffer);
      MediaExporter.downloadBlob(blob, 'pulso_composicion.mp3');
      this.showToast('Descargando archivo MP3...');
    } catch (err) {
      this.showToast('Error exportando MP3: ' + err.message, 4000);
    } finally {
      this.btnExportMp3.disabled = false;
    }
  }

  async exportGlb() {
    try {
      this.btnExportGlb.disabled = true;
      this.showToast('Generando modelo 3D GLB...', 2000);
      await MediaExporter.exportGLB(this.sculpture.sculptureGroup, 'pulso_escultura');
      this.showToast('Descargando modelo GLB...');
    } catch (err) {
      this.showToast('Error exportando GLB: ' + err.message, 4000);
    } finally {
      this.btnExportGlb.disabled = false;
    }
  }

  exportPng() {
    try {
      this.sculpture.renderer.render(this.sculpture.scene, this.sculpture.camera);
      MediaExporter.exportPNG(this.sculpture.renderer, 'pulso_escultura_captura');
      this.showToast('Descargando captura PNG...');
    } catch (err) {
      this.showToast('Error exportando PNG: ' + err.message, 4000);
    }
  }

  async exportVideo() {
    if (!this.sculpture || !this.synthesizer) return;

    if (this.timeline) this.timeline.pause();
    this.exportVideoProgress.classList.remove('hidden');
    this.btnExportVideo.disabled = true;

    this.videoRecorder = new VideoRecorder(this.sculpture, this.synthesizer);

    try {
      const { blob, extension } = await this.videoRecorder.recordEvolution({}, (percent, statusText) => {
        this.exportVideoProgressBar.style.width = `${percent}%`;
        this.exportVideoText.textContent = statusText;
      });

      MediaExporter.downloadBlob(blob, `pulso_escultura_evolucion.${extension}`);
      this.showToast(`Descargando video evolutivo (${extension.toUpperCase()})...`);
    } catch (err) {
      if (!err.message.includes('cancelada')) {
        this.showToast('Error grabando video: ' + err.message, 4500);
      }
    } finally {
      this.exportVideoProgress.classList.add('hidden');
      this.btnExportVideo.disabled = false;
      this.videoRecorder = null;
    }
  }
}

// Inicializar cuando el DOM esté listo
window.addEventListener('DOMContentLoaded', () => {
  window.pulsoApp = new PulsoApp();
});
